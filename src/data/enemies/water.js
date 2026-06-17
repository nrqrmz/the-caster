import { COLORS, TEX } from '../../config.js';

// Water world roster (~20). Control + attrition: higher HP and more healers than
// Fire; fewer projectiles. Three enemies apply onHitSlow (capped at 0.45× speed).
// Stat numbers are starting values; tune in playtest.
export const WATER_ENEMIES = {
  // === Cultistas / ahogados (human — nv1–6) ===

  // #1 — Acólito de Escarcha: kite ranged that slows the caster on hit.
  acolito_escarcha: { key: 'acolito_escarcha', tex: TEX.archer, color: COLORS.frostBlue,
    hp: 18, speed: 68, damage: 8, radius: 16,
    movement: { type: 'kite', range: 210 },
    attacks: [{ type: 'shootStraight', every: 1500, speed: 240 }],
    modifiers: [{ type: 'onHitSlow' }] },

  // #2 — Lanzahielos: kite area-denial spread (3 projectiles). No slow.
  lanzahielos: { key: 'lanzahielos', tex: TEX.archer, color: COLORS.frostSpread,
    hp: 22, speed: 62, damage: 7, radius: 16,
    movement: { type: 'kite', range: 230 },
    attacks: [{ type: 'shootSpread', count: 3, arc: 36, every: 1800, speed: 230 }] },

  // #3 — Ahogado: slow-moving melee swarm filler.
  ahogado: { key: 'ahogado', tex: TEX.villager, color: COLORS.deepBlue,
    hp: 28, speed: 55, damage: 11, radius: 17,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }] },

  // #4 — Sacerdotisa del Lago: healer, kill-priority target. Flees, never attacks.
  sacerdotisa_lago: { key: 'sacerdotisa_lago', tex: TEX.archer, color: COLORS.lakeGreen,
    hp: 20, speed: 72, damage: 0, radius: 16,
    movement: { type: 'flee' },
    attacks: [],
    modifiers: [{ type: 'healAllies', hps: 12, radius: 140 }] },

  // #5 — Vidente de Marea: homing shot forces player to dodge actively.
  vidente_marea: { key: 'vidente_marea', tex: TEX.archer, color: COLORS.frostBlue,
    hp: 22, speed: 60, damage: 10, radius: 16,
    movement: { type: 'kite', range: 240 },
    attacks: [{ type: 'shootHoming', every: 2500, speed: 115, telegraph: 350 }] },

  // #6 — Guardia de Hielo: shielded charger + onHitSlow. Flanking bruiser.
  guardia_hielo: { key: 'guardia_hielo', tex: TEX.warrior, color: COLORS.iceGuard,
    hp: 75, speed: 78, damage: 16, radius: 20,
    movement: { type: 'charge', windup: 550, dash: 380, recover: 650, dashMul: 3.0 },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'shielded', reduce: 0.45 }, { type: 'onHitSlow' }] },

  // #7 — Corista del Abismo: orbit + auraDamage aura. Kill-priority; no direct attack.
  corista_abismo: { key: 'corista_abismo', tex: TEX.archer, color: COLORS.deepBlue,
    hp: 26, speed: 65, damage: 0, radius: 16,
    movement: { type: 'orbit' },
    attacks: [],
    modifiers: [{ type: 'auraDamage', dps: 11, radius: 48 }] },

  // === Bestias del lago (elemental — nv4–8, first batch) ===

  // #8 — Renacuajo: zigzag melee add; spawned by Huevo de Sapo and Náyade.
  // _growType wires the generational chain: a renacuajo HATCHED from an egg carries
  // brainState.lifecycle = TADPOLE (set by promoteEnemy) and matures into sapo_adulto.
  // Plain summoned renacuajos (Náyade, wave filler) spawn WITHOUT lifecycle state, so
  // they never tick/promote and stay tadpoles — _growType is inert for them.
  renacuajo: { key: 'renacuajo', tex: TEX.villager, color: COLORS.tadpole,
    hp: 12, speed: 105, damage: 7, radius: 16,
    movement: { type: 'zigzag' },
    attacks: [{ type: 'melee' }],
    _growType: 'sapo_adulto' },

  // Sapo adulto: the matured tadpole (egg→renacuajo→adulto). Strafes, spits,
  // and re-lays eggs on cooldown — the self-sustaining generational loop
  // (bounded by CONCURRENCY_CAP). Not placed in waves directly; only reached
  // via the lifecycle chain. Counter: kill the fragile eggs before they mature.
  sapo_adulto: { key: 'sapo_adulto', tex: TEX.villager, color: COLORS.toadSpit,
    hp: 34, speed: 60, damage: 10, radius: 23,
    movement: { type: 'strafe', range: 200 },
    attacks: [
      { type: 'shootStraight', every: 1700, speed: 230 },
      { type: 'summon', spawnType: 'huevo_sapo', count: 1, every: 5000 },
    ] },

  // #9 — Rana Saltarina: erratic melee. Hard to track, low HP.
  rana_saltarina: { key: 'rana_saltarina', tex: TEX.villager, color: COLORS.frogJump,
    hp: 18, speed: 115, damage: 10, radius: 16,
    movement: { type: 'erratic' },
    attacks: [{ type: 'melee' }] },

  // #10 — Sapo Escupidor: strafe ranged. Keeps distance, spits single shots.
  sapo_escupidor: { key: 'sapo_escupidor', tex: TEX.villager, color: COLORS.toadSpit,
    hp: 26, speed: 62, damage: 9, radius: 19,
    movement: { type: 'strafe', range: 200 },
    attacks: [{ type: 'shootStraight', every: 1600, speed: 230 }] },

  // #11 — Pez Globo: erratic melee + explodesOnDeath. Punishes close-range kills.
  pez_globo: { key: 'pez_globo', tex: TEX.villager, color: COLORS.globeFish,
    hp: 20, speed: 88, damage: 12, radius: 16,
    movement: { type: 'erratic' },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'explodesOnDeath', count: 8, speed: 200 }] },

  // #12 — Cangrejo Acorazado: very slow shielded tank. Flanks and soaks damage.
  cangrejo_acorazado: { key: 'cangrejo_acorazado', tex: TEX.warrior, color: COLORS.crabRed,
    hp: 90, speed: 38, damage: 14, radius: 20,
    movement: { type: 'chase' },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'shielded', reduce: 0.5 }] },

  // #13 — Medusa: erratic auraDamage + splitsOnDeath (2 smaller copies, no re-split).
  // spawnType 'medusa_cria' is the scaled-down copy: hp×0.5, radius×0.7, same kit
  // minus the splitsOnDeath modifier (Plan 1 sets the no-re-split flag on children).
  medusa: { key: 'medusa', tex: TEX.villager, color: COLORS.jellyfish,
    hp: 38, speed: 55, damage: 0, radius: 18,
    movement: { type: 'erratic' },
    attacks: [],
    modifiers: [
      { type: 'auraDamage', dps: 14, radius: 50 },
      { type: 'splitsOnDeath', spawnType: 'medusa_cria', count: 2, hpMul: 0.5, radiusMul: 0.7 },
    ] },

  // #13b — Medusa cría: the smaller copy spawned by splitsOnDeath (no re-split flag
  // is set by Plan 1 logic — this def has no splitsOnDeath modifier by design).
  medusa_cria: { key: 'medusa_cria', tex: TEX.villager, color: COLORS.jellyfish,
    hp: 19, speed: 60, damage: 0, radius: 16,
    movement: { type: 'erratic' },
    attacks: [],
    modifiers: [{ type: 'auraDamage', dps: 8, radius: 34 }] },

  // #14 — Tiburón Joven: burrow movement (submerge → reposition → emerge → dashStrike).
  // While submerged: invulnerable + hidden. Emerges with telegraphed ring (~400 ms).
  tiburon_joven: { key: 'tiburon_joven', tex: TEX.archer, color: COLORS.sharkYoung,
    hp: 55, speed: 110, damage: 18, radius: 17,
    movement: { type: 'burrow', submergeMs: 1500, repositionMs: 200, emergeMs: 400, attackMs: 600, recoverMs: 700 },
    attacks: [{ type: 'dashStrike' }] },

  // #15 — Serpiente Marina: kite spread ranged. Sinuous, keeps distance.
  serpiente_marina: { key: 'serpiente_marina', tex: TEX.archer, color: COLORS.seaSerpent,
    hp: 28, speed: 65, damage: 8, radius: 16,
    movement: { type: 'kite', range: 230 },
    attacks: [{ type: 'shootSpread', count: 3, arc: 40, every: 1900, speed: 225 }] },

  // #16 — Náyade: flee + summon tadpoles + healAllies. Dual kill-priority threat.
  nayade: { key: 'nayade', tex: TEX.archer, color: COLORS.lakeGreen,
    hp: 30, speed: 70, damage: 0, radius: 17,
    movement: { type: 'flee' },
    attacks: [{ type: 'summon', spawnType: 'renacuajo', count: 2, every: 3500 }],
    modifiers: [{ type: 'healAllies', hps: 10, radius: 130 }] },

  // === Invocados / ambientales ===

  // #17 — Burbuja Gélida: erratic auraDamage + onHitSlow. Floating ambient hazard.
  burbuja_gelida: { key: 'burbuja_gelida', tex: TEX.villager, color: COLORS.frostBubble,
    hp: 14, speed: 52, damage: 0, radius: 16,
    movement: { type: 'erratic' },
    attacks: [],
    modifiers: [{ type: 'auraDamage', dps: 9, radius: 42 }, { type: 'onHitSlow' }] },

  // #18 — Tótem de Escarcha: static turret — slow nova + aura. Fixed hazard.
  totem_escarcha: { key: 'totem_escarcha', tex: TEX.warrior, color: COLORS.frostTotem,
    hp: 50, speed: 0, damage: 8, radius: 18,
    movement: { type: 'static' },
    attacks: [{ type: 'nova', count: 8, every: 3200, speed: 170, telegraph: 550 }],
    modifiers: [{ type: 'auraDamage', dps: 7, radius: 52 }] },

  // #19 — Huevo de Sapo: static, no attack. Hatches into renacuajo after ~3500 ms
  // via generational spawning logic (Plan 1). lifecycle:'egg' makes GameScene.spawnEnemy
  // arm the egg (brainState.lifecycle = EGG); the hatch timer lives in EnemyBrain's
  // tickLifecycle, which promotes it to _hatchType (renacuajo) on expiry. The hatched
  // renacuajo then carries lifecycle = TADPOLE and continues the chain to sapo_adulto.
  huevo_sapo: { key: 'huevo_sapo', tex: TEX.warrior, color: COLORS.toadEgg,
    hp: 8, speed: 0, damage: 0, radius: 16,
    movement: { type: 'static' },
    attacks: [],
    lifecycle: 'egg', _hatchType: 'renacuajo' },

  // #20 — Tortuga Acorazada: charge + heavy shield + resist (flat damage reduction).
  // resist: 0.35 means incoming damage is multiplied by (1 - 0.35) = 0.65 (Plan 1).
  tortuga_acorazada: { key: 'tortuga_acorazada', tex: TEX.warrior, color: COLORS.turtleGreen,
    hp: 110, speed: 60, damage: 15, radius: 21,
    movement: { type: 'charge', windup: 600, dash: 450, recover: 750, dashMul: 2.8 },
    attacks: [{ type: 'melee' }],
    modifiers: [{ type: 'shielded', reduce: 0.55 }, { type: 'resist', factor: 0.35 }] },
};
