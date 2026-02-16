export interface GridConfig {
  rows: number;
  cols: number;
}

export interface CellRect {
  x: number;
  y: number;
  width: number;
  height: number;
  row: number;
  col: number;
}

export interface GridBoundaries {
  rowBoundaries: number[]; // length = rows + 1 (including 0 and imageHeight)
  colBoundaries: number[]; // length = cols + 1 (including 0 and imageWidth)
}

export type OutputFormat = 'jpg' | 'gif';

export interface LoadedImage {
  type: 'static' | 'gif';
  width: number;
  height: number;
  element?: HTMLImageElement;        // for static images
  gifFrames?: ParsedGifFrame[];      // for GIF
  gifRawData?: ArrayBuffer;          // raw GIF data for re-encoding
}

export interface ParsedGifFrame {
  imageData: ImageData;
  delay: number;
  disposalType: number;
  patch: Uint8ClampedArray;
  dims: { width: number; height: number; top: number; left: number };
}

export interface DisplayTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export type DragTarget = {
  type: 'row' | 'col';
  index: number;
} | null;
