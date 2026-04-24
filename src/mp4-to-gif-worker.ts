/// <reference lib="webworker" />

import { FFmpeg } from '@ffmpeg/ffmpeg';
import type {
  Mp4GifMode,
  Mp4ToGifSettings,
  Mp4ToGifSummary,
  Mp4ToGifWorkerRequest,
  Mp4ToGifWorkerResponse
} from './types';

const workerScope = self as DedicatedWorkerGlobalScope;
const ffmpeg = new FFmpeg();
let ffmpegLoaded = false;

function postMessageSafe(message: Mp4ToGifWorkerResponse, transfer: Transferable[] = []): void {
  workerScope.postMessage(message, transfer);
}

function postProgress(stage: string, detail: string, percent: number): void {
  postMessageSafe({
    type: 'progress',
    payload: {
      stage,
      detail,
      percent: Math.max(0, Math.min(100, Math.round(percent)))
    }
  });
}

function modePreset(mode: Mp4GifMode): { colors: number; scaleFactor: number; fps: number } {
  switch (mode) {
    case 'quality':
      return { colors: 256, scaleFactor: 1, fps: 14 };
    case 'small':
      return { colors: 48, scaleFactor: 0.75, fps: 8 };
    default:
      return { colors: 96, scaleFactor: 0.9, fps: 10 };
  }
}

async function ensureFfmpegLoaded(): Promise<void> {
  if (ffmpegLoaded) {
    return;
  }

  postProgress('Loading FFmpeg', 'Preparing browser-side video engine', 5);

  ffmpeg.on('progress', ({ progress }: { progress: number }) => {
    postProgress('Converting video', 'Rendering animated GIF frames', 20 + progress * 70);
  });

  try {
    await ffmpeg.load({
      coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
      wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
      workerURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.worker.js'
    });
    ffmpegLoaded = true;
  } catch {
    throw new Error('FFmpeg could not be loaded in this browser. Please try a modern desktop or mobile browser with enough memory.');
  }
}

function buildEffectiveSettings(settings: Mp4ToGifSettings): Mp4ToGifSettings {
  const preset = modePreset(settings.mode);
  const fps = Math.max(1, settings.autoOptimize ? Math.min(settings.fps, preset.fps) : settings.fps);
  const width = settings.width ? Math.max(120, Math.round(settings.width * (settings.autoOptimize ? preset.scaleFactor : 1))) : null;

  return {
    ...settings,
    fps,
    width
  };
}

function buildPaletteFilter(settings: Mp4ToGifSettings): string {
  const preset = modePreset(settings.mode);
  const fps = settings.fps;
  const scaleWidth = settings.width ?? 480;
  return `fps=${fps},scale=${scaleWidth}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=${preset.colors}:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3`;
}

function computeDuration(settings: Mp4ToGifSettings): number {
  const explicitEnd = settings.endTime ?? settings.startTime + settings.durationLimit;
  const duration = explicitEnd - settings.startTime;
  return Math.max(0.5, Math.min(settings.durationLimit, duration));
}

async function convertVideo(request: Mp4ToGifWorkerRequest): Promise<{ bytes: Uint8Array; summary: Mp4ToGifSummary }> {
  const settings = buildEffectiveSettings(request.settings);
  const inputName = 'input.mp4';
  const outputName = 'output.gif';
  const durationUsed = computeDuration(settings);
  const paletteFilter = buildPaletteFilter(settings);

  await ensureFfmpegLoaded();
  postProgress('Preparing video', 'Writing MP4 into the worker file system', 12);

  try {
    await ffmpeg.writeFile(inputName, new Uint8Array(request.fileBuffer));
  } catch {
    throw new Error('The MP4 file could not be loaded into the browser worker. The file may be too large for this device.');
  }

  try {
    await ffmpeg.exec([
      '-ss',
      `${settings.startTime}`,
      '-t',
      `${durationUsed}`,
      '-i',
      inputName,
      '-vf',
      paletteFilter,
      '-loop',
      settings.loop ? '0' : '-1',
      '-y',
      outputName
    ]);
  } catch {
    throw new Error('The MP4 could not be converted to GIF. Try a shorter duration, lower width, or lower FPS.');
  }

  let outputData: Uint8Array;

  try {
    outputData = await ffmpeg.readFile(outputName) as Uint8Array;
  } catch {
    throw new Error('The GIF output could not be read after conversion.');
  }

  try {
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);
  } catch {
    // ignore cleanup failures
  }

  return {
    bytes: outputData,
    summary: {
      widthUsed: settings.width ?? 480,
      fpsUsed: settings.fps,
      durationUsed,
      mode: settings.mode,
      loop: settings.loop
    }
  };
}

workerScope.addEventListener('message', (event: MessageEvent<Mp4ToGifWorkerRequest>) => {
  if (event.data.type !== 'convert') {
    return;
  }

  void (async () => {
    try {
      const result = await convertVideo(event.data);
      postProgress('Finishing GIF', 'Preparing download output', 100);
      postMessageSafe(
        {
          type: 'success',
          payload: {
            bytes: result.bytes,
            originalBytes: event.data.fileBuffer.byteLength,
            outputBytes: result.bytes.byteLength,
            summary: result.summary
          }
        },
        [result.bytes.buffer]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'MP4 to GIF conversion failed.';
      postMessageSafe({
        type: 'error',
        payload: { message }
      });
    }
  })();
});
