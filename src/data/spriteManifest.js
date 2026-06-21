// src/data/spriteManifest.js
// Pure (no Phaser). Derives the exact set of forgeable sprite keys a region
// needs, so BootScene can forge only CORE and each world forges its set on
// demand. Walks waves, minions, bosses, shapeshifter `forms`, runtime-swap
// `extraSprites`, and transitive summons (enemy attacks + boss sequences).
import { RECIPES } from './sprites/recipes.js';
import { ENEMY_TYPES } from './enemies/index.js';

// Forged at boot — shared across every world: the hero, the generic humans used
// as temple minions everywhere, all player/enemy projectiles, and the tentacle
// hazard sprite (GameScene renders it directly via spriteKey('tentacle')).
export const CORE_SPRITE_KEYS = [
  'hero',
  'villager', 'villager_blond', 'villager_black', 'warrior', 'archer',
  'orb', 'fireball', 'arrow', 'bolt', 'iceShard', 'poisonGlob',
  'tentacle',
];

function addSummons(step, out, queue) {
  for (const k of [step.spawnType, ...(step.spawnTypes || [])]) {
    if (k && !out.has(k)) { out.add(k); queue.push(k); }
  }
}

export function regionSpriteKeys(region) {
  const out = new Set();
  const queue = [];
  const bossObjs = [];
  const seed = (k) => { if (k && !out.has(k)) { out.add(k); queue.push(k); } };

  // A boss/miniboss/temple def: add its key, its shapeshifter forms, and any
  // runtime-swap sprites; collect the object so its summon sequences get scanned.
  const addBoss = (b) => {
    if (!b) return;
    seed(b.key);
    bossObjs.push(b);
    for (const f of b.forms || []) addBoss(f);
    for (const k of b.extraSprites || []) seed(k);
  };

  for (const level of region.levels) {
    for (const phase of level.phases) {
      if (phase.spawns) for (const s of phase.spawns) seed(s.type);
      if (phase.minions) for (const m of phase.minions) seed(m.type);
      addBoss(phase.enemyDef);
      for (const b of phase.bosses || []) addBoss(b);
    }
  }

  // Boss summons live in the boss object's phase sequences (+ trio soloSequence).
  // This pass only SEEDS the queue with what bosses summon; the fixpoint loop
  // below drains the queue (including these), so order between the two is safe.
  for (const boss of bossObjs) {
    const steps = [];
    for (const ph of boss.phases || []) steps.push(...(ph.sequence || []));
    steps.push(...(boss.soloSequence || []));
    for (const step of steps) if (step.do === 'summon') addSummons(step, out, queue);
  }

  // Enemy summons live in attack defs; resolve transitively to a fixpoint
  // (drains everything seeded above plus any summon-of-a-summon).
  while (queue.length) {
    const def = ENEMY_TYPES[queue.pop()];
    if (!def) continue;
    for (const att of def.attacks || []) if (att.type === 'summon') addSummons(att, out, queue);
  }

  // Keep only forgeable keys — drop geometric placeholders ('miniboss', etc.).
  return new Set([...out].filter((k) => RECIPES[k]));
}
