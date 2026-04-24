export interface ToolPageConfig {
  route: '/' | '/mp4-to-gif';
  toolName: string;
  eyebrow: string;
  intro: string;
  heroCopy: string;
  privacyNote: string;
  toolHtml: string;
  howItWorks: Array<{ title: string; description: string }>;
  features: Array<{ title: string; description: string }>;
  faq: Array<{ title: string; description: string }>;
}

function renderCards(items: Array<{ title: string; description: string }>): string {
  return items
    .map(
      (item) => `
        <article>
          <h3>${item.title}</h3>
          <p>${item.description}</p>
        </article>
      `
    )
    .join('');
}

export function renderLayout(config: ToolPageConfig): string {
  const isGifRoute = config.route === '/';

  return `
    <div class="site-shell">
      <header class="site-header">
        <div class="container topbar">
          <a class="brand" href="/" aria-label="GIF Tools home">
            <span class="brand-mark" aria-hidden="true"><i class="fa-solid fa-photo-film"></i></span>
            <span>GIF Tools</span>
          </a>
          <button
            class="menu-toggle"
            id="menu-toggle"
            type="button"
            aria-expanded="false"
            aria-controls="site-navigation"
            aria-label="Toggle navigation menu"
          >
            <i class="fa-solid fa-bars" aria-hidden="true"></i>
            <span>Menu</span>
          </button>
          <nav class="topnav" id="site-navigation" aria-label="Primary navigation" data-open="false">
            <a href="/"${isGifRoute ? ' aria-current="page"' : ''}><i class="fa-regular fa-file-image" aria-hidden="true"></i><span>GIF Compressor</span></a>
            <a href="/mp4-to-gif"${!isGifRoute ? ' aria-current="page"' : ''}><i class="fa-solid fa-film" aria-hidden="true"></i><span>MP4 to GIF</span></a>
            <a href="#how-it-works"><i class="fa-solid fa-gears" aria-hidden="true"></i><span>How it Works</span></a>
            <a href="#privacy"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i><span>Privacy</span></a>
            <a href="#faq"><i class="fa-regular fa-circle-question" aria-hidden="true"></i><span>FAQ</span></a>
          </nav>
        </div>
      </header>

      <main>
        <section class="hero-section">
          <div class="container hero-grid">
            <div>
              <p class="eyebrow">${config.eyebrow}</p>
              <h1>${config.toolName}</h1>
              <p class="intro">${config.intro}</p>
              <p class="hero-copy">${config.heroCopy}</p>
              <p class="hero-local-note"><i class="fa-solid fa-lock" aria-hidden="true"></i><span>${config.privacyNote}</span></p>
              <div class="hero-actions">
                <a class="primary-button" href="#tool"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i><span>Open Tool</span></a>
                <a class="secondary-button" href="#how-it-works"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>Learn How It Works</span></a>
              </div>
            </div>
            <div class="hero-note panel">
              <h2><i class="fa-solid fa-list-check" aria-hidden="true"></i> What this tool does</h2>
              <ul class="plain-list">
                <li>Runs fully in your browser</li>
                <li>Processes media without server upload</li>
                <li>Outputs a real animated GIF file</li>
                <li>Uses worker-based processing to keep the page responsive</li>
              </ul>
            </div>
          </div>
        </section>

        <section id="tool" class="container main-layout" aria-label="Tool interface">
          ${config.toolHtml}
        </section>

        <section id="how-it-works" class="container content-section panel">
          <h2><i class="fa-solid fa-gears" aria-hidden="true"></i> How it works</h2>
          <div class="content-grid">
            ${renderCards(config.howItWorks)}
          </div>
        </section>

        <section class="container content-section panel">
          <h2><i class="fa-solid fa-layer-group" aria-hidden="true"></i> Features</h2>
          <div class="content-grid">
            ${renderCards(config.features)}
          </div>
        </section>

        <section id="privacy" class="container content-section panel">
          <h2><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Privacy</h2>
          <p>${config.privacyNote}</p>
        </section>

        <section id="faq" class="container content-section panel">
          <h2><i class="fa-regular fa-circle-question" aria-hidden="true"></i> FAQ</h2>
          <div class="faq-list">
            ${renderCards(config.faq)}
          </div>
        </section>
      </main>

      <footer class="site-footer">
        <div class="container footer-row">
          <div class="footer-grid">
            <div class="footer-block">
              <h2><i class="fa-solid fa-photo-film" aria-hidden="true"></i> GIF Tools</h2>
              <p>Private browser-based tools for compressing GIFs and converting MP4 video into animated GIF output.</p>
            </div>
            <div class="footer-block">
              <h2><i class="fa-solid fa-link" aria-hidden="true"></i> Quick Links</h2>
              <nav class="footer-links" aria-label="Footer quick links">
                <a href="/"><i class="fa-regular fa-file-image" aria-hidden="true"></i><span>GIF Compressor</span></a>
                <a href="/mp4-to-gif"><i class="fa-solid fa-film" aria-hidden="true"></i><span>MP4 to GIF</span></a>
                <a href="#privacy"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i><span>Privacy</span></a>
                <a href="#faq"><i class="fa-regular fa-circle-question" aria-hidden="true"></i><span>FAQ</span></a>
              </nav>
            </div>
            <div class="footer-block">
              <h2><i class="fa-solid fa-user-shield" aria-hidden="true"></i> Local Processing</h2>
              <p>Your file is processed locally in your browser. No file is uploaded to any server.</p>
            </div>
          </div>
          <p class="footer-credit">
            Made with love by
            <a href="https://www.itisuniqueofficial.com/" target="_blank" rel="noreferrer">It Is Unique Official</a>
            -
            <a href="https://www.itisuniqueofficial.com/" target="_blank" rel="noreferrer">itisuniqueofficial.com</a>
          </p>
        </div>
      </footer>
    </div>
  `;
}
