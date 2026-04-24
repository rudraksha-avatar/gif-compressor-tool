export type CompressionMode = 'balanced' | 'high' | 'quality';

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
