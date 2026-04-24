import './styles.css';
import { compressGif } from './gif-compressor';
import { cropGif } from './gif-crop';
import { makeGif } from './gif-maker';
import { convertGifToMp4 } from './gif-to-mp4';
import { resizeGif } from './gif-resizer';
import { splitGifFrames } from './gif-split';
import { changeGifSpeed } from './gif-speed';
import JSZip from 'jszip';
import { renderLayout, type ToolPageConfig } from './layout';
import { MemoryManager } from './memory-manager';
import { convertMp4ToGif } from './mp4-to-gif';
import type {
  AppRoute,
  CompressionMode,
  CompressionResult,
  CompressionTask,
  GifCropTask,
  GifFileMetadata,
  GifMakerImageInput,
  GifMakerTask,
  GifToMp4Result,
  GifResizeTask,
  GifSpeedTask,
  GifToMp4Task,
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

const knownRoutes: AppRoute[] = ['/', '/mp4-to-gif', '/gif-to-mp4', '/gif-resizer', '/gif-speed', '/gif-optimizer', '/gif-crop', '/gif-split', '/gif-maker'];
const route = (knownRoutes.includes(window.location.pathname as AppRoute) ? window.location.pathname : '/') as AppRoute;

function setMeta(selector: string, attribute: 'content' | 'href', value: string): void {
  const element = document.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (element) {
    element.setAttribute(attribute, value);
  }
}

function updateSeo(currentRoute: AppRoute): void {
  const seoConfig: Record<AppRoute, { title: string; description: string; name: string; features: string[] }> = {
    '/': {
      title: 'GIF Compressor Tool | Fast Browser-Based GIF Compression',
      description: 'Compress GIF files directly in your browser with a fast, responsive, privacy-friendly tool. Reduce GIF size under 1 MB when possible with no server upload.',
      name: 'GIF Compressor Tool',
      features: ['Client-side GIF compression', 'Target size selection', 'Drag and drop upload', 'Responsive design', 'Privacy-friendly processing']
    },
    '/mp4-to-gif': {
      title: 'MP4 to GIF Converter - Convert Video to GIF Online',
      description: 'Convert MP4 videos to animated GIFs directly in your browser. Fast, private, responsive, and no file upload required.',
      name: 'MP4 to GIF Converter',
      features: ['Client-side MP4 to GIF conversion', 'Video trimming', 'GIF size optimization', 'Responsive design', 'Privacy-friendly processing']
    },
    '/gif-to-mp4': {
      title: 'GIF to MP4 Converter - Convert GIF to Video Online',
      description: 'Convert animated GIF files into MP4 videos directly in your browser. Private, responsive, and no upload required.',
      name: 'GIF to MP4 Converter',
      features: ['Client-side GIF to MP4 conversion', 'Animated GIF to video', 'Responsive design', 'Privacy-friendly processing']
    },
    '/gif-resizer': {
      title: 'GIF Resizer - Resize Animated GIF Online',
      description: 'Resize animated GIF files directly in your browser while keeping real animated output.',
      name: 'GIF Resizer',
      features: ['Client-side GIF resizing', 'Responsive design', 'Privacy-friendly processing']
    },
    '/gif-speed': {
      title: 'GIF Speed Changer - Speed Up or Slow Down GIFs',
      description: 'Change animated GIF speed directly in your browser and download a real updated GIF.',
      name: 'GIF Speed Changer',
      features: ['Client-side GIF speed changes', 'Responsive design', 'Privacy-friendly processing']
    },
    '/gif-crop': {
      title: 'GIF Cropper - Crop Animated GIF Online',
      description: 'Crop animated GIF frames directly in your browser and export a real cropped GIF.',
      name: 'GIF Cropper',
      features: ['Client-side GIF cropping', 'Animated GIF output', 'Responsive design', 'Privacy-friendly processing']
    },
    '/gif-split': {
      title: 'GIF Frame Splitter - Extract GIF Frames Online',
      description: 'Extract GIF frames as PNG images directly in your browser and download them individually or as ZIP.',
      name: 'GIF Frame Splitter',
      features: ['Client-side GIF frame extraction', 'PNG frame export', 'ZIP download', 'Responsive design']
    },
    '/gif-maker': {
      title: 'GIF Maker - Create Animated GIF from Images',
      description: 'Create animated GIFs from PNG and JPG images directly in your browser with no upload required.',
      name: 'GIF Maker',
      features: ['Client-side GIF creation', 'Multi-image upload', 'Frame delay control', 'Responsive design']
    },
    '/gif-optimizer': {
      title: 'Advanced GIF Optimizer - Optimize Animated GIFs Online',
      description: 'Optimize animated GIF files with advanced size, color, scale, and frame controls directly in your browser.',
      name: 'Advanced GIF Optimizer',
      features: ['Advanced GIF optimization', 'Manual compression controls', 'Responsive design', 'Privacy-friendly processing']
    }
  };
  const config = seoConfig[currentRoute];
  const title = config.title;
  const description = config.description;
  const canonical = `https://gif.itisuniqueofficial.com${currentRoute === '/' ? '/' : currentRoute}`;

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
        name: config.name,
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
        featureList: config.features
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

function gifToMp4ToolHtml(): string {
  return `
    <section class="panel" aria-labelledby="gif-to-mp4-upload-title">
      <div class="panel-header"><h2 id="gif-to-mp4-upload-title">Upload your GIF</h2><p>Convert an animated GIF into a smaller MP4 video directly in your browser.</p></div>
      <div class="dropzone" id="g2m-dropzone" role="button" tabindex="0" aria-label="Upload GIF file for MP4 conversion">
        <input id="g2m-file-input" class="visually-hidden" type="file" accept=".gif,image/gif" aria-label="Choose GIF file for MP4 conversion" />
        <div class="dropzone-content"><i class="fa-solid fa-video" aria-hidden="true"></i><p class="dropzone-title">Drop GIF here</p><p class="muted">or click to browse from your device</p></div>
      </div>
      <p class="privacy-note">Your files are processed locally in your browser. No file is uploaded to any server.</p>
      <div id="g2m-selection-status" class="notice success hidden" role="status" aria-live="polite"></div>
      <div id="g2m-file-warning" class="notice warning hidden" role="status" aria-live="polite"></div>
      <div id="g2m-runtime-warning" class="notice warning" role="status" aria-live="polite"></div>
      <div class="settings-grid">
        <div class="field-group"><label for="g2m-width">Output width</label><input id="g2m-width" type="number" min="120" step="10" value="480" inputmode="numeric" /></div>
        <div class="field-group"><label for="g2m-fps">FPS</label><input id="g2m-fps" type="number" min="1" max="30" step="1" value="15" inputmode="numeric" /></div>
        <div class="field-group action-group">
          <button id="g2m-convert-button" class="primary-button" type="button" disabled><i class="fa-solid fa-video" aria-hidden="true"></i>Convert to MP4</button>
          <button id="g2m-cancel-button" class="secondary-button" type="button" disabled>Cancel</button>
          <button id="g2m-reset-button" class="secondary-button" type="button" disabled>Convert another GIF</button>
        </div>
      </div>
      <div id="g2m-status-box" class="notice status hidden" role="status" aria-live="polite"></div>
      <div class="progress-wrap hidden" id="g2m-progress-wrap" aria-live="polite"><label for="g2m-progress-bar">Conversion progress</label><progress id="g2m-progress-bar" max="100" value="0">0%</progress></div>
      <div id="g2m-error-box" class="notice error hidden" role="alert"></div>
    </section>
    <section class="panel" aria-labelledby="gif-to-mp4-results-title">
      <div class="panel-header"><h2 id="gif-to-mp4-results-title">Results</h2><p>Preview the source GIF and the resulting MP4 output.</p></div>
      <div class="preview-grid">
        <article class="preview-card"><h3>Original GIF</h3><div id="g2m-original-preview" class="preview-frame empty-state">No GIF selected yet.</div><dl id="g2m-original-stats" class="stats-list"></dl></article>
        <article class="preview-card"><h3>Output MP4</h3><div id="g2m-output-preview" class="preview-frame empty-state">Converted MP4 will appear here.</div><dl id="g2m-output-stats" class="stats-list"></dl><div id="g2m-result-actions" class="result-actions hidden"><a id="g2m-download-button" class="primary-button" download="output.mp4"><i class="fa-solid fa-download" aria-hidden="true"></i>Download MP4</a></div></article>
      </div>
    </section>
  `;
}

function gifResizerToolHtml(): string {
  return `
    <section class="panel" aria-labelledby="gif-resizer-upload-title">
      <div class="panel-header"><h2 id="gif-resizer-upload-title">Upload your GIF</h2><p>Resize an animated GIF while keeping real animated output.</p></div>
      <div class="dropzone" id="gr-dropzone" role="button" tabindex="0" aria-label="Upload GIF file for resizing">
        <input id="gr-file-input" class="visually-hidden" type="file" accept=".gif,image/gif" aria-label="Choose GIF file for resizing" />
        <div class="dropzone-content"><i class="fa-solid fa-up-right-and-down-left-from-center" aria-hidden="true"></i><p class="dropzone-title">Drop GIF here</p><p class="muted">or click to browse from your device</p></div>
      </div>
      <p class="privacy-note">Your files are processed locally in your browser. No file is uploaded to any server.</p>
      <div id="gr-selection-status" class="notice success hidden" role="status" aria-live="polite"></div>
      <div id="gr-file-warning" class="notice warning hidden" role="status" aria-live="polite"></div>
      <div id="gr-runtime-warning" class="notice warning" role="status" aria-live="polite"></div>
      <div class="settings-grid">
        <div class="field-group"><label for="gr-width">Width</label><input id="gr-width" type="number" min="1" step="10" value="320" inputmode="numeric" /></div>
        <div class="field-group"><label for="gr-height">Height</label><input id="gr-height" type="number" min="1" step="10" placeholder="Auto" inputmode="numeric" /></div>
        <div class="field-group checkbox-group"><label class="checkbox-row" for="gr-keep-aspect"><input id="gr-keep-aspect" type="checkbox" checked /><span>Maintain aspect ratio</span></label></div>
        <div class="field-group action-group">
          <button id="gr-resize-button" class="primary-button" type="button" disabled><i class="fa-solid fa-expand" aria-hidden="true"></i>Resize GIF</button>
          <button id="gr-cancel-button" class="secondary-button" type="button" disabled>Cancel</button>
          <button id="gr-reset-button" class="secondary-button" type="button" disabled>Resize another GIF</button>
        </div>
      </div>
      <div id="gr-status-box" class="notice status hidden" role="status" aria-live="polite"></div>
      <div class="progress-wrap hidden" id="gr-progress-wrap" aria-live="polite"><label for="gr-progress-bar">Resize progress</label><progress id="gr-progress-bar" max="100" value="0">0%</progress></div>
      <div id="gr-error-box" class="notice error hidden" role="alert"></div>
    </section>
    <section class="panel" aria-labelledby="gif-resizer-results-title">
      <div class="panel-header"><h2 id="gif-resizer-results-title">Results</h2><p>Compare the original animated GIF with the resized output.</p></div>
      <div class="preview-grid">
        <article class="preview-card"><h3>Original GIF</h3><div id="gr-original-preview" class="preview-frame empty-state">No GIF selected yet.</div><dl id="gr-original-stats" class="stats-list"></dl></article>
        <article class="preview-card"><h3>Resized GIF</h3><div id="gr-output-preview" class="preview-frame empty-state">Resized GIF will appear here.</div><dl id="gr-output-stats" class="stats-list"></dl><div id="gr-result-actions" class="result-actions hidden"><a id="gr-download-button" class="primary-button" download="resized.gif"><i class="fa-solid fa-download" aria-hidden="true"></i>Download GIF</a></div></article>
      </div>
    </section>
  `;
}

function gifSpeedToolHtml(): string {
  return `
    <section class="panel" aria-labelledby="gif-speed-upload-title">
      <div class="panel-header"><h2 id="gif-speed-upload-title">Upload your GIF</h2><p>Speed up or slow down an animated GIF and download the updated animation.</p></div>
      <div class="dropzone" id="gs-dropzone" role="button" tabindex="0" aria-label="Upload GIF file for speed change">
        <input id="gs-file-input" class="visually-hidden" type="file" accept=".gif,image/gif" aria-label="Choose GIF file for speed change" />
        <div class="dropzone-content"><i class="fa-solid fa-gauge-high" aria-hidden="true"></i><p class="dropzone-title">Drop GIF here</p><p class="muted">or click to browse from your device</p></div>
      </div>
      <p class="privacy-note">Your files are processed locally in your browser. No file is uploaded to any server.</p>
      <div id="gs-selection-status" class="notice success hidden" role="status" aria-live="polite"></div>
      <div id="gs-file-warning" class="notice warning hidden" role="status" aria-live="polite"></div>
      <div id="gs-runtime-warning" class="notice warning" role="status" aria-live="polite"></div>
      <div class="settings-grid">
        <div class="field-group"><label for="gs-speed">Speed</label><select id="gs-speed" aria-label="GIF speed"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option><option value="3">3x</option></select></div>
        <div class="field-group action-group">
          <button id="gs-run-button" class="primary-button" type="button" disabled><i class="fa-solid fa-gauge-high" aria-hidden="true"></i>Change Speed</button>
          <button id="gs-cancel-button" class="secondary-button" type="button" disabled>Cancel</button>
          <button id="gs-reset-button" class="secondary-button" type="button" disabled>Change another GIF</button>
        </div>
      </div>
      <div id="gs-status-box" class="notice status hidden" role="status" aria-live="polite"></div>
      <div class="progress-wrap hidden" id="gs-progress-wrap" aria-live="polite"><label for="gs-progress-bar">Speed update progress</label><progress id="gs-progress-bar" max="100" value="0">0%</progress></div>
      <div id="gs-error-box" class="notice error hidden" role="alert"></div>
    </section>
    <section class="panel" aria-labelledby="gif-speed-results-title">
      <div class="panel-header"><h2 id="gif-speed-results-title">Results</h2><p>Preview the original and speed-adjusted animated GIF output.</p></div>
      <div class="preview-grid">
        <article class="preview-card"><h3>Original GIF</h3><div id="gs-original-preview" class="preview-frame empty-state">No GIF selected yet.</div><dl id="gs-original-stats" class="stats-list"></dl></article>
        <article class="preview-card"><h3>Updated GIF</h3><div id="gs-output-preview" class="preview-frame empty-state">Updated GIF will appear here.</div><dl id="gs-output-stats" class="stats-list"></dl><div id="gs-result-actions" class="result-actions hidden"><a id="gs-download-button" class="primary-button" download="speed.gif"><i class="fa-solid fa-download" aria-hidden="true"></i>Download GIF</a></div></article>
      </div>
    </section>
  `;
}

function gifCropToolHtml(): string {
  return `
    <section class="panel" aria-labelledby="gif-crop-upload-title">
      <div class="panel-header"><h2 id="gif-crop-upload-title">Upload your GIF</h2><p>Crop animated GIF frames with numeric crop controls and export a real cropped GIF.</p></div>
      <div class="dropzone" id="gc-dropzone" role="button" tabindex="0" aria-label="Upload GIF file for cropping">
        <input id="gc-file-input" class="visually-hidden" type="file" accept=".gif,image/gif" aria-label="Choose GIF file for cropping" />
        <div class="dropzone-content"><i class="fa-solid fa-crop-simple" aria-hidden="true"></i><p class="dropzone-title">Drop GIF here</p><p class="muted">or click to browse from your device</p></div>
      </div>
      <p class="privacy-note">Your files are processed locally in your browser. No file is uploaded to any server.</p>
      <div id="gc-selection-status" class="notice success hidden" role="status" aria-live="polite"></div>
      <div id="gc-file-warning" class="notice warning hidden" role="status" aria-live="polite"></div>
      <div id="gc-runtime-warning" class="notice warning" role="status" aria-live="polite"></div>
      <div class="settings-grid">
        <div class="field-group"><label for="gc-x">X</label><input id="gc-x" type="number" min="0" step="1" value="0" inputmode="numeric" /></div>
        <div class="field-group"><label for="gc-y">Y</label><input id="gc-y" type="number" min="0" step="1" value="0" inputmode="numeric" /></div>
        <div class="field-group"><label for="gc-width">Crop width</label><input id="gc-width" type="number" min="1" step="1" value="200" inputmode="numeric" /></div>
        <div class="field-group"><label for="gc-height">Crop height</label><input id="gc-height" type="number" min="1" step="1" value="200" inputmode="numeric" /></div>
        <div class="field-group action-group">
          <button id="gc-run-button" class="primary-button" type="button" disabled><i class="fa-solid fa-crop-simple" aria-hidden="true"></i>Crop GIF</button>
          <button id="gc-cancel-button" class="secondary-button" type="button" disabled>Cancel</button>
          <button id="gc-reset-button" class="secondary-button" type="button" disabled>Crop another GIF</button>
        </div>
      </div>
      <div id="gc-status-box" class="notice status hidden" role="status" aria-live="polite"></div>
      <div class="progress-wrap hidden" id="gc-progress-wrap" aria-live="polite"><label for="gc-progress-bar">Crop progress</label><progress id="gc-progress-bar" max="100" value="0">0%</progress></div>
      <div id="gc-error-box" class="notice error hidden" role="alert"></div>
    </section>
    <section class="panel" aria-labelledby="gif-crop-results-title">
      <div class="panel-header"><h2 id="gif-crop-results-title">Results</h2><p>Preview the original GIF and the cropped animated output.</p></div>
      <div class="preview-grid">
        <article class="preview-card"><h3>Original GIF</h3><div id="gc-original-preview" class="preview-frame empty-state">No GIF selected yet.</div><dl id="gc-original-stats" class="stats-list"></dl></article>
        <article class="preview-card"><h3>Cropped GIF</h3><div id="gc-output-preview" class="preview-frame empty-state">Cropped GIF will appear here.</div><dl id="gc-output-stats" class="stats-list"></dl><div id="gc-result-actions" class="result-actions hidden"><a id="gc-download-button" class="primary-button" download="cropped.gif"><i class="fa-solid fa-download" aria-hidden="true"></i>Download GIF</a></div></article>
      </div>
    </section>
  `;
}

function gifSplitToolHtml(): string {
  return `
    <section class="panel" aria-labelledby="gif-split-upload-title">
      <div class="panel-header"><h2 id="gif-split-upload-title">Upload your GIF</h2><p>Extract GIF frames as PNG images and download them individually or as a ZIP file.</p></div>
      <div class="dropzone" id="gsp-dropzone" role="button" tabindex="0" aria-label="Upload GIF file for frame splitting">
        <input id="gsp-file-input" class="visually-hidden" type="file" accept=".gif,image/gif" aria-label="Choose GIF file for frame splitting" />
        <div class="dropzone-content"><i class="fa-regular fa-images" aria-hidden="true"></i><p class="dropzone-title">Drop GIF here</p><p class="muted">or click to browse from your device</p></div>
      </div>
      <p class="privacy-note">Your files are processed locally in your browser. No file is uploaded to any server.</p>
      <div id="gsp-selection-status" class="notice success hidden" role="status" aria-live="polite"></div>
      <div id="gsp-file-warning" class="notice warning hidden" role="status" aria-live="polite"></div>
      <div id="gsp-runtime-warning" class="notice warning" role="status" aria-live="polite"></div>
      <div class="settings-grid">
        <div class="field-group action-group">
          <button id="gsp-run-button" class="primary-button" type="button" disabled><i class="fa-regular fa-images" aria-hidden="true"></i>Extract Frames</button>
          <button id="gsp-cancel-button" class="secondary-button" type="button" disabled>Cancel</button>
          <button id="gsp-reset-button" class="secondary-button" type="button" disabled>Split another GIF</button>
        </div>
      </div>
      <div id="gsp-status-box" class="notice status hidden" role="status" aria-live="polite"></div>
      <div class="progress-wrap hidden" id="gsp-progress-wrap" aria-live="polite"><label for="gsp-progress-bar">Frame extraction progress</label><progress id="gsp-progress-bar" max="100" value="0">0%</progress></div>
      <div id="gsp-error-box" class="notice error hidden" role="alert"></div>
    </section>
    <section class="panel" aria-labelledby="gif-split-results-title">
      <div class="panel-header"><h2 id="gif-split-results-title">Results</h2><p>Download extracted PNG frames individually or as a ZIP archive.</p></div>
      <div class="preview-grid">
        <article class="preview-card"><h3>Original GIF</h3><div id="gsp-original-preview" class="preview-frame empty-state">No GIF selected yet.</div><dl id="gsp-original-stats" class="stats-list"></dl></article>
        <article class="preview-card"><h3>Extracted Frames</h3><div id="gsp-output-preview" class="preview-frame empty-state">Extracted frame preview will appear here.</div><dl id="gsp-output-stats" class="stats-list"></dl><div id="gsp-result-actions" class="result-actions hidden"><a id="gsp-download-zip-button" class="primary-button" download="frames.zip"><i class="fa-solid fa-file-zipper" aria-hidden="true"></i>Download ZIP</a></div><div id="gsp-frame-links" class="footer-links"></div></article>
      </div>
    </section>
  `;
}

function gifMakerToolHtml(): string {
  return `
    <section class="panel" aria-labelledby="gif-maker-upload-title">
      <div class="panel-header"><h2 id="gif-maker-upload-title">Upload your images</h2><p>Create an animated GIF from PNG or JPG images directly in your browser.</p></div>
      <div class="dropzone" id="gm-dropzone" role="button" tabindex="0" aria-label="Upload images for GIF creation">
        <input id="gm-file-input" class="visually-hidden" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" multiple aria-label="Choose images for GIF creation" />
        <div class="dropzone-content"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i><p class="dropzone-title">Drop images here</p><p class="muted">or click to browse from your device</p></div>
      </div>
      <p class="privacy-note">Your files are processed locally in your browser. No file is uploaded to any server.</p>
      <div id="gm-selection-status" class="notice success hidden" role="status" aria-live="polite"></div>
      <div id="gm-file-warning" class="notice warning hidden" role="status" aria-live="polite"></div>
      <div id="gm-runtime-warning" class="notice warning" role="status" aria-live="polite"></div>
      <div class="settings-grid">
        <div class="field-group"><label for="gm-delay">Frame delay (ms)</label><input id="gm-delay" type="number" min="20" step="10" value="200" inputmode="numeric" /></div>
        <div class="field-group"><label for="gm-width">Output width</label><input id="gm-width" type="number" min="50" step="10" value="480" inputmode="numeric" /></div>
        <div class="field-group action-group">
          <button id="gm-run-button" class="primary-button" type="button" disabled><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>Create GIF</button>
          <button id="gm-cancel-button" class="secondary-button" type="button" disabled>Cancel</button>
          <button id="gm-reset-button" class="secondary-button" type="button" disabled>Create another GIF</button>
        </div>
      </div>
      <div id="gm-status-box" class="notice status hidden" role="status" aria-live="polite"></div>
      <div class="progress-wrap hidden" id="gm-progress-wrap" aria-live="polite"><label for="gm-progress-bar">GIF creation progress</label><progress id="gm-progress-bar" max="100" value="0">0%</progress></div>
      <div id="gm-error-box" class="notice error hidden" role="alert"></div>
    </section>
    <section class="panel" aria-labelledby="gif-maker-results-title">
      <div class="panel-header"><h2 id="gif-maker-results-title">Results</h2><p>Preview the generated animated GIF and manage the uploaded image order.</p></div>
      <div class="preview-grid">
        <article class="preview-card"><h3>Selected Images</h3><div id="gm-image-list" class="footer-links"></div><dl id="gm-original-stats" class="stats-list"></dl></article>
        <article class="preview-card"><h3>Generated GIF</h3><div id="gm-output-preview" class="preview-frame empty-state">Created GIF will appear here.</div><dl id="gm-output-stats" class="stats-list"></dl><div id="gm-result-actions" class="result-actions hidden"><a id="gm-download-button" class="primary-button" download="created.gif"><i class="fa-solid fa-download" aria-hidden="true"></i>Download GIF</a></div></article>
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

const gifToMp4PageConfig: ToolPageConfig = {
  route: '/gif-to-mp4',
  toolName: 'GIF to MP4 Converter',
  eyebrow: 'Real browser-based GIF to MP4 conversion',
  intro: 'Convert animated GIF files into MP4 videos directly in your browser.',
  heroCopy: 'This tool converts GIF animation into MP4 video using browser-side FFmpeg while keeping the process private and fully client-side.',
  privacyNote: 'Your files are processed locally in your browser. No file is uploaded to any server.',
  toolHtml: gifToMp4ToolHtml(),
  howItWorks: [
    { title: '1. Load GIF', description: 'The tool reads your animated GIF directly in the browser and previews its key details before conversion.' },
    { title: '2. Convert with FFmpeg', description: 'FFmpeg.wasm runs in a worker and converts the GIF frames into a real MP4 video output.' },
    { title: '3. Download MP4', description: 'The resulting MP4 is previewable in the page and downloadable immediately.' }
  ],
  features: [
    { title: 'Real MP4 output', description: 'Creates a valid MP4 file rather than renaming another format.' },
    { title: 'Responsive conversion flow', description: 'Runs in a worker with progress updates and private local processing.' },
    { title: 'Video-friendly output', description: 'MP4 output can significantly reduce size compared with the original GIF.' }
  ],
  faq: [
    { title: 'Why convert GIF to MP4?', description: 'MP4 can reduce file size significantly while preserving the animation as a video format.' },
    { title: 'Is the MP4 real?', description: 'Yes. The output is an actual MP4 video generated in the browser.' },
    { title: 'Do you upload the GIF?', description: 'No. Conversion runs fully in your browser.' }
  ]
};

const gifResizerPageConfig: ToolPageConfig = {
  route: '/gif-resizer',
  toolName: 'GIF Resizer',
  eyebrow: 'Real browser-based GIF resizing',
  intro: 'Resize animated GIFs directly in your browser while keeping them animated.',
  heroCopy: 'This tool resizes animated GIF frames and rebuilds a real resized GIF output file without sending anything to a server.',
  privacyNote: 'Your files are processed locally in your browser. No file is uploaded to any server.',
  toolHtml: gifResizerToolHtml(),
  howItWorks: [
    { title: '1. Select GIF', description: 'Choose the animated GIF you want to resize and review its original preview.' },
    { title: '2. Set dimensions', description: 'Adjust the output width and height or keep the aspect ratio for safer resizing.' },
    { title: '3. Export GIF', description: 'The browser generates a real resized animated GIF that you can preview and download.' }
  ],
  features: [
    { title: 'Animated resizing', description: 'Keeps the GIF animated instead of flattening it into a static image.' },
    { title: 'Aspect-ratio control', description: 'Choose whether to maintain the original aspect ratio while resizing.' },
    { title: 'Private processing', description: 'All frame processing stays in your browser.' }
  ],
  faq: [
    { title: 'Will the GIF still animate?', description: 'Yes. The resized file remains an animated GIF.' },
    { title: 'Can I change both width and height?', description: 'Yes. You can also keep the aspect ratio enabled for safer resizing.' },
    { title: 'Is the resized GIF real?', description: 'Yes. The output is a real animated GIF file generated in the browser.' }
  ]
};

const gifSpeedPageConfig: ToolPageConfig = {
  route: '/gif-speed',
  toolName: 'GIF Speed Changer',
  eyebrow: 'Real browser-based GIF speed control',
  intro: 'Speed up or slow down animated GIFs directly in your browser.',
  heroCopy: 'This tool changes GIF playback speed by rebuilding a real updated animation you can preview and download immediately.',
  privacyNote: 'Your files are processed locally in your browser. No file is uploaded to any server.',
  toolHtml: gifSpeedToolHtml(),
  howItWorks: [
    { title: '1. Load GIF', description: 'Upload an animated GIF and preview the source animation in the page.' },
    { title: '2. Adjust speed', description: 'Choose a slower or faster playback multiplier such as 0.5x, 2x, or 3x.' },
    { title: '3. Download result', description: 'The browser renders a real updated animated GIF with the new timing.' }
  ],
  features: [
    { title: 'Real timing changes', description: 'Adjusts GIF playback timing instead of faking speed labels.' },
    { title: 'Simple controls', description: 'Choose from practical speed multipliers for common use cases.' },
    { title: 'Private browser workflow', description: 'Speed changes are processed locally with no upload.' }
  ],
  faq: [
    { title: 'Can I slow a GIF down?', description: 'Yes. Choose a slower multiplier such as 0.5x.' },
    { title: 'Can I speed a GIF up?', description: 'Yes. Choose faster multipliers such as 2x or 3x.' },
    { title: 'Is the output still a GIF?', description: 'Yes. The output remains a real animated GIF file.' }
  ]
};

const gifOptimizerPageConfig: ToolPageConfig = {
  route: '/gif-optimizer',
  toolName: 'Advanced GIF Optimizer',
  eyebrow: 'Advanced browser-based GIF optimization',
  intro: 'Optimize animated GIFs with advanced manual controls for size, colors, and frame reduction.',
  heroCopy: 'This tool gives you deeper manual control over GIF output while still generating a real optimized animated GIF locally in your browser.',
  privacyNote: 'Your files are processed locally in your browser. No file is uploaded to any server.',
  toolHtml: gifToolHtml(),
  howItWorks: [
    { title: '1. Load GIF', description: 'Upload an animated GIF and inspect its preview and metadata before optimization.' },
    { title: '2. Tune settings', description: 'Adjust colors, frame reduction, target size, and scaling controls for tighter output.' },
    { title: '3. Export optimized GIF', description: 'The tool returns the smallest valid animated GIF it can produce with the chosen settings.' }
  ],
  features: [
    { title: 'Advanced controls', description: 'Fine-tune scale, frame skipping, target size, and color limits.' },
    { title: 'Real optimization', description: 'Produces a genuine optimized animated GIF rather than fake savings.' },
    { title: 'Target-aware output', description: 'Attempts to reach your target size and returns the best valid result if it cannot.' }
  ],
  faq: [
    { title: 'How is this different from the compressor?', description: 'It uses the same real compression engine but is presented as the advanced manual tuning workflow.' },
    { title: 'Will it always hit the target size?', description: 'Not always. If the target is impossible, it returns the best valid optimized GIF.' },
    { title: 'Does it stay private?', description: 'Yes. Optimization happens entirely in your browser.' }
  ]
};

const gifCropPageConfig: ToolPageConfig = {
  route: '/gif-crop',
  toolName: 'GIF Cropper',
  eyebrow: 'Real browser-based GIF cropping',
  intro: 'Crop animated GIF frames directly in your browser and export a real cropped GIF.',
  heroCopy: 'This tool applies a real crop to animated GIF frames and rebuilds a valid animated GIF output without any upload.',
  privacyNote: 'Your files are processed locally in your browser. No file is uploaded to any server.',
  toolHtml: gifCropToolHtml(),
  howItWorks: [
    { title: '1. Load GIF', description: 'Upload the animated GIF you want to crop and review the original preview.' },
    { title: '2. Set crop area', description: 'Enter the X, Y, width, and height values for the crop area you want to keep.' },
    { title: '3. Export GIF', description: 'The browser renders a real cropped animated GIF that you can preview and download.' }
  ],
  features: [
    { title: 'Real animated crop', description: 'Crops every GIF frame and keeps the output animated.' },
    { title: 'Numeric crop control', description: 'Set precise crop values for consistent frame output.' },
    { title: 'Private browser processing', description: 'All crop processing stays local in your browser.' }
  ],
  faq: [
    { title: 'Does cropping keep animation?', description: 'Yes. The cropped file remains a real animated GIF.' },
    { title: 'Can I crop from any position?', description: 'Yes. Enter the X and Y offsets along with the crop width and height.' },
    { title: 'Is the cropped GIF real?', description: 'Yes. The output is a valid animated GIF generated in the browser.' }
  ]
};

const gifSplitPageConfig: ToolPageConfig = {
  route: '/gif-split',
  toolName: 'GIF Frame Splitter',
  eyebrow: 'Real browser-based GIF frame extraction',
  intro: 'Extract animated GIF frames as PNG images directly in your browser.',
  heroCopy: 'This tool decodes GIF animation frames and exports them as real PNG images you can download individually or together as a ZIP file.',
  privacyNote: 'Your files are processed locally in your browser. No file is uploaded to any server.',
  toolHtml: gifSplitToolHtml(),
  howItWorks: [
    { title: '1. Load GIF', description: 'Upload the animated GIF you want to split into separate image frames.' },
    { title: '2. Extract frames', description: 'The browser decodes the animation and exports each frame as a real PNG image.' },
    { title: '3. Download frames', description: 'Download frames individually or as a ZIP archive for easier batch use.' }
  ],
  features: [
    { title: 'PNG frame export', description: 'Outputs real PNG frame files for each extracted frame.' },
    { title: 'ZIP download', description: 'Package all extracted frames into a ZIP archive for convenience.' },
    { title: 'Private local extraction', description: 'Frame extraction happens entirely in your browser.' }
  ],
  faq: [
    { title: 'What format are the frames?', description: 'Frames are exported as real PNG images.' },
    { title: 'Can I download all frames at once?', description: 'Yes. You can download the extracted frames as a ZIP file.' },
    { title: 'Does it upload my GIF?', description: 'No. Frame extraction runs locally in your browser.' }
  ]
};

const gifMakerPageConfig: ToolPageConfig = {
  route: '/gif-maker',
  toolName: 'GIF Maker',
  eyebrow: 'Real browser-based GIF creation',
  intro: 'Create animated GIFs from PNG and JPG images directly in your browser.',
  heroCopy: 'This tool turns multiple images into a real animated GIF with configurable frame delay and output width, all without server upload.',
  privacyNote: 'Your files are processed locally in your browser. No file is uploaded to any server.',
  toolHtml: gifMakerToolHtml(),
  howItWorks: [
    { title: '1. Add images', description: 'Upload multiple PNG or JPG images to use as GIF frames.' },
    { title: '2. Set delay and width', description: 'Choose the frame delay and output width before building the animation.' },
    { title: '3. Download GIF', description: 'The browser encodes a real animated GIF that you can preview and download.' }
  ],
  features: [
    { title: 'Multi-image GIF creation', description: 'Build animated GIFs from a sequence of uploaded images.' },
    { title: 'Frame delay control', description: 'Set the playback timing for each frame in the generated animation.' },
    { title: 'Private browser workflow', description: 'Image processing and GIF encoding stay on your device.' }
  ],
  faq: [
    { title: 'Which image formats work?', description: 'PNG and JPG/JPEG images are supported.' },
    { title: 'Can I control animation speed?', description: 'Yes. Set the frame delay in milliseconds before creating the GIF.' },
    { title: 'Is the created GIF real?', description: 'Yes. The result is a real animated GIF file encoded in your browser.' }
  ]
};

const routeConfigMap: Record<AppRoute, ToolPageConfig> = {
  '/': gifPageConfig,
  '/mp4-to-gif': mp4PageConfig,
  '/gif-to-mp4': gifToMp4PageConfig,
  '/gif-resizer': gifResizerPageConfig,
  '/gif-crop': gifCropPageConfig,
  '/gif-speed': gifSpeedPageConfig,
  '/gif-split': gifSplitPageConfig,
  '/gif-maker': gifMakerPageConfig,
  '/gif-optimizer': gifOptimizerPageConfig
};

updateSeo(route);
app.innerHTML = renderLayout(routeConfigMap[route]);

function initNavigation(): void {
  const menuToggle = document.querySelector<HTMLButtonElement>('#menu-toggle');
  const navigation = document.querySelector<HTMLElement>('#site-navigation');

  if (!menuToggle || !navigation) {
    return;
  }

  const closeMenu = (): void => {
    navigation.dataset.open = 'false';
    menuToggle.setAttribute('aria-expanded', 'false');
  };

  menuToggle.addEventListener('click', () => {
    const isOpen = navigation.dataset.open === 'true';
    navigation.dataset.open = isOpen ? 'false' : 'true';
    menuToggle.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
  });

  navigation.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 960) {
        closeMenu();
      }
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 960) {
      closeMenu();
    }
  });
}

initNavigation();

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

function initGifToMp4Tool(): void {
  const fileInput = requireElement<HTMLInputElement>('#g2m-file-input');
  const dropzone = requireElement<HTMLDivElement>('#g2m-dropzone');
  const widthInput = requireElement<HTMLInputElement>('#g2m-width');
  const fpsInput = requireElement<HTMLInputElement>('#g2m-fps');
  const convertButton = requireElement<HTMLButtonElement>('#g2m-convert-button');
  const cancelButton = requireElement<HTMLButtonElement>('#g2m-cancel-button');
  const resetButton = requireElement<HTMLButtonElement>('#g2m-reset-button');
  const originalPreview = requireElement<HTMLDivElement>('#g2m-original-preview');
  const outputPreview = requireElement<HTMLDivElement>('#g2m-output-preview');
  const originalStats = requireElement<HTMLDListElement>('#g2m-original-stats');
  const outputStats = requireElement<HTMLDListElement>('#g2m-output-stats');
  const selectionStatus = requireElement<HTMLDivElement>('#g2m-selection-status');
  const fileWarning = requireElement<HTMLDivElement>('#g2m-file-warning');
  const runtimeWarning = requireElement<HTMLDivElement>('#g2m-runtime-warning');
  const statusBox = requireElement<HTMLDivElement>('#g2m-status-box');
  const errorBox = requireElement<HTMLDivElement>('#g2m-error-box');
  const progressWrap = requireElement<HTMLDivElement>('#g2m-progress-wrap');
  const progressBar = requireElement<HTMLProgressElement>('#g2m-progress-bar');
  const resultActions = requireElement<HTMLDivElement>('#g2m-result-actions');
  const downloadButton = requireElement<HTMLAnchorElement>('#g2m-download-button');

  let selectedFile: File | null = null;
  let selectedToken = 0;
  let activeTask: GifToMp4Task | null = null;
  const memory = new MemoryManager();

  const currentSettings = () => ({ width: toNullablePositiveInteger(widthInput.value), fps: Math.max(1, Math.min(30, Number(fpsInput.value) || 15)) });
  const setUiState = (isRunning: boolean): void => {
    widthInput.disabled = isRunning;
    fpsInput.disabled = isRunning;
    convertButton.disabled = isRunning || selectedFile === null;
    cancelButton.disabled = !isRunning;
    resetButton.disabled = isRunning || selectedFile === null;
  };
  const resetOutput = (): void => {
    memory.revokeObjectUrl('output');
    outputPreview.classList.add('empty-state');
    outputPreview.textContent = 'Converted MP4 will appear here.';
    outputStats.innerHTML = '';
    resultActions.classList.add('hidden');
    downloadButton.removeAttribute('href');
    downloadButton.removeAttribute('download');
    downloadButton.setAttribute('aria-disabled', 'true');
    progressWrap.classList.add('hidden');
    progressBar.value = 0;
  };
  const resetAll = (): void => {
    activeTask?.cancel();
    activeTask = null;
    selectedFile = null;
    selectedToken += 1;
    fileInput.value = '';
    memory.revokeAll();
    originalPreview.classList.add('empty-state');
    originalPreview.textContent = 'No GIF selected yet.';
    originalStats.innerHTML = '';
    outputPreview.classList.add('empty-state');
    outputPreview.textContent = 'Converted MP4 will appear here.';
    outputStats.innerHTML = '';
    setUiState(false);
    convertButton.disabled = true;
    resetButton.disabled = true;
    setNotice(selectionStatus, '', true);
    setNotice(fileWarning, '', true);
    setNotice(statusBox, '', true);
    setNotice(errorBox, '', true);
    resultActions.classList.add('hidden');
  };
  const selectedStats = (file: File, metadata: GifFileMetadata | null): Array<[string, string]> => [
    ['File Name', file.name], ['Original Size', formatBytes(file.size)], ['Type', file.type || 'image/gif'], ['Dimensions', metadata ? `${metadata.width} x ${metadata.height}` : 'Reading GIF metadata...'], ['Frame Count', metadata ? `${metadata.frameCount}` : 'Reading GIF metadata...'], ['Status', 'GIF selected successfully']
  ];
  const applySelectedFile = (file: File): void => {
    const validationError = validateGifFile(file);
    if (validationError) {
      setNotice(errorBox, validationError, false);
      return;
    }
    selectedFile = file;
    selectedToken += 1;
    const token = selectedToken;
    resetOutput();
    setNotice(selectionStatus, 'GIF selected successfully', false);
    setNotice(statusBox, '', true);
    setNotice(errorBox, '', true);
    setNotice(fileWarning, file.size >= 8 * 1024 * 1024 ? 'Large GIF detected. Conversion may take longer on this device.' : '', file.size < 8 * 1024 * 1024);
    const previewUrl = memory.setObjectUrl('original', file);
    renderImagePreview(originalPreview, previewUrl, `Original GIF preview for ${file.name}`);
    renderStats(originalStats, selectedStats(file, null));
    setUiState(false);
    void readGifMetadata(file).then((metadata) => {
      if (!selectedFile || selectedToken !== token) return;
      renderStats(originalStats, selectedStats(file, metadata));
    });
  };
  const renderResult = (fileName: string, result: GifToMp4Result): void => {
    const outputUrl = memory.setObjectUrl('output', result.blob);
    renderVideoPreview(outputPreview, outputUrl, `Converted MP4 preview for ${fileName}`);
    renderStats(outputStats, [
      ['Original GIF size', formatBytes(result.originalBytes)],
      ['Output MP4 size', formatBytes(result.outputBytes)],
      ['Width used', result.widthUsed ? `${result.widthUsed}px` : 'Auto'],
      ['FPS used', `${result.fpsUsed}`],
      ['Status', 'MP4 created successfully']
    ]);
    downloadButton.href = outputUrl;
    downloadButton.download = `${fileName.replace(/\.gif$/i, '')}.mp4`;
    downloadButton.setAttribute('aria-disabled', 'false');
    resultActions.classList.remove('hidden');
    progressWrap.classList.remove('hidden');
    progressBar.value = 100;
    setNotice(statusBox, 'GIF to MP4 conversion complete.', false);
  };
  const handleConvert = async (): Promise<void> => {
    if (!selectedFile) return;
    setUiState(true);
    resetOutput();
    setNotice(errorBox, '', true);
    setNotice(statusBox, 'Preparing GIF for MP4 conversion...', false);
    progressWrap.classList.remove('hidden');
    try {
      activeTask = convertGifToMp4(selectedFile, currentSettings(), (progress) => {
        progressBar.value = progress.percent;
        setNotice(statusBox, `${progress.stage} - ${progress.detail}`, false);
      });
      const result = await activeTask.promise;
      renderResult(selectedFile.name, result);
    } catch (error) {
      setNotice(errorBox, error instanceof Error ? error.message : 'An unexpected GIF to MP4 error occurred.', false);
    } finally {
      activeTask = null;
      setUiState(false);
    }
  };
  const browserIssue = getBrowserSupportIssue();
  if (browserIssue) {
    dropzone.setAttribute('aria-disabled', 'true');
    fileInput.disabled = true;
    setNotice(errorBox, browserIssue, false);
  }
  dropzone.addEventListener('click', () => { if (!browserIssue) fileInput.click(); });
  dropzone.addEventListener('keydown', (event) => { if (!browserIssue && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); fileInput.click(); } });
  dropzone.addEventListener('dragover', (event) => { if (!browserIssue) { event.preventDefault(); dropzone.classList.add('drag-active'); } });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-active'));
  dropzone.addEventListener('drop', (event) => { if (!browserIssue) { event.preventDefault(); dropzone.classList.remove('drag-active'); const file = event.dataTransfer?.files?.[0]; if (file) applySelectedFile(file); } });
  fileInput.addEventListener('change', () => { const file = fileInput.files?.[0]; if (file) applySelectedFile(file); });
  convertButton.addEventListener('click', () => void handleConvert());
  cancelButton.addEventListener('click', () => { activeTask?.cancel(); activeTask = null; setUiState(false); setNotice(statusBox, 'Conversion cancelled.', false); });
  resetButton.addEventListener('click', resetAll);
  setNotice(runtimeWarning, getRuntimeProcessingWarning(), false);
}

function initGifResizerTool(): void {
  const fileInput = requireElement<HTMLInputElement>('#gr-file-input');
  const dropzone = requireElement<HTMLDivElement>('#gr-dropzone');
  const widthInput = requireElement<HTMLInputElement>('#gr-width');
  const heightInput = requireElement<HTMLInputElement>('#gr-height');
  const keepAspect = requireElement<HTMLInputElement>('#gr-keep-aspect');
  const runButton = requireElement<HTMLButtonElement>('#gr-resize-button');
  const cancelButton = requireElement<HTMLButtonElement>('#gr-cancel-button');
  const resetButton = requireElement<HTMLButtonElement>('#gr-reset-button');
  const originalPreview = requireElement<HTMLDivElement>('#gr-original-preview');
  const outputPreview = requireElement<HTMLDivElement>('#gr-output-preview');
  const originalStats = requireElement<HTMLDListElement>('#gr-original-stats');
  const outputStats = requireElement<HTMLDListElement>('#gr-output-stats');
  const selectionStatus = requireElement<HTMLDivElement>('#gr-selection-status');
  const fileWarning = requireElement<HTMLDivElement>('#gr-file-warning');
  const runtimeWarning = requireElement<HTMLDivElement>('#gr-runtime-warning');
  const statusBox = requireElement<HTMLDivElement>('#gr-status-box');
  const errorBox = requireElement<HTMLDivElement>('#gr-error-box');
  const progressWrap = requireElement<HTMLDivElement>('#gr-progress-wrap');
  const progressBar = requireElement<HTMLProgressElement>('#gr-progress-bar');
  const resultActions = requireElement<HTMLDivElement>('#gr-result-actions');
  const downloadButton = requireElement<HTMLAnchorElement>('#gr-download-button');
  let selectedFile: File | null = null;
  let activeTask: GifResizeTask | null = null;
  let token = 0;
  const memory = new MemoryManager();
  const settings = () => ({ width: toNullablePositiveInteger(widthInput.value), height: toNullablePositiveInteger(heightInput.value), keepAspectRatio: keepAspect.checked });
  const setUi = (running: boolean): void => { widthInput.disabled = running; heightInput.disabled = running || keepAspect.checked; keepAspect.disabled = running; runButton.disabled = running || selectedFile === null; cancelButton.disabled = !running; resetButton.disabled = running || selectedFile === null; };
  const resetOutput = (): void => { memory.revokeObjectUrl('output'); outputPreview.classList.add('empty-state'); outputPreview.textContent = 'Resized GIF will appear here.'; outputStats.innerHTML=''; resultActions.classList.add('hidden'); downloadButton.removeAttribute('href'); progressWrap.classList.add('hidden'); progressBar.value = 0; };
  const resetAll = (): void => { activeTask?.cancel(); activeTask=null; selectedFile=null; token +=1; fileInput.value=''; memory.revokeAll(); originalPreview.classList.add('empty-state'); originalPreview.textContent='No GIF selected yet.'; originalStats.innerHTML=''; resetOutput(); setUi(false); runButton.disabled=true; resetButton.disabled=true; setNotice(selectionStatus,'',true); setNotice(fileWarning,'',true); setNotice(statusBox,'',true); setNotice(errorBox,'',true); };
  const applyFile = (file: File): void => { const err=validateGifFile(file); if(err){setNotice(errorBox,err,false); return;} selectedFile=file; token +=1; const current=token; setNotice(selectionStatus,'GIF selected successfully',false); setNotice(errorBox,'',true); setNotice(fileWarning,file.size>=8*1024*1024?'Large GIF detected. Resizing may take longer on this device.':'',file.size<8*1024*1024); resetOutput(); renderImagePreview(originalPreview,memory.setObjectUrl('original',file),`Original GIF preview for ${file.name}`); renderStats(originalStats,[['File Name',file.name],['Original Size',formatBytes(file.size)],['Type',file.type||'image/gif'],['Status','GIF selected successfully'],['Dimensions','Reading GIF metadata...']]); setUi(false); void readGifMetadata(file).then((metadata)=>{ if(!selectedFile||token!==current)return; renderStats(originalStats,[['File Name',file.name],['Original Size',formatBytes(file.size)],['Type',file.type||'image/gif'],['Status','GIF selected successfully'],['Dimensions',metadata?`${metadata.width} x ${metadata.height}`:'Unknown']]); }); };
  const browserIssue=getBrowserSupportIssue(); if(browserIssue){ dropzone.setAttribute('aria-disabled','true'); fileInput.disabled=true; setNotice(errorBox,browserIssue,false);} dropzone.addEventListener('click',()=>{if(!browserIssue)fileInput.click();}); dropzone.addEventListener('keydown',(e)=>{if(!browserIssue&&(e.key==='Enter'||e.key===' ')){e.preventDefault();fileInput.click();}}); dropzone.addEventListener('dragover',(e)=>{if(!browserIssue){e.preventDefault();dropzone.classList.add('drag-active');}}); dropzone.addEventListener('dragleave',()=>dropzone.classList.remove('drag-active')); dropzone.addEventListener('drop',(e)=>{if(!browserIssue){e.preventDefault();dropzone.classList.remove('drag-active'); const f=e.dataTransfer?.files?.[0]; if(f)applyFile(f);}}); fileInput.addEventListener('change',()=>{const f=fileInput.files?.[0]; if(f)applyFile(f);}); keepAspect.addEventListener('change',()=>{ heightInput.disabled=keepAspect.checked;}); runButton.addEventListener('click',()=>void (async()=>{ if(!selectedFile)return; setUi(true); resetOutput(); setNotice(statusBox,'Preparing GIF resize...',false); progressWrap.classList.remove('hidden'); try{ activeTask=resizeGif(selectedFile,settings(),(p)=>{progressBar.value=p.percent; setNotice(statusBox,`${p.stage} - ${p.detail}`,false);}); const result=await activeTask.promise; renderImagePreview(outputPreview,memory.setObjectUrl('output',result.blob),`Resized GIF preview for ${selectedFile.name}`); renderStats(outputStats,[['Original GIF size',formatBytes(result.originalBytes)],['Output GIF size',formatBytes(result.outputBytes)],['Width used',`${result.widthUsed||'Auto'}`],['Height used',`${result.heightUsed||'Auto'}`],['Status','GIF resized successfully']]); downloadButton.href=memory.setObjectUrl('download-output',result.blob); downloadButton.download=`${selectedFile.name.replace(/\.gif$/i,'')}-resized.gif`; resultActions.classList.remove('hidden'); progressBar.value=100; }catch(error){ setNotice(errorBox,error instanceof Error?error.message:'An unexpected GIF resize error occurred.',false);} finally{ activeTask=null; setUi(false);} })());
  cancelButton.addEventListener('click',()=>{activeTask?.cancel(); activeTask=null; setUi(false); setNotice(statusBox,'Resize cancelled.',false);}); resetButton.addEventListener('click',resetAll); setNotice(runtimeWarning,getRuntimeProcessingWarning(),false);
}

function initGifSpeedTool(): void {
  const fileInput = requireElement<HTMLInputElement>('#gs-file-input');
  const dropzone = requireElement<HTMLDivElement>('#gs-dropzone');
  const speedSelect = requireElement<HTMLSelectElement>('#gs-speed');
  const runButton = requireElement<HTMLButtonElement>('#gs-run-button');
  const cancelButton = requireElement<HTMLButtonElement>('#gs-cancel-button');
  const resetButton = requireElement<HTMLButtonElement>('#gs-reset-button');
  const originalPreview = requireElement<HTMLDivElement>('#gs-original-preview');
  const outputPreview = requireElement<HTMLDivElement>('#gs-output-preview');
  const originalStats = requireElement<HTMLDListElement>('#gs-original-stats');
  const outputStats = requireElement<HTMLDListElement>('#gs-output-stats');
  const selectionStatus = requireElement<HTMLDivElement>('#gs-selection-status');
  const fileWarning = requireElement<HTMLDivElement>('#gs-file-warning');
  const runtimeWarning = requireElement<HTMLDivElement>('#gs-runtime-warning');
  const statusBox = requireElement<HTMLDivElement>('#gs-status-box');
  const errorBox = requireElement<HTMLDivElement>('#gs-error-box');
  const progressWrap = requireElement<HTMLDivElement>('#gs-progress-wrap');
  const progressBar = requireElement<HTMLProgressElement>('#gs-progress-bar');
  const resultActions = requireElement<HTMLDivElement>('#gs-result-actions');
  const downloadButton = requireElement<HTMLAnchorElement>('#gs-download-button');
  let selectedFile: File | null = null;
  let activeTask: GifSpeedTask | null = null;
  const memory = new MemoryManager();
  const setUi = (running: boolean): void => { speedSelect.disabled = running; runButton.disabled = running || selectedFile===null; cancelButton.disabled = !running; resetButton.disabled = running || selectedFile===null; };
  const resetOutput = (): void => { memory.revokeObjectUrl('output'); outputPreview.classList.add('empty-state'); outputPreview.textContent='Updated GIF will appear here.'; outputStats.innerHTML=''; resultActions.classList.add('hidden'); downloadButton.removeAttribute('href'); progressWrap.classList.add('hidden'); progressBar.value=0; };
  const resetAll = (): void => { activeTask?.cancel(); activeTask=null; selectedFile=null; fileInput.value=''; memory.revokeAll(); originalPreview.classList.add('empty-state'); originalPreview.textContent='No GIF selected yet.'; originalStats.innerHTML=''; resetOutput(); setUi(false); runButton.disabled=true; resetButton.disabled=true; setNotice(selectionStatus,'',true); setNotice(fileWarning,'',true); setNotice(statusBox,'',true); setNotice(errorBox,'',true); };
  const applyFile = (file: File): void => { const err=validateGifFile(file); if(err){setNotice(errorBox,err,false); return;} selectedFile=file; setNotice(selectionStatus,'GIF selected successfully',false); setNotice(errorBox,'',true); setNotice(fileWarning,file.size>=8*1024*1024?'Large GIF detected. Speed changes may take longer on this device.':'',file.size<8*1024*1024); resetOutput(); renderImagePreview(originalPreview,memory.setObjectUrl('original',file),`Original GIF preview for ${file.name}`); renderStats(originalStats,[['File Name',file.name],['Original Size',formatBytes(file.size)],['Type',file.type||'image/gif'],['Status','GIF selected successfully']]); setUi(false); };
  const browserIssue=getBrowserSupportIssue(); if(browserIssue){ dropzone.setAttribute('aria-disabled','true'); fileInput.disabled=true; setNotice(errorBox,browserIssue,false);} dropzone.addEventListener('click',()=>{if(!browserIssue)fileInput.click();}); dropzone.addEventListener('keydown',(e)=>{if(!browserIssue&&(e.key==='Enter'||e.key===' ')){e.preventDefault();fileInput.click();}}); dropzone.addEventListener('dragover',(e)=>{if(!browserIssue){e.preventDefault();dropzone.classList.add('drag-active');}}); dropzone.addEventListener('dragleave',()=>dropzone.classList.remove('drag-active')); dropzone.addEventListener('drop',(e)=>{if(!browserIssue){e.preventDefault();dropzone.classList.remove('drag-active'); const f=e.dataTransfer?.files?.[0]; if(f)applyFile(f);}}); fileInput.addEventListener('change',()=>{const f=fileInput.files?.[0]; if(f)applyFile(f);}); runButton.addEventListener('click',()=>void (async()=>{ if(!selectedFile)return; setUi(true); resetOutput(); setNotice(statusBox,'Preparing GIF speed update...',false); progressWrap.classList.remove('hidden'); try{ activeTask=changeGifSpeed(selectedFile,{speed:Number(speedSelect.value)},(p)=>{progressBar.value=p.percent; setNotice(statusBox,`${p.stage} - ${p.detail}`,false);}); const result=await activeTask.promise; renderImagePreview(outputPreview,memory.setObjectUrl('output',result.blob),`Updated GIF preview for ${selectedFile.name}`); renderStats(outputStats,[['Original GIF size',formatBytes(result.originalBytes)],['Output GIF size',formatBytes(result.outputBytes)],['Speed used',`${result.speedUsed}x`],['Status','GIF speed updated successfully']]); downloadButton.href=memory.setObjectUrl('download-output',result.blob); downloadButton.download=`${selectedFile.name.replace(/\.gif$/i,'')}-speed.gif`; resultActions.classList.remove('hidden'); progressBar.value=100; }catch(error){ setNotice(errorBox,error instanceof Error?error.message:'An unexpected GIF speed error occurred.',false);} finally{ activeTask=null; setUi(false);} })());
  cancelButton.addEventListener('click',()=>{activeTask?.cancel(); activeTask=null; setUi(false); setNotice(statusBox,'Speed update cancelled.',false);}); resetButton.addEventListener('click',resetAll); setNotice(runtimeWarning,getRuntimeProcessingWarning(),false);
}

function initGifCropTool(): void {
  const fileInput = requireElement<HTMLInputElement>('#gc-file-input');
  const dropzone = requireElement<HTMLDivElement>('#gc-dropzone');
  const xInput = requireElement<HTMLInputElement>('#gc-x');
  const yInput = requireElement<HTMLInputElement>('#gc-y');
  const widthInput = requireElement<HTMLInputElement>('#gc-width');
  const heightInput = requireElement<HTMLInputElement>('#gc-height');
  const runButton = requireElement<HTMLButtonElement>('#gc-run-button');
  const cancelButton = requireElement<HTMLButtonElement>('#gc-cancel-button');
  const resetButton = requireElement<HTMLButtonElement>('#gc-reset-button');
  const originalPreview = requireElement<HTMLDivElement>('#gc-original-preview');
  const outputPreview = requireElement<HTMLDivElement>('#gc-output-preview');
  const originalStats = requireElement<HTMLDListElement>('#gc-original-stats');
  const outputStats = requireElement<HTMLDListElement>('#gc-output-stats');
  const selectionStatus = requireElement<HTMLDivElement>('#gc-selection-status');
  const fileWarning = requireElement<HTMLDivElement>('#gc-file-warning');
  const runtimeWarning = requireElement<HTMLDivElement>('#gc-runtime-warning');
  const statusBox = requireElement<HTMLDivElement>('#gc-status-box');
  const errorBox = requireElement<HTMLDivElement>('#gc-error-box');
  const progressWrap = requireElement<HTMLDivElement>('#gc-progress-wrap');
  const progressBar = requireElement<HTMLProgressElement>('#gc-progress-bar');
  const resultActions = requireElement<HTMLDivElement>('#gc-result-actions');
  const downloadButton = requireElement<HTMLAnchorElement>('#gc-download-button');
  let selectedFile: File | null = null;
  let activeTask: GifCropTask | null = null;
  let token = 0;
  const memory = new MemoryManager();
  const settings = () => ({ x: Math.max(0, Number(xInput.value) || 0), y: Math.max(0, Number(yInput.value) || 0), width: Math.max(1, Number(widthInput.value) || 1), height: Math.max(1, Number(heightInput.value) || 1) });
  const setUi = (running: boolean): void => { xInput.disabled = running; yInput.disabled = running; widthInput.disabled = running; heightInput.disabled = running; runButton.disabled = running || selectedFile===null; cancelButton.disabled = !running; resetButton.disabled = running || selectedFile===null; };
  const resetOutput = (): void => { memory.revokeObjectUrl('output'); outputPreview.classList.add('empty-state'); outputPreview.textContent='Cropped GIF will appear here.'; outputStats.innerHTML=''; resultActions.classList.add('hidden'); downloadButton.removeAttribute('href'); progressWrap.classList.add('hidden'); progressBar.value=0; };
  const resetAll = (): void => { activeTask?.cancel(); activeTask=null; selectedFile=null; token+=1; fileInput.value=''; memory.revokeAll(); originalPreview.classList.add('empty-state'); originalPreview.textContent='No GIF selected yet.'; originalStats.innerHTML=''; resetOutput(); setUi(false); runButton.disabled=true; resetButton.disabled=true; setNotice(selectionStatus,'',true); setNotice(fileWarning,'',true); setNotice(statusBox,'',true); setNotice(errorBox,'',true); };
  const applyFile = (file: File): void => { const err=validateGifFile(file); if(err){setNotice(errorBox,err,false);return;} selectedFile=file; token+=1; const current=token; setNotice(selectionStatus,'GIF selected successfully',false); setNotice(errorBox,'',true); setNotice(fileWarning,file.size>=8*1024*1024?'Large GIF detected. Cropping may take longer on this device.':'',file.size<8*1024*1024); resetOutput(); renderImagePreview(originalPreview,memory.setObjectUrl('original',file),`Original GIF preview for ${file.name}`); renderStats(originalStats,[['File Name',file.name],['Original Size',formatBytes(file.size)],['Type',file.type||'image/gif'],['Status','GIF selected successfully'],['Dimensions','Reading GIF metadata...']]); setUi(false); void readGifMetadata(file).then((metadata)=>{ if(!selectedFile||token!==current)return; renderStats(originalStats,[['File Name',file.name],['Original Size',formatBytes(file.size)],['Type',file.type||'image/gif'],['Status','GIF selected successfully'],['Dimensions',metadata?`${metadata.width} x ${metadata.height}`:'Unknown']]); }); };
  const browserIssue=getBrowserSupportIssue(); if(browserIssue){dropzone.setAttribute('aria-disabled','true');fileInput.disabled=true;setNotice(errorBox,browserIssue,false);} dropzone.addEventListener('click',()=>{if(!browserIssue)fileInput.click();}); dropzone.addEventListener('keydown',(e)=>{if(!browserIssue&&(e.key==='Enter'||e.key===' ')){e.preventDefault();fileInput.click();}}); dropzone.addEventListener('dragover',(e)=>{if(!browserIssue){e.preventDefault();dropzone.classList.add('drag-active');}}); dropzone.addEventListener('dragleave',()=>dropzone.classList.remove('drag-active')); dropzone.addEventListener('drop',(e)=>{if(!browserIssue){e.preventDefault();dropzone.classList.remove('drag-active'); const f=e.dataTransfer?.files?.[0]; if(f)applyFile(f);}}); fileInput.addEventListener('change',()=>{const f=fileInput.files?.[0]; if(f)applyFile(f);}); runButton.addEventListener('click',()=>void (async()=>{ if(!selectedFile)return; setUi(true); resetOutput(); setNotice(statusBox,'Preparing GIF crop...',false); progressWrap.classList.remove('hidden'); try{ activeTask=cropGif(selectedFile,settings(),(p)=>{progressBar.value=p.percent; setNotice(statusBox,`${p.stage} - ${p.detail}`,false);}); const result=await activeTask.promise; renderImagePreview(outputPreview,memory.setObjectUrl('output',result.blob),`Cropped GIF preview for ${selectedFile.name}`); renderStats(outputStats,[['Original GIF size',formatBytes(result.originalBytes)],['Output GIF size',formatBytes(result.outputBytes)],['Width used',`${result.widthUsed}px`],['Height used',`${result.heightUsed}px`],['Status','GIF cropped successfully']]); downloadButton.href=memory.setObjectUrl('download-output',result.blob); downloadButton.download=`${selectedFile.name.replace(/\.gif$/i,'')}-cropped.gif`; resultActions.classList.remove('hidden'); progressBar.value=100; }catch(error){ setNotice(errorBox,error instanceof Error?error.message:'An unexpected GIF crop error occurred.',false);} finally{ activeTask=null; setUi(false);} })()); cancelButton.addEventListener('click',()=>{activeTask?.cancel(); activeTask=null; setUi(false); setNotice(statusBox,'Crop cancelled.',false);}); resetButton.addEventListener('click',resetAll); setNotice(runtimeWarning,getRuntimeProcessingWarning(),false);
}

function initGifSplitTool(): void {
  const fileInput = requireElement<HTMLInputElement>('#gsp-file-input');
  const dropzone = requireElement<HTMLDivElement>('#gsp-dropzone');
  const runButton = requireElement<HTMLButtonElement>('#gsp-run-button');
  const cancelButton = requireElement<HTMLButtonElement>('#gsp-cancel-button');
  const resetButton = requireElement<HTMLButtonElement>('#gsp-reset-button');
  const originalPreview = requireElement<HTMLDivElement>('#gsp-original-preview');
  const outputPreview = requireElement<HTMLDivElement>('#gsp-output-preview');
  const originalStats = requireElement<HTMLDListElement>('#gsp-original-stats');
  const outputStats = requireElement<HTMLDListElement>('#gsp-output-stats');
  const selectionStatus = requireElement<HTMLDivElement>('#gsp-selection-status');
  const fileWarning = requireElement<HTMLDivElement>('#gsp-file-warning');
  const runtimeWarning = requireElement<HTMLDivElement>('#gsp-runtime-warning');
  const statusBox = requireElement<HTMLDivElement>('#gsp-status-box');
  const errorBox = requireElement<HTMLDivElement>('#gsp-error-box');
  const progressWrap = requireElement<HTMLDivElement>('#gsp-progress-wrap');
  const progressBar = requireElement<HTMLProgressElement>('#gsp-progress-bar');
  const resultActions = requireElement<HTMLDivElement>('#gsp-result-actions');
  const zipButton = requireElement<HTMLAnchorElement>('#gsp-download-zip-button');
  const frameLinks = requireElement<HTMLDivElement>('#gsp-frame-links');
  let selectedFile: File | null = null;
  let activeTask: import('./types').GifSplitTask | null = null;
  let token = 0;
  const memory = new MemoryManager();
  const setUi = (running: boolean): void => { runButton.disabled = running || selectedFile===null; cancelButton.disabled = !running; resetButton.disabled = running || selectedFile===null; };
  const resetOutput = (): void => { frameLinks.innerHTML=''; outputPreview.classList.add('empty-state'); outputPreview.textContent='Extracted frame preview will appear here.'; outputStats.innerHTML=''; resultActions.classList.add('hidden'); zipButton.removeAttribute('href'); progressWrap.classList.add('hidden'); progressBar.value=0; memory.revokeObjectUrl('zip'); for (let i=0;i<500;i+=1){ memory.revokeObjectUrl(`frame-${i}`);} };
  const resetAll = (): void => { activeTask?.cancel(); activeTask=null; selectedFile=null; token+=1; fileInput.value=''; memory.revokeAll(); originalPreview.classList.add('empty-state'); originalPreview.textContent='No GIF selected yet.'; originalStats.innerHTML=''; resetOutput(); setUi(false); runButton.disabled=true; resetButton.disabled=true; setNotice(selectionStatus,'',true); setNotice(fileWarning,'',true); setNotice(statusBox,'',true); setNotice(errorBox,'',true); };
  const applyFile=(file: File): void => { const err=validateGifFile(file); if(err){setNotice(errorBox,err,false); return;} selectedFile=file; token+=1; const current=token; setNotice(selectionStatus,'GIF selected successfully',false); setNotice(errorBox,'',true); setNotice(fileWarning,file.size>=8*1024*1024?'Large GIF detected. Frame extraction may take longer on this device.':'',file.size<8*1024*1024); resetOutput(); renderImagePreview(originalPreview,memory.setObjectUrl('original',file),`Original GIF preview for ${file.name}`); renderStats(originalStats,[['File Name',file.name],['Original Size',formatBytes(file.size)],['Type',file.type||'image/gif'],['Status','GIF selected successfully'],['Frame Count','Reading GIF metadata...']]); setUi(false); void readGifMetadata(file).then((metadata)=>{ if(!selectedFile||token!==current)return; renderStats(originalStats,[['File Name',file.name],['Original Size',formatBytes(file.size)],['Type',file.type||'image/gif'],['Status','GIF selected successfully'],['Frame Count',metadata?`${metadata.frameCount}`:'Unknown']]);}); };
  const browserIssue=getBrowserSupportIssue(); if(browserIssue){dropzone.setAttribute('aria-disabled','true');fileInput.disabled=true;setNotice(errorBox,browserIssue,false);} dropzone.addEventListener('click',()=>{if(!browserIssue)fileInput.click();}); dropzone.addEventListener('keydown',(e)=>{if(!browserIssue&&(e.key==='Enter'||e.key===' ')){e.preventDefault();fileInput.click();}}); dropzone.addEventListener('dragover',(e)=>{if(!browserIssue){e.preventDefault();dropzone.classList.add('drag-active');}}); dropzone.addEventListener('dragleave',()=>dropzone.classList.remove('drag-active')); dropzone.addEventListener('drop',(e)=>{if(!browserIssue){e.preventDefault();dropzone.classList.remove('drag-active'); const f=e.dataTransfer?.files?.[0]; if(f)applyFile(f);}}); fileInput.addEventListener('change',()=>{const f=fileInput.files?.[0]; if(f)applyFile(f);}); runButton.addEventListener('click',()=>void (async()=>{ if(!selectedFile)return; setUi(true); resetOutput(); setNotice(statusBox,'Preparing GIF frame extraction...',false); progressWrap.classList.remove('hidden'); try{ activeTask=splitGifFrames(selectedFile,(p)=>{progressBar.value=p.percent; setNotice(statusBox,`${p.stage} - ${p.detail}`,false);}); const result=await activeTask.promise; if(result.frames.length>0){ const firstBytes=Uint8Array.from(result.frames[0].bytes); const firstBlob=new Blob([firstBytes],{type:'image/png'}); renderImagePreview(outputPreview,memory.setObjectUrl('frame-preview',firstBlob),`Extracted frame preview for ${selectedFile.name}`);} renderStats(outputStats,[['Frames extracted',`${result.frames.length}`],['Format','PNG images'],['Status','Frames extracted successfully']]); const zip=new JSZip(); result.frames.forEach((frame)=>{ const safeBytes=Uint8Array.from(frame.bytes); zip.file(frame.name, safeBytes); const blob=new Blob([safeBytes],{type:'image/png'}); const url=memory.setObjectUrl(frame.name, blob); const link=document.createElement('a'); link.href=url; link.download=frame.name; link.className='secondary-button'; link.textContent=frame.name; frameLinks.appendChild(link); }); const zipBlob=await zip.generateAsync({type:'blob'}); zipButton.href=memory.setObjectUrl('zip',zipBlob); zipButton.download=`${selectedFile.name.replace(/\.gif$/i,'')}-frames.zip`; resultActions.classList.remove('hidden'); progressBar.value=100; }catch(error){ setNotice(errorBox,error instanceof Error?error.message:'An unexpected GIF split error occurred.',false);} finally{ activeTask=null; setUi(false);} })()); cancelButton.addEventListener('click',()=>{activeTask?.cancel(); activeTask=null; setUi(false); setNotice(statusBox,'Frame extraction cancelled.',false);}); resetButton.addEventListener('click',resetAll); setNotice(runtimeWarning,getRuntimeProcessingWarning(),false);
}

function initGifMakerTool(): void {
  const fileInput = requireElement<HTMLInputElement>('#gm-file-input');
  const dropzone = requireElement<HTMLDivElement>('#gm-dropzone');
  const delayInput = requireElement<HTMLInputElement>('#gm-delay');
  const widthInput = requireElement<HTMLInputElement>('#gm-width');
  const runButton = requireElement<HTMLButtonElement>('#gm-run-button');
  const cancelButton = requireElement<HTMLButtonElement>('#gm-cancel-button');
  const resetButton = requireElement<HTMLButtonElement>('#gm-reset-button');
  const imageList = requireElement<HTMLDivElement>('#gm-image-list');
  const originalStats = requireElement<HTMLDListElement>('#gm-original-stats');
  const outputPreview = requireElement<HTMLDivElement>('#gm-output-preview');
  const outputStats = requireElement<HTMLDListElement>('#gm-output-stats');
  const selectionStatus = requireElement<HTMLDivElement>('#gm-selection-status');
  const fileWarning = requireElement<HTMLDivElement>('#gm-file-warning');
  const runtimeWarning = requireElement<HTMLDivElement>('#gm-runtime-warning');
  const statusBox = requireElement<HTMLDivElement>('#gm-status-box');
  const errorBox = requireElement<HTMLDivElement>('#gm-error-box');
  const progressWrap = requireElement<HTMLDivElement>('#gm-progress-wrap');
  const progressBar = requireElement<HTMLProgressElement>('#gm-progress-bar');
  const resultActions = requireElement<HTMLDivElement>('#gm-result-actions');
  const downloadButton = requireElement<HTMLAnchorElement>('#gm-download-button');
  let images: GifMakerImageInput[] = [];
  let activeTask: GifMakerTask | null = null;
  const memory = new MemoryManager();
  const setUi = (running: boolean): void => { delayInput.disabled=running; widthInput.disabled=running; runButton.disabled=running||images.length===0; cancelButton.disabled=!running; resetButton.disabled=running||images.length===0; };
  const resetOutput = (): void => { memory.revokeObjectUrl('output'); outputPreview.classList.add('empty-state'); outputPreview.textContent='Created GIF will appear here.'; outputStats.innerHTML=''; resultActions.classList.add('hidden'); downloadButton.removeAttribute('href'); progressWrap.classList.add('hidden'); progressBar.value=0; };
  const renderImageList = (): void => { imageList.innerHTML=''; images.forEach((image,index)=>{ const row=document.createElement('div'); row.className='stat-item'; row.innerHTML=`<dt>${image.fileName}</dt><dd><button type="button" class="secondary-button" data-dir="up">Up</button> <button type="button" class="secondary-button" data-dir="down">Down</button></dd>`; const up=row.querySelector<HTMLButtonElement>('[data-dir="up"]'); const down=row.querySelector<HTMLButtonElement>('[data-dir="down"]'); up?.addEventListener('click',()=>{ if(index>0){ const [item]=images.splice(index,1); images.splice(index-1,0,item); renderImageList(); }}); down?.addEventListener('click',()=>{ if(index<images.length-1){ const [item]=images.splice(index,1); images.splice(index+1,0,item); renderImageList(); }}); imageList.appendChild(row); }); renderStats(originalStats,[['Images selected',`${images.length}`],['Frame delay',`${Math.max(20, Number(delayInput.value)||200)} ms`],['Output width',`${toNullablePositiveInteger(widthInput.value) ?? 480}px`]]); };
  const resetAll = (): void => { activeTask?.cancel(); activeTask=null; images=[]; fileInput.value=''; memory.revokeAll(); imageList.innerHTML=''; originalStats.innerHTML=''; resetOutput(); setUi(false); runButton.disabled=true; resetButton.disabled=true; setNotice(selectionStatus,'',true); setNotice(fileWarning,'',true); setNotice(statusBox,'',true); setNotice(errorBox,'',true); };
  const applyFiles = async (files: FileList | File[]): Promise<void> => { const fileArray=Array.from(files); const valid=fileArray.filter((file)=>/\.(png|jpg|jpeg)$/i.test(file.name) || /image\/(png|jpeg)/.test(file.type)); if(valid.length===0){ setNotice(errorBox,'Please choose valid PNG or JPG image files.',false); return;} images = await Promise.all(valid.map(async (file)=>({ fileName:file.name, bytes: await file.arrayBuffer() }))); setNotice(selectionStatus,`${images.length} image${images.length===1?'':'s'} selected successfully`,false); setNotice(errorBox,'',true); setNotice(fileWarning,images.length>20?'Large image set detected. GIF creation may take longer on this device.':'',images.length<=20); resetOutput(); renderImageList(); setUi(false); };
  const browserIssue=getBrowserSupportIssue(); if(browserIssue){dropzone.setAttribute('aria-disabled','true'); fileInput.disabled=true; setNotice(errorBox,browserIssue,false);} dropzone.addEventListener('click',()=>{if(!browserIssue)fileInput.click();}); dropzone.addEventListener('keydown',(e)=>{if(!browserIssue&&(e.key==='Enter'||e.key===' ')){e.preventDefault();fileInput.click();}}); dropzone.addEventListener('dragover',(e)=>{if(!browserIssue){e.preventDefault();dropzone.classList.add('drag-active');}}); dropzone.addEventListener('dragleave',()=>dropzone.classList.remove('drag-active')); dropzone.addEventListener('drop',(e)=>{if(!browserIssue){e.preventDefault();dropzone.classList.remove('drag-active'); if(e.dataTransfer?.files) void applyFiles(e.dataTransfer.files);}}); fileInput.addEventListener('change',()=>{ if(fileInput.files) void applyFiles(fileInput.files);}); runButton.addEventListener('click',()=>void (async()=>{ if(images.length===0)return; setUi(true); resetOutput(); setNotice(statusBox,'Preparing GIF creation...',false); progressWrap.classList.remove('hidden'); try{ activeTask=makeGif(images,{ frameDelayMs: Math.max(20, Number(delayInput.value)||200), width: toNullablePositiveInteger(widthInput.value) },(p)=>{ progressBar.value=p.percent; setNotice(statusBox,`${p.stage} - ${p.detail}`,false);}); const result=await activeTask.promise; renderImagePreview(outputPreview,memory.setObjectUrl('output',result.blob),`Created GIF preview`); renderStats(outputStats,[['Output GIF size',formatBytes(result.outputBytes)],['Frames used',`${result.frameCount}`],['Width used',`${result.widthUsed}px`],['Height used',`${result.heightUsed}px`],['Status','GIF created successfully']]); downloadButton.href=memory.setObjectUrl('download-output',result.blob); downloadButton.download='created.gif'; resultActions.classList.remove('hidden'); progressBar.value=100; }catch(error){ setNotice(errorBox,error instanceof Error?error.message:'An unexpected GIF creation error occurred.',false);} finally{ activeTask=null; setUi(false);} })()); cancelButton.addEventListener('click',()=>{activeTask?.cancel(); activeTask=null; setUi(false); setNotice(statusBox,'GIF creation cancelled.',false);}); resetButton.addEventListener('click',resetAll); delayInput.addEventListener('input',renderImageList); widthInput.addEventListener('input',renderImageList); setNotice(runtimeWarning,getRuntimeProcessingWarning(),false);
}

if (route === '/') {
  initGifTool();
} else if (route === '/mp4-to-gif') {
  initMp4Tool();
} else if (route === '/gif-to-mp4') {
  initGifToMp4Tool();
} else if (route === '/gif-resizer') {
  initGifResizerTool();
} else if (route === '/gif-speed') {
  initGifSpeedTool();
} else if (route === '/gif-crop') {
  initGifCropTool();
} else if (route === '/gif-split') {
  initGifSplitTool();
} else if (route === '/gif-maker') {
  initGifMakerTool();
} else if (route === '/gif-optimizer') {
  initGifTool();
}
