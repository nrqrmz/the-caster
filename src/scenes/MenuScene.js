import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { getStats } from '../systems/SkillTree.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.save = new SaveSystem(window.localStorage);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'THE CASTER', {
      fontFamily: 'sans-serif', fontSize: '44px', color: '#4fc3f7', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'venganza elemental', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffd54f',
    }).setOrigin(0.5);

    const play = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, '▶  TAP PARA JUGAR', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5).setInteractive();

    this.tweens.add({ targets: play, alpha: 0.4, yoyo: true, repeat: -1, duration: 700 });

    play.on('pointerdown', () => {
      // Fullscreen must be triggered by this user gesture (Task 6 handles fallback).
      if (this.scale.fullscreen.available && !this.scale.isFullscreen) {
        this.scale.startFullscreen();
      }
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('portrait').catch(() => {});
      }
      this.startCampaign();
    });
  }

  startCampaign() {
    const state = this.save.load();
    const stats = getStats(state);
    this.scene.start('Game', { stats });
  }
}
