# Motor de Enemigos — Plan 4: Triángulo de Lava + Multi-jefe + Ignatius Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar el mundo de Fuego: las **tres hermanas juntas** (multi-jefe en una fase) con el **triángulo de lava** emergente (telegrafiado, pulsante, que se degrada al matarlas), el **enfurecer al morir una hermana**, y **Ignatius** — el padre, setpiece de 3 fases con suelo de lava.

**Architecture:** Un módulo puro `systems/TriangleHazard.js` calcula los bordes del peligro a partir de las posiciones de las hermanas vivas (3→triángulo, 2→línea, 1→nada) y la distancia del jugador a esos bordes. `GameScene` corre un controlador de estado (cooldown→telegrafía→activo→fade) que dibuja y aplica daño al cruzar la lava, generaliza a **multi-jefe** (`this.bosses`), maneja hooks `enter` de fase (`spawnLavaFloor`) y el enfurecer entre hermanas. Ignatius reusa el secuenciador del Plan 3 con 3 fases + hook de suelo de lava.

**Tech Stack:** Phaser 3 (CDN, sin build), módulos ES nativos, `node:test`. Construye sobre `master` (Planes 1–3 mergeados: motor componible, contenido de Fuego, framework de jefes + las hermanas solo).

**Alcance.** Multi-jefe, triángulo de lava, enrage al morir hermana, hooks `enter`, Ignatius (3 fases), y cablear nv6 levelBoss (trío) + nv7 templeBoss (Ignatius). **Simplificaciones documentadas (no huecos):** el `beam` rotatorio de la fase 3 de Ignatius se aproxima con `nova`+`lobAoe` densos (un beam real es polish futuro); el triángulo se forma de las posiciones *vivas actuales* de las hermanas (sin IA de reposicionamiento a formación equilátera — eso es polish futuro); la invulnerabilidad-por-tótems de Favilla no se usa en el trío. **Tras este plan**, cuando los otros mundos se conviertan, se podrá **eliminar `BossMechanics`** (sigue intacto aquí para agua/aire/tierra/castillo).

---

## Estructura de archivos

**Crear:**
- `src/systems/TriangleHazard.js` — geometría del peligro (puro).
- `tests/TriangleHazard.test.js`.

**Modificar:**
- `src/data/levelBuilder.js` — `buildPhase` levelBoss pasa `bosses`/`triangle`.
- `src/objects/Enemy.js` — `think` emite `enters` (hooks de fase) y aplica `this.enrageMul`.
- `src/scenes/GameScene.js` — multi-jefe (`this.bosses`), `spawnBosses`, barras múltiples, `runBossHook`, el controlador del triángulo, enrage al morir hermana.
- `src/data/bosses/fire.js` — variantes atenuadas del trío + `IGNATIUS`.
- `src/data/regions.js` — nv6 levelBoss = trío (con triángulo), nv7 templeBoss = Ignatius.

**Nota de compat:** mantenemos `this.boss` (single) para los temple bosses de otros mundos que corren `BossMechanics`; añadimos `this.bosses` (lista) para barras y el trío. `checkPhaseCleared` ya limpia cuando `countActive===0`, así que "mueren las tres + sus adds" funciona sin cambios. `BossMechanics` intacto.

---

## Task 1: TriangleHazard — geometría del peligro (puro)

**Files:**
- Create: `src/systems/TriangleHazard.js`, `tests/TriangleHazard.test.js`

- [ ] **Step 1: Tests (fallan)** — crear `tests/TriangleHazard.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hazardEdges, distanceToNearestEdge, onAnyEdge, pointInTriangle } from '../src/systems/TriangleHazard.js';

const P = (x, y) => ({ x, y });

test('hazardEdges: 3 points → triangle (3 edges), 2 → line (1 edge), ≤1 → none', () => {
  const tri = hazardEdges([P(0, 0), P(100, 0), P(0, 100)]);
  assert.equal(tri.length, 3);
  assert.equal(hazardEdges([P(0, 0), P(100, 0)]).length, 1);
  assert.equal(hazardEdges([P(0, 0)]).length, 0);
  assert.equal(hazardEdges([]).length, 0);
});

test('distanceToNearestEdge measures perpendicular distance to the closest edge', () => {
  const edges = hazardEdges([P(0, 0), P(100, 0), P(0, 100)]);
  // point at (50, -10) is 10 below the bottom edge (0,0)-(100,0)
  assert.ok(Math.abs(distanceToNearestEdge(50, -10, edges) - 10) < 1e-6);
  // a point well inside is far from all edges
  assert.ok(distanceToNearestEdge(20, 20, edges) > 5);
});

test('onAnyEdge true within width, false outside (and false when no edges)', () => {
  const edges = hazardEdges([P(0, 0), P(100, 0), P(0, 100)]);
  assert.equal(onAnyEdge(50, -3, edges, 6), true);
  assert.equal(onAnyEdge(50, -30, edges, 6), false);
  assert.equal(onAnyEdge(50, 50, [], 6), false);
});

test('pointInTriangle detects inside vs outside', () => {
  const a = P(0, 0), b = P(100, 0), c = P(0, 100);
  assert.equal(pointInTriangle(10, 10, a, b, c), true);
  assert.equal(pointInTriangle(80, 80, a, b, c), false);
});

test('distToSegment clamps to endpoints (not the infinite line)', () => {
  const edges = [[P(0, 0), P(100, 0)]];
  // point past the right endpoint: distance is to (100,0), not the line y=0
  assert.ok(Math.abs(distanceToNearestEdge(130, 0, edges) - 30) < 1e-6);
});
```

- [ ] **Step 2: Run `node --test tests/TriangleHazard.test.js` → FAIL (module not found).**

- [ ] **Step 3: Crear `src/systems/TriangleHazard.js`:**
```js
// src/systems/TriangleHazard.js
// Pure (no Phaser). Geometry for the three-sisters lava triangle. Edges are
// derived from the live sisters' positions: 3 → triangle, 2 → a single line,
// ≤1 → none (the hazard degrades as sisters die).

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t)); // clamp to the segment (not the infinite line)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// positions: array of {x,y}. Returns array of [A,B] segments.
export function hazardEdges(positions) {
  const p = positions;
  if (p.length >= 3) return [[p[0], p[1]], [p[1], p[2]], [p[2], p[0]]];
  if (p.length === 2) return [[p[0], p[1]]];
  return [];
}

export function distanceToNearestEdge(px, py, edges) {
  let best = Infinity;
  for (const [a, b] of edges) best = Math.min(best, distToSegment(px, py, a.x, a.y, b.x, b.y));
  return best;
}

export function onAnyEdge(px, py, edges, width) {
  return edges.length > 0 && distanceToNearestEdge(px, py, edges) <= width;
}

function sign(px, py, a, b) { return (px - b.x) * (a.y - b.y) - (a.x - b.x) * (py - b.y); }

export function pointInTriangle(px, py, a, b, c) {
  const d1 = sign(px, py, a, b), d2 = sign(px, py, b, c), d3 = sign(px, py, c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}
```

- [ ] **Step 4: Run `node --test tests/TriangleHazard.test.js` → PASS. Then `node --test` → todo pasa.**

- [ ] **Step 5: Commit**
```bash
git add src/systems/TriangleHazard.js tests/TriangleHazard.test.js
git commit -m "feat: TriangleHazard — geometría del triángulo de lava (puro)"
```

---

## Task 2: Multi-jefe — `this.bosses`, spawnBosses, barras, levelBuilder

**Files:**
- Modify: `src/data/levelBuilder.js`, `src/scenes/GameScene.js`

Contexto: hoy `this.boss` es un único jefe (líneas 52/115/178/457). Generalizamos a una lista `this.bosses` (para barras y el trío), conservando `this.boss` para el camino de `BossMechanics` (temple bosses de otros mundos).

- [ ] **Step 1:** `levelBuilder` pasa `bosses`/`triangle`. En `src/data/levelBuilder.js`, en `buildPhase`, cambiar la rama `levelBoss`:
```js
  if (type === 'levelBoss') return { type: 'levelBoss', enemyDef: spec.levelBoss, bosses: spec.bosses, triangle: spec.triangle, minions: spec.minions };
```

- [ ] **Step 2:** Inicializar la lista en `create()`. Junto a `this.boss = null;`, añadir:
```js
    this.bosses = [];
```

- [ ] **Step 3:** `spawnBoss` también registra en la lista. Reemplazar `spawnBoss`:
```js
  spawnBoss(def) {
    this.boss = new Boss(this, GAME_WIDTH / 2, -40, scaleEnemyDef(def, this.mult));
    this.enemies.add(this.boss);
    this.bosses = [this.boss];
    return this.boss;
  }
```

- [ ] **Step 4:** Añadir `spawnBosses` (multi-jefe, repartidos horizontalmente). Colocar junto a `spawnBoss`:
```js
  spawnBosses(defs) {
    this.boss = null; // multi-boss encounters don't use the single BossMechanics path
    this.bosses = defs.map((def, i) => {
      const x = GAME_WIDTH * (i + 1) / (defs.length + 1);
      const b = new Boss(this, x, -40, scaleEnemyDef(def, this.mult));
      this.enemies.add(b);
      return b;
    });
    return this.bosses;
  }
```

- [ ] **Step 5:** `beginPhase` usa multi-jefe cuando la fase trae `bosses`. Reemplazar la rama `miniboss`/`levelBoss`:
```js
    } else if (phase.type === 'miniboss' || phase.type === 'levelBoss') {
      this.spawnMinions(phase.minions);
      if (phase.bosses && phase.bosses.length) {
        this.spawnBosses(phase.bosses);
        if (phase.triangle) this.startTriangle(); // Task 5 defines startTriangle
      } else {
        this.spawnBoss(phase.enemyDef);
      }
    } else if (phase.type === 'templeBoss') {
```
(`startTriangle` se define en la Task 5; si ejecutas en orden, añade un stub `startTriangle() {}` ahora y complétalo en la Task 5.)

- [ ] **Step 6:** Al morir un jefe, sacarlo de la lista. En `hitEnemy`, reemplazar la línea `if (enemy === this.boss) this.boss = null;` por:
```js
    if (enemy === this.boss) this.boss = null;
    if (this.bosses.length) this.bosses = this.bosses.filter((b) => b !== enemy);
```

- [ ] **Step 7:** Dibujar una barra por jefe vivo. En `update`, reemplazar `if (this.boss && this.boss.active) this.boss.drawBar();` por:
```js
    for (const b of this.bosses) if (b && b.active) b.drawBar();
```

- [ ] **Step 8:** Añadir el stub temporal de `startTriangle` (se completa en la Task 5). Junto a los otros métodos:
```js
  startTriangle() { /* completed in Task 5 */ }
```

- [ ] **Step 9:** Checks. `node --check src/data/levelBuilder.js src/scenes/GameScene.js` → limpio. `node --test` → todo pasa (incl. `tests/levelBuilder.test.js` y `tests/regions.test.js`; el cambio en `buildPhase` solo AÑADE campos `bosses`/`triangle` que son `undefined` para niveles existentes — si algún test compara la forma exacta del objeto de fase, actualízalo para incluir los campos nuevos y explica).

- [ ] **Step 10: Commit**
```bash
git add src/data/levelBuilder.js src/scenes/GameScene.js
git commit -m "feat: soporte multi-jefe (this.bosses, spawnBosses, barras múltiples)"
```

---

## Task 3: Enter-hooks de fase (`spawnLavaFloor`)

**Files:**
- Modify: `src/objects/Enemy.js`, `src/scenes/GameScene.js`

Contexto: `stepBoss` ya devuelve `enter` (hooks una vez al entrar a una fase). `Enemy.think` los descarta. Hay que emitirlos y que `GameScene` los ejecute (Ignatius usa `spawnLavaFloor`).

- [ ] **Step 1:** En `src/objects/Enemy.js` `think`, en la rama de jefe (`if (this.def.phases)`), capturar los enters. Cambiar el bloque del jefe a:
```js
    const enters = [];
    if (this.def.phases) {
      const out = stepBoss(this.def, this.brainState.boss, this.hp / this.maxHp, delta);
      movementDef = { movement: out.movement };
      speedMul = out.speedMul;
      if (out.telegraph) telegraphs.push(out.telegraph);
      if (out.fire) fires.push({ ...out.fire, type: out.fire.do });
      if (out.enter && out.enter.length) for (const h of out.enter) enters.push(h);
    } else {
```
y declarar `const enters = [];` ANTES del `if` (junto a `const fires`/`const telegraphs`). El `return` final cambia a:
```js
    return { velocity, fires, telegraphs, enters };
```
(Las rutas de early-return —inactivo/frozen— deben devolver `enters: []` también. Añade `enters: []` a esos dos returns.)

- [ ] **Step 2:** Aplicar `enrageMul` a la velocidad del jefe (lo usa la Task 4). En el cálculo de `ctx.speed`, cambiar:
```js
      speed: this.def.speed * slow * speedMul,
```
por:
```js
      speed: this.def.speed * slow * speedMul * (this.enrageMul ?? 1),
```

- [ ] **Step 3:** En `GameScene`, consumir los enters en el loop de enemigos. Tras `for (const att of intent.fires) this.executeAttack(e, att);`, añadir:
```js
      if (intent.enters) for (const h of intent.enters) this.runBossHook(e, h);
```

- [ ] **Step 4:** Añadir `runBossHook` (maneja `spawnLavaFloor`: varios carriles de lava en la arena). Junto a `spawnZone`:
```js
  runBossHook(boss, hook) {
    if (hook === 'spawnLavaFloor') {
      const lanes = 4;
      for (let i = 0; i < lanes; i++) {
        const x = GAME_WIDTH * (i + 0.5) / lanes;
        this.spawnZone({ x, y: GAME_HEIGHT / 2, radius: 46, duration: 6000, casterDps: 20, color: COLORS.fireball });
      }
    }
  }
```

- [ ] **Step 5:** Checks. `node --check src/objects/Enemy.js src/scenes/GameScene.js` → limpio. `node --test` → todo pasa (la rama no-jefe sigue igual; `enters` es aditivo).

- [ ] **Step 6: Commit**
```bash
git add src/objects/Enemy.js src/scenes/GameScene.js
git commit -m "feat: enter-hooks de fase de jefe (spawnLavaFloor) + enrageMul en velocidad"
```

---

## Task 4: Enfurecer al morir una hermana

**Files:**
- Modify: `src/scenes/GameScene.js`

Contexto: cuando muere una hermana del trío, las que quedan enfurecen (más rápido). `Enemy.think` ya multiplica la velocidad por `this.enrageMul ?? 1` (Task 3). Aquí, al morir un jefe que es parte de un grupo de ≥2, subimos `enrageMul` de las sobrevivientes.

- [ ] **Step 1:** En `hitEnemy`, donde se filtra `this.bosses` al morir un jefe (Task 2 Step 6), añadir el enrage. Reemplazar ese bloque por:
```js
    if (enemy === this.boss) this.boss = null;
    if (this.bosses.length) {
      const wasGroup = this.bosses.length >= 2;
      this.bosses = this.bosses.filter((b) => b !== enemy);
      if (wasGroup) for (const b of this.bosses) b.enrageMul = (b.enrageMul || 1) * 1.25; // "¡Hermana!"
    }
```

- [ ] **Step 2:** Checks. `node --check src/scenes/GameScene.js` → limpio. `node --test` → todo pasa.

- [ ] **Step 3: Commit**
```bash
git add src/scenes/GameScene.js
git commit -m "feat: las hermanas enfurecen al morir una del trío"
```

---

## Task 5: El controlador del triángulo de lava

**Files:**
- Modify: `src/scenes/GameScene.js`

Contexto: durante la pelea del trío (cuando `startTriangle()` se llamó), un ciclo **cooldown → telegrafía → activo → fade** dibuja el perímetro entre las hermanas vivas y daña/quema al jugador que cruza un borde. Usa `TriangleHazard` (puro) sobre las posiciones de `this.bosses` vivos. Pulsante (se reforma cada ciclo según las posiciones nuevas); se degrada solo (3→línea→nada) porque `hazardEdges` depende de cuántas hermanas viven.

- [ ] **Step 1:** Import de TriangleHazard al inicio de `src/scenes/GameScene.js` (junto a los otros `../systems/`):
```js
import { hazardEdges, onAnyEdge } from '../systems/TriangleHazard.js';
```

- [ ] **Step 2:** Crear el graphics + estado en `create()` (junto a `this.telegraphGfx`):
```js
    this.triangleGfx = this.add.graphics().setDepth(6);
    this.triangle = null; // { mode, t } when a trio fight is active
```

- [ ] **Step 3:** Reemplazar el stub `startTriangle()` por:
```js
  startTriangle() {
    this.triangle = { mode: 'cooldown', t: 2500 };
  }
```

- [ ] **Step 4:** Añadir el update del triángulo. Constantes de tiempo + lógica:
```js
  updateTriangle(delta) {
    if (!this.triangle) return;
    const live = this.bosses.filter((b) => b && b.active);
    this.triangleGfx.clear();
    if (live.length < 2) { return; } // degraded to nothing; sisters' own kits remain
    const edges = hazardEdges(live.map((b) => ({ x: b.x, y: b.y })));

    const t = this.triangle;
    t.t -= delta;
    if (t.mode === 'cooldown') {
      if (t.t <= 0) { t.mode = 'telegraph'; t.t = 1200; }
    } else if (t.mode === 'telegraph') {
      this.drawTriangleEdges(edges, 0xffffff, 0.5, 2);   // warning outline
      if (t.t <= 0) { t.mode = 'active'; t.t = 2600; }
    } else if (t.mode === 'active') {
      this.drawTriangleEdges(edges, 0xff5722, 0.95, 6);  // lava
      if (onAnyEdge(this.caster.x, this.caster.y, edges, 14)) {
        this.damageCaster(28 * (delta / 1000));
        this.applyCasterBurn(8, 1200); // crossing the lava self-inflicts burn
      }
      if (t.t <= 0) { t.mode = 'cooldown'; t.t = 2500; }
    }
  }

  drawTriangleEdges(edges, color, alpha, width) {
    const g = this.triangleGfx;
    g.lineStyle(width, color, alpha);
    for (const [a, b] of edges) { g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.strokePath(); }
  }
```

- [ ] **Step 5:** Llamar `updateTriangle` en `update` (junto a `updateZones`/`updateAuras`):
```js
    this.updateTriangle(delta);
```

- [ ] **Step 6:** Limpiar el triángulo al terminar la fase. En `checkPhaseCleared`, en la rama de jefes (donde se hace `this.bossMechanics = null;` al limpiar), añadir junto a esa línea:
```js
        this.triangle = null;
        if (this.triangleGfx) this.triangleGfx.clear();
```

- [ ] **Step 7:** Checks. `node --check src/scenes/GameScene.js` → limpio. `node --test` → todo pasa (esto es Phaser, no node-testeado, pero no debe romper suites; la geometría pura ya está cubierta por `TriangleHazard.test.js`).

- [ ] **Step 8: Commit**
```bash
git add src/scenes/GameScene.js
git commit -m "feat: controlador del triángulo de lava (telegrafiado, pulsante, daño al cruzar)"
```

---

## Task 6: Datos — trío atenuado + Ignatius

**Files:**
- Modify: `src/data/bosses/fire.js`

- [ ] **Step 1:** Añadir al final de `src/data/bosses/fire.js`:
```js
// Trio variant: the three sisters fought together (level-6 levelBoss). Attenuated
// (less hp each, single phase) so three patterns at once stay readable. The lava
// triangle forms between them (handled by GameScene + TriangleHazard).
const trio = (def, hp) => ({ ...def, hp, phases: [def.phases[0]] });
export const SISTERS_TRIO = [trio(PYRA, 280), trio(VESTA, 320), trio(FAVILLA, 300)];

// Ignatius — el padre, mago de templo (nv7). Setpiece de 3 fases. Reusa el
// secuenciador; la fase 2/3 rompen el suelo en lava (enter: spawnLavaFloor).
// (El beam rotatorio de la fase 3 se aproxima con nova+lobAoe densos.)
export const IGNATIUS = {
  key: 'ignatius', tex: TEX.boss, color: COLORS.fireball, hp: 1300, speed: 55, damage: 22, radius: 30,
  elite: true, movement: { type: 'kite', range: 220 },
  modifiers: [{ type: 'onHitBurn', dps: 12, ms: 2500 }],
  phases: [
    { from: 1.0, sequence: [ // Duelo
      { do: 'shootSpread', count: 6, arc: 90, speed: 240, damage: 14, telegraph: 320, dur: 700 },
      { do: 'shootHoming', speed: 130, damage: 12, telegraph: 350, dur: 900 },
      { do: 'wait', dur: 400 },
    ] },
    { from: 0.66, enter: ['spawnLavaFloor'], sequence: [ // La Pira
      { do: 'nova', count: 12, speed: 220, damage: 13, telegraph: 350, dur: 700 },
      { do: 'lobAoe', radius: 70, dps: 26, duration: 3500, telegraph: 450, dur: 800 },
      { do: 'shootSpread', count: 8, arc: 120, speed: 250, damage: 14, telegraph: 300, dur: 700 },
    ] },
    { from: 0.33, speedMul: 1.35, enter: ['spawnLavaFloor'], sequence: [ // Frenesí
      { do: 'nova', count: 16, speed: 240, damage: 14, telegraph: 280, dur: 600 },
      { do: 'shootHoming', speed: 150, damage: 13, telegraph: 250, dur: 600 },
      { do: 'lobAoe', radius: 80, dps: 30, duration: 4000, telegraph: 380, dur: 700 },
    ] },
  ],
};
```

- [ ] **Step 2:** Checks. `node --check src/data/bosses/fire.js` → limpio. Sanity (estructura + spawnTypes + que el trío tenga una sola fase + Ignatius tres):
```bash
node -e "Promise.all([import('./src/data/bosses/fire.js'), import('./src/data/enemies/index.js')]).then(([b, e]) => { const reg = e.ENEMY_TYPES; if (b.SISTERS_TRIO.length !== 3) throw new Error('trio len'); for (const s of b.SISTERS_TRIO) if (s.phases.length !== 1) throw new Error('trio should be single-phase'); if (b.IGNATIUS.phases.length !== 3) throw new Error('ignatius phases'); const dos = []; for (const ph of b.IGNATIUS.phases) for (const st of ph.sequence) dos.push(st.do); const handled = new Set(['wait','shootSpread','shootHoming','nova','lobAoe','summon','shootStraight']); for (const d of dos) if (!handled.has(d)) throw new Error('unhandled do '+d); console.log('bosses ok'); })"
```
Expected: `bosses ok`.

- [ ] **Step 3: Commit**
```bash
git add src/data/bosses/fire.js
git commit -m "feat: datos del trío atenuado + Ignatius (3 fases)"
```

---

## Task 7: Cablear nv6 levelBoss (trío + triángulo) y nv7 templeBoss (Ignatius)

**Files:**
- Modify: `src/data/regions.js`

Contexto: hoy el nv6 de Fuego usa `levelBoss: lb(650, 24)` genérico y el nv7 usa `templeBoss: tb(950, 26, MECHANICS.fire)`. Para Fuego, el nv6 levelBoss = el trío (con triángulo) y el nv7 templeBoss = Ignatius (que tiene `phases`, así que NO usa `BossMechanics`).

- [ ] **Step 1:** Importar en `src/data/regions.js` (junto al import de las hermanas):
```js
import { PYRA, VESTA, FAVILLA, SISTERS_TRIO, IGNATIUS } from './bosses/fire.js';
```

- [ ] **Step 2:** Añadir dos params opcionales a `makeBranch`. Cambiar la firma a:
`function makeBranch({ id, element, name, grantsSkill, intro, mageName, mageLines, basic = basicWaves, inter = interWaves, minibosses = [], levelBosses = null, templeBoss = null })`

- [ ] **Step 3:** Usar el override del levelBoss del nivel 6. En el `makeLevel` del nivel `${id}_6` (kind `pretemple`), hoy el spec incluye `levelBoss: lb(650, 24)`. Cambiarlo para que, si `levelBosses` está presente, use el trío + triángulo en vez del `lb` genérico:
  - Si `levelBosses` existe: en el spec del nivel 6, **reemplazar** `levelBoss: lb(380? ...)` — concretamente la clave `levelBoss: lb(650, 24)` — por `bosses: levelBosses, triangle: true` (quita la clave `levelBoss`).
  - Si no: dejar `levelBoss: lb(650, 24)` como está.

  Implementación recomendada (lee el objeto spec actual del nivel 6 y aplica esto): construir el spec del nivel 6 con un helper condicional, p. ej.:
  ```js
  const lvl6Boss = levelBosses ? { bosses: levelBosses, triangle: true } : { levelBoss: lb(650, 24) };
  ```
  y en el `makeLevel` del nivel 6 expandir `...lvl6Boss` dentro del objeto spec (junto a `waves`, `miniboss`, etc.), quitando la clave `levelBoss:` literal que estaba ahí.

- [ ] **Step 4:** Usar el override del templeBoss del nivel 7. En el `makeLevel` del nivel `${id}_7` (kind `temple`), hoy el spec usa `templeBoss: tb(950, 26, MECHANICS[element])`. Cambiarlo a:
  ```js
  templeBoss: templeBoss || tb(950, 26, MECHANICS[element]),
  ```
  (Si `templeBoss` se pasa —Ignatius—, se usa; tiene `phases` y `beginPhase`/`attachBossMechanics` NO le adjunta mecánicas porque su `mechanics` es `undefined`. Si no, los otros mundos siguen con `tb(...)` + `MECHANICS`.)

- [ ] **Step 5:** Pasar el trío e Ignatius SOLO a Fuego. En la llamada `fire: makeBranch({ ... })`, añadir:
```js
    levelBosses: SISTERS_TRIO,
    templeBoss: IGNATIUS,
```
(junto a `minibosses: [PYRA, VESTA, FAVILLA], basic: fireWaves, inter: fireInterWaves`). NO tocar water/air/earth.

- [ ] **Step 6:** Verificar que `attachBossMechanics` no rompe con Ignatius. En `beginPhase`, la rama `templeBoss` hace `this.attachBossMechanics(phase.mechanics)`. Para Fuego, `phase.mechanics` viene de `spec.templeBoss?.mechanics` (en `levelBuilder` buildPhase templeBoss). Ignatius no tiene `.mechanics` → `attachBossMechanics(undefined)` → su guard `if (!mechanics || !this.boss) return;` lo hace no-op. ✓ Confirmar leyendo `buildPhase` templeBoss y `attachBossMechanics`; no se requiere cambio, solo verificar.

- [ ] **Step 7:** Checks.
- `node --check src/data/regions.js` → limpio.
- `node --test` → todo pasa, INCLUYENDO `tests/regions.test.js`. Si ese test afirma algo del levelBoss/templeBoss de Fuego (p. ej. que el nv6 tiene un `levelBoss` con `elite`, o el nv7 un `templeBoss` con `mechanics`), actualiza la expectativa: el nv6 de Fuego ahora tiene `bosses` (no `levelBoss`), y el nv7 de Fuego tiene un `templeBoss` sin `mechanics`. Para los OTROS mundos no cambia nada. Lee el test y ajusta solo lo que de verdad cambió para Fuego, explicando; no debilites aserciones de los otros mundos.
- Sanity:
```bash
node -e "import('./src/data/regions.js').then(m => { const f = m.REGIONS.fire; const l6 = f.levels[5].phases.find(p => p.type==='levelBoss'); if (!l6.bosses || l6.bosses.length!==3 || !l6.triangle) throw new Error('nv6 trio/triangle missing'); const l7 = f.levels[6].phases.find(p => p.type==='templeBoss'); if (l7.enemyDef.key!=='ignatius') throw new Error('nv7 not ignatius'); if (l7.mechanics) throw new Error('ignatius should have no BossMechanics'); const w6 = m.REGIONS.water.levels[5].phases.find(p=>p.type==='levelBoss'); if (!w6.enemyDef || w6.bosses) throw new Error('water nv6 changed'); console.log('ok'); })"
```
Expected: `ok`.

- [ ] **Step 8: Commit**
```bash
git add src/data/regions.js
git commit -m "feat: Fuego nv6 levelBoss = trío + triángulo, nv7 templeBoss = Ignatius"
```

---

## Self-Review

**1. Cobertura (vs spec §2 multi-jefe / §4 triángulo + las tres juntas + Ignatius):**
- Triángulo de lava puro (bordes 3→línea→nada, distancia, dentro) → Task 1. ✓
- Multi-jefe en una fase (`bosses:[...]`, spawn, barras, limpieza por `countActive===0`) → Task 2. ✓
- Triángulo telegrafiado + pulsante + daño/quema al cruzar + se degrada → Task 5 (geometría Task 1). ✓
- Enfurecer al morir una hermana → Tasks 3 (enrageMul en speed) + 4 (subida al morir). ✓
- Hooks `enter` de fase (`spawnLavaFloor`) → Task 3. ✓
- Ignatius (3 fases, suelo de lava) → Tasks 6 + 7. ✓
- Coexistencia con `BossMechanics` (otros mundos intactos; Ignatius sin mechanics) → Tasks 2/7. ✓
- Simplificaciones documentadas (no huecos): beam rotatorio → nova/lobAoe densos; triángulo sin IA de reposicionamiento; sin tótems-invuln en el trío. Eliminación de `BossMechanics` → futura (tras convertir todos los mundos).

**2. Placeholder scan:** sin TBD/TODO; cada step con código completo; los dos ajustes condicionales (`startTriangle` stub en Task 2 completado en Task 5; tests de regions/levelBuilder) vienen con instrucción precisa. ✓

**3. Consistencia de tipos:** `hazardEdges`/`onAnyEdge`/`distanceToNearestEdge`/`pointInTriangle` (Task 1) se usan con esas firmas en `updateTriangle` (Task 5). `this.bosses` (Task 2) lo consumen Tasks 4 (enrage) y 5 (triángulo). `think` devuelve `{velocity, fires, telegraphs, enters}` (Task 3) y el loop de GameScene consume `enters` (Task 3). `enrageMul` lo escribe Task 4 y lo lee `think` (Task 3). El levelBoss con `bosses`/`triangle` (Task 2 levelBuilder) lo produce `regions` (Task 7) y lo consume `beginPhase` (Task 2). Los `do` de Ignatius (`shootSpread`/`shootHoming`/`nova`/`lobAoe`/`wait`) y de los hooks (`spawnLavaFloor`) están todos manejados (executeAttack del Plan 2 + runBossHook de Task 3). El trío reusa los defs solo del Plan 3 (atenuados). ✓

---

## Notas finales (post-Fuego)

- **Pulir el triángulo:** IA que reposicione a las hermanas a una formación equilátera de tamaño justo antes de canalizar; detección de "atrapada dentro" (`pointInTriangle`, ya disponible) para un beat extra.
- **Beam real** para la fase 3 de Ignatius (línea rotatoria telegrafiada) como tipo de ataque nuevo.
- **Otros mundos:** Agua/Aire/Tierra/Castillo, cada uno su spec, reusando motor + framework de jefes. Al terminar el último, **eliminar `BossMechanics`** y migrar sus temple bosses al secuenciador.
- **Arte:** sprites dedicados para Fuego (hoy formas geométricas + tinte).
