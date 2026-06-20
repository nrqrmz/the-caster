// src/scenes/spriteBaker.js
// Phaser-coupled. Forges a set of sprite recipes into textures + anims on a
// scene's global TextureManager, chunked across frames so it can run during an
// IntroScene without freezing it. Idempotent: skips textures/anims already made.
import { COLORS, spriteKey, frameKey } from '../config.js';
import { RECIPES, paletteFor } from '../data/sprites/recipes.js';
import { PARTS } from '../data/sprites/parts.js';
import { forge } from '../systems/SpriteForge.js';
import { ENEMY_TYPES } from '../data/enemies/index.js';
import { derivePalette, NAMED_PALETTES } from '../data/sprites/palettes.js';

// Mirror every composed frame horizontally (for `flip:true` recipes drawn facing left).
function mirrorFrames(out) {
  for (const frames of Object.values(out.anims)) {
    for (let i = 0; i < frames.length; i++) {
      frames[i] = frames[i].map((row) => [...row].reverse());
    }
  }
}

// A part-ref may name its own palette ({palette:'skin'}) or a base color ({color, accent?}).
function resolvePartPalette(ref) {
  if (typeof ref !== 'object') return null;
  if (ref.palette) {
    const p = NAMED_PALETTES[ref.palette];
    if (!p) throw new Error(`spriteBaker: unknown part palette '${ref.palette}'`);
    return p;
  }
  if (ref.color != null) return derivePalette(ref.color, ref.accent != null ? { accent: ref.accent } : {});
  return null;
}

// grid = 2D array of color ints or null (transparent).
function paintGrid(scene, texKey, grid) {
  const g = scene.add.graphics();
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const c = grid[y][x];
      if (c == null) continue;
      g.fillStyle(c, 1);
      g.fillRect(x, y, 1, 1);
    }
  }
  g.generateTexture(texKey, grid[0].length, grid.length);
  g.destroy();
}

// Paint every frame to its own texture, register one anim per `${key}-${animName}`,
// and register the base texture spriteKey(key) = idle-down frame 0.
function paintForged(scene, key, out) {
  for (const [animName, frames] of Object.entries(out.anims)) {
    const frameKeys = [];
    for (let i = 0; i < frames.length; i++) {
      const tkey = frameKey(key, animName, i);
      paintGrid(scene, tkey, frames[i]);
      frameKeys.push({ key: tkey });
    }
    const animKey = `${key}-${animName}`;
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: frameKeys,
        frameRate: out.fps,
        repeat: animName.startsWith('attack') ? 0 : -1, // attacks play once
      });
    }
  }
  paintGrid(scene, spriteKey(key), out.anims['idle-down'][0]);
}

// Forge one recipe into its textures + anims.
function bakeOne(scene, key) {
  const recipe = RECIPES[key];
  // Per-creature color: explicit recipe.baseColor (projectiles) > enemy def color > caster fallback.
  const baseColor = recipe.baseColor ?? ENEMY_TYPES[key]?.color ?? COLORS.caster;
  const palette = paletteFor(key, baseColor);
  const out = forge(recipe, PARTS, palette, (ref) => resolvePartPalette(ref));
  if (recipe.flip) mirrorFrames(out);
  paintForged(scene, key, out);
}

const nextFrame = (scene) => new Promise((resolve) => scene.time.delayedCall(0, resolve));

// Forge `keys` (those with a recipe, not already forged), chunked across frames.
export async function bakeSprites(scene, keys, { chunkSize = 4, onProgress } = {}) {
  const todo = [...new Set(keys)].filter((k) => RECIPES[k] && !scene.textures.exists(spriteKey(k)));
  for (let i = 0; i < todo.length; i++) {
    bakeOne(scene, todo[i]);
    if (onProgress) onProgress(i + 1, todo.length);
    if ((i + 1) % chunkSize === 0 && i + 1 < todo.length) await nextFrame(scene);
  }
}
