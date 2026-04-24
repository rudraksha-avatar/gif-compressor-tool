/// <reference lib="webworker" />

import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { decompressFrames, parseGIF } from 'gifuct-js';
import type { CompressionMode, CompressionSummary, CompressionSettings, WorkerCompressRequest, WorkerResponseMessage } from './types';

interface GifFrame {
  dims: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  patch: Uint8ClampedArray;
  delay?: number;
  disposalType?: number;
}

interface ParsedFrame {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  delay: number;
  disposalType: number;
}

interface ParsedGifData {
  frames: ParsedFrame[];
  width: number;
  height: number;
  loopCount: number;
}

interface Strategy {
  maxWidth: number;
  maxColors: number;
  frameStep: number;
}

interface EncodedAttempt {
  bytes: Uint8Array;
  width: number;
  height: number;
  strategy: Strategy;
  outputFrames: number;
}

const workerScope = self as DedicatedWorkerGlobalScope;
const MAX_ESTIMATED_FRAME_MEMORY_BYTES = 450 * 1024 * 1024;
const modeStrategyPresets: Record<CompressionMode, Strategy[]> = {
  quality: [
    { maxWidth: Infinity, maxColors: 256, frameStep: 1 },
    { maxWidth: 720, maxColors: 256, frameStep: 1 },
    { maxWidth: 720, maxColors: 128, frameStep: 1 },
    { maxWidth: 480, maxColors: 128, frameStep: 1 },
    { maxWidth: 480, maxColors: 64, frameStep: 2 }
  ],
  balanced: [
    { maxWidth: Infinity, maxColors: 256, frameStep: 1 },
    { maxWidth: 720, maxColors: 256, frameStep: 1 },
    { maxWidth: 720, maxColors: 128, frameStep: 1 },
    { maxWidth: 480, maxColors: 128, frameStep: 1 },
    { maxWidth: 480, maxColors: 64, frameStep: 2 },
    { maxWidth: 360, maxColors: 64, frameStep: 2 },
    { maxWidth: 360, maxColors: 32, frameStep: 2 },
    { maxWidth: 240, maxColors: 32, frameStep: 3 }
  ],
  high: [
    { maxWidth: 720, maxColors: 128, frameStep: 1 },
    { maxWidth: 480, maxColors: 128, frameStep: 2 },
    { maxWidth: 480, maxColors: 64, frameStep: 2 },
    { maxWidth: 360, maxColors: 64, frameStep: 2 },
    { maxWidth: 360, maxColors: 32, frameStep: 3 },
    { maxWidth: 240, maxColors: 32, frameStep: 3 }
  ]
};

function postMessageSafe(message: WorkerResponseMessage, transfer: Transferable[] = []): void {
  workerScope.postMessage(message, transfer);
}

function postProgress(stage: string, attempt: number, totalAttempts: number, detail: string): void {
  const percent = Math.round((attempt / totalAttempts) * 100);
  postMessageSafe({
    type: 'progress',
    payload: { stage, attempt, totalAttempts, detail, percent }
  });
}

function clampStrategy(strategy: Strategy, originalWidth: number, settings: CompressionSettings): Strategy {
  const widthLimit = settings.maxWidth ?? originalWidth;
  const frameStepLimit = settings.maxFrameStep ?? strategy.frameStep;
  const colorLimit = settings.colorLimit ?? strategy.maxColors;

  return {
    maxWidth: Math.min(originalWidth, strategy.maxWidth, widthLimit),
    maxColors: Math.min(strategy.maxColors, colorLimit),
    frameStep: Math.max(1, Math.min(strategy.frameStep, frameStepLimit))
  };
}

function buildStrategies(originalWidth: number, settings: CompressionSettings): Strategy[] {
  const presetStrategies = modeStrategyPresets[settings.mode];
  const rawStrategies = settings.auto
    ? presetStrategies.map((strategy) => clampStrategy(strategy, originalWidth, settings))
    : [
        clampStrategy(
          {
            maxWidth: settings.maxWidth ?? (settings.mode === 'quality' ? originalWidth : settings.mode === 'high' ? 480 : 720),
            maxColors: settings.colorLimit ?? (settings.mode === 'quality' ? 256 : settings.mode === 'high' ? 64 : 128),
            frameStep: settings.maxFrameStep ?? 1
          },
          originalWidth,
          settings
        )
      ];

  const seen = new Set<string>();
  const unique: Strategy[] = [];

  for (const strategy of rawStrategies) {
    const key = `${strategy.maxWidth}-${strategy.maxColors}-${strategy.frameStep}`;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(strategy);
    }
  }

  if (unique.length === 0) {
    unique.push({ maxWidth: originalWidth, maxColors: 256, frameStep: 1 });
  }

  return unique;
}

function describeStrategy(strategy: Strategy, outputWidth: number, outputHeight: number): string {
  return `${outputWidth}x${outputHeight}, ${strategy.maxColors} colors, every ${strategy.frameStep === 1 ? 'frame' : `${strategy.frameStep}th frame`}`;
}

function resizeFrame(
  source: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): Uint8ClampedArray {
  if (sourceWidth === targetWidth && sourceHeight === targetHeight) {
    return new Uint8ClampedArray(source);
  }

  if (typeof OffscreenCanvas !== 'undefined') {
    const sourceCanvas = new OffscreenCanvas(sourceWidth, sourceHeight);
    const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });

    if (sourceContext) {
      const imageData = new ImageData(new Uint8ClampedArray(source), sourceWidth, sourceHeight);
      sourceContext.putImageData(imageData, 0, 0);

      const targetCanvas = new OffscreenCanvas(targetWidth, targetHeight);
      const targetContext = targetCanvas.getContext('2d', { willReadFrequently: true });

      if (targetContext) {
        targetContext.clearRect(0, 0, targetWidth, targetHeight);
        targetContext.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);
        return targetContext.getImageData(0, 0, targetWidth, targetHeight).data;
      }
    }
  }

  const output = new Uint8ClampedArray(targetWidth * targetHeight * 4);

  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = Math.min(sourceHeight - 1, Math.floor((y / targetHeight) * sourceHeight));

    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor((x / targetWidth) * sourceWidth));
      const sourceIndex = (sourceY * sourceWidth + sourceX) * 4;
      const outputIndex = (y * targetWidth + x) * 4;

      output[outputIndex] = source[sourceIndex];
      output[outputIndex + 1] = source[sourceIndex + 1];
      output[outputIndex + 2] = source[sourceIndex + 2];
      output[outputIndex + 3] = source[sourceIndex + 3];
    }
  }

  return output;
}

function parseLoopCount(parsedGif: { frames?: Array<{ application?: { id?: string; blocks?: Uint8Array } }> }): number {
  const applicationFrame = parsedGif.frames?.find((frame) => frame.application?.id === 'NETSCAPE2.0');
  const blocks = applicationFrame?.application?.blocks;

  if (!blocks || blocks.length < 3 || blocks[0] !== 1) {
    return -1;
  }

  return blocks[1] | (blocks[2] << 8);
}

function assertMemoryBudget(width: number, height: number, frameCount: number): void {
  const estimatedBytes = width * height * 4 * Math.max(1, frameCount);

  if (estimatedBytes > MAX_ESTIMATED_FRAME_MEMORY_BYTES) {
    throw new RangeError('This GIF is too large for available browser memory. Try a smaller file or lower the animation size.');
  }
}

function normalizeDispose(value: number | undefined): number {
  if (value === 2 || value === 3) {
    return value;
  }

  return 1;
}

function compositeFrames(fileBuffer: ArrayBuffer): ParsedGifData {
  const gif = parseGIF(fileBuffer) as unknown as {
    lsd: { width: number; height: number };
    frames: Array<{ application?: { id?: string; blocks?: Uint8Array } }>;
  };
  const decompressed = decompressFrames(gif as never, true) as GifFrame[];
  const width = gif.lsd.width;
  const height = gif.lsd.height;
  assertMemoryBudget(width, height, decompressed.length);
  const loopCount = parseLoopCount(gif);
  const composedFrames: ParsedFrame[] = [];
  const working = new Uint8ClampedArray(width * height * 4);
  let restoreSnapshot: Uint8ClampedArray | null = null;
  let previousFrame: GifFrame | null = null;

  for (const frame of decompressed) {
    if (previousFrame) {
      if (previousFrame.disposalType === 2) {
        const { left, top, width: frameWidth, height: frameHeight } = previousFrame.dims;

        for (let y = top; y < top + frameHeight; y += 1) {
          for (let x = left; x < left + frameWidth; x += 1) {
            const index = (y * width + x) * 4;
            working[index] = 0;
            working[index + 1] = 0;
            working[index + 2] = 0;
            working[index + 3] = 0;
          }
        }
      } else if (previousFrame.disposalType === 3 && restoreSnapshot) {
        working.set(restoreSnapshot);
      }
    }

    restoreSnapshot = frame.disposalType === 3 ? new Uint8ClampedArray(working) : null;

    const { left, top, width: patchWidth, height: patchHeight } = frame.dims;
    const patch = frame.patch;

    for (let y = 0; y < patchHeight; y += 1) {
      for (let x = 0; x < patchWidth; x += 1) {
        const patchIndex = (y * patchWidth + x) * 4;
        const alpha = patch[patchIndex + 3];

        if (alpha === 0) {
          continue;
        }

        const canvasIndex = ((top + y) * width + (left + x)) * 4;
        working[canvasIndex] = patch[patchIndex];
        working[canvasIndex + 1] = patch[patchIndex + 1];
        working[canvasIndex + 2] = patch[patchIndex + 2];
        working[canvasIndex + 3] = alpha;
      }
    }

    composedFrames.push({
      width,
      height,
      rgba: new Uint8ClampedArray(working),
      delay: Math.max(20, frame.delay ?? 100),
      disposalType: normalizeDispose(frame.disposalType)
    });

    previousFrame = frame;
  }

  if (composedFrames.length === 0) {
    throw new Error('The GIF could not be decoded into animation frames.');
  }

  return { frames: composedFrames, width, height, loopCount };
}

function encodeAttempt(parsed: ParsedGifData, strategy: Strategy): EncodedAttempt {
  const scale = Math.min(1, strategy.maxWidth / parsed.width);
  const width = Math.max(1, Math.round(parsed.width * scale));
  const height = Math.max(1, Math.round(parsed.height * scale));
  const encoder = GIFEncoder();
  let outputFrames = 0;

  for (let index = 0; index < parsed.frames.length; index += strategy.frameStep) {
    const frame = parsed.frames[index];
    const endFrameIndex = Math.min(parsed.frames.length - 1, index + strategy.frameStep - 1);
    const finalFrameInGroup = parsed.frames[endFrameIndex];
    let totalDelay = 0;

    for (let delayIndex = index; delayIndex <= endFrameIndex; delayIndex += 1) {
      totalDelay += parsed.frames[delayIndex].delay;
    }

    const resized = resizeFrame(frame.rgba, frame.width, frame.height, width, height);
    const palette = quantize(resized, strategy.maxColors, {
      format: 'rgba4444',
      oneBitAlpha: true,
      clearAlpha: true,
      clearAlphaThreshold: 0
    });
    const indexData = applyPalette(resized, palette, 'rgba4444');
    const transparentIndex = palette.findIndex((color) => color.length === 4 && color[3] === 0);

    encoder.writeFrame(indexData, width, height, {
      palette,
      delay: Math.max(20, totalDelay),
      transparent: transparentIndex >= 0,
      transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
      repeat: outputFrames === 0 ? parsed.loopCount : undefined,
      dispose: finalFrameInGroup.disposalType
    });

    outputFrames += 1;
  }

  encoder.finish();

  return {
    bytes: encoder.bytesView(),
    width,
    height,
    strategy,
    outputFrames
  };
}

function chooseBestAttempt(attempts: EncodedAttempt[], targetBytes: number): EncodedAttempt {
  const underTarget = attempts.find((attempt) => attempt.bytes.byteLength <= targetBytes);

  if (underTarget) {
    return underTarget;
  }

  return attempts.reduce((best, current) => {
    return current.bytes.byteLength < best.bytes.byteLength ? current : best;
  });
}

function buildSummary(parsed: ParsedGifData, attempt: EncodedAttempt, mode: CompressionMode): CompressionSummary {
  return {
    inputFrames: parsed.frames.length,
    outputFrames: attempt.outputFrames,
    originalWidth: parsed.width,
    originalHeight: parsed.height,
    outputWidth: attempt.width,
    outputHeight: attempt.height,
    maxColors: attempt.strategy.maxColors,
    colorsUsed: attempt.strategy.maxColors,
    frameStep: attempt.strategy.frameStep,
    maxWidth: attempt.strategy.maxWidth,
    loopCount: parsed.loopCount,
    mode
  };
}

workerScope.addEventListener('message', (event: MessageEvent<WorkerCompressRequest>) => {
  if (event.data.type !== 'compress') {
    return;
  }

  try {
    const { fileBuffer, settings } = event.data;
    const parsed = compositeFrames(fileBuffer);
    const strategies = buildStrategies(parsed.width, settings);
    const attempts: EncodedAttempt[] = [];

    postProgress('Analyzing GIF', 1, strategies.length + 1, 'Decoding animation frames');

    for (let index = 0; index < strategies.length; index += 1) {
      const strategy = strategies[index];
      const targetWidth = Math.max(1, Math.round(parsed.width * Math.min(1, strategy.maxWidth / parsed.width)));
      const targetHeight = Math.max(1, Math.round(parsed.height * Math.min(1, strategy.maxWidth / parsed.width)));

      postProgress(
        'Compressing GIF',
        index + 2,
        strategies.length + 1,
        describeStrategy(strategy, targetWidth, targetHeight)
      );

      const attempt = encodeAttempt(parsed, strategy);
      attempts.push(attempt);

      if (attempt.bytes.byteLength <= settings.targetBytes) {
        break;
      }
    }

    const bestAttempt = chooseBestAttempt(attempts, settings.targetBytes);
    const summary = buildSummary(parsed, bestAttempt, settings.mode);
    const compressedBytes = bestAttempt.bytes.byteLength;

    postMessageSafe(
      {
        type: 'success',
        payload: {
          bytes: bestAttempt.bytes,
          width: bestAttempt.width,
          height: bestAttempt.height,
          originalBytes: fileBuffer.byteLength,
          compressedBytes,
          underTarget: compressedBytes <= settings.targetBytes,
          bestPossible: compressedBytes > settings.targetBytes,
          strategySummary: describeStrategy(bestAttempt.strategy, bestAttempt.width, bestAttempt.height),
          summary
        }
      },
      [bestAttempt.bytes.buffer]
    );
  } catch (error) {
    const message =
      error instanceof RangeError
        ? 'This GIF is too large for available browser memory. Try a smaller file or close other tabs.'
        : error instanceof Error
          ? error.message
          : 'GIF compression failed.';

    postMessageSafe({
      type: 'error',
      payload: { message }
    });
  }
});
