import type { LoadedImage, ParsedGifFrame } from '../types.ts';
import { parseGIF, decompressFrames } from 'gifuct-js';

export function isGif(file: File): boolean {
  return file.type === 'image/gif';
}

export function loadStaticImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        type: 'static',
        width: img.naturalWidth,
        height: img.naturalHeight,
        element: img,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('无法加载图片'));
    };
    img.src = url;
  });
}

export async function loadGifImage(file: File): Promise<LoadedImage> {
  const buffer = await file.arrayBuffer();
  const parsed = parseGIF(buffer);
  const frames = decompressFrames(parsed, true);

  if (frames.length === 0) {
    throw new Error('GIF 文件没有帧数据');
  }

  const width = parsed.lsd.width;
  const height = parsed.lsd.height;

  const gifFrames: ParsedGifFrame[] = frames.map((f) => {
    const imageData = new ImageData(
      new Uint8ClampedArray(f.patch),
      f.dims.width,
      f.dims.height
    );
    return {
      imageData,
      delay: f.delay,
      disposalType: f.disposalType,
      patch: new Uint8ClampedArray(f.patch),
      dims: { ...f.dims },
    };
  });

  return {
    type: 'gif',
    width,
    height,
    gifFrames,
    gifRawData: buffer,
  };
}

export async function loadImage(file: File): Promise<LoadedImage> {
  if (isGif(file)) {
    return loadGifImage(file);
  }
  return loadStaticImage(file);
}

/**
 * Render all GIF frames composited onto a full-size canvas,
 * returning the first frame as an HTMLImageElement for preview.
 */
export function renderGifFirstFrame(loaded: LoadedImage): HTMLCanvasElement | null {
  if (loaded.type !== 'gif' || !loaded.gifFrames || loaded.gifFrames.length === 0) {
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = loaded.width;
  canvas.height = loaded.height;
  const ctx = canvas.getContext('2d')!;

  // Render first frame
  const frame = loaded.gifFrames[0];
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = frame.dims.width;
  tempCanvas.height = frame.dims.height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(frame.imageData, 0, 0);
  ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);

  return canvas;
}

/**
 * Composite all GIF frames and return full-canvas ImageData for each frame.
 */
export function compositeGifFrames(loaded: LoadedImage): { imageData: ImageData; delay: number }[] {
  if (loaded.type !== 'gif' || !loaded.gifFrames) return [];

  const { width, height, gifFrames } = loaded;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const result: { imageData: ImageData; delay: number }[] = [];

  for (const frame of gifFrames) {
    // Save state before drawing (for disposal type 3)
    let savedImageData: ImageData | null = null;
    if (frame.disposalType === 3) {
      savedImageData = ctx.getImageData(0, 0, width, height);
    }

    // Draw current frame patch
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = frame.dims.width;
    tempCanvas.height = frame.dims.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(frame.imageData, 0, 0);
    ctx.drawImage(tempCanvas, frame.dims.left, frame.dims.top);

    // Capture composited frame
    result.push({
      imageData: ctx.getImageData(0, 0, width, height),
      delay: frame.delay,
    });

    // Handle disposal
    if (frame.disposalType === 2) {
      ctx.clearRect(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
    } else if (frame.disposalType === 3 && savedImageData) {
      ctx.putImageData(savedImageData, 0, 0);
    }
  }

  return result;
}
