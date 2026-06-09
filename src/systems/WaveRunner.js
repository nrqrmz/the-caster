// src/systems/WaveRunner.js
// Generic sequencer over a level's ordered `phases` array. No hardcoded order.
export class WaveRunner {
  constructor(level) {
    this.phases = level.phases || [];
    this.index = 0;
  }

  // Current phase's type string, or 'done' when past the last phase.
  get phase() {
    const p = this.phases[this.index];
    return p ? p.type : 'done';
  }

  // The full descriptor for the current phase (spawns, enemyDef, mechanics…), or null.
  currentPhase() {
    return this.phases[this.index] || null;
  }

  // Called by GameScene when the current phase is cleared.
  onCleared() {
    if (this.index < this.phases.length) this.index += 1;
  }

  isComplete() {
    return this.index >= this.phases.length;
  }
}
