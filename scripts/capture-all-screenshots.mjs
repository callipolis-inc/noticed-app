import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const rootDir = path.resolve('D:/Project/noticed/Noticed-Mobile');
const distDir = path.join(rootDir, 'dist');
const storeAssetsDir = path.join(rootDir, 'store-assets', 'screenshots');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(distDir, urlPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
  fs.createReadStream(filePath).pipe(res);
});

const targets = [
  {
    name: '01-bookshelf-library',
    query: '?demo=1&view=bookshelf',
  },
  {
    name: '02-notebook-chronicle',
    query: '?demo=1&view=notebook',
  },
  {
    name: '03-create-field-note',
    query: '?demo=1&view=notebook&sheet=create',
  },
  {
    name: '04-author-profile-vault',
    query: '?demo=1&view=bookshelf&sheet=profile',
  },
];

const devices = [
  {
    deviceDir: 'ios-6.7-inch',
    width: 430,
    height: 932,
    scale: 3, // 1290 x 2796
  },
  {
    deviceDir: 'ios-6.5-inch',
    width: 414,
    height: 896,
    scale: 3, // 1242 x 2688
  },
  {
    deviceDir: 'android-phone',
    width: 360,
    height: 800,
    scale: 3, // 1080 x 2400
  },
];

server.listen(4173, '127.0.0.1', async () => {
  console.log('Static preview server active at http://127.0.0.1:4173');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  try {
    for (const dev of devices) {
      const outputFolder = path.join(storeAssetsDir, dev.deviceDir);
      if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder, { recursive: true });
      }

      for (const target of targets) {
        const outFilePath = path.join(outputFolder, `${target.name}.png`);
        const url = `http://127.0.0.1:4173${target.query}`;

        const args = [
          '--headless=new',
          '--hide-scrollbars',
          `--window-size=${dev.width},${dev.height}`,
          `--force-device-scale-factor=${dev.scale}`,
          '--virtual-time-budget=2500',
          `--screenshot=${outFilePath}`,
          url,
        ];

        console.log(`Capturing [${dev.deviceDir}] ${target.name}...`);
        await execFileAsync(chromePath, args);
        console.log(`✓ Saved: ${outFilePath}`);
      }
    }
    console.log('\n🎉 All store screenshots captured successfully across all required resolutions!');
  } catch (err) {
    console.error('Error capturing screenshots:', err);
  } finally {
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  }
});
