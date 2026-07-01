# Air Difficulty Pass — Plan 2: Oleadas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Subir la densidad de las oleadas de Air (nv1–6) a la banda intermedia Fire↔Water, con escalada creciente en cantidad y diversidad, y repartir los 6 enemigos infrautilizados a 2–3 niveles cada uno.

**Architecture:** Todo vive en `src/data/regions.js` (puro, data-driven): se reescriben `airWaves(tier)` (nv1–3 basic) y `airInterWaves(tier)` (nv4–6 intermediate). Un test suma los conteos concretos de `REGIONS.air` para pinnear las bandas y la redistribución.

**Tech Stack:** ES modules, `node:test`.

## Global Constraints

- **`src/data/regions.js` es Phaser-free.** (CLAUDE.md)
- `wave(spawnDelay, spawns)` y `ramp(base, tier)` ya existen en el archivo. `ramp`: tier1 ×1.0, tier2 ×1.4, tier3 ×1.8, tier4 ×2.2 (redondeado).
- Solo se usan tipos de enemigos existentes en `AIR_ENEMIES`. (spec §2)
- Mantener la suite `node --test` verde.

**Depende de:** ninguno (independiente del Plan 1; puede ejecutarse en paralelo).

---

### Task 1: Reescribir `airWaves` (nv1–3, básicos)

Bandas objetivo: nv1 ~22 (pico 8, 3 tipos) · nv2 ~30 (pico 11) · nv3 ~38 (pico 14). Repartir `espiritu_tormenta` (nv2,3) y `centinela_piedra` (nv3).

**Files:**
- Modify: `src/data/regions.js` (función `airWaves`, ~línea 105-128)
- Test: `tests/regions.test.js`

- [ ] **Step 1: Escribir el test que falla (bandas nv1–3)**

Añadir a `tests/regions.test.js`:

```js
import { REGIONS } from '../src/data/regions.js';

function levelWaveTotal(region, levelIndex) {
  const lvl = region.levels[levelIndex];
  const waves = lvl.phases.filter((p) => p.type === 'wave');
  return waves.map((w) => w.spawns.reduce((s, sp) => s + sp.count, 0));
}

test('Air nv1-3: totales de oleada en la banda intermedia (escalando)', () => {
  const air = REGIONS.air;
  const t = (i) => levelWaveTotal(air, i).reduce((a, b) => a + b, 0);
  assert.ok(t(0) >= 20 && t(0) <= 25, `nv1 = ${t(0)}`);   // ~22
  assert.ok(t(1) >= 28 && t(1) <= 33, `nv2 = ${t(1)}`);   // ~30
  assert.ok(t(2) >= 35 && t(2) <= 41, `nv3 = ${t(2)}`);   // ~38
  assert.ok(t(2) > t(1) && t(1) > t(0), 'escala creciente nv1<nv2<nv3');
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/regions.test.js`
Expected: FAIL (totales viejos 19/26/33).

- [ ] **Step 3: Reescribir `airWaves`**

Reemplazar la función `airWaves` en `regions.js`:

```js
function airWaves(tier) {
  if (tier === 1) {
    // Nv1 (~22): intro — Siervo filler + Murciélago swarm + Acólito anchor.
    return [
      wave(700, [{ type: 'siervo_torre', count: ramp(4, tier) }, { type: 'acolito_trueno', count: ramp(2, tier) }]),
      wave(650, [{ type: 'siervo_torre', count: ramp(3, tier) }, { type: 'murcielago', count: ramp(4, tier) }]),
      wave(600, [{ type: 'acolito_trueno', count: ramp(3, tier) }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'siervo_torre', count: ramp(2, tier) }]),
    ];
  }
  if (tier === 2) {
    // Nv2 (~30): + Duelista, Heraldo (stun), Espíritu (plasma volador).
    return [
      wave(670, [{ type: 'siervo_torre', count: ramp(3, tier) }, { type: 'heraldo_rayo', count: 2 }, { type: 'murcielago', count: ramp(2, tier) }]),
      wave(630, [{ type: 'duelista_nocturno', count: 1 }, { type: 'acolito_trueno', count: ramp(2, tier) }, { type: 'espiritu_tormenta', count: ramp(2, tier) }, { type: 'murcielago', count: ramp(2, tier) }]),
      wave(580, [{ type: 'heraldo_rayo', count: 2 }, { type: 'duelista_nocturno', count: 1 }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'siervo_torre', count: ramp(2, tier) }, { type: 'espiritu_tormenta', count: 1 }]),
    ];
  }
  // Nv3 (~38): + Arpía, Tronador (push), Centinela (petrify).
  return [
    wave(640, [{ type: 'siervo_torre', count: ramp(3, tier) }, { type: 'tronador', count: 3 }, { type: 'arpia', count: ramp(2, tier) }, { type: 'espiritu_tormenta', count: 2 }]),
    wave(600, [{ type: 'centinela_piedra', count: 1 }, { type: 'heraldo_rayo', count: 3 }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'siervo_torre', count: 2 }]),
    wave(550, [{ type: 'duelista_nocturno', count: 1 }, { type: 'arpia', count: ramp(2, tier) }, { type: 'tronador', count: 3 }, { type: 'siervo_torre', count: ramp(2, tier) }, { type: 'murcielago', count: 1 }]),
  ];
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test tests/regions.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/regions.js tests/regions.test.js
git commit -m "feat(air): densificar oleadas nv1-3 (~22/30/38) + repartir espíritu/centinela"
```

---

### Task 2: Reescribir `airInterWaves` (nv4–6, intermedios)

Bandas: nv4 ~28 (pico 15) · nv5 ~33 (pico 17) · nv6 ~40 (pico 20). Arregla la escalada plana (hoy 17→19→20 → objetivo 28→33→40). Reparte guardia_nocturno, fuego_fatuo, gargola (nv4,5,6), vampiro_alado (nv5,6), centinela (nv4,5).

**Files:**
- Modify: `src/data/regions.js` (función `airInterWaves`, ~línea 130-153)
- Test: `tests/regions.test.js`

- [ ] **Step 1: Escribir el test que falla (bandas nv4–6 + redistribución)**

Añadir a `tests/regions.test.js`:

```js
function airTypesInLevel(region, i) {
  const set = new Set();
  region.levels[i].phases.filter((p) => p.type === 'wave')
    .forEach((w) => w.spawns.forEach((s) => set.add(s.type)));
  return set;
}

test('Air nv4-6: totales escalando 28<33<40 (arregla la escalada plana)', () => {
  const air = REGIONS.air;
  const t = (i) => levelWaveTotal(air, i).reduce((a, b) => a + b, 0);
  assert.ok(t(3) >= 25 && t(3) <= 31, `nv4 = ${t(3)}`);   // ~28
  assert.ok(t(4) >= 30 && t(4) <= 36, `nv5 = ${t(4)}`);   // ~33
  assert.ok(t(5) >= 37 && t(5) <= 43, `nv6 = ${t(5)}`);   // ~40
  assert.ok(t(5) > t(4) && t(4) > t(3), 'intermedios escalan nv4<nv5<nv6');
});

test('Air: los 6 infrautilizados aparecen en >=2 niveles', () => {
  const air = REGIONS.air;
  const counts = {};
  for (const k of ['guardia_nocturno','espiritu_tormenta','fuego_fatuo','vampiro_alado','gargola_pararrayos','centinela_piedra']) {
    counts[k] = air.levels.filter((_, i) => airTypesInLevel(air, i).has(k)).length;
    assert.ok(counts[k] >= 2, `${k} aparece en ${counts[k]} niveles`);
  }
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `node --test tests/regions.test.js`
Expected: FAIL (totales viejos 17/19/20).

- [ ] **Step 3: Reescribir `airInterWaves`**

Reemplazar la función `airInterWaves` en `regions.js`:

```js
function airInterWaves(tier) {
  if (tier <= 2) {
    // Nv4 (~28, pico 15): muro (Guardia) + torretas (Gárgola/Centinela) + aura (Fuego Fatuo).
    return [
      wave(580, [{ type: 'heraldo_rayo', count: 2 }, { type: 'siervo_torre', count: ramp(3, tier) }, { type: 'guardia_nocturno', count: 1 }, { type: 'murcielago', count: ramp(4, tier) }, { type: 'centinela_piedra', count: 1 }, { type: 'fuego_fatuo', count: 1 }]),
      wave(530, [{ type: 'gargola_pararrayos', count: 1 }, { type: 'fuego_fatuo', count: 2 }, { type: 'duelista_nocturno', count: 1 }, { type: 'siervo_torre', count: ramp(3, tier) }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'guardia_nocturno', count: 1 }, { type: 'heraldo_rayo', count: 2 }]),
    ];
  }
  if (tier === 3) {
    // Nv5 (~33, pico 17): + Hechicero (lift), Sacerdote (healer), Vástago, Torbellino, Vampiro Alado.
    return [
      wave(540, [{ type: 'hechicero_viento', count: 1 }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'duelista_nocturno', count: 1 }, { type: 'vastago_vampirico', count: 3 }, { type: 'guardia_nocturno', count: 1 }, { type: 'fuego_fatuo', count: 2 }, { type: 'centinela_piedra', count: 1 }, { type: 'siervo_torre', count: 2 }]),
      wave(490, [{ type: 'sacerdote_sangre', count: 1 }, { type: 'torbellino_errante', count: 1 }, { type: 'gargola_pararrayos', count: 1 }, { type: 'heraldo_rayo', count: 2 }, { type: 'siervo_torre', count: 4 }, { type: 'vampiro_alado', count: 1 }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'espiritu_tormenta', count: 2 }]),
    ];
  }
  // Nv6 (~40, pico 20): clímax — doble Vampiro Alado + Hechicero + Sacerdote + enjambre + torretas.
  return [
    wave(510, [{ type: 'hechicero_viento', count: 1 }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'vampiro_alado', count: 1 }, { type: 'vastago_vampirico', count: ramp(2, tier) }, { type: 'guardia_nocturno', count: 1 }, { type: 'fuego_fatuo', count: 2 }, { type: 'gargola_pararrayos', count: 1 }, { type: 'arpia', count: 3 }]),
    wave(460, [{ type: 'sacerdote_sangre', count: 1 }, { type: 'arpia', count: ramp(2, tier) }, { type: 'duelista_nocturno', count: 1 }, { type: 'torbellino_errante', count: 1 }, { type: 'murcielago', count: ramp(3, tier) }, { type: 'guardia_nocturno', count: 1 }, { type: 'heraldo_rayo', count: 3 }, { type: 'vampiro_alado', count: 1 }, { type: 'fuego_fatuo', count: 1 }]),
  ];
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `node --test tests/regions.test.js`
Expected: PASS.

- [ ] **Step 5: Correr la suite completa**

Run: `node --test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/regions.js tests/regions.test.js
git commit -m "feat(air): densificar intermedios nv4-6 (~28/33/40) + arreglar escalada plana + repartir infrautilizados"
```

---

## Self-Review

**Spec coverage:** §4 densidad nv1–6 (bandas + escalada creciente + arreglo de la escalada plana de intermedios) → Tasks 1,2 ✓. §2 reparto de los 6 infrautilizados a ≥2 niveles → Task 2 test ✓ (guardia nv4,5,6; espíritu nv2,3,5; fuego_fatuo nv4,5,6; vampiro_alado nv5,6; gárgola nv4,5,6; centinela nv3,4,5).

**Placeholder scan:** sin placeholders; oleadas concretas. ✓

**Type consistency:** solo tipos de `AIR_ENEMIES`; `wave`/`ramp` existentes. ✓

**Nota:** los picos por oleada quedan implícitos en los conteos (nv1 pico ~8, nv6 pico ~20); el test pinnea los totales por nivel, que es la métrica de dificultad relevante. Ajuste fino de picos individuales = playtest (spec §11 Plan B).
