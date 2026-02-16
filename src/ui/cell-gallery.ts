import type { CellRect, LoadedImage, OutputFormat } from '../types.ts';
import { cropStaticImage, canvasToBlob } from '../core/image-splitter.ts';
import { cropToGif } from '../core/gif-splitter.ts';
import { downloadBlob } from '../utils/download.ts';

export type SelectionChangeCallback = (selectedIndices: Set<number>) => void;

export class CellGallery {
  private container: HTMLElement;
  private cells: CellRect[] = [];
  private loadedImage: LoadedImage | null = null;
  private selectedIndices = new Set<number>();
  private onSelectionChange: SelectionChangeCallback | null = null;
  private lastUsedFormat: OutputFormat = 'jpg';

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

    // Footer: label + download buttons
    const footer = document.createElement('div');
    footer.className = 'cell-card__footer';

    const label = document.createElement('div');
    label.className = 'cell-card__label';
    label.textContent = `${cell.row + 1}-${cell.col + 1}`;
    footer.appendChild(label);

    // Download button group
    const dlGroup = document.createElement('div');
    dlGroup.className = 'cell-card__dl-group';

    const jpgBtn = document.createElement('button');
    jpgBtn.className = 'cell-card__dl-btn';
    jpgBtn.textContent = 'JPG';
    if (this.lastUsedFormat === 'jpg') jpgBtn.classList.add('last-used');

    const gifBtn = document.createElement('button');
    gifBtn.className = 'cell-card__dl-btn';
    gifBtn.textContent = 'GIF';
    if (this.lastUsedFormat === 'gif') gifBtn.classList.add('last-used');

    jpgBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._setLastUsedFormat('jpg');
      this._downloadCell(cell, index, 'jpg');
    });

    gifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._setLastUsedFormat('gif');
      this._downloadCell(cell, index, 'gif');
    });

    dlGroup.appendChild(jpgBtn);
    dlGroup.appendChild(gifBtn);
    footer.appendChild(dlGroup);
    card.appendChild(footer);

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

  private _setLastUsedFormat(format: OutputFormat): void {
    this.lastUsedFormat = format;
    // Update highlight on all visible buttons
    const allBtns = this.container.querySelectorAll('.cell-card__dl-btn');
    allBtns.forEach((btn) => {
      const el = btn as HTMLButtonElement;
      if (el.textContent === format.toUpperCase()) {
        el.classList.add('last-used');
      } else {
        el.classList.remove('last-used');
      }
    });
    // Sync sidebar format selector
    const select = document.getElementById('format-select') as HTMLSelectElement | null;
    if (select) select.value = format;
  }

  private _createThumbnail(cell: CellRect): HTMLCanvasElement {
    if (!this.loadedImage) {
      const c = document.createElement('canvas');
      c.width = 1;
      c.height = 1;
      return c;
    }

    return cropStaticImage(this.loadedImage.element, cell);
  }

  private async _getCellBlob(cell: CellRect, format: OutputFormat): Promise<Blob> {
    if (!this.loadedImage) throw new Error('No image loaded');

    if (format === 'gif') {
      return cropToGif(this.loadedImage.element, cell);
    }

    const canvas = cropStaticImage(this.loadedImage.element, cell);
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
