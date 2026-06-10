# Motor de Enemigos — Plan 3: Framework de Jefes + las Tres Hermanas (solos) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el framework de jefes (fases por umbral de vida + secuenciador coreografiado + telegrafías) y, como sus primeros consumidores, las peleas en solitario de **Pyra (nv4)**, **Vesta (nv5)** y **Favilla (nv6)** — cada una con su kit propio y fases.

**Architecture:** Un módulo puro `systems/BossBrain.js` (`activePhase` + `stepBoss`) decide, a partir de la fracción de vida del jefe, qué fase está activa y avanza una secuencia de pasos coreografiada (telegrafía → ataque → espera). `Enemy.think` lo invoca cuando el def tiene `phases` y emite intenciones `{velocity, fires, telegraphs}`; `GameScene` ejecuta los ataques (reusando `executeAttack` del Plan 2) y dibuja las telegrafías. Los jefes reusan TODO el catálogo de componentes del Plan 2.

**Tech Stack:** Phaser 3 (CDN, sin build), módulos ES nativos, `node:test`. Construye sobre `master` (Planes 1 y 2 mergeados).

**Decisión de coexistencia (importante):** `BossMechanics` (los temple bosses de agua/aire/tierra/castillo) **se mantiene intacto** en este plan. Los jefes nuevos de Fuego usan el secuenciador (`phases`); los viejos siguen con `mechanics`. `beginPhase` elige según el def. La eliminación de `BossMechanics` se difiere a cuando todos los mundos estén convertidos.

**Alcance.** Framework (sequencer puro + integración + telegrafías) y las **tres hermanas en solitario** (Pyra/Vesta/Favilla), cableadas a los minibosses de los niveles 4/5/6 de Fuego. **Fuera de alcance (Plan 4):** el levelBoss del nv6 (las tres juntas + **triángulo de lava** + multi-jefe en una fase), **Ignatius** (nv7, setpiece de 3 fases), y la eliminación de `BossMechanics`. Hooks `enter` de fase y gimmicks pesados (tótems-invulnerable, grieta de muro) se simplifican aquí (fases cambian secuencia + `speedMul`); sus versiones completas son del Plan 4.

---

## Estructura de archivos

**Crear:**
- `src/systems/BossBrain.js` — secuenciador de jefe (puro).
- `src/data/bosses/fire.js` — Pyra, Vesta, Favilla (data).
- `tests/BossBrain.test.js`.

**Modificar:**
- `src/objects/Enemy.js` — `think` usa `stepBoss` cuando `def.phases`; init `brainState.boss`.
- `src/scenes/GameScene.js` — `telegraphGfx`, `drawTelegraph`, y el loop de update consume `intent.telegraphs`.
- `src/data/regions.js` — minibosses de Fuego nv4/5/6 = Pyra/Vesta/Favilla.

**Nota de compat:** los jefes son `Boss extends Enemy`, ya pasan por `think`. Hoy los defs de jefe no tienen `phases` → con este plan, los nuevos defs de Fuego sí. Los defs viejos (mb/lb/tb genéricos, y los temple bosses con `mechanics`) **no** tienen `phases` → `think` cae en el camino de `attacks` (vacío) y `BossMechanics` los maneja como hoy. Sin regresión.

---

## Task 1: BossBrain — fases + secuenciador (puro)

**Files:**
- Create: `src/systems/BossBrain.js`, `tests/BossBrain.test.js`

- [ ] **Step 1: Tests (fallan)** — crear `tests/BossBrain.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activePhase, stepBoss } from '../src/systems/BossBrain.js';

const PHASES = [{ from: 1.0 }, { from: 0.6 }, { from: 0.3 }];

test('activePhase picks the deepest phase whose threshold the hp is at/below', () => {
  assert.equal(activePhase(PHASES, 0.9), 0);
  assert.equal(activePhase(PHASES, 0.6), 1);
  assert.equal(activePhase(PHASES, 0.5), 1);
  assert.equal(activePhase(PHASES, 0.2), 2);
  assert.equal(activePhase(PHASES, 1.0), 0);
});

test('stepBoss signals entered=true once when the phase changes', () => {
  const def = { speed: 50, movement: { type: 'kite' }, phases: [
    { from: 1.0, sequence: [{ do: 'wait', dur: 100 }] },
    { from: 0.5, speedMul: 1.5, sequence: [{ do: 'wait', dur: 100 }] },
  ] };
  const rt = {};
  const a = stepBoss(def, rt, 1.0, 16);
  assert.equal(a.phaseIndex, 0);
  assert.equal(a.entered, true);          // first call enters phase 0
  const b = stepBoss(def, rt, 1.0, 16);
  assert.equal(b.entered, false);         // same phase, no re-enter
  const c = stepBoss(def, rt, 0.4, 16);
  assert.equal(c.phaseIndex, 1);
  assert.equal(c.entered, true);          // crossed into phase 1
  assert.equal(c.speedMul, 1.5);
});

test('stepBoss telegraphs during the window, then fires once, then advances', () => {
  const def = { speed: 50, movement: { type: 'static' }, phases: [
    { from: 1.0, sequence: [
      { do: 'shootSpread', count: 3, telegraph: 300, dur: 200 },
      { do: 'wait', dur: 100 },
    ] },
  ] };
  const rt = {};
  let out = stepBoss(def, rt, 1.0, 100); // t=100 < 300 → telegraph
  assert.ok(out.telegraph && !out.fire);
  out = stepBoss(def, rt, 1.0, 100);     // t=200 < 300 → still telegraph
  assert.ok(out.telegraph && !out.fire);
  out = stepBoss(def, rt, 1.0, 150);     // t=350 ≥ 300 → fire once
  assert.ok(out.fire && out.fire.do === 'shootSpread');
  out = stepBoss(def, rt, 1.0, 10);      // already fired, within dur → nothing
  assert.ok(!out.fire && !out.telegraph);
  // total step time 300+200=500; advance past it → next step is 'wait' (no fire)
  out = stepBoss(def, rt, 1.0, 200);     // t now past 500 → step advances; wait step
  assert.ok(!out.fire);
});

test('wait steps never fire or telegraph', () => {
  const def = { speed: 50, movement: { type: 'static' }, phases: [
    { from: 1.0, sequence: [{ do: 'wait', dur: 100 }] },
  ] };
  const rt = {};
  const out = stepBoss(def, rt, 1.0, 50);
  assert.equal(out.fire, null);
  assert.equal(out.telegraph, null);
});

test('stepBoss falls back to def.movement when the phase omits one, and speedMul defaults to 1', () => {
  const def = { speed: 50, movement: { type: 'chase' }, phases: [{ from: 1.0, sequence: [{ do: 'wait', dur: 100 }] }] };
  const out = stepBoss(def, {}, 1.0, 16);
  assert.deepEqual(out.movement, { type: 'chase' });
  assert.equal(out.speedMul, 1);
});
```

- [ ] **Step 2: Run `node --test tests/BossBrain.test.js` → FAIL (module not found).**

- [ ] **Step 3: Crear `src/systems/BossBrain.js`:**
```js
// src/systems/BossBrain.js
// Pure (no Phaser). Boss phase + choreographed-sequence engine. Given a boss def
// with `phases` (each gated by an hp-fraction threshold `from`, descending), the
// active phase runs an ordered `sequence` of steps. Each step: telegraph window
// (if `telegraph` ms) → fire once → hold until `telegraph + dur`, then advance.
// A `{ do: 'wait' }` step neither telegraphs nor fires.

// Phases are ordered by descending `from`. Active = the deepest phase whose
// threshold the current hp fraction is at or below.
export function activePhase(phases, hpFrac) {
  let idx = 0;
  for (let i = 0; i < phases.length; i++) if (hpFrac <= phases[i].from) idx = i;
  return idx;
}

// rt is mutable runtime: { phaseIndex, stepIndex, stepTimer, fired }.
// Returns { phaseIndex, entered, enter, movement, speedMul, telegraph, fire }.
export function stepBoss(def, rt, hpFrac, dt) {
  const phases = def.phases || [];
  const pi = phases.length ? activePhase(phases, hpFrac) : 0;
  let entered = false;
  if (rt.phaseIndex !== pi) {
    rt.phaseIndex = pi; rt.stepIndex = 0; rt.stepTimer = 0; rt.fired = false;
    entered = true;
  }
  const phase = phases[pi] || {};
  const seq = phase.sequence || [];
  const movement = phase.movement || def.movement;
  const speedMul = phase.speedMul ?? 1;
  let telegraph = null, fire = null;
  if (seq.length) {
    const step = seq[rt.stepIndex % seq.length];
    rt.stepTimer = (rt.stepTimer ?? 0) + dt;
    const tele = step.telegraph || 0;
    const dur = step.dur ?? 500;
    const isWait = step.do === 'wait';
    if (rt.stepTimer < tele) {
      if (!isWait) telegraph = step;
    } else if (!rt.fired) {
      if (!isWait) fire = step;
      rt.fired = true;
    }
    if (rt.stepTimer >= tele + dur) { rt.stepIndex += 1; rt.stepTimer = 0; rt.fired = false; }
  }
  return { phaseIndex: pi, entered, enter: entered ? (phase.enter || []) : [], movement, speedMul, telegraph, fire };
}
```

- [ ] **Step 4: Run `node --test tests/BossBrain.test.js` → PASS.**

- [ ] **Step 5: Run `node --test` → todo pasa.**

- [ ] **Step 6: Commit**
```bash
git add src/systems/BossBrain.js tests/BossBrain.test.js
git commit -m "feat: BossBrain — fases + secuenciador coreografiado (puro)"
```

---

## Task 2: Enemy.think — integrar el secuenciador de jefe

**Files:**
- Modify: `src/objects/Enemy.js`

Contexto: `think(delta, target)` hoy: maneja freeze/slow, calcula `velocity` con `computeMovement(this.def, ...)`, y recorre `this.def.attacks` con `stepAttack`, devolviendo `{ velocity, fires }`. Si el def tiene `phases`, usamos `stepBoss` en su lugar: la fase activa aporta movimiento + `speedMul`, y emite a lo más un `fire` (paso de ataque) y un `telegraph` por frame.

- [ ] **Step 1:** Añadir el import al inicio de `src/objects/Enemy.js` (junto al de EnemyBrain):
```js
import { stepBoss } from '../systems/BossBrain.js';
```

- [ ] **Step 2:** En el constructor, donde se inicializa `this.brainState`, ampliarlo para los jefes. Cambiar:
```js
    this.brainState = { move: {}, attacks: (def.attacks || []).map(() => ({})) };
```
por:
```js
    this.brainState = { move: {}, attacks: (def.attacks || []).map(() => ({})), boss: {} };
```

- [ ] **Step 3:** Reemplazar el cuerpo de `think` (desde el cálculo de `speed`/`ctx` en adelante) para ramificar entre jefe y enemigo normal. El método completo queda así:
```js
  think(delta, target) {
    if (!this.active) return { velocity: { x: 0, y: 0 }, fires: [], telegraphs: [] };

    if (this.freezeRemaining > 0) this.freezeRemaining -= delta;
    if (this.slowRemaining > 0) this.slowRemaining -= delta;

    if (this.freezeRemaining > 0) return { velocity: { x: 0, y: 0 }, fires: [], telegraphs: [] };

    const slow = this.slowRemaining > 0 ? this.slowFactor : 1;
    const fires = [];
    const telegraphs = [];
    let movementDef = this.def;
    let speedMul = 1;

    if (this.def.phases) {
      const out = stepBoss(this.def, this.brainState.boss, this.hp / this.maxHp, delta);
      movementDef = { movement: out.movement };
      speedMul = out.speedMul;
      if (out.telegraph) telegraphs.push(out.telegraph);
      if (out.fire) fires.push({ type: out.fire.do, ...out.fire }); // step.do → attack.type
    } else {
      const attacks = this.def.attacks || [];
      for (let i = 0; i < attacks.length; i++) {
        const r = stepAttack(attacks[i], this.brainState.attacks[i], delta);
        if (r.fire) fires.push(attacks[i]);
      }
    }

    const ctx = {
      self: { x: this.x, y: this.y },
      target: { x: target.x, y: target.y },
      speed: this.def.speed * slow * speedMul,
      dt: delta,
    };
    const velocity = computeMovement(movementDef, this.brainState.move, ctx);
    return { velocity, fires, telegraphs };
  }
```

- [ ] **Step 4:** `node --check src/objects/Enemy.js` → limpio. `node --test` → todo pasa (la rama normal de `attacks` no cambió de comportamiento; los enemigos del Plan 2 siguen igual).

- [ ] **Step 5: Commit**
```bash
git add src/objects/Enemy.js
git commit -m "feat: Enemy.think corre el secuenciador de jefe cuando el def tiene phases"
```

---

## Task 3: GameScene — telegrafías + consumir las intenciones de jefe

**Files:**
- Modify: `src/scenes/GameScene.js`

Contexto: el loop de update hace `const intent = e.think(...); e.setVelocity(...); for (const att of intent.fires) this.executeAttack(e, att);`. Ahora `intent` también trae `telegraphs`. Hay que dibujarlas. Los `fires` de jefe ya vienen normalizados a `{type, ...}` y `executeAttack` (Plan 2) maneja `shootSpread`/`nova`/`lobAoe`/`summon`/`shootStraight` — sin cambios ahí.

- [ ] **Step 1:** Crear el graphics de telegrafías en `create()`. Junto al `this.debug = ...` (o tras `this.zones = []`), añadir:
```js
    this.telegraphGfx = this.add.graphics().setDepth(1400);
```

- [ ] **Step 2:** Añadir el método de dibujo (junto a los otros helpers de jefe/proyectil):
```js
  drawTelegraph(enemy, step) {
    const g = this.telegraphGfx;
    g.lineStyle(2, 0xffffff, 0.9);
    if (step.do === 'lobAoe') {
      g.strokeCircle(this.caster.x, this.caster.y, step.radius ?? 60); // ground marker where it lands
    } else {
      g.strokeCircle(enemy.x, enemy.y, (enemy.def.radius || 20) + 16);  // wind-up ring on the boss
    }
  }
```

- [ ] **Step 3:** En `update`, en el loop de enemigos, limpiar el graphics una vez por frame y dibujar las telegrafías. Reemplazar el bloque del loop:
```js
    for (const e of liveEnemies) {
      const intent = e.think(delta, this.caster);
      e.setVelocity(intent.velocity.x, intent.velocity.y);
      for (const att of intent.fires) this.executeAttack(e, att);
    }
```
por:
```js
    this.telegraphGfx.clear();
    for (const e of liveEnemies) {
      const intent = e.think(delta, this.caster);
      e.setVelocity(intent.velocity.x, intent.velocity.y);
      for (const att of intent.fires) this.executeAttack(e, att);
      if (intent.telegraphs) for (const t of intent.telegraphs) this.drawTelegraph(e, t);
    }
```

- [ ] **Step 4:** `node --check src/scenes/GameScene.js` → limpio. `node --test` → todo pasa.

- [ ] **Step 5: Commit**
```bash
git add src/scenes/GameScene.js
git commit -m "feat: GameScene dibuja telegrafías y consume las intenciones de jefe"
```

---

## Task 4: Datos de las tres hermanas (solos)

**Files:**
- Create: `src/data/bosses/fire.js`

Stats de jefe (vida alta, escaladas luego por `scaleEnemyDef`). Reusan el catálogo del Plan 2: `shootSpread`/`nova`/`lobAoe`/`summon`/`shootStraight` como pasos; modificadores `onHitBurn`/`shielded`/`healAllies`. Texturas reusadas (`TEX.boss`) + tinte.

- [ ] **Step 1:** Crear `src/data/bosses/fire.js`:
```js
import { COLORS, TEX } from '../../config.js';

// The three sisters, fought solo at fire levels 4/5/6. Each is a Boss (extends
// Enemy) driven by BossBrain phases. They reuse the Plan-2 component catalog.
// Stats are pre-scale; GameScene applies scaleEnemyDef(def, mult).

// Pyra — daño: ráfagas en cono + el suelo se llena de lava. Kite a media distancia.
export const PYRA = {
  key: 'pyra', tex: TEX.boss, color: COLORS.emberDeep, hp: 420, speed: 55, damage: 14, radius: 24,
  elite: true, movement: { type: 'kite', range: 240 },
  phases: [
    { from: 1.0, sequence: [
      { do: 'shootSpread', count: 5, arc: 80, speed: 230, damage: 12, telegraph: 320, dur: 700 },
      { do: 'wait', dur: 500 },
      { do: 'lobAoe', radius: 64, dps: 22, duration: 3500, telegraph: 500, dur: 900 },
    ] },
    { from: 0.5, speedMul: 1.2, sequence: [
      { do: 'shootSpread', count: 7, arc: 100, speed: 250, damage: 13, telegraph: 280, dur: 600 },
      { do: 'nova', count: 10, speed: 210, damage: 11, telegraph: 350, dur: 700 },
      { do: 'lobAoe', radius: 70, dps: 26, duration: 4000, telegraph: 450, dur: 800 },
    ] },
  ],
};

// Vesta — tanque/melee: embiste (charge), su contacto quema (onHitBurn), escudo.
export const VESTA = {
  key: 'vesta', tex: TEX.boss, color: COLORS.magma, hp: 520, speed: 80, damage: 18, radius: 26,
  elite: true, movement: { type: 'charge', windup: 600, dash: 420, recover: 700, dashMul: 3 },
  modifiers: [{ type: 'onHitBurn', dps: 10, ms: 2500 }, { type: 'shielded', reduce: 0.3 }],
  phases: [
    { from: 1.0, sequence: [
      { do: 'wait', dur: 1300 },                 // the charge movement is the main threat
      { do: 'shootStraight', speed: 260, damage: 12, telegraph: 250, dur: 600 },
    ] },
    { from: 0.4, speedMul: 1.3, sequence: [
      { do: 'wait', dur: 900 },
      { do: 'nova', count: 8, speed: 230, damage: 13, telegraph: 300, dur: 700 },
    ] },
  ],
};

// Favilla — summoner/healer: invoca adds y cura (healAllies); huye, protegida.
export const FAVILLA = {
  key: 'favilla', tex: TEX.boss, color: COLORS.totemFire, hp: 480, speed: 70, damage: 10, radius: 24,
  elite: true, movement: { type: 'flee' },
  modifiers: [{ type: 'healAllies', hps: 14, radius: 160 }],
  phases: [
    { from: 1.0, sequence: [
      { do: 'summon', spawnType: 'imp_brasa', count: 2, dur: 1000 },
      { do: 'lobAoe', radius: 60, dps: 20, duration: 3000, telegraph: 500, dur: 1200 },
    ] },
    { from: 0.5, speedMul: 1.15, sequence: [
      { do: 'summon', spawnType: 'avispa_brasa', count: 3, dur: 900 },
      { do: 'summon', spawnType: 'imp_brasa', count: 2, dur: 900 },
      { do: 'nova', count: 12, speed: 200, damage: 10, telegraph: 400, dur: 800 },
    ] },
  ],
};
```

- [ ] **Step 2:** `node --check src/data/bosses/fire.js` → limpio. Sanity:
```bash
node -e "import('./src/data/bosses/fire.js').then(m => { for (const k of ['PYRA','VESTA','FAVILLA']) { const b = m[k]; if (!b.phases || !b.movement || b.hp == null) throw new Error('bad '+k); } console.log('sisters ok'); })"
```
Expected: `sisters ok`.

- [ ] **Step 3: Commit**
```bash
git add src/data/bosses/fire.js
git commit -m "feat: datos de las tres hermanas (Pyra/Vesta/Favilla, solos)"
```

---

## Task 5: Cablear las hermanas a los minibosses de Fuego nv4/5/6

**Files:**
- Modify: `src/data/regions.js`

Contexto: `makeBranch` construye los 7 niveles de cada rama. Hoy los niveles 4/5/6 de Fuego usan `mb(hp, dmg)` genérico como miniboss. Para Fuego, hay que usar Pyra/Vesta/Favilla. `makeBranch` es genérico; ya acepta `basic`/`inter` (del Plan 2). Añadimos un override opcional de minibosses para Fuego sin tocar los otros mundos.

- [ ] **Step 1:** Importar las hermanas en `src/data/regions.js` (junto a los otros imports del top):
```js
import { PYRA, VESTA, FAVILLA } from './bosses/fire.js';
```

- [ ] **Step 2:** Permitir override de minibosses en `makeBranch`. Hoy los niveles 4/5/6 se construyen con `miniboss: mb(...)`. Cambiar la firma de `makeBranch` para aceptar un array opcional `minibosses` (un def por cada uno de los niveles 4, 5, 6) que, si está presente, reemplaza al `mb(...)` genérico de ese nivel.

  Cambiar la firma:
  `function makeBranch({ id, element, name, grantsSkill, intro, mageName, mageLines, basic = basicWaves, inter = interWaves })`
  a:
  `function makeBranch({ id, element, name, grantsSkill, intro, mageName, mageLines, basic = basicWaves, inter = interWaves, minibosses = [] })`

  Dentro de `makeBranch`, donde se construyen los niveles 4, 5 y 6, cambiar el `miniboss:` de cada uno para usar el override si existe. Es decir, en el `levels` array:
  - Nivel `${id}_4`: `miniboss: minibosses[0] || mb(300, 18)`
  - Nivel `${id}_5`: `miniboss: minibosses[1] || mb(360, 20)`
  - Nivel `${id}_6`: `miniboss: minibosses[2] || mb(380, 20)` (el `levelBoss: lb(650, 24)` de ese nivel NO cambia en este plan — es Plan 4)

  (Lee el cuerpo actual de `makeBranch` y aplica el `|| mb(...)` exactamente sobre los valores `mb(...)` que ya están ahí, preservando los números por defecto para los otros mundos.)

- [ ] **Step 3:** En el objeto `REGIONS`, en la llamada `fire: makeBranch({ ... })`, añadir al argumento:
```js
    minibosses: [PYRA, VESTA, FAVILLA],
```
(junto a `basic: fireWaves, inter: fireInterWaves`). NO tocar water/air/earth (sin `minibosses` → usan `mb(...)` genérico, sin cambio).

- [ ] **Step 4:** Checks.
- `node --check src/data/regions.js` → limpio.
- `node --test` → todo pasa, INCLUYENDO `tests/regions.test.js`. Si ese test afirma algo sobre el miniboss de Fuego (p. ej. su `hp` o `key`), actualiza la expectativa para reflejar Pyra/Vesta/Favilla y explica; si solo verifica estructura (kinds/phases), pasa sin cambios. Reporta qué encontraste.
- Sanity de que los defs llegan al runtime:
```bash
node -e "import('./src/data/regions.js').then(m => { const f = m.REGIONS.fire; const l4 = f.levels[3].phases.find(p => p.type==='miniboss'); console.log('nv4 miniboss key:', l4.enemyDef.key); if (l4.enemyDef.key !== 'pyra') throw new Error('expected pyra'); console.log('ok'); })"
```
Expected: `nv4 miniboss key: pyra` y `ok`.

- [ ] **Step 5: Commit**
```bash
git add src/data/regions.js
git commit -m "feat: Fuego nv4/5/6 minibosses = Pyra/Vesta/Favilla"
```

---

## Self-Review

**1. Cobertura (vs spec §2 framework de jefes, §4 las hermanas):**
- Fases por umbral de vida + secuenciador coreografiado + telegrafías → Tasks 1/2/3. ✓
- Pyra (daño/lava), Vesta (tanque/charge/burning/escudo), Favilla (summoner/healer) como peleas solo en nv4/5/6 → Tasks 4/5. ✓
- Reuso del catálogo del Plan 2 (shootSpread/nova/lobAoe/summon/shootStraight + onHitBurn/shielded/healAllies) → Task 4. ✓
- Coexistencia con `BossMechanics` (otros mundos intactos) → decisión documentada; `think` cae en attacks/BossMechanics cuando no hay `phases`. ✓
- Diferido explícito (no huecos): el levelBoss nv6 (tres hermanas + **triángulo de lava** + multi-jefe), **Ignatius** (nv7, 3 fases), hooks `enter` completos / gimmicks pesados (tótems-invuln, grieta de muro), y la eliminación de `BossMechanics` → **Plan 4**.

**2. Placeholder scan:** sin TBD/TODO; cada step con código completo; el único ajuste condicional (`tests/regions.test.js`) viene con instrucción precisa de qué hacer según lo que afirme. ✓

**3. Consistencia de tipos:** `stepBoss(def, rt, hpFrac, dt)` y `activePhase(phases, hpFrac)` (Task 1) se usan con esas firmas en `Enemy.think` (Task 2). `think` devuelve `{ velocity, fires, telegraphs }`; el loop de `GameScene` (Task 3) consume las tres. Los `fire` de jefe se normalizan a `{ type: step.do, ...step }` y los `do` usados por las hermanas (`shootSpread`/`nova`/`lobAoe`/`summon`/`shootStraight`/`wait`) son exactamente los que maneja `executeAttack` (Plan 2) — y `wait` no emite fire. Los modificadores de las hermanas (`onHitBurn`/`shielded`/`healAllies`) ya los consume GameScene (Plan 2). `spawnType` de Favilla (`imp_brasa`/`avispa_brasa`) existe en el registro de Fuego. ✓

---

## Notas para el Plan 4 (el clímax de Fuego)

- **Multi-jefe en una fase:** `beginPhase` `levelBoss` con `bosses: [PYRA, VESTA, FAVILLA]` (variantes atenuadas), `clearWhen: 'allDead'`; generalizar `this.boss` → lista, barras múltiples.
- **Triángulo de lava:** `systems/TriangleHazard.js` puro (perímetro de 3 posiciones, punto-dentro, degradación 3→línea→nada) + render/colisión en GameScene (telegrafiado, pulsante, daño al cruzar), y el enfurecer al morir una hermana.
- **Ignatius (nv7):** setpiece de 3 fases (Duelo → La Pira/lavaFloor → Frenesí/beam), con hooks `enter` reales (`spawnLavaFloor`) y `beam`. Reemplaza el `templeBoss` viejo de Fuego.
- **Gimmicks completos de las hermanas** si se quieren para el trío: tótems-invulnerable (Favilla), grieta de muro→onda (Vesta), acumulación de charcos (Pyra ya lo aproxima con lobAoe).
- Tras convertir todos los mundos: **eliminar `BossMechanics`**.
