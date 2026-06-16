import { GAME_WIDTH, GAME_HEIGHT } from '../config.js';
import { t } from '../i18n/index.js';

export default class DialogueScene extends Phaser.Scene {
  constructor() { super('Dialogue'); }

  init(data) {
    this.lines = data.lines || [];
    this.onDone = data.onDone || (() => {});
    this.index = 0;
  }

  create() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6).setOrigin(0).setDepth(0);
    this.boxBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 140, GAME_WIDTH - 30, 200, 0x12101a, 0.95)
      .setStrokeStyle(2, 0xffffff, 0.3);
    this.speaker = this.add.text(30, GAME_HEIGHT - 228, '', { fontFamily: 'sans-serif', fontSize: '18px', color: '#ffd54f' });
    this.body = this.add.text(30, GAME_HEIGHT - 196, '', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff',
      wordWrap: { width: GAME_WIDTH - 60 }, lineSpacing: 4,
    });
    this.hint = this.add.text(GAME_WIDTH - 30, GAME_HEIGHT - 56, t('ui.tap'), {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#aaaaaa',
    }).setOrigin(1, 0.5);

    this.render();
    this.input.on('pointerdown', () => this.advance());
  }

  render() {
    const line = this.lines[this.index];
    this.speaker.setText(line.speaker);
    this.body.setText(line.text);
  }

  advance() {
    this.index += 1;
    if (this.index >= this.lines.length) {
      const cb = this.onDone;
      this.scene.stop();
      cb();
    } else {
      this.render();
    }
  }
}
