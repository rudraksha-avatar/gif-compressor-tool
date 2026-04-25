export interface ToolPageConfig {
  route: '/' | '/mp4-to-gif' | '/gif-to-mp4' | '/gif-resizer' | '/gif-speed' | '/gif-optimizer' | '/gif-crop' | '/gif-split' | '/gif-maker' | '/tools' | '/privacy' | '/about' | '/contact' | '/faq' | '/404.html';
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

const NAV_LINKS = [
  { href: '/', label: 'GIF Compressor', icon: 'fa-regular fa-file-image' },
  { href: '/mp4-to-gif', label: 'MP4 to GIF', icon: 'fa-solid fa-film' },
  { href: '/privacy', label: 'Privacy', icon: 'fa-solid fa-shield-halved' },
  { href: '/faq', label: 'FAQ', icon: 'fa-regular fa-circle-question' },
];

const TOOL_LINKS = [
  { href: '/', label: 'GIF Compressor', icon: 'fa-regular fa-file-image' },
  { href: '/mp4-to-gif', label: 'MP4 to GIF', icon: 'fa-solid fa-film' },
  { href: '/gif-to-mp4', label: 'GIF to MP4', icon: 'fa-solid fa-video' },
  { href: '/gif-resizer', label: 'GIF Resizer', icon: 'fa-solid fa-up-right-and-down-left-from-center' },
  { href: '/gif-crop', label: 'GIF Cropper', icon: 'fa-solid fa-crop-simple' },
  { href: '/gif-speed', label: 'GIF Speed Changer', icon: 'fa-solid fa-gauge-high' },
  { href: '/gif-split', label: 'GIF Frame Splitter', icon: 'fa-regular fa-images' },
  { href: '/gif-maker', label: 'GIF Maker', icon: 'fa-solid fa-wand-magic-sparkles' },
  { href: '/gif-optimizer', label: 'Advanced GIF Optimizer', icon: 'fa-solid fa-sliders' }
];

function renderNavLinks(currentRoute: string): string {
  const toolsMenu = `
    <div class="nav-tools dropdown" data-dropdown>
      <button class="dropdown-toggle" type="button" aria-expanded="false" aria-controls="tools-menu" data-dropdown-toggle>
        <i class="fa-solid fa-toolbox" aria-hidden="true"></i>
        <span>Tools</span>
      </button>
      <div class="nav-tools-menu dropdown-menu" id="tools-menu" role="menu" aria-label="GIF tools" data-dropdown-menu>
        <a href="/tools" role="menuitem"${currentRoute === '/tools' ? ' aria-current="page"' : ''}><i class="fa-solid fa-table-cells-large" aria-hidden="true"></i><span>All Tools</span></a>
        ${TOOL_LINKS.map(link =>
          `<a href="${link.href}" role="menuitem"${currentRoute === link.href ? ' aria-current="page"' : ''}>
            <i class="${link.icon}" aria-hidden="true"></i>
            <span>${link.label}</span>
          </a>`
        ).join('')}
      </div>
    </div>
  `;

  return `${toolsMenu}${NAV_LINKS.map(link =>
    `<a href="${link.href}"${currentRoute === link.href ? ' aria-current="page"' : ''}>
      <i class="${link.icon}" aria-hidden="true"></i>
      <span>${link.label}</span>
    </a>`
  ).join('')}`;
}

function renderHowItWorks(items: Array<{ title: string; description: string }>): string {
  if (items.length === 0) return '';
  return `
    <section id="how-it-works" class="page-section" aria-labelledby="how-it-works-title">
      <div class="container">
        <div class="card">
          <div class="card-header">
            <h2 id="how-it-works-title"><i class="fa-solid fa-gears" aria-hidden="true"></i> How it works</h2>
          </div>
          <div class="content-grid">
            ${items.map(item => `
              <div class="content-card">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderFeatures(items: Array<{ title: string; description: string }>): string {
  if (items.length === 0) return '';
  return `
    <section class="page-section" aria-labelledby="features-title">
      <div class="container">
        <div class="card">
          <div class="card-header">
            <h2 id="features-title"><i class="fa-solid fa-layer-group" aria-hidden="true"></i> Features</h2>
          </div>
          <div class="content-grid">
            ${items.map(item => `
              <div class="content-card">
                <h3>${item.title}</h3>
                <p>${item.description}</p>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderFaq(items: Array<{ title: string; description: string }>): string {
  if (items.length === 0) return '';
  return `
    <section id="faq" class="page-section" aria-labelledby="faq-title">
      <div class="container">
        <div class="card">
          <div class="card-header">
            <h2 id="faq-title"><i class="fa-regular fa-circle-question" aria-hidden="true"></i> FAQ</h2>
          </div>
          <div class="faq-list">
            ${items.map(item => `
              <details class="faq-item">
                <summary>${item.title}</summary>
                <p>${item.description}</p>
              </details>
            `).join('')}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderPrivacySection(note: string): string {
  return `
    <section id="privacy" class="page-section" aria-labelledby="privacy-section-title">
      <div class="container">
        <div class="card">
          <div class="card-header">
            <h2 id="privacy-section-title"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Privacy</h2>
          </div>
          <p class="text-muted">${note}</p>
        </div>
      </div>
    </section>
  `;
}

export function renderLayout(config: ToolPageConfig): string {
  const isToolPage = config.howItWorks.length > 0;

  return `
    <div class="site-shell">
      <!-- ===== HEADER ===== -->
      <header class="site-header" role="banner">
        <div class="container topbar">
          <a class="brand" href="/" aria-label="GIF Tools home">
            <span class="brand-mark" aria-hidden="true">
              <i class="fa-solid fa-photo-film"></i>
            </span>
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
          </button>

          <nav class="topnav" id="site-navigation" aria-label="Primary navigation" data-open="false">
            ${renderNavLinks(config.route)}
          </nav>
        </div>
      </header>

      <!-- ===== MAIN ===== -->
      <main id="main-content" class="main-content">

        <!-- Hero -->
        <section class="hero-section" aria-labelledby="page-title">
          <div class="container">
            <div class="hero-grid">
              <div>
                <span class="hero-eyebrow">${config.eyebrow}</span>
                <h1 id="page-title">${config.toolName}</h1>
                <p class="hero-description">${config.intro}</p>
                <p class="hero-description">${config.heroCopy}</p>
                <div class="hero-privacy-note">
                  <i class="fa-solid fa-lock" aria-hidden="true"></i>
                  <span>${config.privacyNote}</span>
                </div>
                ${isToolPage ? `
                <div class="hero-actions">
                  <a class="btn btn-primary primary-button" href="#tool">
                    <i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i>
                    <span>Open Tool</span>
                  </a>
                  <a class="btn btn-secondary secondary-button" href="#how-it-works">
                    <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                    <span>Learn How It Works</span>
                  </a>
                </div>
                ` : ''}
              </div>

              ${isToolPage ? `
              <div class="hero-card" aria-label="What this tool does">
                <h2><i class="fa-solid fa-list-check" aria-hidden="true"></i> What this tool does</h2>
                <ul>
                  <li><i class="fa-solid fa-check" aria-hidden="true"></i> Runs fully in your browser</li>
                  <li><i class="fa-solid fa-check" aria-hidden="true"></i> Processes media without server upload</li>
                  <li><i class="fa-solid fa-check" aria-hidden="true"></i> Outputs a real animated GIF file</li>
                  <li><i class="fa-solid fa-check" aria-hidden="true"></i> Uses worker-based processing to keep the page responsive</li>
                </ul>
              </div>
              ` : ''}
            </div>
          </div>
        </section>

        <!-- Tool / Page Content -->
        ${isToolPage ? `
        <section id="tool" class="page-section" aria-label="Tool interface">
          <div class="container">
            ${config.toolHtml}
          </div>
        </section>
        ` : `
        <section class="page-section">
          <div class="container">
            ${config.toolHtml}
          </div>
        </section>
        `}

        ${renderHowItWorks(config.howItWorks)}
        ${renderFeatures(config.features)}
        ${isToolPage ? renderPrivacySection(config.privacyNote) : ''}
        ${renderFaq(config.faq)}

      </main>

      <!-- ===== FOOTER ===== -->
      <footer class="site-footer" role="contentinfo">
        <div class="container footer-inner">
          <div class="footer-grid">

            <!-- Brand -->
            <div class="footer-col">
              <h3><i class="fa-solid fa-photo-film" aria-hidden="true"></i> GIF Tools</h3>
              <p>Private browser-based tools for compressing, converting, and optimizing GIF files. No upload required.</p>
            </div>

            <!-- Tools -->
            <div class="footer-col">
              <h3><i class="fa-solid fa-toolbox" aria-hidden="true"></i> Tools</h3>
              <nav class="footer-nav" aria-label="Footer tools">
                <a href="/tools"><i class="fa-solid fa-toolbox" aria-hidden="true"></i> All Tools</a>
                ${TOOL_LINKS.map(link => `<a href="${link.href}"><i class="${link.icon}" aria-hidden="true"></i> ${link.label}</a>`).join('')}
              </nav>
            </div>

            <!-- Resources -->
            <div class="footer-col">
              <h3><i class="fa-solid fa-book-open" aria-hidden="true"></i> Resources</h3>
              <nav class="footer-nav" aria-label="Footer resources">
                <a href="/about"><i class="fa-solid fa-circle-info" aria-hidden="true"></i> About</a>
                <a href="/privacy"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Privacy</a>
                <a href="/faq"><i class="fa-regular fa-circle-question" aria-hidden="true"></i> FAQ</a>
                <a href="/contact"><i class="fa-regular fa-envelope" aria-hidden="true"></i> Contact</a>
              </nav>
            </div>

            <!-- Local Processing -->
            <div class="footer-col">
              <h3><i class="fa-solid fa-user-shield" aria-hidden="true"></i> Local Processing</h3>
              <p>Your files are processed locally in your browser. No file is uploaded to any server.</p>
            </div>

          </div>

          <div class="footer-bottom">
            <p class="footer-credit">
              Made with love by
              <a href="https://www.itisuniqueofficial.com/" target="_blank" rel="noreferrer">It Is Unique Official</a>
              &mdash;
              <a href="https://www.itisuniqueofficial.com/" target="_blank" rel="noreferrer">itisuniqueofficial.com</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  `;
}
