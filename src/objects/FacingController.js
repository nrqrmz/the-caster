// src/objects/FacingController.js
// pickFacing is PURE. FacingController touches Phaser anims (not unit-tested).

export function pickFacing(vx, vy, lastDir = 'down') {
  if (Math.abs(vx) > Math.abs(vy)) return { dir: 'side', flipX: vx < 0 };
  return { dir: vy < 0 ? 'up' : 'down', flipX: false };
}

// PURE. flipX para un enemigo que siempre mira a la princesa: voltea cuando ella
// está a la izquierda del sprite. Sin histéresis (banda muerta opcional a futuro).
export function facePlayerFlip(spriteX, targetX) {
  return targetX < spriteX;
}

const MOVE_EPS = 6; // px/s below which we treat the entity as idle

export class FacingController {
  // sprite: a Phaser sprite. key: the creature key (anim keys are `${key}-${state}-${dir}`).
  constructor(sprite, key, lastDir = 'down') {
    this.sprite = sprite;
    this.key = key;
    this.lastDir = lastDir;
    this.attacking = false;
    this.facePlayer = false; // si true, el flipX se rige por `aim` (la princesa) cada frame
  }

  // Play the one-shot attack anim for the current facing; ignored if the creature has no
  // attack anim. Locks idle/walk until the attack anim completes.
  playAttack() {
    const key = `${this.key}-attack-${this.lastDir}`;
    const sceneAnims = this.sprite.scene && this.sprite.scene.anims;
    if (!sceneAnims || !sceneAnims.exists(key)) return;
    this.attacking = true;
    this.sprite.once('animationcomplete', () => { this.attacking = false; });
    this.sprite.anims.play(key, true);
  }

  // Call every frame. aim is an optional {x,y} world point to face when idle (hero auto-aim).
  update(vx, vy, aim) {
    if (this.attacking) {
      const moving = Math.abs(vx) + Math.abs(vy) > MOVE_EPS;
      if (moving) this.lastDir = pickFacing(vx, vy, this.lastDir).dir;
      return;
    }
    const moving = Math.abs(vx) + Math.abs(vy) > MOVE_EPS;
    // facePlayer: el flipX se rige por la princesa (aim) cada frame, no por la velocidad.
    // El sprite es de vista lateral: dirección 'side', se voltea al cruzar ella la vertical.
    if (this.facePlayer && aim) {
      const flipX = facePlayerFlip(this.sprite.x, aim.x);
      this.lastDir = 'side';
      this.sprite.setFlipX(flipX);
      const state = moving ? 'walk' : 'idle';
      this.sprite.anims.play(`${this.key}-${state}-side`, true);
      return;
    }
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
