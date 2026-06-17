import { TEX, spriteKey, ACTOR_DEPTH } from '../config.js';
import { hasRecipe } from '../data/sprites/recipes.js';
import { FacingController } from './FacingController.js';

export default class Caster extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, stats) {
    const useSprite = hasRecipe('hero');
    super(scene, x, y, useSprite ? spriteKey('hero') : TEX.caster);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(ACTOR_DEPTH);
    this.stats = stats;
    this.hp = stats.maxHealth;
    this.maxHp = stats.maxHealth;
    this._shotTimer = 0;
    this.slowRemaining = 0;
    this.slowFactor = 1;
    this.stunRemaining = 0;
    this.liftRemaining = 0;
    this.ccImmuneRemaining = 0;
    this.pushX = 0;
    this.pushY = 0;
    this.pushRemaining = 0;
    this._aimTarget = null;
    this.facing = useSprite ? new FacingController(this, 'hero') : null;
    if (useSprite) this.setDisplaySize(32, 32); // hero visual footprint ~ old radius 16
  }

  moveBy(vector) {
    const locked = this.stunRemaining > 0 || this.liftRemaining > 0;
    const mul = this.slowRemaining > 0 ? this.slowFactor : 1;
    const baseX = locked ? 0 : vector.x * this.stats.moveSpeed * mul;
    const baseY = locked ? 0 : vector.y * this.stats.moveSpeed * mul;
    const px = this.pushRemaining > 0 ? this.pushX : 0;
    const py = this.pushRemaining > 0 ? this.pushY : 0;
    this.setVelocity(baseX + px, baseY + py);
  }

  updateAutoAim(time, delta, enemies, onFire) {
    this._shotTimer -= delta;
    if (this.stunRemaining > 0 || this.liftRemaining > 0) return; // no firing while stunned/lifted
    const target = this.nearestEnemy(enemies);
    this._aimTarget = target ? { x: target.x, y: target.y } : null;
    if (this._shotTimer > 0) return;
    if (!target) return;
    this._shotTimer = this.stats.shotRate;
    if (this.facing) this.facing.playAttack();
    onFire(target);
  }

  nearestEnemy(enemies) {
    let best = null;
    let bestD = Infinity;
    for (const e of enemies) {
      if (!e.active) continue;
      if (e._untargetable) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, e.x, e.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.facing && this.body) this.facing.update(this.body.velocity.x, this.body.velocity.y, this._aimTarget);
  }
}
