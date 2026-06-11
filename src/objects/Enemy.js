import { computeMovement, stepAttack } from '../systems/EnemyBrain.js';
import { stepBoss } from '../systems/BossBrain.js';

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
    this.brainState = { move: {}, attacks: (def.attacks || []).map(() => ({})), boss: {} };
  }

  applyBurn(dps, ms) {
    this.burnDps = Math.max(this.burnDps, dps);
    this.burnRemaining = Math.max(this.burnRemaining, ms);
  }

  applyFreeze(ms) {
    if (this.def.elite) return; // elites resist CC (freeze/slow ignored)
    this.freezeRemaining = Math.max(this.freezeRemaining, ms);
  }
  applySlow(factor, ms) {
    if (this.def.elite) return;
    // Fresh slow uses the new factor; stacking onto an active slow keeps the stronger (lower) one.
    this.slowFactor = this.slowRemaining > 0 ? Math.min(this.slowFactor, factor) : factor;
    this.slowRemaining = Math.max(this.slowRemaining, ms);
  }

  // Returns an intent for GameScene to execute: { velocity, fires }.
  // `fires` is the list of attack defs whose timer fired this frame.
  think(delta, target) {
    if (!this.active) return { velocity: { x: 0, y: 0 }, fires: [], telegraphs: [], enters: [] };

    if (this.freezeRemaining > 0) this.freezeRemaining -= delta;
    if (this.slowRemaining > 0) this.slowRemaining -= delta;

    if (this.freezeRemaining > 0) return { velocity: { x: 0, y: 0 }, fires: [], telegraphs: [], enters: [] };

    const slow = this.slowRemaining > 0 ? this.slowFactor : 1;
    const fires = [];
    const telegraphs = [];
    const enters = [];
    let movementDef = this.def;
    let speedMul = 1;

    if (this.def.phases) {
      const out = stepBoss(this.def, this.brainState.boss, this.hp / this.maxHp, delta);
      movementDef = { movement: out.movement };
      speedMul = out.speedMul;
      if (out.telegraph) telegraphs.push(out.telegraph);
      if (out.fire) fires.push({ ...out.fire, type: out.fire.do }); // step.do → attack.type (type wins)
      if (out.enter && out.enter.length) for (const h of out.enter) enters.push(h);
    } else {
      const attacks = this.def.attacks || [];
      for (let i = 0; i < attacks.length; i++) {
        const r = stepAttack(attacks[i], this.brainState.attacks[i], delta);
        if (r.fire) fires.push(attacks[i]);
      }
    }

    const ctx = {
      self: { x: this.x, y: this.y },
      target: { x: target.x, y: target.y },
      speed: this.def.speed * slow * speedMul * (this.enrageMul ?? 1),
      dt: delta,
    };
    const velocity = computeMovement(movementDef, this.brainState.move, ctx);

    // Burrow side-effects: write the _burrowed / _surfacing flags that GameScene reads.
    if (velocity.submerged !== undefined) {
      this._burrowed = !!velocity.submerged;
      this._surfacing = false;
    }
    if (velocity.surfacing) {
      this._burrowed = false;
      this._surfacing = true;
    }
    if (velocity.vulnerable || velocity.dashStrike) {
      this._burrowed = false;
      this._surfacing = false;
    }
    if (velocity.repositionTo) {
      this.x = velocity.repositionTo.x;
      this.y = velocity.repositionTo.y;
    }

    return { velocity, fires, telegraphs, enters };
  }
}
