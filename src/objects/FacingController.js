// src/objects/FacingController.js
// pickFacing is PURE. FacingController touches Phaser anims (not unit-tested).

export function pickFacing(vx, vy, lastDir = 'down') {
  if (Math.abs(vx) > Math.abs(vy)) return { dir: 'side', flipX: vx < 0 };
  return { dir: vy < 0 ? 'up' : 'down', flipX: false };
}

const MOVE_EPS = 6; // px/s below which we treat the entity as idle

export class FacingController {
  // sprite: a Phaser sprite. key: the creature key (anim keys are `${key}-${state}-${dir}`).
  constructor(sprite, key, lastDir = 'down') {
    this.sprite = sprite;
    this.key = key;
    this.lastDir = lastDir;
  }

  // Call every frame. aim is an optional {x,y} world point to face when idle (hero auto-aim).
  update(vx, vy, aim) {
    const moving = Math.abs(vx) + Math.abs(vy) > MOVE_EPS;
    let f;
    if (moving) {
      f = pickFacing(vx, vy, this.lastDir);
    } else if (aim) {
      f = pickFacing(aim.x - this.sprite.x, aim.y - this.sprite.y, this.lastDir);
    } else {
      f = { dir: this.lastDir, flipX: this.sprite.flipX };
    }
    this.lastDir = f.dir;
    this.sprite.setFlipX(f.flipX);
    const state = moving ? 'walk' : 'idle';
    this.sprite.anims.play(`${this.key}-${state}-${f.dir}`, true);
  }
}
