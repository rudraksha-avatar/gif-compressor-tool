import './styles.css';
import { compressGif } from './gif-compressor';
import { renderLayout, type ToolPageConfig } from './layout';
import { MemoryManager } from './memory-manager';
import { convertMp4ToGif } from './mp4-to-gif';
import type {
  CompressionMode,
  CompressionResult,
  CompressionTask,
  GifFileMetadata,
  Mp4GifMode,
  Mp4ToGifResult,
  Mp4ToGifTask,
  VideoFileMetadata
} from './types';
import {
  formatBytes,
  formatPercent,
  getBrowserSupportIssue,
  getMp4BrowserSupportIssue,
  getRuntimeProcessingWarning,
  readGifMetadata,
  readVideoMetadata,
  toNullablePositiveInteger,
  toTargetBytes,
  validateGifFile,
  validateMp4File
} from './utils';

const app = document.querySelector<HTMLDivElement>('#app');

if (!app) {
  throw new Error('App root element not found.');
}

type AppRoute = '/' | '/mp4-to-gif';

const route = window.location.pathname === '/mp4-to-gif' ? '/mp4-to-gif' : '/';

function setMeta(selector: string, attribute: 'content' | 'href', value: string): void {
  const element = document.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (element) {
    element.setAttribute(attribute, value);
  }
}

function updateSeo(currentRoute: AppRoute): void {
  const isMp4Route = currentRoute === '/mp4-to-gif';
  const title = isMp4Route
    ? 'MP4 to GIF Converter - Convert Video to GIF Online'
    : 'GIF Compressor Tool | Fast Browser-Based GIF Compression';
  const description = isMp4Route
    ? 'Convert MP4 videos to animated GIFs directly in your browser. Fast, private, responsive, and no file upload required.'
    : 'Compress GIF files directly in your browser with a fast, responsive, privacy-friendly tool. Reduce GIF size under 1 MB when possible with no server upload.';
  const canonical = `https://gif.itisuniqueofficial.com${isMp4Route ? '/mp4-to-gif' : '/'}`;

  document.title = title;
  setMeta('meta[name="description"]', 'content', description);
  setMeta('link[rel="canonical"]', 'href', canonical);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:url"]', 'content', canonical);
  setMeta('meta[name="twitter:title"]', 'content', title);
  setMeta('meta[name="twitter:description"]', 'content', description);

  const schema = document.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
  if (schema) {
    schema.textContent = JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: isMp4Route ? 'MP4 to GIF Converter' : 'GIF Compressor Tool',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Any',
        browserRequirements: 'Requires JavaScript and a modern browser with Web Worker support.',
        description,
        url: canonical,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD'
        },
        featureList: isMp4Route
          ? ['Client-side MP4 to GIF conversion', 'Video trimming', 'GIF size optimization', 'Responsive design', 'Privacy-friendly processing']
          : ['Client-side GIF compression', 'Target size selection', 'Drag and drop upload', 'Responsive design', 'Privacy-friendly processing']
      },
      null,
      2
    );
  }
}

function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}

function setNotice(element: HTMLDivElement, text: string, hidden = false): void {
  element.textContent = text;
  element.classList.toggle('hidden', hidden);
}

function renderStats(container: HTMLDListElement, items: Array<[string, string]>): void {
  container.innerHTML = items.map(([label, value]) => `<div class="stat-item"><dt>${label}</dt><dd>${value}</dd></div>`).join('');
}

function renderImagePreview(container: HTMLDivElement, objectUrl: string, alt: string): void {
  container.classList.remove('empty-state');
  container.innerHTML = `<img src="${objectUrl}" alt="${alt}" />`;
}

function renderVideoPreview(container: HTMLDivElement, objectUrl: string, label: string): void {
  container.classList.remove('empty-state');
  container.innerHTML = `<video src="${objectUrl}" controls playsinline preload="metadata" aria-label="${label}"></video>`;
}

function gifToolHtml(): string {
  return `
    <section class="panel" aria-labelledby="upload-title">
      <div class="panel-header">
        <h2 id="upload-title">Upload your GIF</h2>
        <p>Drag and drop an animated GIF or click to upload.</p>
      </div>
      <div class="dropzone" id="dropzone" role="button" tabindex="0" aria-label="Upload GIF file" aria-describedby="privacy-note upload-help">
        <input id="file-input" class="visually-hidden" type="file" accept=".gif,image/gif" aria-label="Choose GIF file" />
        <div class="dropzone-content">
          <i class="fa-regular fa-file-image" aria-hidden="true"></i>
          <p class="dropzone-title">Drop GIF here</p>
          <p id="upload-help" class="muted">or click to browse from your device</p>
        </div>
      </div>
      <p id="privacy-note" class="privacy-note">Your GIF is compressed locally in your browser. No file is uploaded to any server.</p>
      <div id="selection-status" class="notice success hidden" role="status" aria-live="polite"></div>
      <div id="file-warning" class="notice warning hidden" role="status" aria-live="polite"></div>
      <div id="runtime-warning" class="notice warning" role="status" aria-live="polite"></div>
      <div class="settings-grid">
        <div class="field-group">
          <label for="target-value">Target size</label>
          <div class="target-row">
            <input id="target-value" type="number" min="100" step="50" value="1024" inputmode="decimal" />
            <select id="target-unit" aria-label="Target size unit"><option value="KB">KB</option><option value="MB">MB</option></select>
          </div>
          <p class="muted">Default target is under 1 MB.</p>
        </div>
        <div class="field-group">
          <label for="compression-mode">Compression mode</label>
          <select id="compression-mode" aria-label="Compression mode"><option value="balanced">Balanced</option><option value="high">High Compression</option><option value="quality">Best Quality</option></select>
        </div>
        <div class="field-group checkbox-group">
          <label class="checkbox-row" for="auto-mode"><input id="auto-mode" type="checkbox" checked /><span>Auto mode enabled</span></label>
          <p class="muted">Auto mode tries multiple real compression passes until the target is reached or the smallest valid GIF is found.</p>
        </div>
        <div class="field-group"><label for="max-width">Optional max width</label><input id="max-width" type="number" min="1" step="10" placeholder="Auto" inputmode="numeric" /></div>
        <div class="field-group"><label for="fps-reduction">Optional FPS reduction</label><select id="fps-reduction" aria-label="Optional FPS reduction"><option value="">Auto</option><option value="1">No reduction</option><option value="2">Use every 2nd frame</option><option value="3">Use every 3rd frame</option></select></div>
        <div class="field-group"><label for="color-limit">Optional color limit</label><select id="color-limit" aria-label="Optional color limit"><option value="">Auto</option><option value="256">256 colors</option><option value="128">128 colors</option><option value="64">64 colors</option><option value="32">32 colors</option></select></div>
        <div class="field-group action-group">
          <button id="compress-button" class="primary-button" type="button" disabled><i class="fa-solid fa-minimize" aria-hidden="true"></i>Compress GIF</button>
          <button id="cancel-button" class="secondary-button" type="button" disabled>Cancel</button>
          <button id="reset-settings-button" class="secondary-button" type="button">Reset settings</button>
          <button id="reset-button" class="secondary-button" type="button" disabled>Compress another GIF</button>
        </div>
      </div>
      <div id="settings-summary" class="notice hidden" role="status" aria-live="polite"></div>
      <div id="quality-warning" class="notice warning hidden" role="status" aria-live="polite"></div>
      <div id="status-box" class="notice status hidden" role="status" aria-live="polite"></div>
      <div class="progress-wrap hidden" id="progress-wrap" aria-live="polite"><label for="progress-bar">Compression progress</label><progress id="progress-bar" max="100" value="0">0%</progress></div>
      <div id="error-box" class="notice error hidden" role="alert"></div>
    </section>
    <section class="panel" aria-labelledby="details-title">
      <div class="panel-header"><h2 id="details-title">Results</h2><p>Preview the original GIF, compare the compressed output, and download the real animated result.</p></div>
      <div class="preview-grid">
        <article class="preview-card"><h3>Original GIF</h3><div id="original-preview" class="preview-frame empty-state">No GIF selected yet.</div><dl id="original-stats" class="stats-list"></dl></article>
        <article class="preview-card"><h3>Compressed GIF</h3><div id="compressed-preview" class="preview-frame empty-state">Compressed output will appear here.</div><dl id="compressed-stats" class="stats-list"></dl><div id="result-actions" class="result-actions hidden"><a id="download-button" class="primary-button" download="compressed.gif"><i class="fa-solid fa-download" aria-hidden="true"></i>Download compressed GIF</a></div></article>
      </div>
    </section>
  `;
}

function mp4ToolHtml(): string {
  return `
    <section class="panel" aria-labelledby="video-upload-title">
      <div class="panel-header">
        <h2 id="video-upload-title">Upload your MP4</h2>
        <p>Drag and drop an MP4 video or click to upload.</p>
      </div>
      <div class="dropzone" id="video-dropzone" role="button" tabindex="0" aria-label="Upload MP4 file" aria-describedby="video-privacy-note video-upload-help">
        <input id="video-file-input" class="visually-hidden" type="file" accept=".mp4,video/mp4" aria-label="Choose MP4 file" />
        <div class="dropzone-content">
          <i class="fa-solid fa-film" aria-hidden="true"></i>
          <p class="dropzone-title">Drop MP4 here</p>
          <p id="video-upload-help" class="muted">or click to browse from your device</p>
        </div>
      </div>
      <p id="video-privacy-note" class="privacy-note">Your MP4 is converted locally in your browser. No file is uploaded to any server.</p>
      <div id="video-selection-status" class="notice success hidden" role="status" aria-live="polite"></div>
      <div id="video-file-warning" class="notice warning hidden" role="status" aria-live="polite"></div>
      <div id="video-runtime-warning" class="notice warning" role="status" aria-live="polite"></div>
      <div class="settings-grid">
        <div class="field-group"><label for="video-start-time">Start time (seconds)</label><input id="video-start-time" type="number" min="0" step="0.1" value="0" inputmode="decimal" /></div>
        <div class="field-group"><label for="video-end-time">End time (seconds)</label><input id="video-end-time" type="number" min="0" step="0.1" placeholder="Auto" inputmode="decimal" /></div>
        <div class="field-group"><label for="video-duration-limit">Duration limit (seconds)</label><input id="video-duration-limit" type="number" min="1" max="15" step="1" value="5" inputmode="numeric" /></div>
        <div class="field-group"><label for="video-width">GIF width</label><input id="video-width" type="number" min="120" step="10" value="480" inputmode="numeric" /></div>
        <div class="field-group"><label for="video-fps">FPS</label><input id="video-fps" type="number" min="1" max="20" step="1" value="10" inputmode="numeric" /></div>
        <div class="field-group"><label for="video-mode">Quality mode</label><select id="video-mode" aria-label="GIF quality mode"><option value="balanced">Balanced</option><option value="quality">Best Quality</option><option value="small">Small Size</option></select></div>
        <div class="field-group checkbox-group"><label class="checkbox-row" for="video-loop"><input id="video-loop" type="checkbox" checked /><span>Loop enabled</span></label></div>
        <div class="field-group checkbox-group"><label class="checkbox-row" for="video-auto-optimize"><input id="video-auto-optimize" type="checkbox" checked /><span>Auto optimize GIF size</span></label></div>
        <div class="field-group action-group">
          <button id="video-convert-button" class="primary-button" type="button" disabled><i class="fa-solid fa-repeat" aria-hidden="true"></i>Convert to GIF</button>
          <button id="video-cancel-button" class="secondary-button" type="button" disabled>Cancel</button>
          <button id="video-reset-settings-button" class="secondary-button" type="button">Reset settings</button>
          <button id="video-reset-button" class="secondary-button" type="button" disabled>Convert another video</button>
        </div>
      </div>
      <div id="video-settings-summary" class="notice hidden" role="status" aria-live="polite"></div>
      <div id="video-status-box" class="notice status hidden" role="status" aria-live="polite"></div>
      <div class="progress-wrap hidden" id="video-progress-wrap" aria-live="polite"><label for="video-progress-bar">Conversion progress</label><progress id="video-progress-bar" max="100" value="0">0%</progress></div>
      <div id="video-error-box" class="notice error hidden" role="alert"></div>
    </section>
    <section class="panel" aria-labelledby="video-results-title">
      <div class="panel-header"><h2 id="video-results-title">Results</h2><p>Preview the selected MP4, create a real animated GIF, and download the output.</p></div>
      <div class="preview-grid">
        <article class="preview-card"><h3>Selected MP4</h3><div id="video-preview" class="preview-frame empty-state">No MP4 selected yet.</div><dl id="video-stats" class="stats-list"></dl></article>
        <article class="preview-card"><h3>Output GIF</h3><div id="video-gif-preview" class="preview-frame empty-state">Converted GIF will appear here.</div><dl id="video-result-stats" class="stats-list"></dl><div id="video-result-actions" class="result-actions hidden"><a id="video-download-button" class="primary-button" download="converted.gif"><i class="fa-solid fa-download" aria-hidden="true"></i>Download GIF</a></div></article>
      </div>
    </section>
  `;
}

const gifPageConfig: ToolPageConfig = {
  route: '/',
  toolName: 'GIF Compressor',
  eyebrow: 'Real browser-based GIF compression',
  intro: 'Compress animated GIFs under 1 MB directly in your browser.',
  heroCopy: 'This tool decodes GIF frames, applies real compression passes, and re-encodes a valid animated GIF file that stays previewable, downloadable, and animated.',
  privacyNote: 'Your GIF is compressed locally in your browser. No file is uploaded to any server.',
  toolHtml: gifToolHtml(),
  howItWorks: [
    { title: '1. Decode', description: 'The tool reads the uploaded animated GIF, extracts frames, and rebuilds the animation state frame by frame.' },
    { title: '2. Compress', description: 'It applies real compression passes including resizing, palette reduction, frame skipping, and metadata cleanup in a Web Worker.' },
    { title: '3. Re-encode', description: 'The processed frames are re-encoded into a valid animated GIF that remains previewable and downloadable.' }
  ],
  features: [
    { title: 'Real animated output', description: 'No fake stats, no renamed PNG or WebP, and no static frame export.' },
    { title: 'Advanced controls', description: 'Choose compression mode, target size, max width, optional FPS reduction, and optional color limit.' },
    { title: 'Responsive and accessible', description: 'Works on mobile, tablet, and desktop with keyboard support and clear status updates.' }
  ],
  faq: [
    { title: 'Will the compressed GIF still animate?', description: 'Yes. The output file is a real animated GIF re-encoded in the browser.' },
    { title: 'Can every GIF go under 1 MB?', description: 'No. If the target is impossible, the tool returns the smallest valid GIF it can produce and shows that best possible compression was reached.' },
    { title: 'Why can quality change?', description: 'Real compression may reduce dimensions, colors, or frame count to make large animations smaller.' }
  ]
};

const mp4PageConfig: ToolPageConfig = {
  route: '/mp4-to-gif',
  toolName: 'MP4 to GIF Converter',
  eyebrow: 'Real browser-based MP4 to GIF conversion',
  intro: 'Convert MP4 videos to animated GIFs directly in your browser.',
  heroCopy: 'This tool trims video segments, applies real GIF conversion settings, and outputs a valid animated GIF file without uploading your MP4 anywhere.',
  privacyNote: 'Your MP4 is converted locally in your browser. No file is uploaded to any server.',
  toolHtml: mp4ToolHtml(),
  howItWorks: [
    { title: '1. Load video', description: 'The tool reads your MP4 in the browser and previews the selected segment details before conversion.' },
    { title: '2. Convert with FFmpeg', description: 'A browser-side FFmpeg worker trims, resizes, and converts the selected video segment into a real animated GIF.' },
    { title: '3. Download GIF', description: 'The final GIF is previewable in the page and downloadable as a valid animated GIF file.' }
  ],
  features: [
    { title: 'Real MP4 to GIF conversion', description: 'Uses FFmpeg.wasm in a worker to convert MP4 video into a genuine animated GIF output.' },
    { title: 'Adjustable segment settings', description: 'Choose start time, end time, duration, width, FPS, and quality mode before conversion.' },
    { title: 'Responsive private workflow', description: 'Runs on mobile and desktop with private client-side processing and progress updates.' }
  ],
  faq: [
    { title: 'Does the MP4 get uploaded?', description: 'No. Conversion runs locally in your browser using FFmpeg.wasm.' },
    { title: 'Why is there a duration limit?', description: 'Shorter default segments reduce memory usage and help avoid browser crashes during GIF conversion.' },
    { title: 'Can I make smaller GIFs?', description: 'Yes. Lower the width, FPS, or duration, or switch to Small Size mode for more aggressive output reduction.' }
  ]
};

updateSeo(route);
app.innerHTML = renderLayout(route === '/' ? gifPageConfig : mp4PageConfig);

function initGifTool(): void {
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
  const resetSettingsButton = requireElement<HTMLButtonElement>('#reset-settings-button');
  const resetButton = requireElement<HTMLButtonElement>('#reset-button');
  const originalPreview = requireElement<HTMLDivElement>('#original-preview');
  const compressedPreview = requireElement<HTMLDivElement>('#compressed-preview');
  const originalStats = requireElement<HTMLDListElement>('#original-stats');
  const compressedStats = requireElement<HTMLDListElement>('#compressed-stats');
  const statusBox = requireElement<HTMLDivElement>('#status-box');
  const errorBox = requireElement<HTMLDivElement>('#error-box');
  const selectionStatus = requireElement<HTMLDivElement>('#selection-status');
  const fileWarning = requireElement<HTMLDivElement>('#file-warning');
  const runtimeWarning = requireElement<HTMLDivElement>('#runtime-warning');
  const settingsSummary = requireElement<HTMLDivElement>('#settings-summary');
  const qualityWarning = requireElement<HTMLDivElement>('#quality-warning');
  const progressWrap = requireElement<HTMLDivElement>('#progress-wrap');
  const progressBar = requireElement<HTMLProgressElement>('#progress-bar');
  const resultActions = requireElement<HTMLDivElement>('#result-actions');
  const downloadButton = requireElement<HTMLAnchorElement>('#download-button');

  let selectedFile: File | null = null;
  let originalPreviewUrl = '';
  let compressedPreviewUrl = '';
  let activeCompressionTask: CompressionTask | null = null;
  let selectedFileToken = 0;
  const memoryManager = new MemoryManager();

  const defaultSettings = { targetValue: '1024', targetUnit: 'KB', mode: 'balanced', auto: true, maxWidth: '', fpsReduction: '', colorLimit: '' } as const;

  const targetBytes = (): number => toTargetBytes(Number(targetValueInput.value), targetUnitSelect.value === 'MB' ? 'MB' : 'KB');
  const currentSettings = () => ({
    targetBytes: targetBytes(),
    mode: compressionModeSelect.value as CompressionMode,
    auto: autoModeInput.checked,
    maxWidth: toNullablePositiveInteger(maxWidthInput.value),
    maxFrameStep: toNullablePositiveInteger(fpsReductionSelect.value),
    colorLimit: toNullablePositiveInteger(colorLimitSelect.value)
  });

  const formatCurrentSettings = (): string => {
    const settings = currentSettings();
    const modeLabel = settings.mode === 'high' ? 'High Compression' : settings.mode === 'quality' ? 'Best Quality' : 'Balanced';
    const widthLabel = settings.maxWidth ? `${settings.maxWidth}px` : 'Auto';
    const fpsLabel = settings.maxFrameStep ? (settings.maxFrameStep === 1 ? 'No reduction' : `Every ${settings.maxFrameStep}th frame`) : 'Auto';
    const colorLabel = settings.colorLimit ? `${settings.colorLimit} colors` : 'Auto';
    return `Current settings: target ${formatBytes(settings.targetBytes)}, mode ${modeLabel}, max width ${widthLabel}, FPS reduction ${fpsLabel}, color limit ${colorLabel}, ${settings.auto ? 'auto mode on' : 'auto mode off'}.`;
  };

  const renderSettingsSummary = (): void => setNotice(settingsSummary, formatCurrentSettings(), false);
  const applyDefaultSettings = (): void => {
    targetValueInput.value = defaultSettings.targetValue;
    targetUnitSelect.value = defaultSettings.targetUnit;
    compressionModeSelect.value = defaultSettings.mode;
    autoModeInput.checked = defaultSettings.auto;
    maxWidthInput.value = defaultSettings.maxWidth;
    fpsReductionSelect.value = defaultSettings.fpsReduction;
    colorLimitSelect.value = defaultSettings.colorLimit;
  };
  const setCompressionUiState = (isRunning: boolean): void => {
    targetValueInput.disabled = isRunning;
    targetUnitSelect.disabled = isRunning;
    compressionModeSelect.disabled = isRunning;
    autoModeInput.disabled = isRunning;
    maxWidthInput.disabled = isRunning;
    fpsReductionSelect.disabled = isRunning;
    colorLimitSelect.disabled = isRunning;
    compressButton.disabled = isRunning || selectedFile === null;
    cancelButton.disabled = !isRunning;
    resetSettingsButton.disabled = isRunning;
    resetButton.disabled = isRunning || selectedFile === null;
  };
  const resetCompressedOutput = (): void => {
    memoryManager.revokeObjectUrl('compressed');
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
  };
  const updateLargeFileWarning = (file: File | null): void => {
    if (!file) {
      setNotice(fileWarning, '', true);
    } else if (file.size >= 8 * 1024 * 1024) {
      setNotice(fileWarning, 'Large GIF detected. Compression may take longer and use more browser memory on this device.', false);
    } else {
      setNotice(fileWarning, '', true);
    }
  };
  const updateWarning = (): void => {
    const bytes = targetBytes();
    if (bytes <= 350 * 1024 || !autoModeInput.checked) {
      setNotice(qualityWarning, bytes <= 350 * 1024 ? 'Very small targets may noticeably reduce animation quality, dimensions, or smoothness.' : 'Manual-style limits are enabled. Stricter width, color, or frame settings may reduce animation quality more noticeably.', false);
      return;
    }
    setNotice(qualityWarning, '', true);
  };
  const clearResultForSettingsChange = (message: string): void => {
    if (selectedFile && (compressedPreviewUrl || !resultActions.classList.contains('hidden'))) {
      resetCompressedOutput();
      setNotice(statusBox, message, false);
    }
  };
  const selectedFileStats = (file: File, metadata: GifFileMetadata | null): Array<[string, string]> => {
    const items: Array<[string, string]> = [['File Name', file.name], ['Original Size', formatBytes(file.size)], ['Type', file.type || 'image/gif'], ['Status', 'GIF selected successfully']];
    items.push(['Dimensions', metadata ? `${metadata.width} x ${metadata.height}` : 'Reading GIF metadata...']);
    items.push(['Frame Count', metadata ? `${metadata.frameCount}` : 'Reading GIF metadata...']);
    return items;
  };
  const resetAll = (): void => {
    activeCompressionTask?.cancel();
    activeCompressionTask = null;
    selectedFile = null;
    selectedFileToken += 1;
    fileInput.value = '';
    memoryManager.revokeAll();
    originalPreviewUrl = '';
    resetCompressedOutput();
    originalPreview.parentElement?.classList.remove('selected-card');
    originalPreview.classList.add('empty-state');
    originalPreview.textContent = 'No GIF selected yet.';
    originalStats.innerHTML = '';
    setCompressionUiState(false);
    compressButton.disabled = true;
    resetButton.disabled = true;
    setNotice(selectionStatus, '', true);
    setNotice(fileWarning, '', true);
    setNotice(statusBox, '', true);
    setNotice(errorBox, '', true);
  };
  const applySelectedFile = (file: File): void => {
    const validationError = validateGifFile(file);
    if (validationError) {
      setNotice(errorBox, validationError, false);
      setCompressionUiState(false);
      return;
    }
    selectedFile = file;
    selectedFileToken += 1;
    const token = selectedFileToken;
    setNotice(errorBox, '', true);
    setNotice(statusBox, '', true);
    setNotice(selectionStatus, 'GIF selected successfully', false);
    updateLargeFileWarning(file);
    resetCompressedOutput();
    originalPreviewUrl = memoryManager.setObjectUrl('original', file);
    renderImagePreview(originalPreview, originalPreviewUrl, `Original preview for ${file.name}`);
    originalPreview.parentElement?.classList.add('selected-card');
    renderStats(originalStats, selectedFileStats(file, null));
    setCompressionUiState(false);
    void readGifMetadata(file).then((metadata) => {
      if (!selectedFile || selectedFileToken !== token) {
        return;
      }
      renderStats(originalStats, selectedFileStats(file, metadata));
      if (!metadata) {
        setNotice(statusBox, 'GIF selected successfully. Some metadata could not be read before compression, but compression can still continue.', false);
      }
    });
  };
  const renderCompressionResult = (fileName: string, result: CompressionResult): void => {
    compressedPreviewUrl = memoryManager.setObjectUrl('compressed', result.blob);
    renderImagePreview(compressedPreview, compressedPreviewUrl, `Compressed preview for ${fileName}`);
    setNotice(statusBox, result.underTarget ? 'Compression complete. The GIF is within your target size.' : 'Best possible compression reached. The file could not be reduced below the requested target.', false);
    renderStats(compressedStats, [
      ['Status', result.underTarget ? 'Success: Under target size' : 'Best possible compression reached'],
      ['Output size', formatBytes(result.compressedBytes)],
      ['Saved', `${formatBytes(result.savedBytes)} (${formatPercent(result.savedPercent)})`],
      ['Resolution', `${result.width} x ${result.height}`],
      ['Duration', `${(result.summary.inputDurationMs / 1000).toFixed(2)}s -> ${(result.summary.outputDurationMs / 1000).toFixed(2)}s`],
      ['Estimated FPS', `${result.summary.inputFps.toFixed(1)} -> ${result.summary.outputFps.toFixed(1)}`],
      ['Compression mode', result.summary.mode === 'high' ? 'High Compression' : result.summary.mode === 'quality' ? 'Best Quality' : 'Balanced'],
      ['Frames', `${result.summary.inputFrames} -> ${result.summary.outputFrames}`],
      ['Colors used', `${result.summary.colorsUsed}`],
      ['Loop', result.summary.loopCount === -1 ? 'Play once' : result.summary.loopCount === 0 ? 'Loop forever' : `${result.summary.loopCount} repeats`],
      ['Optimization', result.strategySummary]
    ]);
    progressWrap.classList.remove('hidden');
    progressBar.value = 100;
    downloadButton.href = compressedPreviewUrl;
    downloadButton.download = `${fileName.replace(/\.gif$/i, '')}-compressed.gif`;
    downloadButton.setAttribute('aria-disabled', 'false');
    downloadButton.tabIndex = 0;
    resultActions.classList.remove('hidden');
  };
  const handleCompression = async (): Promise<void> => {
    if (!selectedFile) {
      return;
    }
    setCompressionUiState(true);
    setNotice(errorBox, '', true);
    setNotice(statusBox, 'Preparing GIF for compression...', false);
    resetCompressedOutput();
    progressWrap.classList.remove('hidden');
    progressBar.value = 0;
    try {
      activeCompressionTask = compressGif(selectedFile, currentSettings(), (progress) => {
        progressWrap.classList.remove('hidden');
        progressBar.value = progress.percent;
        setNotice(statusBox, `${progress.stage} (${progress.attempt}/${progress.totalAttempts}) - ${progress.detail}`, false);
      });
      const result = await activeCompressionTask.promise;
      renderCompressionResult(selectedFile.name, result);
    } catch (error) {
      setNotice(errorBox, error instanceof Error ? error.message : 'An unexpected compression error occurred.', false);
    } finally {
      activeCompressionTask = null;
      setCompressionUiState(false);
    }
  };
  const cancelCompression = (): void => {
    activeCompressionTask?.cancel();
    activeCompressionTask = null;
    progressWrap.classList.add('hidden');
    progressBar.value = 0;
    setNotice(statusBox, 'Compression cancelled.', false);
    setCompressionUiState(false);
  };
  const resetSettings = (): void => {
    applyDefaultSettings();
    updateWarning();
    renderSettingsSummary();
    clearResultForSettingsChange('Compression settings were reset. Compress again to generate a new GIF with the default settings.');
  };
  const handleSettingsChange = (): void => {
    updateWarning();
    renderSettingsSummary();
    clearResultForSettingsChange('Compression settings changed. Compress again to generate a new GIF with the updated settings.');
  };

  const browserSupportIssue = getBrowserSupportIssue();
  if (browserSupportIssue) {
    dropzone.setAttribute('aria-disabled', 'true');
    fileInput.disabled = true;
    setNotice(errorBox, browserSupportIssue, false);
  }

  dropzone.addEventListener('click', () => {
    if (!browserSupportIssue) fileInput.click();
  });
  dropzone.addEventListener('keydown', (event) => {
    if (!browserSupportIssue && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      fileInput.click();
    }
  });
  dropzone.addEventListener('dragover', (event) => {
    if (!browserSupportIssue) {
      event.preventDefault();
      dropzone.classList.add('drag-active');
    }
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-active'));
  dropzone.addEventListener('drop', (event) => {
    if (!browserSupportIssue) {
      event.preventDefault();
      dropzone.classList.remove('drag-active');
      const file = event.dataTransfer?.files?.[0];
      if (file) applySelectedFile(file);
    }
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) applySelectedFile(file);
  });
  compressButton.addEventListener('click', () => void handleCompression());
  cancelButton.addEventListener('click', cancelCompression);
  resetSettingsButton.addEventListener('click', resetSettings);
  resetButton.addEventListener('click', resetAll);
  targetValueInput.addEventListener('input', handleSettingsChange);
  targetUnitSelect.addEventListener('change', handleSettingsChange);
  compressionModeSelect.addEventListener('change', handleSettingsChange);
  autoModeInput.addEventListener('change', handleSettingsChange);
  maxWidthInput.addEventListener('input', handleSettingsChange);
  fpsReductionSelect.addEventListener('change', handleSettingsChange);
  colorLimitSelect.addEventListener('change', handleSettingsChange);
  downloadButton.addEventListener('click', (event) => {
    if (!downloadButton.href) event.preventDefault();
  });

  applyDefaultSettings();
  updateWarning();
  renderSettingsSummary();
  setNotice(runtimeWarning, getRuntimeProcessingWarning(), false);
}

function initMp4Tool(): void {
  const fileInput = requireElement<HTMLInputElement>('#video-file-input');
  const dropzone = requireElement<HTMLDivElement>('#video-dropzone');
  const startInput = requireElement<HTMLInputElement>('#video-start-time');
  const endInput = requireElement<HTMLInputElement>('#video-end-time');
  const durationLimitInput = requireElement<HTMLInputElement>('#video-duration-limit');
  const widthInput = requireElement<HTMLInputElement>('#video-width');
  const fpsInput = requireElement<HTMLInputElement>('#video-fps');
  const modeSelect = requireElement<HTMLSelectElement>('#video-mode');
  const loopInput = requireElement<HTMLInputElement>('#video-loop');
  const autoOptimizeInput = requireElement<HTMLInputElement>('#video-auto-optimize');
  const convertButton = requireElement<HTMLButtonElement>('#video-convert-button');
  const cancelButton = requireElement<HTMLButtonElement>('#video-cancel-button');
  const resetSettingsButton = requireElement<HTMLButtonElement>('#video-reset-settings-button');
  const resetButton = requireElement<HTMLButtonElement>('#video-reset-button');
  const videoPreview = requireElement<HTMLDivElement>('#video-preview');
  const gifPreview = requireElement<HTMLDivElement>('#video-gif-preview');
  const videoStats = requireElement<HTMLDListElement>('#video-stats');
  const resultStats = requireElement<HTMLDListElement>('#video-result-stats');
  const selectionStatus = requireElement<HTMLDivElement>('#video-selection-status');
  const fileWarning = requireElement<HTMLDivElement>('#video-file-warning');
  const runtimeWarning = requireElement<HTMLDivElement>('#video-runtime-warning');
  const settingsSummary = requireElement<HTMLDivElement>('#video-settings-summary');
  const statusBox = requireElement<HTMLDivElement>('#video-status-box');
  const errorBox = requireElement<HTMLDivElement>('#video-error-box');
  const progressWrap = requireElement<HTMLDivElement>('#video-progress-wrap');
  const progressBar = requireElement<HTMLProgressElement>('#video-progress-bar');
  const resultActions = requireElement<HTMLDivElement>('#video-result-actions');
  const downloadButton = requireElement<HTMLAnchorElement>('#video-download-button');

  let selectedFile: File | null = null;
  let selectedVideoUrl = '';
  let outputGifUrl = '';
  let activeTask: Mp4ToGifTask | null = null;
  let selectedToken = 0;
  const memoryManager = new MemoryManager();

  const defaults = { start: '0', end: '', duration: '5', width: '480', fps: '10', mode: 'balanced', loop: true, autoOptimize: true } as const;

  const currentSettings = () => ({
    startTime: Math.max(0, Number(startInput.value) || 0),
    endTime: endInput.value ? Math.max(0, Number(endInput.value)) : null,
    durationLimit: Math.max(1, Math.min(15, Number(durationLimitInput.value) || 5)),
    width: toNullablePositiveInteger(widthInput.value),
    fps: Math.max(1, Math.min(20, Number(fpsInput.value) || 10)),
    mode: modeSelect.value as Mp4GifMode,
    loop: loopInput.checked,
    autoOptimize: autoOptimizeInput.checked
  });

  const formatSettingsSummary = (): string => {
    const settings = currentSettings();
    const modeLabel = settings.mode === 'quality' ? 'Best Quality' : settings.mode === 'small' ? 'Small Size' : 'Balanced';
    const endLabel = settings.endTime === null ? 'Auto' : `${settings.endTime.toFixed(1)}s`;
    return `Current settings: start ${settings.startTime.toFixed(1)}s, end ${endLabel}, duration limit ${settings.durationLimit}s, width ${settings.width ?? 'Auto'}, FPS ${settings.fps}, mode ${modeLabel}, loop ${settings.loop ? 'on' : 'off'}, auto optimize ${settings.autoOptimize ? 'on' : 'off'}.`;
  };

  const renderSettingsSummary = (): void => setNotice(settingsSummary, formatSettingsSummary(), false);
  const applyDefaultSettings = (): void => {
    startInput.value = defaults.start;
    endInput.value = defaults.end;
    durationLimitInput.value = defaults.duration;
    widthInput.value = defaults.width;
    fpsInput.value = defaults.fps;
    modeSelect.value = defaults.mode;
    loopInput.checked = defaults.loop;
    autoOptimizeInput.checked = defaults.autoOptimize;
  };
  const setUiState = (isRunning: boolean): void => {
    startInput.disabled = isRunning;
    endInput.disabled = isRunning;
    durationLimitInput.disabled = isRunning;
    widthInput.disabled = isRunning;
    fpsInput.disabled = isRunning;
    modeSelect.disabled = isRunning;
    loopInput.disabled = isRunning;
    autoOptimizeInput.disabled = isRunning;
    convertButton.disabled = isRunning || selectedFile === null;
    cancelButton.disabled = !isRunning;
    resetSettingsButton.disabled = isRunning;
    resetButton.disabled = isRunning || selectedFile === null;
  };
  const resetOutput = (): void => {
    memoryManager.revokeObjectUrl('output-gif');
    outputGifUrl = '';
    gifPreview.classList.add('empty-state');
    gifPreview.textContent = 'Converted GIF will appear here.';
    resultStats.innerHTML = '';
    downloadButton.removeAttribute('href');
    downloadButton.removeAttribute('download');
    downloadButton.setAttribute('aria-disabled', 'true');
    downloadButton.tabIndex = -1;
    resultActions.classList.add('hidden');
    progressWrap.classList.add('hidden');
    progressBar.value = 0;
  };
  const resetAll = (): void => {
    activeTask?.cancel();
    activeTask = null;
    selectedFile = null;
    selectedToken += 1;
    fileInput.value = '';
    memoryManager.revokeAll();
    selectedVideoUrl = '';
    resetOutput();
    videoPreview.parentElement?.classList.remove('selected-card');
    videoPreview.classList.add('empty-state');
    videoPreview.textContent = 'No MP4 selected yet.';
    videoStats.innerHTML = '';
    setUiState(false);
    convertButton.disabled = true;
    resetButton.disabled = true;
    setNotice(selectionStatus, '', true);
    setNotice(fileWarning, '', true);
    setNotice(statusBox, '', true);
    setNotice(errorBox, '', true);
  };
  const updateLargeFileWarning = (file: File | null): void => {
    if (!file) {
      setNotice(fileWarning, '', true);
    } else if (file.size >= 25 * 1024 * 1024) {
      setNotice(fileWarning, 'Large MP4 detected. Use a short duration and lower width if the browser has limited memory.', false);
    } else {
      setNotice(fileWarning, '', true);
    }
  };
  const selectedStats = (file: File, metadata: VideoFileMetadata | null): Array<[string, string]> => [
    ['File Name', file.name],
    ['Original Size', formatBytes(file.size)],
    ['Type', file.type || 'video/mp4'],
    ['Duration', metadata ? `${metadata.duration.toFixed(2)}s` : 'Reading video metadata...'],
    ['Dimensions', metadata ? `${metadata.width} x ${metadata.height}` : 'Reading video metadata...'],
    ['Status', 'MP4 selected successfully']
  ];
  const clearResultForSettingsChange = (message: string): void => {
    if (selectedFile && (outputGifUrl || !resultActions.classList.contains('hidden'))) {
      resetOutput();
      setNotice(statusBox, message, false);
    }
  };
  const handleSettingsChange = (): void => {
    renderSettingsSummary();
    clearResultForSettingsChange('Conversion settings changed. Convert again to generate a new GIF with the updated settings.');
  };
  const resetSettings = (): void => {
    applyDefaultSettings();
    renderSettingsSummary();
    clearResultForSettingsChange('Conversion settings were reset. Convert again to generate a new GIF with the default settings.');
  };
  const applySelectedFile = (file: File): void => {
    const validationError = validateMp4File(file);
    if (validationError) {
      setNotice(errorBox, validationError, false);
      setUiState(false);
      return;
    }
    selectedFile = file;
    selectedToken += 1;
    const token = selectedToken;
    setNotice(errorBox, '', true);
    setNotice(statusBox, '', true);
    setNotice(selectionStatus, 'MP4 selected successfully', false);
    updateLargeFileWarning(file);
    resetOutput();
    selectedVideoUrl = memoryManager.setObjectUrl('selected-video', file);
    renderVideoPreview(videoPreview, selectedVideoUrl, `Selected video preview for ${file.name}`);
    videoPreview.parentElement?.classList.add('selected-card');
    renderStats(videoStats, selectedStats(file, null));
    setUiState(false);
    void readVideoMetadata(file).then((metadata) => {
      if (!selectedFile || selectedToken !== token) {
        return;
      }
      renderStats(videoStats, selectedStats(file, metadata));
      if (metadata) {
        durationLimitInput.max = `${Math.max(1, Math.min(15, Math.floor(metadata.duration)))}`;
        setNotice(runtimeWarning, getRuntimeProcessingWarning(metadata.duration), false);
      }
    });
  };
  const renderResult = (fileName: string, result: Mp4ToGifResult): void => {
    outputGifUrl = memoryManager.setObjectUrl('output-gif', result.blob);
    renderImagePreview(gifPreview, outputGifUrl, `Converted GIF preview for ${fileName}`);
    setNotice(statusBox, 'MP4 conversion complete. Your animated GIF is ready.', false);
    renderStats(resultStats, [
      ['Output GIF size', formatBytes(result.outputBytes)],
      ['Original MP4 size', formatBytes(result.originalBytes)],
      ['Selected duration', `${result.summary.durationUsed.toFixed(2)}s`],
      ['FPS used', `${result.summary.fpsUsed}`],
      ['Width used', `${result.summary.widthUsed}px`],
      ['Quality mode', result.summary.mode === 'quality' ? 'Best Quality' : result.summary.mode === 'small' ? 'Small Size' : 'Balanced'],
      ['Loop', result.summary.loop ? 'Loop forever' : 'Play once']
    ]);
    progressWrap.classList.remove('hidden');
    progressBar.value = 100;
    downloadButton.href = outputGifUrl;
    downloadButton.download = `${fileName.replace(/\.mp4$/i, '')}.gif`;
    downloadButton.setAttribute('aria-disabled', 'false');
    downloadButton.tabIndex = 0;
    resultActions.classList.remove('hidden');
  };
  const handleConversion = async (): Promise<void> => {
    if (!selectedFile) {
      return;
    }
    const settings = currentSettings();
    if (settings.endTime !== null && settings.endTime <= settings.startTime) {
      setNotice(errorBox, 'End time must be greater than start time.', false);
      return;
    }
    setUiState(true);
    setNotice(errorBox, '', true);
    setNotice(statusBox, 'Preparing MP4 for GIF conversion...', false);
    resetOutput();
    progressWrap.classList.remove('hidden');
    progressBar.value = 0;
    try {
      activeTask = convertMp4ToGif(selectedFile, settings, (progress) => {
        progressWrap.classList.remove('hidden');
        progressBar.value = progress.percent;
        setNotice(statusBox, `${progress.stage} - ${progress.detail}`, false);
      });
      const result = await activeTask.promise;
      renderResult(selectedFile.name, result);
    } catch (error) {
      setNotice(errorBox, error instanceof Error ? error.message : 'An unexpected MP4 conversion error occurred.', false);
    } finally {
      activeTask = null;
      setUiState(false);
    }
  };
  const cancelConversion = (): void => {
    activeTask?.cancel();
    activeTask = null;
    progressWrap.classList.add('hidden');
    progressBar.value = 0;
    setNotice(statusBox, 'Conversion cancelled.', false);
    setUiState(false);
  };

  const browserSupportIssue = getMp4BrowserSupportIssue();
  if (browserSupportIssue) {
    dropzone.setAttribute('aria-disabled', 'true');
    fileInput.disabled = true;
    setNotice(errorBox, browserSupportIssue, false);
  }

  dropzone.addEventListener('click', () => {
    if (!browserSupportIssue) fileInput.click();
  });
  dropzone.addEventListener('keydown', (event) => {
    if (!browserSupportIssue && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      fileInput.click();
    }
  });
  dropzone.addEventListener('dragover', (event) => {
    if (!browserSupportIssue) {
      event.preventDefault();
      dropzone.classList.add('drag-active');
    }
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-active'));
  dropzone.addEventListener('drop', (event) => {
    if (!browserSupportIssue) {
      event.preventDefault();
      dropzone.classList.remove('drag-active');
      const file = event.dataTransfer?.files?.[0];
      if (file) applySelectedFile(file);
    }
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) applySelectedFile(file);
  });
  convertButton.addEventListener('click', () => void handleConversion());
  cancelButton.addEventListener('click', cancelConversion);
  resetSettingsButton.addEventListener('click', resetSettings);
  resetButton.addEventListener('click', resetAll);
  startInput.addEventListener('input', handleSettingsChange);
  endInput.addEventListener('input', handleSettingsChange);
  durationLimitInput.addEventListener('input', handleSettingsChange);
  widthInput.addEventListener('input', handleSettingsChange);
  fpsInput.addEventListener('input', handleSettingsChange);
  modeSelect.addEventListener('change', handleSettingsChange);
  loopInput.addEventListener('change', handleSettingsChange);
  autoOptimizeInput.addEventListener('change', handleSettingsChange);
  downloadButton.addEventListener('click', (event) => {
    if (!downloadButton.href) event.preventDefault();
  });

  applyDefaultSettings();
  renderSettingsSummary();
  setNotice(runtimeWarning, getRuntimeProcessingWarning(), false);
}

if (route === '/') {
  initGifTool();
} else {
  initMp4Tool();
}
