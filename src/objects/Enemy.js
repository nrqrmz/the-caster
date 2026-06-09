export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, def) {
    super(scene, x, y, def.tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this._fireTimer = def.fireEvery || 0;
  }

  // target = caster sprite. onRangedFire(enemy) spawns the enemy projectile.
  updateBehavior(delta, target, onRangedFire) {
    if (!this.active) return;
    const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);

    if (this.def.behavior === 'ranged') {
      const desired = this.def.range || 200;
      if (dist > desired + 20) {
        this.setVelocity(Math.cos(angle) * this.def.speed, Math.sin(angle) * this.def.speed);
      } else if (dist < desired - 20) {
        this.setVelocity(-Math.cos(angle) * this.def.speed, -Math.sin(angle) * this.def.speed);
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
      this.setVelocity(Math.cos(angle) * this.def.speed, Math.sin(angle) * this.def.speed);
    }
  }
}
