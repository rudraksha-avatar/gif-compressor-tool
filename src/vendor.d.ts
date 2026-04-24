declare module 'gifenc' {
  export type PaletteColor = [number, number, number] | [number, number, number, number];

  export interface GifEncoderInstance {
    finish(): void;
    bytesView(): Uint8Array;
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: {
        transparent?: boolean;
        transparentIndex?: number;
        delay?: number;
        palette?: PaletteColor[];
        repeat?: number;
        colorDepth?: number;
        dispose?: number;
      }
    ): void;
  }

  export function GIFEncoder(options?: { initialCapacity?: number; auto?: boolean }): GifEncoderInstance;
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: PaletteColor[],
    format?: 'rgb565' | 'rgb444' | 'rgba4444'
  ): Uint8Array;
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: Record<string, unknown>
  ): PaletteColor[];
}
