import type { GridConfig, DragMode } from '../types.ts';

export type PresetCallback = (config: GridConfig) => void;
export type DragModeCallback = (mode: DragMode) => void;

const PRESETS: { label: string; config: GridConfig }[] = [
  { label: '2 x 2', config: { rows: 2, cols: 2 } },
  { label: '3 x 3', config: { rows: 3, cols: 3 } },
  { label: '4 x 4', config: { rows: 4, cols: 4 } },
  { label: '4 x 6', config: { rows: 6, cols: 4 } },
];

export function initPresetControls(
  container: HTMLElement,
  onChange: PresetCallback,
  onDragModeChange?: DragModeCallback,
): void {
  container.innerHTML = '';

  const title = document.createElement('h3');
  title.textContent = '网格设置';
  container.appendChild(title);

  // Preset buttons
  const grid = document.createElement('div');
  grid.className = 'preset-grid';

  let activeBtn: HTMLButtonElement | null = null;

  for (const preset of PRESETS) {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = preset.label;
    btn.addEventListener('click', () => {
      if (activeBtn) activeBtn.classList.remove('active');
      btn.classList.add('active');
      activeBtn = btn;
      rowInput.value = String(preset.config.rows);
      colInput.value = String(preset.config.cols);
      onChange(preset.config);
    });
    grid.appendChild(btn);
  }

  container.appendChild(grid);

  // Custom input
  const customRow = document.createElement('div');
  customRow.className = 'custom-input-row';

  const label = document.createElement('label');
  label.textContent = '自定义';

  const rowInput = document.createElement('input');
  rowInput.type = 'number';
  rowInput.min = '1';
  rowInput.max = '20';
  rowInput.value = '4';
  rowInput.placeholder = '行';

  const sep = document.createElement('span');
  sep.className = 'separator';
  sep.textContent = 'x';

  const colInput = document.createElement('input');
  colInput.type = 'number';
  colInput.min = '1';
  colInput.max = '20';
  colInput.value = '4';
  colInput.placeholder = '列';

  const applyCustom = () => {
    const rows = Math.max(1, Math.min(20, parseInt(rowInput.value) || 1));
    const cols = Math.max(1, Math.min(20, parseInt(colInput.value) || 1));
    rowInput.value = String(rows);
    colInput.value = String(cols);
    if (activeBtn) activeBtn.classList.remove('active');
    activeBtn = null;
    onChange({ rows, cols });
  };

  rowInput.addEventListener('change', applyCustom);
  colInput.addEventListener('change', applyCustom);

  customRow.appendChild(label);
  customRow.appendChild(rowInput);
  customRow.appendChild(sep);
  customRow.appendChild(colInput);
  container.appendChild(customRow);

  // Default: activate 4x4
  const defaultBtn = grid.children[2] as HTMLButtonElement;
  defaultBtn.classList.add('active');
  activeBtn = defaultBtn;

  // Drag mode toggle
  const modeSection = document.createElement('div');
  modeSection.className = 'drag-mode-section';

  const modeLabel = document.createElement('label');
  modeLabel.textContent = '拖动外框模式';
  modeSection.appendChild(modeLabel);

  const modeRow = document.createElement('div');
  modeRow.className = 'drag-mode-row';

  const redistributeBtn = document.createElement('button');
  redistributeBtn.className = 'preset-btn active';
  redistributeBtn.textContent = '自动等分';

  const independentBtn = document.createElement('button');
  independentBtn.className = 'preset-btn';
  independentBtn.textContent = '单独移动';

  redistributeBtn.addEventListener('click', () => {
    redistributeBtn.classList.add('active');
    independentBtn.classList.remove('active');
    onDragModeChange?.('redistribute');
  });

  independentBtn.addEventListener('click', () => {
    independentBtn.classList.add('active');
    redistributeBtn.classList.remove('active');
    onDragModeChange?.('independent');
  });

  modeRow.appendChild(redistributeBtn);
  modeRow.appendChild(independentBtn);
  modeSection.appendChild(modeRow);
  container.appendChild(modeSection);
}
