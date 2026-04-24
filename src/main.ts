import './styles.css';
import { compressGif } from './gif-compressor';
import type { CompressionMode, CompressionResult, CompressionTask } from './types';
import {
  cleanupObjectUrl,
  formatBytes,
  formatPercent,
  toNullablePositiveInteger,
  toTargetBytes,
  validateGifFile
} from './utils';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root element not found.');
}

app.innerHTML = `
  <div class="site-shell">
    <header class="site-header">
      <div class="container topbar">
        <a class="brand" href="#tool">GIF Compressor</a>
        <nav class="topnav" aria-label="Primary navigation">
          <a href="#tool">Tool</a>
          <a href="#how-it-works">How it works</a>
          <a href="#privacy">Privacy</a>
          <a href="#faq">FAQ</a>
        </nav>
      </div>
    </header>

    <main>
      <section class="hero-section">
        <div class="container hero-grid">
          <div>
            <p class="eyebrow">Real browser-based GIF compression</p>
            <h1>GIF Compressor</h1>
            <p class="intro">Compress animated GIFs under 1 MB directly in your browser.</p>
            <p class="hero-copy">
              This tool decodes GIF frames, applies real compression passes, and re-encodes a valid animated GIF file that stays previewable, downloadable, and animated.
            </p>
            <div class="hero-actions">
              <a class="primary-button" href="#tool">Open Tool</a>
              <a class="secondary-button" href="#how-it-works">Learn How It Works</a>
            </div>
          </div>
          <div class="hero-note panel">
            <h2>What this tool does</h2>
            <ul class="plain-list">
              <li>Decodes animated GIF frames in the browser</li>
              <li>Resizes, reduces colors, and lowers frame count when needed</li>
              <li>Rebuilds a real animated GIF output file</li>
              <li>Never uploads your file to a server</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="tool" class="container main-layout" aria-label="GIF compression tool">
        <section class="panel" aria-labelledby="upload-title">
        <div class="panel-header">
          <h2 id="upload-title">Upload your GIF</h2>
          <p>Drag and drop an animated GIF or click to upload.</p>
        </div>

        <div
          class="dropzone"
          id="dropzone"
          role="button"
          tabindex="0"
          aria-label="Upload GIF file"
          aria-describedby="privacy-note upload-help"
        >
          <input id="file-input" class="visually-hidden" type="file" accept=".gif,image/gif" aria-label="Choose GIF file" />
          <div class="dropzone-content">
            <i class="fa-regular fa-file-image" aria-hidden="true"></i>
            <p class="dropzone-title">Drop GIF here</p>
            <p id="upload-help" class="muted">or click to browse from your device</p>
          </div>
        </div>

        <p id="privacy-note" class="privacy-note">
          Your GIF is compressed locally in your browser. No file is uploaded to any server.
        </p>

        <div id="selection-status" class="notice success hidden" role="status" aria-live="polite"></div>

        <div class="settings-grid">
          <div class="field-group">
            <label for="target-value">Target size</label>
            <div class="target-row">
              <input id="target-value" type="number" min="100" step="50" value="1024" inputmode="decimal" />
              <select id="target-unit" aria-label="Target size unit">
                <option value="KB">KB</option>
                <option value="MB">MB</option>
              </select>
            </div>
            <p class="muted">Default target is under 1 MB.</p>
          </div>

          <div class="field-group">
            <label for="compression-mode">Compression mode</label>
            <select id="compression-mode" aria-label="Compression mode">
              <option value="balanced">Balanced</option>
              <option value="high">High Compression</option>
              <option value="quality">Best Quality</option>
            </select>
          </div>

          <div class="field-group checkbox-group">
            <label class="checkbox-row" for="auto-mode">
              <input id="auto-mode" type="checkbox" checked />
              <span>Auto mode enabled</span>
            </label>
            <p class="muted">When enabled, the worker tries multiple real compression passes until the target is reached or the smallest valid GIF is found.</p>
          </div>

          <div class="field-group">
            <label for="max-width">Optional max width</label>
            <input id="max-width" type="number" min="1" step="10" placeholder="Auto" inputmode="numeric" />
          </div>

          <div class="field-group">
            <label for="fps-reduction">Optional FPS reduction</label>
            <select id="fps-reduction" aria-label="Optional FPS reduction">
              <option value="">Auto</option>
              <option value="1">No reduction</option>
              <option value="2">Use every 2nd frame</option>
              <option value="3">Use every 3rd frame</option>
            </select>
          </div>

          <div class="field-group">
            <label for="color-limit">Optional color limit</label>
            <select id="color-limit" aria-label="Optional color limit">
              <option value="">Auto</option>
              <option value="256">256 colors</option>
              <option value="128">128 colors</option>
              <option value="64">64 colors</option>
              <option value="32">32 colors</option>
            </select>
          </div>

          <div class="field-group action-group">
            <button id="compress-button" class="primary-button" type="button" disabled>
              <i class="fa-solid fa-minimize" aria-hidden="true"></i>
              Compress GIF
            </button>
            <button id="cancel-button" class="secondary-button" type="button" disabled>
              Cancel
            </button>
            <button id="reset-button" class="secondary-button" type="button" disabled>
              Compress another GIF
            </button>
          </div>
        </div>

        <div id="quality-warning" class="notice warning hidden" role="status" aria-live="polite"></div>
        <div id="status-box" class="notice status hidden" role="status" aria-live="polite"></div>
        <div class="progress-wrap hidden" id="progress-wrap" aria-live="polite">
          <label for="progress-bar">Compression progress</label>
          <progress id="progress-bar" max="100" value="0">0%</progress>
        </div>
        <div id="error-box" class="notice error hidden" role="alert"></div>
        </section>

        <section class="panel" aria-labelledby="details-title">
        <div class="panel-header">
          <h2 id="details-title">Results</h2>
          <p>Preview the original GIF, compare the compressed output, and download the real animated result.</p>
        </div>

        <div class="preview-grid">
          <article class="preview-card">
            <h3>Original GIF</h3>
            <div id="original-preview" class="preview-frame empty-state">No GIF selected yet.</div>
            <dl id="original-stats" class="stats-list"></dl>
          </article>

          <article class="preview-card">
            <h3>Compressed GIF</h3>
            <div id="compressed-preview" class="preview-frame empty-state">Compressed output will appear here.</div>
            <dl id="compressed-stats" class="stats-list"></dl>
            <div id="result-actions" class="result-actions hidden">
              <a id="download-button" class="primary-button" download="compressed.gif">
                <i class="fa-solid fa-download" aria-hidden="true"></i>
                Download compressed GIF
              </a>
            </div>
          </article>
        </div>
        </section>
      </section>

      <section id="how-it-works" class="container content-section panel">
        <h2>How it works</h2>
        <div class="content-grid">
          <article>
            <h3>1. Decode</h3>
            <p>The tool reads the uploaded animated GIF, extracts frames, and rebuilds the full animation state frame by frame.</p>
          </article>
          <article>
            <h3>2. Compress</h3>
            <p>It applies real compression passes including resizing, palette reduction, frame skipping, and metadata cleanup in a Web Worker.</p>
          </article>
          <article>
            <h3>3. Re-encode</h3>
            <p>The processed frames are re-encoded into a valid animated GIF that remains previewable and downloadable.</p>
          </article>
        </div>
      </section>

      <section class="container content-section panel">
        <h2>Features</h2>
        <div class="content-grid">
          <article>
            <h3>Real animated output</h3>
            <p>No fake stats, no renamed PNG or WebP, and no static frame export.</p>
          </article>
          <article>
            <h3>Advanced controls</h3>
            <p>Choose compression mode, target size, max width, optional FPS reduction, and optional color limit.</p>
          </article>
          <article>
            <h3>Responsive and accessible</h3>
            <p>Works on mobile, tablet, and desktop with keyboard support and clear status updates.</p>
          </article>
        </div>
      </section>

      <section id="privacy" class="container content-section panel">
        <h2>Privacy</h2>
        <p>Your GIF is compressed locally in your browser. No file is uploaded to any server.</p>
      </section>

      <section id="faq" class="container content-section panel">
        <h2>FAQ</h2>
        <div class="faq-list">
          <article>
            <h3>Will the compressed GIF still animate?</h3>
            <p>Yes. The output file is a real animated GIF re-encoded in the browser.</p>
          </article>
          <article>
            <h3>Can every GIF go under 1 MB?</h3>
            <p>No. If the target is impossible, the tool returns the smallest valid GIF it can produce and shows that best possible compression was reached.</p>
          </article>
          <article>
            <h3>Why can quality change?</h3>
            <p>Real compression may reduce dimensions, colors, or frame count to make large animations smaller.</p>
          </article>
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <div class="container footer-row">
        <p>
          Made with love by
          <a href="https://www.itisuniqueofficial.com/" target="_blank" rel="noreferrer">It Is Unique Official</a>
          -
          <a href="https://www.itisuniqueofficial.com/" target="_blank" rel="noreferrer">itisuniqueofficial.com</a>
        </p>
      </div>
    </footer>
  </div>
`;

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }

  return element;
}

const fileInput = requireElement<HTMLInputElement>('#file-input');
const dropzone = requireElement<HTMLDivElement>('#dropzone');
const targetValueInput = requireElement<HTMLInputElement>('#target-value');
const targetUnitSelect = requireElement<HTMLSelectElement>('#target-unit');
const compressionModeSelect = requireElement<HTMLSelectElement>('#compression-mode');
const autoModeInput = requireElement<HTMLInputElement>('#auto-mode');
const maxWidthInput = requireElement<HTMLInputElement>('#max-width');
const fpsReductionSelect = requireElement<HTMLSelectElement>('#fps-reduction');
const colorLimitSelect = requireElement<HTMLSelectElement>('#color-limit');
const compressButton = requireElement<HTMLButtonElement>('#compress-button');
const cancelButton = requireElement<HTMLButtonElement>('#cancel-button');
const resetButton = requireElement<HTMLButtonElement>('#reset-button');
const originalPreview = requireElement<HTMLDivElement>('#original-preview');
const compressedPreview = requireElement<HTMLDivElement>('#compressed-preview');
const originalStats = requireElement<HTMLDListElement>('#original-stats');
const compressedStats = requireElement<HTMLDListElement>('#compressed-stats');
const statusBox = requireElement<HTMLDivElement>('#status-box');
const errorBox = requireElement<HTMLDivElement>('#error-box');
const selectionStatus = requireElement<HTMLDivElement>('#selection-status');
const qualityWarning = requireElement<HTMLDivElement>('#quality-warning');
const progressWrap = requireElement<HTMLDivElement>('#progress-wrap');
const progressBar = requireElement<HTMLProgressElement>('#progress-bar');
const resultActions = requireElement<HTMLDivElement>('#result-actions');
const downloadButton = requireElement<HTMLAnchorElement>('#download-button');

let selectedFile: File | null = null;
let originalPreviewUrl = '';
let compressedPreviewUrl = '';
let activeCompressionTask: CompressionTask | null = null;

function targetBytes(): number {
  return toTargetBytes(Number(targetValueInput.value), targetUnitSelect.value === 'MB' ? 'MB' : 'KB');
}

function currentSettings() {
  return {
    targetBytes: targetBytes(),
    mode: compressionModeSelect.value as CompressionMode,
    auto: autoModeInput.checked,
    maxWidth: toNullablePositiveInteger(maxWidthInput.value),
    maxFrameStep: toNullablePositiveInteger(fpsReductionSelect.value),
    colorLimit: toNullablePositiveInteger(colorLimitSelect.value)
  };
}

function setNotice(element: HTMLDivElement, text: string, hidden = false): void {
  element.textContent = text;
  element.classList.toggle('hidden', hidden);
}

function clearPreviewUrl(currentUrl: string): void {
  cleanupObjectUrl(currentUrl);
}

function renderPreview(container: HTMLDivElement, objectUrl: string, alt: string): void {
  container.classList.remove('empty-state');
  container.innerHTML = `<img src="${objectUrl}" alt="${alt}" />`;
}

function renderStats(container: HTMLDListElement, items: Array<[string, string]>): void {
  container.innerHTML = items
    .map(([label, value]) => `<div class="stat-item"><dt>${label}</dt><dd>${value}</dd></div>`)
    .join('');
}

function updateWarning(): void {
  const bytes = targetBytes();
  const threshold = 350 * 1024;
  const autoMode = autoModeInput.checked;

  if (bytes <= threshold || !autoMode) {
    setNotice(
      qualityWarning,
      bytes <= threshold
        ? 'Very small targets may noticeably reduce animation quality, dimensions, or smoothness.'
        : 'Manual-style limits are enabled. Stricter width, color, or frame settings may reduce animation quality more noticeably.',
      false
    );
    return;
  }

  setNotice(qualityWarning, '', true);
}

function resetCompressedOutput(): void {
  clearPreviewUrl(compressedPreviewUrl);
  compressedPreviewUrl = '';
  compressedPreview.classList.add('empty-state');
  compressedPreview.textContent = 'Compressed output will appear here.';
  compressedStats.innerHTML = '';
  downloadButton.removeAttribute('href');
  downloadButton.removeAttribute('download');
  downloadButton.setAttribute('aria-disabled', 'true');
  downloadButton.tabIndex = -1;
  resultActions.classList.add('hidden');
  progressWrap.classList.add('hidden');
  progressBar.value = 0;
}

function resetAll(): void {
  activeCompressionTask?.cancel();
  activeCompressionTask = null;
  selectedFile = null;
  fileInput.value = '';
  clearPreviewUrl(originalPreviewUrl);
  originalPreviewUrl = '';
  resetCompressedOutput();
  originalPreview.parentElement?.classList.remove('selected-card');
  originalPreview.classList.add('empty-state');
  originalPreview.textContent = 'No GIF selected yet.';
  originalStats.innerHTML = '';
  compressButton.disabled = true;
  cancelButton.disabled = true;
  resetButton.disabled = true;
  setNotice(selectionStatus, '', true);
  setNotice(statusBox, '', true);
  setNotice(errorBox, '', true);
}

function selectedFileStats(file: File): Array<[string, string]> {
  return [
    ['File Name', file.name],
    ['Original Size', formatBytes(file.size)],
    ['Type', file.type || 'image/gif'],
    ['Status', 'GIF selected successfully']
  ];
}

function applySelectedFile(file: File): void {
  const validationError = validateGifFile(file);

  if (validationError) {
    selectedFile = null;
    compressButton.disabled = true;
    setNotice(errorBox, validationError, false);
    setNotice(selectionStatus, '', true);
    return;
  }

  selectedFile = file;
  setNotice(errorBox, '', true);
  setNotice(statusBox, '', true);
  setNotice(selectionStatus, 'GIF selected successfully', false);
  resetCompressedOutput();

  clearPreviewUrl(originalPreviewUrl);
  originalPreviewUrl = URL.createObjectURL(file);
  renderPreview(originalPreview, originalPreviewUrl, `Original preview for ${file.name}`);
  originalPreview.parentElement?.classList.add('selected-card');
  renderStats(originalStats, selectedFileStats(file));

  compressButton.disabled = false;
  cancelButton.disabled = true;
  resetButton.disabled = false;
}

async function handleCompression(): Promise<void> {
  if (!selectedFile) {
    return;
  }

  compressButton.disabled = true;
  cancelButton.disabled = false;
  setNotice(errorBox, '', true);
  setNotice(statusBox, 'Preparing GIF for compression...', false);
  resetCompressedOutput();
  progressWrap.classList.remove('hidden');
  progressBar.value = 0;

  try {
    activeCompressionTask = compressGif(selectedFile, currentSettings(), (progress) => {
      progressWrap.classList.remove('hidden');
      progressBar.value = progress.percent;
      setNotice(
        statusBox,
        `${progress.stage} (${progress.attempt}/${progress.totalAttempts}) - ${progress.detail}`,
        false
      );
    });
    const result = await activeCompressionTask.promise;

    renderCompressionResult(selectedFile.name, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected compression error occurred.';
    setNotice(errorBox, message, false);
  } finally {
    activeCompressionTask = null;
    compressButton.disabled = false;
    cancelButton.disabled = true;
  }
}

function cancelCompression(): void {
  if (!activeCompressionTask) {
    return;
  }

  activeCompressionTask.cancel();
  activeCompressionTask = null;
  progressWrap.classList.add('hidden');
  progressBar.value = 0;
  setNotice(statusBox, 'Compression cancelled.', false);
  compressButton.disabled = selectedFile === null;
  cancelButton.disabled = true;
}

function renderCompressionResult(fileName: string, result: CompressionResult): void {
  clearPreviewUrl(compressedPreviewUrl);
  compressedPreviewUrl = URL.createObjectURL(result.blob);
  renderPreview(compressedPreview, compressedPreviewUrl, `Compressed preview for ${fileName}`);

  const statusLabel = result.underTarget ? 'Yes' : 'No';
  const outcome = result.underTarget
    ? 'Compression complete. The GIF is within your target size.'
    : 'Best possible compression reached. The file could not be reduced below the requested target.';

  setNotice(statusBox, outcome, false);
  renderStats(compressedStats, [
    ['Status', result.underTarget ? 'Success: Under target size' : 'Best possible compression reached'],
    ['Output size', formatBytes(result.compressedBytes)],
    ['Saved', `${formatBytes(result.savedBytes)} (${formatPercent(result.savedPercent)})`],
    ['Resolution', `${result.width} x ${result.height}`],
    ['Duration', `${(result.summary.inputDurationMs / 1000).toFixed(2)}s -> ${(result.summary.outputDurationMs / 1000).toFixed(2)}s`],
    ['Estimated FPS', `${result.summary.inputFps.toFixed(1)} -> ${result.summary.outputFps.toFixed(1)}`],
    ['Compression mode', result.summary.mode === 'high' ? 'High Compression' : result.summary.mode === 'quality' ? 'Best Quality' : 'Balanced'],
    ['Under target', statusLabel],
    ['Frames', `${result.summary.inputFrames} -> ${result.summary.outputFrames}`],
    ['Colors used', `${result.summary.colorsUsed}`],
    ['Loop preserved', result.summary.loopPreserved ? 'Yes' : 'Approximate'],
    ['Loop', result.summary.loopCount === -1 ? 'Play once' : result.summary.loopCount === 0 ? 'Loop forever' : `${result.summary.loopCount} repeats`],
    ['Optimization', result.strategySummary]
  ]);

  progressWrap.classList.remove('hidden');
  progressBar.value = 100;

  downloadButton.href = compressedPreviewUrl;
  downloadButton.download = fileName.replace(/\.gif$/i, '') + '-compressed.gif';
  downloadButton.setAttribute('aria-disabled', 'false');
  downloadButton.tabIndex = 0;
  resultActions.classList.remove('hidden');
}

function handleFileInput(files: FileList | null): void {
  const file = files?.[0];
  if (!file) {
    return;
  }

  applySelectedFile(file);
}

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    fileInput.click();
  }
});

dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('drag-active');
});

dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-active'));
dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('drag-active');
  handleFileInput(event.dataTransfer?.files ?? null);
});

fileInput.addEventListener('change', () => handleFileInput(fileInput.files));
compressButton.addEventListener('click', () => {
  void handleCompression();
});
cancelButton.addEventListener('click', cancelCompression);
resetButton.addEventListener('click', resetAll);
targetValueInput.addEventListener('input', () => {
  updateWarning();
});
targetUnitSelect.addEventListener('change', updateWarning);
compressionModeSelect.addEventListener('change', updateWarning);
autoModeInput.addEventListener('change', updateWarning);
maxWidthInput.addEventListener('input', updateWarning);
fpsReductionSelect.addEventListener('change', updateWarning);
colorLimitSelect.addEventListener('change', updateWarning);

downloadButton.addEventListener('click', (event) => {
  if (!downloadButton.href) {
    event.preventDefault();
  }
});

updateWarning();
