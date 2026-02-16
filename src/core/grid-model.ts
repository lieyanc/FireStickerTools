import type { GridConfig, GridBoundaries, CellRect } from '../types.ts';

export class GridModel {
  private _rows: number;
  private _cols: number;
  private _imageWidth: number;
  private _imageHeight: number;
  private _rowBoundaries: number[];
  private _colBoundaries: number[];

  constructor(imageWidth: number, imageHeight: number, config: GridConfig) {
    this._imageWidth = imageWidth;
    this._imageHeight = imageHeight;
    this._rows = config.rows;
    this._cols = config.cols;
    this._rowBoundaries = [];
    this._colBoundaries = [];
    this._initEqualGrid();
  }

  get rows(): number { return this._rows; }
  get cols(): number { return this._cols; }
  get imageWidth(): number { return this._imageWidth; }
  get imageHeight(): number { return this._imageHeight; }

  get boundaries(): GridBoundaries {
    return {
      rowBoundaries: [...this._rowBoundaries],
      colBoundaries: [...this._colBoundaries],
    };
  }

  private _initEqualGrid(): void {
    this._rowBoundaries = [];
    this._colBoundaries = [];

    for (let i = 0; i <= this._rows; i++) {
      this._rowBoundaries.push(Math.round((i / this._rows) * this._imageHeight));
    }
    for (let i = 0; i <= this._cols; i++) {
      this._colBoundaries.push(Math.round((i / this._cols) * this._imageWidth));
    }
  }

  setGrid(config: GridConfig): void {
    this._rows = config.rows;
    this._cols = config.cols;
    this._initEqualGrid();
  }

  moveBoundary(type: 'row' | 'col', index: number, position: number, redistribute = false): void {
    const boundaries = type === 'row' ? this._rowBoundaries : this._colBoundaries;
    const minGap = 4; // minimum pixel gap
    const last = boundaries.length - 1;

    if (index === 0) {
      // First edge: clamp to [0, boundaries[1] - minGap]
      boundaries[0] = Math.round(Math.max(0, Math.min(boundaries[1] - minGap, position)));
      if (redistribute) this.redistributeInner(type);
    } else if (index === last) {
      // Last edge: clamp to [boundaries[last-1] + minGap, max]
      const max = type === 'row' ? this._imageHeight : this._imageWidth;
      boundaries[last] = Math.round(Math.max(boundaries[last - 1] + minGap, Math.min(max, position)));
      if (redistribute) this.redistributeInner(type);
    } else {
      // Inner line: clamp between adjacent boundaries
      const minPos = boundaries[index - 1] + minGap;
      const maxPos = boundaries[index + 1] - minGap;
      boundaries[index] = Math.round(Math.max(minPos, Math.min(maxPos, position)));
    }
  }

  redistributeInner(type: 'row' | 'col'): void {
    const boundaries = type === 'row' ? this._rowBoundaries : this._colBoundaries;
    const first = boundaries[0];
    const last = boundaries[boundaries.length - 1];
    const count = boundaries.length - 1; // number of segments

    for (let i = 1; i < boundaries.length - 1; i++) {
      boundaries[i] = Math.round(first + (i / count) * (last - first));
    }
  }

  getCells(): CellRect[] {
    const cells: CellRect[] = [];
    for (let r = 0; r < this._rows; r++) {
      for (let c = 0; c < this._cols; c++) {
        const x = this._colBoundaries[c];
        const y = this._rowBoundaries[r];
        const width = this._colBoundaries[c + 1] - x;
        const height = this._rowBoundaries[r + 1] - y;
        cells.push({ x, y, width, height, row: r, col: c });
      }
    }
    return cells;
  }

  /**
   * Find which boundary line (if any) is near the given image-space coordinates.
   * Returns null if nothing is within hitRadius pixels.
   */
  hitTest(imageX: number, imageY: number, hitRadius: number): { type: 'row' | 'col'; index: number; isEdge: boolean } | null {
    // Check column boundaries (vertical lines) — test x
    for (let i = 0; i < this._colBoundaries.length; i++) {
      if (Math.abs(imageX - this._colBoundaries[i]) <= hitRadius) {
        const isEdge = i === 0 || i === this._colBoundaries.length - 1;
        return { type: 'col', index: i, isEdge };
      }
    }
    // Check row boundaries (horizontal lines) — test y
    for (let i = 0; i < this._rowBoundaries.length; i++) {
      if (Math.abs(imageY - this._rowBoundaries[i]) <= hitRadius) {
        const isEdge = i === 0 || i === this._rowBoundaries.length - 1;
        return { type: 'row', index: i, isEdge };
      }
    }
    return null;
  }
}
