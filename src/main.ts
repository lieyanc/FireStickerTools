import './style.css';
import type { LoadedImage, GridConfig } from './types.ts';
import { loadImage } from './core/image-loader.ts';
import { GridModel } from './core/grid-model.ts';
import { initUploadZone } from './ui/upload-zone.ts';
import { initPresetControls } from './ui/preset-controls.ts';
import { GridOverlay } from './ui/grid-overlay.ts';
import { CellGallery } from './ui/cell-gallery.ts';
import { initToolbar, updateToolbarForImage } from './ui/toolbar.ts';

// State
let currentImage: LoadedImage | null = null;
let gridModel: GridModel | null = null;
let currentConfig: GridConfig = { rows: 4, cols: 4 };

// UI Components
const gridOverlay = new GridOverlay('grid-overlay-container');
const cellGallery = new CellGallery('cell-gallery');

// Sections
const uploadSection = document.getElementById('upload-section')!;
const editorSection = document.getElementById('editor-section')!;
const gallerySection = document.getElementById('gallery-section')!;

function showEditor(): void {
  uploadSection.classList.add('hidden');
  editorSection.classList.remove('hidden');
  gallerySection.classList.remove('hidden');
}

function refreshGallery(): void {
  if (!gridModel || !currentImage) return;
  const cells = gridModel.getCells();
  cellGallery.update(cells, currentImage);
}

function applyGrid(config: GridConfig): void {
  if (!currentImage) return;

  currentConfig = config;
  gridModel = new GridModel(currentImage.width, currentImage.height, config);
  gridOverlay.setGridModel(gridModel);
  refreshGallery();
}

async function handleFile(file: File): Promise<void> {
  const progressOverlay = document.getElementById('progress-overlay')!;
  const progressText = document.getElementById('progress-text')!;

  progressOverlay.classList.remove('hidden');
  progressText.textContent = '正在加载图片...';

  try {
    currentImage = await loadImage(file);
    updateToolbarForImage(currentImage);

    showEditor();
    gridOverlay.setImage(currentImage);
    applyGrid(currentConfig);
  } catch (err) {
    alert('加载图片失败: ' + (err instanceof Error ? err.message : '未知错误'));
  } finally {
    progressOverlay.classList.add('hidden');
  }
}

// Initialize upload zone
initUploadZone(handleFile);

// Initialize preset controls
const presetContainer = document.getElementById('preset-controls')!;
initPresetControls(presetContainer, (config) => {
  applyGrid(config);
});

// Initialize toolbar
const toolbarContainer = document.getElementById('toolbar')!;
initToolbar(toolbarContainer, cellGallery, () => {
  // format change — no additional action needed, gallery reads from DOM select
});

// Grid overlay change callback (after dragging grid lines)
gridOverlay.setOnChange(() => {
  refreshGallery();
});

// Selection change updates button state
cellGallery.setOnSelectionChange((selected) => {
  const btn = document.getElementById('download-selected-btn') as HTMLButtonElement | null;
  if (btn) {
    btn.textContent = selected.size > 0 ? `下载选中 (${selected.size})` : '下载选中';
    btn.disabled = selected.size === 0;
  }
});
