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
  }

  update() {
    const gs = this.game_scene;
    if (!gs || !gs.caster) return;
    const pct = Phaser.Math.Clamp(gs.caster.hp / gs.caster.maxHp, 0, 1);
    this.hpFill.width = this.hpMaxW * pct;

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
