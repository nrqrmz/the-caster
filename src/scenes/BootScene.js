import { COLORS, TEX } from '../config.js';

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

    this.scene.start('Menu');
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
