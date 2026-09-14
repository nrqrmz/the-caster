// Dev preview: forge the REAL tortuga_acorazada recipe (same path as spriteBaker) and
// write an enlarged PNG strip — down, up, side, walk-down ×4, idle breath.
// Run: node tools/preview-turtle.mjs <out.png>
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { forge } from '../src/systems/SpriteForge.js';
import { getRecipe, paletteFor } from '../src/data/sprites/recipes.js';
import { PARTS } from '../src/data/sprites/parts.js';
import { NAMED_PALETTES } from '../src/data/sprites/palettes.js';
import { COLORS } from '../src/config.js';

const outPath = process.argv[2];
if (!outPath) { console.error('usage: node tools/preview-turtle.mjs <out.png>'); process.exit(1); }

const partPalette = (ref) => (ref.palette ? NAMED_PALETTES[ref.palette] : null);
const { anims } = forge(getRecipe('tortuga_acorazada'), PARTS, paletteFor('tortuga_acorazada', COLORS.turtleGreen), partPalette);
const frames = [anims['idle-down'][0], anims['idle-up'][0], anims['idle-side'][0], ...anims['walk-down'], anims['idle-down'][1]];

const S = 6, PAD = 8, FW = frames[0][0].length, FH = frames[0].length;
const W = frames.length * (FW * S + PAD) + PAD, H = FH * S + 2 * PAD;
const rgb = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) { rgb[i * 3] = 0x1e; rgb[i * 3 + 1] = 0x3a; rgb[i * 3 + 2] = 0x4a; } // water-ish backdrop
frames.forEach((f, k) => {
  const ox = PAD + k * (FW * S + PAD);
  for (let y = 0; y < FH * S; y++) for (let x = 0; x < FW * S; x++) {
    const c = f[(y / S) | 0][(x / S) | 0];
    if (c == null) continue;
    const i = ((PAD + y) * W + ox + x) * 3;
    rgb[i] = c >> 16; rgb[i + 1] = (c >> 8) & 255; rgb[i + 2] = c & 255;
  }
});

// Minimal RGB PNG encoder (node:zlib only).
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
const raw = Buffer.alloc((W * 3 + 1) * H);
for (let y = 0; y < H; y++) rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3); // filter byte 0 per row
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2;
writeFileSync(outPath, Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
]));
console.log('preview', outPath, `${W}×${H}`);
