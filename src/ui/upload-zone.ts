export type UploadCallback = (file: File) => void;

export function initUploadZone(onFile: UploadCallback): void {
  const zone = document.getElementById('upload-zone')!;
  const input = document.getElementById('file-input') as HTMLInputElement;

  zone.addEventListener('click', () => input.click());

  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (file) {
      onFile(file);
      input.value = ''; // reset so same file can be re-selected
    }
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('dragover');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      onFile(file);
    }
  });
}
