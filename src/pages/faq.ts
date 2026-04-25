export const faqPageHtml = `
  <div class="card">
    <div class="card-header">
      <h2><i class="fa-regular fa-circle-question" aria-hidden="true"></i> Frequently Asked Questions</h2>
      <p>Answers to common questions about GIF compression, conversion, and browser-based processing.</p>
    </div>

    <div class="faq-list">

      <details class="faq-item">
        <summary>Are my files uploaded to a server?</summary>
        <p>No. All files are processed locally in your browser using Web Workers and browser-based media libraries. Your files never leave your device during normal use of any tool on this site.</p>
      </details>

      <details class="faq-item">
        <summary>Does the GIF compressor really create animated GIF output?</summary>
        <p>Yes. The compressor decodes the original GIF frames, applies real compression passes including resizing, palette reduction, and frame skipping, then re-encodes a valid animated GIF file. The output is a genuine animated GIF, not a renamed image or static frame.</p>
      </details>

      <details class="faq-item">
        <summary>Why can compression take longer on some devices?</summary>
        <p>Large animated GIFs require more browser memory and more frame processing time. Mobile devices and devices with limited RAM may take longer to complete compression. Keeping the page open and avoiding other heavy browser tabs helps.</p>
      </details>

      <details class="faq-item">
        <summary>Why can a GIF output be larger than the original MP4?</summary>
        <p>GIF is a much less efficient format than MP4 video. GIF stores full color palettes per frame and uses lossless LZW compression, while MP4 uses modern video codecs with inter-frame compression. Complex motion or long durations can result in GIF files that are significantly larger than the source MP4.</p>
      </details>

      <details class="faq-item">
        <summary>Can every GIF be compressed under 1 MB?</summary>
        <p>No. Some GIFs are too large, too long, or too complex to reach 1 MB without becoming unacceptably degraded. When the target cannot be reached, the tool returns the smallest valid animated GIF it can produce and shows that best possible compression was reached.</p>
      </details>

      <details class="faq-item">
        <summary>Does GIF Tools work on mobile devices?</summary>
        <p>Yes. The site is fully responsive and works on mobile browsers. However, large files and long animations can take longer and use more memory on mobile devices. Using shorter durations, lower widths, and smaller source files helps on mobile.</p>
      </details>

      <details class="faq-item">
        <summary>What happens when I click Reset?</summary>
        <p>The reset flow clears the selected file, revokes object URLs to free browser memory, clears all previews and download links, resets worker state, and returns the tool to its initial state. You can then select a new file and start again.</p>
      </details>

      <details class="faq-item">
        <summary>Why did my conversion fail?</summary>
        <p>Conversion can fail for several reasons: the file may be too large for available browser memory, the browser may have limited resources, the media file may be malformed or use an unsupported codec, or the browser may not support the required Web Worker APIs. Try a smaller file, a shorter duration, or a different browser.</p>
      </details>

      <details class="faq-item">
        <summary>Which browsers are supported?</summary>
        <p>GIF Tools works best in modern desktop browsers such as Chrome, Firefox, Edge, and Safari. Web Worker support and sufficient memory are required. Some tools that use FFmpeg.wasm may require SharedArrayBuffer support, which is available in most modern browsers with the correct security headers.</p>
      </details>

      <details class="faq-item">
        <summary>Is there a file size limit?</summary>
        <p>There is no hard limit enforced by the site, but browser memory limits apply. Very large GIFs (over 20 MB) or long MP4 videos may cause the browser to run out of memory. Using smaller source files and shorter durations is recommended for reliable results.</p>
      </details>

    </div>
  </div>
`;
