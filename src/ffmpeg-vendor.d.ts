declare module '@ffmpeg/ffmpeg' {
  export interface FfmpegProgressEvent {
    progress: number;
    time: number;
  }

  export interface FfmpegLoadOptions {
    coreURL?: string;
    wasmURL?: string;
    workerURL?: string;
    classWorkerURL?: string;
  }

  export class FFmpeg {
    loaded: boolean;
    on(event: 'progress', callback: (event: FfmpegProgressEvent) => void): void;
    off(event: 'progress', callback: (event: FfmpegProgressEvent) => void): void;
    load(options?: FfmpegLoadOptions): Promise<boolean>;
    exec(args: string[], timeout?: number): Promise<number>;
    writeFile(path: string, data: Uint8Array | string): Promise<boolean>;
    readFile(path: string): Promise<Uint8Array | string>;
    deleteFile(path: string): Promise<boolean>;
    terminate(): void;
  }
}
