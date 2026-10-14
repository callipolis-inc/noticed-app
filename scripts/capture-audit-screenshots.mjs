import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const rootDir = path.resolve('D:/Project/noticed/Noticed-Mobile');
const distDir = path.join(rootDir, 'dist');
const auditDir = path.join(rootDir, 'docs', 'audit');

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
  { name: 'bookshelf', query: '?demo=1&view=bookshelf' },
  { name: 'notebook', query: '?demo=1&view=notebook' },
  { name: 'create-note', query: '?demo=1&view=notebook&sheet=create' },
  { name: 'profile-vault', query: '?demo=1&view=bookshelf&sheet=profile' },
];

const viewports = [
  { prefix: 'mobile-375px', width: 375, height: 812, scale: 2 },
  { prefix: 'tablet-768px', width: 768, height: 1024, scale: 1 },
  { prefix: 'desktop-1440px', width: 1440, height: 900, scale: 1 },
];

server.listen(4174, '127.0.0.1', async () => {
  console.log('Static audit server active at http://127.0.0.1:4174');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }

  try {
    for (const vp of viewports) {
      for (const target of targets) {
        const outFileName = `${vp.prefix}-${target.name}.png`;
        const outFilePath = path.join(auditDir, outFileName);
        const url = `http://127.0.0.1:4174${target.query}`;

        const args = [
          '--headless=new',
          '--hide-scrollbars',
          `--window-size=${vp.width},${vp.height}`,
          `--force-device-scale-factor=${vp.scale}`,
          '--virtual-time-budget=2000',
          `--screenshot=${outFilePath}`,
          url,
        ];

        console.log(`Capturing [${vp.prefix}] ${target.name}...`);
        await execFileAsync(chromePath, args);
        console.log(`✓ Saved: ${outFileName}`);
      }
    }
    console.log('\n🎉 Audit screenshots captured successfully!');
  } catch (err) {
    console.error('Error capturing audit screenshots:', err);
  } finally {
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  }
});
