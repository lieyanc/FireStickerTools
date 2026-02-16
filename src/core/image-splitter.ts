import type { CellRect } from '../types.ts';

/**
 * Crop a region from a static image (HTMLImageElement or HTMLCanvasElement)
 * and return a new canvas with the cropped content.
 */
export function cropStaticImage(
  source: HTMLImageElement | HTMLCanvasElement,
  cell: CellRect
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = cell.width;
  canvas.height = cell.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    source,
    cell.x, cell.y, cell.width, cell.height,
    0, 0, cell.width, cell.height
  );
  return canvas;
}

/**
 * Convert a canvas to a Blob of the specified format.
 */
export function canvasToBlob(canvas: HTMLCanvasElement, format: 'jpg' | 'png' = 'jpg'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const quality = format === 'jpg' ? 0.92 : undefined;
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      mimeType,
      quality
    );
  });
}
