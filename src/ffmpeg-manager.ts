import { FFmpeg } from '@ffmpeg/ffmpeg';

export const FFMPEG_LOAD_CONFIG = {
  coreURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js',
  wasmURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm',
  workerURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.worker.js'
} as const;

export async function cleanupFfmpegFiles(ffmpeg: FFmpeg, paths: string[]): Promise<void> {
  await Promise.all(
    paths.map(async (path) => {
      try {
        await ffmpeg.deleteFile(path);
      } catch {
        // ignore best-effort cleanup failures
      }
    })
  );
}
