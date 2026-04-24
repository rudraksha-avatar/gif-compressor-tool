import type { GifSplitResult, GifSplitTask, GifSplitWorkerRequest, GifSplitWorkerResponse } from './types';

export function splitGifFrames(file: File, onProgress: (progress: { stage: string; detail: string; percent: number }) => void): GifSplitTask {
  const worker = new Worker(new URL('./gif-split-worker.ts', import.meta.url), { type: 'module' });
  let cancelled = false;
  let rejectPromise: ((reason?: unknown) => void) | null = null;

  const promise = new Promise<GifSplitResult>(async (resolve, reject) => {
    rejectPromise = reject;
    const fileBuffer = await file.arrayBuffer();
    const handleMessage = (event: MessageEvent<GifSplitWorkerResponse>): void => {
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
      resolve({ frames: message.payload.frames.map((frame) => ({ name: frame.name, bytes: Uint8Array.from(frame.bytes) })) });
    };
    const handleError = (): void => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      if (!cancelled) reject(new Error('The GIF split worker failed unexpectedly.'));
    };
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);
    const request: GifSplitWorkerRequest = { type: 'split', fileBuffer, fileName: file.name };
    worker.postMessage(request, [fileBuffer]);
  });

  return {
    promise,
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      worker.terminate();
      rejectPromise?.(new Error('Split cancelled.'));
    }
  };
}
