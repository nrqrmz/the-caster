// src/data/bosses/earth.js — El Jardín de Circe bosses.
import { COLORS, TEX } from '../../config.js';

// nv4 miniboss — fast licántrope bruiser that harries and calls the pack.
export const SENOR_LOBO = {
  key: 'senor_lobo', tex: TEX.miniboss, color: COLORS.beastFur,
  hp: 460, speed: 120, damage: 18, radius: 22, elite: true,
  modifiers: [{ type: 'drain', heal: 8 }],
  movement: { type: 'charge', windup: 450, dash: 340, recover: 500, dashMul: 3.2 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'dashStrike', damage: 18, range: 80, telegraph: 320, dur: 420 },
      { do: 'wait', dur: 600 },
      { do: 'summon', spawnType: 'lobo', count: 2, cap: 4, respawnMs: 12000, dur: 700 },
      { do: 'wait', dur: 400 },
    ] },
    { from: 0.5, speedMul: 1.3, sequence: [
      { do: 'dashStrike', damage: 20, range: 90, telegraph: 280, dur: 380 },
      { do: 'dashStrike', damage: 20, range: 90, telegraph: 260, dur: 360 },
      { do: 'summon', spawnType: 'lobo', count: 3, cap: 6, respawnMs: 10000, dur: 700 },
      { do: 'wait', dur: 350 },
    ] },
  ],
};

// nv8 templeboss — Circe, summoner pura. Releases captives and transmutes them into beasts.
// `taunts` drives a floating-text line (Task 7); death triggers revertBeasts (Task 7).
export const CIRCE = {
  key: 'circe', tex: TEX.boss, color: COLORS.sporeViolet,
  hp: 900, speed: 60, damage: 12, radius: 24, elite: true,
  taunts: ['story.earth.circe.taunt.0', 'story.earth.circe.taunt.1'],
  movement: { type: 'kite', range: 240 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'summon', spawnType: 'naufrago_encantado', count: 2, cap: 4, respawnMs: 6000, dur: 800 },
      { do: 'transmute', speed: 150, dur: 700 },
      { do: 'shootSpread', count: 3, arc: 50, speed: 210, damage: 11, telegraph: 300, dur: 650 },
      { do: 'wait', dur: 500 },
    ] },
    { from: 0.66, sequence: [
      { do: 'summon', spawnType: 'naufrago_encantado', count: 2, cap: 5, respawnMs: 5500, dur: 700 },
      { do: 'transmute', speed: 160, dur: 600 },
      { do: 'lobAoe', radius: 60, dps: 28, duration: 3500, root: true, telegraph: 450, dur: 700 },
      { do: 'summon', spawnType: 'hombre_lobo', count: 1, cap: 1, respawnMs: 14000, dur: 700 },
      { do: 'wait', dur: 400 },
    ] },
    { from: 0.33, speedMul: 1.1, sequence: [
      { do: 'transmute', speed: 170, dur: 450 },
      { do: 'transmute', speed: 170, dur: 450 },
      { do: 'lobAoe', radius: 64, dps: 32, duration: 3500, telegraph: 380, dur: 650 },
      { do: 'summon', spawnTypes: ['hombre_lobo', 'oso_jardin'], count: 1, cap: 2, respawnMs: 12000, dur: 700 },
      { do: 'wait', dur: 300 },
    ] },
  ],
};
