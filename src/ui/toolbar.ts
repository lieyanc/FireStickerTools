import type { OutputFormat, LoadedImage } from '../types.ts';
import JSZip from 'jszip';
import { downloadBlob } from '../utils/download.ts';
import type { CellGallery } from './cell-gallery.ts';

export type FormatChangeCallback = (format: OutputFormat) => void;

export function initToolbar(
  container: HTMLElement,
  gallery: CellGallery,
  onFormatChange: FormatChangeCallback
): void {
  container.innerHTML = '';

  const title = document.createElement('h3');
  title.textContent = '导出设置';
  container.appendChild(title);

  // Format selector
  const formatRow = document.createElement('div');
  formatRow.className = 'toolbar-row';

  const formatLabel = document.createElement('label');
  formatLabel.textContent = '格式';

  const formatSelect = document.createElement('select');
  formatSelect.id = 'format-select';
  formatSelect.className = 'toolbar-select';

  const jpgOption = document.createElement('option');
  jpgOption.value = 'jpg';
  jpgOption.textContent = 'JPG';

  formatSelect.appendChild(jpgOption);

  formatSelect.addEventListener('change', () => {
    onFormatChange(formatSelect.value as OutputFormat);
  });

  formatRow.appendChild(formatLabel);
  formatRow.appendChild(formatSelect);
  container.appendChild(formatRow);

  // Select all / deselect all
  const selectRow = document.createElement('div');
  selectRow.className = 'toolbar-row';

  const selectAllBtn = document.createElement('button');
  selectAllBtn.className = 'btn btn-secondary';
  selectAllBtn.textContent = '全选';
  selectAllBtn.style.flex = '1';
  selectAllBtn.addEventListener('click', () => gallery.selectAll());

  const deselectBtn = document.createElement('button');
  deselectBtn.className = 'btn btn-secondary';
  deselectBtn.textContent = '取消';
  deselectBtn.style.flex = '1';
  deselectBtn.addEventListener('click', () => gallery.deselectAll());

  selectRow.appendChild(selectAllBtn);
  selectRow.appendChild(deselectBtn);
  container.appendChild(selectRow);

  // Download selected
  const dlBtn = document.createElement('button');
  dlBtn.id = 'download-selected-btn';
  dlBtn.className = 'btn btn-primary btn-full';
  dlBtn.textContent = '下载选中';
  dlBtn.style.marginTop = '8px';
  dlBtn.addEventListener('click', async () => {
    const format = formatSelect.value as OutputFormat;
    const selected = gallery.getSelectedIndices();
    if (selected.size === 0) return;

    showProgress('正在导出...');
    try {
      await gallery.downloadSelected(format);
    } finally {
      hideProgress();
    }
  });
  container.appendChild(dlBtn);

  // ZIP download
  const zipBtn = document.createElement('button');
  zipBtn.id = 'download-zip-btn';
  zipBtn.className = 'btn btn-secondary btn-full';
  zipBtn.textContent = '打包下载 ZIP';
  zipBtn.style.marginTop = '6px';
  zipBtn.addEventListener('click', async () => {
    const format = formatSelect.value as OutputFormat;
    let selected = gallery.getSelectedIndices();
    if (selected.size === 0) {
      // If nothing selected, download all
      gallery.selectAll();
      selected = gallery.getSelectedIndices();
    }

    showProgress('正在打包...');
    try {
      const zip = new JSZip();
      const ext = format === 'gif' ? 'gif' : 'jpg';
      const cells = gallery.getCells();

      for (const idx of selected) {
        const cell = cells[idx];
        const blob = await gallery.getCellBlob(idx, format);
        const filename = `sticker_${cell.row + 1}_${cell.col + 1}.${ext}`;
        zip.file(filename, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      downloadBlob(content, 'stickers.zip');
    } finally {
      hideProgress();
    }
  });
  container.appendChild(zipBtn);
}

export function updateToolbarForImage(loaded: LoadedImage): void {
  const formatSelect = document.getElementById('format-select') as HTMLSelectElement | null;
  if (!formatSelect) return;

  // Remove GIF option if exists
  const existingGif = formatSelect.querySelector('option[value="gif"]');
  if (existingGif) existingGif.remove();

  if (loaded.type === 'gif') {
    const gifOption = document.createElement('option');
    gifOption.value = 'gif';
    gifOption.textContent = 'GIF (保留动画)';
    formatSelect.appendChild(gifOption);
  }
}

function showProgress(text: string): void {
  const overlay = document.getElementById('progress-overlay');
  const textEl = document.getElementById('progress-text');
  if (overlay) overlay.classList.remove('hidden');
  if (textEl) textEl.textContent = text;
}

function hideProgress(): void {
  const overlay = document.getElementById('progress-overlay');
  if (overlay) overlay.classList.add('hidden');
}
