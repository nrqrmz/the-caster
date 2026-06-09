# The Caster — Diseño: Dinámica de Escenarios (Campaña)

**Fecha:** 2026-06-09
**Estado:** Aprobado (diseño) — pendiente plan de implementación
**Relacionado:** `2026-06-09-the-caster-design.md` (diseño base del vertical slice)

---

## 1. Objetivo y resumen del cambio

El vertical slice tiene **un solo escenario** (`SCENARIO_1`) hardcodeado en `GameScene`, sin forma de avanzar al siguiente. Este diseño define la **dinámica de la campaña completa**: pasamos de "un escenario plano" a una **campaña de regiones explorables**.

- **4 ramas elementales**, explorables en cualquier orden e intercalables libremente:
  - 🔥 **Fuego** — interior subterráneo de un volcán (descenso al infierno).
  - 💧 **Agua** — un lago (la Dama del Lago).
  - 💨 **Aire** — una montaña.
  - 🌿 **Tierra** — un bosque.
- Cada rama es un **camino lineal de 7 niveles** que culmina en un **templo**; al completar el templo dominas ese elemento (desbloqueas su skill activa).
- Al dominar los **4 elementos** se desbloquea el **Castillo del Rey**: el clímax de la venganza.
- La dificultad **escala con tu poder**, así que el reto se mantiene sin importar el orden.

Este diseño cubre **solo la dinámica de escenarios**. La expansión del skill tree es un ciclo aparte.

## 2. Decisiones acordadas (resumen)

| Tema | Decisión |
|---|---|
| Navegación del mapa | **Dos niveles**: pantalla de portales → camino de la rama (opción C). |
| Estructura de rama | **Camino lineal de 7 niveles**, desbloqueo nodo a nodo. |
| Patrón estándar de rama | **3 básicos · 2 intermedios · 1 pre-templo · 1 templo** (queda en datos). |
| Modelo de nivel | **Lista de fases data-driven** (Enfoque 1); `WaveRunner` genérico. |
| Boss de templo | Solo el jefe + minions, **sin oleadas**; mecánicas elementales propias. |
| Dificultad | **Base × multiplicador** (puntos gastados en skill tree + elementos dominados). |
| Repetir niveles | **No.** Nivel completado queda cerrado; se avanza. Sin farmeo. |
| Muerte | Reinicia **solo el nivel actual**; progreso conservado. |
| Puntos de skill | Se otorgan al **completar un nivel por primera vez**. |
| Acceso a SkillTree | **Desde el mapa**, cuando el jugador quiera. |
| Castillo / final | Desbloqueado con 4 elementos; ~5 niveles duros → el Rey; **final incompleto a propósito**. |

## 3. Modelo de contenido (Enfoque 1 — fases data-driven)

### Región (`src/data/regions.js`)

```
{
  id: 'fire',
  element: 'fire',
  name: 'El Volcán',
  theme: '...',          // claves de arte/ambiente (geométrico por ahora)
  grantsSkill: 'fireball',
  locked: false,         // el Castillo arranca locked: true
  levels: [ <Level>, ... ]  // 7 niveles para una rama elemental
}
```

Hay **4 regiones elementales** + **1 región Castillo** (su contenido detallado se difiere; ver §7).

### Nivel

```
{
  id: 'fire_1',
  regionId: 'fire',
  kind: 'basic' | 'intermediate' | 'pretemple' | 'temple',
  phases: [ <Phase>, ... ],   // expandido desde kind, pero override-able en datos
  dialogue: { onEnter?, onClear? },  // disparadores opcionales (ver §8)
  reward: { skillPoints: N }
}
```

`kind` es un **preset** que se expande a `phases`:

| `kind` | `phases` |
|---|---|
| `basic` | `['wave','wave','wave']` |
| `intermediate` | `['wave','wave','miniboss']` |
| `pretemple` | `['wave','wave','miniboss','levelBoss']` |
| `temple` | `['templeBoss']` |

### Fase

```
{ type: 'wave'|'miniboss'|'levelBoss'|'templeBoss', ...datos }
```

- `wave`: `{ spawns: [{ type, count }], spawnDelay }` (igual que hoy).
- `miniboss` / `levelBoss`: `{ enemyDef, minions?, mechanics?, dialogue? }`.
- `templeBoss`: `{ enemyDef, minions, mechanics, dialogue }` — **sin oleadas**; el jefe luce su dominio elemental.

### Mecánicas de jefe (`mechanics`)

Los jefes de templo (y de nivel/castillo) declaran mecánicas elementales como datos, ejecutadas por un sub-sistema de mecánicas. Ejemplos (tierra): `wall` (muros que atrapan), `poisonFloor` (zona DoT), `boulder` (proyectil de gran daño). Cada elemento tendrá su repertorio. El catálogo concreto de mecánicas por elemento se afina en el plan de implementación; el diseño fija que **son datos** y que existe un motor que las interpreta.

## 4. Mapa y navegación (opción C — dos niveles)

- **`MapScene` (portales):** 4 portales elementales + portal **Castillo** (bloqueado hasta dominar los 4 elementos). Incluye acceso a **SkillTree**. Indica qué elementos ya dominas.
- **`BranchScene` (camino):** los 7 nodos de la rama en línea. Nodos desbloqueados hasta `cleared + 1` (desbloqueo **lineal** dentro de la rama). Tocar un nodo desbloqueado → `GameScene` con ese nivel. Un nodo **ya completado queda cerrado** (no se re-juega). Muestra el estado del templo/skill de la rama.

## 5. Dificultad escalada

Función pura `difficultyMultiplier(save)`:

- Toma la dificultad **base** de cada enemigo/fase y le aplica un multiplicador en función de:
  - **puntos gastados** en el skill tree, y
  - **número de elementos dominados**.
- Se aplica a HP y daño de enemigos (y, opcionalmente, al conteo) **al spawnear**.
- Efecto: el templo que dejas al final siempre es el más duro; el primero, el más fácil. **Auto-balanceado** respecto a tu poder; por eso no hace falta repetir niveles.

Las fórmulas/constantes exactas se fijan en el plan; el diseño fija que es una **función pura testeable** alimentada por el save.

## 6. Progresión, guardado y muerte

### Save v2 (migración desde v1)

```
{
  version: 2,
  skillPoints: N,
  purchasedNodes: [...],
  elements: [ 'fire', ... ],         // elementos dominados (templo completado)
  regionProgress: { fire: { cleared: 3 }, water: { cleared: 0 }, ... },
  // se ELIMINA currentScenario: la posición ahora es navegación, no estado guardado
}
```

- `SaveSystem.load()` migra v1 → v2 (en vez de descartar): conserva puntos/nodos, deriva `elements` de `unlockedSkills`/`unlockedTemples` previos, inicializa `regionProgress`.
- `unlockedSkills` se conserva o se deriva de `elements` (un elemento dominado = su skill desbloqueada).

### Reglas de progreso (módulo puro `Campaign`)

- `isLevelUnlocked(save, regionId, index)` — lineal dentro de la rama.
- `isCastleUnlocked(save)` — `elements.length === 4`.
- `isRegionComplete(save, regionId)` — templo superado.
- `grantClear(save, regionId, index)` — devuelve un save nuevo (inmutable): avanza `cleared` si es primera victoria, suma `reward.skillPoints` **solo en primera victoria**, y si el nivel era `temple` agrega el elemento.

### Muerte

- Reinicia **solo el nivel actual**. El progreso (nodos limpiados, elementos, puntos) se conserva.
- Igual que el modelo actual, pero la unidad es el **nivel**, no la región.

### Puntos de skill

- Se otorgan al **completar un nivel por primera vez** (más en pre-templo/templo). Números finos = ciclo del skill tree.
- **SkillTree** accesible desde el mapa cuando el jugador quiera (encaja con la navegación libre).

## 7. Castillo y final

- Desbloqueado al dominar los **4 elementos**.
- Región de **~5 niveles duros** (minibosses + bosses). Estos bosses son **parientes/amigos de los bosses de nivel pre-templo** ya derrotados (venganza en espejo).
- Culmina en el **Rey**.
- **Final incompleto a propósito**: descubres que el Rey está muerto, animado como **títere por magia** por un mago **amigo de tu padre**. Cierra en cliffhanger (gancho de secuela).
- El **contenido detallado del Castillo y del Rey** (niveles concretos, mecánicas del Rey) se difiere a un ciclo posterior; este diseño fija su **lugar en el mapa, el gating y el beat narrativo**.

## 8. Narrativa / disparadores

- Diálogos como **datos** (igual que hoy: arrays de `{ speaker, text }`).
- Disparadores: **entrada a una región** (primera vez), **llegada al templo**, **derrota del jefe de templo** (revela historia), y los beats del **Castillo/Rey**.
- Hilo narrativo: lo primero que sabes es que tu **madre fue exiliada** y tu **padre asesinado por el Consejo de Magos**. Los **jefes de templo son los magos del Consejo**; cada uno revela una pieza según su relación con tus padres. El giro final: el Rey ya está muerto, títere de un mago amigo de tu padre.

## 9. Arquitectura

### Módulos puros (sin Phaser, testeados con `node --test`)

- **`WaveRunner`** (generalizado): secuenciador sobre `level.phases` (sin orden cableado). `currentPhase()` devuelve el descriptor; `onCleared()` avanza el índice; `isComplete()` al pasar la última fase.
- **`Campaign.js`** (nuevo): `isLevelUnlocked`, `isCastleUnlocked`, `isRegionComplete`, `grantClear`.
- **`Difficulty.js`** (nuevo): `difficultyMultiplier(save)`.
- **`SaveSystem`**: migración v1 → v2.

### Phaser

- **`MapScene`**, **`BranchScene`** (nuevas).
- **`GameScene`**: recibe un `level`; `beginPhase()` ramifica por `phase.type` (incluye `templeBoss` sin oleadas). Aplica `difficultyMultiplier` al spawnear.
- **Motor de mecánicas de boss**: interpreta `mechanics` (muros, piso venenoso, boulders, etc.).

### Flujo de escenas

```
Menu → Map (portales) → Branch (camino) → Game (+ UI overlay)
   → [nivel limpiado: reward + diálogo onClear] → Branch
   → [templo limpiado: + elemento + skill + diálogo de historia] → Branch / Map
SkillTree: accesible desde Map en cualquier momento.
Castillo: portal en Map se desbloquea al tener 4 elementos.
```

## 10. Testing (lógica pura)

- **`WaveRunner`**: listas de fases arbitrarias — solo `templeBoss`, mixtas, vacías; avance e `isComplete`.
- **`Campaign`**: desbloqueo lineal de nodos, desbloqueo del Castillo (4 elementos), completitud de región, `grantClear` (inmutabilidad, puntos solo en primera victoria, alta de elemento en templo).
- **`Difficulty`**: el multiplicador crece con puntos gastados y elementos; nunca por debajo de la base.
- **`SaveSystem`**: migración v1 → v2 conserva puntos/nodos y deriva `elements`/`regionProgress`.

El "feel" (mecánicas de boss, dificultad real) se valida **jugando** en el teléfono.

## 11. Fuera de alcance / diferido

- **Expansión del skill tree** (estructura ramificada, nodos por elemento) — su propio ciclo.
- **Contenido detallado del Castillo y el Rey** (niveles, mecánicas del Rey).
- Arte final, audio, números finos de balance.
- Catálogo completo de mecánicas por elemento (se concreta en el plan).
