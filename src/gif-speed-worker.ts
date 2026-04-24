/// <reference lib="webworker" />

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { cleanupFfmpegFiles, FFMPEG_LOAD_CONFIG } from './ffmpeg-manager';
import type { GifSpeedWorkerRequest, GifSpeedWorkerResponse } from './types';

const workerScope = self as DedicatedWorkerGlobalScope;
const ffmpeg = new FFmpeg();
let loaded = false;

function post(message: GifSpeedWorkerResponse, transfer: Transferable[] = []): void {
  workerScope.postMessage(message, transfer);
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  ffmpeg.on('progress', ({ progress }: { progress: number }) => {
    post({ type: 'progress', payload: { stage: 'Changing speed', detail: 'Rendering updated GIF timing', percent: Math.round(20 + progress * 70) } });
  });
  await ffmpeg.load(FFMPEG_LOAD_CONFIG);
  loaded = true;
}

workerScope.addEventListener('message', (event: MessageEvent<GifSpeedWorkerRequest>) => {
  if (event.data.type !== 'speed') return;
  void (async () => {
    const inputName = 'input.gif';
    const paletteName = 'palette.png';
    const outputName = 'output.gif';
    try {
      await ensureLoaded();
      await ffmpeg.writeFile(inputName, new Uint8Array(event.data.fileBuffer));
      const speed = Math.max(0.25, Math.min(4, event.data.settings.speed));
      const setPts = (1 / speed).toFixed(4);
      const filter = `setpts=${setPts}*PTS`;
      await ffmpeg.exec(['-i', inputName, '-vf', `${filter},split[s0][s1];[s0]palettegen=stats_mode=diff[p]`, '-y', paletteName]);
      await ffmpeg.exec(['-i', inputName, '-i', paletteName, '-lavfi', `${filter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`, '-loop', '0', '-y', outputName]);
      const output = await ffmpeg.readFile(outputName) as Uint8Array;
      await cleanupFfmpegFiles(ffmpeg, [inputName, paletteName, outputName]);
      post({
        type: 'success',
        payload: {
          bytes: output,
          originalBytes: event.data.fileBuffer.byteLength,
          outputBytes: output.byteLength,
          speedUsed: speed
        }
      }, [output.buffer]);
    } catch (error) {
      await cleanupFfmpegFiles(ffmpeg, [inputName, paletteName, outputName]);
      post({ type: 'error', payload: { message: error instanceof Error ? error.message : 'GIF speed change failed.' } });
    }
  })();
});
