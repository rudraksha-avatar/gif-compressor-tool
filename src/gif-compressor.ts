import type {
  CompressionTask,
  CompressionProgress,
  CompressionResult,
  CompressionSettings,
  WorkerCompressRequest,
  WorkerResponseMessage
} from './types';

export function compressGif(
  file: File,
  settings: CompressionSettings,
  onProgress: (progress: CompressionProgress) => void
): CompressionTask {
  const compressorWorker = new Worker(new URL('./gif-worker.ts', import.meta.url), { type: 'module' });
  let cancelled = false;
  let rejectPromise: ((reason?: unknown) => void) | null = null;

  const promise = new Promise<CompressionResult>(async (resolve, reject) => {
    rejectPromise = reject;
    const fileBuffer = await file.arrayBuffer();

    const handleMessage = (event: MessageEvent<WorkerResponseMessage>): void => {
      if (cancelled) {
        return;
      }

      const message = event.data;

      if (message.type === 'progress') {
        onProgress(message.payload);
        return;
      }

      compressorWorker.removeEventListener('message', handleMessage);
      compressorWorker.removeEventListener('error', handleError);

      if (message.type === 'error') {
        reject(new Error(message.payload.message));
        return;
      }

      const {
        bytes,
        width,
        height,
        originalBytes,
        compressedBytes,
        underTarget,
        bestPossible,
        strategySummary,
        summary
      } = message.payload;
      const safeBytes = Uint8Array.from(bytes);
      const blob = new Blob([safeBytes], { type: 'image/gif' });
      const savedBytes = Math.max(0, originalBytes - compressedBytes);
      const savedPercent = originalBytes > 0 ? (savedBytes / originalBytes) * 100 : 0;

      resolve({
        blob,
        width,
        height,
        originalBytes,
        compressedBytes,
        savedBytes,
        savedPercent,
        underTarget,
        bestPossible,
        strategySummary,
        summary
      });
    };

    const handleError = (): void => {
      compressorWorker.removeEventListener('message', handleMessage);
      compressorWorker.removeEventListener('error', handleError);

      if (!cancelled) {
        reject(new Error('The GIF compression worker failed unexpectedly.'));
      }
    };

    compressorWorker.addEventListener('message', handleMessage);
    compressorWorker.addEventListener('error', handleError);

    const request: WorkerCompressRequest = {
      type: 'compress',
      fileBuffer,
      fileName: file.name,
      settings
    };

    compressorWorker.postMessage(request, [fileBuffer]);
  });

  return {
    promise,
    cancel: () => {
      if (cancelled) {
        return;
      }

      cancelled = true;
      compressorWorker.terminate();
      rejectPromise?.(new Error('Compression cancelled.'));
    }
  };
}
