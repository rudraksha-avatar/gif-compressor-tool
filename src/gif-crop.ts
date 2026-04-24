import type { GifCropResult, GifCropSettings, GifCropTask, GifCropWorkerRequest, GifCropWorkerResponse } from './types';

export function cropGif(file: File, settings: GifCropSettings, onProgress: (progress: { stage: string; detail: string; percent: number }) => void): GifCropTask {
  const worker = new Worker(new URL('./gif-crop-worker.ts', import.meta.url), { type: 'module' });
  let cancelled = false;
  let rejectPromise: ((reason?: unknown) => void) | null = null;

  const promise = new Promise<GifCropResult>(async (resolve, reject) => {
    rejectPromise = reject;
    const fileBuffer = await file.arrayBuffer();

    const handleMessage = (event: MessageEvent<GifCropWorkerResponse>): void => {
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
      const safeBytes = Uint8Array.from(message.payload.bytes);
      resolve({
        blob: new Blob([safeBytes], { type: 'image/gif' }),
        originalBytes: message.payload.originalBytes,
        outputBytes: message.payload.outputBytes,
        widthUsed: message.payload.widthUsed,
        heightUsed: message.payload.heightUsed
      });
    };

    const handleError = (): void => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      if (!cancelled) reject(new Error('The GIF crop worker failed unexpectedly.'));
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    const request: GifCropWorkerRequest = { type: 'crop', fileBuffer, fileName: file.name, settings };
    worker.postMessage(request, [fileBuffer]);
  });

  return {
    promise,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      worker.terminate();
      rejectPromise?.(new Error('Crop cancelled.'));
    }
  };
}
