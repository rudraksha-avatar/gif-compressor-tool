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
          <a class="brand" href="/">GIF Tools</a>
          <nav class="topnav" aria-label="Primary navigation">
            <a href="/"${isGifRoute ? ' aria-current="page"' : ''}>GIF Compressor</a>
            <a href="/mp4-to-gif"${!isGifRoute ? ' aria-current="page"' : ''}>MP4 to GIF</a>
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
              <p class="eyebrow">${config.eyebrow}</p>
              <h1>${config.toolName}</h1>
              <p class="intro">${config.intro}</p>
              <p class="hero-copy">${config.heroCopy}</p>
              <div class="hero-actions">
                <a class="primary-button" href="#tool">Open Tool</a>
                <a class="secondary-button" href="#how-it-works">Learn How It Works</a>
              </div>
            </div>
            <div class="hero-note panel">
              <h2>What this tool does</h2>
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
          <h2>How it works</h2>
          <div class="content-grid">
            ${renderCards(config.howItWorks)}
          </div>
        </section>

        <section class="container content-section panel">
          <h2>Features</h2>
          <div class="content-grid">
            ${renderCards(config.features)}
          </div>
        </section>

        <section id="privacy" class="container content-section panel">
          <h2>Privacy</h2>
          <p>${config.privacyNote}</p>
        </section>

        <section id="faq" class="container content-section panel">
          <h2>FAQ</h2>
          <div class="faq-list">
            ${renderCards(config.faq)}
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
}
