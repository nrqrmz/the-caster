import { computeMovement, stepAttack } from '../systems/EnemyBrain.js';

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, def) {
    super(scene, x, y, def.tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;
    if (def.color) this.setTint(def.color);
    this.freezeRemaining = 0; // ms immobilized
    this.slowRemaining = 0;   // ms slowed
    this.slowFactor = 1;      // speed multiplier while slowed
    this.burnRemaining = 0;   // ms burning
    this.burnDps = 0;         // burn damage/sec
    this.brainState = { move: {}, attacks: (def.attacks || []).map(() => ({})) };
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

  // Returns an intent for GameScene to execute: { velocity, fires }.
  // `fires` is the list of attack defs whose timer fired this frame.
  think(delta, target) {
    if (!this.active) return { velocity: { x: 0, y: 0 }, fires: [] };

    if (this.freezeRemaining > 0) this.freezeRemaining -= delta;
    if (this.slowRemaining > 0) this.slowRemaining -= delta;

    // Frozen: immobilized and cannot fire.
    if (this.freezeRemaining > 0) return { velocity: { x: 0, y: 0 }, fires: [] };

    const speed = this.def.speed * (this.slowRemaining > 0 ? this.slowFactor : 1);
    const ctx = {
      self: { x: this.x, y: this.y },
      target: { x: target.x, y: target.y },
      speed, dt: delta,
    };
    const velocity = computeMovement(this.def, this.brainState.move, ctx);

    const fires = [];
    const attacks = this.def.attacks || [];
    for (let i = 0; i < attacks.length; i++) {
      const r = stepAttack(attacks[i], this.brainState.attacks[i], delta);
      if (r.fire) fires.push(attacks[i]);
    }
    return { velocity, fires };
  }
}
