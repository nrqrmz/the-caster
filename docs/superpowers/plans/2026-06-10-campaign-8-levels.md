# Campaña a 8 niveles (un jefe por nivel) — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reestructurar las ramas elementales de 7 a 8 niveles para que cada miniboss, el levelboss y el templeboss tengan su propio nivel (el levelboss es un nivel dedicado solo al jefe).

**Architecture:** Cambio puramente de datos en dos módulos puros — `levelBuilder.js` (nuevo `kind` `levelboss`) y `regions.js` (`makeBranch` reescrito a 8 niveles). Sin tocar escenas: `GameScene.beginPhase`/`WaveRunner` ya manejan los tipos de fase, y `Campaign` ya cuenta `levels.length`. El Castillo queda intacto (sigue usando `pretemple`).

**Tech Stack:** JavaScript ES modules (sin build), tests con `node:test` + `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-06-10-campaign-8-levels-design.md`

---

### Task 1: Nuevo `kind` `levelboss` en `levelBuilder`

**Files:**
- Modify: `src/data/levelBuilder.js`
- Test: `tests/levelBuilder.test.js`

- [ ] **Step 1: Añadir los tests del nuevo kind**

En `tests/levelBuilder.test.js`, añade estos dos tests al final del archivo:

```js
test('levelboss kind = a single levelBoss phase (no preceding wave)', () => {
  const lv = makeLevel('fire_7', 'fire', 'levelboss', {
    bosses: [{ hp: 280, elite: true }, { hp: 320, elite: true }], triangle: true,
  });
  assert.deepEqual(lv.phases.map((p) => p.type), ['levelBoss']);
  assert.equal(lv.phases[0].bosses.length, 2);
  assert.equal(lv.phases[0].triangle, true);
  assert.equal(lv.reward.skillPoints, DEFAULT_REWARD.levelboss);
});

test('levelboss kind also supports a single levelBoss enemyDef', () => {
  const lv = makeLevel('water_7', 'water', 'levelboss', { levelBoss: { hp: 650, damage: 24 } });
  assert.deepEqual(lv.phases.map((p) => p.type), ['levelBoss']);
  assert.equal(lv.phases[0].enemyDef.hp, 650);
});
```

Y reemplaza el test existente `KIND_PHASES documents the presets` por esta versión (añade `levelboss`):

```js
test('KIND_PHASES documents the presets', () => {
  assert.deepEqual(KIND_PHASES.basic, ['wave', 'wave', 'wave']);
  assert.deepEqual(KIND_PHASES.levelboss, ['levelBoss']);
  assert.deepEqual(KIND_PHASES.temple, ['templeBoss']);
});
```

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `node --test tests/levelBuilder.test.js`
Expected: FAIL — el nuevo kind no existe (`makeLevel` lanza `kind desconocido: levelboss`) y `KIND_PHASES.levelboss` es `undefined`.

- [ ] **Step 3: Añadir el kind y su recompensa**

En `src/data/levelBuilder.js`, reemplaza el objeto `KIND_PHASES` y la const `DEFAULT_REWARD` por:

```js
export const KIND_PHASES = {
  basic:        ['wave', 'wave', 'wave'],
  intermediate: ['wave', 'wave', 'miniboss'],
  pretemple:    ['wave', 'wave', 'miniboss', 'levelBoss'],  // se mantiene: lo usa el Castillo
  levelboss:    ['levelBoss'],                              // nivel dedicado, solo el jefe
  temple:       ['templeBoss'],
};

export const DEFAULT_REWARD = { basic: 1, intermediate: 2, pretemple: 3, levelboss: 3, temple: 4 };
```

No hace falta tocar `buildPhase`: ya sabe construir la fase `levelBoss` (lee `spec.levelBoss`, `spec.bosses`, `spec.triangle`, `spec.minions`).

- [ ] **Step 4: Correr los tests para verificar que pasan**

Run: `node --test tests/levelBuilder.test.js`
Expected: PASS (todos, incluidos `basic`/`intermediate`/`pretemple`/`temple` que no cambiaron).

- [ ] **Step 5: Commit**

```bash
git add src/data/levelBuilder.js tests/levelBuilder.test.js
git commit -m "feat: add 'levelboss' level kind (boss-only level)"
```

---

### Task 2: `makeBranch` a 8 niveles

**Files:**
- Modify: `src/data/regions.js`
- Test: `tests/regions.test.js`

- [ ] **Step 1: Actualizar los tests de regions a la estructura de 8 niveles**

En `tests/regions.test.js`, reemplaza el test `four elemental regions each have 7 levels ending in a temple` por esta versión (8 niveles; el templo pasa al índice 7):

```js
test('four elemental regions each have 8 levels ending in a temple', () => {
  for (const id of REGION_ORDER) {
    const r = REGIONS[id];
    assert.equal(r.levels.length, 8, `${id} level count`);
    assert.equal(r.levels[7].kind, 'temple', `${id} last is temple`);
    assert.equal(r.levels[7].phases[0].type, 'templeBoss');
    if (id === 'fire') {
      assert.equal(r.levels[7].phases[0].enemyDef.key, 'ignatius', 'fire temple boss is Ignatius');
      assert.ok(Array.isArray(r.levels[7].phases[0].enemyDef.phases), 'Ignatius runs the sequencer');
    } else {
      assert.ok(Array.isArray(r.levels[7].phases[0].mechanics), `${id} temple boss has mechanics`);
    }
    assert.equal(r.element, id);
    assert.ok(r.grantsSkill, `${id} grants a skill`);
  }
});
```

Reemplaza el test `standard branch kind layout ...` por:

```js
test('standard branch layout: 3 basic, 3 intermediate, 1 levelboss, 1 temple', () => {
  const kinds = REGIONS.fire.levels.map((l) => l.kind);
  assert.deepEqual(kinds, ['basic', 'basic', 'basic', 'intermediate', 'intermediate', 'intermediate', 'levelboss', 'temple']);
});
```

Y añade este test nuevo (el levelboss estrena su propio nivel; en Fuego es el trío):

```js
test('level 7 is a dedicated levelboss level; fire holds the sisters trio there', () => {
  const lvl7 = REGIONS.fire.levels[6];
  assert.equal(lvl7.kind, 'levelboss');
  assert.deepEqual(lvl7.phases.map((p) => p.type), ['levelBoss']);
  assert.ok(Array.isArray(lvl7.phases[0].bosses), 'fire level 7 is the trio (multi-boss)');
  assert.equal(lvl7.phases[0].bosses.length, 3);
  assert.equal(lvl7.phases[0].triangle, true);
});
```

(Los tests `castle is locked ...`, `required elements ...`, `air branch grants ...` y `all temple/level/mini bosses are flagged elite` no cambian: el Castillo sigue con 5 niveles y el test de élites itera genéricamente.)

- [ ] **Step 2: Correr los tests para verificar que fallan**

Run: `node --test tests/regions.test.js`
Expected: FAIL — `makeBranch` todavía produce 7 niveles, así que `r.levels.length` es 7 y el layout no coincide.

- [ ] **Step 3: Reescribir `makeBranch`**

En `src/data/regions.js`, reemplaza toda la función `makeBranch` por:

```js
// Build a standard elemental branch: 8 levels, one boss per level.
function makeBranch({ id, element, name, grantsSkill, intro, mageName, mageLines, basic = basicWaves, inter = interWaves, minibosses = [], levelBosses = null, templeBoss = null }) {
  // nv7 is a dedicated levelboss level (boss only): the trio (multi-boss + lava
  // triangle) when provided, else a single default level-boss blob.
  const levelBossSpec = levelBosses ? { bosses: levelBosses, triangle: true } : { levelBoss: lb(650, 24) };
  const levels = [
    makeLevel(`${id}_1`, id, 'basic', { waves: basic(1), dialogue: { onEnter: intro } }),
    makeLevel(`${id}_2`, id, 'basic', { waves: basic(2) }),
    makeLevel(`${id}_3`, id, 'basic', { waves: basic(3) }),
    makeLevel(`${id}_4`, id, 'intermediate', { waves: inter(2), miniboss: minibosses[0] || mb(300, 18) }),
    makeLevel(`${id}_5`, id, 'intermediate', { waves: inter(3), miniboss: minibosses[1] || mb(360, 20) }),
    makeLevel(`${id}_6`, id, 'intermediate', { waves: inter(4), miniboss: minibosses[2] || mb(380, 20) }),
    makeLevel(`${id}_7`, id, 'levelboss', { ...levelBossSpec }),
    makeLevel(`${id}_8`, id, 'temple', {
      templeBoss: templeBoss || tb(950, 26, MECHANICS[element]),
      minions: [{ type: 'villager', count: 4 }],
      dialogue: { onClear: mageLines.map((text, i) => ({ speaker: i === mageLines.length - 1 ? 'The Caster' : mageName, text })) },
    }),
  ];
  return { id, element, name, grantsSkill, locked: false, levels };
}
```

Cambios respecto al original: nv6 pasa de `'pretemple'` (que arrastraba el levelboss) a `'intermediate'`; el levelboss se mueve a un nuevo nv7 `'levelboss'`; el templo pasa a nv8; se renombra `lvl6Boss` → `levelBossSpec`. Los bloques de data de cada región (`REGIONS.fire`, etc.) no se tocan.

- [ ] **Step 4: Correr los tests de regions para verificar que pasan**

Run: `node --test tests/regions.test.js`
Expected: PASS (incluidos los que no cambiaron: castle, élites, required elements).

- [ ] **Step 5: Commit**

```bash
git add src/data/regions.js tests/regions.test.js
git commit -m "feat: elemental branches are 8 levels, one boss per level"
```

---

### Task 3: Regresión de progresión (8 niveles) + verificación completa

**Files:**
- Test: `tests/Campaign.test.js`

- [ ] **Step 1: Añadir el test de gateo para una región de 8 niveles**

En `tests/Campaign.test.js`, añade este test al final del archivo (usa el helper `fresh()` ya existente en ese archivo):

```js
test('an 8-level region gates the final level and completes only after all 8', () => {
  const r8 = {
    id: 'water', element: 'water', grantsSkill: 'freeze',
    levels: Array.from({ length: 8 }, () => ({ kind: 'basic', reward: { skillPoints: 1 } })),
  };
  let s = fresh();
  for (let i = 0; i < 7; i++) {
    assert.equal(isLevelUnlocked(s, 'water', i), true, `level ${i} unlocked`);
    assert.equal(isRegionComplete(s, r8), false, `not complete before clearing level ${i}`);
    s = grantClear(s, r8, i);
  }
  assert.equal(isLevelUnlocked(s, 'water', 7), true, 'final level unlocked after 7 clears');
  assert.equal(isRegionComplete(s, r8), false, 'not complete until the 8th is cleared');
  s = grantClear(s, r8, 7);
  assert.equal(isRegionComplete(s, r8), true, 'complete after all 8');
  assert.equal(s.skillPoints, 8, 'earned one point per level');
});
```

- [ ] **Step 2: Correr el test para verificar que pasa**

Run: `node --test tests/Campaign.test.js`
Expected: PASS (`Campaign` ya opera sobre `region.levels.length`, así que 8 niveles gatean solos; el test documenta esa garantía).

- [ ] **Step 3: Correr la suite completa**

Run: `node --test`
Expected: PASS, 0 fallos. Confirma que ningún test viejo (Difficulty, WaveRunner, BossBrain, etc.) se rompió con el cambio de estructura.

- [ ] **Step 4: Commit**

```bash
git add tests/Campaign.test.js
git commit -m "test: campaign gating works for 8-level regions"
```

---

## Verificación manual (playtest, fuera de la suite)

Tras implementar, levantar el juego (`python3 -m http.server 8000`, viewport móvil portrait) y jugar Fuego de punta a punta para confirmar el ritmo:
- nv4 Pyra, nv5 Vesta, nv6 Favilla (cada miniboss solo).
- **nv7 = las tres hermanas + triángulo de lava, en su nivel propio, sin oleada previa.**
- nv8 = Ignatius (templo).

Confirmar que el desbloqueo de niveles en `BranchScene` muestra 8 nodos y que completar el nv8 marca la región como completa.

---

## Notas de alcance

- **El Castillo no se toca** (sigue con `makeCastle`, 5 niveles, `kind` `pretemple`).
- **+2 puntos de habilidad por mundo** es intencional (decisión confirmada en el spec); no se compensa.
- Sin cambios en escenas, `WaveRunner`, `Campaign`, `BossBrain`, `EnemyBrain`.
