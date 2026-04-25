export const privacyPageHtml = `
  <div class="card">
    <div class="card-header">
      <h2><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> Privacy Policy</h2>
      <p>Your files are processed locally in your browser. No file is uploaded to any server.</p>
    </div>

    <div class="content-grid">

      <div class="content-card">
        <h3><i class="fa-solid fa-laptop" aria-hidden="true"></i> Local Processing</h3>
        <p>GIF and MP4 files are processed entirely inside your browser using client-side Web Workers and browser-based media libraries. Your files never leave your device during normal use.</p>
      </div>

      <div class="content-card">
        <h3><i class="fa-solid fa-database" aria-hidden="true"></i> No File Storage</h3>
        <p>Files are not stored on any server. No account is required to use any tool on this site. Processing happens in browser memory only.</p>
      </div>

      <div class="content-card">
        <h3><i class="fa-solid fa-trash-can" aria-hidden="true"></i> Memory Cleanup</h3>
        <p>When you reset a tool, object URLs are revoked, previews are cleared, and worker state is reset where possible. Browser memory is freed as part of the reset flow.</p>
      </div>

      <div class="content-card">
        <h3><i class="fa-solid fa-code" aria-hidden="true"></i> Third-Party Libraries</h3>
        <p>Some tools use open-source libraries such as FFmpeg.wasm, gifenc, and gifuct-js. These run locally in your browser and do not transmit your files to external servers.</p>
      </div>

      <div class="content-card">
        <h3><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> External Links</h3>
        <p>External links on this site may lead to other websites. Those websites may use different privacy practices. GIF Tools is not responsible for the content or privacy policies of external sites.</p>
      </div>

      <div class="content-card">
        <h3><i class="fa-solid fa-circle-info" aria-hidden="true"></i> Analytics</h3>
        <p>GIF Tools does not use tracking cookies or behavioral analytics. No personal data is collected or transmitted during your use of the tools.</p>
      </div>

    </div>
  </div>
`;
