import type { GifToMp4Progress, GifToMp4Result, GifToMp4Settings, GifToMp4Task, GifToMp4WorkerRequest, GifToMp4WorkerResponse } from './types';

export function convertGifToMp4(
  file: File,
  settings: GifToMp4Settings,
  onProgress: (progress: GifToMp4Progress) => void
): GifToMp4Task {
  const worker = new Worker(new URL('./gif-to-mp4-worker.ts', import.meta.url), { type: 'module' });
  let cancelled = false;
  let rejectPromise: ((reason?: unknown) => void) | null = null;

  const promise = new Promise<GifToMp4Result>(async (resolve, reject) => {
    rejectPromise = reject;
    const fileBuffer = await file.arrayBuffer();

    const handleMessage = (event: MessageEvent<GifToMp4WorkerResponse>): void => {
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
        blob: new Blob([safeBytes], { type: 'video/mp4' }),
        originalBytes: message.payload.originalBytes,
        outputBytes: message.payload.outputBytes,
        widthUsed: message.payload.widthUsed,
        fpsUsed: message.payload.fpsUsed
      });
    };

    const handleError = (): void => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      if (!cancelled) reject(new Error('The GIF to MP4 worker failed unexpectedly.'));
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    const request: GifToMp4WorkerRequest = {
      type: 'convert',
      fileBuffer,
      fileName: file.name,
      settings
    };

    worker.postMessage(request, [fileBuffer]);
  });

  return {
    promise,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      worker.terminate();
      rejectPromise?.(new Error('Conversion cancelled.'));
    }
  };
}
