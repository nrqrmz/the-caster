// tools/preview-fire-basics.mjs
// PNG de revisión para el usuario: por criatura, el recorte de la referencia (×2), el sprite
// forjado con la receta real (×6, cuadro del cuerpo en cian) y el sprite a ×2 sobre fondo
// oscuro y sobre suelo de lava (tamaño aproximado en móvil).
// Run: node tools/preview-fire-basics.mjs <out.png> [key,key,…]
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './lib/png.mjs';
import { REF_PATH, FIGURES } from './fire-basics-figures.mjs';
import { forge } from '../src/systems/SpriteForge.js';
import { PARTS } from '../src/data/sprites/parts.js';
import { derivePalette } from '../src/data/sprites/palettes.js';
import { fireBasicRecipe } from '../src/data/sprites/recipes.js';

const [outPath, keyArg] = process.argv.slice(2);
if (!outPath) { console.error('usage: node tools/preview-fire-basics.mjs <out.png> [key,key,…]'); process.exit(1); }
const keys = keyArg ? keyArg.split(',') : Object.keys(FIGURES);

const ref = decodePng(readFileSync(REF_PATH));
const S = 6, PAD = 12, BACK = 0x1a1224, DARK = 0x0e0a16, LAVA = 0x4a2a1a, BODYLINE = 0x00e5ff;
const items = keys.map((key) => {
  const recipe = fireBasicRecipe(key, 'humanoid');
  const grid = forge(recipe, PARTS, derivePalette(0x888888)).anims['idle-down'][0];
  return { key, fig: FIGURES[key], recipe, grid };
});
const refW = (f) => (f.slot[1] - f.slot[0] + 1) * 2, refH = (f) => (f.rows[1] - f.rows[0] + 1) * 2;
const cellW = (it) => refW(it.fig) + PAD + it.recipe.gridW * S + PAD + it.recipe.gridW * 2 + PAD * 3;
const W = PAD + items.reduce((w, it) => w + cellW(it), 0);
const H = PAD * 2 + Math.max(...items.map((it) => Math.max(refH(it.fig), it.recipe.gridH * S)));
const data = new Uint8Array(W * H * 4);
const set = (x, y, c) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  data[i] = (c >> 16) & 255; data[i + 1] = (c >> 8) & 255; data[i + 2] = c & 255; data[i + 3] = 255;
};
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, BACK);
const blit = (grid, ox, oy, k, ground) => {
  for (let y = 0; y < grid.length * k; y++) for (let x = 0; x < grid[0].length * k; x++) {
    const c = grid[(y / k) | 0][(x / k) | 0];
    set(ox + x, oy + y, c ?? ground);
  }
};

let ox = PAD;
for (const it of items) {
  const { fig, recipe, grid } = it;
  for (let y = 0; y < refH(fig); y++) for (let x = 0; x < refW(fig); x++) {
    const i = ((fig.rows[0] + (y >> 1)) * ref.width + fig.slot[0] + (x >> 1)) * 4;
    set(ox + x, H - PAD - refH(fig) + y, (ref.data[i] << 16) | (ref.data[i + 1] << 8) | ref.data[i + 2]);
  }
  ox += refW(fig) + PAD;
  const top = H - PAD - recipe.gridH * S;
  blit(grid, ox, top, S, DARK);
  const bx = ox + recipe.body.x * S, by = top + recipe.body.y * S, side = 32 * S;
  for (let t = 0; t < side; t++) { set(bx + t, by, BODYLINE); set(bx + t, by + side - 1, BODYLINE); set(bx, by + t, BODYLINE); set(bx + side - 1, by + t, BODYLINE); }
  ox += recipe.gridW * S + PAD;
  blit(grid, ox, H - PAD - recipe.gridH * 2 * 2 - PAD, 2, DARK);
  blit(grid, ox, H - PAD - recipe.gridH * 2, 2, LAVA);
  ox += recipe.gridW * 2 + PAD * 3;
}
writeFileSync(outPath, encodePng({ width: W, height: H, data }));
console.log('preview', outPath, `${W}×${H}`, keys.join(', '));
