// src/systems/RitualMeter.js
// Pure (no Phaser). The nv7 ritual bar: fills while the cultist leader channels.
// state: { filled, total }  (ms). When full, the leader becomes targetable and fights.

import { RITUAL_FILL_MS } from '../data/tuning.js';

export function tickRitual(state, dt) {
  const total = state.total ?? RITUAL_FILL_MS;
  state.total = total;
  state.filled = Math.min(total, (state.filled ?? 0) + dt);
  return { full: state.filled >= total };
}

export function ritualFraction(state) {
  const total = state.total ?? RITUAL_FILL_MS;
  return Math.max(0, Math.min(1, (state.filled ?? 0) / total));
}
