import type {
  CompressionProgress,
  CompressionResult,
  CompressionSettings,
  WorkerCompressRequest,
  WorkerResponseMessage
} from './types';

const compressorWorker = new Worker(new URL('./gif-worker.ts', import.meta.url), { type: 'module' });

export function compressGif(
  file: File,
  settings: CompressionSettings,
  onProgress: (progress: CompressionProgress) => void
): Promise<CompressionResult> {
  return new Promise(async (resolve, reject) => {
    const fileBuffer = await file.arrayBuffer();

    const handleMessage = (event: MessageEvent<WorkerResponseMessage>): void => {
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
      reject(new Error('The GIF compression worker failed unexpectedly.'));
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
}
