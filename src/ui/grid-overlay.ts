import type { LoadedImage, DisplayTransform, DragTarget, DragMode } from '../types.ts';
import { GridModel } from '../core/grid-model.ts';

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
  private dragTarget: DragTarget = null;
  private isDragging = false;
  private dragMode: DragMode = 'redistribute';
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

  setDragMode(mode: DragMode): void {
    this.dragMode = mode;
  }

  setImage(loaded: LoadedImage): void {
    this.loadedImage = loaded;
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
    if (!this.loadedImage) return;

    const { scale, offsetX, offsetY } = this.transform;
    const canvasW = this.imageCanvas.width / (window.devicePixelRatio || 1);
    const canvasH = this.imageCanvas.height / (window.devicePixelRatio || 1);

    this.imageCtx.clearRect(0, 0, canvasW, canvasH);

    // Draw checkerboard background for the image area
    const imgDisplayW = this.loadedImage.width * scale;
    const imgDisplayH = this.loadedImage.height * scale;
    this._drawCheckerboard(this.imageCtx, offsetX, offsetY, imgDisplayW, imgDisplayH);

    this.imageCtx.drawImage(
      this.loadedImage.element,
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
    const rowB = boundaries.rowBoundaries;
    const colB = boundaries.colBoundaries;

    // Compute display positions of the outer edges
    const leftEdge = colB[0] * scale + offsetX;
    const rightEdge = colB[colB.length - 1] * scale + offsetX;
    const topEdge = rowB[0] * scale + offsetY;
    const bottomEdge = rowB[rowB.length - 1] * scale + offsetY;

    // Draw semi-transparent mask outside outer edges
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    // Top mask
    if (topEdge > 0) ctx.fillRect(0, 0, canvasW, topEdge);
    // Bottom mask
    if (bottomEdge < canvasH) ctx.fillRect(0, bottomEdge, canvasW, canvasH - bottomEdge);
    // Left mask (between top and bottom edges)
    if (leftEdge > 0) ctx.fillRect(0, topEdge, leftEdge, bottomEdge - topEdge);
    // Right mask
    if (rightEdge < canvasW) ctx.fillRect(rightEdge, topEdge, canvasW - rightEdge, bottomEdge - topEdge);
    ctx.restore();

    ctx.save();

    // Draw edge boundaries (solid pink lines)
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 107, 157, 0.9)';

    // Top edge
    ctx.beginPath();
    ctx.moveTo(leftEdge, topEdge);
    ctx.lineTo(rightEdge, topEdge);
    ctx.stroke();
    // Bottom edge
    ctx.beginPath();
    ctx.moveTo(leftEdge, bottomEdge);
    ctx.lineTo(rightEdge, bottomEdge);
    ctx.stroke();
    // Left edge
    ctx.beginPath();
    ctx.moveTo(leftEdge, topEdge);
    ctx.lineTo(leftEdge, bottomEdge);
    ctx.stroke();
    // Right edge
    ctx.beginPath();
    ctx.moveTo(rightEdge, topEdge);
    ctx.lineTo(rightEdge, bottomEdge);
    ctx.stroke();

    // Draw drag handles on edge midpoints
    const handleSize = 5;
    ctx.fillStyle = 'rgba(255, 107, 157, 0.9)';
    const midX = (leftEdge + rightEdge) / 2;
    const midY = (topEdge + bottomEdge) / 2;
    // Top handle
    this._drawHandle(ctx, midX, topEdge, handleSize);
    // Bottom handle
    this._drawHandle(ctx, midX, bottomEdge, handleSize);
    // Left handle
    this._drawHandle(ctx, leftEdge, midY, handleSize);
    // Right handle
    this._drawHandle(ctx, rightEdge, midY, handleSize);

    // Draw inner boundaries (dashed lines)
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(1, 142, 238, 0.8)';

    // Inner column lines
    for (let i = 1; i < colB.length - 1; i++) {
      const x = colB[i] * scale + offsetX;
      ctx.beginPath();
      ctx.moveTo(x, topEdge);
      ctx.lineTo(x, bottomEdge);
      ctx.stroke();
    }

    // Inner row lines
    for (let i = 1; i < rowB.length - 1; i++) {
      const y = rowB[i] * scale + offsetY;
      ctx.beginPath();
      ctx.moveTo(leftEdge, y);
      ctx.lineTo(rightEdge, y);
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
        ctx.fillStyle = 'rgba(1, 142, 238, 0.5)';
        const label = `${cell.row + 1},${cell.col + 1}`;
        ctx.fillText(label, cx, cy);
      }
    }

    ctx.restore();
  }

  private _drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
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
      const redistribute = this.dragTarget.isEdge && this.dragMode === 'redistribute';
      this.gridModel.moveBoundary(this.dragTarget.type, this.dragTarget.index, position, redistribute);

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
