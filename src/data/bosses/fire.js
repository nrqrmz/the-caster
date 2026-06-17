import { COLORS, TEX } from '../../config.js';

// The three sisters, fought solo at fire levels 4/5/6. Each is a Boss (extends
// Enemy) driven by BossBrain phases. They reuse the Plan-2 component catalog.
// Stats are pre-scale; GameScene applies scaleEnemyDef(def, mult).

// Pyra — daño: ráfagas en cono + el suelo se llena de lava. Kite a media distancia.
export const PYRA = {
  key: 'pyra', tex: TEX.boss, color: COLORS.emberDeep, hp: 500, speed: 55, damage: 20, radius: 24,
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
  key: 'vesta', tex: TEX.boss, color: COLORS.magma, hp: 680, speed: 80, damage: 36, radius: 26,
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
  key: 'favilla', tex: TEX.boss, color: COLORS.totemFire, hp: 500, speed: 70, damage: 10, radius: 24,
  elite: true, movement: { type: 'erratic' },
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

// Trio variant: the three sisters fought together (level-7 levelBoss). Here the
// LAVA TRIANGLE (GameScene + TriangleHazard) is the star, so each sister is
// attenuated to a single readable pattern with NO floor-lava (lobAoe) and NO
// adds (summon) — those belong to the solo miniboss fights (nv4/5/6), not the
// trio showcase. Favilla's phase-1 is all summons + lobAoe (it would be empty
// after stripping), so she runs her phase-2 nova instead; she keeps healAllies
// so "kill the healer first" stays the tactical hook.
const stripFloorAndAdds = (seq) => seq.filter((s) => s.do !== 'lobAoe' && s.do !== 'summon');
const trio = (def, hp, seq) => ({ ...def, hp, phases: [{ from: 1.0, sequence: seq }] });
export const SISTERS_TRIO = [
  trio(PYRA,    280, stripFloorAndAdds(PYRA.phases[0].sequence)),    // cono de proyectiles
  trio(VESTA,   320, stripFloorAndAdds(VESTA.phases[0].sequence)),   // embiste + disparo recto
  trio(FAVILLA, 300, stripFloorAndAdds(FAVILLA.phases[1].sequence)), // nova (sin summons); conserva healAllies
];

// Ignatius — el padre, mago de templo (nv7). Setpiece de 3 fases. Reusa el
// secuenciador; las fases 2/3 rompen el suelo en lava (enter: spawnLavaFloor).
// (El beam rotatorio de la fase 3 se aproxima con nova+lobAoe densos.)
export const IGNATIUS = {
  key: 'ignatius', tex: TEX.boss, color: COLORS.fireball, hp: 1300, speed: 55, damage: 22, radius: 30,
  elite: true, movement: { type: 'kite', range: 220 },
  modifiers: [{ type: 'onHitBurn', dps: 12, ms: 2500 }],
  phases: [
    { from: 1.0, sequence: [
      { do: 'shootSpread', count: 6, arc: 90, speed: 240, damage: 14, telegraph: 320, dur: 700 },
      { do: 'shootHoming', speed: 130, damage: 12, telegraph: 350, dur: 900 },
      { do: 'wait', dur: 400 },
    ] },
    { from: 0.66, enter: ['spawnLavaFloor'], sequence: [
      { do: 'nova', count: 12, speed: 220, damage: 13, telegraph: 350, dur: 700 },
      { do: 'lobAoe', radius: 70, dps: 26, duration: 3500, telegraph: 450, dur: 800 },
      { do: 'shootSpread', count: 8, arc: 120, speed: 250, damage: 14, telegraph: 300, dur: 700 },
    ] },
    { from: 0.33, speedMul: 1.35, enter: ['spawnLavaFloor'], sequence: [
      { do: 'nova', count: 16, speed: 240, damage: 14, telegraph: 280, dur: 600 },
      { do: 'shootHoming', speed: 150, damage: 13, telegraph: 250, dur: 600 },
      { do: 'lobAoe', radius: 80, dps: 30, duration: 4000, telegraph: 380, dur: 700 },
    ] },
  ],
};
