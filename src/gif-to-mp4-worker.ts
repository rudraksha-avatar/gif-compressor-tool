/// <reference lib="webworker" />

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { cleanupFfmpegFiles, FFMPEG_LOAD_CONFIG } from './ffmpeg-manager';
import type { GifToMp4WorkerRequest, GifToMp4WorkerResponse } from './types';

const workerScope = self as DedicatedWorkerGlobalScope;
const ffmpeg = new FFmpeg();
let loaded = false;

function post(message: GifToMp4WorkerResponse, transfer: Transferable[] = []): void {
  workerScope.postMessage(message, transfer);
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  ffmpeg.on('progress', ({ progress }: { progress: number }) => {
    post({ type: 'progress', payload: { stage: 'Converting GIF', detail: 'Encoding MP4 video', percent: Math.round(20 + progress * 70) } });
  });
  await ffmpeg.load(FFMPEG_LOAD_CONFIG);
  loaded = true;
}

workerScope.addEventListener('message', (event: MessageEvent<GifToMp4WorkerRequest>) => {
  if (event.data.type !== 'convert') return;

  void (async () => {
    const inputName = 'input.gif';
    const outputName = 'output.mp4';
    try {
      post({ type: 'progress', payload: { stage: 'Loading FFmpeg', detail: 'Preparing worker', percent: 5 } });
      await ensureLoaded();
      await ffmpeg.writeFile(inputName, new Uint8Array(event.data.fileBuffer));
      const scaleFilter = event.data.settings.width ? `scale=${event.data.settings.width}:-2:flags=lanczos` : 'scale=trunc(iw/2)*2:trunc(ih/2)*2';
      await ffmpeg.exec(['-i', inputName, '-vf', `fps=${event.data.settings.fps},${scaleFilter}`, '-movflags', 'faststart', '-pix_fmt', 'yuv420p', '-y', outputName]);
      const output = await ffmpeg.readFile(outputName) as Uint8Array;
      await cleanupFfmpegFiles(ffmpeg, [inputName, outputName]);
      post({
        type: 'success',
        payload: {
          bytes: output,
          originalBytes: event.data.fileBuffer.byteLength,
          outputBytes: output.byteLength,
          widthUsed: event.data.settings.width,
          fpsUsed: event.data.settings.fps
        }
      }, [output.buffer]);
    } catch (error) {
      await cleanupFfmpegFiles(ffmpeg, [inputName, outputName]);
      post({ type: 'error', payload: { message: error instanceof Error ? error.message : 'GIF to MP4 conversion failed.' } });
    }
  })();
});
