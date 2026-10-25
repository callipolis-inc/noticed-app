import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const rootDir = path.resolve('D:/Project/noticed/Noticed-Mobile');
const distDir = path.join(rootDir, 'dist');
const outputFile = path.join(rootDir, 'paywall_review_screenshot.png');

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

server.listen(4174, '127.0.0.1', async () => {
  console.log('Static preview server active at http://127.0.0.1:4174');
  
  // Find Chrome or Edge executable
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];

  let browserPath = chromePaths.find((p) => fs.existsSync(p));
  if (!browserPath) {
    console.error('No supported browser found.');
    server.close();
    process.exit(1);
  }

  console.log(`Using browser: ${browserPath}`);
  const targetUrl = 'http://127.0.0.1:4174?demo=1&modal=pro';

  // 430 x 932 at scale factor 3 = 1290 x 2796 (iPhone 14/15/16 Pro Max official App Store screenshot size)
  const args = [
    '--headless=new',
    '--hide-scrollbars',
    '--window-size=430,932',
    '--force-device-scale-factor=3',
    '--virtual-time-budget=3000',
    `--screenshot=${outputFile}`,
    targetUrl,
  ];

  try {
    console.log(`Capturing paywall review screenshot (1290x2796) to ${outputFile}...`);
    await execFileAsync(browserPath, args);
    console.log('✓ Capture command executed.');

    if (fs.existsSync(outputFile)) {
      const stats = fs.statSync(outputFile);
      console.log(`✓ paywall_review_screenshot.png generated successfully (${stats.size} bytes)!`);
    } else {
      console.error('Screenshot file was not generated.');
    }
  } catch (err) {
    console.error('Error executing headless browser screenshot:', err);
  } finally {
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  }
});
