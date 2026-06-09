// src/systems/BossMechanics.js
// Timed elemental attacks for a boss. Phaser-coupled (uses scene pools/caster);
// verified by playtest. Mechanics are declared as data on a boss def:
//   { type: 'nova'|'boulder'|'poisonFloor', every: ms, ...params }
import { TEX } from '../config.js';

const HANDLERS = {
  // Ring of projectiles outward from the boss.
  nova(scene, boss, def) {
    const n = def.count || 10;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      const tx = boss.x + Math.cos(a) * 100;
      const ty = boss.y + Math.sin(a) * 100;
      scene.enemyShots.fire(TEX.arrow, boss.x, boss.y, tx, ty, def.speed || 220, def.damage || 10, 0);
    }
  },
  // One slow, heavy projectile aimed at the caster.
  boulder(scene, boss, def) {
    const p = scene.enemyShots.fire(TEX.fireball, boss.x, boss.y, scene.caster.x, scene.caster.y, def.speed || 200, def.damage || 22, 0);
    if (p) p.setScale(1.6);
  },
  // A lingering damage zone dropped on the caster's current position.
  poisonFloor(scene, boss, def) {
    scene.spawnPoisonZone(scene.caster.x, scene.caster.y, def.radius || 70, def.dps || 30, def.duration || 4000);
  },
};

export class BossMechanics {
  constructor(scene, boss, mechanics) {
    this.scene = scene;
    this.boss = boss;
    // start each on a fraction of its period so they don't all fire on frame 1
    this.timers = (mechanics || []).map((m, i) => ({ def: m, remaining: m.every * (0.5 + i * 0.25) }));
  }

  update(delta) {
    if (!this.boss || !this.boss.active) return;
    for (const t of this.timers) {
      t.remaining -= delta;
      if (t.remaining <= 0) {
        t.remaining = t.def.every;
        const h = HANDLERS[t.def.type];
        if (h) h(this.scene, this.boss, t.def);
      }
    }
  }
}
