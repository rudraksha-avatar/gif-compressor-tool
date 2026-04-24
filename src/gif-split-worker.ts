/// <reference lib="webworker" />

import { decompressFrames, parseGIF } from 'gifuct-js';
import type { GifSplitWorkerRequest, GifSplitWorkerResponse } from './types';

const workerScope = self as DedicatedWorkerGlobalScope;

function post(message: GifSplitWorkerResponse): void {
  workerScope.postMessage(message);
}

workerScope.addEventListener('message', (event: MessageEvent<GifSplitWorkerRequest>) => {
  if (event.data.type !== 'split') return;
  void (async () => {
    try {
      post({ type: 'progress', payload: { stage: 'Reading GIF', detail: 'Decoding animation frames', percent: 10 } });
      const gif = parseGIF(event.data.fileBuffer) as never;
      const frames = decompressFrames(gif, true) as Array<{ patch: Uint8ClampedArray; dims: { width: number; height: number } }>;
      const results: Array<{ name: string; bytes: Uint8Array }> = [];
      for (let index = 0; index < frames.length; index += 1) {
        const frame = frames[index];
        const canvas = new OffscreenCanvas(frame.dims.width, frame.dims.height);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not create frame canvas.');
        const imageData = new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height);
        context.putImageData(imageData, 0, 0);
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        results.push({ name: `frame-${String(index + 1).padStart(3, '0')}.png`, bytes: new Uint8Array(await blob.arrayBuffer()) });
        post({ type: 'progress', payload: { stage: 'Extracting frames', detail: `Frame ${index + 1} of ${frames.length}`, percent: Math.round(15 + ((index + 1) / frames.length) * 85) } });
      }
      post({ type: 'success', payload: { frames: results } });
    } catch (error) {
      post({ type: 'error', payload: { message: error instanceof Error ? error.message : 'GIF frame extraction failed.' } });
    }
  })();
});
