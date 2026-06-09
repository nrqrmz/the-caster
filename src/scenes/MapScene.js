import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { REGIONS, REGION_ORDER, CASTLE_ID, REQUIRED_ELEMENTS } from '../data/regions.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { isCastleUnlocked, isRegionComplete } from '../systems/Campaign.js';

const PORTAL_ICON = { fire: '🔥', water: '💧', air: '💨', earth: '🌿', castle: '👑' };

export default class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const save = new SaveSystem(window.localStorage).load();

    this.add.text(GAME_WIDTH / 2, 50, 'EL MAPA', {
      fontFamily: 'sans-serif', fontSize: '30px', color: '#4fc3f7', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 86, `Elementos dominados: ${(save.elements || []).length}/4`, {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#ffd54f',
    }).setOrigin(0.5);

    // Four element portals in a 2×2 grid.
    REGION_ORDER.forEach((id, i) => {
      const col = i % 2; const row = Math.floor(i / 2);
      const x = GAME_WIDTH / 2 + (col === 0 ? -100 : 100);
      const y = 200 + row * 150;
      const region = REGIONS[id];
      const complete = isRegionComplete(save, region);
      this.portal(x, y, region.name, PORTAL_ICON[id], complete, true, () => this.scene.start('Branch', { regionId: id }));
    });

    // Castle portal (gated by all 4 elements).
    const castleOpen = isCastleUnlocked(save, REQUIRED_ELEMENTS);
    this.portal(GAME_WIDTH / 2, 540, REGIONS[CASTLE_ID].name, PORTAL_ICON.castle, isRegionComplete(save, REGIONS[CASTLE_ID]), castleOpen,
      () => this.scene.start('Branch', { regionId: CASTLE_ID }),
      castleOpen ? null : 'Requiere los 4 elementos');

    // Skill tree access.
    const st = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 60, 220, 50, 0x4fc3f7, 0.2)
      .setStrokeStyle(2, 0x4fc3f7).setInteractive();
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60, `🌳 Árbol  (${save.skillPoints} pts)`, {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#fff',
    }).setOrigin(0.5);
    st.on('pointerdown', () => this.scene.start('SkillTree'));
  }

  portal(x, y, name, icon, complete, enabled, onTap, lockNote) {
    const stroke = complete ? 0x66bb6a : (enabled ? 0xffd54f : 0x555555);
    const box = this.add.rectangle(x, y, 150, 110, 0x241c33, enabled ? 1 : 0.6)
      .setStrokeStyle(3, stroke);
    this.add.text(x, y - 18, icon, { fontSize: '40px' }).setOrigin(0.5).setAlpha(enabled ? 1 : 0.5);
    this.add.text(x, y + 30, name, {
      fontFamily: 'sans-serif', fontSize: '15px', color: enabled ? '#fff' : '#777',
    }).setOrigin(0.5);
    if (complete) this.add.text(x + 58, y - 42, '✔', { fontSize: '20px', color: '#66bb6a' }).setOrigin(0.5);
    if (lockNote) this.add.text(x, y + 48, lockNote, { fontFamily: 'sans-serif', fontSize: '11px', color: '#999' }).setOrigin(0.5);
    if (enabled) { box.setInteractive(); box.on('pointerdown', onTap); }
  }
}
