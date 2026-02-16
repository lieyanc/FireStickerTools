import type { CellRect, LoadedImage } from '../types.ts';
import { compositeGifFrames } from './image-loader.ts';
// @ts-ignore - gifenc has no type declarations
import GIFEncoder, { quantize, applyPalette } from 'gifenc';

/**
 * Crop a GIF to a specific cell region and return a Blob of the cropped GIF.
 */
export function cropGif(loaded: LoadedImage, cell: CellRect): Blob {
  const compositedFrames = compositeGifFrames(loaded);
  if (compositedFrames.length === 0) {
    throw new Error('No GIF frames to crop');
  }

  const encoder = GIFEncoder();
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cell.width;
  cropCanvas.height = cell.height;
  const cropCtx = cropCanvas.getContext('2d')!;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = loaded.width;
  tempCanvas.height = loaded.height;
  const tempCtx = tempCanvas.getContext('2d')!;

  for (let i = 0; i < compositedFrames.length; i++) {
    const frame = compositedFrames[i];

    // Put the full composited frame onto temp canvas
    tempCtx.putImageData(frame.imageData, 0, 0);

    // Crop the region
    cropCtx.clearRect(0, 0, cell.width, cell.height);
    cropCtx.drawImage(
      tempCanvas,
      cell.x, cell.y, cell.width, cell.height,
      0, 0, cell.width, cell.height
    );

    // Get pixel data for the cropped region
    const croppedData = cropCtx.getImageData(0, 0, cell.width, cell.height);
    const { data, width, height } = croppedData;

    // Convert RGBA to RGB format for quantization
    const rgbData = new Uint8Array(width * height * 3);
    for (let j = 0; j < width * height; j++) {
      rgbData[j * 3] = data[j * 4];
      rgbData[j * 3 + 1] = data[j * 4 + 1];
      rgbData[j * 3 + 2] = data[j * 4 + 2];
    }

    // Quantize and encode
    const palette = quantize(rgbData, 256);
    const indexedPixels = applyPalette(rgbData, palette);

    encoder.writeFrame(indexedPixels, width, height, {
      palette: i === 0 ? palette : palette,
      delay: frame.delay,
      dispose: 2,
    });
  }

  encoder.finish();
  const bytes = encoder.bytes();
  return new Blob([bytes], { type: 'image/gif' });
}
