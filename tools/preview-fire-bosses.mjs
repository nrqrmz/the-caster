// tools/preview-fire-bosses.mjs
// PNG de revisión de los jefes de Fuego y la Escolta del Templo (ver tools/lib/sheetPreview.mjs).
// Cada figura lleva su propia referencia (item.img); se muestra a ×1.
// Run: node tools/preview-fire-bosses.mjs <out.png> [key,key,…]
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './lib/png.mjs';
import { renderSheetPreview } from './lib/sheetPreview.mjs';
import { FIGURES } from './fire-bosses-figures.mjs';
import { forge } from '../src/systems/SpriteForge.js';
import { PARTS } from '../src/data/sprites/parts.js';
import { derivePalette } from '../src/data/sprites/palettes.js';
import { fireBossRecipe } from '../src/data/sprites/recipes.js';

const [outPath, keyArg] = process.argv.slice(2);
if (!outPath) { console.error('usage: node tools/preview-fire-bosses.mjs <out.png> [key,key,…]'); process.exit(1); }
const keys = keyArg ? keyArg.split(',') : Object.keys(FIGURES);

const items = keys.map((key) => {
  const fig = FIGURES[key];
  const recipe = fireBossRecipe(key, 'boss');
  return { fig, img: decodePng(readFileSync(fig.ref)), recipe, grid: forge(recipe, PARTS, derivePalette(0x888888)).anims['idle-down'][0] };
});
const preview = renderSheetPreview(items[0].img, items, { refScale: 1 });
writeFileSync(outPath, encodePng(preview));
console.log('preview', outPath, `${preview.width}×${preview.height}`, keys.join(', '));
