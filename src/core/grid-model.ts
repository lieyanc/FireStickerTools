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

  moveBoundary(type: 'row' | 'col', index: number, position: number): void {
    const boundaries = type === 'row' ? this._rowBoundaries : this._colBoundaries;

    // Can't move first or last boundary
    if (index <= 0 || index >= boundaries.length - 1) return;

    const minGap = 4; // minimum pixel gap
    const minPos = boundaries[index - 1] + minGap;
    const maxPos = boundaries[index + 1] - minGap;

    boundaries[index] = Math.round(Math.max(minPos, Math.min(maxPos, position)));
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
  hitTest(imageX: number, imageY: number, hitRadius: number): { type: 'row' | 'col'; index: number } | null {
    // Check column boundaries (vertical lines) — test x
    for (let i = 1; i < this._colBoundaries.length - 1; i++) {
      if (Math.abs(imageX - this._colBoundaries[i]) <= hitRadius) {
        return { type: 'col', index: i };
      }
    }
    // Check row boundaries (horizontal lines) — test y
    for (let i = 1; i < this._rowBoundaries.length - 1; i++) {
      if (Math.abs(imageY - this._rowBoundaries[i]) <= hitRadius) {
        return { type: 'row', index: i };
      }
    }
    return null;
  }
}
