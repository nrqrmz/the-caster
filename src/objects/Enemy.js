import { computeMovement, stepAttack } from '../systems/EnemyBrain.js';
import { stepBoss } from '../systems/BossBrain.js';
import { spriteKey } from '../config.js';
import { hasRecipe } from '../data/sprites/recipes.js';
import { FacingController } from './FacingController.js';

export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, def) {
    // A def may declare `skins` (alternate recipe keys, e.g. villager hair colors);
    // pick one at random per-instance for the visuals while def.key drives all logic.
    const skins = def.skins;
    const visualKey = (skins && skins.length) ? skins[(Math.random() * skins.length) | 0] : def.key;
    const useSprite = hasRecipe(visualKey);
    super(scene, x, y, useSprite ? spriteKey(visualKey) : def.tex);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.def = def;
    this.hp = def.hp;
    this.maxHp = def.hp;
    if (useSprite) {
      const px = def.radius * 2;
      this.setDisplaySize(px, px); // visual footprint ~ old circle diameter; physics body unchanged
      this.facing = new FacingController(this, visualKey);
      this.facing.facePlayer = !!def.facePlayer;
    } else {
      if (def.color) this.setTint(def.color);
      this.facing = null;
    }
    this.freezeRemaining = 0; // ms immobilized
    this.slowRemaining = 0;   // ms slowed
    this.slowFactor = 1;      // speed multiplier while slowed
    this.burnRemaining = 0;   // ms burning
    this.burnDps = 0;         // burn damage/sec
    this.brainState = { move: {}, attacks: (def.attacks || []).map(() => ({})), boss: {} };
    this._formSeq = null; // set by GameScene when the boss has `forms`
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

    // Burrow side-effects. El nuevo flujo: `submerged` controla la invulnerabilidad;
    // `surfacing` solo enciende el anillo de aviso (sigue invuln durante el emerge).
    // En `surface` el enemigo es vulnerable (no emite `submerged`).
    if (velocity.submerged !== undefined || velocity.surfacing || velocity.vulnerable) {
      this._burrowed = !!velocity.submerged;
      this._surfacing = !!velocity.surfacing;
    }
    if (velocity.repositionTo) {
      this.x = velocity.repositionTo.x;
      this.y = velocity.repositionTo.y;
    }

    return { velocity, fires, telegraphs, enters };
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (this.facing && this.body) {
      const aim = this.def.facePlayer && this.scene && this.scene.caster
        ? { x: this.scene.caster.x, y: this.scene.caster.y }
        : undefined;
      this.facing.update(this.body.velocity.x, this.body.velocity.y, aim);
    }
  }
}
