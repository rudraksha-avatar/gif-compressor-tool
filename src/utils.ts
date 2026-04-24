import { parseGIF } from 'gifuct-js';
import type { GifFileMetadata } from './types';

export type SizeUnit = 'KB' | 'MB';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function toTargetBytes(value: number, unit: SizeUnit): number {
  const safeValue = Number.isFinite(value) && value > 0 ? value : 1024;
  return unit === 'MB' ? Math.round(safeValue * 1024 * 1024) : Math.round(safeValue * 1024);
}

export function isGifFile(file: File): boolean {
  return file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
}

export function validateGifFile(file: File): string | null {
  if (!isGifFile(file)) {
    return 'Please choose a valid GIF file.';
  }

  if (file.size === 0) {
    return 'The selected GIF file is empty.';
  }

  return null;
}

export function cleanupObjectUrl(url: string): void {
  if (url) {
    URL.revokeObjectURL(url);
  }
}

export function toNullablePositiveInteger(value: string): number | null {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.round(parsed);
}

export function getBrowserSupportIssue(): string | null {
  if (typeof Worker === 'undefined') {
    return 'This browser does not support Web Workers, so GIF compression cannot run safely.';
  }

  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return 'This browser does not support object URLs required for GIF preview and download.';
  }

  return null;
}

export async function readGifMetadata(file: File): Promise<GifFileMetadata | null> {
  try {
    const buffer = await file.arrayBuffer();
    const parsed = parseGIF(buffer) as unknown as {
      lsd?: { width?: number; height?: number };
      frames?: Array<{ image?: unknown }>;
    };

    const width = parsed.lsd?.width;
    const height = parsed.lsd?.height;
    const frameCount = parsed.frames?.filter((frame) => Boolean(frame.image)).length ?? 0;

    if (!width || !height || frameCount === 0) {
      return null;
    }

    return { width, height, frameCount };
  } catch {
    return null;
  }
}
