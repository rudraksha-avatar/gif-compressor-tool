# GIF Compressor Tool

A real browser-based animated GIF compressor built with Vite and TypeScript. It decodes GIF frames with `gifuct-js`, applies real compression passes, and re-encodes a valid animated GIF with `gifenc` entirely on the client side.

Repository URL: `https://github.com/rudraksha-avatar/gif-compressor-tool`

Live site: `https://gif.itisuniqueofficial.com/`

## Features

- Real animated GIF decoding and re-encoding in the browser
- Balanced, High Compression, and Best Quality modes
- Auto mode plus manual controls for width, colors, and frame skipping
- Drag and drop upload with GIF validation
- Original and compressed GIF preview panels
- Real size savings, frame count, dimensions, and color reporting
- Web Worker processing to keep the UI responsive
- Responsive layout for mobile, tablet, and desktop
- SEO-ready metadata, sitemap, robots.txt, and JSON-LD

## Tech Stack

- Vite
- TypeScript
- HTML
- CSS
- Web Worker
- `gifuct-js`
- `gifenc`

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

The production output is written to `dist`.

## How It Works

- The app accepts only real GIF files.
- The worker decodes the input GIF into animation frames.
- Each frame is composited into a full RGBA frame.
- The compressor supports `Balanced`, `High Compression`, and `Best Quality` modes.
- It can use auto mode or manual limits for width, frame skipping, and color reduction.
- The compressor tries progressive passes using real animated GIF re-encoding:
  - resize dimensions
  - palette reduction
  - frame skipping with preserved combined delays
  - metadata reduction by rebuilding the animation
- The output is a real downloadable animated `.gif` file.
- The browser preview uses the generated GIF itself, not a fake canvas export.

## Compression Strategy

Default target is under `1 MB`.

The worker tries lighter to stronger passes and stops early if the file reaches the target. The pass order includes:

- original width, `256` colors, every frame
- max width `720`, `256` colors, every frame
- max width `720`, `128` colors, every frame
- max width `480`, `128` colors, every frame
- max width `480`, `64` colors, every 2nd frame
- max width `360`, `64` colors, every 2nd frame
- max width `360`, `32` colors, every 2nd frame
- max width `240`, `32` colors, every 3rd frame

If the target cannot be reached, the app returns the smallest valid animated GIF generated and shows `Best possible compression reached`.

## Cloudflare Pages Deployment

1. Push the project to GitHub.
2. Open Cloudflare Dashboard.
3. Go to `Workers & Pages`.
4. Create a new Pages project.
5. Connect the GitHub repository.
6. Set build configuration:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Production branch: `main`
7. Deploy.

## Custom Domain Setup

1. In Cloudflare Pages, open the deployed project.
2. Go to `Custom domains`.
3. Add `gif.itisuniqueofficial.com`.
4. Allow Cloudflare to create or suggest the required DNS record.
5. Confirm the DNS record in the Cloudflare DNS zone.
6. Wait for SSL issuance and confirm HTTPS is active.

Final production URL:

`https://gif.itisuniqueofficial.com/`

## Privacy

Your GIF is compressed locally in your browser. No file is uploaded to any server.

## Known Limitations

- Very large GIFs can use a lot of memory because all frames must be decoded and rebuilt in the browser.
- Aggressive compression may reduce dimensions, palette depth, or animation smoothness.
- Transparency is preserved as much as practical through RGBA palette quantization, but some edge quality loss is possible with small palettes.

## Project Structure

```text
public/
  favicon.svg
  robots.txt
  sitemap.xml
src/
  main.ts
  styles.css
  types.ts
  gif-compressor.ts
  gif-worker.ts
  utils.ts
index.html
package.json
tsconfig.json
vite.config.ts
README.md
```

## License

This project is provided for deployment and use by It Is Unique Official. Add your preferred open-source license if you want to publish reuse terms explicitly.

## Deployment Note

Production URLs are already set to `https://gif.itisuniqueofficial.com/` in `index.html`, `public/robots.txt`, and `public/sitemap.xml`.
