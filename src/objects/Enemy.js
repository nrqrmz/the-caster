export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, def) {
    super(scene, x, y, def.tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this._fireTimer = def.fireEvery || 0;
    this.freezeRemaining = 0; // ms immobilized
    this.slowRemaining = 0;   // ms slowed
    this.slowFactor = 1;      // speed multiplier while slowed
    this.burnRemaining = 0;   // ms burning
    this.burnDps = 0;         // burn damage/sec
  }

  applyBurn(dps, ms) {
    this.burnDps = Math.max(this.burnDps, dps);
    this.burnRemaining = Math.max(this.burnRemaining, ms);
  }

  applyFreeze(ms) { this.freezeRemaining = Math.max(this.freezeRemaining, ms); }
  applySlow(factor, ms) {
    // Fresh slow uses the new factor; stacking onto an active slow keeps the stronger (lower) one.
    this.slowFactor = this.slowRemaining > 0 ? Math.min(this.slowFactor, factor) : factor;
    this.slowRemaining = Math.max(this.slowRemaining, ms);
  }

  // target = caster sprite. onRangedFire(enemy) spawns the enemy projectile.
  updateBehavior(delta, target, onRangedFire) {
    if (!this.active) return;

    if (this.freezeRemaining > 0) this.freezeRemaining -= delta;
    if (this.slowRemaining > 0) this.slowRemaining -= delta;

    // Frozen: immobilized and cannot fire.
    if (this.freezeRemaining > 0) { this.setVelocity(0, 0); return; }

    const speed = this.def.speed * (this.slowRemaining > 0 ? this.slowFactor : 1);
    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

    if (this.def.behavior === 'ranged') {
      const desired = this.def.range || 200;
      if (dist > desired + 20) {
        this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      } else if (dist < desired - 20) {
        this.setVelocity(-Math.cos(angle) * speed, -Math.sin(angle) * speed);
      } else {
        this.setVelocity(0, 0);
      }
      this._fireTimer -= delta;
      if (this._fireTimer <= 0 && dist <= desired + 40) {
        this._fireTimer = this.def.fireEvery;
        onRangedFire(this);
      }
    } else {
      // chase
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }
}
