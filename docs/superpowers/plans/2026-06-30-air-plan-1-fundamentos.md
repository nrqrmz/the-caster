# Air Difficulty Pass — Plan 1: Fundamentos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir las mecánicas y datos base que todos los planes posteriores de Air consumen: el rework del drain (`drainBite`), el efecto probabilístico `slowChance`, el tether de rayo con color, el catálogo de proyectiles de los casters, y el barrido de render.

**Architecture:** La lógica testeable vive pura en `src/systems/CombatSystem.js` (gate de cooldown del mordisco) y en datos declarativos (`src/data/projectiles.js`, `src/data/enemies/air.js`); el cableado Phaser (bucle de proximidad, VFX) vive en `src/scenes/GameScene.js`. Se respeta el split pure/Phaser del repo: los helpers puros y los datos llevan pins de `node --test`; el cableado de escena se verifica corriendo el juego.

**Tech Stack:** Phaser 3 (CDN, ES modules nativos, sin bundler), `node:test` + `node:assert/strict`.

## Global Constraints

- **Sin build step, sin bundler.** ES modules nativos + Phaser desde CDN. (spec + CLAUDE.md)
- **`src/systems/` y `src/data/` son Phaser-free** — deben correr bajo `node --test`. El cableado Phaser va en `src/scenes/`. (CLAUDE.md)
- **Claves de textura/color centralizadas en `src/config.js`** (`TEX`, `COLORS`) — nunca hard-codear una clave o hex en escenas/objetos. (CLAUDE.md)
- **El rojo (`COLORS` sangre) queda reservado al tether del drain.** Los proyectiles usan otros colores. (spec §5, §6)
- **Tests:** `node --test` (alias `npm test`). Mantener la suite verde en cada commit.

---

### Task 1: Gate puro del mordisco de drain (`tryDrainBite`)

El drain deja de ser continuo: cada vampiro muerde una vez y entra en cooldown por instancia. El gate es idéntico en forma a `tryMeleeContact` pero con su propio campo de timestamp, para que ambos cooldowns coexistan.

**Files:**
- Modify: `src/systems/CombatSystem.js` (añadir export tras `tryMeleeContact`, ~línea 17)
- Test: `tests/CombatSystem.test.js`

**Interfaces:**
- Produces: `tryDrainBite(state, now, cooldownMs) -> boolean` — devuelve `true` y arma el cooldown (`state.drainReadyAt = now + cooldownMs`) si el mordisco está permitido; `false` mientras sigue en cooldown. PURO (solo muta `state.drainReadyAt`).

- [ ] **Step 1: Escribir el test que falla**

Añadir a `tests/CombatSystem.test.js`:

```js
import { tryDrainBite } from '../src/systems/CombatSystem.js';

test('tryDrainBite: primer mordisco pasa, luego bloquea hasta cumplir cooldown', () => {
  const e = {};
  assert.equal(tryDrainBite(e, 1000, 4000), true);   // primer mordisco
  assert.equal(tryDrainBite(e, 2000, 4000), false);  // dentro del cooldown
  assert.equal(tryDrainBite(e, 4999, 4000), false);  // justo antes de cumplir
  assert.equal(tryDrainBite(e, 5000, 4000), true);   // cooldown cumplido -> muerde
  assert.equal(tryDrainBite(e, 5001, 4000), false);  // rearmado
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/CombatSystem.test.js`
Expected: FAIL con `tryDrainBite is not a function` (o import undefined).

- [ ] **Step 3: Implementar el helper puro**

En `src/systems/CombatSystem.js`, justo después de `tryMeleeContact` (línea 17):

```js
// Mordisco de drain a distancia (Blood Omen). Gate de cooldown por instancia,
// independiente de tryMeleeContact para que ambos coexistan. Devuelve true y arma
// el cooldown si el mordisco está permitido. PURE (solo muta state.drainReadyAt).
export function tryDrainBite(state, now, cooldownMs) {
  if ((state.drainReadyAt ?? 0) > now) return false;
  state.drainReadyAt = now + cooldownMs;
  return true;
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test tests/CombatSystem.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/CombatSystem.js tests/CombatSystem.test.js
git commit -m "feat(air): tryDrainBite — gate puro del mordisco de drain por instancia"
```

---

### Task 2: `drawZap` acepta color (tether rojo + rayos verticales)

Hoy `drawZap(points)` dibuja siempre con `COLORS.lightning`. Se generaliza para reusarlo en el tether rojo del drain y (planes futuros) los rayos verticales de la Bruja.

**Files:**
- Modify: `src/scenes/GameScene.js:1023-1031` (método `drawZap`)

**Interfaces:**
- Produces: `drawZap(points, color = COLORS.lightning) -> void` — dibuja una polilínea que se desvanece en 180ms, en el color dado. Retrocompatible (color por defecto = el actual).

- [ ] **Step 1: Modificar la firma para aceptar color**

Reemplazar el método `drawZap` (GameScene:1023):

```js
  drawZap(points, color = COLORS.lightning) {
    const g = this.add.graphics().setDepth(900);
    g.lineStyle(3, color, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.strokePath();
    this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }
```

- [ ] **Step 2: Verificar que la suite sigue verde (sin regresión del Lightning)**

Run: `node --test`
Expected: PASS (no hay test de Phaser; esto confirma que nada más se rompió).

- [ ] **Step 3: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "refactor(air): drawZap acepta color (default lightning) para el tether de drain"
```

---

### Task 3: Color de sangre para el tether del drain

Un color dedicado en `config.js` para el rayo rojo del sifón (invariante: el rojo es exclusivo del drain).

**Files:**
- Modify: `src/config.js` (bloque `COLORS`)

**Interfaces:**
- Produces: `COLORS.bloodDrain` (hex rojo sangre) y `COLORS.bloodMagic` (violeta, para los dardos de sangre de Caballero/Galahad — consumido en planes 3/6) y `COLORS.plasmaBolt` (azul-blanco, espíritu) y `COLORS.stoneSpark` (violeta-piedra, centinela).

- [ ] **Step 1: Añadir los colores**

En `src/config.js`, dentro del objeto `COLORS` (junto a la paleta de Air, ~línea 63):

```js
  bloodDrain: 0xd50000,   // rojo sangre — EXCLUSIVO del tether del drainBite
  bloodMagic: 0x8e24aa,   // violeta — dardos de sangre (Caballero de Sangre, Galahad)
  plasmaBolt: 0xb3e5fc,   // azul-blanco — esfera de plasma del Espíritu de Tormenta
  stoneSpark: 0x7e57c2,   // violeta-piedra — chispa rastreadora del Centinela (petrify)
```

- [ ] **Step 2: Verificar suite verde**

Run: `node --test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/config.js
git commit -m "feat(air): colores para tether de drain (rojo) y proyectiles violeta/plasma"
```

---

### Task 4: Bucle de proximidad del drainBite en GameScene

El sifón a distancia: cada frame, para cada enemigo/jefe con modificador `drainBite`, si la princesa está dentro de `range` px y el cooldown está listo → mordisco (le roba `amount`, el enemigo se cura lo mismo), tether rojo + "−N" flotante.

**Files:**
- Modify: `src/scenes/GameScene.js` (nuevo método `updateDrainBite(delta)`; llamada en `update()` junto a `updateZones`/`updateTornado`, ~línea 1114)

**Interfaces:**
- Consumes: `tryDrainBite` (Task 1), `drawZap(points, color)` (Task 2), `COLORS.bloodDrain` (Task 3), `findModifier(def, 'drainBite')` (existente en EnemyBrain), `applyDrain(entity, heal)` (existente), `this.damageCaster(amount)` (existente), `this.floatText(x,y,str)` (existente).

- [ ] **Step 1: Importar `applyDrain` si no está ya, y añadir el método**

`applyDrain` ya se importa en GameScene (usado en el overlap de contacto). Añadir el método nuevo (por ejemplo tras `updateTornado`):

```js
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
```

- [ ] **Step 2: Llamar el método en el bucle `update`**

Junto a las otras llamadas de update (GameScene ~1114, donde está `this.updateZones(delta);`):

```js
    this.updateDrainBite(delta);
```

- [ ] **Step 3: Verificar suite verde**

Run: `node --test`
Expected: PASS (el cableado de escena no tiene test unitario; esto confirma que no rompimos imports/sintaxis).

- [ ] **Step 4: Verificación manual (correr el juego)**

Levantar `python3 -m http.server 8000`, abrir en viewport móvil, entrar a un nivel de Aire con un enemigo con drainBite (tras Task 5 de este plan estará asignado). Confirmar visualmente: al acercarse a un vampiro, aparece un rayo rojo hacia la princesa, un "−N" flotante, y la vida del enemigo sube. Al alejarse >range, deja de morder; el mordisco no se repite antes del cooldown.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.js
git commit -m "feat(air): bucle de proximidad drainBite — sifón a distancia + tether rojo"
```

---

### Task 5: Migrar los enemigos regulares de `drain` a `drainBite`

Reemplazar el modificador `drain` (heal por contacto) por `drainBite {amount, range, cooldown}` escalonado en el roster de Air.

**Files:**
- Modify: `src/data/enemies/air.js` (modificadores de `siervo_torre`, `duelista_nocturno`, `guardia_nocturno`, `vastago_vampirico`, `murcielago`, `vampiro_alado`)
- Test: `tests/AirRoster.test.js`

**Interfaces:**
- Produces: en el roster de Air, los vampiros llevan `{ type: 'drainBite', amount, range: 130, cooldown: 1800 }`. Pesados (`guardia_nocturno`, `vampiro_alado`, `vastago_vampirico`) `amount: 14`; enjambre (`murcielago`, `siervo_torre`) `amount: 6`. `duelista_nocturno` (dasher, enjambre-ligero) `amount: 6`.

- [ ] **Step 1: Escribir el test que falla (pin del escalonado)**

Añadir a `tests/AirRoster.test.js`:

```js
import { AIR_ENEMIES } from '../src/data/enemies/air.js';

function drainBiteOf(key) {
  return (AIR_ENEMIES[key].modifiers || []).find((m) => m.type === 'drainBite');
}

test('drainBite: pesados muerden 14, enjambre 6, todos @130px/1800ms', () => {
  for (const k of ['guardia_nocturno', 'vampiro_alado', 'vastago_vampirico']) {
    assert.equal(drainBiteOf(k).amount, 14, `${k} pesado`);
    assert.equal(drainBiteOf(k).range, 130);
    assert.equal(drainBiteOf(k).cooldown, 1800);
  }
  for (const k of ['murcielago', 'siervo_torre']) {
    assert.equal(drainBiteOf(k).amount, 6, `${k} enjambre`);
  }
});

test('drainBite: ya no queda el modificador legacy "drain" en Air', () => {
  for (const def of Object.values(AIR_ENEMIES)) {
    assert.equal((def.modifiers || []).some((m) => m.type === 'drain'), false, def.key);
  }
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/AirRoster.test.js`
Expected: FAIL (siguen existiendo modificadores `drain`).

- [ ] **Step 3: Reemplazar los modificadores en `air.js`**

En `src/data/enemies/air.js`, cambiar cada `{ type: 'drain', heal: N }` por el `drainBite` correspondiente:

```js
// siervo_torre (enjambre)
modifiers: [{ type: 'drainBite', amount: 6, range: 130, cooldown: 1800 }] },
// duelista_nocturno (dasher, enjambre-ligero)
modifiers: [{ type: 'drainBite', amount: 6, range: 130, cooldown: 1800 }] },
// guardia_nocturno (pesado) — conserva shielded
modifiers: [{ type: 'drainBite', amount: 14, range: 130, cooldown: 1800 }, { type: 'shielded', reduce: 0.4 }] },
// vastago_vampirico (pesado) — conserva reviveOnce
modifiers: [{ type: 'drainBite', amount: 14, range: 130, cooldown: 1800 }, { type: 'reviveOnce' }] },
// murcielago (enjambre)
modifiers: [{ type: 'drainBite', amount: 6, range: 130, cooldown: 1800 }] },
// vampiro_alado (pesado)
modifiers: [{ type: 'drainBite', amount: 14, range: 130, cooldown: 1800 }] },
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test tests/AirRoster.test.js`
Expected: PASS.

- [ ] **Step 5: Correr la suite completa**

Run: `node --test`
Expected: PASS (verifica que el overlap de contacto en GameScene, que buscaba `drain`, no rompe nada — el bucle nuevo maneja `drainBite`; el `drain` legacy ya no aplica a Air).

- [ ] **Step 6: Commit**

```bash
git add src/data/enemies/air.js tests/AirRoster.test.js
git commit -m "feat(air): migrar vampiros de drain-contacto a drainBite escalonado (14/6 @130/1800)"
```

---

### Task 6: Efecto probabilístico `slowChance` en disparos

Un disparo con `att.slowChance` aplica slow al impactar con probabilidad. Usado por el dardo de sangre del Caballero (Plan 3) y de Galahad (Plan 6).

**Files:**
- Modify: `src/scenes/GameScene.js` — `executeAttack` (~línea 865, copiar flags al shot) y el overlap `caster ↔ enemyShots` (~línea 165-178, aplicar el efecto)

**Interfaces:**
- Produces: si `att.slowChance` está presente, el shot lleva `shot.slowChance` y `shot.slowFactorChance`; al impactar a la princesa, con probabilidad `slowChance` aplica `applyCasterSlowFx(factor, ms)`.

- [ ] **Step 1: Copiar los flags al shot en `executeAttack`**

En el bloque donde se copian los riders de CC al shot (GameScene ~865, junto a `if (att.lift) ... if (att.stun) ...`):

```js
      if (att.slowChance) { shot.slowChance = att.slowChance; shot.slowChanceFactor = att.slowFactor ?? 0.6; shot.slowChanceMs = att.slowMs ?? 1200; }
```

- [ ] **Step 2: Aplicar el efecto en el overlap caster↔shot**

En el overlap `this.physics.add.overlap(this.caster, this.enemyShots.group, ...)` (GameScene ~165), junto a los otros efectos del shot:

```js
      if (shot.slowChance && Math.random() < shot.slowChance) this.applyCasterSlowFx(shot.slowChanceFactor, shot.slowChanceMs);
```

- [ ] **Step 3: Resetear el flag en el pool (evitar fugas entre disparos reciclados)**

En `src/systems/ProjectilePool.js`, dentro de `fire()` junto a los otros resets de efecto (`p.slowFactor = 0;` ~línea 35):

```js
    p.slowChance = 0;          // reset; solo los disparos con slowChance lo setean
```

- [ ] **Step 4: Verificar suite verde**

Run: `node --test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.js src/systems/ProjectilePool.js
git commit -m "feat(air): slowChance — slow probabilístico al impactar (dardos de sangre)"
```

---

### Task 7: Catálogo de proyectiles de los casters

Nuevos tipos en el catálogo declarativo para diferenciar los proyectiles. Reusan texturas existentes con tintes nuevos (los sprites bespoke se pulen en la tarea de arte, spec §10); el efecto es de datos.

**Files:**
- Modify: `src/data/projectiles.js` (objeto `PROJECTILES`)
- Test: `tests/projectiles.test.js`

**Interfaces:**
- Produces: `PROJECTILES.plasma` (slow), `PROJECTILES.bloodDart` (violeta, sin efecto — la CC va por rider), `PROJECTILES.stoneSpark` (violeta-piedra, sin efecto — el petrify va por `att.root`). Consumidos por `resolveProjectile(att, element)` vía `att.projectile`.

- [ ] **Step 1: Escribir el test que falla**

Añadir a `tests/projectiles.test.js`:

```js
import { PROJECTILES } from '../src/data/projectiles.js';

test('catálogo de Air: plasma (slow), bloodDart y stoneSpark (sin efecto de catálogo)', () => {
  assert.equal(PROJECTILES.plasma.effect.kind, 'slow');
  assert.equal(PROJECTILES.bloodDart.effect, null);
  assert.equal(PROJECTILES.stoneSpark.effect, null);
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/projectiles.test.js`
Expected: FAIL (tipos indefinidos).

- [ ] **Step 3: Añadir los tipos al catálogo**

En `src/data/projectiles.js`, dentro de `PROJECTILES` (reusa `TEX.iceShard`/`TEX.bolt` como base; el sprite bespoke es posterior):

```js
  // Esfera de plasma del Espíritu de Tormenta — entumece (slow eléctrico).
  plasma:     { tex: TEX.iceShard, tint: COLORS.plasmaBolt, effect: { kind: 'slow', factor: 0.6, ms: 1000 } },
  // Dardo de sangre (Caballero de Sangre, Galahad) — violeta; el slow va por att.slowChance.
  bloodDart:  { tex: TEX.bolt,     tint: COLORS.bloodMagic, effect: null },
  // Chispa rastreadora pétrea del Centinela — violeta-piedra; el petrify va por att.root.
  stoneSpark: { tex: TEX.bolt,     tint: COLORS.stoneSpark, effect: null },
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test tests/projectiles.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/projectiles.js tests/projectiles.test.js
git commit -m "feat(air): catálogo de proyectiles — plasma (slow), bloodDart, stoneSpark"
```

---

### Task 8: Asignar proyectiles + efectos a los casters de Air

Cablear cada caster a su proyectil/efecto según spec §5. Los que ya tienen su CC (heraldo=stun, hechicero=lift, gárgola=stun) no cambian; los que faltan: espíritu→plasma, centinela→stoneSpark+petrify(root), tronador→push.

**Files:**
- Modify: `src/data/enemies/air.js` (ataques de `espiritu_tormenta`, `centinela_piedra`, `tronador`)
- Test: `tests/AirRoster.test.js`

**Interfaces:**
- Consumes: `PROJECTILES.plasma`, `PROJECTILES.stoneSpark` (Task 7); el rider `att.root` (existente en engine) para el petrify.

- [ ] **Step 1: Escribir el test que falla**

Añadir a `tests/AirRoster.test.js`:

```js
test('proyectiles de casters: espíritu=plasma, centinela=stoneSpark+petrify(root 600ms), tronador=push', () => {
  assert.equal(AIR_ENEMIES.espiritu_tormenta.attacks[0].projectile, 'plasma');
  const cen = AIR_ENEMIES.centinela_piedra.attacks[0];
  assert.equal(cen.projectile, 'stoneSpark');
  assert.equal(cen.root, true);
  assert.equal(cen.rootMs, 600);
  assert.equal(AIR_ENEMIES.tronador.attacks[0].push, true);
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/AirRoster.test.js`
Expected: FAIL.

- [ ] **Step 3: Cablear los ataques en `air.js`**

```js
// espiritu_tormenta — esfera de plasma (slow)
attacks: [{ type: 'shootStraight', projectile: 'plasma', every: 1800, speed: 240 }] },
// centinela_piedra — chispa rastreadora que petrifica (root corto); sigue homing
attacks: [{ type: 'shootHoming', projectile: 'stoneSpark', root: true, rootMs: 600, every: 2600, speed: 120, telegraph: 350 }] },
// tronador — trueno en abanico que empuja
attacks: [{ type: 'shootSpread', count: 3, arc: 36, push: true, every: 1900, speed: 230 }] },
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test tests/AirRoster.test.js`
Expected: PASS.

- [ ] **Step 5: Verificación manual del petrify**

Correr el juego, nivel de Aire con centinela. Confirmar: la chispa violeta te clava en el sitio ~0.6s pero **puedes seguir disparando** (root, no stun). El tronador te empuja al impactar.

- [ ] **Step 6: Commit**

```bash
git add src/data/enemies/air.js tests/AirRoster.test.js
git commit -m "feat(air): asignar proyectiles a casters — plasma/stoneSpark+petrify/push"
```

---

### Task 9: Barrido de render (jerarquía de silueta)

Ajustar `radius` de 7 enemigos para crear escalones de silueta (spec §3). `radius` afecta hitbox + tamaño de sprite a la vez.

**Files:**
- Modify: `src/data/enemies/air.js` (campo `radius` de 7 enemigos)
- Test: `tests/AirRoster.test.js`

**Interfaces:**
- Produces: radios finales — gárgola 36, centinela 36, vampiro_alado 32, guardia_nocturno 32, torbellino 36, arpia 24, fuego_fatuo 24.

- [ ] **Step 1: Escribir el test que falla (pin de radios)**

Añadir a `tests/AirRoster.test.js`:

```js
test('barrido de render: radios de la jerarquía de silueta', () => {
  const R = { gargola_pararrayos: 36, centinela_piedra: 36, vampiro_alado: 32,
              guardia_nocturno: 32, torbellino_errante: 36, arpia: 24, fuego_fatuo: 24 };
  for (const [k, r] of Object.entries(R)) assert.equal(AIR_ENEMIES[k].radius, r, k);
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/AirRoster.test.js`
Expected: FAIL (radios viejos 18/19/20/16).

- [ ] **Step 3: Actualizar los `radius` en `air.js`**

Cambiar el campo `radius` de: `gargola_pararrayos` 18→36, `centinela_piedra` 18→36, `vampiro_alado` 19→32, `guardia_nocturno` 20→32, `torbellino_errante` 20→36, `arpia` 16→24, `fuego_fatuo` 16→24.

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test tests/AirRoster.test.js`
Expected: PASS.

- [ ] **Step 5: Correr la suite completa**

Run: `node --test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/enemies/air.js tests/AirRoster.test.js
git commit -m "feat(air): barrido de render — jerarquía de silueta (torretas/pesados 32-36)"
```

---

## Self-Review

**Spec coverage (Plan 1):** §3 barrido de render → Task 9 ✓. §5 proyectiles (plasma/bloodDart/stoneSpark, centinela petrify, tronador push, colores) → Tasks 3,7,8 ✓. §6 drain rework (drainBite escalonado, tether rojo, mordisco+cooldown, transferencia, Galahad formSeq) → Tasks 1,2,3,4,5 ✓. `slowChance` (§8) → Task 6 ✓. (Densidad §4, jefes §7, y las mecánicas de Blink/ritual/deathFeint quedan para los Planes 2–6.)

**Placeholder scan:** sin TBD/TODO; todo paso con código lleva el código real. ✓

**Type consistency:** `drainBite {amount, range, cooldown}` idéntico en Task 4 (datos), Task 5 (datos) y Task 4-scene (consumo `mod.amount/range/cooldown`). `drawZap(points, color)` firma consistente Task 2 → uso Task 4. `slowChance`/`slowChanceFactor`/`slowChanceMs` consistentes entre `executeAttack`, overlap y reset del pool (Task 6). Colores de config (Task 3) consumidos por Tasks 4 y 7. ✓

**Nota de dependencia:** el `bloodDart` violeta (Task 7) y `slowChance` (Task 6) se consumen realmente en el Plan 3 (Caballero) y Plan 6 (Galahad); aquí se dejan definidos y testeados como fundamentos.
