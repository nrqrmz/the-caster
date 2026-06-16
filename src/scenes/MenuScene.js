import { GAME_WIDTH, GAME_HEIGHT, COLORS, DEBUG } from '../config.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { t, getLanguage, setLanguage } from '../i18n/index.js';

export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, t('menu.title'), {
      fontFamily: 'sans-serif', fontSize: '44px', color: '#4fc3f7', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, t('menu.subtitle'), {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffd54f',
    }).setOrigin(0.5);

    const play = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, t('menu.play'), {
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

    // Language toggle (menu-only). Tapping the inactive code switches + persists + re-renders.
    const lang = getLanguage();
    const makeLangBtn = (label, code, x) => {
      const active = lang === code;
      const btn = this.add.text(x, GAME_HEIGHT - 40, label, {
        fontFamily: 'sans-serif', fontSize: '18px',
        color: active ? '#ffd54f' : '#777777',
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      if (!active) btn.on('pointerdown', () => { setLanguage(code); this.scene.restart(); });
      return btn;
    };
    makeLangBtn('ES', 'es', GAME_WIDTH / 2 - 24);
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '|', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#555555',
    }).setOrigin(0.5);
    makeLangBtn('EN', 'en', GAME_WIDTH / 2 + 24);

    if (DEBUG) {
      const wipe = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 72, t('menu.wipe'), {
        fontFamily: 'sans-serif', fontSize: '14px', color: '#ef5350',
      }).setOrigin(0.5).setInteractive();
      wipe.on('pointerdown', () => {
        if (wipe.getData('armed')) {
          new SaveSystem(window.localStorage).reset();
          this.scene.start('Boot');
        } else {
          wipe.setData('armed', true);
          wipe.setText(t('menu.wipeConfirm'));
        }
      });
    }
  }

  startCampaign() {
    this.scene.start('Map');
  }
}
