import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const staticRoutes = [
  'mp4-to-gif',
  'gif-to-mp4',
  'gif-resizer',
  'gif-crop',
  'gif-speed',
  'gif-split',
  'gif-maker',
  'gif-optimizer',
  'tools',
  'privacy',
  'about',
  'contact',
  'faq'
];

export default defineConfig({
  plugins: [
    {
      name: 'generate-static-route-entrypoints',
      closeBundle() {
        const distRoot = join(process.cwd(), 'dist');
        const indexPath = join(distRoot, 'index.html');

        for (const route of staticRoutes) {
          copyFileSync(indexPath, join(distRoot, `${route}.html`));
          const routeDir = join(distRoot, route);
          mkdirSync(routeDir, { recursive: true });
          copyFileSync(indexPath, join(routeDir, 'index.html'));
        }
      }
    }
  ],
  build: {
    target: 'es2020'
  }
});
