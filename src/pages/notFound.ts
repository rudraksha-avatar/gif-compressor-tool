export const notFoundPageHtml = `
  <div class="not-found-section">
    <div class="not-found-icon">
      <i class="fa-regular fa-file-circle-question" aria-hidden="true"></i>
    </div>
    <h2 class="not-found-title">Page not found</h2>
    <p class="not-found-description">
      The page you are looking for may have moved, been removed, or never existed.
      Try the tools directory or open one of the common GIF utilities below.
    </p>
    <div class="not-found-actions">
      <a class="btn btn-primary primary-button" href="/">
        <i class="fa-solid fa-house" aria-hidden="true"></i>
        <span>Go Home</span>
      </a>
      <a class="btn btn-secondary secondary-button" href="/tools">
        <i class="fa-solid fa-toolbox" aria-hidden="true"></i>
        <span>View Tools</span>
      </a>
    </div>
    <div class="not-found-suggestions" aria-label="Suggested tools">
      <a href="/">GIF Compressor</a>
      <a href="/mp4-to-gif">MP4 to GIF</a>
      <a href="/gif-resizer">GIF Resizer</a>
      <a href="/gif-optimizer">GIF Optimizer</a>
    </div>
  </div>
`;
