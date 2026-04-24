/// <reference lib="webworker" />

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { cleanupFfmpegFiles, FFMPEG_LOAD_CONFIG } from './ffmpeg-manager';
import type { GifResizeWorkerRequest, GifResizeWorkerResponse } from './types';

const workerScope = self as DedicatedWorkerGlobalScope;
const ffmpeg = new FFmpeg();
let loaded = false;

function post(message: GifResizeWorkerResponse, transfer: Transferable[] = []): void {
  workerScope.postMessage(message, transfer);
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  ffmpeg.on('progress', ({ progress }: { progress: number }) => {
    post({ type: 'progress', payload: { stage: 'Resizing GIF', detail: 'Rendering resized animation', percent: Math.round(20 + progress * 70) } });
  });
  await ffmpeg.load(FFMPEG_LOAD_CONFIG);
  loaded = true;
}

workerScope.addEventListener('message', (event: MessageEvent<GifResizeWorkerRequest>) => {
  if (event.data.type !== 'resize') return;
  void (async () => {
    const inputName = 'input.gif';
    const paletteName = 'palette.png';
    const outputName = 'output.gif';
    try {
      await ensureLoaded();
      await ffmpeg.writeFile(inputName, new Uint8Array(event.data.fileBuffer));
      const width = event.data.settings.width ?? -1;
      const height = event.data.settings.keepAspectRatio ? -1 : (event.data.settings.height ?? -1);
      const scale = `scale=${width}:${height}:flags=lanczos`;
      await ffmpeg.exec(['-i', inputName, '-vf', `${scale},split[s0][s1];[s0]palettegen=stats_mode=diff[p]`, '-y', paletteName]);
      await ffmpeg.exec(['-i', inputName, '-i', paletteName, '-lavfi', `${scale}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`, '-loop', '0', '-y', outputName]);
      const output = await ffmpeg.readFile(outputName) as Uint8Array;
      await cleanupFfmpegFiles(ffmpeg, [inputName, paletteName, outputName]);
      post({
        type: 'success',
        payload: {
          bytes: output,
          originalBytes: event.data.fileBuffer.byteLength,
          outputBytes: output.byteLength,
          widthUsed: event.data.settings.width ?? 0,
          heightUsed: event.data.settings.keepAspectRatio ? 0 : (event.data.settings.height ?? 0)
        }
      }, [output.buffer]);
    } catch (error) {
      await cleanupFfmpegFiles(ffmpeg, [inputName, paletteName, outputName]);
      post({ type: 'error', payload: { message: error instanceof Error ? error.message : 'GIF resize failed.' } });
    }
  })();
});
