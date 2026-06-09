import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { SKILL_TREE, SKILL_TREE_ORDER } from '../data/skilltree.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { canPurchase, purchase } from '../systems/SkillTree.js';

export default class SkillTreeScene extends Phaser.Scene {
  constructor() { super('SkillTree'); }

  create() {
    this.save = new SaveSystem(window.localStorage);
    this.state = this.save.load();
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.add.text(GAME_WIDTH / 2, 40, 'Árbol de Habilidades', {
      fontFamily: 'sans-serif', fontSize: '24px', color: '#fff',
    }).setOrigin(0.5);
    this.pointsText = this.add.text(GAME_WIDTH / 2, 76, '', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#ffd54f',
    }).setOrigin(0.5);

    this.rows = [];
    SKILL_TREE_ORDER.forEach((id, i) => {
      const y = 120 + i * 70;
      const node = SKILL_TREE[id];
      const bg = this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 40, 56, 0x241c33)
        .setStrokeStyle(2, 0x4fc3f7, 0.4).setInteractive();
      const label = this.add.text(40, y - 16, `${node.label}  (${node.cost})`, {
        fontFamily: 'sans-serif', fontSize: '16px', color: '#fff',
      });
      const status = this.add.text(GAME_WIDTH - 40, y, '', {
        fontFamily: 'sans-serif', fontSize: '14px', color: '#aaa',
      }).setOrigin(1, 0.5);
      bg.on('pointerdown', () => this.buy(id));
      this.rows.push({ id, bg, label, status });
    });

    // Continue button.
    const cont = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 50, 200, 48, 0x4fc3f7, 0.25)
      .setStrokeStyle(2, 0x4fc3f7).setInteractive();
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, 'Continuar', {
      fontFamily: 'sans-serif', fontSize: '18px', color: '#fff',
    }).setOrigin(0.5);
    cont.on('pointerdown', () => this.scene.start('Map'));

    this.refresh();
  }

  buy(id) {
    const check = canPurchase(this.state, id);
    if (!check.ok) return;
    this.state = purchase(this.state, id);
    this.save.write(this.state);
    this.refresh();
  }

  refresh() {
    this.pointsText.setText(`Puntos: ${this.state.skillPoints}`);
    for (const row of this.rows) {
      const owned = this.state.purchasedNodes.includes(row.id);
      const check = canPurchase(this.state, row.id);
      row.status.setText(owned ? '✔ comprado' : (check.ok ? 'comprar' : check.reason));
      row.bg.setFillStyle(owned ? 0x1b3a1b : (check.ok ? 0x241c33 : 0x1a1622));
    }
  }
}
