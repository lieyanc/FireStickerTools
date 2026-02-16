import type { CellRect } from '../types.ts';
import { cropStaticImage } from './image-splitter.ts';
// @ts-ignore - gifenc has no type declarations
import GIFEncoder, { quantize, applyPalette } from 'gifenc';

/**
 * Crop a cell from a static image and encode it as a single-frame GIF.
 */
export function cropToGif(
  source: HTMLImageElement | HTMLCanvasElement,
  cell: CellRect,
): Blob {
  const canvas = cropStaticImage(source, cell);
  const ctx = canvas.getContext('2d')!;
  const { width, height } = canvas;

  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;

  // Convert RGBA to RGB for quantization
  const rgbData = new Uint8Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    rgbData[i * 3] = data[i * 4];
    rgbData[i * 3 + 1] = data[i * 4 + 1];
    rgbData[i * 3 + 2] = data[i * 4 + 2];
  }

  const palette = quantize(rgbData, 256);
  const indexedPixels = applyPalette(rgbData, palette);

  const encoder = GIFEncoder();
  encoder.writeFrame(indexedPixels, width, height, { palette });
  encoder.finish();

  return new Blob([encoder.bytes()], { type: 'image/gif' });
}
