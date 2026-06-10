import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { REGIONS } from '../data/regions.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { getStats } from '../systems/SkillTree.js';
import { clearedCount, isLevelUnlocked } from '../systems/Campaign.js';

const KIND_LABEL = { basic: 'Básico', intermediate: 'Intermedio', pretemple: 'Pre-templo', levelboss: 'Jefe de Nivel', temple: 'Templo' };

export default class BranchScene extends Phaser.Scene {
  constructor() { super('Branch'); }

  init(data) { this.regionId = data.regionId || 'fire'; }

  // Runtime stats = skill-tree stats + unlocked active-skill flags.
  runtimeStats(save) {
    const stats = getStats(save);
    stats.unlockedSkills = [...(save.unlockedSkills || [])];
    return stats;
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    const save = new SaveSystem(window.localStorage).load();
    const region = REGIONS[this.regionId];
    const cleared = clearedCount(save, this.regionId);

    this.add.text(GAME_WIDTH / 2, 40, region.name, {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#fff', fontStyle: 'bold',
    }).setOrigin(0.5);

    region.levels.forEach((level, i) => {
      const y = 110 + i * 92;
      const unlocked = isLevelUnlocked(save, this.regionId, i);
      const done = i < cleared;
      const playable = unlocked && !done; // no replay of finished levels

      const fill = done ? 0x1b3a1b : (playable ? 0x241c33 : 0x161320);
      const stroke = done ? 0x66bb6a : (playable ? 0x4fc3f7 : 0x444444);
      const node = this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 60, 72, fill)
        .setStrokeStyle(2, stroke, playable ? 1 : 0.5);

      const tag = level.kind === 'temple' ? '⛩️ ' : '';
      this.add.text(50, y - 14, `${tag}Nivel ${i + 1} — ${KIND_LABEL[level.kind]}`, {
        fontFamily: 'sans-serif', fontSize: '16px', color: playable || done ? '#fff' : '#777',
      });
      const status = done ? '✔ completado' : (playable ? '▶ jugar' : '🔒 bloqueado');
      this.add.text(GAME_WIDTH - 50, y, status, {
        fontFamily: 'sans-serif', fontSize: '14px', color: done ? '#66bb6a' : (playable ? '#ffd54f' : '#777'),
      }).setOrigin(1, 0.5);

      if (playable) {
        node.setInteractive();
        node.on('pointerdown', () => {
          this.scene.start('Game', { regionId: this.regionId, levelIndex: i, stats: this.runtimeStats(save) });
        });
      }
    });

    const back = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 40, 180, 44, 0x4fc3f7, 0.2)
      .setStrokeStyle(2, 0x4fc3f7).setInteractive();
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '← Mapa', {
      fontFamily: 'sans-serif', fontSize: '17px', color: '#fff',
    }).setOrigin(0.5);
    back.on('pointerdown', () => this.scene.start('Map'));
  }
}
