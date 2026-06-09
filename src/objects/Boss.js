// Boss/miniboss reuse Enemy's chase behavior but carry a healthbar above them.
import Enemy from './Enemy.js';

export default class Boss extends Enemy {
  constructor(scene, x, y, def) {
    super(scene, x, y, def);
    this.bar = scene.add.graphics().setDepth(1500);
  }

  drawBar() {
    this.bar.clear();
    const w = 60; const h = 6;
    const pct = Phaser.Math.Clamp(this.hp / this.maxHp, 0, 1);
    this.bar.fillStyle(0x000000, 0.6).fillRect(this.x - w / 2, this.y - this.def.radius - 14, w, h);
    this.bar.fillStyle(0xff5252, 1).fillRect(this.x - w / 2, this.y - this.def.radius - 14, w * pct, h);
  }

  destroy(fromScene) {
    if (this.bar) this.bar.destroy();
    super.destroy(fromScene);
  }
}
