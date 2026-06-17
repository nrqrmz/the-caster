# SP-1 — Rebalance de stats y fixes localizados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Subir HP/daño de enemigos débiles, corregir movimientos `flee`, acelerar timers de ciclo de vida, y dos fixes de lógica (explosión con proyectil del elemento; fin de nivel al morir el boss).

**Architecture:** Casi todo son ediciones de datos en `src/data/`. Dos cambios de lógica localizados en `src/scenes/GameScene.js` (`onEnemyDeath`, `checkPhaseCleared`). Un test nuevo para la resolución de proyectil de explosión.

**Tech Stack:** Phaser 3 (CDN, ES modules nativos, sin bundler), `node:test` + `node:assert/strict` para lógica pura.

## Global Constraints

- **Sin build step / sin bundler / sin npm en runtime.** ES modules nativos + Phaser CDN.
- **Solo se unit-testean los módulos puros** (`systems/`, `data/`). Las defs de datos y la lógica de escena (Phaser) se verifican con `node --test` en verde (sin regresión) + playtest en viewport móvil portrait 480×854.
- **Claves de textura/color centralizadas** en `config.js` (`TEX`, `COLORS`) — nunca hardcodear un string de clave o un hex.
- Comando de tests: `node --test`. Un archivo: `node --test tests/<file>.test.js`.
- Mensajes de commit en español, estilo `tipo(scope): descripción` (convención del repo).

---

### Task 1: Stats y swaps de movimiento — enemigos de fuego

**Files:**
- Modify: `src/data/enemies/fire.js`

**Interfaces:**
- Consumes: nada (edición de datos).
- Produces: defs de fuego con nuevos stats/movimientos; consumidas por `GameScene`/`Enemy` sin cambios de firma.

- [ ] **Step 1: Aplicar los cambios de stats**

En `src/data/enemies/fire.js`, editar estos campos (solo los indicados; conservar el resto del recipe):

- `acolito_brasa`: `hp: 16 → 20`
- `iniciado_veloz`: `hp: 14 → 20`
- `caballero_brasa`: `hp: 70 → 100`
- `salamandra`: `hp: 18 → 20`
- `fenix_menor`: `hp: 50 → 250`
- `coloso_magma`: `hp: 110 → 500`; en `modifiers`, `shielded.reduce: 0.45 → 0.35`
- `totem_pira`: `hp: 45 → 250`; en `modifiers`, añadir `{ type: 'shielded', reduce: 0.25 }` (conservar el `auraDamage` existente)
- `brasa_errante`: `hp: 12 → 20`, `damage: 0 → 10`
- `imp_brasa`: `hp: 10 → 20`
- `avispa_brasa`: `hp: 8 → 20`

- [ ] **Step 2: Aplicar los swaps de movimiento**

- `encapuchado_pira`: `movement: { type: 'static' }` → `movement: { type: 'kite', range: 200 }`; `speed: 0 → 55`. Conservar su `attacks` (`lobAoe`).
- `sacerdote_llama`: `movement: { type: 'flee' }` → `movement: { type: 'kite', range: 200 }`. Conservar `attacks` (`summon`) y `modifiers` (`healAllies`).

- [ ] **Step 3: Verificar sin regresión**

Run: `node --test`
Expected: PASS (los tests existentes no dependen de estos valores; deben seguir en verde).

- [ ] **Step 4: Commit**

```bash
git add src/data/enemies/fire.js
git commit -m "balance(fire): sube HP/daño de enemigos débiles y arregla movimientos estáticos/flee"
```

---

### Task 2: Stats, swaps y ataque de náyade — enemigos de agua

**Files:**
- Modify: `src/data/enemies/water.js`

**Interfaces:**
- Consumes: el tipo de proyectil `'ice'` ya existe en `src/data/projectiles.js` (`PROJECTILES.ice`).
- Produces: defs de agua con nuevos stats/movimientos; la náyade gana un ataque de hielo.

- [ ] **Step 1: Aplicar los cambios de stats**

En `src/data/enemies/water.js`:

- `acolito_escarcha`: `hp: 18 → 20`
- `sacerdotisa_lago`: `hp: 20 → 100`, `damage: 0 → 10`
- `guardia_hielo`: `hp: 75 → 180`
- `corista_abismo`: `hp: 26 → 50`, `damage: 0 → 8`
- `renacuajo`: `hp: 12 → 20`
- `rana_saltarina`: `hp: 18 → 20`
- `serpiente_marina`: `hp: 28 → 40`
- `tiburon_joven`: `hp: 55 → 180`
- `burbuja_gelida`: `hp: 14 → 30`, `damage: 0 → 10`
- `totem_escarcha`: `hp: 50 → 250`; en `modifiers`, añadir `{ type: 'shielded', reduce: 0.25 }` (conservar el `auraDamage`)
- `huevo_sapo`: `hp: 8 → 20`
- `tortuga_acorazada`: `hp: 110 → 220`, `damage: 15 → 30`

- [ ] **Step 2: Medusa y cría — chase, daño de contacto y split a 60 HP**

- `medusa`: `hp: 38 → 80`, `damage: 0 → 10`, `movement: { type: 'erratic' }` → `movement: { type: 'chase' }`. En `modifiers`, **conservar** `auraDamage` (dps 14) y cambiar `splitsOnDeath.hpMul: 0.5 → 0.75` (80 × 0.75 = 60 HP por cría).
- `medusa_cria`: `hp: 19 → 60`, `damage: 0 → 10`, `movement: { type: 'erratic' }` → `movement: { type: 'chase' }`. (Esta def es documental: las crías reales las deriva `buildSplitChildren` de la madre; ver Task 6 nota.)

- [ ] **Step 3: Sacerdotisa y náyade — swaps de movimiento**

- `sacerdotisa_lago`: `movement: { type: 'flee' }` → `movement: { type: 'kite', range: 210 }`.
- `nayade`: `hp: 30 → 100`, `damage: 0 → 10`, `movement: { type: 'flee' }` → `movement: { type: 'erratic' }`. En `attacks`, subir la tasa de summon (`every: 3500 → 2400`) y **añadir** un ataque de hielo:

```js
  nayade: { key: 'nayade', tex: TEX.archer, color: COLORS.lakeGreen,
    hp: 100, speed: 70, damage: 10, radius: 17,
    movement: { type: 'erratic' },
    attacks: [
      { type: 'shootStraight', projectile: 'ice', every: 1800, speed: 230 },
      { type: 'summon', spawnType: 'renacuajo', count: 2, every: 2400 },
    ],
    modifiers: [{ type: 'healAllies', hps: 14, radius: 130 }] },
```

(Subir `healAllies.hps: 10 → 14`.)

- [ ] **Step 4: Verificar sin regresión**

Run: `node --test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/enemies/water.js
git commit -m "balance(water): sube HP/daño, flee→kite/erratic, medusa chase+contacto, ataque de hielo de la náyade"
```

---

### Task 3: Stats base — bosses de fuego

**Files:**
- Modify: `src/data/bosses/fire.js`

**Interfaces:**
- Produces: valores base de pyra/vesta/favilla. (La lógica del trío — movimientos/HP del trío, última hermana — es SP-3; aquí solo los valores base de las peleas individuales.)

- [ ] **Step 1: Aplicar stats + movimiento base de favilla**

En `src/data/bosses/fire.js`:

- `PYRA`: `hp: 420 → 500`, `damage: 14 → 20`.
- `VESTA`: `hp: 520 → 680`, `damage: 18 → 36`.
- `FAVILLA`: `hp: 480 → 500`, `movement: { type: 'flee' }` → `movement: { type: 'erratic' }`.

(No tocar `SISTERS_TRIO` ni `IGNATIUS` — van en SP-3.)

- [ ] **Step 2: Verificar sin regresión**

Run: `node --test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/data/bosses/fire.js
git commit -m "balance(fire-bosses): sube HP/daño de las hermanas y favilla flee→erratic"
```

---

### Task 4: Stats base — bosses de agua

**Files:**
- Modify: `src/data/bosses/water.js`

- [ ] **Step 1: Aplicar stats**

En `src/data/bosses/water.js`:

- `SOLDADO_HIELO`: `hp: 380 → 480`, `speed: 75 → 80`, `damage: 16 → 20`.
- `SAPO_DESOVADOR`: `damage: 14 → 20`, `speed: 60 → 80`.
- `TIBURON_ABISAL`: `damage: 18 → 30`.
- `DAMA_MAGA_FINAL`: `hp: 20 → 320`, `movement: { type: 'flee' }` → `movement: { type: 'kite', range: 240 }`.

(No añadir summons ni tocar el burrow — van en SP-2/SP-3.)

- [ ] **Step 2: Actualizar el test que asume maga_final con poca vida**

`tests/bosses.water.test.js` tiene un test "last Dama form is maga_final with low hp" que asserta `last.hp <= 20`. Con la nueva vida (320) el rol cambia: maga_final ya no es un remate frágil sino una pelea real. Actualizar esa aserción para reflejar el nuevo diseño (sigue verificando que la última forma es `dama_maga_final`, pero ya no exige hp ≤ 20):

```js
test('last Dama form is maga_final', () => {
  const last = DAMA_LAGO.forms[DAMA_LAGO.forms.length - 1];
  assert.equal(last.key, 'dama_maga_final');
  assert.equal(last.hp, 320);
});
```

(Conservar el resto de los tests del archivo. El test de "ascending hp across the first four forms" no se ve afectado: maga_final está excluido del slice 0..4.)

- [ ] **Step 3: Verificar sin regresión**

Run: `node --test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/data/bosses/water.js tests/bosses.water.test.js
git commit -m "balance(water-bosses): sube stats de soldado/sapo/abisal y dama_maga_final 320hp+kite"
```

---

### Task 5: Acelerar timers del ciclo de vida de los sapos

**Files:**
- Modify: `src/data/tuning.js:56-57`

- [ ] **Step 1: Editar las constantes**

En `src/data/tuning.js`:

```js
export const EGG_HATCH_MS = 2500;             // egg → tadpole (antes 3500)
export const TADPOLE_GROW_MS = 4000;          // tadpole → adult frog (antes 6000)
```

- [ ] **Step 2: Actualizar el test de Tuning que fija los valores antiguos**

`tests/Tuning.test.js` (líneas ~47-48) asserta `EGG_HATCH_MS === 3500` y `TADPOLE_GROW_MS === 6000`. Actualizar a los nuevos valores:

```js
  assert.equal(EGG_HATCH_MS, 2500);
  assert.equal(TADPOLE_GROW_MS, 4000);
```

(No tocar las aserciones de `BURROW_*` de ese archivo — SP-1 no cambia el burrow.)

- [ ] **Step 3: Verificar sin regresión**

Run: `node --test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/data/tuning.js tests/Tuning.test.js
git commit -m "balance(water): eclosión y maduración de sapos más rápidas (2.5s / 4s)"
```

---

### Task 6: `explodesOnDeath` dispara el proyectil del elemento

**Files:**
- Modify: `src/scenes/GameScene.js:374-387` (`onEnemyDeath`)

**Interfaces:**
- Consumes: `resolveProjectile(att, element)` y `PROJECTILES` de `src/data/projectiles.js`; `this.regionElement` (ya presente en GameScene, usado por `executeAttack`).
- Produces: la metralla de muerte usa `PROJECTILES[type].tex` y `.tint` en vez de `TEX.arrow` + tinte naranja fijo.

**NOTA:** `tests/projectiles.test.js` **ya existe** y ya cubre `resolveProjectile` para los casos relevantes (`{}, 'fire' → 'fire'`, `{}, 'water' → 'ice'`, `{projectile:'poison'} → 'poison'`). **No crear tests duplicados.** Esta tarea es solo el cambio de código en `onEnemyDeath` (lógica de escena, sin unit test propio); la resolución de proyectil ya está blindada por el test existente.

- [ ] **Step 1: Confirmar que el test existente cubre la resolución**

Run: `node --test tests/projectiles.test.js`
Expected: PASS. Confirma que `resolveProjectile` (que `onEnemyDeath` va a consumir) ya está testeado. No añadir tests nuevos.

- [ ] **Step 2: Cambiar `onEnemyDeath` para usar el proyectil del elemento**

Estado actual (`src/scenes/GameScene.js`):

```js
    const boom = findModifier(enemy.def, 'explodesOnDeath');
    if (boom) {
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
```

Reemplazar por (resolver el proyectil como hace `executeAttack` y aplicar su efecto):

```js
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
```

(`resolveProjectile` y `PROJECTILES` ya están importados en GameScene — línea 27. `TEX.arrow`/`COLORS.fireball` dejan de usarse aquí; no quitar el import de `TEX`/`COLORS` porque se usan en otras partes del archivo.)

- [ ] **Step 3: Verificar tests**

Run: `node --test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "fix(projectiles): la explosión al morir lanza el proyectil del elemento (fuego/hielo), no flechas"
```

---

### Task 7: Fin de nivel al morir el boss

**Files:**
- Modify: `src/scenes/GameScene.js:439-454` (`checkPhaseCleared`, rama de boss)

**Interfaces:**
- Consumes: `this.bosses` (array de bosses vivos, ya mantenido por `hitEnemy`/`onEnemyDeath`), `this.enemies` (grupo Arcade).
- Produces: la fase de boss se limpia cuando `this.bosses.length === 0`, despawneando los minions restantes.

- [ ] **Step 1: Cambiar la condición de limpieza de fase de boss**

Estado actual:

```js
    } else if (phase === 'miniboss' || phase === 'levelBoss' || phase === 'templeBoss') {
      if (this.enemies.countActive(true) === 0) {
        this.bossMechanics = null;
        ...
```

Cambiar la condición a "no quedan bosses vivos" y despawnear los minions sobrantes antes de proceder:

```js
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
```

(El bloque interno — `bossMechanics`/`triangle`/`whirlpool`/diálogo — es idéntico al actual; solo cambia la condición del `if` y se añade el despawn de `leftovers`.)

- [ ] **Step 2: Verificar tests**

Run: `node --test`
Expected: PASS (es lógica de escena; no hay unit test directo).

- [ ] **Step 3: Playtest**

Levantar `python3 -m http.server 8000`, abrir en viewport móvil portrait. Entrar a un nivel de miniboss/temple, dejar minions vivos, matar al boss. Verificar: el nivel se concluye de inmediato (diálogo/retorno a Branch), los minions desaparecen, no queda el jugador atrapado.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(game): el nivel concluye al morir el boss, sin esperar a los minions"
```

---

## Self-Review (SP-1)

- **Cobertura del spec:** §1 stats → Tasks 1-4; §2 swaps → Tasks 1-3; §3 timers → Task 5; §4 explodesOnDeath → Task 6; §5 fin-de-nivel → Task 7. ✔
- **Sin placeholders:** todos los cambios tienen valores y código exactos. ✔
- **Consistencia:** `resolveProjectile`/`PROJECTILES` usados en Task 6 ya existen e importados; `this.bosses`/`this.regionElement` ya existen en GameScene. ✔

## Notas

- Las defs de datos no llevan unit test en este proyecto (convención del repo); la verificación es `node --test` en verde + playtest. Solo Task 6 añade test puro (sobre `resolveProjectile`).
- `medusa_cria`: sus stats runtime los deriva `buildSplitChildren` de la madre (no de esta def). Con `medusa.hp=80` + `splitsOnDeath.hpMul=0.75` la cría sale a 60 HP/10 dmg/chase automáticamente. Unificar la ruta `spawnType` sería SP-2 y aquí no se toca.
