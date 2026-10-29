import path from 'node:path';
import fs from 'node:fs';
import { preview } from 'vite';
import { chromium } from 'playwright';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 4195;
const rootDir = path.resolve('D:/Project/noticed/Noticed-Mobile');
const storeAssetsDir = path.join(rootDir, 'store-assets', 'screenshots');

const devices = [
  {
    deviceDir: 'ios-6.7-inch',
    width: 430,
    height: 932,
    scale: 3, // 1290 x 2796 px
    safeArea: { top: 54, left: 0, bottom: 34, right: 0 },
    statusBar: {
      height: 54,
      paddingX: 33,
      fontSize: 16,
    },
  },
  {
    deviceDir: 'ios-6.5-inch',
    width: 414,
    height: 896,
    scale: 3, // 1242 x 2688 px
    safeArea: { top: 44, left: 0, bottom: 34, right: 0 },
    statusBar: {
      height: 44,
      paddingX: 28,
      fontSize: 15,
    },
  },
  {
    deviceDir: 'android-phone',
    width: 360,
    height: 800,
    scale: 3, // 1080 x 2400 px
    safeArea: { top: 32, left: 0, bottom: 20, right: 0 },
    statusBar: {
      height: 32,
      paddingX: 18,
      fontSize: 14,
    },
  },
];

const scrollVoiceMemoAction = async (page) => {
  await page.evaluate(() => {
    const note2 = document.getElementById('note-note-2');
    if (note2) {
      const rect = note2.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      window.scrollTo({ top: scrollTop + rect.top - 65, behavior: 'instant' });
    }
  });
  await page.waitForTimeout(400);
  const playBtn = page.locator('div[title="Play voice memo"], [aria-label*="rekaman suara"]').first();
  if (await playBtn.isVisible().catch(() => false)) {
    await playBtn.click();
    await page.waitForTimeout(400);
  }
};

const targets = [
  // Curated Multi-Theme Showcase (Ideal Storyboard: 6 Slides)
  {
    name: '01-bookshelf-library',
    query: '?demo=1&view=bookshelf&theme=alabaster',
    action: null,
  },
  {
    name: '02-notebook-chronicle',
    query: '?demo=1&view=notebook&theme=sage',
    action: null,
  },
  {
    name: '03-create-field-note',
    query: '?demo=1&view=notebook&theme=obsidian',
    action: async (page) => {
      const addBtn = page.locator('button[aria-label="Tulis Catatan"], button[title="Tulis Catatan"], button:has-text("Tulis Catatan")').first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
      } else {
        const dockBtn = page.locator('button:has(svg.lucide-pen-line), button:has(svg.lucide-pencil), button[title*="Tulis"], button[title*="Notice"]').first();
        if (await dockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await dockBtn.click();
        }
      }
      await page.waitForTimeout(600);
    },
  },
  {
    name: '04-author-profile-vault',
    query: '?demo=1&view=bookshelf&theme=obsidian',
    action: async (page) => {
      const profileBtn = page.locator('button[title="Profile"], button[aria-label*="Profil"]').first();
      await profileBtn.click();
      await page.waitForTimeout(600);
    },
  },
  {
    name: '05-polaroid-archival',
    query: '?demo=1&view=notebook&theme=sage&sheet=photostrip',
    action: async (page) => {
      await page.waitForTimeout(400);
    },
  },
  {
    name: '06-tactile-voice-memo',
    query: '?demo=1&view=notebook&theme=sage',
    action: scrollVoiceMemoAction,
  },
  {
    name: '07-paper-and-ink-themes',
    query: '?demo=1&view=notebook&theme=alabaster&sheet=theme',
    action: async (page) => {
      await page.waitForTimeout(400);
    },
  },

  // Dedicated Matcha Theme Collection
  {
    name: 'matcha-01-bookshelf',
    query: '?demo=1&view=bookshelf&theme=sage',
    action: null,
  },
  {
    name: 'matcha-02-notebook',
    query: '?demo=1&view=notebook&theme=sage',
    action: null,
  },
  {
    name: 'matcha-03-create-field-note',
    query: '?demo=1&view=notebook&theme=sage',
    action: async (page) => {
      const addBtn = page.locator('button[aria-label="Tulis Catatan"], button[title="Tulis Catatan"], button:has-text("Tulis Catatan")').first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
      } else {
        const dockBtn = page.locator('button:has(svg.lucide-pen-line), button:has(svg.lucide-pencil), button[title*="Tulis"], button[title*="Notice"]').first();
        if (await dockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await dockBtn.click();
        }
      }
      await page.waitForTimeout(600);
    },
  },
  {
    name: 'matcha-04-author-profile-vault',
    query: '?demo=1&view=bookshelf&theme=sage',
    action: async (page) => {
      const profileBtn = page.locator('button[title="Profile"], button[aria-label*="Profil"]').first();
      await profileBtn.click();
      await page.waitForTimeout(600);
    },
  },
  {
    name: 'matcha-05-polaroid-archival',
    query: '?demo=1&view=notebook&theme=sage&sheet=photostrip',
    action: async (page) => {
      await page.waitForTimeout(400);
    },
  },
  {
    name: 'matcha-06-tactile-voice-memo',
    query: '?demo=1&view=notebook&theme=sage',
    action: scrollVoiceMemoAction,
  },

  // Dedicated Dark Mode Collection (Obsidian)
  {
    name: 'dark-01-bookshelf',
    query: '?demo=1&view=bookshelf&theme=obsidian',
    action: null,
  },
  {
    name: 'dark-02-notebook',
    query: '?demo=1&view=notebook&theme=obsidian',
    action: null,
  },
  {
    name: 'dark-03-create-field-note',
    query: '?demo=1&view=notebook&theme=obsidian',
    action: async (page) => {
      const addBtn = page.locator('button[aria-label="Tulis Catatan"], button[title="Tulis Catatan"], button:has-text("Tulis Catatan")').first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
      } else {
        const dockBtn = page.locator('button:has(svg.lucide-pen-line), button:has(svg.lucide-pencil), button[title*="Tulis"], button[title*="Notice"]').first();
        if (await dockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await dockBtn.click();
        }
      }
      await page.waitForTimeout(600);
    },
  },
  {
    name: 'dark-04-author-profile-vault',
    query: '?demo=1&view=bookshelf&theme=obsidian',
    action: async (page) => {
      const profileBtn = page.locator('button[title="Profile"], button[aria-label*="Profil"]').first();
      await profileBtn.click();
      await page.waitForTimeout(600);
    },
  },
  {
    name: 'dark-05-polaroid-archival',
    query: '?demo=1&view=notebook&theme=obsidian&sheet=photostrip',
    action: async (page) => {
      await page.waitForTimeout(400);
    },
  },
  {
    name: 'dark-06-tactile-voice-memo',
    query: '?demo=1&view=notebook&theme=obsidian',
    action: scrollVoiceMemoAction,
  },

  // Dedicated Light Collection (Alabaster)
  {
    name: 'light-01-bookshelf',
    query: '?demo=1&view=bookshelf&theme=alabaster',
    action: null,
  },
  {
    name: 'light-02-notebook',
    query: '?demo=1&view=notebook&theme=alabaster',
    action: null,
  },
  {
    name: 'light-03-create-field-note',
    query: '?demo=1&view=notebook&theme=alabaster',
    action: async (page) => {
      const addBtn = page.locator('button[aria-label="Tulis Catatan"], button[title="Tulis Catatan"], button:has-text("Tulis Catatan")').first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
      } else {
        const dockBtn = page.locator('button:has(svg.lucide-pen-line), button:has(svg.lucide-pencil), button[title*="Tulis"], button[title*="Notice"]').first();
        if (await dockBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await dockBtn.click();
        }
      }
      await page.waitForTimeout(600);
    },
  },
  {
    name: 'light-04-author-profile-vault',
    query: '?demo=1&view=bookshelf&theme=alabaster',
    action: async (page) => {
      const profileBtn = page.locator('button[title="Profile"], button[aria-label*="Profil"]').first();
      await profileBtn.click();
      await page.waitForTimeout(600);
    },
  },
  {
    name: 'light-05-polaroid-archival',
    query: '?demo=1&view=notebook&theme=alabaster&sheet=photostrip',
    action: async (page) => {
      await page.waitForTimeout(400);
    },
  },
  {
    name: 'light-06-tactile-voice-memo',
    query: '?demo=1&view=notebook&theme=alabaster',
    action: scrollVoiceMemoAction,
  },
];

async function capture() {
  console.log('Starting Vite preview server on port', PORT);
  const previewServer = await preview({
    root: rootDir,
    preview: { port: PORT, strictPort: true },
  });

  console.log('Launching Chromium via Playwright...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  try {
    for (const dev of devices) {
      console.log(`\n📱 Setting up device profile: ${dev.deviceDir} (${dev.width}x${dev.height} @ ${dev.scale}x)`);
      const outputFolder = path.join(storeAssetsDir, dev.deviceDir);
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      const context = await browser.newContext({
        viewport: { width: dev.width, height: dev.height },
        deviceScaleFactor: dev.scale,
        isMobile: true,
        hasTouch: true,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      });

      for (const target of targets) {
        const page = await context.newPage();

        // Extract theme from query and pre-inject into localStorage
        const themeMatch = target.query.match(/theme=([a-z_]+)/);
        const targetTheme = themeMatch ? themeMatch[1] : 'alabaster';

        await page.addInitScript((th) => {
          try {
            localStorage.setItem('sidenotes_theme_palette', th);
            localStorage.setItem('noticed_theme_palette', th);
          } catch (e) {}
        }, targetTheme);

        // Emulate native hardware safe-area insets via Chrome DevTools Protocol
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setSafeAreaInsetsOverride', {
          insets: dev.safeArea,
        });

        const url = `http://localhost:${PORT}/${target.query}`;
        console.log(`  Capturing [${dev.deviceDir}] ${target.name} (theme: ${targetTheme})...`);

        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(600);
        await page.evaluate((th) => {
          document.documentElement.setAttribute('data-theme', th);
          if (['obsidian', 'espresso', 'oxford'].includes(th)) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
          } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
          }
          return document.fonts.ready;
        }, targetTheme);
        await page.waitForTimeout(600);

        if (target.action) {
          try {
            await target.action(page);
            await page.waitForTimeout(600);
          } catch (e) {
            console.warn(`    Action for ${target.name} encountered:`, e.message);
          }
        }

        // Inject pixel-perfect native mobile status bar (9:41, Cellular, Wi-Fi, Battery)
        await page.evaluate(({ dev }) => {
          const existing = document.getElementById('native-store-status-bar');
          if (existing) existing.remove();

          // Check if modal dialog or sheet backdrop is active
          const hasModal = !!(
            document.querySelector(
              '.fixed.inset-0.bg-black\\/35, .fixed.inset-0.bg-black\\/40, .fixed.inset-0.bg-black\\/50, .fixed.inset-0.bg-black\\/60, .modal-backdrop'
            ) || document.querySelector('[role="dialog"]')
          );
          const isDarkTheme =
            document.documentElement.getAttribute('data-theme') === 'obsidian' ||
            document.documentElement.getAttribute('data-theme') === 'espresso' ||
            document.documentElement.getAttribute('data-theme') === 'oxford' ||
            document.documentElement.classList.contains('dark');

          const isLightText = hasModal || isDarkTheme;
          const color = isLightText ? '#FFFFFF' : '#111113';

          const { height, paddingX, fontSize } = dev.statusBar;

          const bar = document.createElement('div');
          bar.id = 'native-store-status-bar';
          bar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            width: 100%;
            height: ${height}px;
            padding: 0 ${paddingX}px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-sizing: border-box;
            z-index: 99999999;
            pointer-events: none;
            color: ${color};
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", system-ui, sans-serif;
            user-select: none;
          `;

          bar.innerHTML = `
            <div style="font-weight: 600; font-size: ${fontSize}px; letter-spacing: -0.2px; line-height: 1;">
              9:41
            </div>
            <div style="display: flex; align-items: center; gap: 7px;">
              <!-- Cellular Signal (4 bars) -->
              <svg width="17" height="12" viewBox="0 0 17 12" fill="none" style="display: block;">
                <rect x="0.5" y="8.5" width="2.5" height="3" rx="0.6" fill="${color}"/>
                <rect x="4.5" y="6" width="2.5" height="5.5" rx="0.6" fill="${color}"/>
                <rect x="8.5" y="3.5" width="2.5" height="8" rx="0.6" fill="${color}"/>
                <rect x="12.5" y="0.5" width="2.5" height="11" rx="0.6" fill="${color}"/>
              </svg>
              <!-- Wi-Fi (3 arcs + dot) -->
              <svg width="16" height="12" viewBox="0 0 16 12" fill="${color}" style="display: block;">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M8 1.5C10.74 1.5 13.25 2.58 15.09 4.36C15.34 4.6 15.34 5 15.09 5.25L13.8 6.54C13.56 6.78 13.17 6.79 12.92 6.56C11.62 5.37 9.89 4.63 8 4.63C6.11 4.63 4.38 5.37 3.08 6.56C2.83 6.79 2.44 6.78 2.2 6.54L0.91 5.25C0.66 5 0.66 4.6 0.91 4.36C2.75 2.58 5.26 1.5 8 1.5ZM8 6C9.6 6 11.06 6.64 12.14 7.69C12.39 7.93 12.39 8.33 12.14 8.58L8.53 12.19C8.24 12.48 7.76 12.48 7.47 12.19L3.86 8.58C3.61 8.33 3.61 7.93 3.86 7.69C4.94 6.64 6.4 6 8 6Z"/>
              </svg>
              <!-- Battery (Pill + Level + Nub) -->
              <svg width="25" height="12" viewBox="0 0 25 12" fill="none" style="display: block;">
                <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="${color}" stroke-width="1" opacity="0.4"/>
                <rect x="2" y="2" width="18" height="8" rx="2" fill="${color}"/>
                <path d="M23 4.5C23.6 4.8 24 5.3 24 6C24 6.7 23.6 7.2 23 7.5" stroke="${color}" stroke-width="1" stroke-linecap="round" opacity="0.4"/>
              </svg>
            </div>
          `;

          document.body.appendChild(bar);
        }, { dev });

        await page.waitForTimeout(200);

        const outFilePath = path.join(outputFolder, `${target.name}.png`);
        await page.screenshot({ path: outFilePath });
        console.log(`  ✓ Saved: ${target.name}.png`);

        await page.close();
      }

      await context.close();
    }

    console.log('\n🎉 All store screenshots successfully captured with Playwright!');
  } finally {
    await browser.close();
    await new Promise((resolve) => previewServer.httpServer.close(resolve));
    console.log('Server stopped.');
  }
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
