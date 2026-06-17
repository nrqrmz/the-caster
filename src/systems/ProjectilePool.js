// A reusable physics group of projectiles. fire() activates one from the pool.
import { TEX, spriteKey, PROJECTILE_DEPTH } from '../config.js';
import { hasRecipe } from '../data/sprites/recipes.js';

const PROJECTILE_KEY = {
  [TEX.orb]: 'orb', [TEX.fireball]: 'fireball', [TEX.arrow]: 'arrow',
  [TEX.iceShard]: 'iceShard', [TEX.poisonGlob]: 'poisonGlob',
};

export class ProjectilePool {
  constructor(scene, maxSize = 200) {
    this.scene = scene;
    this.group = scene.physics.add.group({ maxSize });
  }

  fire(texKey, x, y, targetX, targetY, speed, damage, radius) {
    const sprKey = PROJECTILE_KEY[texKey];
    const useSprite = sprKey && hasRecipe(sprKey);
    const drawKey = useSprite ? spriteKey(sprKey) : texKey;

    let p = this.group.getFirstDead(false);
    if (!p) {
      p = this.group.create(x, y, drawKey);
    } else {
      p.setTexture(drawKey);
      p.enableBody(true, x, y, true, true);
    }
    p.setActive(true).setVisible(true).setDepth(PROJECTILE_DEPTH); // above ground hazards (5-7) so lava can't hide shots
    p.damage = damage;
    p.aoeRadius = radius || 0; // > 0 means explode-on-impact (fireball)
    p.burnDps = 0;             // reset; effect props se setean tras fire() según el tipo
    p.burnMs = 0;
    p.slowFactor = 0;          // reset; solo los disparos de hielo lo setean
    p.slowMs = 0;
    p.poisonDps = 0;           // reset; solo los disparos de veneno lo setean
    p.poisonMs = 0;
    p.homing = false;
    p.homingLife = 0;          // reset; only homing enemy shots set this after fire()
    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    p.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    if (useSprite) {
      p.setRotation(0);
      if (sprKey === 'orb' || sprKey === 'fireball') p.anims.play(`${sprKey}-idle-down`, true);
      if (sprKey === 'fireball' || sprKey === 'arrow' || sprKey === 'iceShard') p.setRotation(angle);
    } else {
      p.setRotation(0);
    }
    return p;
  }

  despawn(p) {
    p.disableBody(true, true);
  }

  // Recycle projectiles that left the world bounds (call from scene update).
  cullOffscreen(width, height) {
    this.group.children.iterate((p) => {
      if (!p || !p.active) return true;
      if (p.x < -40 || p.x > width + 40 || p.y < -40 || p.y > height + 40) {
        this.despawn(p);
      }
      return true;
    });
  }
}
