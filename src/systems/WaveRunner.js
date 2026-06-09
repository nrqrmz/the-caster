// src/systems/WaveRunner.js
// Phase order: each wave, then miniboss, temple, boss, done.
export class WaveRunner {
  constructor(scenario) {
    this.scenario = scenario;
    this.waveIndex = 0;
    this.phase = 'wave';
  }

  currentWave() {
    return this.scenario.waves[this.waveIndex];
  }

  // Called by GameScene when the current phase's enemies are all defeated
  // (or, for 'temple', when the caster has touched the temple).
  onCleared() {
    if (this.phase === 'wave') {
      if (this.waveIndex < this.scenario.waves.length - 1) {
        this.waveIndex += 1;
      } else {
        this.phase = 'miniboss';
      }
    } else if (this.phase === 'miniboss') {
      this.phase = 'temple';
    } else if (this.phase === 'temple') {
      this.phase = 'boss';
    } else if (this.phase === 'boss') {
      this.phase = 'done';
    }
  }

  isComplete() {
    return this.phase === 'done';
  }
}
