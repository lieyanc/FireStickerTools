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
  width: number;
  height: number;
  element: HTMLImageElement;
}

export interface DisplayTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export type DragTarget = {
  type: 'row' | 'col';
  index: number;
  isEdge: boolean;
} | null;

export type DragMode = 'redistribute' | 'independent';
