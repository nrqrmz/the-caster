import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

// Game Over overlay launched over a paused Game (+ paused UI) when the caster dies.
// Replaces the old silent level-restart so the player always has a way out.
export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOver'); }

  init(data) {
    this.regionId = data.regionId || 'fire';
    this.levelIndex = data.levelIndex || 0;
    this.stats = data.stats;
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.7).setOrigin(0).setInteractive();
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110, 'HAS CAÍDO', {
      fontFamily: 'sans-serif', fontSize: '36px', color: '#ef5350', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.addButton(GAME_WIDTH / 2 - 90, '↻  Reintentar', 0x66bb6a, () => this.retry());
    this.addButton(GAME_WIDTH / 2 - 20, '⌂  Volver al mapa', 0x4fc3f7, () => this.toMap());
  }

  addButton(y, label, color, onTap) {
    const box = this.add.rectangle(GAME_WIDTH / 2, y, 260, 52, color, 0.2)
      .setStrokeStyle(2, color).setInteractive();
    this.add.text(GAME_WIDTH / 2, y, label, {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#fff',
    }).setOrigin(0.5);
    box.on('pointerdown', onTap);
  }

  retry() {
    this.scene.stop('UI');
    this.scene.stop();
    this.scene.start('Game', { regionId: this.regionId, levelIndex: this.levelIndex, stats: this.stats });
  }

  toMap() {
    this.scene.stop('UI');
    this.scene.stop('Game');
    this.scene.stop();
    this.scene.start('Branch', { regionId: this.regionId });
  }
}
