import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';

export default class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  init(data) { this.game_scene = data.gameScene; }

  create() {
    // Health bar (top).
    this.hpBack = this.add.rectangle(GAME_WIDTH / 2, 24, GAME_WIDTH - 40, 16, COLORS.healthBack).setOrigin(0.5);
    this.hpFill = this.add.rectangle(22, 24, GAME_WIDTH - 44, 12, COLORS.healthFill).setOrigin(0, 0.5);
    this.hpMaxW = GAME_WIDTH - 44;

    // Fireball button (bottom-right). Disabled until skill granted.
    this.fireBtn = this.add.circle(GAME_WIDTH - 56, GAME_HEIGHT - 70, 36, COLORS.fireball, 0.25)
      .setStrokeStyle(3, COLORS.fireball).setInteractive();
    this.fireLabel = this.add.text(GAME_WIDTH - 56, GAME_HEIGHT - 70, '🔥', { fontSize: '28px' }).setOrigin(0.5);
    this.cdArc = this.add.graphics();

    // Only cast while Game is actually active — Game is paused during any
    // dialogue overlay, so this stops a dialogue-advance tap from also firing.
    this.fireBtn.on('pointerdown', () => {
      if (this.game_scene && this.game_scene.scene.isActive('Game')) this.game_scene.tryCastFireball();
    });
  }

  update() {
    const gs = this.game_scene;
    if (!gs || !gs.caster) return;
    const pct = Phaser.Math.Clamp(gs.caster.hp / gs.caster.maxHp, 0, 1);
    this.hpFill.width = this.hpMaxW * pct;

    const ready = gs.stats.hasFireball;
    this.fireBtn.setAlpha(ready ? 1 : 0.25);
    this.fireLabel.setAlpha(ready ? 1 : 0.3);

    // Cooldown sweep.
    this.cdArc.clear();
    if (ready && gs.fireballCdRemaining > 0) {
      const frac = gs.fireballCdRemaining / gs.stats.fireballCooldown;
      this.cdArc.fillStyle(0x000000, 0.5);
      this.cdArc.slice(GAME_WIDTH - 56, GAME_HEIGHT - 70, 36,
        -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac, false);
      this.cdArc.fillPath();
    }
  }
}
