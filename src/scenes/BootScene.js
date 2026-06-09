import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config.js';

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'The Caster\nboot OK', {
      fontFamily: 'sans-serif', fontSize: '28px', color: '#ffffff', align: 'center',
    }).setOrigin(0.5);
  }
}
