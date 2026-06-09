import { TEX } from '../config.js';

export default class Temple extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, def) {
    super(scene, x, y, TEX.temple);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.def = def;
    this.setImmovable(true);
    scene.tweens.add({ targets: this, scale: 1.15, yoyo: true, repeat: -1, duration: 700 });
  }
}
