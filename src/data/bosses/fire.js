import { COLORS, TEX } from '../../config.js';

// The three sisters, fought solo at fire levels 4/5/6. Each is a Boss (extends
// Enemy) driven by BossBrain phases. They reuse the Plan-2 component catalog.
// Stats are pre-scale; GameScene applies scaleEnemyDef(def, mult).

// Pyra — daño: ráfagas en cono + el suelo se llena de lava. Kite a media distancia.
export const PYRA = {
  key: 'pyra', tex: TEX.boss, color: COLORS.emberDeep, hp: 1000, speed: 55, damage: 30, radius: 24,
  elite: true, movement: { type: 'kite', range: 240 },
  modifiers: [{ type: 'shielded', reduce: 0.10 }],
  phases: [
    { from: 1.0, sequence: [
      { do: 'shootSpread', count: 5, arc: 80, speed: 230, damage: 12, telegraph: 320, dur: 700 },
      { do: 'wait', dur: 500 },
      { do: 'lobAoe', radius: 64, dps: 22, duration: 3500, telegraph: 500, dur: 900 },
    ] },
    { from: 0.5, speedMul: 1.2, sequence: [
      { do: 'shootSpread', count: 7, arc: 100, speed: 250, damage: 13, telegraph: 280, dur: 600 },
      { do: 'nova', count: 10, speed: 210, damage: 11, telegraph: 350, dur: 700 },
      { do: 'lobAoe', radius: 70, dps: 26, duration: 4000, telegraph: 450, dur: 800 },
    ] },
  ],
};

// Vesta — tanque/melee: embiste (charge), su contacto quema (onHitBurn), escudo.
export const VESTA = {
  key: 'vesta', tex: TEX.boss, color: COLORS.magma, hp: 2000, speed: 100, damage: 40, radius: 32,
  elite: true, movement: { type: 'charge', windup: 600, dash: 420, recover: 700, dashMul: 3 },
  modifiers: [{ type: 'onHitBurn', dps: 10, ms: 2500 }, { type: 'shielded', reduce: 0.35 }],
  phases: [
    { from: 1.0, sequence: [
      { do: 'wait', dur: 1300 },
      { do: 'shootStraight', speed: 260, damage: 12, telegraph: 250, dur: 600 },
    ] },
    { from: 0.4, speedMul: 1.3, sequence: [
      { do: 'wait', dur: 900 },
      { do: 'nova', count: 8, speed: 230, damage: 13, telegraph: 300, dur: 700 },
    ] },
  ],
};

// Favilla — summoner/healer: invoca adds y cura (healAllies); huye, protegida.
export const FAVILLA = {
  key: 'favilla', tex: TEX.boss, color: COLORS.totemFire, hp: 1000, speed: 70, damage: 20, radius: 24,
  elite: true, movement: { type: 'erratic' },
  modifiers: [{ type: 'healAllies', hps: 14, radius: 160 }],
  phases: [
    { from: 1.0, sequence: [
      { do: 'summon', spawnType: 'imp_brasa', count: 2, cap: 3, capKey: 'favilla_adds', respawnMs: 6000, dur: 1600 },
      { do: 'lobAoe', radius: 60, dps: 20, duration: 3000, telegraph: 500, dur: 1200 },
    ] },
    { from: 0.5, speedMul: 1.15, sequence: [
      { do: 'summon', spawnTypes: ['avispa_brasa', 'imp_brasa'], count: 2, cap: 3, capKey: 'favilla_adds', respawnMs: 6000, dur: 1600 },
      { do: 'wait', dur: 1200 },
      { do: 'nova', count: 12, speed: 200, damage: 10, telegraph: 400, dur: 800 },
    ] },
  ],
};

// Trio variant: the three sisters fought together (level-7 levelBoss). Here the
// LAVA TRIANGLE (GameScene + TriangleHazard) is the star, so each sister is
// attenuated to a single readable pattern with NO floor-lava (lobAoe) and NO
// adds (summon) — those belong to the solo miniboss fights (nv4/5/6), not the
// trio showcase. Favilla's phase-1 is all summons + lobAoe (it would be empty
// after stripping), so she runs her phase-2 nova instead; she keeps healAllies
// so "kill the healer first" stays the tactical hook.
// When only ONE sister remains the triangle is cancelled and she adopts her
// soloSequence (which restores lobAoe so the survivor drops lava pools again).
const stripFloorAndAdds = (seq) => seq.filter((s) => s.do !== 'lobAoe' && s.do !== 'summon');
// Amortiguador de cadencia SOLO para el trío (nv7): alarga el hold tras disparar y
// recorta los patrones más densos, para que el volumen combinado sea esquivable.
// Las peleas solo (nv4-6) conservan su cadencia original.
const calmTrio = (seq) => seq.map((s) => {
  const step = { ...s, dur: (s.dur ?? 500) + 600 };
  if (step.do === 'nova' && (step.count ?? 0) > 8) step.count = 8;
  if (step.do === 'shootSpread' && (step.count ?? 0) > 4) step.count = 4;
  return step;
});
// soloSeq: lo que hace la hermana cuando queda SOLA (recupera sus charcos de lava).
const trio = (def, hp, movement, seq, soloSequence) => ({
  ...def, hp, movement,
  phases: [{ from: 1.0, sequence: seq }],
  soloSequence,
});
const SOLO_LAVA = { do: 'lobAoe', radius: 64, dps: 22, duration: 3500, telegraph: 500, dur: 900 };
export const SISTERS_TRIO = [
  trio(PYRA, 720, { type: 'kite', range: 240 },
    calmTrio(stripFloorAndAdds(PYRA.phases[0].sequence)),
    [SOLO_LAVA, { do: 'shootSpread', count: 6, arc: 90, speed: 240, damage: 14, telegraph: 320, dur: 700 }]),
  trio(VESTA, 1200, { type: 'chase' },
    calmTrio(stripFloorAndAdds(VESTA.phases[0].sequence)),
    [SOLO_LAVA, { do: 'shootStraight', speed: 260, damage: 12, telegraph: 250, dur: 600 }]),
  trio(FAVILLA, 600, { type: 'kite', range: 240 },
    calmTrio(stripFloorAndAdds(FAVILLA.phases[1].sequence)),
    [SOLO_LAVA, { do: 'nova', count: 12, speed: 200, damage: 10, telegraph: 400, dur: 800 }]),
];

// Ignatius — el padre, mago de templo (nv7). Setpiece de 3 fases. Reusa el
// secuenciador; las fases 2/3 rompen el suelo en lava (enter: spawnLavaFloor).
// (El beam rotatorio de la fase 3 se aproxima con nova+lobAoe densos.)
export const IGNATIUS = {
  key: 'ignatius', tex: TEX.boss, color: COLORS.fireball, hp: 2700, speed: 55, damage: 22, radius: 30,
  elite: true, movement: { type: 'kite', range: 220 },
  modifiers: [{ type: 'onHitBurn', dps: 12, ms: 2500 }],
  phases: [
    { from: 1.0, sequence: [
      { do: 'shootSpread', count: 6, arc: 90, speed: 240, damage: 14, telegraph: 320, dur: 700 },
      { do: 'giantFireball', projectile: 'fire', size: 60, speed: 120, damage: 40, telegraph: 600, dur: 900 },
      { do: 'shootHoming', speed: 130, damage: 12, telegraph: 350, dur: 900 },
      { do: 'wait', dur: 400 },
    ] },
    { from: 0.70, enter: ['spawnLavaFloor', 'startLavaRiver'], sequence: [
      { do: 'nova', count: 12, speed: 220, damage: 13, telegraph: 350, dur: 700 },
      { do: 'summon', spawnTypes: ['brasa_errante', 'elemental_fuego', 'espiritu_ceniza'], count: 2, cap: 5, respawnMs: 20000, capKey: 'ignatius_adds', dur: 900 },
      { do: 'giantFireball', projectile: 'fire', size: 90, speed: 120, damage: 50, telegraph: 550, dur: 900 },
      { do: 'shootSpread', count: 8, arc: 120, speed: 250, damage: 14, telegraph: 300, dur: 700 },
    ] },
    { from: 0.35, speedMul: 1.35, enter: ['spawnLavaFloor', 'startLavaRiver'], sequence: [
      { do: 'nova', count: 16, speed: 240, damage: 14, telegraph: 280, dur: 600 },
      { do: 'summon', spawnTypes: ['brasa_errante', 'elemental_fuego', 'espiritu_ceniza'], count: 2, cap: 5, respawnMs: 20000, capKey: 'ignatius_adds', dur: 800 },
      { do: 'giantFireball', projectile: 'fire', size: 120, speed: 130, damage: 60, telegraph: 450, dur: 800 },
      { do: 'shootHoming', speed: 150, damage: 13, telegraph: 250, dur: 600 },
    ] },
  ],
};
