# Rebalanceo de dificultad — diseño

**Fecha:** 2026-06-16
**Estado:** aprobado (brainstorming)
**Sub-proyecto:** B de la tanda de ajustes previa a los mundos Aire/Tierra
(orden acordado: B dificultad → A i18n → C pixel art → D animaciones).

## Problema

Hoy **todos** los enemigos se escalan con el mismo multiplicador:

```
mult = baseCurve[nivel] × (1 + puntos_gastados × 0.04 + elementos × 0.15)
```

Aplicado por igual a un slime básico y a un boss vía `scaleEnemyDef(def, mult)`.

Dos defectos de raíz:

1. **Dos ejes que se multiplican** (poder del jugador × profundidad). Compuestos
   multiplicativamente, explotan.
2. **El eje de poder es lineal y sin techo** (`0.04 × puntos`). Con 110 puntos
   gastables hoy ya aporta hasta **+4.4×**; cada nivel/punto que agreguemos en
   Aire/Tierra lo empeora.

Resultado medido: un enemigo **básico** de nv8 a fin de juego llega a **~×15.6**
de hp y daño — mismo trato que un boss — y a ~200 puntos (contenido futuro)
pasaría de **×30**. Insostenible antes de agregar más mundos.

Restricciones del usuario:
- Los básicos **sí** deben escalar, pero suave.
- El juego debe endurecerse con la profundidad.
- Debe ser **sostenible** aunque dupliquemos niveles y puntos de skill.
- La resistencia/tankiness extra va **solo a minibosses y bosses**, no a todos.

## Decisión

Reemplazar la composición multiplicativa por una **suma de dos bonos**, donde el
bono de poder tiene **rendimientos decrecientes** (asíntota), diferenciado por
**clase de enemigo** (básico vs `elite`), con los elites ganando además
**resistencia creciente acotada**.

```
mult = 1 + bonoProfundidad(nivel) + factorClase × bonoPoder(save)

bonoProfundidad(nivel) = BASE_CURVE[nivel] − 1        // reusa la curva existente
bonoPoder(save)        = POWER_CAP·(1 − e^(−puntos/POWER_SCALE)) + elementos·PER_ELEMENT
factorClase            = BASIC_POWER_FACTOR (básicos) | ELITE_POWER_FACTOR (elites)
```

El bono de poder se aplana solo: a 110 pts ≈ 1.42, a 200 pts ≈ 1.59. Agregar
mundos no rompe el balance.

### Resistencia de elites

Los enemigos con `elite: true` (ya presente en `mb`/`lb`/`tb` de `regions.js` y
en los bosses de `data/bosses/*`) reciben, además del mult con factor 1.0, una
**reducción de daño creciente por profundidad**:

```
eliteResist = min(ELITE_RESIST_MAX, ELITE_RESIST_PER_DEPTH × bonoProfundidad)
```

Se combina con el `resist` innato que las formas de boss ya fijan, usando
`combinado = 1 − (1 − a)(1 − b)`, de modo que **nunca alcanza 1** (acotado, no
invulnerable). El daño a elites ya fluye por el código `applyResist` existente en
`GameScene` (`enemy.def.resist ?? resistMod?.factor ?? 0`), así que basta con
fijar `resist` en el def escalado.

### Sin tiers extra

Miniboss / levelboss / templeboss comparten el mismo `factorClase` y la misma
fórmula de resist. Sus diferencias de hp/daño ya viven en sus defs base
(`mb(hp,dmg)` / `lb(hp,dmg)` / `tb(hp,dmg)` en `regions.js`). No se agrega un
multiplicador de tier. (YAGNI.)

## Constantes (en `src/data/tuning.js`)

| Constante | Valor | Rol |
|---|---|---|
| `POWER_CAP` | `1.2` | Techo asintótico del bono de poder por puntos |
| `POWER_SCALE` | `45` | Constante de e-folding (~45 pts → 63% del techo) |
| `PER_ELEMENT` | `0.08` | Bono aditivo por elemento dominado |
| `BASIC_POWER_FACTOR` | `0.35` | Fracción del bono de poder para básicos |
| `ELITE_POWER_FACTOR` | `1.0` | Fracción del bono de poder para elites |
| `ELITE_RESIST_MAX` | `0.30` | Tope de reducción de daño por escalado en elites |
| `ELITE_RESIST_PER_DEPTH` | `0.15` | Resist por unidad de `bonoProfundidad` |

`BASE_CURVE` permanece como única fuente de la profundidad (se le resta 1 para
obtener `bonoProfundidad`).

## Proyección (cómo se ve)

| Momento | Básico hoy | Básico nuevo | Elite nuevo | 200 pts (futuro) |
|---|---|---|---|---|
| Mid (40 pts, 2 elem, nv5) | ×4.9 | ×2.0 | ×2.6 + resist | — |
| End (110 pts, 4 elem, nv8) | ×15.6 | ×3.1 | ×4.0 + ~24% resist | básico ×3.3 |

## Superficie de implementación

- **`src/data/tuning.js`** — agregar las constantes de arriba. `BASE_CURVE` se
  queda.
- **`src/systems/Difficulty.js`** (lógica pura, sin Phaser):
  - Agregar `difficultyContext(save, levelIndex)` → `{ basicMult, eliteMult,
    eliteResist }`.
  - Helpers exportados: `powerBonus(save)`, `depthBonus(levelIndex)`,
    `combineResist(a, b) = 1 − (1 − a)(1 − b)`.
  - Reescribir `scaleEnemyDef(def, ctx)`: elige `ctx.eliteMult` si `def.elite` si
    no `ctx.basicMult`; escala `hp` y `damage` **solo si están presentes** (las
    formas de boss no siempre traen `damage`); para elites fija
    `resist = combineResist(def.resist ?? 0, ctx.eliteResist)`.
  - **Retener** `difficultyMultiplier` / `levelMultiplier` (curva vieja) **sin
    cambios**, usados únicamente como escalar del `goldReward` y del debug — así
    la economía queda **intacta** (fuera de alcance). Sus constantes legacy
    (`0.04` / `0.15`) se inlinean en `difficultyMultiplier`.
- **`src/scenes/GameScene.js`**:
  - Calcular `this.diff = difficultyContext(save, this.levelIndex)` una vez,
    **además** de conservar `this.mult = levelMultiplier(save, this.levelIndex)`
    para `goldReward` (línea ~449) y el debug (línea ~667).
  - Pasar `this.diff` a los 5 call-sites de `scaleEnemyDef` (líneas ~140, 206,
    259, 278, 375). No tocar el flujo de daño/`applyResist`.
  - **Bosses multi-forma** (`_applyBossForm`): cada forma sobrescribe `hp` con su
    valor crudo, saltándose el escalado. Aplicar `scaleEnemyDef({ ...form,
    elite: true }, this.diff)` a la forma antes de mergearla, para que cada forma
    respete `eliteMult` + `resist`.

## Pruebas (`node --test`, módulo puro)

En `tests/Difficulty.test.js` (actualizar/crear):

1. **Monotonía** — más puntos gastados ⇒ `eliteMult` y `basicMult` no decrecen.
2. **Cota / sostenibilidad** — el mult a 200 puntos está a ≤ ~10% del mult a 110
   puntos (el bono de poder se aplanó).
3. **Básico < elite** — para el mismo save/nivel, `basicMult < eliteMult`.
4. **Resist acotado** — `eliteResist ≤ ELITE_RESIST_MAX` siempre, y
   `combineResist(a, b) < 1` para `a, b ∈ [0, 1)`.
5. **Caso concreto** — un básico nv8 fin-de-juego (110 pts, 4 elem) queda ≈ ×3.1,
   no ×15; un elite del mismo nivel queda ≈ ×4.0 con resist ≈ 0.24.
6. **Piso** — `mult ≥ 1` siempre (nunca debilita por debajo del def base).

## Fuera de alcance

- i18n, pixel art, animaciones (sub-proyectos A/C/D, specs propios).
- Rebalanceo de stats base de enemigos individuales o de la economía de oro.
- Cambios al árbol de skills o a su costo (los 110 puntos siguen igual).
