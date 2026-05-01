# GIF Tools

A production-ready, fully responsive, browser-based GIF processing platform. All tools run entirely client-side using Web Workers, FFmpeg.wasm, and real GIF processing libraries. No file is uploaded to any server.

**Production URL:** https://gif.itisuniqueofficial.com/

---

## Available Pages

| Route | Description |
|-------|-------------|
| `/` | GIF Compressor |
| `/mp4-to-gif` | MP4 to GIF Converter |
| `/gif-to-mp4` | GIF to MP4 Converter |
| `/gif-resizer` | GIF Resizer |
| `/gif-crop` | GIF Cropper |
| `/gif-speed` | GIF Speed Changer |
| `/gif-split` | GIF Frame Splitter |
| `/gif-maker` | GIF Maker |
| `/gif-optimizer` | Advanced GIF Optimizer |
| `/tools` | Tools Directory |
| `/about` | About |
| `/privacy` | Privacy Policy |
| `/contact` | Contact |
| `/faq` | FAQ |
| `/404.html` | Custom 404 Page |

---

## Available Tools

### GIF Compressor (`/`)
Compresses animated GIFs using real frame processing. Decodes GIF frames with gifuct-js, applies compression strategies (resizing, palette reduction, frame skipping), and re-encodes a valid animated GIF using gifenc. Supports target size, compression mode (balanced/high/quality), auto mode, max width, FPS reduction, and color limit controls.

### MP4 to GIF Converter (`/mp4-to-gif`)
Converts MP4 video segments to animated GIFs using FFmpeg.wasm running in a Web Worker. Supports start/end time trimming, duration limit, output width, FPS, quality mode, loop control, and auto-optimization. Uses palettegen and paletteuse filters for better color quality.

### GIF to MP4 Converter (`/gif-to-mp4`)
Converts animated GIF files to MP4 video using FFmpeg.wasm. Outputs a valid MP4 with yuv420p pixel format for broad compatibility.

### GIF Resizer (`/gif-resizer`)
Resizes animated GIFs using FFmpeg.wasm with lanczos scaling. Supports width/height control and aspect ratio preservation.

### GIF Cropper (`/gif-crop`)
Crops animated GIF frames using FFmpeg.wasm with numeric X/Y/width/height crop controls.

### GIF Speed Changer (`/gif-speed`)
Changes animated GIF playback speed using FFmpeg.wasm setpts filter. Supports 0.25x to 4x speed multipliers.

### GIF Frame Splitter (`/gif-split`)
Extracts GIF animation frames as PNG images using gifuct-js. Supports individual frame download and ZIP archive download via JSZip.

### GIF Maker (`/gif-maker`)
Creates animated GIFs from PNG/JPG image sequences using gifenc and OffscreenCanvas. Supports frame delay and output width controls.

### Advanced GIF Optimizer (`/gif-optimizer`)
Uses the same real compression engine as the GIF Compressor with advanced manual controls for fine-tuned output.

---

## Real GIF Compression

The GIF Compressor uses a multi-pass compression strategy:

1. **Decode** — gifuct-js parses the GIF and composites frames with proper disposal handling
2. **Strategy selection** — Builds adaptive compression strategies based on file size, frame count, and duration
3. **Compress** — Each strategy applies resizing (OffscreenCanvas), palette quantization (gifenc), and frame skipping
4. **Re-encode** — gifenc encodes a valid animated GIF with preserved loop behavior
5. **Select best** — Returns the smallest result that meets the target, or the best possible if the target cannot be reached

No fake compression. No renamed formats. Output is always a real animated GIF.

---

## Real MP4 to GIF Conversion

The MP4 to GIF Converter uses FFmpeg.wasm:

1. **Load FFmpeg** — FFmpeg.wasm is loaded from CDN into a Web Worker
2. **Write input** — The MP4 file is written to the FFmpeg virtual file system
3. **Generate palette** — `palettegen` filter creates an optimized color palette
4. **Convert** — `paletteuse` filter applies the palette and outputs a real animated GIF
5. **Read output** — The GIF bytes are read from the virtual FS and returned
6. **Cleanup** — Input, palette, and output files are deleted from the virtual FS

---

## FFmpeg.wasm Usage

FFmpeg is loaded from CDN (no bundling):

```
https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js
https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm
https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.worker.js
```

FFmpeg runs inside a Web Worker to keep the main thread responsive. Temporary files are cleaned up after each operation.

---

## Local Privacy

- Files are processed in browser memory only
- No file is uploaded to any server
- Object URLs are revoked on reset to free memory
- No tracking cookies or analytics
- No account required

---

## Memory Cleanup

The `MemoryManager` class tracks all object URLs created during a session. On reset:
- All object URLs are revoked via `URL.revokeObjectURL()`
- Preview elements are cleared
- Worker state is reset
- File inputs are cleared
- Download links are removed

---

## Local Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Cloudflare Pages Deployment

**Framework preset:** Vite  
**Build command:** `npm run build`  
**Output directory:** `dist`  
**Production branch:** `main`  
**Custom domain:** `https://gif.itisuniqueofficial.com/`

The `public/_redirects` file contains the SPA fallback rule:
```
/* /index.html 200
```

This ensures direct URL access to all routes works correctly on Cloudflare Pages.

---

## Known Browser Limitations

- FFmpeg.wasm requires SharedArrayBuffer support (available in modern browsers with correct COOP/COEP headers)
- Very large GIFs (>20 MB) may exceed browser memory limits
- Long MP4 videos (>15 seconds) may cause memory issues on mobile devices
- Some older browsers may not support OffscreenCanvas used in GIF compression
- Web Worker support is required for all tools

---

## Large File Limitations

- GIF Compressor: Files over 8 MB show a large file warning
- MP4 to GIF: Files over 25 MB show a large file warning; duration is limited to 15 seconds
- GIF Frame Splitter: Large GIFs with many frames may take longer to extract
- All tools: Browser memory limits apply; closing other tabs helps on low-memory devices

---

## Tech Stack

- **Vite** — Build tool and dev server
- **TypeScript** — Strict type checking
- **Custom CSS** — No frameworks, no Tailwind, no Bootstrap
- **Font Awesome 6** — Icons via CDN
- **FFmpeg.wasm** — Browser-side video processing
- **gifenc** — GIF encoding
- **gifuct-js** — GIF decoding and frame extraction
- **JSZip** — ZIP archive creation for frame export
- **Web Workers** — Off-main-thread processing
- **Cloudflare Pages** — Hosting and CDN

---

## License

See [LICENSE](LICENSE) for details.

---

Created by [It Is Unique Official](https://www.itisuniqueofficial.com/)
