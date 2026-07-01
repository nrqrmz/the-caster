import { GAME_WIDTH, GAME_HEIGHT, COLORS, TEX, DEBUG, spriteKey, ENEMY_MARGIN, ACTOR_DEPTH } from '../config.js';
import { t, tLines } from '../i18n/index.js';
import { REGIONS } from '../data/regions.js';
import { ENEMY_TYPES } from '../data/enemies.js';
import {
  CONCURRENCY_CAP, ENEMY_SHOT_POOL, HOMING_TTL_MS,
  WHIRLPOOL_RADIUS, WHIRLPOOL_ACTIVE_MS, WHIRLPOOL_COOLDOWN_MS, WHIRLPOOL_TELEGRAPH_MS,
  LAVA_RIVER_COOLDOWN_MS, LAVA_RIVER_TELEGRAPH_MS, LAVA_RIVER_ACTIVE_MS, LAVA_RIVER_DPS,
  MELEE_CONTACT_CD, SPAWN_SAFE_DIST,
  TORNADO_RADIUS, TORNADO_ACTIVE_MS, TORNADO_COOLDOWN_MS, TORNADO_TELEGRAPH_MS, TORNADO_ENEMY_PULL,
  CASTER_STUN_MS, CASTER_LIFT_MS, CASTER_ROOT_MS, PUSH_FORCE, PUSH_MS,
  RITUAL_FILL_MS,
  GRIFFIN_GROUND_MS, GRIFFIN_FLIGHT_MS,
  BOSS_TAUNT_EVERY,
} from '../data/tuning.js';
import { tickRitual, ritualFraction } from '../systems/RitualMeter.js';
import { BASE_STATS } from '../data/stats.js';
import { WaveRunner } from '../systems/WaveRunner.js';
import { ProjectilePool } from '../systems/ProjectilePool.js';
import { VirtualJoystick } from '../systems/InputSystem.js';
import {
  applyDamage, applyCasterSlow, tickCasterSlow, applyResist, tryMeleeContact,
  applyCasterCc, tickCasterCc, applyCasterPush, tickCasterPush, applyDrain,
  tryDrainBite,
} from '../systems/CombatSystem.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { levelMultiplier, difficultyContext, scaleEnemyDef } from '../systems/Difficulty.js';
import { grantClear } from '../systems/Campaign.js';
import { goldReward } from '../systems/Economy.js';
import { BossMechanics } from '../systems/BossMechanics.js';
import { chainTargets, freezeEffect } from '../systems/SkillTargeting.js';
import { buildProjectiles, findModifier, buildSplitChildren, resolveMutateOnDeath, tickLifecycle, LIFECYCLE, summonSlots, pushOutsideRing, sisterFormation, isFlying, selectTransmuteTarget, transmuteBeastKey } from '../systems/EnemyBrain.js';
import { clampBodyInside } from '../systems/clampBodyInside.js';
import { hazardEdges, onAnyEdge, riverEdges } from '../systems/TriangleHazard.js';
import { forceAt, isInside, centerDot, scaleForPhase } from '../systems/WhirlpoolHazard.js';
import { isInside as inTornado, forceAt as tornadoForce, inEye as inTornadoEye, scaleForPhase as tornadoPhase } from '../systems/TornadoHazard.js';
import { lavaPulse, lavaRimAlpha, lavaSpots, lavaEmbers, lavaEdgeEmbers, lerpColor, LAVA } from '../systems/LavaField.js';
import { FormSequencer } from '../systems/FormSequencer.js';
import { hasRecipe } from '../data/sprites/recipes.js';
import { PROJECTILES, resolveProjectile } from '../data/projectiles.js';
import { FacingController } from '../objects/FacingController.js';
import { SHOP_ITEMS } from '../data/shop.js';
import Caster from '../objects/Caster.js';
import Enemy from '../objects/Enemy.js';
import Boss from '../objects/Boss.js';
import StaticBlock from '../objects/StaticBlock.js';

const ITEM = Object.fromEntries(SHOP_ITEMS.map((i) => [i.key, i]));
const RITUAL_TAUNT_EVERY = 5200; // ms between the leader's deceiving taunts
const HEAL_FX_INTERVAL_MS = 500; // throttle for healer pulse + tether VFX (heal math still runs every frame)

export default class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.regionId = data.regionId || 'fire';
    this.levelIndex = data.levelIndex || 0;
    this.region = REGIONS[this.regionId];
    this.regionElement = this.region.element; // 'fire'|'water'|… o null (castillo)
    this.level = this.region.levels[this.levelIndex];
    this.stats = data.stats || { ...BASE_STATS };

    const save = new SaveSystem(window.localStorage).load();
    this.mult = levelMultiplier(save, this.levelIndex); // legacy scalar: gold + debug only
    this.diff = difficultyContext(save, this.levelIndex);
    this.inventory = { potion: 0, elixir: 0, phoenix: 0, ...(save.inventory || {}) };
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.caster = new Caster(this, GAME_WIDTH / 2, GAME_HEIGHT / 2, this.stats);
    this.joystick = new VirtualJoystick(this);
    this.orbs = new ProjectilePool(this);
    this.enemyShots = new ProjectilePool(this, ENEMY_SHOT_POOL);
    this.enemies = this.physics.add.group();

    this.cooldowns = {}; // ms remaining per skill key
    this.damageBuffRemaining = 0; // ms of elixir buff left
    this.damageBuffMult = 1;
    this.boss = null;
    this.bosses = [];
    this.bossMechanics = null;   // set in Phase 3
    this.zones = [];             // active ground zones (poison, freeze, boss hazards)
    this.lavaTime = 0;           // ms accumulator driving the animated lava/fire VFX
    this.lavaGfx = this.add.graphics().setDepth(5); // animated fire zones (redrawn each frame)
    this.telegraphGfx = this.add.graphics().setDepth(1400);
    this.triangleGfx = this.add.graphics().setDepth(6);
    this.whirlpoolGfx = null; // created lazily in updateWhirlpool; reset here so a stale destroyed Graphics doesn't survive a level restart
    this._healRings = new Map(); // healer enemy -> persistent marker ring; lifecycle managed entirely in updateAuras
    this._healFxTimer = 0;       // accumulator throttling heal pulse/tether VFX (created/destroyed each tick would saturate)
    this.triangle = null; // { mode, t } while a trio fight is active
    this.whirlpool = null; // { center, radius, phase, mode, t } while a vortex is active
    this.whirlpoolSustain = false; // Kraken: keep auto-respawning the whirlpool for the whole fight
    this.tornado = null; // { center, radius, phase, mode, t } while a tornado is active
    this.tornadoGfx = null; // created lazily in updateTornado
    this.blocks = [];    // StaticBlock obstacles (e.g. petrified Lélaps); destroyed on phase clear
    this.ritualGfx = null; // created lazily in updateRitual; reset here on level restart
    this.lavaRiver = null;
    this.lavaRiverGfx = null;
    this.casterBurnRemaining = 0;
    this.casterBurnDps = 0;
    this.casterPoisonRemaining = 0;
    this.casterPoisonDps = 0;
    this.scene.launch('UI', { gameScene: this });

    this.runner = new WaveRunner(this.level);
    // dev-only debug HUD (region/level/difficulty/phase); gated behind DEBUG so it
    // doesn't overlap the UIScene HP bar in release. Placed below the HP bar AND the
    // pause/elixir button row (y=92) to avoid overlapping either, even when enabled.
    this.debug = DEBUG
      ? this.add.text(8, 92, '', { fontFamily: 'monospace', fontSize: '14px', color: '#fff' }).setDepth(2000)
      : null;

    this.setupCollisions();

    this.startedAt = null; // captured on the first update tick (scene clock is 0 in create)
    const startCombat = () => { this.beginPhase(); };
    const intro = this.level.dialogue && this.level.dialogue.onEnter;
    if (intro && intro.length) {
      this.scene.pause();
      this.scene.launch('Dialogue', { lines: tLines(intro), onDone: () => { this.scene.resume(); startCombat(); } });
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
      // Golpe de contacto discreto con i-frames por enemigo (antes drenaba cada frame).
      if (!tryMeleeContact(enemy, this.time.now, MELEE_CONTACT_CD)) return;
      this.damageCaster(enemy.def.damage);
      const burn = findModifier(enemy.def, 'onHitBurn');
      if (burn) this.applyCasterBurn(burn.dps ?? 6, burn.ms ?? 2000);
      const slow = findModifier(enemy.def, 'onHitSlow');
      if (slow) this.applyCasterSlowFx(slow.factor ?? 0.6, slow.ms ?? 1200);
      const stun = findModifier(enemy.def, 'onHitStun');
      if (stun) applyCasterCc(this.caster, stun.kind === 'lift' ? 'lift' : 'stun', stun.ms ?? (stun.kind === 'lift' ? 500 : 300));
      const root = findModifier(enemy.def, 'onHitRoot');
      if (root) applyCasterCc(this.caster, 'root', root.ms ?? CASTER_ROOT_MS);
      const push = findModifier(enemy.def, 'onHitPush');
      if (push) {
        const a = Math.atan2(this.caster.y - enemy.y, this.caster.x - enemy.x);
        applyCasterPush(this.caster, Math.cos(a) * (push.force ?? 220), Math.sin(a) * (push.force ?? 220), push.ms ?? 250);
      }
      const drain = findModifier(enemy.def, 'drain');
      if (drain) {
        if (enemy._formSeq) {
          const cap = enemy._formSeq.activeForm().hp;
          enemy._formSeq.currentHp = Math.min(cap, enemy._formSeq.currentHp + (drain.heal ?? 4));
          enemy.hp = enemy._formSeq.currentHp;
        } else {
          applyDrain(enemy, drain.heal ?? 4);
        }
      }
    });
    this.physics.add.overlap(this.caster, this.enemyShots.group, (caster, shot) => {
      if (!shot.active) return;
      if (shot._transmute) return; // transmute bolts hunt a captive, not the caster
      this.damageCaster(shot.damage);
      if (shot.burnDps > 0) this.applyCasterBurn(shot.burnDps, shot.burnMs);
      if (shot.slowFactor) this.applyCasterSlowFx(shot.slowFactor, shot.slowMs ?? 1200);
      if (shot.slowChance && Math.random() < shot.slowChance) this.applyCasterSlowFx(shot.slowChanceFactor, shot.slowChanceMs);
      if (shot.poisonDps > 0) this.applyCasterPoison(shot.poisonDps, shot.poisonMs);
      if (shot.stunMs) applyCasterCc(this.caster, shot.liftKind ? 'lift' : 'stun', shot.stunMs);
      if (shot.rootMs) applyCasterCc(this.caster, 'root', shot.rootMs);
      if (shot.pushForce) {
        const a = Math.atan2(this.caster.y - shot.y, this.caster.x - shot.x);
        applyCasterPush(this.caster, Math.cos(a) * shot.pushForce, Math.sin(a) * shot.pushForce, shot.pushMs ?? 250);
      }
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
      if (phase.bosses && phase.bosses.length) {
        this.spawnBosses(phase.bosses);
        if (phase.triangle) this.startTriangle();
      } else {
        this.spawnBoss(phase.enemyDef);
      }
    } else if (phase.type === 'templeBoss') {
      this.spawnMinions(phase.minions);
      this.spawnBoss(phase.enemyDef);
      this.attachBossMechanics(phase.mechanics); // no-op until Phase 3
    }
  }

  spawnBoss(def) {
    this.boss = new Boss(this, GAME_WIDTH / 2, -40, scaleEnemyDef(def, this.diff));
    this.enemies.add(this.boss);
    this.bosses = [this.boss];
    // Oversized single-def bosses (e.g. Elemental de Tormenta, radius 100) need their
    // display size set explicitly; the forms path does this in _applyBossForm, but a
    // plain (no-forms) def is not routed through there.
    // Giant 2:1 rendered shape (256×128 display, anchored at 3ª banda y≈320).
    if (def.key === 'elemental_tormenta' && def.radius) this.boss.setDisplaySize(256, 128);
    // Seed the runtime untargetable flag (channeling cultist leader) + start the meter.
    if (def.untargetable) this.boss._untargetable = true;
    if (def.ritual) {
      this.boss._ritual = { filled: 0, total: RITUAL_FILL_MS };
      this.boss._ritualTauntT = RITUAL_TAUNT_EVERY;
      this.boss._ritualTaunt = 0;
      this.setupRitualSetpiece(this.boss);
    }
    if (def.taunts && def.taunts.length) { this.boss._tauntT = BOSS_TAUNT_EVERY; this.boss._tauntI = 0; }
    if (def.forms && def.forms.length) {
      // `scaleForms` (opt-in) pre-scales every form's hp/damage/resist by difficulty BEFORE
      // the sequencer, so the depleted pool (FormSequencer.currentHp) is the scaled value —
      // otherwise forms fight at raw hp and bypass difficulty (bug). Without the flag the
      // legacy raw path is kept (_applyBossForm scales boss.maxHp only).
      const forms = def.scaleForms
        ? def.forms.map((f) => scaleEnemyDef({ elite: true, ...f }, this.diff))
        : def.forms;
      this.boss._formsPreScaled = !!def.scaleForms;
      this.boss._formSeq = new FormSequencer(forms);
      // Bootstrap the boss def to the first form.
      this._applyBossForm(this.boss, 0);
    }
    if (def.coBoss) {
      const co = new Boss(this, GAME_WIDTH / 2 + 70, -40, scaleEnemyDef(def.coBoss, this.diff));
      this.enemies.add(co);
      this.bosses.push(co);
      if (def.coBossKillsMaster) co._linkKillMaster = this.boss; // co dies → master dies (Ent → Dríada)
      if (def.gateUntilCoBossDead) this.boss._gateGuard = co;    // master untargetable until co dies (Céfalo ← Lélaps)
    }
    return this.boss;
  }

  // nv7: coloca el ataúd sólido central, ancla al líder en la cabecera, siembra 6
  // cultistas en las ranuras laterales (exentos del cap, reemplazables) y la gárgola al pie.
  setupRitualSetpiece(boss) {
    const cx = GAME_WIDTH / 2;
    // Líder en la cabecera (norte).
    boss.x = cx; boss.y = 200;
    // Ataúd vertical sólido (bloque rectangular provisional; sprite bespoke luego).
    const coffin = new StaticBlock(this, cx, 410, 96, 300, COLORS.stoneGrey);
    this.blocks.push(coffin);
    if (this.caster) this.physics.add.collider(this.caster, coffin);
    // 6 ranuras: 3 izquierda (x=150) + 3 derecha (x=330), y = 300/410/520.
    boss._ritualSlots = [];
    for (const sx of [150, 330]) for (const sy of [300, 410, 520]) {
      const slot = { x: sx, y: sy, guard: null };
      slot.guard = this.spawnRitualGuard(slot);
      boss._ritualSlots.push(slot);
    }
    // Gárgola al pie (sur), exenta del cap.
    const g = this.spawnEnemy(ENEMY_TYPES['gargola_pararrayos']);
    g.x = cx; g.y = 620; g._setpieceExempt = true;
    if (g.body) { g.body.reset(cx, 620); g.body.moves = false; }
    boss._ritualGargoyle = g;
  }

  // Un cultista de ranura: nace en un borde y corre a su ranura (no persigue a la princesa).
  spawnRitualGuard(slot) {
    const guard = this.spawnEnemy(ENEMY_TYPES['guardian_rito']);
    // Nace en un borde aleatorio (spawnEnemy ya lo pone en un borde).
    guard._setpieceExempt = true;   // no cuenta para el cap de oleadas
    guard._ritualSlot = slot;       // corre a esta ranura
    guard._atSlot = false;
    return guard;
  }

  _applyBossForm(boss, formIndex) {
    const form = boss._formSeq.forms[formIndex];
    // Each form is an elite creature; scale its hp/damage + combine resist the same
    // way spawnBoss scaled the base def, otherwise raw form.hp bypasses difficulty.
    // When forms were pre-scaled (scaleForms), they're already scaled — don't double it.
    const scaledForm = boss._formsPreScaled ? form : scaleEnemyDef({ elite: true, ...form }, this.diff);
    // Merge scaled form fields onto def (movement, speed, damage, hp, resist).
    boss.def = { ...boss.def, ...scaledForm };
    boss.hp = scaledForm.hp;
    boss.maxHp = scaledForm.hp;
    // A multi-form boss is a different creature per form: swap to the form's own
    // pixel-art sprite (+ a facing controller keyed to it) rather than tinting one sprite.
    // Fall back to the legacy tint path when the form has no sprite recipe.
    if (hasRecipe(boss.def.key)) {
      boss.setTexture(spriteKey(boss.def.key));
      boss.clearTint();
      boss.facing = new FacingController(boss, boss.def.key);
    } else if (form.color) {
      boss.setTint(form.color);
    }
    // galahad_murcielago: textura 2:1 gigante (forma clímax); las demás formas son cuadradas.
    if (form.key === 'galahad_murcielago') {
      boss.setDisplaySize(200, 100);
    } else if (form.radius) {
      boss.setDisplaySize(form.radius * 2, form.radius * 2);
    }
    // Reset BossBrain phase state for the new form.
    boss.brainState.boss = {};
    // Reset transient movement state AND the burrow invuln latch on every form swap.
    // The latch (`_burrowed`) is set by burrow movement (`{ submerged: true }`) and only
    // ever cleared by other burrow outputs. Transforming OUT of a burrow form (TIBURON)
    // into a non-burrow form (KRAKEN = static) — which never emits a `submerged` field —
    // would otherwise leave `_burrowed` stuck true, and hitEnemy early-returns on it,
    // making the new form permanently invulnerable.
    boss.brainState.move = {};
    boss._burrowed = false;
    boss._surfacing = false;
  }

  _beginBossTransform(boss) {
    boss._transforming = true;
    if (boss.def && boss.def.transformCameo) {
      this.flashCircle(boss.x, boss.y - 10, 40, COLORS.sporeViolet); // Circe arrives
      this.floatText(boss.x, boss.y - 50, t('story.earth.cefalo.cameo'));
    }
    // Clear this form's adds.
    const live = this.enemies.getChildren().filter((e) => e.active && e !== boss);
    for (const e of live) e.destroy();

    const feint = !!(boss.def && (boss.def.deathFeint || (boss.def.key && String(boss.def.key).startsWith('galahad'))));
    if (feint) {
      // "Cae cadáver → resucita": collapse (flatten + dim + sink) ~420ms,
      // then swap to the prone corpse sprite (holding on floor), then rise as next form.
      const baseY = boss.y;
      this.tweens.add({ targets: boss, alpha: 0.2, scaleY: boss.scaleY * 0.3, y: baseY + 14, duration: 420, ease: 'Quad.easeIn' });
      this.flashCircle(boss.x, boss.y, (boss.def.radius || 26) + 12, COLORS.boss);
      // After collapse anim finishes: show cadáver on the floor while invuln window holds.
      this.time.delayedCall(440, () => {
        if (!boss.active) return;
        // Galahad-only: swap to his prone vampire-corpse sprite (128×64 2:1 texture).
        // Non-Galahad deathFeint bosses (e.g. Céfalo) collapse on their current sprite.
        if (boss.def && boss.def.key && String(boss.def.key).startsWith('galahad')) {
          boss.setTexture(spriteKey('galahad_cadaver'));
          boss.setDisplaySize(128, 64);
          boss.scaleY = boss.scaleX;
        }
        boss.setAlpha(0.85);
      });
    } else {
      boss.setAlpha(0.3); // brief dim during transform telegraph (legacy path)
    }

    this.time.delayedCall(1000, () => { // ~1000ms telegraph/invuln window
      if (!boss.active) return;
      boss._transforming = false;
      boss.setAlpha(1);
      boss.scaleY = boss.scaleX; // undo any collapse flatten before _applyBossForm resizes
      boss._formSeq.completeTransform();
      this._applyBossForm(boss, boss._formSeq.activeFormIndex);
      // _applyBossForm already set the sprite/tint for the new form; only re-tint
      // here for the legacy (non-sprite) fallback path.
      if (!hasRecipe(boss.def.key)) {
        boss.clearTint();
        if (boss._formSeq.activeForm().color) boss.setTint(boss._formSeq.activeForm().color);
      }
      if (feint) this.flashCircle(boss.x, boss.y, (boss.def.radius || 26) + 18, COLORS.lightning); // rise burst
    });
  }

  spawnBosses(defs) {
    this.boss = null; // multi-boss encounters don't use the single BossMechanics path
    this.bosses = defs.map((def, i) => {
      const x = GAME_WIDTH * (i + 1) / (defs.length + 1);
      const b = new Boss(this, x, -40, scaleEnemyDef(def, this.diff));
      b._baseMovement = b.def.movement; // para restaurar su kit cuando quede sola
      this.enemies.add(b);
      return b;
    });
    return this.bosses;
  }

  startTriangle() {
    this.triangle = { mode: 'cooldown', t: 2500 };
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
      loop: true,
      callback: () => {
        if (this.liveWaveCount() >= CONCURRENCY_CAP) return; // hold; retry next tick
        const type = this.spawnQueue.shift();
        if (type) this.spawnEnemy(ENEMY_TYPES[type]);
        if (this.spawnQueue.length === 0) {
          this.spawnEvent.remove(false);
          this.spawnEvent = null;
          this.checkPhaseCleared();
        }
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
    // No aparecer sobre la princesa: empuja el spawn fuera del anillo seguro.
    if (this.caster) {
      const safe = pushOutsideRing({ x, y }, this.caster, SPAWN_SAFE_DIST);
      x = safe.x; y = safe.y;
    }
    const e = new Enemy(this, x, y, scaleEnemyDef(def, this.diff));
    // Arm the generational lifecycle on freshly-laid eggs so tickLifecycle (update loop)
    // can hatch them. Without this, an egg's brainState.lifecycle is undefined and it
    // sits inert forever. promoteEnemy carries the TADPOLE/ADULT stages forward from here.
    if (def.lifecycle === 'egg') {
      e.brainState.lifecycle = LIFECYCLE.EGG;
      e.brainState.lifecycleTimer = 0;
    }
    this.enemies.add(e);
    return e;
  }

  promoteEnemy(enemy, toLifecycle) {
    // Respect CONCURRENCY_CAP.
    if (this.liveWaveCount() >= CONCURRENCY_CAP) { enemy.destroy(); return; }
    const typeKey = toLifecycle === LIFECYCLE.TADPOLE ? (enemy.def._hatchType || 'tadpole')
                                                       : (enemy.def._growType  || 'adultFrog');
    const def = ENEMY_TYPES[typeKey];
    if (!def) { enemy.destroy(); return; }
    const scaled = scaleEnemyDef(def, this.diff);
    const e = new Enemy(this, enemy.x, enemy.y, scaled);
    // Carry lifecycle state through so adults can continue to adult.
    if (toLifecycle === LIFECYCLE.TADPOLE) {
      e.brainState.lifecycle = LIFECYCLE.TADPOLE;
      e.brainState.lifecycleTimer = 0;
    }
    this.enemies.add(e);
    enemy.destroy();
  }

  spawnPetrifyBlock(x, y) {
    const block = new StaticBlock(this, x, y, 40);
    this.blocks.push(block);
    if (this.caster) this.physics.add.collider(this.caster, block);
    this.flashCircle(x, y, 34, COLORS.stoneGrey); // petrify tell
    return block;
  }

  swapToBeast(captive) {
    const key = transmuteBeastKey(captive.def);
    const def = key ? ENEMY_TYPES[key] : null;
    if (def && this.liveWaveCount() < CONCURRENCY_CAP) {
      const e = new Enemy(this, captive.x, captive.y, scaleEnemyDef(def, this.diff));
      this.enemies.add(e);
      if (def.radius) e.setDisplaySize(def.radius * 2, def.radius * 2);
      this.flashCircle(captive.x, captive.y, (def.radius || 20) + 12, COLORS.poison); // transform tell
    }
    captive.destroy();
  }

  // Enemigos vivos que SÍ cuentan para el cap de oleadas (excluye el setpiece del ritual).
  liveWaveCount() {
    let n = 0;
    this.enemies.getChildren().forEach((e) => { if (e.active && !e._setpieceExempt) n++; });
    return n;
  }

  // No enemy may ever leave the play area — for ANY reason. An escaped enemy never
  // dies (the player's orbs cull off-screen), so the wave's `countActive === 0` clear
  // condition would never fire and the player would be trapped. A `flee`/`kite` enemy
  // that spawns just off-screen and immediately moves away would never "enter", so we
  // clamp EVERY enemy to the bounds every frame (no entered-latch). Enemies spawned
  // just outside snap to the edge on their first frame — a negligible visual change.
  containEnemy(e) {
    const halfW = (e.displayWidth  || (e.def.radius || 16) * 2) / 2;
    const halfH = (e.displayHeight || (e.def.radius || 16) * 2) / 2;
    const { x, y } = clampBodyInside(e.x, e.y, halfW, halfH, GAME_WIDTH, GAME_HEIGHT, ENEMY_MARGIN);
    e.x = x;
    e.y = y;
  }

  // Opens the pause overlay. Pauses both Game and its UI overlay so nothing ticks or
  // fires underneath; PauseScene resumes them or abandons the level.
  openPauseMenu() {
    if (!this.scene.isActive('Game')) return; // already paused (dialogue / game over)
    this.scene.pause();
    this.scene.pause('UI');
    this.scene.launch('Pause', { regionId: this.regionId, levelIndex: this.levelIndex, stats: this.stats });
  }

  hitEnemy(enemy, damage) {
    if (enemy._untargetable) return;
    // Burrow invuln gate (set by burrow movement; always falsy on non-burrow enemies).
    if (enemy._burrowed) return;
    // Form sequencer: route damage through FormSequencer and handle transform.
    if (enemy._formSeq) {
      if (enemy._transforming) return; // invuln during the transform telegraph
      enemy._formSeq.applyDamage(damage);
      enemy.hp = enemy._formSeq.currentHp; // keep hp in sync for BossBrain hpFrac
      if (enemy._formSeq.fightOver) {
        // Galahad's real death (deathFeint gate): show corpse → fire/fade → then onClear.
        if (enemy.def && (enemy.def.deathFeint || (enemy.def.key && String(enemy.def.key).startsWith('galahad')))) {
          enemy._untargetable = true; // prevent any stray hit from double-firing
          // Galahad-only: swap to his prone vampire-corpse sprite (128×64 2:1 texture).
          // Non-Galahad deathFeint bosses (e.g. Céfalo) fade out on their current sprite.
          if (enemy.def && enemy.def.key && String(enemy.def.key).startsWith('galahad')) {
            enemy.setTexture(spriteKey('galahad_cadaver'));
            enemy.setDisplaySize(128, 64);
          }
          enemy.setAlpha(1);
          // Fire flash: instant large ring.
          this.flashCircle(enemy.x, enemy.y, 80, COLORS.fireball);
          // Overlay burn circle that fades out over the corpse.
          const burn = this.add.circle(enemy.x, enemy.y, 48, COLORS.fireball, 0.65).setDepth(8);
          this.tweens.add({ targets: burn, alpha: 0, scale: 1.9, duration: 800, onComplete: () => burn.destroy() });
          // Fade the corpse itself to zero, then run the normal death/clear path.
          this.tweens.add({
            targets: enemy,
            alpha: 0,
            duration: 850,
            ease: 'Quad.easeIn',
            onComplete: () => {
              if (!enemy.active) return; // already cleaned up
              this.onEnemyDeath(enemy);
              if (enemy === this.boss) this.boss = null;
              this.bosses = this.bosses.filter((b) => b !== enemy);
              enemy.destroy();
              this.checkPhaseCleared();
            },
          });
          return;
        }
        this.onEnemyDeath(enemy);
        if (enemy.def && enemy.def.key === 'circe') this.revertBeasts();
        if (enemy === this.boss) this.boss = null;
        this.bosses = this.bosses.filter((b) => b !== enemy);
        enemy.destroy();
        this.checkPhaseCleared();
        return;
      }
      if (enemy._formSeq.transformPending && !enemy._transforming) {
        this._beginBossTransform(enemy);
      }
      return;
    }
    // Resist (base damage reduction). Honor both shapes: a top-level `resist`
    // field (set by boss FormSequencer forms) OR a `resist` modifier's `factor`
    // (declared on content defs, e.g. tortuga_acorazada).
    const resistMod = findModifier(enemy.def, 'resist');
    const resistVal = enemy.def.resist ?? resistMod?.factor ?? 0;
    const resistedDmg = resistVal ? applyResist(damage, resistVal) : damage;
    const shield = findModifier(enemy.def, 'shielded');
    const dmg = shield ? resistedDmg * (1 - (shield.reduce ?? 0.5)) : resistedDmg;
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
    if (this.bosses.includes(enemy)) {
      const wasGroup = this.bosses.length >= 2;
      this.bosses = this.bosses.filter((b) => b !== enemy);
      if (wasGroup) for (const b of this.bosses) b.enrageMul = (b.enrageMul || 1) * 1.25; // "¡Hermana!"
    }
    enemy.destroy();
    if (enemy._linkKillMaster && enemy._linkKillMaster.active) {
      const master = enemy._linkKillMaster;
      this.onEnemyDeath(master);
      this.bosses = this.bosses.filter((b) => b !== master);
      if (master === this.boss) this.boss = null;
      master.destroy();
    }
    this.checkPhaseCleared();
  }

  onEnemyDeath(enemy) {
    if (enemy._ritualSlot && this.boss && this.boss.active && this.boss._untargetable) {
      const slot = enemy._ritualSlot;
      slot.guard = this.spawnRitualGuard(slot); // nace en borde, corre a la ranura vacía
    }
    if (enemy.def && enemy.def.petrifyBlock) this.spawnPetrifyBlock(enemy.x, enemy.y);
    // Si era un invocado con tope, libera su slot e inicia el cooldown del padre.
    if (enemy._summonedBy && enemy._summonedBy.active && enemy._summonCapKey) {
      const tr = enemy._summonedBy._summonTrackers && enemy._summonedBy._summonTrackers[enemy._summonCapKey];
      if (tr) {
        tr.alive = Math.max(0, tr.alive - 1);
        tr.cooldownUntil = this.time.now + (enemy._summonRespawnMs ?? 15000);
      }
    }
    const boom = findModifier(enemy.def, 'explodesOnDeath');
    if (boom) {
      const n = boom.count ?? 8;
      const speed = boom.speed ?? 200;
      const dmg = boom.damage ?? Math.round(enemy.def.damage * 0.8);
      const type = resolveProjectile(boom, this.regionElement);
      const spec = PROJECTILES[type] || PROJECTILES.arrow;
      const eff = spec.effect;
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n;
        const tx = enemy.x + Math.cos(a) * 50;
        const ty = enemy.y + Math.sin(a) * 50;
        const shot = this.enemyShots.fire(spec.tex, enemy.x, enemy.y, tx, ty, speed, dmg, 0);
        if (!shot) continue;
        shot.setTint(spec.tint);
        if (eff && eff.kind === 'burn') { shot.burnDps = eff.dps; shot.burnMs = eff.ms; }
        else if (eff && eff.kind === 'slow') { shot.slowFactor = eff.factor; shot.slowMs = eff.ms; }
        else if (eff && eff.kind === 'dot') { shot.poisonDps = eff.dps; shot.poisonMs = eff.ms; }
      }
    }
    const split = buildSplitChildren(enemy.def);
    for (const childDef of split) {
      // Respect CONCURRENCY_CAP: only spawn if there is room.
      if (this.liveWaveCount() >= CONCURRENCY_CAP) break;
      const scaled = scaleEnemyDef(childDef, this.diff);
      const e = new Enemy(this, enemy.x + Phaser.Math.Between(-20, 20), enemy.y + Phaser.Math.Between(-20, 20), scaled);
      this.enemies.add(e);
      if (childDef.radius) e.setDisplaySize(childDef.radius * 2, childDef.radius * 2);
    }
    const mutate = resolveMutateOnDeath(enemy.def);
    if (mutate && !enemy._mutated) {
      enemy._mutated = true; // guard: never recurse
      if (mutate.kind === 'zone') {
        this.spawnZone({
          x: enemy.x, y: enemy.y,
          radius: mutate.radius, duration: mutate.duration,
          casterDps: mutate.dps,
          color: COLORS.poison, style: 'fire',
        });
      } else if (mutate.kind === 'enemy' && this.liveWaveCount() < CONCURRENCY_CAP) {
        const def = ENEMY_TYPES[mutate.spawnType];
        if (def) {
          const e = new Enemy(this, enemy.x, enemy.y, scaleEnemyDef(def, this.diff));
          this.enemies.add(e);
          if (def.radius) e.setDisplaySize(def.radius * 2, def.radius * 2);
        }
      }
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
      // Death no longer silently restarts: pause and show a Game Over overlay with
      // Retry / Back-to-map, so the player is never stuck looping a level they can't beat.
      this.physics.pause();
      this.scene.pause();
      this.scene.pause('UI');
      this.scene.launch('GameOver', { regionId: this.regionId, levelIndex: this.levelIndex, stats: this.stats });
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
      const stillSpawning = this.spawnEvent !== null && this.spawnEvent !== undefined;
      if (alive === 0 && !stillSpawning) { this.runner.onCleared(); this.beginPhase(); }
    } else if (phase === 'miniboss' || phase === 'levelBoss' || phase === 'templeBoss') {
      if (this.bosses.length === 0) {
        // El boss murió: el nivel está concluido aunque queden minions. Despawnear
        // los enemigos no-boss restantes para que no persistan al diálogo/siguiente fase.
        const leftovers = this.enemies.getChildren().filter((e) => e && e.active);
        for (const e of leftovers) e.destroy();
        this.bossMechanics = null;
        this.triangle = null;
        if (this.triangleGfx) this.triangleGfx.clear();
        this.whirlpool = null;
        if (this.whirlpoolGfx) this.whirlpoolGfx.clear();
        this.tornado = null;
        if (this.tornadoGfx) this.tornadoGfx.clear();
        this.lavaRiver = null;
        if (this.lavaRiverGfx) this.lavaRiverGfx.clear();
        if (this.ritualGfx) this.ritualGfx.clear();
        for (const b of this.blocks) if (b && b.active) b.destroy();
        this.blocks = [];
        const dialogue = this.runner.currentPhase().dialogue || this.phaseStoryDialogue(phase);
        if (dialogue && dialogue.length) {
          this.scene.pause();
          this.scene.launch('Dialogue', { lines: tLines(dialogue), onDone: () => { this.scene.resume(); this.runner.onCleared(); this.beginPhase(); } });
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
      lines: [{ speaker: t('speaker.narrator'), text: t('hud.levelCleared', { reward, gold }) }],
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
      const water = this.regionElement === 'water';
      // Cae en el punto congelado por el telegraph (esquivable); solo si no hubo
      // telegraph cae sobre la posición viva (no debería pasar: todo lobAoe avisa).
      const mark = enemy._lobAoeMark || { x: this.caster.x, y: this.caster.y };
      enemy._lobAoeMark = null;
      this.spawnZone({
        x: mark.x, y: mark.y,
        radius: att.radius ?? 60, duration: att.duration ?? 3000,
        casterDps: att.dps ?? 18,
        color: water ? COLORS.water : COLORS.fireball,
        style: water ? 'water' : 'fire',
        casterLiftMs: att.lift ? CASTER_LIFT_MS : 0,
        casterStunMs: att.stun ? CASTER_STUN_MS : 0,
        casterRootMs: att.root ? (att.rootMs ?? CASTER_ROOT_MS) : 0,
      });
      return;
    }
    if (att.type === 'summon') {
      const types = att.spawnTypes || [att.spawnType];
      if (att.cap != null) {
        // Summon con tope (opt-in): respeta cap + cooldown por instancia de ataque.
        const key = att.capKey || att.spawnType || types[0];
        enemy._summonTrackers = enemy._summonTrackers || {};
        const tr = enemy._summonTrackers[key] || (enemy._summonTrackers[key] = { alive: 0, cooldownUntil: 0 });
        const slots = summonSlots({ cap: att.cap, alive: tr.alive, cooldownUntil: tr.cooldownUntil }, this.time.now);
        const n = Math.min(att.count ?? 1, slots);
        for (let i = 0; i < n; i++) {
          const t = types[Phaser.Math.Between(0, types.length - 1)];
          const def = ENEMY_TYPES[t];
          if (!def) continue;
          const child = this.spawnEnemy(def);
          child._summonedBy = enemy;
          child._summonCapKey = key;
          child._summonRespawnMs = att.respawnMs ?? 15000;
          tr.alive += 1;
        }
      } else {
        // Sin tope: comportamiento histórico (acotado solo por CONCURRENCY_CAP).
        const def = ENEMY_TYPES[att.spawnType];
        if (def) for (let i = 0; i < (att.count ?? 2); i++) this.spawnEnemy(def);
      }
      return;
    }
    if (att.type === 'transmute') {
      const candidates = [];
      this.enemies.children.iterate((e) => { if (e && e.active && e.def && e.def.transmuteTo && !e._transmuteLocked) candidates.push(e); return true; });
      const target = selectTransmuteTarget({ x: enemy.x, y: enemy.y }, candidates);
      if (!target) return;
      target._transmuteLocked = true;
      const shot = this.enemyShots.fire(TEX.poisonGlob, enemy.x, enemy.y, target.x, target.y, att.speed ?? 150, 0, 0);
      if (!shot) { target._transmuteLocked = false; return; }
      shot.setTint(COLORS.poison);
      shot.damage = 0;
      shot._transmute = true;
      shot._transmuteTarget = target;
      shot.homingSpeed = att.speed ?? 150;
      return;
    }
    if (att.type === 'blinkStorm') {
      const dur = att.duration ?? 3600;
      // Tell + desaparece en el sitio.
      this.verticalBolt(enemy.x, enemy.y);
      enemy._untargetable = true;
      enemy.setVisible(false);
      if (enemy.body) enemy.body.enable = false;
      // Siembra espíritus de tormenta en el punto de desaparición (respeta el cap).
      const sdef = ENEMY_TYPES['espiritu_tormenta'];
      for (let i = 0; i < (att.spiritCount ?? 4); i++) {
        if (!sdef || this.liveWaveCount() >= CONCURRENCY_CAP) break;
        const s = this.spawnEnemy(sdef);
        s.x = Phaser.Math.Clamp(enemy.x + Phaser.Math.Between(-40, 40), 20, GAME_WIDTH - 20);
        s.y = Phaser.Math.Clamp(enemy.y + Phaser.Math.Between(-40, 40), 20, GAME_HEIGHT - 20);
      }
      const bx = enemy.x, by = enemy.y;
      this.time.delayedCall(dur, () => {
        if (!enemy.active) return;
        // Reubicar en un punto aleatorio lejos de la princesa.
        let nx = Phaser.Math.Between(60, GAME_WIDTH - 60);
        let ny = Phaser.Math.Between(120, GAME_HEIGHT - 200);
        const safe = pushOutsideRing({ x: nx, y: ny }, this.caster, SPAWN_SAFE_DIST + 60);
        nx = Phaser.Math.Clamp(safe.x, 40, GAME_WIDTH - 40);
        ny = Phaser.Math.Clamp(safe.y, 100, GAME_HEIGHT - 180);
        enemy.x = nx; enemy.y = ny;
        this.verticalBolt(nx, ny);
        enemy._untargetable = false;
        enemy.setVisible(true);
        if (enemy.body) enemy.body.enable = true;
      });
      return;
    }
    if (att.type === 'submerge') {
      // Dive deep: vanish completely (untargetable + invisible, no fin) for a window and
      // summon a minion from the depths. A DPS-denial beat — it stays put, never moves.
      const dur = att.duration ?? 2500;
      enemy._untargetable = true;            // auto-aim (Caster.nearestEnemy) already skips this
      enemy.setVisible(false);
      if (enemy.body) enemy.body.enable = false; // no contact damage while submerged
      this.flashCircle(enemy.x, enemy.y, (enemy.def.radius || 42) + 10, COLORS.waterDeep); // implosion tell
      this.spawnKrakenAdd();
      const bx = enemy.x, by = enemy.y;
      this.time.delayedCall(dur, () => {
        if (!enemy.active) return;
        enemy._untargetable = false;
        enemy.setVisible(true);
        if (enemy.body) enemy.body.enable = true;
        this.flashCircle(bx, by, (enemy.def.radius || 42) + 24, COLORS.water); // resurface burst
        this.spawnZone({ x: bx, y: by, radius: 70, duration: 700, casterDps: 20, color: COLORS.water, style: 'water' });
      });
      return;
    }
    const type = resolveProjectile(att, this.regionElement);
    const spec = PROJECTILES[type] || PROJECTILES.arrow;
    const eff = spec.effect;
    // Un modifier onHit* presente afina los parámetros del efecto de su tipo
    // (p. ej. elemental_fuego quema más fuerte) sin duplicar la aplicación.
    const burnMod = eff && eff.kind === 'burn' ? findModifier(enemy.def, 'onHitBurn') : null;
    const slowMod = eff && eff.kind === 'slow' ? findModifier(enemy.def, 'onHitSlow') : null;
    const projs = buildProjectiles(att, {
      self: { x: enemy.x, y: enemy.y },
      target: { x: this.caster.x, y: this.caster.y },
      damage: enemy.def.damage,
    });
    for (const p of projs) {
      const tx = enemy.x + Math.cos(p.angle) * 50;
      const ty = enemy.y + Math.sin(p.angle) * 50;
      const shot = this.enemyShots.fire(spec.tex, enemy.x, enemy.y, tx, ty, p.speed, p.damage, 0);
      if (!shot) continue;
      shot.setTint(spec.tint); // disparos enemigos distinguibles del orbe cian del jugador
      if (att.tint != null) shot.setTint(att.tint); // step-level tint override (Céfalo's wood javelin)
      if (p.big) {
        shot.setDisplaySize(60, 60);                 // bola enorme reusando TEX.fireball (32px)
        if (shot.body) shot.body.setCircle(28); // hitbox grande
      }
      if (p.homing) { shot.homing = true; shot.homingSpeed = p.speed; shot.homingLife = HOMING_TTL_MS; }
      if (eff && eff.kind === 'burn') { shot.burnDps = burnMod?.dps ?? eff.dps; shot.burnMs = burnMod?.ms ?? eff.ms; }
      else if (eff && eff.kind === 'slow') { shot.slowFactor = slowMod?.factor ?? eff.factor; shot.slowMs = slowMod?.ms ?? eff.ms; }
      else if (eff && eff.kind === 'dot') { shot.poisonDps = eff.dps; shot.poisonMs = eff.ms; }
      // Air: ranged control-loss. Copy the attack's stun/lift/push flags onto the
      // shot so the caster/enemyShots overlap handler (Plan 1) can apply them.
      if (att.lift) { shot.stunMs = att.liftMs ?? CASTER_LIFT_MS; shot.liftKind = true; }
      else if (att.stun) { shot.stunMs = att.stunMs ?? CASTER_STUN_MS; shot.liftKind = false; }
      if (att.push) { shot.pushForce = att.pushForce ?? PUSH_FORCE; shot.pushMs = att.pushMs ?? PUSH_MS; }
      if (att.root) shot.rootMs = att.rootMs ?? CASTER_ROOT_MS;
      if (att.slowChance) { shot.slowChance = att.slowChance; shot.slowChanceFactor = att.slowFactor ?? 0.6; shot.slowChanceMs = att.slowMs ?? 1200; }
    }
  }

  drawTelegraph(enemy, step) {
    const g = this.telegraphGfx;
    g.lineStyle(2, 0xffffff, 0.9);
    if (step.do === 'lobAoe') {
      // Congela el punto de caída en el PRIMER frame del telegraph: la marca (y la zona)
      // se quedan quietas y la jugadora puede salir, en vez de perseguirla cada frame.
      if (!enemy._lobAoeMark) enemy._lobAoeMark = { x: this.caster.x, y: this.caster.y };
      const m = enemy._lobAoeMark;
      g.strokeCircle(m.x, m.y, step.radius ?? 60); // ground marker where it lands (committed)
    } else {
      g.strokeCircle(enemy.x, enemy.y, (enemy.def.radius || 20) + 16);  // wind-up ring on the boss
    }
  }

  // Aleta dorsal de un tiburón sumergido. El tiburón se ve de PERFIL, así que la aleta
  // siempre apunta hacia ARRIBA (sale del agua) y solo se voltea izq/der según hacia
  // dónde nada — nunca rota a ángulos arbitrarios. Silueta de aleta real: borde de ataque
  // recto, cresta rastrillada hacia atrás (hacia la cola) y borde de fuga cóncavo.
  drawDorsalFin(e) {
    const g = this.telegraphGfx;
    const vx = e.body ? e.body.velocity.x : 0;
    // Facing igual que FacingController: mira a la izquierda cuando vx<0. Al detenerse
    // conserva el último facing; si nunca nadó, encara a la princesa.
    if (Math.abs(vx) > 6) e._finFace = vx < 0 ? -1 : 1;
    const s = e._finFace ?? (this.caster.x < e.x ? -1 : 1); // +1 mira derecha, -1 mira izquierda
    const k = (e.def && e.def.radius ? e.def.radius : 17) / 17; // escala con el tamaño del tiburón
    const X = (dx) => e.x + s * dx * k; // dx en orientación "mira a la derecha"; s lo voltea
    const Y = (dy) => e.y + dy * k;     // dy negativo = arriba (fuera del agua)
    const frontBottom = [X(8), Y(3)];   // base delantera, sobre la superficie
    const peak        = [X(-3), Y(-15)];// cresta arriba, rastrillada hacia la cola
    const notch       = [X(-5), Y(-4)]; // jalada hacia el cuerpo → borde de fuga cóncavo
    const backBottom  = [X(-9), Y(3)];  // base trasera
    g.fillStyle(e.def && e.def.color ? e.def.color : COLORS.sharkYoung, 1);
    g.beginPath();
    g.moveTo(frontBottom[0], frontBottom[1]);
    g.lineTo(peak[0], peak[1]);
    g.lineTo(notch[0], notch[1]);
    g.lineTo(backBottom[0], backBottom[1]);
    g.closePath();
    g.fillPath();
  }

  steerHomingShots(delta) {
    const turn = 0.006 * delta; // rad per frame budget; gentle so it's dodgeable
    this.enemyShots.group.children.iterate((p) => {
      if (!p || !p.active || !p.homing) return true;
      p.homingLife -= delta;
      if (p.homingLife <= 0) { this.enemyShots.despawn(p); return true; } // expired: stop chasing
      const desired = Phaser.Math.Angle.Between(p.x, p.y, this.caster.x, this.caster.y);
      const current = Math.atan2(p.body.velocity.y, p.body.velocity.x);
      const next = Phaser.Math.Angle.RotateTo(current, desired, turn);
      const s = p.homingSpeed || 120;
      p.setVelocity(Math.cos(next) * s, Math.sin(next) * s);
      return true;
    });
  }

  steerTransmuteShots(delta) {
    const turn = 0.02 * delta; // tighter than caster-homing — it must reliably reach its captive
    this.enemyShots.group.children.iterate((p) => {
      if (!p || !p.active || !p._transmute) return true;
      const target = p._transmuteTarget;
      if (!target || !target.active) { if (p._transmuteTarget) p._transmuteTarget._transmuteLocked = false; this.enemyShots.despawn(p); return true; } // captive died → fizzle
      if (Phaser.Math.Distance.Between(p.x, p.y, target.x, target.y) < 24) {
        this.swapToBeast(target);
        this.enemyShots.despawn(p);
        return true;
      }
      const desired = Phaser.Math.Angle.Between(p.x, p.y, target.x, target.y);
      const current = Math.atan2(p.body.velocity.y, p.body.velocity.x);
      const next = Phaser.Math.Angle.RotateTo(current, desired, turn);
      const s = p.homingSpeed || 150;
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
    if (this.caster.facing) this.caster.facing.playAttack();
    const orb = this.orbs.fire(TEX.fireball, this.caster.x, this.caster.y, target.x, target.y, 320, this.stats.fireballDamage * this.dmgMult(), this.stats.fireballRadius);
    if (orb && this.stats.burnDamage > 0) { orb.burnDps = this.stats.burnDamage; orb.burnMs = this.stats.burnDuration; }
    return true;
  }

  cast_lightning() {
    const live = this.liveEnemies().map((e) => {
      e.untargetable = !!e._untargetable; // expose runtime flag to the pure targeter
      return e;
    });
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
    const baseDmg = this.stats.freezeDamage ?? 0;
    for (const e of live) {
      if (Phaser.Math.Distance.Between(center.x, center.y, e.x, e.y) > this.stats.freezeRadius) continue;
      if (e.def.iceImmune) continue; // Madame Le Fay — immune to ice (no slow, no damage)
      // Non-elite: freeze solid (max slow). Elite/boss: a reduced slow (forced past CC immunity).
      let intensity;
      if (freezeEffect(e.def) === 'slow') {
        e.applySlow(this.stats.freezeSlowPct, this.stats.freezeDuration, true);
        intensity = 1 - this.stats.freezeSlowPct; // scales with the slow strength (slow tree)
      } else {
        e.applyFreeze(this.stats.freezeDuration);
        intensity = 1; // frozen solid = full bonus
      }
      // Bonus frost damage, scaled by how much the target is slowed (per-enemy + slow-tree synergy).
      if (baseDmg > 0) this.hitEnemy(e, baseDmg * intensity);
    }
    this.flashCircle(center.x, center.y, this.stats.freezeRadius, COLORS.ice);
    return true;
  }

  // Pilar de rayo vertical: tell del teleport de la Bruja (cae desde arriba al punto).
  verticalBolt(x, y) {
    this.drawZap([{ x, y: 0 }, { x, y }], COLORS.lightning);
    this.flashCircle(x, y, 30, COLORS.lightning);
  }

  drawZap(points, color = COLORS.lightning) {
    const g = this.add.graphics().setDepth(900);
    g.lineStyle(3, color, 1);
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

  floatText(x, y, str) {
    const txt = this.add.text(x, y, str, { fontSize: '12px', color: '#e1bee7', align: 'center', wordWrap: { width: 200 } }).setOrigin(0.5).setDepth(960);
    this.tweens.add({ targets: txt, y: y - 30, alpha: 0, duration: 1800, onComplete: () => txt.destroy() });
  }

  updateBossTaunts(delta) {
    for (const b of this.bosses) {
      if (!b || !b.active || !b.def || !b.def.taunts || b._tauntT == null) continue;
      b._tauntT -= delta;
      if (b._tauntT <= 0) {
        b._tauntT = BOSS_TAUNT_EVERY;
        const key = b.def.taunts[b._tauntI % b.def.taunts.length];
        b._tauntI += 1;
        this.floatText(b.x, b.y - 40, t(key));
      }
    }
  }

  revertBeasts() {
    const BEASTS = new Set(['lobo', 'jabali', 'oso_jardin', 'hombre_lobo', 'pixie', 'duende_ladron', 'cefalo_felino']);
    this.enemies.getChildren().forEach((e) => {
      if (!e || !e.active || !e.def || !BEASTS.has(e.def.key)) return;
      e.setTint(COLORS.fleshPale); // beast reverts to a freed human
      e.def = { ...e.def, movement: { type: 'flee' }, attacks: [] };
    });
  }

  // A green beam from a healer to an ally it's restoring — fades out so a new one is drawn each VFX tick.
  drawHealTether(from, to) {
    const g = this.add.graphics().setDepth(ACTOR_DEPTH + 1);
    g.lineStyle(2, COLORS.heal, 0.8);
    g.beginPath();
    g.moveTo(from.x, from.y);
    g.lineTo(to.x, to.y);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 320, onComplete: () => g.destroy() });
  }

  update(time, delta) {
    if (this.startedAt === null) this.startedAt = time; // valid game time on the first active frame
    this.lavaTime += delta;      // drives the animated lava/fire VFX (zones + triangle edges)
    for (const k in this.cooldowns) { if (this.cooldowns[k] > 0) this.cooldowns[k] -= delta; }
    tickCasterSlow(this.caster, delta);
    tickCasterCc(this.caster, delta);
    tickCasterPush(this.caster, delta);
    if (this.damageBuffRemaining > 0) this.damageBuffRemaining -= delta;
    if (this.stats.healthRegen > 0 && this.caster.hp > 0) {
      this.caster.hp = Math.min(this.caster.maxHp, this.caster.hp + this.stats.healthRegen * (delta / 1000));
    }
    this.updateBurns(delta);
    this.updateCasterBurn(delta);
    this.updateCasterPoison(delta);
    this.caster.moveBy(this.joystick.vector);
    if (this.caster.rootRemaining > 0) this.caster.setTint(COLORS.poison);
    else if (this.caster.liftRemaining > 0 || this.caster.stunRemaining > 0) this.caster.setTint(COLORS.lightning);
    else if (this.caster.slowRemaining === 0) this.caster.clearTint();
    const liveEnemies = this.enemies.getChildren().filter((e) => e.active);
    this.caster.updateAutoAim(time, delta, liveEnemies, (t) => this.fireOrb(t));
    this.telegraphGfx.clear();
    for (const e of liveEnemies) {
      const intent = e.think(delta, this.caster);
      e.setVelocity(intent.velocity.x, intent.velocity.y);
      this.containEnemy(e);
      // Lifecycle promotion (egg→tadpole→adult).
      if (e.brainState && e.brainState.lifecycle !== undefined) {
        const life = tickLifecycle(e.brainState, delta);
        if (life.promote) this.promoteEnemy(e, life.promoteTo);
      }
      for (const att of intent.fires) this.executeAttack(e, att);
      if (intent.telegraphs) for (const t of intent.telegraphs) this.drawTelegraph(e, t);
      if (intent.enters) for (const h of intent.enters) this.runBossHook(e, h);
      // Elemental de Tormenta: keep _tornadoPhase in sync with the BossBrain phase
      // (P1=1, P2=2, P3=3) so the tornado-eye pull/radius escalate per phase.
      if (e.def && e.def.key === 'elemental_tormenta' && e.brainState && e.brainState.boss) {
        const pi = e.brainState.boss.phaseIndex;
        if (typeof pi === 'number' && pi >= 0) e._tornadoPhase = pi + 1;
      }
      // Burrow surface telegraph: draw warning ring while _surfacing.
      if (e._surfacing) {
        this.telegraphGfx.lineStyle(3, COLORS.water, 0.85);
        this.telegraphGfx.strokeCircle(e.x, e.y, (e.def.radius || 20) + 24);
      }
      // Sumergido: oculta el cuerpo y dibuja solo la aleta dorsal (se ve a dónde va).
      if (e._burrowed !== undefined) {
        if (e._burrowed) { e.setAlpha(0); this.drawDorsalFin(e); }
        else e.setAlpha(1);
      }
    }
    this.orbs.cullOffscreen(GAME_WIDTH, GAME_HEIGHT);
    this.steerHomingShots(delta);
    this.steerTransmuteShots(delta);
    this.enemyShots.cullOffscreen(GAME_WIDTH, GAME_HEIGHT);
    if (this.bossMechanics) this.bossMechanics.update(delta);
    this.updateZones(delta);
    this.updateTriangle(delta);
    this.updateLavaRiver(delta);
    this.updateWhirlpool(delta);
    this.updateTornado(delta);
    this.updateDrainBite(delta);
    this.updateRitual(delta);
    this.updateRitualGuards();
    this.updateBossGates();
    this.updateGriffin(delta);
    this.updateBossTaunts(delta);
    this.updateAuras(delta);
    if (this.debug) this.debug.setText(`${this.regionId} L${this.levelIndex + 1}  x${this.mult.toFixed(2)}  ${this.runner.phase}  e:${liveEnemies.length}`);
    for (const b of this.bosses) { if (b && b.active && !b._burrowed) b.drawBar(); else if (b && b._burrowed) b.bar.clear(); }
  }

  // Generic ground zone. opts: { x, y, radius, duration, color?, fire?, casterDps?, casterHeal?, enemyDps? }
  // Fire-colored zones (or opts.fire) render as animated lava on the shared lavaGfx; others keep a flat disk.
  // Water-style zones (style:'water') render as a tentacle sprite that grows from the floor and retracts.
  spawnZone(opts) {
    const color = opts.color != null ? opts.color : COLORS.poison;
    const style = opts.style || (color === COLORS.fireball || color === COLORS.magma ? 'fire' : 'flat');
    const fire = style === 'fire' || opts.fire === true;
    // Water lobAoe zones: replace the flat disk with a tentacle sprite.
    let gfx = null;
    let tentacle = null;
    if (style === 'water') {
      const r = opts.radius ?? 60;
      // Marca de suelo del MISMO radio que el hitbox: el tentáculo (alto) es cosmético,
      // el daño es este círculo. Persiste toda la vida de la zona (cleanup destruye z.gfx).
      gfx = this.add.circle(opts.x, opts.y, r, color, 0.16).setDepth(5);
      gfx.setStrokeStyle(2, color, 0.7);
      // Scale the 32-px texture to radius × 2 (width) and radius × 3 (full height).
      const tsx = (r * 2) / 32;
      const tsy = (r * 3) / 32;
      tentacle = this.add.sprite(opts.x, opts.y, spriteKey('tentacle'))
        .setOrigin(0.5, 1)   // anchor at bottom-center so it grows upward
        .setAlpha(0.85)
        .setDepth(5);
      tentacle.scaleX = tsx;
      tentacle.scaleY = 0;   // start collapsed; updateZones animates scaleY 0→tsy→0
      tentacle._tsyFull = tsy; // target full scaleY stored on the sprite for updateZones
    } else if (!fire) {
      gfx = this.add.circle(opts.x, opts.y, opts.radius, color, 0.30).setDepth(5);
    }
    this.zones.push({
      x: opts.x, y: opts.y, radius: opts.radius,
      remaining: opts.duration, duration0: opts.duration,
      gfx, fire, style, tentacle,
      casterDps: opts.casterDps || 0,
      casterHeal: opts.casterHeal || 0,
      casterLiftMs: opts.casterLiftMs || 0,
      casterStunMs: opts.casterStunMs || 0,
      enemyDps: opts.enemyDps || 0,
    });
  }

  runBossHook(boss, hook) {
    if (hook === 'spawnLavaFloor') {
      const lanes = 2;                                  // antes 4: menos saturación
      for (let i = 0; i < lanes; i++) {
        const x = GAME_WIDTH * (i + 0.5) / lanes;
        this.spawnZone({ x, y: GAME_HEIGHT / 2, radius: 46, duration: 7000, casterDps: 20, color: COLORS.fireball });
      }
    }
    if (hook === 'spawnWhirlpool') {
      // One-shot (Dama forms): spawn once at the form's whirlpool phase, no auto-respawn.
      this.spawnWhirlpoolAt(typeof boss._whirlpoolPhase === 'number' ? boss._whirlpoolPhase : 1);
    }
    if (hook === 'sustainWhirlpool') {
      // Kraken: keep a whirlpool up for the whole fight; updateWhirlpool re-spawns it on
      // cooldown-end and escalates strength by the boss's hp fraction.
      this.whirlpoolSustain = true;
      this.spawnWhirlpoolAt(this.krakenWhirlPhase());
    }
    if (hook === 'spawnTornado') {
      const phase = typeof boss._tornadoPhase === 'number' ? boss._tornadoPhase : 1;
      this.tornado = {
        center: { x: Phaser.Math.Between(80, GAME_WIDTH - 80), y: Phaser.Math.Between(120, GAME_HEIGHT - 160) },
        radius: TORNADO_RADIUS,
        phase,
        mode: 'telegraph',
        t: TORNADO_TELEGRAPH_MS,
      };
    }
    if (hook === 'startLavaRiver') {
      // Arranca el río en cooldown; se auto-activa periódicamente mientras Ignatius
      // siga en esta fase. Idempotente: no reinicia si ya está activo.
      if (!this.lavaRiver) {
        this.lavaRiver = { orientation: 'horizontal', mode: 'cooldown', t: LAVA_RIVER_COOLDOWN_MS };
      }
    }
  }

  // Create a whirlpool at a random arena spot with the given strength phase (1..3).
  spawnWhirlpoolAt(phase) {
    this.whirlpool = {
      center: { x: Phaser.Math.Between(80, GAME_WIDTH - 80), y: Phaser.Math.Between(80, GAME_HEIGHT - 80) },
      radius: WHIRLPOOL_RADIUS,
      phase,
      mode: 'telegraph',
      t: WHIRLPOOL_TELEGRAPH_MS,
    };
  }

  // Whirlpool strength phase from the Kraken's current hp fraction (1 > 0.6 > 0.3).
  krakenWhirlPhase() {
    const b = this.boss;
    if (!b || !b.maxHp) return 1;
    const f = b.hp / b.maxHp;
    return f > 0.6 ? 1 : f > 0.3 ? 2 : 3;
  }

  // Summon a random mid-low water minion from the deep while the Kraken is submerged.
  // Capped at 3 alive so repeated submerges can't pile them up if the player ignores them.
  spawnKrakenAdd() {
    const alive = this.enemies.getChildren().filter((e) => e.active && e._krakenAdd).length;
    if (alive >= 3) return;
    const pool = ['ahogado', 'sapo_escupidor', 'pez_globo'];
    const def = ENEMY_TYPES[pool[Phaser.Math.Between(0, pool.length - 1)]];
    if (!def) return;
    const e = this.spawnEnemy(def);
    if (e) e._krakenAdd = true;
  }

  updateWhirlpool(delta) {
    if (!this.whirlpool) return;
    const w = this.whirlpool;
    w.t -= delta;

    // Clear old spiral each frame.
    if (!this.whirlpoolGfx) this.whirlpoolGfx = this.add.graphics().setDepth(7);
    this.whirlpoolGfx.clear();

    if (w.mode === 'telegraph') {
      // Pulsing warning ring.
      const pulse = 0.4 + 0.4 * Math.abs(Math.sin(this.lavaTime * 4));
      this.whirlpoolGfx.lineStyle(3, COLORS.water, pulse);
      this.whirlpoolGfx.strokeCircle(w.center.x, w.center.y, w.radius);
      // p3 vortex lasts longer (near-permanent) so the late fight has a single fierce whirlpool.
      if (w.t <= 0) { w.mode = 'active'; w.t = WHIRLPOOL_ACTIVE_MS * (w.phase >= 3 ? 1.8 : 1); }
      return;
    }

    if (w.mode === 'active') {
      // Rotating multi-arm spiral converging to the center.
      const phaseMul = scaleForPhase(w.phase);
      const activeRadius = w.radius * phaseMul;
      const arms = 3, turns = 2.4, steps = 40;
      const rot = this.lavaTime * 2;
      for (let a = 0; a < arms; a++) {
        this.whirlpoolGfx.lineStyle(2, COLORS.waterDeep, 0.8);
        this.whirlpoolGfx.beginPath();
        for (let s = 0; s <= steps; s++) {
          const f = s / steps;
          const ang = rot + a * (Math.PI * 2 / arms) + f * turns * Math.PI * 2;
          const rad = activeRadius * (1 - f);
          const px = w.center.x + Math.cos(ang) * rad;
          const py = w.center.y + Math.sin(ang) * rad;
          if (s === 0) this.whirlpoolGfx.moveTo(px, py); else this.whirlpoolGfx.lineTo(px, py);
        }
        this.whirlpoolGfx.strokePath();
      }

      // Apply force to caster.
      if (this.caster && this.caster.hp > 0 && isInside(w.center, activeRadius, this.caster)) {
        const f = forceAt(w.center, activeRadius, this.caster, this.stats.moveSpeed);
        this.caster.x += f.x * (delta / 1000);
        this.caster.y += f.y * (delta / 1000);
        this.caster.x = Phaser.Math.Clamp(this.caster.x, 0, GAME_WIDTH);
        this.caster.y = Phaser.Math.Clamp(this.caster.y, 0, GAME_HEIGHT);
        // Center DoT.
        const dot = centerDot(w.center, activeRadius, this.caster);
        if (dot > 0) this.damageCaster(dot * (delta / 1000));
      }

      if (w.t <= 0) { w.mode = 'cooldown'; w.t = WHIRLPOOL_COOLDOWN_MS * (w.phase >= 3 ? 0.4 : 1); }
      return;
    }

    if (w.mode === 'cooldown') {
      if (w.t <= 0) {
        // Sustained (Kraken): immediately re-telegraph a fresh vortex, escalated to the boss's
        // current hp phase, for as long as it lives. Otherwise (Dama one-shot) it just clears.
        if (this.whirlpoolSustain && this.boss && this.boss.active) this.spawnWhirlpoolAt(this.krakenWhirlPhase());
        else this.whirlpool = null;
      }
    }
  }

  updateTornado(delta) {
    if (!this.tornado) return;
    const w = this.tornado;
    w.t -= delta;
    if (!this.tornadoGfx) this.tornadoGfx = this.add.graphics().setDepth(7);
    this.tornadoGfx.clear();

    if (w.mode === 'telegraph') {
      this.tornadoGfx.lineStyle(2, COLORS.ash, 0.5);
      this.tornadoGfx.strokeCircle(w.center.x, w.center.y, w.radius);
      if (w.t <= 0) { w.mode = 'active'; w.t = TORNADO_ACTIVE_MS; }
      return;
    }

    if (w.mode === 'active') {
      const r = w.radius * tornadoPhase(w.phase);
      this.tornadoGfx.lineStyle(3, COLORS.ash, 0.75);
      this.tornadoGfx.strokeCircle(w.center.x, w.center.y, r);
      this.tornadoGfx.lineStyle(2, COLORS.lightning, 0.6);
      this.tornadoGfx.strokeCircle(w.center.x, w.center.y, r * 0.5);

      // Pull the caster toward the eye (full strength).
      if (this.caster && this.caster.hp > 0 && inTornado(w.center, r, this.caster)) {
        const f = tornadoForce(w.center, r, this.caster, this.stats.moveSpeed);
        this.caster.x = Phaser.Math.Clamp(this.caster.x + f.x * (delta / 1000), 0, GAME_WIDTH);
        this.caster.y = Phaser.Math.Clamp(this.caster.y + f.y * (delta / 1000), 0, GAME_HEIGHT);
      }
      // Light pull on NON-flying enemies (debris feel; flyers are immune).
      for (const e of this.enemies.getChildren()) {
        if (!e.active || isFlying(e.def)) continue;
        if (!inTornado(w.center, r, e)) continue;
        const ef = tornadoForce(w.center, r, e, e.def.speed * TORNADO_ENEMY_PULL);
        e.x += ef.x * (delta / 1000);
        e.y += ef.y * (delta / 1000);
      }

      if (w.t <= 0) { w.mode = 'cooldown'; w.t = TORNADO_COOLDOWN_MS; }
      return;
    }

    if (w.mode === 'cooldown') {
      if (w.t <= 0) this.tornado = null; // boss re-triggers via the spawnTornado hook
    }
  }

  // Air: sifón de sangre a distancia (drainBite). Cada frame, cada enemigo/jefe con
  // el modificador muerde a la princesa si está dentro de `range` y su cooldown está
  // listo (por instancia). Transferencia: la princesa pierde `amount`, el vampiro se
  // cura lo mismo. Tether de rayo rojo + "−N" flotante. Un mordisco por cooldown (sin spam).
  updateDrainBite(delta) {
    if (!this.caster || this.caster.hp <= 0) return;
    const now = this.time.now;
    const all = [...this.liveEnemies(), ...this.bosses.filter((b) => b && b.active)];
    for (const e of all) {
      if (!e.active || !e.def || e._untargetable) continue;
      const mod = findModifier(e.def, 'drainBite');
      if (!mod) continue;
      const range = mod.range ?? 130;
      const dist = Phaser.Math.Distance.Between(e.x, e.y, this.caster.x, this.caster.y);
      if (dist > range) continue;
      if (!tryDrainBite(e, now, mod.cooldown ?? 1800)) continue;
      const amount = mod.amount ?? 6;
      this.damageCaster(amount);
      // Cura al vampiro: en Galahad, la forma activa; si no, la instancia.
      if (e._formSeq) {
        const cap = e._formSeq.activeForm().hp;
        e._formSeq.currentHp = Math.min(cap, e._formSeq.currentHp + amount);
        e.hp = e._formSeq.currentHp;
      } else {
        applyDrain(e, amount);
      }
      this.drawZap([{ x: e.x, y: e.y }, { x: this.caster.x, y: this.caster.y }], COLORS.bloodDrain);
      this.floatText(this.caster.x, this.caster.y - 20, `-${amount}`);
    }
  }

  updateBossGates() {
    for (const b of this.bosses) {
      if (b && b.active && b._gateGuard && !b._gateGuard.active) b._untargetable = false;
    }
  }

  // nv7 earth levelboss flight/ground cycle. Ground is the default and always returns (anti-spam).
  updateGriffin(delta) {
    for (const b of this.bosses) {
      if (!b || !b.active || !b.def || !b.def.griffin) continue;
      if (b._griffin == null) { b._griffin = { mode: 'ground', t: GRIFFIN_GROUND_MS }; b._untargetable = false; }
      const g = b._griffin;
      g.t -= delta;
      if (g.t <= 0) {
        if (g.mode === 'ground') { g.mode = 'flight'; g.t = GRIFFIN_FLIGHT_MS; b._untargetable = true; b.setAlpha(0.6); }
        else { g.mode = 'ground'; g.t = GRIFFIN_GROUND_MS; b._untargetable = false; b.setAlpha(1); }
      }
    }
  }

  updateRitualGuards() {
    const boss = this.boss;
    if (!boss || !boss.active || !boss._ritualSlots) return;
    for (const slot of boss._ritualSlots) {
      const g = slot.guard;
      if (!g || !g.active) continue;
      if (g._atSlot) { if (g.body) g.body.setVelocity(0, 0); continue; }
      const d = Phaser.Math.Distance.Between(g.x, g.y, slot.x, slot.y);
      if (d < 8) { g._atSlot = true; g.x = slot.x; g.y = slot.y; if (g.body) { g.body.setVelocity(0, 0); g.body.moves = false; } }
      else if (g.body) {
        const a = Phaser.Math.Angle.Between(g.x, g.y, slot.x, slot.y);
        g.body.setVelocity(Math.cos(a) * 140, Math.sin(a) * 140);
      }
    }
  }

  // nv7 cultist-leader ritual. While the leader is alive + untargetable, the bar
  // fills by timer; periodic taunts float. On full: he becomes targetable and is
  // forced into his fight phase (stops summoning). Killing him then clears the level.
  updateRitual(delta) {
    const boss = this.boss;
    if (!boss || !boss.active || !boss.def || !boss.def.ritual || !boss._ritual) {
      if (this.ritualGfx) this.ritualGfx.clear();
      return;
    }

    if (boss._untargetable) {
      const r = tickRitual(boss._ritual, delta);
      // Deceiving taunts ("ya casi, maestro…") — light floating text, no pause.
      boss._ritualTauntT -= delta;
      if (boss._ritualTauntT <= 0) {
        boss._ritualTauntT = RITUAL_TAUNT_EVERY;
        const key = `story.air.ritual.taunt.${boss._ritualTaunt % 3}`;
        boss._ritualTaunt += 1;
        this.floatRitualTaunt(boss, t(key));
      }
      if (r.full) {
        // Rite complete: the leader becomes targetable and stops channeling.
        boss._untargetable = false;
        if (boss.brainState && boss.brainState.boss) boss.brainState.boss.forcedPhase = 1;
        else boss.brainState = { ...(boss.brainState || {}), boss: { forcedPhase: 1 } };
      }
    }

    // Render the ritual bar (a thin graphics bar near the top, above the coffin).
    if (!this.ritualGfx) this.ritualGfx = this.add.graphics().setDepth(950);
    this.ritualGfx.clear();
    const frac = ritualFraction(boss._ritual);
    const bw = GAME_WIDTH - 80, bh = 10, bx = 40, by = 70;
    this.ritualGfx.fillStyle(COLORS.healthBack, 0.9);
    this.ritualGfx.fillRect(bx, by, bw, bh);
    this.ritualGfx.fillStyle(COLORS.lightning, 0.95);
    this.ritualGfx.fillRect(bx, by, bw * frac, bh);
    this.ritualGfx.lineStyle(2, COLORS.boss, 0.9);
    this.ritualGfx.strokeRect(bx, by, bw, bh);
  }

  // Floating deceiving taunt above the leader; rises and fades.
  floatRitualTaunt(boss, text) {
    const label = this.add.text(boss.x, boss.y - 40, text, {
      fontFamily: 'monospace', fontSize: '12px', color: '#fff176', align: 'center',
      wordWrap: { width: 200 },
    }).setOrigin(0.5).setDepth(951);
    this.tweens.add({ targets: label, y: label.y - 28, alpha: 0, duration: 2200, onComplete: () => label.destroy() });
  }

  // Back-compat wrapper used by BossMechanics' poisonFloor (damages the caster).
  spawnPoisonZone(x, y, radius, dps, duration) {
    this.spawnZone({ x, y, radius, duration, casterDps: dps, color: COLORS.poison });
  }

  // Setpiece de las tres hermanas: asigna el movimiento de cada hermana viva según
  // cuántas quedan (3 → Vesta persigue + flancos en anchors; 2 → kite separadas;
  // 1 → su propio kit). La geometría está en sisterFormation (pura/testeable).
  updateSisterFormation(live) {
    if (!live.length) return;
    const anchors = [
      { x: GAME_WIDTH * 0.18, y: GAME_HEIGHT * 0.28 },
      { x: GAME_WIDTH * 0.82, y: GAME_HEIGHT * 0.28 },
    ];
    const moves = sisterFormation(
      live.map((b) => ({ isChaser: b.def.key === 'vesta', baseMovement: b._baseMovement })),
      anchors,
    );
    for (let i = 0; i < live.length; i++) live[i].def.movement = moves[i];
  }

  updateTriangle(delta) {
    if (!this.triangle) return;
    const live = this.bosses.filter((b) => b && b.active);
    this.updateSisterFormation(live);
    // Última hermana viva: cancela el triángulo y recupera sus charcos de lava.
    if (live.length === 1 && live[0].def.soloSequence && !live[0]._wentSolo) {
      const b = live[0];
      b.def = { ...b.def, phases: [{ from: 1.0, sequence: b.def.soloSequence }] };
      b.brainState.boss = {};   // reinicia el sequencer a la nueva fase
      b._wentSolo = true;
    }
    this.triangleGfx.clear();
    if (live.length < 2) return; // degraded to nothing; the sisters' own kits remain
    const edges = hazardEdges(live.map((b) => ({ x: b.x, y: b.y })));

    const t = this.triangle;
    t.t -= delta;
    if (t.mode === 'cooldown') {
      if (t.t <= 0) { t.mode = 'telegraph'; t.t = 1200; }
    } else if (t.mode === 'telegraph') {
      this.drawTriangleEdges(edges, 0xffffff, 0.5, 2);   // warning outline
      if (t.t <= 0) { t.mode = 'active'; t.t = 2600; }
    } else if (t.mode === 'active') {
      this.drawLavaEdges(edges);  // animated lava (flicker + embers)
      if (onAnyEdge(this.caster.x, this.caster.y, edges, 14)) {
        this.damageCaster(28 * (delta / 1000));
        this.applyCasterBurn(8, 1200); // crossing the lava self-inflicts burn
      }
      if (t.t <= 0) { t.mode = 'cooldown'; t.t = 2500; }
    }
  }

  _strokeEdgesOn(g, edges, color, alpha, width) {
    g.lineStyle(width, color, alpha);
    for (const [a, b] of edges) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.strokePath(); }
  }
  _drawLavaEdgesOn(g, edges) {
    const t = this.lavaTime;
    const stroke = (w, col, a) => { g.lineStyle(w, col, a); for (const [p, q] of edges) { g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.strokePath(); } };
    stroke(40, LAVA.dark, 0.4);
    stroke(32, lerpColor(LAVA.mid, LAVA.hot, lavaPulse(t)), 0.9);
    stroke(10, LAVA.bright, lavaRimAlpha(t));
    for (const [p, q] of edges) for (const e of lavaEdgeEmbers(p, q, t, 7)) { g.fillStyle(LAVA.bright, e.alpha * 0.9); g.fillCircle(e.x, e.y, e.r); }
  }
  drawTriangleEdges(edges, color, alpha, width) {
    this._strokeEdgesOn(this.triangleGfx, edges, color, alpha, width);
  }

  updateZones(delta) {
    this.lavaGfx.clear(); // fire zones are redrawn animated each frame
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

      // CC (lift/stun/root) SOLO al entrar (rising-edge), nunca cada frame: reaplicar refresca
      // el timer y la inmunidad anti-cadena (que se arma al terminar el lock) nunca dispara,
      // dejando a la jugadora atrapada toda la vida de la zona. Aplicado una vez, el lift
      // corre 500ms, termina, arma la inmunidad 600ms y la jugadora sale del charco.
      if (casterIn && !z._casterWasIn) {
        if (z.casterLiftMs) applyCasterCc(this.caster, 'lift', z.casterLiftMs);
        if (z.casterStunMs) applyCasterCc(this.caster, 'stun', z.casterStunMs);
        if (z.casterRootMs) applyCasterCc(this.caster, 'root', z.casterRootMs);
      }
      z._casterWasIn = casterIn;
      
      if (z.enemyDps) {
        // Snapshot (filter returns a new array) so a kill mid-loop can't skip an enemy.
        const live = this.enemies.getChildren().filter((e) => e.active);
        for (const e of live) {
          if (Phaser.Math.Distance.Between(e.x, e.y, z.x, z.y) <= z.radius) this.hitEnemy(e, z.enemyDps * dt);
        }
      }
      if (z.fire) this.drawLavaZone(z);
      // Tentáculo de agua: animar scaleY según la fracción de vida de la zona.
      // Brota (0→fullScale) en el primer 30%; se retrae en el último 30%.
      if (z.tentacle) {
        const lifeFrac = 1 - z.remaining / z.duration0; // 0→1 durante la vida
        const grow    = Math.min(1, lifeFrac / 0.3);
        const retract = Math.min(1, Math.max(0, (lifeFrac - 0.7) / 0.3));
        z.tentacle.scaleY = (z.tentacle._tsyFull ?? 1) * Math.max(0, grow - retract);
      }
    }
    this.zones = this.zones.filter((z) => {
      if (z.remaining > 0) return true;
      if (z.gfx) z.gfx.destroy(); // fire zones have no flat disk (drawn on the shared lavaGfx)
      if (z.tentacle) z.tentacle.destroy();
      return false;
    });
  }

  // Animated molten lava pool on the shared lavaGfx (cleared each frame in updateZones).
  drawLavaZone(z) {
    const g = this.lavaGfx, t = this.lavaTime + z.x * 7 + z.y * 13; // per-zone phase offset
    g.fillStyle(lerpColor(LAVA.dark, LAVA.hot, lavaPulse(t)), 0.85); g.fillCircle(z.x, z.y, z.radius);
    g.fillStyle(LAVA.mid, 0.45); g.fillCircle(z.x, z.y, z.radius * 0.92);
    for (const s of lavaSpots(z.radius, t)) { g.fillStyle(LAVA.bright, 0.3 + 0.5 * s.bright); g.fillCircle(z.x + s.x, z.y + s.y, s.r); }
    g.lineStyle(2, LAVA.ember, lavaRimAlpha(t)); g.strokeCircle(z.x, z.y, z.radius); // flickering rim
    for (const e of lavaEmbers(z.radius, t)) { g.fillStyle(LAVA.bright, e.alpha * 0.9); g.fillCircle(z.x + e.x, z.y + e.y, e.r); } // rising embers
  }

  // The sisters' active lava triangle edges, drawn as a WIDE animated lava band
  // (outer glow + molten body + bright flickering core + embers) on triangleGfx.
  drawLavaEdges(edges) {
    this._drawLavaEdgesOn(this.triangleGfx, edges);
  }

  updateLavaRiver(delta) {
    if (!this.lavaRiver) return;
    if (!this.lavaRiverGfx) this.lavaRiverGfx = this.add.graphics().setDepth(6);
    this.lavaRiverGfx.clear();
    const lr = this.lavaRiver;
    lr.t -= delta;
    if (lr.mode === 'cooldown') {
      if (lr.t <= 0) {
        lr.mode = 'telegraph'; lr.t = LAVA_RIVER_TELEGRAPH_MS;
        const orient = ['horizontal', 'vertical', 'diag1', 'diag2'];
        lr.orientation = orient[Phaser.Math.Between(0, orient.length - 1)];
      }
    } else if (lr.mode === 'telegraph') {
      this._strokeEdgesOn(this.lavaRiverGfx, riverEdges(lr.orientation, GAME_WIDTH, GAME_HEIGHT), 0xffffff, 0.5, 2);
      if (lr.t <= 0) { lr.mode = 'active'; lr.t = LAVA_RIVER_ACTIVE_MS; }
    } else if (lr.mode === 'active') {
      this._drawLavaEdgesOn(this.lavaRiverGfx, riverEdges(lr.orientation, GAME_WIDTH, GAME_HEIGHT));
      if (onAnyEdge(this.caster.x, this.caster.y, riverEdges(lr.orientation, GAME_WIDTH, GAME_HEIGHT), 16)) {
        this.damageCaster(LAVA_RIVER_DPS * (delta / 1000));
        this.applyCasterBurn(8, 1200);
      }
      if (lr.t <= 0) { lr.mode = 'cooldown'; lr.t = LAVA_RIVER_COOLDOWN_MS; }
    }
  }

  updateAuras(delta) {
    const dt = delta / 1000;
    const live = this.enemies.getChildren().filter((e) => e.active);
    // VFX is throttled (drawing a tether/pulse every frame would saturate); the heal math below still runs each frame.
    const emitFx = (this._healFxTimer += delta) >= HEAL_FX_INTERVAL_MS;
    if (emitFx) this._healFxTimer = 0;
    for (const e of live) {
      const heal = findModifier(e.def, 'healAllies');
      if (heal) {
        const r = heal.radius ?? 120; const hps = heal.hps ?? 8;
        const healed = []; // allies actually receiving cura this tick — drives the tethers
        for (const o of live) {
          if (o === e || o.hp >= o.maxHp) continue;
          if (Phaser.Math.Distance.Between(e.x, e.y, o.x, o.y) <= r) {
            o.hp = Math.min(o.maxHp, o.hp + hps * dt);
            if (emitFx) healed.push(o);
          }
        }
        // Persistent identifier ring so the player can spot/prioritize a healer even when idle.
        // Bosses are skipped — they already telegraph heavily and a ring would clutter their fights.
        if (!this.bosses.includes(e)) {
          let ring = this._healRings.get(e);
          if (!ring) {
            ring = this.add.circle(e.x, e.y, (e.def.radius || 16) + 6).setStrokeStyle(2, COLORS.heal, 0.55).setDepth(ACTOR_DEPTH - 1);
            this._healRings.set(e, ring);
          }
          ring.setPosition(e.x, e.y);
        }
        // Throttled feedback: a green pulse on the healer + a fading tether to each ally it's healing.
        if (emitFx && healed.length) {
          this.flashCircle(e.x, e.y, (e.def.radius || 16) + 12, COLORS.heal);
          for (const o of healed) this.drawHealTether(e, o);
        }
      }
      const aura = findModifier(e.def, 'auraDamage');
      if (aura) {
        const r = aura.radius ?? 40;
        if (Phaser.Math.Distance.Between(e.x, e.y, this.caster.x, this.caster.y) <= r) {
          this.damageCaster((aura.dps ?? 10) * dt);
        }
      }
    }
    // Reap marker rings whose healer has died/despawned — covers every death path (split, revive, level cleanup).
    for (const [enemy, ring] of this._healRings) {
      if (!enemy.active) { ring.destroy(); this._healRings.delete(enemy); }
    }
  }

  // Applies an onHitSlow to the caster (pure math) plus a brief blue tint as feedback.
  applyCasterSlowFx(factor, ms) {
    applyCasterSlow(this.caster, factor, ms);
    this.caster.setTint(COLORS.ice);
    this.time.delayedCall(200, () => this.caster.clearTint());
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

  applyCasterPoison(dps, ms) {
    this.casterPoisonDps = Math.max(this.casterPoisonDps, dps);
    this.casterPoisonRemaining = Math.max(this.casterPoisonRemaining, ms);
    this.caster.setTint(COLORS.poison);
    this.time.delayedCall(200, () => this.caster.clearTint());
  }

  updateCasterPoison(delta) {
    if (this.casterPoisonRemaining <= 0) { this.casterPoisonDps = 0; return; }
    this.casterPoisonRemaining -= delta;
    this.damageCaster(this.casterPoisonDps * (delta / 1000));
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
