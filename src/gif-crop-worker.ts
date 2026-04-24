/// <reference lib="webworker" />

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { cleanupFfmpegFiles, FFMPEG_LOAD_CONFIG } from './ffmpeg-manager';
import type { GifCropWorkerRequest, GifCropWorkerResponse } from './types';

const workerScope = self as DedicatedWorkerGlobalScope;
const ffmpeg = new FFmpeg();
let loaded = false;

function post(message: GifCropWorkerResponse, transfer: Transferable[] = []): void {
  workerScope.postMessage(message, transfer);
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  ffmpeg.on('progress', ({ progress }: { progress: number }) => {
    post({ type: 'progress', payload: { stage: 'Cropping GIF', detail: 'Rendering cropped frames', percent: Math.round(20 + progress * 70) } });
  });
  await ffmpeg.load(FFMPEG_LOAD_CONFIG);
  loaded = true;
}

workerScope.addEventListener('message', (event: MessageEvent<GifCropWorkerRequest>) => {
  if (event.data.type !== 'crop') return;
  void (async () => {
    const inputName = 'input.gif';
    const paletteName = 'palette.png';
    const outputName = 'output.gif';
    try {
      await ensureLoaded();
      await ffmpeg.writeFile(inputName, new Uint8Array(event.data.fileBuffer));
      const { x, y, width, height } = event.data.settings;
      const cropFilter = `crop=${width}:${height}:${x}:${y}`;
      await ffmpeg.exec(['-i', inputName, '-vf', `${cropFilter},split[s0][s1];[s0]palettegen=stats_mode=diff[p]`, '-y', paletteName]);
      await ffmpeg.exec(['-i', inputName, '-i', paletteName, '-lavfi', `${cropFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`, '-loop', '0', '-y', outputName]);
      const output = await ffmpeg.readFile(outputName) as Uint8Array;
      await cleanupFfmpegFiles(ffmpeg, [inputName, paletteName, outputName]);
      post({ type: 'success', payload: { bytes: output, originalBytes: event.data.fileBuffer.byteLength, outputBytes: output.byteLength, widthUsed: width, heightUsed: height } }, [output.buffer]);
    } catch (error) {
      await cleanupFfmpegFiles(ffmpeg, [inputName, paletteName, outputName]);
      post({ type: 'error', payload: { message: error instanceof Error ? error.message : 'GIF crop failed.' } });
    }
  })();
});
