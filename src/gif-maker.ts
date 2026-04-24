import type { GifMakerImageInput, GifMakerResult, GifMakerSettings, GifMakerTask, GifMakerWorkerRequest, GifMakerWorkerResponse } from './types';

export function makeGif(images: GifMakerImageInput[], settings: GifMakerSettings, onProgress: (progress: { stage: string; detail: string; percent: number }) => void): GifMakerTask {
  const worker = new Worker(new URL('./gif-maker-worker.ts', import.meta.url), { type: 'module' });
  let cancelled = false;
  let rejectPromise: ((reason?: unknown) => void) | null = null;

  const promise = new Promise<GifMakerResult>((resolve, reject) => {
    rejectPromise = reject;
    const handleMessage = (event: MessageEvent<GifMakerWorkerResponse>): void => {
      if (cancelled) return;
      const message = event.data;
      if (message.type === 'progress') {
        onProgress(message.payload);
        return;
      }
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      if (message.type === 'error') {
        reject(new Error(message.payload.message));
        return;
      }
      resolve({
        blob: new Blob([Uint8Array.from(message.payload.bytes)], { type: 'image/gif' }),
        outputBytes: message.payload.outputBytes,
        frameCount: message.payload.frameCount,
        widthUsed: message.payload.widthUsed,
        heightUsed: message.payload.heightUsed
      });
    };
    const handleError = (): void => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      if (!cancelled) reject(new Error('The GIF maker worker failed unexpectedly.'));
    };
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    const request: GifMakerWorkerRequest = { type: 'make', images, settings };
    worker.postMessage(request, images.map((image) => image.bytes));
  });

  return {
    promise,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      worker.terminate();
      rejectPromise?.(new Error('GIF creation cancelled.'));
    }
  };
}
