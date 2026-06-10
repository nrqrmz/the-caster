import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEX } from '../config.js';
import { REGIONS } from '../data/regions.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import { BASE_STATS } from '../data/stats.js';
import { WaveRunner } from '../systems/WaveRunner.js';
import { ProjectilePool } from '../systems/ProjectilePool.js';
import { VirtualJoystick } from '../systems/InputSystem.js';
import { applyDamage } from '../systems/CombatSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { levelMultiplier, scaleEnemyDef } from '../systems/Difficulty.js';
import { grantClear } from '../systems/Campaign.js';
import { goldReward } from '../systems/Economy.js';
import { BossMechanics } from '../systems/BossMechanics.js';
import { chainTargets, freezeEffect } from '../systems/SkillTargeting.js';
import { buildProjectiles, findModifier } from '../systems/EnemyBrain.js';
import { SHOP_ITEMS } from '../data/shop.js';
import Caster from '../objects/Caster.js';
import Enemy from '../objects/Enemy.js';
import Boss from '../objects/Boss.js';

const ITEM = Object.fromEntries(SHOP_ITEMS.map((i) => [i.key, i]));

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.regionId = data.regionId || 'fire';
    this.levelIndex = data.levelIndex || 0;
    this.region = REGIONS[this.regionId];
    this.level = this.region.levels[this.levelIndex];
    this.stats = data.stats || { ...BASE_STATS };

    const save = new SaveSystem(window.localStorage).load();
    this.mult = levelMultiplier(save, this.levelIndex);
    this.inventory = { potion: 0, elixir: 0, phoenix: 0, ...(save.inventory || {}) };
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.caster = new Caster(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, this.stats);
    this.joystick = new VirtualJoystick(this);
    this.orbs = new ProjectilePool(this);
    this.enemyShots = new ProjectilePool(this);
    this.enemies = this.physics.add.group();

    this.cooldowns = {}; // ms remaining per skill key
    this.damageBuffRemaining = 0; // ms of elixir buff left
    this.damageBuffMult = 1;
    this.boss = null;
    this.bossMechanics = null;   // set in Phase 3
    this.zones = [];             // active ground zones (poison, freeze, boss hazards)
    this.casterBurnRemaining = 0;
    this.casterBurnDps = 0;
    this.scene.launch('UI', { gameScene: this });

    this.runner = new WaveRunner(this.level);
    // dev-only debug HUD (region/level/difficulty/phase); strip or gate before release
    this.debug = this.add.text(8, 8, '', { fontFamily: 'monospace', fontSize: '14px', color: '#fff' }).setDepth(2000);

    this.setupCollisions();

    this.startedAt = null; // captured on the first update tick (scene clock is 0 in create)
    const startCombat = () => { this.beginPhase(); };
    const intro = this.level.dialogue && this.level.dialogue.onEnter;
    if (intro && intro.length) {
      this.scene.pause();
      this.scene.launch('Dialogue', { lines: intro, onDone: () => { this.scene.resume(); startCombat(); } });
    } else {
      startCombat();
    }
  }

  setupCollisions() {
    this.physics.add.overlap(this.orbs.group, this.enemies, (orb, enemy) => {
      if (!orb.active || !enemy.active) return;
      this.hitEnemy(enemy, orb.damage);
      if (orb.burnDps > 0 && enemy.active) enemy.applyBurn(orb.burnDps, orb.burnMs);
      if (orb.aoeRadius > 0) this.explode(orb, enemy);
      this.orbs.despawn(orb);
    });
    this.physics.add.overlap(this.caster, this.enemies, (caster, enemy) => {
      if (!enemy.active) return;
      this.damageCaster(enemy.def.damage * 0.02 * 16);
      const burn = findModifier(enemy.def, 'onHitBurn');
      if (burn) this.applyCasterBurn(burn.dps ?? 6, burn.ms ?? 2000);
    });
    this.physics.add.overlap(this.caster, this.enemyShots.group, (caster, shot) => {
      if (!shot.active) return;
      this.damageCaster(shot.damage);
      if (shot.burnDps > 0) this.applyCasterBurn(shot.burnDps, shot.burnMs);
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
    const shield = findModifier(enemy.def, 'shielded');
    const dmg = shield ? damage * (1 - (shield.reduce ?? 0.5)) : damage;
    const r = applyDamage({ hp: enemy.hp }, dmg);
    enemy.hp = r.hp;
    if (!r.dead) return;
    if (findModifier(enemy.def, 'reviveOnce') && !enemy._revived) {
      enemy._revived = true;
      enemy.hp = Math.round(enemy.maxHp * 0.4);
      return;
    }
    this.onEnemyDeath(enemy);
    if (enemy === this.boss) this.boss = null;
    enemy.destroy();
    this.checkPhaseCleared();
  }

  onEnemyDeath(enemy) {
    const boom = findModifier(enemy.def, 'explodesOnDeath');
    if (!boom) return;
    const n = boom.count ?? 8;
    const speed = boom.speed ?? 200;
    const dmg = boom.damage ?? Math.round(enemy.def.damage * 0.8);
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n;
      const tx = enemy.x + Math.cos(a) * 50;
      const ty = enemy.y + Math.sin(a) * 50;
      const shot = this.enemyShots.fire(TEX.arrow, enemy.x, enemy.y, tx, ty, speed, dmg, 0);
      if (shot) shot.setTint(COLORS.fireball);
    }
  }

  explode(orb, centerEnemy) {
    const targets = [];
    this.enemies.children.iterate((e) => {
      if (!e || !e.active || e === centerEnemy) return true;
      if (Phaser.Math.Distance.Between(orb.x, orb.y, e.x, e.y) <= orb.aoeRadius) targets.push(e);
      return true;
    });
    for (const e of targets) {
      if (orb.burnDps > 0) e.applyBurn(orb.burnDps, orb.burnMs);
      this.hitEnemy(e, orb.damage);
    }
  }

  damageCaster(amount) {
    const r = applyDamage({ hp: this.caster.hp }, amount);
    this.caster.hp = r.hp;
    if (r.dead) {
      if (this.consumeItem('phoenix')) {
        this.caster.hp = Math.round(this.caster.maxHp * ITEM.phoenix.revivePct);
        return;
      }
      this.scene.stop('UI');
      this.scene.start('Game', { regionId: this.regionId, levelIndex: this.levelIndex, stats: this.stats });
      return;
    }
    if (this.caster.hp / this.caster.maxHp < ITEM.potion.threshold && this.consumeItem('potion')) {
      this.caster.hp = Math.min(this.caster.maxHp, this.caster.hp + this.caster.maxHp * ITEM.potion.healPct);
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
    const clearMs = this.startedAt !== null ? this.time.now - this.startedAt : 0;
    const gold = goldReward(this.level, this.mult, clearMs);
    const save = new SaveSystem(window.localStorage);
    let state = save.load();
    state = grantClear(state, this.region, this.levelIndex);
    state.gold = (state.gold || 0) + gold;
    save.write(state);

    const isEnding = this.regionId === 'castle' && this.levelIndex === this.region.levels.length - 1;
    const reward = this.level.reward.skillPoints;

    this.scene.stop('UI');
    this.scene.launch('Dialogue', {
      lines: [{ speaker: 'Narrador', text: `Nivel superado. +${reward} punto(s) de habilidad, +${gold} oro.` }],
      onDone: () => {
        if (isEnding) this.scene.start('Map');
        else this.scene.start('Branch', { regionId: this.regionId });
      },
    });
  }

  useElixir() {
    if (!this.consumeItem('elixir')) return;
    this.damageBuffRemaining = ITEM.elixir.durationMs;
    this.damageBuffMult = ITEM.elixir.dmgMult;
  }

  // Current outgoing-damage multiplier (1 unless an elixir buff is active).
  dmgMult() {
    return this.damageBuffRemaining > 0 ? this.damageBuffMult : 1;
  }

  // Decrement an owned consumable and persist immediately (spent items stay spent).
  consumeItem(key) {
    if ((this.inventory[key] || 0) <= 0) return false;
    this.inventory[key] -= 1;
    const save = new SaveSystem(window.localStorage);
    const s = save.load();
    s.inventory = { ...s.inventory, [key]: this.inventory[key] };
    save.write(s);
    return true;
  }

  fireOrb(target) {
    this.orbs.fire(TEX.orb, this.caster.x, this.caster.y, target.x, target.y, 420, this.stats.basicDamage * this.dmgMult(), 0);
  }

  executeAttack(enemy, att) {
    if (att.type === 'melee') return; // contact damage via the caster/enemies overlap
    if (att.type === 'lobAoe') {
      // Telegraphed fire pool dropped on the caster's current position.
      this.spawnZone({
        x: this.caster.x, y: this.caster.y,
        radius: att.radius ?? 60, duration: att.duration ?? 3000,
        casterDps: att.dps ?? 18, color: COLORS.fireball,
      });
      return;
    }
    if (att.type === 'summon') {
      const def = ENEMY_TYPES[att.spawnType];
      if (def) for (let i = 0; i < (att.count ?? 2); i++) this.spawnEnemy(def);
      return;
    }
    const burn = findModifier(enemy.def, 'onHitBurn');
    const projs = buildProjectiles(att, {
      self: { x: enemy.x, y: enemy.y },
      target: { x: this.caster.x, y: this.caster.y },
      damage: enemy.def.damage,
    });
    for (const p of projs) {
      const tx = enemy.x + Math.cos(p.angle) * 50;
      const ty = enemy.y + Math.sin(p.angle) * 50;
      const shot = this.enemyShots.fire(TEX.arrow, enemy.x, enemy.y, tx, ty, p.speed, p.damage, 0);
      if (!shot) continue;
      shot.setTint(COLORS.fireball); // enemy shots read clearly distinct from the player's cyan orbs
      if (p.homing) { shot.homing = true; shot.homingSpeed = p.speed; }
      if (burn) { shot.burnDps = burn.dps ?? 6; shot.burnMs = burn.ms ?? 2000; }
    }
  }

  steerHomingShots(delta) {
    const turn = 0.006 * delta; // rad per frame budget; gentle so it's dodgeable
    this.enemyShots.group.children.iterate((p) => {
      if (!p || !p.active || !p.homing) return true;
      const desired = Phaser.Math.Angle.Between(p.x, p.y, this.caster.x, this.caster.y);
      const current = Math.atan2(p.body.velocity.y, p.body.velocity.x);
      const next = Phaser.Math.Angle.RotateTo(current, desired, turn);
      const s = p.homingSpeed || 120;
      p.setVelocity(Math.cos(next) * s, Math.sin(next) * s);
      return true;
    });
  }

  // Cast a skill by key (from UIScene). A cast only consumes its cooldown if it
  // actually fired (e.g. skills needing a target do nothing when none exist).
  tryCast(key) {
    const unlocked = this.stats.unlockedSkills || [];
    if (!unlocked.includes(key)) return;
    if ((this.cooldowns[key] || 0) > 0) return;
    const cast = this[`cast_${key}`];
    if (!cast) return;
    if (cast.call(this)) this.cooldowns[key] = this.stats[`${key}Cooldown`];
  }

  liveEnemies() {
    return this.enemies.getChildren().filter((e) => e.active);
  }

  cast_fireball() {
    const target = this.caster.nearestEnemy(this.liveEnemies());
    if (!target) return false;
    const orb = this.orbs.fire(TEX.fireball, this.caster.x, this.caster.y, target.x, target.y, 320, this.stats.fireballDamage * this.dmgMult(), this.stats.fireballRadius);
    if (orb && this.stats.burnDamage > 0) { orb.burnDps = this.stats.burnDamage; orb.burnMs = this.stats.burnDuration; }
    return true;
  }

  cast_lightning() {
    const live = this.liveEnemies();
    if (!live.length) return false;
    const idx = chainTargets({ x: this.caster.x, y: this.caster.y }, live, this.stats.lightningJumpRadius, this.stats.lightningChain);
    if (!idx.length) return false;
    const points = [{ x: this.caster.x, y: this.caster.y }];
    for (const i of idx) points.push({ x: live[i].x, y: live[i].y });
    for (const i of idx) this.hitEnemy(live[i], this.stats.lightningDamage * this.dmgMult());
    this.drawZap(points);
    return true;
  }

  cast_poison() {
    this.spawnZone({
      x: this.caster.x, y: this.caster.y, radius: this.stats.poisonRadius,
      duration: this.stats.poisonDuration, enemyDps: this.stats.poisonDamage * this.dmgMult(),
      casterHeal: this.stats.poisonHeal, color: COLORS.poison,
    });
    return true;
  }

  cast_freeze() {
    const live = this.liveEnemies();
    const center = this.caster.nearestEnemy(live);
    if (!center) return false;
    for (const e of live) {
      if (Phaser.Math.Distance.Between(center.x, center.y, e.x, e.y) > this.stats.freezeRadius) continue;
      if (freezeEffect(e.def) === 'slow') e.applySlow(this.stats.freezeSlowPct, this.stats.freezeDuration);
      else e.applyFreeze(this.stats.freezeDuration);
    }
    this.flashCircle(center.x, center.y, this.stats.freezeRadius, COLORS.ice);
    return true;
  }

  drawZap(points) {
    const g = this.add.graphics().setDepth(900);
    g.lineStyle(3, COLORS.lightning, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  flashCircle(x, y, radius, color) {
    const c = this.add.circle(x, y, radius, color, 0.35).setDepth(6);
    this.tweens.add({ targets: c, alpha: 0, scale: 1.2, duration: 250, onComplete: () => c.destroy() });
  }

  update(time, delta) {
    if (this.startedAt === null) this.startedAt = time; // valid game time on the first active frame
    for (const k in this.cooldowns) { if (this.cooldowns[k] > 0) this.cooldowns[k] -= delta; }
    if (this.damageBuffRemaining > 0) this.damageBuffRemaining -= delta;
    if (this.stats.healthRegen > 0 && this.caster.hp > 0) {
      this.caster.hp = Math.min(this.caster.maxHp, this.caster.hp + this.stats.healthRegen * (delta / 1000));
    }
    this.updateBurns(delta);
    this.updateCasterBurn(delta);
    this.caster.moveBy(this.joystick.vector);
    const liveEnemies = this.enemies.getChildren().filter((e) => e.active);
    this.caster.updateAutoAim(time, delta, liveEnemies, (t) => this.fireOrb(t));
    for (const e of liveEnemies) {
      const intent = e.think(delta, this.caster);
      e.setVelocity(intent.velocity.x, intent.velocity.y);
      for (const att of intent.fires) this.executeAttack(e, att);
    }
    this.orbs.cullOffscreen(GAME_WIDTH, GAME_HEIGHT);
    this.steerHomingShots(delta);
    this.enemyShots.cullOffscreen(GAME_WIDTH, GAME_HEIGHT);
    if (this.bossMechanics) this.bossMechanics.update(delta);
    this.updateZones(delta);
    this.debug.setText(`${this.regionId} L${this.levelIndex + 1}  x${this.mult.toFixed(2)}  ${this.runner.phase}  e:${liveEnemies.length}`);
    if (this.boss && this.boss.active) this.boss.drawBar();
  }

  // Generic ground zone. opts: { x, y, radius, duration, color?, casterDps?, casterHeal?, enemyDps? }
  spawnZone(opts) {
    const color = opts.color != null ? opts.color : COLORS.poison;
    const gfx = this.add.circle(opts.x, opts.y, opts.radius, color, 0.30).setDepth(5);
    this.zones.push({
      x: opts.x, y: opts.y, radius: opts.radius, remaining: opts.duration, gfx,
      casterDps: opts.casterDps || 0,
      casterHeal: opts.casterHeal || 0,
      enemyDps: opts.enemyDps || 0,
    });
  }

  // Back-compat wrapper used by BossMechanics' poisonFloor (damages the caster).
  spawnPoisonZone(x, y, radius, dps, duration) {
    this.spawnZone({ x, y, radius, duration, casterDps: dps, color: COLORS.poison });
  }

  updateZones(delta) {
    if (!this.zones.length) return;
    const dt = delta / 1000;
    for (const z of this.zones) {
      z.remaining -= delta;
      const casterIn = this.caster && this.caster.hp > 0 &&
        Phaser.Math.Distance.Between(this.caster.x, this.caster.y, z.x, z.y) <= z.radius;
      if (casterIn && z.casterDps) this.damageCaster(z.casterDps * dt);
      if (casterIn && z.casterHeal) {
        this.caster.hp = Math.min(this.caster.maxHp, this.caster.hp + z.casterHeal * dt);
      }
      if (z.enemyDps) {
        // Snapshot (filter returns a new array) so a kill mid-loop can't skip an enemy.
        const live = this.enemies.getChildren().filter((e) => e.active);
        for (const e of live) {
          if (Phaser.Math.Distance.Between(e.x, e.y, z.x, z.y) <= z.radius) this.hitEnemy(e, z.enemyDps * dt);
        }
      }
    }
    this.zones = this.zones.filter((z) => {
      if (z.remaining > 0) return true;
      z.gfx.destroy();
      return false;
    });
  }

  applyCasterBurn(dps, ms) {
    this.casterBurnDps = Math.max(this.casterBurnDps, dps);
    this.casterBurnRemaining = Math.max(this.casterBurnRemaining, ms);
  }

  updateCasterBurn(delta) {
    if (this.casterBurnRemaining <= 0) { this.casterBurnDps = 0; return; }
    this.casterBurnRemaining -= delta;
    this.damageCaster(this.casterBurnDps * (delta / 1000));
  }

  updateBurns(delta) {
    const dt = delta / 1000;
    // Snapshot (filter returns a new array) so a kill mid-loop can't skip an enemy.
    const live = this.enemies.getChildren().filter((e) => e.active && e.burnRemaining > 0);
    for (const e of live) {
      e.burnRemaining -= delta;
      this.hitEnemy(e, e.burnDps * dt);
    }
  }
}
