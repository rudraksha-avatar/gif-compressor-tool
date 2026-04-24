export type CompressionMode = 'balanced' | 'high' | 'quality';

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
  originalWidth: number;
  originalHeight: number;
  outputWidth: number;
  outputHeight: number;
  maxColors: number;
  colorsUsed: number;
  frameStep: number;
  maxWidth: number;
  loopCount: number;
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
