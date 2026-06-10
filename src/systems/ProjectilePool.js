// A reusable physics group of projectiles. fire() activates one from the pool.
export class ProjectilePool {
  constructor(scene) {
    this.scene = scene;
    this.group = scene.physics.add.group({ maxSize: 200 });
  }

  fire(texKey, x, y, targetX, targetY, speed, damage, radius) {
    let p = this.group.getFirstDead(false);
    if (!p) {
      p = this.group.create(x, y, texKey);
    } else {
      p.setTexture(texKey);
      p.enableBody(true, x, y, true, true);
    }
    p.setActive(true).setVisible(true);
    p.damage = damage;
    p.aoeRadius = radius || 0; // > 0 means explode-on-impact (fireball)
    p.burnDps = 0;             // reset; only fireball sets this after fire()
    p.burnMs = 0;
    p.homing = false;
    const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
    p.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
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
