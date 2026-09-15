// tools/preview-fire-advanced.mjs
// PNG de revisión de los enemigos restantes de Fuego (ver tools/lib/sheetPreview.mjs). La
// referencia se muestra a ×1 (las figuras ya miden ~280 px de alto).
// Run: node tools/preview-fire-advanced.mjs <out.png> [key,key,…]
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng, encodePng } from './lib/png.mjs';
import { renderSheetPreview } from './lib/sheetPreview.mjs';
import { REF_PATH, FIGURES } from './fire-advanced-figures.mjs';
import { forge } from '../src/systems/SpriteForge.js';
import { PARTS } from '../src/data/sprites/parts.js';
import { derivePalette } from '../src/data/sprites/palettes.js';
import { fireAdvancedRecipe } from '../src/data/sprites/recipes.js';

const [outPath, keyArg] = process.argv.slice(2);
if (!outPath) { console.error('usage: node tools/preview-fire-advanced.mjs <out.png> [key,key,…]'); process.exit(1); }
const keys = keyArg ? keyArg.split(',') : Object.keys(FIGURES);

const items = keys.map((key) => {
  const recipe = fireAdvancedRecipe(key, 'beast');
  return { fig: FIGURES[key], recipe, grid: forge(recipe, PARTS, derivePalette(0x888888)).anims['idle-down'][0] };
});
const preview = renderSheetPreview(decodePng(readFileSync(REF_PATH)), items, { refScale: 1 });
writeFileSync(outPath, encodePng(preview));
console.log('preview', outPath, `${preview.width}×${preview.height}`, keys.join(', '));
