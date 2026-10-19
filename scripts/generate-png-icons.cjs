const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation for PNG chunks
function makeCRCTable() {
  let c;
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[n] = c;
  }
  return crcTable;
}

const crcTable = makeCRCTable();

function crc32(buf) {
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  buf.writeUInt32BE(crc32(typeAndData), 8 + len);
  return buf;
}

function createPng(width, height, drawPixel) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with filter byte 0 at start of each scanline
  const scanlineLength = 1 + width * 4;
  const raw = Buffer.alloc(height * scanlineLength);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    raw[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawPixel(x, y, width, height);
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Brand icon drawer matching Valendo's dark squircle and vivid checkmark
function drawBrandIcon(x, y, width, height, isMaskable = false) {
  const nx = x / width;
  const ny = y / height;

  // Background
  const bgR = 15;
  const bgG = 15;
  const bgB = 18;

  // Squircle / safe zone
  const cx = 0.5;
  const cy = 0.5;
  const dx = Math.abs(nx - cx);
  const dy = Math.abs(ny - cy);

  if (isMaskable) {
    // Solid background all over for Android maskable safe zone
  } else {
    // Rounded corner clamp
    const cornerRadius = 0.26;
    if (dx > 0.5 - cornerRadius && dy > 0.5 - cornerRadius) {
      const cornerDist = Math.hypot(dx - (0.5 - cornerRadius), dy - (0.5 - cornerRadius));
      if (cornerDist > cornerRadius) {
        return [0, 0, 0, 0]; // transparent outside squircle
      }
    }
  }

  // Checkmark "V" geometry
  // Left arm of V: from (0.30, 0.35) down to (0.48, 0.72)
  // Right arm of V: from (0.48, 0.72) up to (0.76, 0.28)
  const distToLeftArm = distToSegment(nx, ny, 0.30, 0.36, 0.48, 0.72);
  const distToRightArm = distToSegment(nx, ny, 0.48, 0.72, 0.74, 0.28);
  const strokeWidth = 0.085;

  // Spark dot at (0.76, 0.68)
  const distToSpark = Math.hypot(nx - 0.74, ny - 0.68);

  if (distToSpark < 0.065) {
    // Amber Sparkle Dot
    return [251, 191, 36, 255]; // #fbbf24
  }

  if (distToLeftArm < strokeWidth) {
    // Coral to Amber gradient
    const t = (ny - 0.36) / 0.36;
    const r = Math.round(251 - t * 0);
    const g = Math.round(113 + t * 78);
    const b = Math.round(133 - t * 97);
    return [r, g, b, 255];
  }

  if (distToRightArm < strokeWidth) {
    // Emerald to Sky checkmark gradient
    const t = (ny - 0.28) / 0.44;
    const r = Math.round(56 + t * (16 - 56));
    const g = Math.round(189 + t * (185 - 189));
    const b = Math.round(248 + t * (129 - 248));
    return [r, g, b, 255];
  }

  // Border outline
  if (!isMaskable && (dx > 0.47 || dy > 0.47)) {
    return [39, 39, 42, 255]; // zinc-800
  }

  return [bgR, bgG, bgB, 255];
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

const publicDir = path.join(__dirname, '..', 'public');

console.log('Generating PWA PNG icons in', publicDir);

const sizes = [
  { file: 'pwa-192x192.png', size: 192, maskable: false },
  { file: 'pwa-512x512.png', size: 512, maskable: false },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
  { file: 'pwa-maskable-512x512.png', size: 512, maskable: true },
];

sizes.forEach(({ file, size, maskable }) => {
  const png = createPng(size, size, (x, y, w, h) => drawBrandIcon(x, y, w, h, maskable));
  const outPath = path.join(publicDir, file);
  fs.writeFileSync(outPath, png);
  console.log(`Created ${file} (${size}x${size}) - ${png.length} bytes`);
});
