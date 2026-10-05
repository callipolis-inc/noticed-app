const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// 1. PNG ENCODER & DECODER UTILITY (Built with native Node.js zlib)
function decodePNG(filePath) {
  const buf = fs.readFileSync(filePath);
  let offset = 8;
  const idats = [];
  let width = 0;
  let height = 0;

  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
    if (type === 'IHDR') {
      width = buf.readUInt32BE(offset + 8);
      height = buf.readUInt32BE(offset + 12);
    } else if (type === 'IDAT') {
      idats.push(buf.subarray(offset + 8, offset + 8 + len));
    }
    offset += 12 + len;
  }

  const rawDecompressed = zlib.inflateSync(Buffer.concat(idats));
  const rowSize = width * 4 + 1;
  const pixels = Buffer.alloc(width * height * 4);

  // De-filter scanlines (all are filter type 0 in our source)
  for (let y = 0; y < height; y++) {
    const filter = rawDecompressed[y * rowSize];
    if (filter === 0) {
      rawDecompressed.copy(pixels, y * width * 4, y * rowSize + 1, (y + 1) * rowSize);
    } else {
      throw new Error(`Unsupported PNG filter type: ${filter}`);
    }
  }

  return { width, height, pixels };
}

function encodePNG(width, height, rgbaBuffer) {
  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // Filter 0 (None)
    rgbaBuffer.copy(raw, y * rowSize + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  function makeChunk(type, data) {
    const chunk = Buffer.alloc(12 + data.length);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    const crc = zlib.crc32(chunk.subarray(4, 8 + data.length));
    chunk.writeUInt32BE(crc, 8 + data.length);
    return chunk;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);  // 8 bits per channel
  ihdr.writeUInt8(6, 9);  // RGBA
  ihdr.writeUInt8(0, 10); // Deflate
  ihdr.writeUInt8(0, 11); // Standard filter
  ihdr.writeUInt8(0, 12); // No interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// 2. MAIN SCRIPT
console.log('Loading source transparent artwork...');
const sourceLogoPath = path.join(__dirname, '../public/logo-dark.png');
const { width, height, pixels: srcPixels } = decodePNG(sourceLogoPath);
console.log(`Source resolution: ${width}x${height}`);

// Backup transparent versions if not already backed up
const backupDark = path.join(__dirname, '../public/logo-transparent-dark.png');
const backupLight = path.join(__dirname, '../public/logo-transparent-light.png');
if (!fs.existsSync(backupDark)) {
  fs.copyFileSync(path.join(__dirname, '../public/logo-dark.png'), backupDark);
  fs.copyFileSync(path.join(__dirname, '../public/logo-light.png'), backupLight);
  console.log('Backed up transparent source assets to public/logo-transparent-*.png');
}

// Extract normalized Alpha channel into Float32Array for high-precision convolution
const alphaChannel = new Float32Array(width * height);
for (let y = 0; y < height; y++) {
  const rowOffset = y * width * 4;
  for (let x = 0; x < width; x++) {
    alphaChannel[y * width + x] = srcPixels[rowOffset + x * 4 + 3] / 255;
  }
}

// Optical Center of the artwork (flower + hand)
const artCenterX = 734;
const artCenterY = 725;

// Deterministic Pseudo-random hash for realistic linen paper & frosted silica texture
function noise(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
  return n - Math.floor(n);
}

// ============================================================================
// GENERATE LIGHT MODE ICON: Alabaster Linen & Letterpress Intaglio
// ============================================================================
console.log('Generating Light Mode Icon (Alabaster Linen & Letterpress Intaglio)...');
const lightPixels = Buffer.alloc(width * height * 4);

for (let y = 0; y < height; y++) {
  const tY = y / (height - 1); // 0 at top, 1 at bottom
  const ny = (y - 750) / 750;

  for (let x = 0; x < width; x++) {
    const nx = (x - 750) / 750;
    const pIdx = y * width + x;
    const a = alphaChannel[pIdx];

    // Distance from optical artwork center
    const dx = (x - artCenterX) / 750;
    const dy = (y - artCenterY) / 750;
    const distArt = Math.sqrt(dx * dx + dy * dy);

    // 1. Base Vertical Elevation & Ambient Glow
    // Top: Warm alabaster cream #FBF9F5 (251, 249, 245)
    // Bottom: Rich tactile parchment #EBE5DB (235, 229, 219)
    // Center glow: Subtle warm bloom behind the flower
    const artBloom = Math.max(0, 1 - distArt * 1.6);
    let r = 251 - tY * 16 + artBloom * 4;
    let g = 249 - tY * 20 + artBloom * 3;
    let b = 245 - tY * 26 + artBloom * 2;

    // 2. Corner Vignette / Pillowed Squircle Volume (Very soft edge roll-off)
    const cornerSq = Math.pow(Math.abs(nx), 3.2) + Math.pow(Math.abs(ny), 3.2);
    const vignette = Math.min(1, cornerSq);
    r -= vignette * 7;
    g -= vignette * 8;
    b -= vignette * 10;

    // 3. Apple-style Top Specular Bevel (1-8px)
    if (y < 8) {
      const topSpec = (1 - y / 8) * 8;
      r += topSpec;
      g += topSpec;
      b += topSpec;
    }

    // 4. Tactile Linen & Cotton Paper Micro-Texture (±2.5 luminance variation)
    const grain = (noise(x, y) - 0.5) * 4.2;
    // Micro-woven weave pattern (2x2 grid)
    const weave = ((x % 2 === 0) ^ (y % 2 === 0)) ? 1.0 : -1.0;
    const paperTexture = grain + weave * 0.8;
    r += paperTexture;
    g += paperTexture;
    b += paperTexture;

    // 5. Letterpress Deboss / Intaglio Catch-Light & Groove Shadow
    // Bottom ridge catch-light (light hits the bottom ridge of the pressed indentation)
    const aTop = y > 2 ? alphaChannel[(y - 3) * width + x] : 0;
    const aBottom = y < height - 3 ? alphaChannel[(y + 3) * width + x] : 0;
    const aLeft = x > 2 ? alphaChannel[y * width + (x - 2)] : 0;
    const aRight = x < width - 3 ? alphaChannel[y * width + (x + 2)] : 0;

    // Deboss specular catch-light along bottom-right edge of stroke
    const catchLight = Math.max(0, aTop - a) * 0.45;
    r += catchLight * 18;
    g += catchLight * 16;
    b += catchLight * 12;

    // Deboss groove shadow along top-left edge of stroke
    const grooveShadow = Math.max(0, aBottom - a) * 0.35;
    r -= grooveShadow * 22;
    g -= grooveShadow * 22;
    b -= grooveShadow * 22;

    // 6. Deep Carbon Ink Stamping (#181615)
    if (a > 0) {
      // Carbon ink tone with slight warm undertone
      const inkR = 24;
      const inkG = 22;
      const inkB = 21;

      // Anti-aliased alpha blending
      r = r * (1 - a) + inkR * a;
      g = g * (1 - a) + inkG * a;
      b = b * (1 - a) + inkB * a;
    }

    // Clamp values 0-255
    const outOffset = (y * width + x) * 4;
    lightPixels[outOffset] = Math.min(255, Math.max(0, Math.round(r)));
    lightPixels[outOffset + 1] = Math.min(255, Math.max(0, Math.round(g)));
    lightPixels[outOffset + 2] = Math.min(255, Math.max(0, Math.round(b)));
    lightPixels[outOffset + 3] = 255; // Fully opaque
  }
}

const lightPng = encodePNG(width, height, lightPixels);
fs.writeFileSync(path.join(__dirname, '../public/logo-light.png'), lightPng);
console.log(`Saved public/logo-light.png (${(lightPng.length / 1024).toFixed(1)} KB)`);

// ============================================================================
// GENERATE DARK MODE ICON: Smoked Obsidian Glass & Frosted Titanium Coin
// ============================================================================
console.log('Generating Dark Mode Icon (Smoked Obsidian Glass & Frosted Titanium Coin)...');
const darkPixels = Buffer.alloc(width * height * 4);

for (let y = 0; y < height; y++) {
  const tY = y / (height - 1);
  const ny = (y - 750) / 750;

  for (let x = 0; x < width; x++) {
    const nx = (x - 750) / 750;
    const pIdx = y * width + x;
    const a = alphaChannel[pIdx];

    const dx = (x - artCenterX) / 750;
    const dy = (y - artCenterY) / 750;
    const distArt = Math.sqrt(dx * dx + dy * dy);

    // 1. Smoked Obsidian Base Palette
    // Top: Deep warm obsidian #1D1C22 (29, 28, 34)
    // Bottom: Velvety pure obsidian #0D0C0F (13, 12, 15)
    // Center: Soft celestial moonlight bloom behind the flower
    const celestialBloom = Math.max(0, 1 - distArt * 1.5);
    let r = 29 - tY * 16 + celestialBloom * 12;
    let g = 28 - tY * 16 + celestialBloom * 11;
    let b = 34 - tY * 19 + celestialBloom * 16;

    // 2. Corner Roll-off (Pillowed coin perimeter)
    const cornerSq = Math.pow(Math.abs(nx), 3.2) + Math.pow(Math.abs(ny), 3.2);
    const vignette = Math.min(1, cornerSq);
    r -= vignette * 7;
    g -= vignette * 7;
    b -= vignette * 9;

    // 3. Apple-style Top Specular Caustic Hairline (Dynamic Island rim)
    if (y < 6) {
      const causticRim = (1 - y / 6) * 32;
      r += causticRim;
      g += causticRim;
      b += causticRim * 1.1;
    }

    // 4. Frosted Silica Glass Micro-Grain Texture (±1.6 variation)
    const glassNoise = (noise(x, y) - 0.5) * 3.2;
    r += glassNoise;
    g += glassNoise;
    b += glassNoise;

    // 5. Ambient Caustic Halo around Artwork (Delicate 3px luminous aura)
    const aTop = y > 2 ? alphaChannel[(y - 3) * width + x] : 0;
    const aBottom = y < height - 3 ? alphaChannel[(y + 3) * width + x] : 0;
    const aLeft = x > 2 ? alphaChannel[y * width + (x - 2)] : 0;
    const aRight = x < width - 3 ? alphaChannel[y * width + (x + 2)] : 0;

    const neighborAlpha = (aTop + aBottom + aLeft + aRight) * 0.25;
    if (a < 0.8 && neighborAlpha > 0.05) {
      const halo = (neighborAlpha - a) * 16;
      r += halo;
      g += halo;
      b += halo * 1.2;
    }

    // 6. Radiant Porcelain Ivory Line Art (#FAF7F2)
    if (a > 0) {
      // Crisp ivory with subtle top bevel
      const topBevel = Math.max(0, aBottom - aTop) * 18;
      const strokeR = Math.min(255, 250 + topBevel);
      const strokeG = Math.min(255, 247 + topBevel);
      const strokeB = Math.min(255, 242 + topBevel);

      // Alpha blend
      r = r * (1 - a) + strokeR * a;
      g = g * (1 - a) + strokeG * a;
      b = b * (1 - a) + strokeB * a;
    }

    const outOffset = (y * width + x) * 4;
    darkPixels[outOffset] = Math.min(255, Math.max(0, Math.round(r)));
    darkPixels[outOffset + 1] = Math.min(255, Math.max(0, Math.round(g)));
    darkPixels[outOffset + 2] = Math.min(255, Math.max(0, Math.round(b)));
    darkPixels[outOffset + 3] = 255; // Fully opaque
  }
}

const darkPng = encodePNG(width, height, darkPixels);
fs.writeFileSync(path.join(__dirname, '../public/logo-dark.png'), darkPng);
console.log(`Saved public/logo-dark.png (${(darkPng.length / 1024).toFixed(1)} KB)`);

console.log('Done! Both app icons successfully generated with luxury bespoke backgrounds.');
