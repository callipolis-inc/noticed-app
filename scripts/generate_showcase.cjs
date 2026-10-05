const fs = require('fs');
const path = require('path');

const lightBase64 = fs.readFileSync(path.join(__dirname, '../public/logo-light.png')).toString('base64');
const darkBase64 = fs.readFileSync(path.join(__dirname, '../public/logo-dark.png')).toString('base64');

const artifactPath = path.join('C:/Users/afa/.gemini/antigravity/brain/b5842252-510d-4a9c-8476-e4b677a174aa/noticed_app_icon_showcase.html');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Noticed — iOS Luxury App Icon Showcase</title>
  <style>
    :root {
      --bg: #0c0b0e;
      --card-bg: rgba(24, 23, 28, 0.72);
      --border: rgba(255, 255, 255, 0.1);
      --text-main: #f4f3f0;
      --text-sub: #a3a19b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
      padding: 48px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .header {
      text-align: center;
      max-width: 680px;
      margin-bottom: 44px;
    }
    .tag {
      display: inline-block;
      padding: 5px 14px;
      border-radius: 999px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #e4e2dc;
      margin-bottom: 14px;
      font-weight: 500;
    }
    h1 {
      font-size: 34px;
      font-weight: 700;
      letter-spacing: -0.025em;
      margin-bottom: 10px;
      font-family: 'Newsreader', 'Cormorant Garamond', Georgia, serif;
    }
    p.subtitle {
      font-size: 15px;
      color: var(--text-sub);
      line-height: 1.55;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 32px;
      max-width: 960px;
      width: 100%;
      margin-bottom: 48px;
    }
    .icon-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 32px;
      padding: 36px 28px;
      display: flex;
      flex-direction: column;
      align-items: center;
      backdrop-filter: blur(24px) saturate(190%);
      box-shadow: 0 24px 48px rgba(0,0,0,0.5);
      position: relative;
      overflow: hidden;
    }
    .specular-rim {
      position: absolute;
      top: 0;
      left: 10%;
      right: 10%;
      height: 1px;
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
    }
    .icon-stage {
      width: 210px;
      height: 210px;
      margin: 22px 0 28px;
      position: relative;
    }
    .ios-squircle {
      width: 100%;
      height: 100%;
      border-radius: 22.5%;
      box-shadow: 0 20px 42px -6px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.14);
      object-fit: cover;
      display: block;
      transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease;
    }
    .ios-squircle:hover {
      transform: scale(1.05) translateY(-4px);
      box-shadow: 0 28px 56px -6px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.25);
    }
    .badge {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
      letter-spacing: -0.01em;
    }
    .desc {
      font-size: 13px;
      color: var(--text-sub);
      text-align: center;
      line-height: 1.5;
      max-width: 300px;
    }
    .details {
      margin-top: 20px;
      padding-top: 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      width: 100%;
      font-size: 12.5px;
      color: #8b8882;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .details-row span:last-child {
      color: #ede9e1;
      font-family: ui-monospace, SFMono-Regular, monospace;
      font-size: 11.5px;
    }
    .homescreen-preview {
      max-width: 960px;
      width: 100%;
      background: linear-gradient(180deg, rgba(28,27,33,0.7) 0%, rgba(16,15,19,0.85) 100%);
      border: 1px solid var(--border);
      border-radius: 36px;
      padding: 40px;
      box-shadow: 0 32px 64px rgba(0,0,0,0.6);
      text-align: center;
      backdrop-filter: blur(24px);
      position: relative;
    }
    .homescreen-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      font-family: 'Newsreader', Georgia, serif;
    }
    .homescreen-sub {
      font-size: 13px;
      color: var(--text-sub);
      margin-bottom: 32px;
    }
    .dock-container {
      display: flex;
      justify-content: center;
      gap: 56px;
      flex-wrap: wrap;
    }
    .dock-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .dock-squircle {
      width: 92px;
      height: 92px;
      border-radius: 22.5%;
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.12);
      object-fit: cover;
      transition: transform 0.25s ease;
    }
    .dock-squircle:hover {
      transform: scale(1.08) translateY(-3px);
    }
    .dock-label {
      font-size: 12px;
      color: #e4e2dc;
      font-weight: 500;
      letter-spacing: -0.01em;
    }
  </style>
</head>
<body>

  <div class="header">
    <div class="tag">Atelier iOS Iconography</div>
    <h1>Noticed — Bespoke Luxury App Icons</h1>
    <p class="subtitle">Dirancang khusus untuk estetika iPhone Light & Dark Mode: tekstur serat kertas Fabriano dengan deboss letterpress intaglio, serta smoked obsidian glass dengan pantulan kaustik moonlight.</p>
  </div>

  <div class="grid">
    <!-- Light Mode Card -->
    <div class="icon-card">
      <div class="specular-rim"></div>
      <div class="badge">
        <span>☀️ Light Theme Icon</span>
      </div>
      <div class="desc">Kertas linen alabaster bertekstur kapas 300gsm, aksen hangat, dan deboss intaglio tinta karbon hitam dengan catch-light fisik.</div>

      <div class="icon-stage">
        <img class="ios-squircle" src="data:image/png;base64,${lightBase64}" alt="Noticed Light Mode App Icon" />
      </div>

      <div class="details">
        <div class="details-row"><span>Filosofi</span><span>Warm Alabaster Linen</span></div>
        <div class="details-row"><span>Gradien Elevasi</span><span>#FBF9F5 → #EBE5DB</span></div>
        <div class="details-row"><span>Karakter Garis</span><span>Carbon Ink (#181615)</span></div>
        <div class="details-row"><span>Sentuhan Taktil</span><span>Letterpress Deboss + Bevel</span></div>
      </div>
    </div>

    <!-- Dark Mode Card -->
    <div class="icon-card">
      <div class="specular-rim"></div>
      <div class="badge">
        <span>🌙 Dark Theme Icon</span>
      </div>
      <div class="desc">Kaca silika smoked obsidian, difusi satin frosted bebas banding, garis porselen gading dengan aura luminous moonlight.</div>

      <div class="icon-stage">
        <img class="ios-squircle" src="data:image/png;base64,${darkBase64}" alt="Noticed Dark Mode App Icon" />
      </div>

      <div class="details">
        <div class="details-row"><span>Filosofi</span><span>Smoked Obsidian Glass</span></div>
        <div class="details-row"><span>Gradien Elevasi</span><span>#1D1C22 → #0D0C0F</span></div>
        <div class="details-row"><span>Karakter Garis</span><span>Porcelain Ivory (#FAF7F2)</span></div>
        <div class="details-row"><span>Refleksi Optik</span><span>Caustic Rim + Ambient Halo</span></div>
      </div>
    </div>
  </div>

  <!-- iOS Homescreen Simulation -->
  <div class="homescreen-preview">
    <div class="specular-rim"></div>
    <div class="homescreen-title">iPhone Homescreen Squircle Simulation</div>
    <div class="homescreen-sub">Ukuran standar Apple iOS Home Screen dengan kurva squircle 22.5% dan bayangan kontak natural</div>
    <div class="dock-container">
      <div class="dock-item">
        <img class="dock-squircle" src="data:image/png;base64,${lightBase64}" alt="Light Icon" />
        <span class="dock-label">Noticed (Light)</span>
      </div>
      <div class="dock-item">
        <img class="dock-squircle" src="data:image/png;base64,${darkBase64}" alt="Dark Icon" />
        <span class="dock-label">Noticed (Dark)</span>
      </div>
    </div>
  </div>

</body>
</html>`;

fs.writeFileSync(artifactPath, html);
console.log('Artifact written successfully to:', artifactPath);
