// src/objects/StaticBlock.js — obstáculo inamovible que el caster no atraviesa.
// Solo movimiento: los proyectiles pasan (colisionan por sus propios overlaps).
import { TEX, COLORS } from '../config.js';

export default class StaticBlock extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, width = 40, height = width, tint = COLORS.stoneGrey) {
    super(scene, x, y, TEX.villager); // textura genérica 32px, tintada
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDisplaySize(width, height);
    if (this.body) { this.body.setSize(width, height); }
    this.setImmovable(true);
    this.setTint(tint);
    this.setDepth(5);
  }
}
