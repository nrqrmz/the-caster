import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEX } from '../config.js';
import { SCENARIO_1 } from '../data/scenarios.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { BASE_STATS } from '../data/stats.js';
import { WaveRunner } from '../systems/WaveRunner.js';
import { ProjectilePool } from '../systems/ProjectilePool.js';
import { VirtualJoystick } from '../systems/InputSystem.js';
import { applyDamage } from '../systems/CombatSystem.js';
import Caster from '../objects/Caster.js';
import Enemy from '../objects/Enemy.js';
import Boss from '../objects/Boss.js';
import Temple from '../objects/Temple.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    // stats provided by Menu/SkillTree later; fall back to base for standalone runs.
    this.stats = data.stats || { ...BASE_STATS };
    this.scenario = SCENARIO_1;
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.caster = new Caster(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, this.stats);
    this.joystick = new VirtualJoystick(this);
    this.orbs = new ProjectilePool(this);
    this.enemyShots = new ProjectilePool(this);
    this.enemies = this.physics.add.group();

    this.fireballCdRemaining = 0;
    this.scene.launch('UI', { gameScene: this });

    this.runner = new WaveRunner(this.scenario);
    this.runnerStarted = false;

    this.debug = this.add.text(8, 8, '', { fontFamily: 'monospace', fontSize: '14px', color: '#fff' }).setDepth(2000);

    this.setupCollisions();
    this.beginPhase();
  }

  setupCollisions() {
    this.physics.add.overlap(this.orbs.group, this.enemies, (orb, enemy) => {
      if (!orb.active || !enemy.active) return;
      this.hitEnemy(enemy, orb.damage);
      if (orb.aoeRadius > 0) this.explode(orb, enemy);
      this.orbs.despawn(orb);
    });
    this.physics.add.overlap(this.caster, this.enemies, (caster, enemy) => {
      if (!enemy.active) return;
      this.damageCaster(enemy.def.damage * 0.02 * 16); // small continuous touch damage
    });
    this.physics.add.overlap(this.caster, this.enemyShots.group, (caster, shot) => {
      if (!shot.active) return;
      this.damageCaster(shot.damage);
      this.enemyShots.despawn(shot);
    });
  }

  beginPhase() {
    const phase = this.runner.phase;
    if (phase === 'wave') {
      this.spawnWave(this.runner.currentWave());
    } else if (phase === 'miniboss') {
      this.spawnBoss(this.scenario.miniboss);
    } else if (phase === 'temple') {
      this.spawnTemple();
    } else if (phase === 'boss') {
      this.spawnBoss(this.scenario.boss);
    } else if (phase === 'done') {
      this.finishScenario();
    }
  }

  spawnBoss(def) {
    this.boss = new Boss(this, GAME_WIDTH / 2, -40, def);
    this.enemies.add(this.boss);
  }

  spawnTemple() {
    this.temple = new Temple(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, this.scenario.temple);
    this.templeOverlap = this.physics.add.overlap(this.caster, this.temple, () => {
      if (this.temple && this.temple.active) {
        this.stats.hasFireball = true; // skill granted (used by Phase 4 fireball button)
        this.temple.destroy();
        this.temple = null;
        if (this.templeOverlap) { this.templeOverlap.destroy(); this.templeOverlap = null; }
        this.runner.onCleared();
        this.beginPhase();
      }
    });
  }

  finishScenario() {
    // Refined in Task 5.x (award points + go to SkillTree). Stub for now:
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '¡Escenario completo!', {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#fff',
    }).setOrigin(0.5).setDepth(3000);
    this.physics.pause();
  }

  spawnWave(wave) {
    if (this.spawnEvent) { this.spawnEvent.remove(false); this.spawnEvent = null; }
    const queue = [];
    for (const s of wave.spawns) {
      for (let i = 0; i < s.count; i++) queue.push(s.type);
    }
    this.spawnQueue = queue;
    this.spawnEvent = this.time.addEvent({
      delay: wave.spawnDelay,
      repeat: queue.length - 1,
      callback: () => {
        const type = this.spawnQueue.shift();
        if (type) this.spawnEnemy(ENEMY_TYPES[type]);
      },
    });
  }

  spawnEnemy(def) {
    // spawn just outside a random edge
    const edge = Phaser.Math.Between(0, 3);
    let x = 0; let y = 0;
    if (edge === 0) { x = Phaser.Math.Between(0, GAME_WIDTH); y = -20; }
    else if (edge === 1) { x = GAME_WIDTH + 20; y = Phaser.Math.Between(0, GAME_HEIGHT); }
    else if (edge === 2) { x = Phaser.Math.Between(0, GAME_WIDTH); y = GAME_HEIGHT + 20; }
    else { x = -20; y = Phaser.Math.Between(0, GAME_HEIGHT); }
    const e = new Enemy(this, x, y, def);
    this.enemies.add(e);
    return e;
  }

  hitEnemy(enemy, damage) {
    const r = applyDamage({ hp: enemy.hp }, damage);
    enemy.hp = r.hp;
    if (r.dead) {
      enemy.destroy();
      this.checkPhaseCleared();
    }
  }

  explode(orb, centerEnemy) {
    const targets = [];
    this.enemies.children.iterate((e) => {
      if (!e || !e.active || e === centerEnemy) return true;
      if (Phaser.Math.Distance.Between(orb.x, orb.y, e.x, e.y) <= orb.aoeRadius) {
        targets.push(e);
      }
      return true;
    });
    for (const e of targets) this.hitEnemy(e, orb.damage);
  }

  damageCaster(amount) {
    const r = applyDamage({ hp: this.caster.hp }, amount);
    this.caster.hp = r.hp;
    if (r.dead) this.scene.restart(); // die → restart scenario (Phase 5 refines this)
  }

  checkPhaseCleared() {
    const phase = this.runner.phase;
    if (phase === 'wave') {
      const alive = this.enemies.countActive(true);
      const stillSpawning = this.spawnEvent && this.spawnEvent.getRepeatCount() > 0;
      if (alive === 0 && !stillSpawning) {
        this.runner.onCleared();
        this.beginPhase();
      }
    } else if (phase === 'miniboss' || phase === 'boss') {
      if (this.enemies.countActive(true) === 0) {
        this.boss = null;
        this.runner.onCleared();
        this.beginPhase();
      }
    }
    // 'temple' advances via overlap, not via kills.
  }

  fireOrb(target) {
    this.orbs.fire(TEX.orb, this.caster.x, this.caster.y, target.x, target.y, 420, this.stats.basicDamage, 0);
  }

  fireArrow(enemy) {
    this.enemyShots.fire(TEX.arrow, enemy.x, enemy.y, this.caster.x, this.caster.y, 260, enemy.def.damage, 0);
  }

  tryCastFireball() {
    if (!this.stats.hasFireball) return;
    if (this.fireballCdRemaining > 0) return;
    const liveEnemies = this.enemies.getChildren().filter((e) => e.active);
    const target = this.caster.nearestEnemy(liveEnemies);
    if (!target) return;
    this.fireballCdRemaining = this.stats.fireballCooldown;
    this.orbs.fire(TEX.fireball, this.caster.x, this.caster.y, target.x, target.y, 320, this.stats.fireballDamage, 70);
  }

  update(time, delta) {
    if (this.fireballCdRemaining > 0) this.fireballCdRemaining -= delta;
    this.caster.moveBy(this.joystick.vector);
    const liveEnemies = this.enemies.getChildren().filter((e) => e.active);
    this.caster.updateAutoAim(time, delta, liveEnemies, (t) => this.fireOrb(t));
    for (const e of liveEnemies) {
      e.updateBehavior(delta, this.caster, (en) => this.fireArrow(en));
    }
    this.orbs.cullOffscreen(GAME_WIDTH, GAME_HEIGHT);
    this.enemyShots.cullOffscreen(GAME_WIDTH, GAME_HEIGHT);
    this.debug.setText(`hp ${Math.ceil(this.caster.hp)}  enemies ${liveEnemies.length}  phase ${this.runner.phase}`);
    if (this.boss && this.boss.active) this.boss.drawBar();
  }
}
