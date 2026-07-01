// src/scenes/IntroScene.js
// Per-world entry screen: shows the region's lore while forging that world's
// sprite set in the background (chunked). On "Continuar": if the forge is done,
// go to Branch; otherwise show a loading bar and advance when it finishes.
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { t } from '../i18n/index.js';
import { REGIONS } from '../data/regions.js';
import { regionSpriteKeys } from '../data/spriteManifest.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { bakeSprites } from './spriteBaker.js';

export default class IntroScene extends Phaser.Scene {
  constructor() { super('Intro'); }

  init(data) { this.regionId = data.regionId; }

  create() {
    const region = REGIONS[this.regionId];
    this.cameras.main.setBackgroundColor(COLORS.bg);

    // Show the lore only the first time this world is entered (persisted in save).
    // The forge still runs every session, so a return visit becomes a silent
    // load-and-advance screen instead of repeating the intro.
    this.save = new SaveSystem(window.localStorage);
    const state = this.save.load();
    this.firstVisit = !(state.seenIntros || []).includes(this.regionId);
    if (this.firstVisit) {
      state.seenIntros = [...(state.seenIntros || []), this.regionId];
      this.save.write(state);
    }

    this.add.text(GAME_WIDTH / 2, 70, t(region.name), {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#ffd54f', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    if (this.firstVisit) {
      const lore = (region.intro || []).map((l) => t(l.text)).join('\n\n');
      this.add.text(GAME_WIDTH / 2, 140, lore, {
        fontFamily: 'sans-serif', fontSize: '17px', color: '#ffffff',
        align: 'center', wordWrap: { width: GAME_WIDTH - 60 }, lineSpacing: 6,
      }).setOrigin(0.5, 0);
    }

    this.btn = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 90, 220, 56, 0x4fc3f7, 0.2)
      .setStrokeStyle(2, 0x4fc3f7).setInteractive();
    this.btnLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 90, t('ui.continue'), {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);

    this.barBg = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 44, 220, 8, 0x333333).setVisible(false);
    this.barFill = this.add.rectangle(GAME_WIDTH / 2 - 110, GAME_HEIGHT - 44, 0, 8, 0x66bb6a)
      .setOrigin(0, 0.5).setVisible(false);

    this.baked = false;
    this.progress = { done: 0, total: 1 };
    this.bakePromise = bakeSprites(this, [...regionSpriteKeys(region)], {
      onProgress: (done, total) => { this.progress = { done, total }; },
    }).then(() => { this.baked = true; });

    this.btn.on('pointerdown', () => this.proceed());

    // Return visit: don't make the player tap through lore they've read — auto-proceed
    // (which reveals the loading bar and advances as soon as the forge finishes).
    if (!this.firstVisit) this.proceed();
  }

  proceed() {
    if (this.baked) { this.go(); return; }
    // Forge still running: reveal the loading bar and advance when it resolves.
    this.btn.disableInteractive();
    this.btnLabel.setText(t('ui.loading'));
    this.barBg.setVisible(true);
    this.barFill.setVisible(true);
    this.bakePromise.then(() => this.go());
  }

  go() { this.scene.start('Branch', { regionId: this.regionId }); }

  update() {
    if (this.barFill.visible) {
      const p = this.progress.total ? this.progress.done / this.progress.total : 1;
      this.barFill.width = 220 * p;
    }
  }
}
