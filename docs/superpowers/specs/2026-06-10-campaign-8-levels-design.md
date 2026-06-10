# Campaña a 8 niveles (un jefe por nivel) — Documento de Diseño

**Fecha:** 2026-06-10
**Estado:** Aprobado (diseño) — pendiente plan de implementación
**Spec previo a "Mundo de Agua".** Reestructura compartida que desbloquea los specs de mundos siguientes.

---

## 0. Contexto y problema

Los mundos elementales se construyen con `makeBranch` (`src/data/regions.js`), que hoy produce **7 niveles** con esta forma de `kind` (`src/data/levelBuilder.js`):

```
nv1–3  basic         (wave ×3)
nv4    intermediate  (wave, wave, miniboss)
nv5    intermediate  (wave, wave, miniboss)
nv6    pretemple     (wave, wave, miniboss, levelBoss)   ← dos jefes en un nivel
nv7    temple        (templeBoss)
```

El problema está en **nv6**: enfrenta un **miniboss y un levelboss en el mismo nivel**. En Fuego eso significa pelear contra **Favilla** y, acto seguido, contra **las tres hermanas (trío + triángulo de lava)** sin respiro. Es un pico de dificultad y, sobre todo, le roba al levelboss el espacio que necesita para leerse como setpiece: el **triángulo de lava** (y, en mundos futuros, gimmicks como el **remolino** de Agua) necesita su propio nivel para que el jugador lo aprenda.

### Objetivo

**Un jefe por nivel.** Cada miniboss, el levelboss y el templeboss ocupan su propio nivel. La rama elemental pasa de **7 a 8 niveles**.

### Restricciones (heredadas, fijas — ver `CLAUDE.md`)
- Sin build / sin bundler. Módulos ES nativos + Phaser 3 por CDN. Mobile-only, portrait, 480×854.
- Persistencia en `localStorage`. **Split puro/Phaser**: toda decisión testeable vive en `data/`/`systems/`.

### Alcance de esta spec
La reestructura del **constructor de ramas elementales** (`makeBranch`) y la **migración de Fuego** (que ya está construido) a la nueva forma. **El Castillo queda fuera** (tendrá una estructura completamente distinta; se aborda en su propia spec). Agua/Aire/Tierra heredan la forma nueva automáticamente.

---

## 1. La estructura nueva (8 niveles)

```
nv1–3  basic         (wave ×3)            — introducción del bestiario
nv4    intermediate  (wave, wave, miniboss[0])
nv5    intermediate  (wave, wave, miniboss[1])
nv6    intermediate  (wave, wave, miniboss[2])   ← antes 'pretemple'; ya NO lleva levelboss
nv7    levelboss     (levelBoss)                 ← NIVEL NUEVO, dedicado (solo el jefe)
nv8    temple        (templeBoss)
```

Cambios respecto a hoy:
- **nv6** deja de ser `pretemple` (que arrastraba el `levelBoss`) y pasa a ser un `intermediate` normal con su miniboss.
- **nv7** es un **nivel nuevo y dedicado** al levelboss: **solo la pelea de jefe, sin oleada previa**. Entras directo al setpiece, con espacio para que el gimmick (triángulo de lava en Fuego, remolino en Agua) se lea.
- **nv8** es el templo (antes nv7).

No se añade ningún nivel de "solo oleadas": el octavo nivel sale de **desapilar** nv6, no de inventar relleno.

---

## 2. Cambios en `levelBuilder.js` (puro)

### 2.1 Nuevo `kind`: `levelboss`

```js
export const KIND_PHASES = {
  basic:        ['wave', 'wave', 'wave'],
  intermediate: ['wave', 'wave', 'miniboss'],
  pretemple:    ['wave', 'wave', 'miniboss', 'levelBoss'],  // SE MANTIENE (lo usa el Castillo)
  levelboss:    ['levelBoss'],                              // NUEVO: solo el jefe, sin oleada previa
  temple:       ['templeBoss'],
};

export const DEFAULT_REWARD = { basic: 1, intermediate: 2, pretemple: 3, levelboss: 3, temple: 4 };
```

- **`pretemple` NO se borra.** El Castillo (`makeCastle`) sigue usándolo; borrarlo lo rompería. Simplemente `makeBranch` deja de emitirlo.
- `buildPhase` ya sabe construir `levelBoss`; el `kind` `levelboss` no necesita lógica nueva, solo la entrada en `KIND_PHASES` y su recompensa. Como una sola fase (igual que `temple` = `['templeBoss']`), el nivel es directo: el jefe y nada más.
- La fase `levelBoss` ya soporta tanto un jefe único (`spec.levelBoss`) como **multi-jefe** (`spec.bosses`, `spec.triangle`) — el trío de Fuego entra sin cambios.

### 2.2 Implicación de economía (puntos de habilidad)

Por mundo, antes vs ahora:

| | basic ×3 | intermediate | pretemple | levelboss | temple | **total** |
|---|---|---|---|---|---|---|
| **Antes (7 niv)** | 3 | 2×2 = 4 | 3 | — | 4 | **14** |
| **Ahora (8 niv)** | 3 | 2×3 = 6 | — | 3 | 4 | **16** |

**+2 puntos de habilidad por mundo** (+8 en los cuatro elementales). **Decisión (confirmada):** se acepta como mejora intencional — más niveles/checkpoints justifican más recompensa, y dar al levelboss su propio nivel debe valer puntos propios. No se compensa para mantener el total viejo.

---

## 3. Cambios en `regions.js` — `makeBranch`

`makeBranch` se reescribe para emitir los 8 niveles. La **data de Fuego en `REGIONS.fire` no cambia** (mismos `minibosses: [PYRA, VESTA, FAVILLA]`, `levelBosses: SISTERS_TRIO`, `templeBoss: IGNATIUS`); solo cambia **cómo `makeBranch` los coloca**.

Forma nueva (orientativa):

```js
function makeBranch({ id, element, name, grantsSkill, intro, mageName, mageLines,
                      basic = basicWaves, inter = interWaves,
                      minibosses = [], levelBosses = null, templeBoss = null }) {
  // El levelboss del nv7: trío (multi-jefe + triángulo) si se proveen, si no un blob por defecto.
  const levelBossSpec = levelBosses
    ? { bosses: levelBosses, triangle: true }
    : { levelBoss: lb(650, 24) };

  const levels = [
    makeLevel(`${id}_1`, id, 'basic',        { waves: basic(1), dialogue: { onEnter: intro } }),
    makeLevel(`${id}_2`, id, 'basic',        { waves: basic(2) }),
    makeLevel(`${id}_3`, id, 'basic',        { waves: basic(3) }),
    makeLevel(`${id}_4`, id, 'intermediate', { waves: inter(2), miniboss: minibosses[0] || mb(300, 18) }),
    makeLevel(`${id}_5`, id, 'intermediate', { waves: inter(3), miniboss: minibosses[1] || mb(360, 20) }),
    makeLevel(`${id}_6`, id, 'intermediate', { waves: inter(4), miniboss: minibosses[2] || mb(380, 20) }),
    makeLevel(`${id}_7`, id, 'levelboss',    { ...levelBossSpec }),
    makeLevel(`${id}_8`, id, 'temple',       {
      templeBoss: templeBoss || tb(950, 26, MECHANICS[element]),
      minions: [{ type: 'villager', count: 4 }],
      dialogue: { onClear: mageLines.map((text, i) => ({ speaker: i === mageLines.length - 1 ? 'The Caster' : mageName, text })) },
    }),
  ];
  return { id, element, name, grantsSkill, locked: false, levels };
}
```

Resultado de la migración de **Fuego**:

| Nivel | Tipo | Jefe |
|---|---|---|
| nv4 | miniboss | **Pyra** |
| nv5 | miniboss | **Vesta** |
| nv6 | miniboss | **Favilla** |
| nv7 | **levelboss** | **Las tres hermanas** (trío + triángulo de lava) — nivel propio |
| nv8 | templeboss | **Ignatius** |

Agua/Aire/Tierra (que hoy usan los defaults genéricos) heredan la forma de 8 niveles sin cambios en su bloque de `REGIONS`.

---

## 4. Lo que NO cambia (y por qué es de bajo riesgo)

- **Sin cambios en escenas/Phaser.** `GameScene.beginPhase()` ya ramifica por `phase.type` (`wave`/`miniboss`/`levelBoss`/`templeBoss`); `WaveRunner` es un secuenciador genérico sobre `level.phases`. Una rama con 8 niveles produce las mismas fases conocidas, solo repartidas distinto.
- **Sin cambios en progresión.** `Campaign.clearedCount` / `isLevelUnlocked` / `isRegionComplete` ya operan sobre `region.levels.length`, así que 8 niveles se desbloquean y completan solos. `MapScene`/`BranchScene` recorren `region.levels` con `forEach` (sin contar 7 a mano).
- **El Castillo no se toca.** Sigue con `makeCastle` (5 niveles, `kind` `pretemple`), que se preserva.
- **No hay índices de nivel ni cuentas "7" hardcodeadas** que rompan (verificado: el único uso de `levels.length - 1` es el chequeo de final en `finishLevel`, que es relativo).

---

## 5. Testing

Convención del repo: **lógica pura → `node --test`**.

Nuevos / extendidos:
- **`levelBuilder.test.js`** (nuevo o extendido): `KIND_PHASES.levelboss` produce `['levelBoss']`; `makeLevel(..., 'levelboss', ...)` arma **1 sola fase** con el `levelBoss`/`bosses` correctos y `reward.skillPoints === 3`; `pretemple` sigue intacto (regresión del Castillo).
- **`regions.test.js`** (nuevo o extendido): cada región elemental tiene **8 niveles**; en Fuego, nv7 (`index 6`) es `levelBoss` con `bosses` = trío + `triangle: true`, y nv8 (`index 7`) es `templeBoss` con `IGNATIUS`; el Castillo conserva sus 5 niveles.
- **`Campaign.test.js`** (extiende): una región de 8 niveles gatea correctamente el desbloqueo del 8.º y marca `isRegionComplete` al limpiar los 8.

Playtest (Phaser, manual): jugar Fuego de punta a punta confirmando que el trío estrena nivel propio y que el ritmo (miniboss → miniboss → miniboss → trío → Ignatius) se siente mejor que el nv6 doble.

---

## 6. Resumen de archivos afectados

**Modificados:**
- `src/data/levelBuilder.js` — nuevo `kind` `levelboss` en `KIND_PHASES` + `DEFAULT_REWARD` (se mantiene `pretemple`).
- `src/data/regions.js` — `makeBranch` reescrito a 8 niveles (renombrar `lvl6Boss` → `levelBossSpec`). Sin cambios en los bloques de data de cada región.

**Nuevos / extendidos (tests):**
- `tests/levelBuilder.test.js`, `tests/regions.test.js`, extensión de `tests/Campaign.test.js`.

**Sin cambios:** todas las escenas, `WaveRunner`, `Campaign`, `BossBrain`, `EnemyBrain`, `makeCastle`.

---

## 7. Fuera de alcance

- **El Castillo** (estructura propia distinta — su propia spec).
- **El Mundo de Agua** (Spec 2: roster, jefes bespoke, remolino, Dama cambiaformas — se apoya en esta estructura de 8 niveles).
- Re-balanceo fino de oleadas/dificultad de Fuego más allá de re-espaciar los jefes (el contenido de oleadas existente se reusa tal cual).
