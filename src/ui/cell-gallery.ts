import type { CellRect, LoadedImage, OutputFormat } from '../types.ts';
import { cropStaticImage, canvasToBlob } from '../core/image-splitter.ts';
import { cropGif } from '../core/gif-splitter.ts';
import { compositeGifFrames } from '../core/image-loader.ts';
import { downloadBlob } from '../utils/download.ts';

export type SelectionChangeCallback = (selectedIndices: Set<number>) => void;

export class CellGallery {
  private container: HTMLElement;
  private cells: CellRect[] = [];
  private loadedImage: LoadedImage | null = null;
  private selectedIndices = new Set<number>();
  private onSelectionChange: SelectionChangeCallback | null = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId)!;
  }

  setOnSelectionChange(cb: SelectionChangeCallback): void {
    this.onSelectionChange = cb;
  }

  update(cells: CellRect[], loaded: LoadedImage): void {
    this.cells = cells;
    this.loadedImage = loaded;
    this.selectedIndices.clear();
    this._render();
    this.onSelectionChange?.(this.selectedIndices);
  }

  getSelectedIndices(): Set<number> {
    return new Set(this.selectedIndices);
  }

  selectAll(): void {
    this.selectedIndices = new Set(this.cells.map((_, i) => i));
    this._updateSelectionUI();
    this.onSelectionChange?.(this.selectedIndices);
  }

  deselectAll(): void {
    this.selectedIndices.clear();
    this._updateSelectionUI();
    this.onSelectionChange?.(this.selectedIndices);
  }

  async downloadSelected(format: OutputFormat): Promise<void> {
    if (!this.loadedImage) return;

    for (const idx of this.selectedIndices) {
      const cell = this.cells[idx];
      await this._downloadCell(cell, idx, format);
    }
  }

  async getCellBlob(index: number, format: OutputFormat): Promise<Blob> {
    const cell = this.cells[index];
    return this._getCellBlob(cell, format);
  }

  getCells(): CellRect[] {
    return this.cells;
  }

  private _render(): void {
    this.container.innerHTML = '';

    if (!this.loadedImage || this.cells.length === 0) return;

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      const card = this._createCard(cell, i);
      this.container.appendChild(card);
    }
  }

  private _createCard(cell: CellRect, index: number): HTMLElement {
    const card = document.createElement('div');
    card.className = 'cell-card';
    card.dataset.index = String(index);

    // Preview
    const preview = document.createElement('div');
    preview.className = 'cell-card__preview';

    const thumbCanvas = this._createThumbnail(cell);
    preview.appendChild(thumbCanvas);
    card.appendChild(preview);

    // Check indicator
    const check = document.createElement('div');
    check.className = 'cell-card__check';
    check.textContent = '\u2713';
    card.appendChild(check);

    // Download button
    const dlBtn = document.createElement('button');
    dlBtn.className = 'cell-card__download';
    dlBtn.innerHTML = '\u2913';
    dlBtn.title = '下载';
    dlBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._downloadCell(cell, index, this._getCurrentFormat());
    });
    card.appendChild(dlBtn);

    // Label
    const label = document.createElement('div');
    label.className = 'cell-card__label';
    label.textContent = `${cell.row + 1}-${cell.col + 1}`;
    card.appendChild(label);

    // Click to select
    card.addEventListener('click', () => {
      if (this.selectedIndices.has(index)) {
        this.selectedIndices.delete(index);
        card.classList.remove('selected');
      } else {
        this.selectedIndices.add(index);
        card.classList.add('selected');
      }
      this.onSelectionChange?.(this.selectedIndices);
    });

    return card;
  }

  private _createThumbnail(cell: CellRect): HTMLCanvasElement {
    if (!this.loadedImage) {
      const c = document.createElement('canvas');
      c.width = 1;
      c.height = 1;
      return c;
    }

    let source: HTMLImageElement | HTMLCanvasElement;

    if (this.loadedImage.type === 'static' && this.loadedImage.element) {
      source = this.loadedImage.element;
    } else if (this.loadedImage.type === 'gif' && this.loadedImage.gifFrames) {
      // Use first composited frame
      const frames = compositeGifFrames(this.loadedImage);
      if (frames.length > 0) {
        const tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = this.loadedImage.width;
        tmpCanvas.height = this.loadedImage.height;
        const tmpCtx = tmpCanvas.getContext('2d')!;
        tmpCtx.putImageData(frames[0].imageData, 0, 0);
        source = tmpCanvas;
      } else {
        const c = document.createElement('canvas');
        c.width = 1;
        c.height = 1;
        return c;
      }
    } else {
      const c = document.createElement('canvas');
      c.width = 1;
      c.height = 1;
      return c;
    }

    return cropStaticImage(source, cell);
  }

  private _getCurrentFormat(): OutputFormat {
    const select = document.getElementById('format-select') as HTMLSelectElement | null;
    if (select) return select.value as OutputFormat;
    return this.loadedImage?.type === 'gif' ? 'gif' : 'jpg';
  }

  private async _getCellBlob(cell: CellRect, format: OutputFormat): Promise<Blob> {
    if (!this.loadedImage) throw new Error('No image loaded');

    if (format === 'gif' && this.loadedImage.type === 'gif') {
      return cropGif(this.loadedImage, cell);
    }

    let source: HTMLImageElement | HTMLCanvasElement;
    if (this.loadedImage.type === 'static' && this.loadedImage.element) {
      source = this.loadedImage.element;
    } else {
      // For GIF saved as JPG, use first composited frame
      const frames = compositeGifFrames(this.loadedImage);
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = this.loadedImage.width;
      tmpCanvas.height = this.loadedImage.height;
      const tmpCtx = tmpCanvas.getContext('2d')!;
      tmpCtx.putImageData(frames[0].imageData, 0, 0);
      source = tmpCanvas;
    }

    const canvas = cropStaticImage(source, cell);
    return canvasToBlob(canvas, 'jpg');
  }

  private async _downloadCell(cell: CellRect, index: number, format: OutputFormat): Promise<void> {
    const blob = await this._getCellBlob(cell, format);
    const ext = format === 'gif' ? 'gif' : 'jpg';
    const filename = `sticker_${cell.row + 1}_${cell.col + 1}.${ext}`;
    downloadBlob(blob, filename);

    // Brief flash feedback
    const card = this.container.querySelector(`[data-index="${index}"]`);
    if (card) {
      card.classList.add('downloaded');
      setTimeout(() => card.classList.remove('downloaded'), 300);
    }
  }

  private _updateSelectionUI(): void {
    const cards = this.container.querySelectorAll('.cell-card');
    cards.forEach((card) => {
      const index = parseInt((card as HTMLElement).dataset.index || '0');
      if (this.selectedIndices.has(index)) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });
  }
}
