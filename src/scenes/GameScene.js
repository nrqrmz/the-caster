import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEX } from '../config.js';
import { REGIONS } from '../data/regions.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { BASE_STATS } from '../data/stats.js';
import { WaveRunner } from '../systems/WaveRunner.js';
import { ProjectilePool } from '../systems/ProjectilePool.js';
import { VirtualJoystick } from '../systems/InputSystem.js';
import { applyDamage } from '../systems/CombatSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { difficultyMultiplier, scaleEnemyDef } from '../systems/Difficulty.js';
import { grantClear } from '../systems/Campaign.js';
import { BossMechanics } from '../systems/BossMechanics.js';
import Caster from '../objects/Caster.js';
import Enemy from '../objects/Enemy.js';
import Boss from '../objects/Boss.js';

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.regionId = data.regionId || 'fire';
    this.levelIndex = data.levelIndex || 0;
    this.region = REGIONS[this.regionId];
    this.level = this.region.levels[this.levelIndex];
    this.stats = data.stats || { ...BASE_STATS };

    const save = new SaveSystem(window.localStorage).load();
    this.mult = difficultyMultiplier(save);
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
    this.boss = null;
    this.bossMechanics = null;   // set in Phase 3
    this.poisonZones = [];       // set in Phase 3
    this.scene.launch('UI', { gameScene: this });

    this.runner = new WaveRunner(this.level);
    this.debug = this.add.text(8, 8, '', { fontFamily: 'monospace', fontSize: '14px', color: '#fff' }).setDepth(2000);

    this.setupCollisions();

    const intro = this.level.dialogue && this.level.dialogue.onEnter;
    if (intro && intro.length) {
      this.scene.pause();
      this.scene.launch('Dialogue', { lines: intro, onDone: () => { this.scene.resume(); this.beginPhase(); } });
    } else {
      this.beginPhase();
    }
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
      this.damageCaster(enemy.def.damage * 0.02 * 16);
    });
    this.physics.add.overlap(this.caster, this.enemyShots.group, (caster, shot) => {
      if (!shot.active) return;
      this.damageCaster(shot.damage);
      this.enemyShots.despawn(shot);
    });
  }

  beginPhase() {
    const phase = this.runner.currentPhase();
    if (!phase) { this.finishLevel(); return; }
    if (phase.type === 'wave') {
      this.spawnWave(phase);
    } else if (phase.type === 'miniboss' || phase.type === 'levelBoss') {
      this.spawnMinions(phase.minions);
      this.spawnBoss(phase.enemyDef);
    } else if (phase.type === 'templeBoss') {
      this.spawnMinions(phase.minions);
      this.spawnBoss(phase.enemyDef);
      this.attachBossMechanics(phase.mechanics); // no-op until Phase 3
    }
  }

  spawnBoss(def) {
    this.boss = new Boss(this, GAME_WIDTH / 2, -40, scaleEnemyDef(def, this.mult));
    this.enemies.add(this.boss);
  }

  attachBossMechanics(mechanics) {
    if (!mechanics || !this.boss) return;
    this.bossMechanics = new BossMechanics(this, this.boss, mechanics);
  }

  spawnMinions(minions) {
    if (!minions) return;
    for (const m of minions) {
      for (let i = 0; i < m.count; i++) this.spawnEnemy(ENEMY_TYPES[m.type]);
    }
  }

  spawnWave(phase) {
    if (this.spawnEvent) { this.spawnEvent.remove(false); this.spawnEvent = null; }
    const queue = [];
    for (const s of phase.spawns) {
      for (let i = 0; i < s.count; i++) queue.push(s.type);
    }
    this.spawnQueue = queue;
    this.spawnEvent = this.time.addEvent({
      delay: phase.spawnDelay,
      repeat: queue.length - 1,
      callback: () => {
        const type = this.spawnQueue.shift();
        if (type) this.spawnEnemy(ENEMY_TYPES[type]);
      },
    });
  }

  spawnEnemy(def) {
    const edge = Phaser.Math.Between(0, 3);
    let x = 0; let y = 0;
    if (edge === 0) { x = Phaser.Math.Between(0, GAME_WIDTH); y = -20; }
    else if (edge === 1) { x = GAME_WIDTH + 20; y = Phaser.Math.Between(0, GAME_HEIGHT); }
    else if (edge === 2) { x = Phaser.Math.Between(0, GAME_WIDTH); y = GAME_HEIGHT + 20; }
    else { x = -20; y = Phaser.Math.Between(0, GAME_HEIGHT); }
    const e = new Enemy(this, x, y, scaleEnemyDef(def, this.mult));
    this.enemies.add(e);
    return e;
  }

  hitEnemy(enemy, damage) {
    const r = applyDamage({ hp: enemy.hp }, damage);
    enemy.hp = r.hp;
    if (r.dead) {
      if (enemy === this.boss) this.boss = null;
      enemy.destroy();
      this.checkPhaseCleared();
    }
  }

  explode(orb, centerEnemy) {
    const targets = [];
    this.enemies.children.iterate((e) => {
      if (!e || !e.active || e === centerEnemy) return true;
      if (Phaser.Math.Distance.Between(orb.x, orb.y, e.x, e.y) <= orb.aoeRadius) targets.push(e);
      return true;
    });
    for (const e of targets) this.hitEnemy(e, orb.damage);
  }

  damageCaster(amount) {
    const r = applyDamage({ hp: this.caster.hp }, amount);
    this.caster.hp = r.hp;
    if (r.dead) {
      this.scene.stop('UI');
      this.scene.start('Game', { regionId: this.regionId, levelIndex: this.levelIndex, stats: this.stats });
    }
  }

  checkPhaseCleared() {
    const phase = this.runner.phase;
    if (phase === 'wave') {
      const alive = this.enemies.countActive(true);
      const stillSpawning = this.spawnEvent && this.spawnEvent.getRepeatCount() > 0;
      if (alive === 0 && !stillSpawning) { this.runner.onCleared(); this.beginPhase(); }
    } else if (phase === 'miniboss' || phase === 'levelBoss' || phase === 'templeBoss') {
      if (this.enemies.countActive(true) === 0) {
        this.bossMechanics = null;
        const dialogue = this.runner.currentPhase().dialogue || this.phaseStoryDialogue(phase);
        if (dialogue && dialogue.length) {
          this.scene.pause();
          this.scene.launch('Dialogue', { lines: dialogue, onDone: () => { this.scene.resume(); this.runner.onCleared(); this.beginPhase(); } });
        } else {
          this.runner.onCleared();
          this.beginPhase();
        }
      }
    }
  }

  phaseStoryDialogue(phase) {
    if (phase === 'templeBoss') return this.level.dialogue && this.level.dialogue.onClear;
    return null;
  }

  finishLevel() {
    this.physics.pause();
    const save = new SaveSystem(window.localStorage);
    let state = save.load();
    state = grantClear(state, this.region, this.levelIndex);
    save.write(state);

    const isEnding = this.regionId === 'castle' && this.levelIndex === this.region.levels.length - 1;
    const reward = this.level.reward.skillPoints;

    this.scene.stop('UI');
    this.scene.launch('Dialogue', {
      lines: [{ speaker: 'Narrador', text: `Nivel superado. +${reward} punto(s) de habilidad.` }],
      onDone: () => {
        if (isEnding) this.scene.start('Map');
        else this.scene.start('Branch', { regionId: this.regionId });
      },
    });
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
    for (const e of liveEnemies) e.updateBehavior(delta, this.caster, (en) => this.fireArrow(en));
    this.orbs.cullOffscreen(GAME_WIDTH, GAME_HEIGHT);
    this.enemyShots.cullOffscreen(GAME_WIDTH, GAME_HEIGHT);
    if (this.bossMechanics) this.bossMechanics.update(delta);
    this.updatePoisonZones(delta);
    this.debug.setText(`${this.regionId} L${this.levelIndex + 1}  x${this.mult.toFixed(2)}  ${this.runner.phase}  e:${liveEnemies.length}`);
    if (this.boss && this.boss.active) this.boss.drawBar();
  }

  spawnPoisonZone(x, y, radius, dps, duration) {
    const gfx = this.add.circle(x, y, radius, 0x7cb342, 0.30).setDepth(5);
    this.poisonZones.push({ x, y, radius, dps, remaining: duration, gfx });
  }

  updatePoisonZones(delta) {
    if (!this.poisonZones.length) return;
    for (const z of this.poisonZones) {
      z.remaining -= delta;
      if (this.caster && this.caster.hp > 0 && Phaser.Math.Distance.Between(this.caster.x, this.caster.y, z.x, z.y) <= z.radius) {
        this.damageCaster(z.dps * (delta / 1000));
      }
    }
    this.poisonZones = this.poisonZones.filter((z) => {
      if (z.remaining > 0) return true;
      z.gfx.destroy();
      return false;
    });
  }
}
