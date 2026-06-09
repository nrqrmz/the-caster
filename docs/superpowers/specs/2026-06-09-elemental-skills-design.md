# The Caster — Diseño: Skills Elementales Jugables (Subsistema #1)

**Fecha:** 2026-06-09
**Estado:** Aprobado (diseño) — pendiente plan de implementación
**Relacionado:** `2026-06-09-skill-tree-epic-roadmap.md` (épico completo), `2026-06-09-the-caster-scenarios-design.md` (campaña).

---

## 1. Objetivo y alcance

Hoy solo **fireball** es jugable; el aire/agua/tierra se desbloquean en sus templos (campaña) pero no tienen gameplay. Este ciclo vuelve **jugables las tres skills faltantes** — **Lightning**, **Poison**, **Freeze** — con sus valores *base*, y generaliza el HUD a **multi-botón**.

**Dentro de alcance:**
- Lightning, Poison, Freeze como skills activas con cooldown (casteables desde el HUD).
- HUD que muestra un botón por skill **desbloqueada** (`save.unlockedSkills`).
- Stats base nuevas + pisos; flag `elite` en enemigos; estado congelado/ralentizado en `Enemy`.
- Generalización del sistema de zonas (la zona de poison del jugador cura al caster y daña enemigos; reutiliza el sistema que ya usan los jefes de tierra).
- Renombrar la skill de aire `thunderbolt` → `lightning` (clave que otorga el templo de aire en `regions.js`).

**Fuera de alcance (a otros ciclos):**
- **Quemadura/Burn** de fireball y todos los *upgrades* (cadena >2, +daño, +área, etc.) → son nodos del **árbol (#2)**.
- Fireball no se modifica (ya funciona).
- Números finos de balance (se afinan jugando).

## 2. Decisiones cerradas (resumen)

| Tema | Decisión |
|---|---|
| ⚡ Nombre | **Lightning** (no "thunderbolt"). Clave `lightning`. |
| ⚡ Objetivo | Enemigo más cercano, luego **cadena** al más cercano no golpeado dentro de un radio de salto, hasta `lightningChain` (base 2). |
| ☠️ Poison | Zona **a los pies** del caster: daña enemigos + **cura al caster** mientras esté dentro. |
| ❄️ Freeze | Explosión centrada en el **enemigo más cercano**. Débiles → **inmovilizados**; élites → **ralentizados**. |
| Tier de enemigo | Flag `elite` en datos (lo ponen `mb`/`lb`/`tb`). Débiles = villager/warrior/archer. |
| HUD | Un botón por skill desbloqueada; data-driven desde un registro de skills. |
| Burn / upgrades | Diferidos al árbol (#2). |

## 3. Las tres skills (mecánica + stats base)

Valores base **afinables**; el árbol (#2) los sube. Cada skill es un botón con su propio cooldown.

### ⚡ Lightning (aire)
- Al castear: el **objetivo primario** es el enemigo más cercano al caster (sin límite de radio — es el blanco del casteo). Desde ahí **salta** al enemigo más cercano **no golpeado** dentro de `lightningJumpRadius` **medido desde el último golpeado**, repitiendo hasta llegar a `lightningChain` objetivos o quedarse sin enemigos en rango. Cada golpe aplica `lightningDamage` (vía `CombatSystem.applyDamage`).
- Feedback visual: línea/zigzag breve entre objetivos encadenados (Graphics, se desvanece).
- Base: `lightningDamage 30`, `lightningCooldown 5000`, `lightningChain 2`, `lightningJumpRadius 150`.

### ☠️ Poison (tierra)
- Al castear: suelta una zona en la posición actual del caster, radio `poisonRadius`, dura `poisonDuration`.
- Por segundo: enemigos dentro reciben `poisonDamage`; el **caster se cura** `poisonHeal` (sin pasar de `maxHealth`).
- Base: `poisonDamage 15`, `poisonCooldown 7000`, `poisonDuration 4000`, `poisonRadius 70`, `poisonHeal 8`.

### ❄️ Freeze (agua)
- Al castear: explosión centrada en el enemigo más cercano, radio `freezeRadius`. Para cada enemigo dentro:
  - **débil** (`!def.elite`) → **inmovilizado** (velocidad 0) por `freezeDuration`.
  - **élite** (`def.elite`) → **ralentizado** a `freezeSlowPct` de su velocidad por `freezeDuration`.
- Base: `freezeCooldown 8000`, `freezeRadius 90`, `freezeDuration 2500`, `freezeSlowPct 0.5`.

## 4. HUD multi-botón

`UIScene` pasa de un único botón de fireball a **una columna de botones** (abajo-derecha), uno por skill **desbloqueada** (`save.unlockedSkills`), apilados verticalmente. Cada botón:
- Muestra el ícono de la skill (del registro de skills).
- Dibuja su barrido de cooldown (como hoy el de fireball), leyendo `gameScene.cooldowns[key]` y `gameScene.stats[`${key}Cooldown`]`.
- Al tocar, llama `gameScene.tryCast(key)`, guardado por `scene.isActive('Game')` (igual que hoy, para que un tap de avanzar diálogo no castee).

El registro de skills (`src/data/skills.js`, data pura) lista las 4 skills: `{ key, element, icon, tex }` — usado por el HUD (ícono) y por el casteo (textura de proyectil/zona). Define el orden de los botones.

## 5. Datos y stats nuevas

### `src/data/stats.js`
Agregar a `BASE_STATS`: `lightningDamage`, `lightningCooldown`, `lightningChain`, `lightningJumpRadius`, `poisonDamage`, `poisonCooldown`, `poisonDuration`, `poisonRadius`, `poisonHeal`, `freezeCooldown`, `freezeRadius`, `freezeDuration`, `freezeSlowPct`.
Agregar a `STAT_FLOORS`: `lightningCooldown` (1500), `poisonCooldown` (2000), `freezeCooldown` (2500).

### Enemigos
- Flag `elite: true` en las fábricas de jefe (`mb`/`lb`/`tb` en `regions.js`). Los tipos débiles (`ENEMY_TYPES`) quedan sin el flag (o `elite: false`).
- `Enemy` gana estado de control: `freezeRemaining` (ms, inmoviliza) y `slowRemaining`/`slowFactor` (ralentiza). En `Enemy.updateBehavior(delta, …)`: decrementar timers; si `freezeRemaining > 0` → `setVelocity(0)` y salir; si `slowRemaining > 0` → calcular velocidad normal y multiplicarla por `slowFactor`. Métodos `applyFreeze(ms)` y `applySlow(factor, ms)`.

### Stats en runtime
`BranchScene.runtimeStats(save)` hoy fija `stats.hasFireball`. Se generaliza: adjunta `stats.unlockedSkills = [...(save.unlockedSkills || [])]` (el HUD/casteo consultan esa lista) y conserva las stats por skill que vienen de `getStats`. (Las stats elementales viven en `BASE_STATS`, así el motor de `getStats` ya las propaga.)

## 6. Generalización del sistema de zonas

Hoy `GameScene` tiene `spawnPoisonZone`/`updatePoisonZones` que **dañan al caster** (mecánica del jefe de tierra). Se generaliza a una lista de zonas con efectos explícitos:

```
zona = { x, y, radius, remaining, gfx,
         casterDps?,   // daño/seg al caster (zona de jefe)
         casterHeal?,  // cura/seg al caster (poison del jugador)
         enemyDps? }   // daño/seg a enemigos dentro (poison del jugador)
```
`updateZones(delta)` aplica, por zona y por segundo: `casterDps` → `damageCaster`; `casterHeal` → curar al caster (clamp a `maxHealth`); `enemyDps` → daño a cada enemigo activo dentro del radio. La mecánica de jefe `poisonFloor` pasa a crear una zona con `casterDps`; el poison del jugador crea una con `enemyDps` + `casterHeal`. (Mantiene el guard de muerte ya existente.)

## 7. Arquitectura

- **Lógica pura (sin Phaser, testeable):** `src/systems/SkillTargeting.js`
  - `chainTargets(casterPos, enemies, jumpRadius, maxTargets)` → lista ordenada de objetivos para Lightning. Objetivo 1 = enemigo más cercano a `casterPos` (sin límite de radio). Cada salto siguiente = más cercano **no elegido** dentro de `jumpRadius` del **último elegido**; corta al llegar a `maxTargets` o cuando no queda ninguno en rango. `casterPos`/`enemies` como `{x,y}` (sin Phaser).
  - `freezeEffect(def)` → `'freeze' | 'slow'` según `def.elite`.
  - (La matemática de tick de zona es trivial: `valor * delta/1000`; se prueba donde aporte.)
- **Phaser (verificado jugando):**
  - `GameScene`: `this.cooldowns` (mapa por skill) reemplaza `fireballCdRemaining`; `tryCast(key)` despacha al cast de cada skill (`castFireball` ya existe como `tryCastFireball`, + `castLightning`, `castPoison`, `castFreeze`), respetando cooldown y `stats.unlockedSkills`. `update()` decrementa todos los cooldowns y corre `updateZones`.
  - `UIScene`: render data-driven de botones por skill desbloqueada.
  - `Enemy`: estado de freeze/slow.
  - `data/skills.js`: registro de skills.
- **Texturas:** reutilizar geométricas existentes donde se pueda (orb/arrow/fireball); agregar claves nuevas en `config.js` `TEX`/`COLORS` solo si hace falta (ej. un color para el rayo y para la zona de hielo). El arte sigue siendo geométrico por código.

## 8. Testing (lógica pura, `node --test`)

- `SkillTargeting.chainTargets`: con un set de posiciones, elige el más cercano no golpeado, respeta `jumpRadius` (no salta fuera de rango), respeta `maxTargets`, no repite objetivos, maneja "no hay más en rango".
- `SkillTargeting.freezeEffect`: `elite` → `'slow'`, débil → `'freeze'`.
- El "feel" (cooldowns, áreas, congelar/ralentizar, sustain del poison) se valida **jugando** en el teléfono.

## 9. Fuera de alcance (recordatorio)

- Burn de fireball y todos los upgrades de skills → **árbol (#2)**.
- Oro, tienda, respec → **economía (#3)**.
- Números finos de balance, arte final, audio.
