import type { LoadedImage, DisplayTransform, DragTarget } from '../types.ts';
import { GridModel } from '../core/grid-model.ts';
import { renderGifFirstFrame } from '../core/image-loader.ts';

export type GridChangeCallback = () => void;

export class GridOverlay {
  private container: HTMLElement;
  private imageCanvas: HTMLCanvasElement;
  private overlayCanvas: HTMLCanvasElement;
  private imageCtx: CanvasRenderingContext2D;
  private overlayCtx: CanvasRenderingContext2D;
  private transform: DisplayTransform = { scale: 1, offsetX: 0, offsetY: 0 };
  private gridModel: GridModel | null = null;
  private loadedImage: LoadedImage | null = null;
  private imageSource: HTMLImageElement | HTMLCanvasElement | null = null;
  private dragTarget: DragTarget = null;
  private isDragging = false;
  private rafId = 0;
  private onChange: GridChangeCallback | null = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;

    this.imageCanvas = document.createElement('canvas');
    this.imageCanvas.className = 'grid-canvas-image';

    this.overlayCanvas = document.createElement('canvas');
    this.overlayCanvas.className = 'grid-canvas-overlay';

    this.container.appendChild(this.imageCanvas);
    this.container.appendChild(this.overlayCanvas);

    this.imageCtx = this.imageCanvas.getContext('2d')!;
    this.overlayCtx = this.overlayCanvas.getContext('2d')!;

    this._bindEvents();
  }

  setOnChange(cb: GridChangeCallback): void {
    this.onChange = cb;
  }

  setImage(loaded: LoadedImage): void {
    this.loadedImage = loaded;

    if (loaded.type === 'static' && loaded.element) {
      this.imageSource = loaded.element;
    } else if (loaded.type === 'gif') {
      this.imageSource = renderGifFirstFrame(loaded);
    }

    this._updateLayout();
    this._drawImage();
  }

  setGridModel(model: GridModel): void {
    this.gridModel = model;
    this._drawOverlay();
  }

  getGridModel(): GridModel | null {
    return this.gridModel;
  }

  refreshOverlay(): void {
    this._drawOverlay();
  }

  private _updateLayout(): void {
    if (!this.loadedImage) return;

    const containerRect = this.container.getBoundingClientRect();
    const containerW = containerRect.width;
    const containerH = Math.max(400, Math.min(containerW * 0.75, 700));

    this.container.style.height = containerH + 'px';

    const dpr = window.devicePixelRatio || 1;
    const canvasW = containerW;
    const canvasH = containerH;

    for (const c of [this.imageCanvas, this.overlayCanvas]) {
      c.width = canvasW * dpr;
      c.height = canvasH * dpr;
      c.style.width = canvasW + 'px';
      c.style.height = canvasH + 'px';
    }

    this.imageCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.overlayCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Calculate transform
    const imgW = this.loadedImage.width;
    const imgH = this.loadedImage.height;
    const scale = Math.min(canvasW / imgW, canvasH / imgH) * 0.92;
    const offsetX = (canvasW - imgW * scale) / 2;
    const offsetY = (canvasH - imgH * scale) / 2;

    this.transform = { scale, offsetX, offsetY };
  }

  private _drawImage(): void {
    if (!this.imageSource || !this.loadedImage) return;

    const { scale, offsetX, offsetY } = this.transform;
    const canvasW = this.imageCanvas.width / (window.devicePixelRatio || 1);
    const canvasH = this.imageCanvas.height / (window.devicePixelRatio || 1);

    this.imageCtx.clearRect(0, 0, canvasW, canvasH);

    // Draw checkerboard background for the image area
    const imgDisplayW = this.loadedImage.width * scale;
    const imgDisplayH = this.loadedImage.height * scale;
    this._drawCheckerboard(this.imageCtx, offsetX, offsetY, imgDisplayW, imgDisplayH);

    this.imageCtx.drawImage(
      this.imageSource,
      offsetX, offsetY,
      imgDisplayW, imgDisplayH
    );
  }

  private _drawCheckerboard(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number
  ): void {
    const size = 8;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    for (let row = 0; row * size < h; row++) {
      for (let col = 0; col * size < w; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#2a2a3a' : '#1e1e2e';
        ctx.fillRect(x + col * size, y + row * size, size, size);
      }
    }
    ctx.restore();
  }

  private _drawOverlay(): void {
    if (!this.gridModel) return;

    const { scale, offsetX, offsetY } = this.transform;
    const canvasW = this.overlayCanvas.width / (window.devicePixelRatio || 1);
    const canvasH = this.overlayCanvas.height / (window.devicePixelRatio || 1);
    const ctx = this.overlayCtx;

    ctx.clearRect(0, 0, canvasW, canvasH);

    const boundaries = this.gridModel.boundaries;

    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;

    // Draw column boundaries (vertical lines)
    for (let i = 0; i <= this.gridModel.cols; i++) {
      const x = boundaries.colBoundaries[i] * scale + offsetX;
      const y1 = offsetY;
      const y2 = this.gridModel.imageHeight * scale + offsetY;

      const isEdge = i === 0 || i === this.gridModel.cols;
      ctx.strokeStyle = isEdge ? 'rgba(108, 99, 255, 0.3)' : 'rgba(108, 99, 255, 0.8)';

      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
    }

    // Draw row boundaries (horizontal lines)
    for (let i = 0; i <= this.gridModel.rows; i++) {
      const y = boundaries.rowBoundaries[i] * scale + offsetY;
      const x1 = offsetX;
      const x2 = this.gridModel.imageWidth * scale + offsetX;

      const isEdge = i === 0 || i === this.gridModel.rows;
      ctx.strokeStyle = isEdge ? 'rgba(108, 99, 255, 0.3)' : 'rgba(108, 99, 255, 0.8)';

      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    }

    // Draw cell labels
    const cells = this.gridModel.getCells();
    ctx.setLineDash([]);
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const cell of cells) {
      const cx = (cell.x + cell.width / 2) * scale + offsetX;
      const cy = (cell.y + cell.height / 2) * scale + offsetY;

      const cellDisplayW = cell.width * scale;
      const cellDisplayH = cell.height * scale;

      // Only show label if cell is large enough
      if (cellDisplayW > 30 && cellDisplayH > 20) {
        ctx.fillStyle = 'rgba(108, 99, 255, 0.5)';
        const label = `${cell.row + 1},${cell.col + 1}`;
        ctx.fillText(label, cx, cy);
      }
    }

    ctx.restore();
  }

  private _displayToImage(displayX: number, displayY: number): { x: number; y: number } {
    return {
      x: (displayX - this.transform.offsetX) / this.transform.scale,
      y: (displayY - this.transform.offsetY) / this.transform.scale,
    };
  }

  private _bindEvents(): void {
    const canvas = this.overlayCanvas;

    canvas.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this._onPointerMove(e));
    canvas.addEventListener('pointerup', () => this._onPointerUp());
    canvas.addEventListener('pointerleave', () => this._onPointerUp());

    // Handle window resize
    window.addEventListener('resize', () => {
      if (this.loadedImage) {
        this._updateLayout();
        this._drawImage();
        this._drawOverlay();
      }
    });
  }

  private _getCanvasPos(e: PointerEvent): { x: number; y: number } {
    const rect = this.overlayCanvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private _onPointerDown(e: PointerEvent): void {
    if (!this.gridModel) return;

    const pos = this._getCanvasPos(e);
    const imgPos = this._displayToImage(pos.x, pos.y);
    const hitRadius = 8 / this.transform.scale;
    const hit = this.gridModel.hitTest(imgPos.x, imgPos.y, hitRadius);

    if (hit) {
      this.isDragging = true;
      this.dragTarget = hit;
      this.overlayCanvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  }

  private _onPointerMove(e: PointerEvent): void {
    if (!this.gridModel) return;

    const pos = this._getCanvasPos(e);
    const imgPos = this._displayToImage(pos.x, pos.y);

    if (this.isDragging && this.dragTarget) {
      const position = this.dragTarget.type === 'row' ? imgPos.y : imgPos.x;
      this.gridModel.moveBoundary(this.dragTarget.type, this.dragTarget.index, position);

      if (!this.rafId) {
        this.rafId = requestAnimationFrame(() => {
          this._drawOverlay();
          this.rafId = 0;
        });
      }
      return;
    }

    // Hover cursor
    const hitRadius = 8 / this.transform.scale;
    const hit = this.gridModel.hitTest(imgPos.x, imgPos.y, hitRadius);

    if (hit) {
      this.overlayCanvas.style.cursor = hit.type === 'col' ? 'col-resize' : 'row-resize';
    } else {
      this.overlayCanvas.style.cursor = 'default';
    }
  }

  private _onPointerUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragTarget = null;
      this.onChange?.();
    }
  }
}
