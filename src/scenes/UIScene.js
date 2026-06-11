import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { SKILLS } from '../data/skills.js';

export default class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  init(data) { this.game_scene = data.gameScene; }

  create() {
    // Health bar (top).
    this.hpBack = this.add.rectangle(GAME_WIDTH / 2, 24, GAME_WIDTH - 40, 16, COLORS.healthBack).setOrigin(0.5);
    this.hpFill = this.add.rectangle(22, 24, GAME_WIDTH - 44, 12, COLORS.healthFill).setOrigin(0, 0.5);
    this.hpMaxW = GAME_WIDTH - 44;

    // One cooldown button per UNLOCKED skill, stacked up from the bottom-right.
    const unlocked = (this.game_scene.stats && this.game_scene.stats.unlockedSkills) || [];
    const shown = SKILLS.filter((s) => unlocked.includes(s.key));
    this.buttons = [];
    shown.forEach((s, i) => {
      const x = GAME_WIDTH - 56;
      const y = GAME_HEIGHT - 70 - i * 84;
      const circle = this.add.circle(x, y, 36, s.color, 0.25).setStrokeStyle(3, s.color).setInteractive();
      const cdArc = this.add.graphics();
      // Icon last so the cooldown sweep draws under it, not over it.
      this.add.text(x, y, s.icon, { fontSize: '26px' }).setOrigin(0.5);
      circle.on('pointerdown', () => {
        // Only cast while Game is active (it pauses during dialogue overlays).
        if (this.game_scene.scene.isActive('Game')) this.game_scene.tryCast(s.key);
      });
      this.buttons.push({ key: s.key, x, y, cdArc });
    });

    // Pause button (top-left, below the HP bar). Opens the pause overlay (Resume / Abandon).
    const pauseBtn = this.add.circle(22, 64, 20, COLORS.healthFill, 0.2).setStrokeStyle(2, COLORS.healthFill).setInteractive();
    this.add.text(22, 64, '⏸', { fontSize: '18px', color: '#fff' }).setOrigin(0.5);
    pauseBtn.on('pointerdown', () => {
      if (this.game_scene.scene.isActive('Game')) this.game_scene.openPauseMenu();
    });

    // Elixir consumable button (top-right, below the HP bar).
    this.elixirBtn = this.add.circle(GAME_WIDTH - 40, 64, 22, COLORS.fireball, 0.2).setStrokeStyle(2, COLORS.fireball).setInteractive();
    this.add.text(GAME_WIDTH - 40, 64, '⚗️', { fontSize: '18px' }).setOrigin(0.5);
    this.elixirCount = this.add.text(GAME_WIDTH - 22, 80, '', { fontFamily: 'sans-serif', fontSize: '12px', color: '#fff' }).setOrigin(0.5);
    this.elixirBtn.on('pointerdown', () => {
      if (this.game_scene.scene.isActive('Game')) this.game_scene.useElixir();
    });

    // Multi-form boss indicator (e.g. "2/5"): shows which shapeshifter form is active.
    this.bossFormLabel = this.add.text(GAME_WIDTH / 2, 40, '', {
      fontFamily: 'sans-serif', fontSize: '13px', color: '#' + COLORS.ice.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(1600);
  }

  update() {
    const gs = this.game_scene;
    if (!gs || !gs.caster) return;
    const pct = Phaser.Math.Clamp(gs.caster.hp / gs.caster.maxHp, 0, 1);
    this.hpFill.width = this.hpMaxW * pct;
    if (this.elixirCount) {
      this.elixirCount.setText(`x${(gs.inventory && gs.inventory.elixir) || 0}`);
      this.elixirBtn.setStrokeStyle(2, gs.damageBuffRemaining > 0 ? 0xffd54f : COLORS.fireball);
    }
    // Per-form boss indicator: only shown for shapeshifter bosses with a FormSequencer.
    if (this.bossFormLabel) {
      const boss = gs.boss;
      if (boss && boss.active && boss._formSeq) {
        const idx = boss._formSeq.activeFormIndex + 1;
        const total = boss._formSeq.forms.length;
        this.bossFormLabel.setText(`${idx}/${total}`);
      } else {
        this.bossFormLabel.setText('');
      }
    }

    for (const b of this.buttons) {
      b.cdArc.clear();
      const remaining = (gs.cooldowns && gs.cooldowns[b.key]) || 0;
      const total = gs.stats[`${b.key}Cooldown`] || 1;
      if (remaining > 0) {
        const frac = Phaser.Math.Clamp(remaining / total, 0, 1);
        b.cdArc.fillStyle(0x000000, 0.5);
        b.cdArc.slice(b.x, b.y, 36, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false);
        b.cdArc.fillPath();
      }
    }
  }
}
