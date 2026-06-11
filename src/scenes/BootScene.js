import { COLORS, TEX, spriteKey, frameKey } from '../config.js';
import { RECIPES, paletteFor } from '../data/sprites/recipes.js';
import { PARTS } from '../data/sprites/parts.js';
import { forge } from '../systems/SpriteForge.js';

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
      const baseColor = recipe.baseColor ?? COLORS.caster; // hero uses a named palette anyway
      const palette = paletteFor(key, baseColor);
      const out = forge(recipe, PARTS, palette);
      this.paintForged(key, out);
    }
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
        repeat: -1,
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
