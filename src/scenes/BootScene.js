import { COLORS, TEX, spriteKey, frameKey } from '../config.js';
import { RECIPES, paletteFor } from '../data/sprites/recipes.js';
import { PARTS } from '../data/sprites/parts.js';
import { forge } from '../systems/SpriteForge.js';
import { ENEMY_TYPES } from '../data/enemies/index.js';
import { derivePalette, NAMED_PALETTES } from '../data/sprites/palettes.js';

// Mirror every composed frame of a forged sprite horizontally (reverse each row of the
// pixel grid). Used for `flip:true` recipes whose art was drawn facing left. Operates on
// the final composed grids, so part anchors/positions need no adjustment.
function mirrorFrames(out) {
  for (const frames of Object.values(out.anims)) {
    for (let i = 0; i < frames.length; i++) {
      frames[i] = frames[i].map((row) => [...row].reverse());
    }
  }
}

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.makeCircle(TEX.caster, COLORS.caster, 16);
    this.makeCircle(TEX.orb, COLORS.orb, 6);
    this.makeCircle(TEX.fireball, COLORS.fireball, 12);
    this.makeCircle(TEX.villager, COLORS.villager, 10);
    this.makeCircle(TEX.warrior, COLORS.warrior, 12);
    this.makeCircle(TEX.archer, COLORS.archer, 10);
    this.makeCircle(TEX.arrow, COLORS.arrow, 4);
    this.makeCircle(TEX.miniboss, COLORS.miniboss, 22);
    this.makeCircle(TEX.boss, COLORS.boss, 30);
    this.makeDiamond(TEX.temple, COLORS.temple, 26);

    this.buildSprites();
    this.scene.start('Menu');
  }

  buildSprites() {
    for (const [key, recipe] of Object.entries(RECIPES)) {
      // Per-creature color: explicit recipe.baseColor (projectiles) > the enemy def's color
      // > caster fallback. The hero uses a named palette, so its baseColor is ignored.
      const baseColor = recipe.baseColor ?? ENEMY_TYPES[key]?.color ?? COLORS.caster;
      const palette = paletteFor(key, baseColor);
      const out = forge(recipe, PARTS, palette, (ref) => this.resolvePartPalette(ref));
      // Some animal art was authored facing LEFT, but the convention (and FacingController)
      // is side = facing RIGHT (left via flipX). `flip:true` recipes mirror every composed
      // frame horizontally at build time so the stored texture obeys the convention.
      if (recipe.flip) mirrorFrames(out);
      this.paintForged(key, out);
    }
  }

  // A part-ref may name its own palette ({name, palette:'skin'}) or a base color
  // ({name, color:0x2e8b57, accent?:0x..}). Returns a 5-role palette or null (use recipe palette).
  resolvePartPalette(ref) {
    if (typeof ref !== 'object') return null;
    if (ref.palette) {
      const p = NAMED_PALETTES[ref.palette];
      if (!p) throw new Error(`BootScene: unknown part palette '${ref.palette}'`);
      return p;
    }
    if (ref.color != null) return derivePalette(ref.color, ref.accent != null ? { accent: ref.accent } : {});
    return null;
  }

  // Paint every frame to its own texture, register one anim per `${key}-${animName}`,
  // and register the base texture spriteKey(key) = idle-down frame 0.
  paintForged(key, out) {
    for (const [animName, frames] of Object.entries(out.anims)) {
      const frameKeys = [];
      for (let i = 0; i < frames.length; i++) {
        const tkey = frameKey(key, animName, i);
        this.paintGrid(tkey, frames[i]);
        frameKeys.push({ key: tkey });
      }
      this.anims.create({
        key: `${key}-${animName}`,
        frames: frameKeys,
        frameRate: out.fps,
        repeat: animName.startsWith('attack') ? 0 : -1, // attacks play once
      });
    }
    // Base texture for object constructors.
    this.paintGrid(spriteKey(key), out.anims['idle-down'][0]);
  }

  // grid = 2D array of color ints or null (transparent).
  paintGrid(texKey, grid) {
    const g = this.add.graphics();
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

  makeCircle(key, color, radius) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(radius, radius, radius);
    g.lineStyle(2, 0x000000, 0.4);
    g.strokeCircle(radius, radius, radius);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
  }

  makeDiamond(key, color, size) {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(size, 0);
    g.lineTo(size * 2, size);
    g.lineTo(size, size * 2);
    g.lineTo(0, size);
    g.closePath();
    g.fillPath();
    g.generateTexture(key, size * 2, size * 2);
    g.destroy();
  }
}
