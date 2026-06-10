import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { SKILL_TREE, SKILL_BRANCHES } from '../data/skilltree.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { canPurchase, purchase, isBranchUnlocked } from '../systems/SkillTree.js';
import { respecCost, canRespec, respec } from '../systems/Economy.js';

export default class SkillTreeScene extends Phaser.Scene {
  constructor() { super('SkillTree'); }

  create() {
    this.save = new SaveSystem(window.localStorage);
    this.state = this.save.load();
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.add.text(GAME_WIDTH / 2, 26, 'Árbol de Habilidades', {
      fontFamily: 'sans-serif', fontSize: '22px', color: '#fff',
    }).setOrigin(0.5);
    this.pointsText = this.add.text(GAME_WIDTH / 2, 54, '', {
      fontFamily: 'sans-serif', fontSize: '16px', color: '#ffd54f',
    }).setOrigin(0.5);

    // Tabs: one "General" (all element===null branches) + one per elemental branch.
    const general = SKILL_BRANCHES.filter((b) => b.element === null);
    const elementals = SKILL_BRANCHES.filter((b) => b.element !== null);
    this.tabs = [{ label: 'General', branches: general, unlocked: true }];
    for (const b of elementals) {
      this.tabs.push({ label: b.label, branches: [b], unlocked: isBranchUnlocked(this.state, b) });
    }

    this.activeTab = 0;
    this.tabObjs = [];
    const tabW = GAME_WIDTH / this.tabs.length;
    this.tabs.forEach((t, i) => {
      const x = tabW * i + tabW / 2;
      const bg = this.add.rectangle(x, 90, tabW - 4, 30, 0x1b1526).setStrokeStyle(1, 0x33294a).setInteractive();
      this.add.text(x, 90, t.label, { fontFamily: 'sans-serif', fontSize: '13px', color: t.unlocked ? '#fff' : '#777' }).setOrigin(0.5);
      bg.on('pointerdown', () => { this.activeTab = i; this.renderTab(); });
      this.tabObjs.push(bg);
    });

    const rb = this.add.rectangle(GAME_WIDTH / 2 - 110, GAME_HEIGHT - 36, 200, 44, 0xd32f2f, 0.2).setStrokeStyle(2, 0xd32f2f).setInteractive();
    this.respecLabel = this.add.text(GAME_WIDTH / 2 - 110, GAME_HEIGHT - 36, '', { fontFamily: 'sans-serif', fontSize: '15px', color: '#fff' }).setOrigin(0.5);
    rb.on('pointerdown', () => {
      if (!canRespec(this.state)) return;
      this.state = respec(this.state);
      this.save.write(this.state);
      this.renderTab();
    });

    const cont = this.add.rectangle(GAME_WIDTH / 2 + 110, GAME_HEIGHT - 36, 200, 44, 0x4fc3f7, 0.25).setStrokeStyle(2, 0x4fc3f7).setInteractive();
    this.add.text(GAME_WIDTH / 2 + 110, GAME_HEIGHT - 36, 'Continuar', { fontFamily: 'sans-serif', fontSize: '18px', color: '#fff' }).setOrigin(0.5);
    cont.on('pointerdown', () => this.scene.start('Map'));

    this.nodeLayer = this.add.container(0, 0);
    this.renderTab();
  }

  renderTab() {
    this.nodeLayer.removeAll(true);
    this.pointsText.setText(`Puntos: ${this.state.skillPoints}`);
    this.respecLabel.setText(`Reiniciar (${respecCost(this.state.respecCount)} oro)`);
    this.respecLabel.setColor(canRespec(this.state) ? '#fff' : '#777');
    this.tabObjs.forEach((bg, i) => bg.setFillStyle(i === this.activeTab ? 0x2a1c3e : 0x1b1526));

    const tab = this.tabs[this.activeTab];
    if (!tab.unlocked) {
      this.nodeLayer.add(this.add.text(GAME_WIDTH / 2, 320, 'Domina este elemento\nen su templo', {
        fontFamily: 'sans-serif', fontSize: '18px', color: '#777', align: 'center',
      }).setOrigin(0.5));
      return;
    }

    let topY = 124;
    for (const branch of tab.branches) {
      this.nodeLayer.add(this.add.text(20, topY, branch.label, {
        fontFamily: 'sans-serif', fontSize: '15px', color: '#cdbff0',
      }));
      const colW = (GAME_WIDTH - 40) / branch.tracks.length;
      branch.tracks.forEach((track, ci) => {
        const cx = 20 + colW * ci + colW / 2;
        this.nodeLayer.add(this.add.text(cx, topY + 22, track.label, {
          fontFamily: 'sans-serif', fontSize: '11px', color: '#9b8fb5',
        }).setOrigin(0.5));
        track.nodes.forEach((nodeId, ni) => this.makeNode(nodeId, cx, topY + 44 + ni * 40));
      });
      const maxNodes = Math.max(...branch.tracks.map((t) => t.nodes.length));
      topY += 44 + maxNodes * 40 + 18;
    }
  }

  makeNode(nodeId, x, y) {
    const node = SKILL_TREE[nodeId];
    const owned = this.state.purchasedNodes.includes(nodeId);
    const check = canPurchase(this.state, nodeId);
    const fill = owned ? 0x1b3a1b : (check.ok ? 0x2a1c3e : 0x161320);
    const stroke = owned ? 0x66bb6a : (check.ok ? 0x4fc3f7 : 0x44395e);
    const box = this.add.rectangle(x, y, 96, 34, fill).setStrokeStyle(2, stroke);
    const txt = owned ? `✔ ${node.label}` : `${node.label} · ${node.cost}pt`;
    const label = this.add.text(x, y, txt, {
      fontFamily: 'sans-serif', fontSize: '10px', color: owned || check.ok ? '#fff' : '#777',
      align: 'center', wordWrap: { width: 88 },
    }).setOrigin(0.5);
    if (!owned && check.ok) {
      box.setInteractive();
      box.on('pointerdown', () => {
        const c = canPurchase(this.state, nodeId);
        if (!c.ok) return;
        this.state = purchase(this.state, nodeId);
        this.save.write(this.state);
        this.renderTab();
      });
    }
    this.nodeLayer.add(box);
    this.nodeLayer.add(label);
  }
}
