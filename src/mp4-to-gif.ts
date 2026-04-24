import type {
  Mp4ToGifProgress,
  Mp4ToGifResult,
  Mp4ToGifSettings,
  Mp4ToGifTask,
  Mp4ToGifWorkerRequest,
  Mp4ToGifWorkerResponse
} from './types';

export function convertMp4ToGif(
  file: File,
  settings: Mp4ToGifSettings,
  onProgress: (progress: Mp4ToGifProgress) => void
): Mp4ToGifTask {
  const worker = new Worker(new URL('./mp4-to-gif-worker.ts', import.meta.url), { type: 'module' });
  let cancelled = false;
  let rejectPromise: ((reason?: unknown) => void) | null = null;

  const promise = new Promise<Mp4ToGifResult>(async (resolve, reject) => {
    rejectPromise = reject;
    const fileBuffer = await file.arrayBuffer();

    const handleMessage = (event: MessageEvent<Mp4ToGifWorkerResponse>): void => {
      if (cancelled) {
        return;
      }

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
      const blob = new Blob([safeBytes], { type: 'image/gif' });
      resolve({
        blob,
        originalBytes: message.payload.originalBytes,
        outputBytes: message.payload.outputBytes,
        summary: message.payload.summary
      });
    };

    const handleError = (): void => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);

      if (!cancelled) {
        reject(new Error('The MP4 to GIF worker failed unexpectedly.'));
      }
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    const request: Mp4ToGifWorkerRequest = {
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
      if (cancelled) {
        return;
      }

      cancelled = true;
      worker.terminate();
      rejectPromise?.(new Error('Conversion cancelled.'));
    }
  };
}
