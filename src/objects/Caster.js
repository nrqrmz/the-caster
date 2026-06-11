import { TEX } from '../config.js';

export default class Caster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, stats) {
    super(scene, x, y, TEX.caster);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.stats = stats;            // from SkillTree.getStats(save)
    this.hp = stats.maxHealth;
    this.maxHp = stats.maxHealth;
    this._shotTimer = 0;
    this.slowRemaining = 0;   // ms
    this.slowFactor = 1;      // speed multiplier (floor = CASTER_SLOW_FLOOR)
  }

  moveBy(vector) {
    const mul = this.slowRemaining > 0 ? this.slowFactor : 1;
    this.setVelocity(vector.x * this.stats.moveSpeed * mul, vector.y * this.stats.moveSpeed * mul);
  }

  // Called every frame. enemies = array of live enemy sprites. onFire(target) spawns the orb.
  updateAutoAim(time, delta, enemies, onFire) {
    this._shotTimer -= delta;
    if (this._shotTimer > 0) return;
    const target = this.nearestEnemy(enemies);
    if (!target) return;
    this._shotTimer = this.stats.shotRate;
    onFire(target);
  }

  nearestEnemy(enemies) {
    let best = null;
    let bestD = Infinity;
    for (const e of enemies) {
      if (!e.active) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }
}
