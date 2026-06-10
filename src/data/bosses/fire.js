import { COLORS, TEX } from '../../config.js';

// The three sisters, fought solo at fire levels 4/5/6. Each is a Boss (extends
// Enemy) driven by BossBrain phases. They reuse the Plan-2 component catalog.
// Stats are pre-scale; GameScene applies scaleEnemyDef(def, mult).

// Pyra — daño: ráfagas en cono + el suelo se llena de lava. Kite a media distancia.
export const PYRA = {
  key: 'pyra', tex: TEX.boss, color: COLORS.emberDeep, hp: 420, speed: 55, damage: 14, radius: 24,
  elite: true, movement: { type: 'kite', range: 240 },
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
  key: 'vesta', tex: TEX.boss, color: COLORS.magma, hp: 520, speed: 80, damage: 18, radius: 26,
  elite: true, movement: { type: 'charge', windup: 600, dash: 420, recover: 700, dashMul: 3 },
  modifiers: [{ type: 'onHitBurn', dps: 10, ms: 2500 }, { type: 'shielded', reduce: 0.3 }],
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
  key: 'favilla', tex: TEX.boss, color: COLORS.totemFire, hp: 480, speed: 70, damage: 10, radius: 24,
  elite: true, movement: { type: 'flee' },
  modifiers: [{ type: 'healAllies', hps: 14, radius: 160 }],
  phases: [
    { from: 1.0, sequence: [
      { do: 'summon', spawnType: 'imp_brasa', count: 2, dur: 1000 },
      { do: 'lobAoe', radius: 60, dps: 20, duration: 3000, telegraph: 500, dur: 1200 },
    ] },
    { from: 0.5, speedMul: 1.15, sequence: [
      { do: 'summon', spawnType: 'avispa_brasa', count: 3, dur: 900 },
      { do: 'summon', spawnType: 'imp_brasa', count: 2, dur: 900 },
      { do: 'nova', count: 12, speed: 200, damage: 10, telegraph: 400, dur: 800 },
    ] },
  ],
};
