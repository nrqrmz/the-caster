// src/objects/StaticBlock.js — an immovable obstacle the caster cannot walk through.
// Movement-only: projectiles are unaffected (they collide via their own overlaps).
import { TEX, COLORS } from '../config.js';

export default class StaticBlock extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, size = 40) {
    super(scene, x, y, TEX.villager); // reuse a generic 32px texture; tinted to stone
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDisplaySize(size, size);
    if (this.body) { this.body.setSize(size, size); }
    this.setImmovable(true);
    this.setTint(COLORS.stoneGrey);
    this.setDepth(5);
  }
}
