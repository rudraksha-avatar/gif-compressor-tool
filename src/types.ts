export type CompressionMode = 'balanced' | 'high' | 'quality';
export type AppRoute = '/' | '/mp4-to-gif' | '/gif-to-mp4' | '/gif-resizer' | '/gif-speed' | '/gif-optimizer' | '/gif-crop' | '/gif-split' | '/gif-maker' | '/tools' | '/privacy' | '/about' | '/contact' | '/faq' | '/404.html';

export interface GifFileMetadata {
  width: number;
  height: number;
  frameCount: number;
}

export interface VideoFileMetadata {
  width: number;
  height: number;
  duration: number;
}

export type Mp4GifMode = 'quality' | 'balanced' | 'small';

export interface GifToMp4Settings {
  width: number | null;
  fps: number;
}

export interface GifToMp4Progress {
  stage: string;
  detail: string;
  percent: number;
}

export interface GifToMp4Result {
  blob: Blob;
  originalBytes: number;
  outputBytes: number;
  widthUsed: number | null;
  fpsUsed: number;
}

export interface GifToMp4Task {
  promise: Promise<GifToMp4Result>;
  cancel: () => void;
}

export interface GifToMp4WorkerRequest {
  type: 'convert';
  fileBuffer: ArrayBuffer;
  fileName: string;
  settings: GifToMp4Settings;
}

export type GifToMp4WorkerResponse =
  | { type: 'progress'; payload: GifToMp4Progress }
  | {
      type: 'success';
      payload: {
        bytes: Uint8Array;
        originalBytes: number;
        outputBytes: number;
        widthUsed: number | null;
        fpsUsed: number;
      };
    }
  | { type: 'error'; payload: { message: string } };

export interface GifResizeSettings {
  width: number | null;
  height: number | null;
  keepAspectRatio: boolean;
}

export interface GifResizeResult {
  blob: Blob;
  originalBytes: number;
  outputBytes: number;
  widthUsed: number;
  heightUsed: number;
}

export interface GifResizeTask {
  promise: Promise<GifResizeResult>;
  cancel: () => void;
}

export interface GifResizeWorkerRequest {
  type: 'resize';
  fileBuffer: ArrayBuffer;
  fileName: string;
  settings: GifResizeSettings;
}

export type GifResizeWorkerResponse =
  | { type: 'progress'; payload: { stage: string; detail: string; percent: number } }
  | {
      type: 'success';
      payload: {
        bytes: Uint8Array;
        originalBytes: number;
        outputBytes: number;
        widthUsed: number;
        heightUsed: number;
      };
    }
  | { type: 'error'; payload: { message: string } };

export interface GifSpeedSettings {
  speed: number;
}

export interface GifSpeedResult {
  blob: Blob;
  originalBytes: number;
  outputBytes: number;
  speedUsed: number;
}

export interface GifSpeedTask {
  promise: Promise<GifSpeedResult>;
  cancel: () => void;
}

export interface GifCropSettings {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GifCropResult {
  blob: Blob;
  originalBytes: number;
  outputBytes: number;
  widthUsed: number;
  heightUsed: number;
}

export interface GifCropTask {
  promise: Promise<GifCropResult>;
  cancel: () => void;
}

export interface GifCropWorkerRequest {
  type: 'crop';
  fileBuffer: ArrayBuffer;
  fileName: string;
  settings: GifCropSettings;
}

export type GifCropWorkerResponse =
  | { type: 'progress'; payload: { stage: string; detail: string; percent: number } }
  | {
      type: 'success';
      payload: {
        bytes: Uint8Array;
        originalBytes: number;
        outputBytes: number;
        widthUsed: number;
        heightUsed: number;
      };
    }
  | { type: 'error'; payload: { message: string } };

export interface GifSplitFrame {
  name: string;
  bytes: Uint8Array;
}

export interface GifSplitResult {
  frames: GifSplitFrame[];
}

export interface GifSplitTask {
  promise: Promise<GifSplitResult>;
  cancel: () => void;
}

export interface GifSplitWorkerRequest {
  type: 'split';
  fileBuffer: ArrayBuffer;
  fileName: string;
}

export type GifSplitWorkerResponse =
  | { type: 'progress'; payload: { stage: string; detail: string; percent: number } }
  | { type: 'success'; payload: { frames: GifSplitFrame[] } }
  | { type: 'error'; payload: { message: string } };

export interface GifMakerImageInput {
  fileName: string;
  bytes: ArrayBuffer;
}

export interface GifMakerSettings {
  frameDelayMs: number;
  width: number | null;
}

export interface GifMakerResult {
  blob: Blob;
  outputBytes: number;
  frameCount: number;
  widthUsed: number;
  heightUsed: number;
}

export interface GifMakerTask {
  promise: Promise<GifMakerResult>;
  cancel: () => void;
}

export interface GifMakerWorkerRequest {
  type: 'make';
  images: GifMakerImageInput[];
  settings: GifMakerSettings;
}

export type GifMakerWorkerResponse =
  | { type: 'progress'; payload: { stage: string; detail: string; percent: number } }
  | {
      type: 'success';
      payload: {
        bytes: Uint8Array;
        outputBytes: number;
        frameCount: number;
        widthUsed: number;
        heightUsed: number;
      };
    }
  | { type: 'error'; payload: { message: string } };

export interface GifSpeedWorkerRequest {
  type: 'speed';
  fileBuffer: ArrayBuffer;
  fileName: string;
  settings: GifSpeedSettings;
}

export type GifSpeedWorkerResponse =
  | { type: 'progress'; payload: { stage: string; detail: string; percent: number } }
  | {
      type: 'success';
      payload: {
        bytes: Uint8Array;
        originalBytes: number;
        outputBytes: number;
        speedUsed: number;
      };
    }
  | { type: 'error'; payload: { message: string } };

export interface CompressionSettings {
  targetBytes: number;
  mode: CompressionMode;
  auto: boolean;
  maxWidth: number | null;
  maxFrameStep: number | null;
  colorLimit: number | null;
}

export interface CompressionProgress {
  stage: string;
  attempt: number;
  totalAttempts: number;
  detail: string;
  percent: number;
}

export interface CompressionSummary {
  inputFrames: number;
  outputFrames: number;
  inputDurationMs: number;
  outputDurationMs: number;
  inputFps: number;
  outputFps: number;
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  maxColors: number;
  colorsUsed: number;
  frameStep: number;
  maxWidth: number;
  loopCount: number;
  loopPreserved: boolean;
  mode: CompressionMode;
}

export interface CompressionResult {
  blob: Blob;
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
  savedBytes: number;
  savedPercent: number;
  underTarget: boolean;
  bestPossible: boolean;
  strategySummary: string;
  summary: CompressionSummary;
}

export interface WorkerCompressRequest {
  type: 'compress';
  fileBuffer: ArrayBuffer;
  fileName: string;
  settings: CompressionSettings;
}

export interface CompressionTask {
  promise: Promise<CompressionResult>;
  cancel: () => void;
}

export interface Mp4ToGifSettings {
  startTime: number;
  endTime: number | null;
  durationLimit: number;
  width: number | null;
  fps: number;
  mode: Mp4GifMode;
  loop: boolean;
  autoOptimize: boolean;
}

export interface Mp4ToGifProgress {
  stage: string;
  detail: string;
  percent: number;
}

export interface Mp4ToGifSummary {
  widthUsed: number;
  fpsUsed: number;
  durationUsed: number;
  mode: Mp4GifMode;
  loop: boolean;
}

export interface Mp4ToGifResult {
  blob: Blob;
  originalBytes: number;
  outputBytes: number;
  summary: Mp4ToGifSummary;
}

export interface Mp4ToGifTask {
  promise: Promise<Mp4ToGifResult>;
  cancel: () => void;
}

export interface Mp4ToGifWorkerRequest {
  type: 'convert';
  fileBuffer: ArrayBuffer;
  fileName: string;
  settings: Mp4ToGifSettings;
}

export interface Mp4ToGifWorkerProgressMessage {
  type: 'progress';
  payload: Mp4ToGifProgress;
}

export interface Mp4ToGifWorkerSuccessMessage {
  type: 'success';
  payload: {
    bytes: Uint8Array;
    originalBytes: number;
    outputBytes: number;
    summary: Mp4ToGifSummary;
  };
}

export interface Mp4ToGifWorkerErrorMessage {
  type: 'error';
  payload: {
    message: string;
  };
}

export type Mp4ToGifWorkerResponse =
  | Mp4ToGifWorkerProgressMessage
  | Mp4ToGifWorkerSuccessMessage
  | Mp4ToGifWorkerErrorMessage;

export interface WorkerProgressMessage {
  type: 'progress';
  payload: CompressionProgress;
}

export interface WorkerSuccessMessage {
  type: 'success';
  payload: {
    bytes: Uint8Array;
    width: number;
    height: number;
    originalBytes: number;
    compressedBytes: number;
    underTarget: boolean;
    bestPossible: boolean;
    strategySummary: string;
    summary: CompressionSummary;
  };
}

export interface WorkerErrorMessage {
  type: 'error';
  payload: {
    message: string;
  };
}

export type WorkerResponseMessage =
  | WorkerProgressMessage
  | WorkerSuccessMessage
  | WorkerErrorMessage;
