import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';

// Pause overlay launched over a paused Game (+ paused UI). Either resumes both scenes
// or abandons the level back to the region's level select.
export default class PauseScene extends Phaser.Scene {
  constructor() { super('Pause'); }

  init(data) { this.regionId = data.regionId || 'fire'; }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0).setInteractive();
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 110, 'PAUSA', {
      fontFamily: 'sans-serif', fontSize: '38px', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.addButton(GAME_WIDTH / 2 - 90, '▶  Reanudar', 0x66bb6a, () => this.resumeGame());
    this.addButton(GAME_WIDTH / 2 - 20, '⌂  Abandonar nivel', 0xef5350, () => this.abandon());
  }

  addButton(y, label, color, onTap) {
    const box = this.add.rectangle(GAME_WIDTH / 2, y, 260, 52, color, 0.2)
      .setStrokeStyle(2, color).setInteractive();
    this.add.text(GAME_WIDTH / 2, y, label, {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#fff',
    }).setOrigin(0.5);
    box.on('pointerdown', onTap);
  }

  resumeGame() {
    this.scene.resume('Game');
    this.scene.resume('UI');
    this.scene.stop();
  }

  abandon() {
    this.scene.stop('UI');
    this.scene.stop('Game');
    this.scene.stop();
    this.scene.start('Branch', { regionId: this.regionId });
  }
}
