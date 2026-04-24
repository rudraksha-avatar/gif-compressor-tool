/// <reference lib="webworker" />

import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import type { GifMakerWorkerRequest, GifMakerWorkerResponse } from './types';

const workerScope = self as DedicatedWorkerGlobalScope;

function post(message: GifMakerWorkerResponse, transfer: Transferable[] = []): void {
  workerScope.postMessage(message, transfer);
}

workerScope.addEventListener('message', (event: MessageEvent<GifMakerWorkerRequest>) => {
  if (event.data.type !== 'make') return;
  void (async () => {
    try {
      const images = event.data.images;
      if (images.length === 0) throw new Error('Please add at least one image to create a GIF.');
      post({ type: 'progress', payload: { stage: 'Loading images', detail: 'Preparing image frames', percent: 5 } });
      const bitmaps = await Promise.all(images.map((image) => createImageBitmap(new Blob([image.bytes]))));
      const baseWidth = event.data.settings.width ?? bitmaps[0].width;
      const baseHeight = Math.max(1, Math.round((bitmaps[0].height / bitmaps[0].width) * baseWidth));
      const canvas = new OffscreenCanvas(baseWidth, baseHeight);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Could not create GIF canvas.');
      const encoder = GIFEncoder();
      for (let index = 0; index < bitmaps.length; index += 1) {
        context.clearRect(0, 0, baseWidth, baseHeight);
        context.drawImage(bitmaps[index], 0, 0, baseWidth, baseHeight);
        const rgba = context.getImageData(0, 0, baseWidth, baseHeight).data;
        const palette = quantize(rgba, 256, { format: 'rgba4444', oneBitAlpha: true, clearAlpha: true, clearAlphaThreshold: 0 });
        const indexData = applyPalette(rgba, palette, 'rgba4444');
        encoder.writeFrame(indexData, baseWidth, baseHeight, { palette, delay: Math.max(20, event.data.settings.frameDelayMs), repeat: index === 0 ? 0 : undefined });
        post({ type: 'progress', payload: { stage: 'Encoding GIF', detail: `Frame ${index + 1} of ${bitmaps.length}`, percent: Math.round(15 + ((index + 1) / bitmaps.length) * 85) } });
      }
      encoder.finish();
      const output = encoder.bytesView();
      post({ type: 'success', payload: { bytes: output, outputBytes: output.byteLength, frameCount: bitmaps.length, widthUsed: baseWidth, heightUsed: baseHeight } }, [output.buffer]);
    } catch (error) {
      post({ type: 'error', payload: { message: error instanceof Error ? error.message : 'GIF creation failed.' } });
    }
  })();
});
