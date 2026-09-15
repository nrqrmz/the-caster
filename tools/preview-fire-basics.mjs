// tools/preview-fire-basics.mjs
// PNG de revisión de los villanos básicos de Fuego (ver tools/lib/sheetPreview.mjs).
// Run: node tools/preview-fire-basics.mjs <out.png> [key,key,…]
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './lib/png.mjs';
import { renderSheetPreview } from './lib/sheetPreview.mjs';
import { REF_PATH, FIGURES } from './fire-basics-figures.mjs';
import { forge } from '../src/systems/SpriteForge.js';
import { PARTS } from '../src/data/sprites/parts.js';
import { derivePalette } from '../src/data/sprites/palettes.js';
import { fireBasicRecipe } from '../src/data/sprites/recipes.js';

const [outPath, keyArg] = process.argv.slice(2);
if (!outPath) { console.error('usage: node tools/preview-fire-basics.mjs <out.png> [key,key,…]'); process.exit(1); }
const keys = keyArg ? keyArg.split(',') : Object.keys(FIGURES);

const items = keys.map((key) => {
  const recipe = fireBasicRecipe(key, 'humanoid');
  return { fig: FIGURES[key], recipe, grid: forge(recipe, PARTS, derivePalette(0x888888)).anims['idle-down'][0] };
});
const preview = renderSheetPreview(decodePng(readFileSync(REF_PATH)), items, { refScale: 2 });
writeFileSync(outPath, encodePng(preview));
console.log('preview', outPath, `${preview.width}×${preview.height}`, keys.join(', '));
