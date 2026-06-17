# SP-1 — Rebalance de stats, swaps de movimiento y correcciones localizadas

**Fecha:** 2026-06-16
**Serie:** Revisión de enemigos Fuego/Agua (SP-1 de 3). SP-2 = features de comportamiento (facing, burrow). SP-3 = sistema de invocación + setpieces de boss.

## Objetivo

Primera pasada de la revisión de enemigos: subir HP/daño de los enemigos demasiado débiles, corregir movimientos `flee` que mandan al enemigo al borde más lejano, acelerar los timers del ciclo de vida de los sapos, y dos correcciones de lógica puntuales (explosión con proyectil del elemento correcto; fin de nivel al morir el boss). Es deliberadamente la parte de **bajo riesgo**: casi todo son ediciones de datos en `src/data/`, más dos cambios localizados en `GameScene`/`EnemyBrain`.

Fuera de alcance (van en SP-2/SP-3): facing del `can_lava`, retrabajo del `burrow` del tiburón, sistema de tope de invocación, giant fireball / río de lava de Ignatius, lógica del trío de hermanas, animaciones del Kraken/ballena.

## Alcance y cambios

### 1. Cambios de stats (solo datos)

Edición directa de los defs en `src/data/enemies/fire.js`, `src/data/enemies/water.js`, `src/data/bosses/fire.js`, `src/data/bosses/water.js`. Solo cambian los campos indicados; el resto del recipe se conserva.

**Fuego — enemigos** (`enemies/fire.js`)

| Enemigo | Campo | Antes | Después |
|---|---|---|---|
| `acolito_brasa` | hp | 16 | 20 |
| `iniciado_veloz` | hp | 14 | 20 |
| `caballero_brasa` | hp | 70 | 100 |
| `salamandra` | hp | 18 | 20 |
| `fenix_menor` | hp | 50 | 250 |
| `coloso_magma` | hp | 110 | 500 |
| `coloso_magma` | shielded.reduce | 0.45 | 0.35 |
| `totem_pira` | hp | 45 | 250 |
| `totem_pira` | modifiers | (solo auraDamage) | + `shielded` reduce 0.25 |
| `brasa_errante` | hp | 12 | 20 |
| `brasa_errante` | damage | 0 | 10 |
| `imp_brasa` | hp | 10 | 20 |
| `avispa_brasa` | hp | 8 | 20 |

> Nota `fenix_menor`: además de 250 HP conserva `reviveOnce`, así que en la práctica son ~350 HP efectivos antes de morir. Es el "terror" buscado. Si en playtest resulta excesivo, bajar a 200.

**Agua — enemigos** (`enemies/water.js`)

| Enemigo | Campo | Antes | Después |
|---|---|---|---|
| `acolito_escarcha` | hp | 18 | 20 |
| `sacerdotisa_lago` | hp | 20 | 100 |
| `sacerdotisa_lago` | damage | 0 | 10 |
| `guardia_hielo` | hp | 75 | 180 |
| `corista_abismo` | hp | 26 | 50 |
| `corista_abismo` | damage | 0 | 8 |
| `renacuajo` | hp | 12 | 20 |
| `rana_saltarina` | hp | 18 | 20 |
| `serpiente_marina` | hp | 28 | 40 |
| `nayade` | hp | 30 | 100 |
| `nayade` | damage | 0 | 10 |
| `medusa` | hp | 38 | 80 |
| `medusa` | damage | 0 | 10 |
| `medusa_cria` | hp | 19 | 60 |
| `medusa_cria` | damage | 0 | 10 |
| `burbuja_gelida` | hp | 14 | 30 |
| `burbuja_gelida` | damage | 0 | 10 |
| `totem_escarcha` | hp | 50 | 250 |
| `totem_escarcha` | modifiers | (solo auraDamage) | + `shielded` reduce 0.25 |
| `huevo_sapo` | hp | 8 | 20 |
| `tortuga_acorazada` | damage | 15 | 30 |
| `tortuga_acorazada` | hp | 110 | 220 |

**Agua — náyade: ataque nuevo.** Hoy la náyade no dispara (`damage:0`, solo summon+heal). Con daño 10 hay que darle un proyectil de agua/hielo: añadir `attacks: [{ type: 'shootStraight', projectile: 'ice', every: 1800, speed: 230 }]` además del `summon`. La subida de tasa del summon y del heal va aquí también (ver §2 — náyade combina swap de movimiento + tasas).

**Bosses fuego** (`bosses/fire.js`) — solo los valores base; la lógica del trío (movimientos, última hermana) es SP-3.

| Boss | Campo | Antes | Después |
|---|---|---|---|
| `pyra` | hp | 420 | 500 |
| `pyra` | damage | 14 | 20 |
| `vesta` | hp | 520 | 680 |
| `vesta` | damage | 18 | 36 |
| `favilla` | hp | 480 | 500 |

**Bosses agua** (`bosses/water.js`)

| Boss | Campo | Antes | Después |
|---|---|---|---|
| `soldado_hielo` | hp | 380 | 480 |
| `soldado_hielo` | speed | 75 | 80 |
| `soldado_hielo` | damage | 16 | 20 |
| `sapo_desovador` | damage | 14 | 20 |
| `sapo_desovador` | speed | 60 | 80 |
| `tiburon_abisal` | damage | 18 | 30 |
| `dama_maga_final` | hp | 20 | 320 |

> `medusa` / `medusa_cria`: la medusa pasa de aura pura (damage 0) a **chaser con daño de contacto 10** (movimiento `chase`, ver §2). **Importante:** `buildSplitChildren` (en `EnemyBrain`) deriva las crías **de la def madre** (copia `medusa` con `hpMul`/`radiusMul` y le quita `splitsOnDeath`), no de la def `medusa_cria`. Por tanto, con `medusa.hp = 80` y `splitsOnDeath.hpMul = 0.75` la cría sale automáticamente con 60 HP, daño 10 y `chase` heredados — sin tocar lógica. La def `medusa_cria` se actualiza a 60/10/chase solo por consistencia documental (su uso como `spawnType` no alimenta los stats del split en SP-1; unificar esa ruta sería SP-2). **Decisión abierta (ver §5):** ¿la medusa conserva su `auraDamage` además del daño de contacto, o pasa a ser solo melee? Lo que herede la madre lo heredan las crías.

### 2. Swaps de movimiento (solo datos, salvo nota)

| Enemigo | Antes | Después | Razón |
|---|---|---|---|
| `encapuchado_pira` (fuego) | `static`, speed 0 | `kite` range 200, **speed 55** | Dejar de ser un blanco fijo; mantiene su `lobAoe` a distancia media. |
| `sacerdotisa_lago` (agua) | `flee` | `kite` range 210 | Healer: acercarse al rango de cura en vez de huir al borde. |
| `nayade` (agua) | `flee` | `erratic` | Deambula impredecible en vez de huir; mantiene summon+heal. |
| `favilla` (fuego, base) | `flee` | `erratic` | (El trío de SP-3 sobrescribe su movimiento; este es el def base de la pelea individual nv6.) |
| `dama_maga_final` (agua) | `flee` | `kite` range 240 | Forma final: mantiene distancia y dispara, en vez de huir. |
| `medusa` (agua) | `erratic` | `chase` | Persigue a la princesa (daño de contacto nuevo). |
| `medusa_cria` (agua) | `erratic` | `chase` | Igual que la madre. |
| `sacerdote_llama` (fuego) | `flee` | `kite` range 200 | **Recomendado, no pedido explícitamente** — healer+summoner que cae bajo la regla global "healer con flee → kite". Ver §5. |

**Náyade — tasas de summon/heal** (datos): subir frecuencia del summon de renacuajos (`every: 3500 → 2400`) y del heal (`healAllies.hps: 10 → 14`).

### 3. Timers del ciclo de vida de los sapos (`src/data/tuning.js`)

| Constante | Antes | Después |
|---|---|---|
| `EGG_HATCH_MS` | 3500 | 2500 |
| `TADPOLE_GROW_MS` | 6000 | 4000 |

Más rápido para que la cadena generacional (huevo → renacuajo → sapo adulto) se sienta viva y no inerte. Tunables en playtest.

### 4. `explodesOnDeath` dispara el proyectil del elemento, no flechas

**Problema:** `GameScene.onEnemyDeath()` lanza la metralla de muerte con `TEX.arrow` hardcodeado y un tinte naranja fijo (`COLORS.fireball`), sin importar el elemento del enemigo. Una larva de magma escupe "flechas naranjas"; un pez globo de agua también.

**Fix:** resolver el proyectil igual que `executeAttack`, con `resolveProjectile(boom, this.regionElement)` (el modifier puede declarar `boom.projectile`, si no, cae al default del mundo: fuego→`fire`, agua→`ice`). Usar `PROJECTILES[type].tex` y `.tint` para la textura y el tinte de cada esquirla. Resultado: la larva de magma explota en **orbes de fuego**, el pez globo en **bolas de hielo**.

Esto generaliza la regla del usuario ("nada de novas ni explosiones que lancen flechas; cada quien lanza su elemento"). Las novas/spreads de `executeAttack` **ya** resuelven por elemento correctamente; solo `explodesOnDeath` estaba fuera del sistema.

> Cobertura de tests: `EnemyBrain` es puro; la resolución de proyectil ya está testeada vía `resolveProjectile`. El cambio en `onEnemyDeath` es de integración (Phaser) y se valida en playtest, pero conviene un test unitario nuevo para `resolveProjectile` aplicado a un modifier `explodesOnDeath` con/ sin `projectile` declarado.

### 5. Fin de nivel al morir el boss (`GameScene.checkPhaseCleared`)

**Problema:** en fases de boss (`miniboss`/`levelBoss`/`templeBoss`) la condición de limpieza es `this.enemies.countActive(true) === 0` — espera a que mueran **también todos los minions invocados**. Si el boss murió pero quedan adds vivos, el jugador sigue atrapado.

**Fix:** la fase se considera limpia cuando **no queda ningún boss vivo** (`this.bosses.length === 0`), sin importar los minions. Al cumplirse:
1. Despawnear los enemigos no-boss restantes (`this.enemies` que no estén en `this.bosses`) para que no persistan al diálogo / siguiente fase.
2. Limpiar hazards activos (triángulo, remolino) como ya hace el código hoy.
3. Disparar el diálogo de cierre / `onCleared()` igual que ahora.

Nota: el trío de hermanas (`bosses.length >= 2`) ya rastrea muertes individuales; con este cambio el nivel termina cuando cae la última hermana, no cuando mueren los adds que dejó Favilla.

## Archivos afectados

- `src/data/enemies/fire.js` — stats + swaps de movimiento (acolito_brasa, iniciado_veloz, caballero_brasa, salamandra, fenix_menor, coloso_magma, totem_pira, brasa_errante, imp_brasa, avispa_brasa, encapuchado_pira, sacerdote_llama).
- `src/data/enemies/water.js` — stats + swaps + ataque/tasas de náyade (acolito_escarcha, sacerdotisa_lago, guardia_hielo, corista_abismo, renacuajo, rana_saltarina, serpiente_marina, nayade, medusa, medusa_cria, burbuja_gelida, totem_escarcha, huevo_sapo, tortuga_acorazada).
- `src/data/bosses/fire.js` — pyra, vesta, favilla (valores base + movimiento base de favilla).
- `src/data/bosses/water.js` — soldado_hielo, sapo_desovador, tiburon_abisal, dama_maga_final.
- `src/data/tuning.js` — `EGG_HATCH_MS`, `TADPOLE_GROW_MS`.
- `src/scenes/GameScene.js` — `onEnemyDeath` (proyectil de explosión por elemento), `checkPhaseCleared` (fin al morir el boss + despawn de minions sobrantes).
- `tests/` — test nuevo para `resolveProjectile` aplicado a `explodesOnDeath`.

## Estrategia de testeo

- **Unit (`node --test`):** los datos no rompen tests existentes; añadir test de `resolveProjectile` para el caso `explodesOnDeath`. La lógica de `checkPhaseCleared` vive en la escena (Phaser) → se valida en playtest, no en unit.
- **Playtest manual** (mobile viewport): verificar que (a) los enemigos reforzados aguantan más, (b) ningún `flee` manda al enemigo al borde, (c) la larva/pez globo explotan en su elemento, (d) matar al boss termina el nivel aunque queden adds.

## Decisiones abiertas (para revisión del usuario)

1. **`sacerdote_llama` → kite:** swap derivado de la regla global, no pedido explícitamente. ¿Se aplica o se deja en `flee`?
2. **`medusa` con aura:** al volverse chaser con daño de contacto 10, ¿conserva su `auraDamage` (dps 14) o pasa a ser solo melee? Una medusa que persigue + aura + contacto es muy castigadora.
