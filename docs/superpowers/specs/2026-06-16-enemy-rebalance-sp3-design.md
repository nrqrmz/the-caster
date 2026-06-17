# SP-3 — Sistema de invocación con topes y setpieces de boss

**Fecha:** 2026-06-16
**Serie:** Revisión de enemigos Fuego/Agua (SP-3 de 3). SP-1 = rebalance de stats + fixes localizados. SP-2 = facing + burrow. Este es el sub-proyecto más grande.

## Objetivo

Lo que requiere mecánicas nuevas además de datos:

1. Un **sistema de invocación con tope + cooldown**, **opt-in** (solo lo usan los defs que lo declaren; el resto sigue invocando como hoy, acotado solo por el `CONCURRENCY_CAP` global de 16).
2. Upgrades del **setpiece de Ignatius** (temple boss de fuego): bajar el rate de charcos de lava, una **giant fireball** lenta, volverlo **summoner** (con tope) y un **río de lava** que parte la pantalla.
3. Retrabajo del **trío de hermanas** (nv7 fuego): nuevos HP/movimientos para generar triángulos variados y, cuando queda **una sola** hermana, cancelar los triángulos y volver a los charcos de lava.
4. Summons con tope para **soldado_hielo**, **tiburón abisal** y **dama_ballena**.
5. **Animaciones de agua**: telegrafiar el remolino del Kraken y corregir los `lobAoe` que hoy se pintan como lava naranja (tentáculos del Kraken, maremoto de la ballena) para que se vean como agua.

El fin-de-nivel-al-morir-boss y la corrección de `explodesOnDeath` ya van en SP-1; las novas/spreads ya resuelven proyectil por elemento correctamente.

## 1. Sistema de invocación con tope + cooldown (opt-in)

### Estado actual

`GameScene.executeAttack`, rama `summon`: por cada disparo del ataque escupe `count` enemigos del `spawnType`, sin tope ni seguimiento. El único límite es el `CONCURRENCY_CAP` global.

### Diseño

El tope vive en la **def del ataque de summon**, como campos opcionales. Un ataque que **no** los declara se comporta como hoy.

```
{ type: 'summon', spawnType: 'guardia_hielo', count: 2, every: ..., cap: 2, respawnMs: 15000 }
```

- **`cap`**: máximo de enemigos vivos invocados **por esa instancia de ataque**.
- **`respawnMs`**: tras morir un invocado, ese "slot" no se repone hasta que pasen `respawnMs` ms.
- **`spawnTypes`** (lista, opcional): si el ataque puede invocar varios tipos (Ignatius), elige uno al azar por invocación; el `cap` cuenta el **total** vivo de esa instancia, sin importar el tipo.

### Seguimiento (GameScene)

Cada enemigo/boss summoner lleva un tracker por instancia de ataque de summon:

```
parent._summonTrackers[attackIndex] = { alive: number, cooldownUntil: number }
```

- **Al invocar** (`executeAttack` summon con `cap`): `disponibles = cap - alive`; si hay un cooldown activo (`now < cooldownUntil`) los slots liberados aún no cuentan → `disponibles` se limita además por el cooldown. Se spawnea `min(count, disponibles)`. Cada hijo se marca: `child._summonedBy = parent`, `child._summonAttackIndex = attackIndex`.
- **Al morir un hijo** (`onEnemyDeath`): si `child._summonedBy` sigue vivo, `tracker.alive -= 1` y `tracker.cooldownUntil = now + respawnMs`.
- **Si el parent muere**: sus hijos quedan huérfanos (sin efecto; ya no hay quien reponga). No se despawnean.

La aritmética del tope (cuántos spawnear dado `alive`, `cap`, `cooldownUntil`, `now`) se extrae a un **helper puro en `EnemyBrain`** (`summonSlots({cap, alive, cooldownUntil}, now) → n`) para poder testearla bajo `node --test`. El spawning/tracking en sí vive en GameScene (Phaser).

### Defs con tope (opt-in)

| Summoner | Invoca | cap | respawnMs |
|---|---|---|---|
| `ignatius` | `brasa_errante` / `elemental_fuego` / `espiritu_ceniza` (spawnTypes) | 3 | 20000 |
| `soldado_hielo` | `guardia_hielo` | 2 | 15000 |
| `dama_ballena` | `cangrejo_acorazado` | 2 | 15000 |
| `dama_ballena` | `pez_globo` | 2 | 15000 |
| `tiburon_abisal` | `tiburon_joven` | 1 | 15000 |

`dama_ballena` mantiene además su summon de `ahogado` **sin tope** (solo el global). Todos los demás summoners (nayade, favilla, sapo_desovador, sacerdote_llama) siguen **sin** tope propio.

Como Ignatius/soldado/abisal usan `phases` (BossBrain), el summon se expresa como un **step de secuencia** `{ do: 'summon', ... }` (BossBrain ya mapea `step.do → attack.type`); el `cap`/`respawnMs` viajan en el step.

## 2. Setpiece de Ignatius (temple boss de fuego)

### 2a. Bajar el rate de charcos de lava

Hoy la lava de Ignatius viene de dos fuentes que se acumulan: el hook `spawnLavaFloor` (4 carriles al entrar a las fases 2 y 3) **y** steps `lobAoe` en cada ciclo de la secuencia. Resultado: pantalla saturada de lava.

Cambio:
- Quitar los steps `lobAoe` de las secuencias de Ignatius (los charcos pasan a ser responsabilidad del río de lava y de `spawnLavaFloor`, no de cada ciclo).
- `spawnLavaFloor`: reducir de **4 carriles a 2** y subir su duración un poco para que sigan siendo una amenaza posicional sin saturar.

### 2b. Giant fireball

Nuevo ataque, reutilizando `TEX.fireball` (ya 32×32) renderizado grande:

- **Tipo:** se modela como un `shootStraight` con flags: `{ do: 'giantFireball', projectile: 'fire', speed: 120, damage: 28, big: true }`. `executeAttack` lo trata como disparo recto único pero, si `att.big`, escala el display del proyectil (`setDisplaySize ~60px`) y agranda su cuerpo de colisión. Sin homing.
- **Comportamiento:** una bola enorme y lenta que avanza en línea recta cruzando la pantalla. Telegrafiada (windup en el step). Se añade como step ocasional en las secuencias de fase 1-3 de Ignatius (no en cada ciclo).
- **Arte:** ninguno nuevo; es `TEX.fireball` escalado. Si en playtest se quiere un sprite dedicado más detallado, se genera luego con `tools/gen-proj.mjs` (fuera de alcance de SP-3).

### 2c. Ignatius summoner

Ignatius gana el summon con tope de §1 (cap 3 entre `brasa_errante`/`elemental_fuego`/`espiritu_ceniza`, respawn 20 s). Step `{ do: 'summon', spawnTypes: [...], count: 1, cap: 3, respawnMs: 20000 }` en sus secuencias de fase 2-3. Le da la personalidad de "padre invocador" que pediste, sin saturar (máx 3 a la vez).

### 2d. Río de lava

Nuevo hazard: un **corredor de lava** que parte la pantalla en línea recta — **horizontal, vertical o diagonal** (orientación aleatoria por activación), poco frecuente.

- **Estado:** `this.lavaRiver = { orientation, mode: 'telegraph'|'active'|'cooldown', t }`, actualizado cada frame en un nuevo `updateLavaRiver(delta)`.
- **Render:** reusa el estilo de lava animada de `drawLavaEdges` (glow + cuerpo fundido + brasas), pero sobre una sola línea que cruza toda la pantalla según la orientación.
- **Daño:** mientras `active`, si la princesa está a ≤ ~16 px de la línea, **~18 dps + burn breve** (`onAnyEdge`). Menos letal que la arista del triángulo de las hijas (~28 dps), pero conserva el burn al cruzar.
- **Cadencia:** se dispara solo en fases 2-3; **cooldown ~12-15 s** entre activaciones (telegraph ~1 s, activo ~2.5 s). Orientación elegida al azar cada vez. Se gestiona con su propio temporizador (no en cada ciclo de secuencia), arrancado al entrar a fase 2 vía un hook `enter: ['startLavaRiver']` que pone el hazard en modo cooldown; a partir de ahí se auto-reactiva.
- **Limpieza:** se cancela junto al resto de hazards en `checkPhaseCleared`.

> El río de lava es un "triángulo de una sola arista a pantalla completa". Reaprovecha casi toda la maquinaria de render/daño del triángulo de las hijas, dándole coherencia temática (el padre hereda la mecánica de lava de sus hijas, a mayor escala).

## 3. Trío de hermanas (nv7 fuego)

### 3a. HP y movimientos del trío

Las variantes de trío (`SISTERS_TRIO` en `bosses/fire.js`) se ajustan — independientes de los valores base de SP-1:

| Hermana | hp (trío) | movimiento (trío) |
|---|---|---|
| `pyra` | 360 | `kite` |
| `vesta` | 480 | `chase` |
| `favilla` | 300 | `kite` |

Con Vesta persiguiendo y Pyra+Favilla kiteando a distinta distancia, las tres vértices del triángulo se mueven de forma variada → triángulos de lava más interesantes (el objetivo del setpiece).

### 3b. Última hermana → cancelar triángulo, volver a charcos

Hoy `updateTriangle` se apaga cuando quedan <2 hermanas vivas ("degraded to nothing") y las variantes de trío tienen `lobAoe` desactivado. Cambio:

- Cuando el trío degrada a **exactamente 1 hermana viva**, el triángulo se cancela (ya ocurre) **y** la superviviente recupera sus **charcos de lava** (`lobAoe`).
- Implementación: cada variante de trío lleva una secuencia alternativa con `lobAoe` (`soloSequence`, esencialmente su patrón solo original). Cuando GameScene detecta que un combate de trío bajó a 1 boss vivo, intercambia `def.phases` de la superviviente por su `soloSequence` y resetea su `brainState.boss`. Así la última hermana deja charcos mientras pelea sola, como en su miniboss individual.
- El enrage existente al morir una hermana (`+25% daño` a las supervivientes, "¡Hermana!") se conserva.

## 4. Summons de soldado_hielo, tiburón abisal y dama_ballena

Cubiertos por el sistema de §1. Cambios de datos en `bosses/water.js`:

- **`soldado_hielo`:** añadir step `{ do: 'summon', spawnType: 'guardia_hielo', count: 2, cap: 2, respawnMs: 15000 }` a su secuencia (de vez en cuando, no cada ciclo).
- **`tiburon_abisal`:** añadir step `{ do: 'summon', spawnType: 'tiburon_joven', count: 1, cap: 1, respawnMs: 15000 }`. (Su retrabajo de burrow/alternancia con chase va en SP-2; aquí solo el summon y el daño 30 ya viene de SP-1.)
- **`dama_ballena` (forma):** además de su summon de `ahogado` (sin tope), añadir dos steps con tope: `cangrejo_acorazado` (cap 2) y `pez_globo` (cap 2), respawn 15 s.

## 5. Animaciones de agua

### 5a. `lobAoe` por elemento (tentáculos / maremoto)

**Problema:** `executeAttack` (rama `lobAoe`) y el hook `spawnLavaFloor` pasan `color: COLORS.fireball` fijo, y `spawnZone` pinta como lava animada cualquier zona con color de fuego. En agua (Kraken, dama_ballena, dama_kraken) los "tentáculos" y el "maremoto" se ven como charcos de lava naranja.

**Fix:** la zona se pinta según el **elemento del mundo** (o un `style` declarado por el ataque). En agua, `lobAoe` produce una zona estilo **agua/tentáculo** en vez de lava. `spawnZone` gana una rama de render para `style: 'tentacle'` (agua) además de `fire`. El daño y la duración no cambian; solo el visual.

### 5b. Tentáculos del Kraken brotando del suelo

El `lobAoe` del Kraken, además de pintarse como agua, debe **leerse como tentáculo**: brota verticalmente desde el suelo en la posición telegrafiada, inflige daño y se retrae.

**Render con sprite HD** (decisión del usuario). Se genera un sprite de tentáculo pixel-art HD con un `tools/gen-*.mjs` (estilo consistente con los demás sprites del juego), con su clave `TEX.tentacle` y su recipe. La zona `lobAoe` de agua se dibuja con ese sprite anclado en la posición telegrafiada, **creciendo desde el suelo** al activarse y retrayéndose al expirar (animación por escala/altura sobre la duración de la zona). El daño y el telegraph (anillo de aviso) ya existentes no cambian. Esto convierte la generación del sprite del tentáculo en un ítem de trabajo propio dentro de SP-3 (gen-tool + recipe + clave `TEX` + integración en el render de zona).

### 5c. Telegraph/animación del remolino del Kraken

Hoy `updateWhirlpool` dibuja círculos concéntricos estáticos. Mejora: una animación de **espiral rotatoria** durante la fase `active` y un telegraph más legible en la fase `telegraph`, para que el jugador reconozca "esto es un remolino" y la zona de succión. Es polish de render sobre el hazard existente (no cambia la física de succión/DoT, que ya vive en `WhirlpoolHazard`).

### 5d. Revisar el maremoto de la dama_ballena

El "maremoto" es el `lobAoe` de radio grande (90/95). Con 5a queda pintado como agua (ola), no lava. Revisar en playtest que el radio/duración se sientan como una ola de marea y no como un charco. Sin cambio de mecánica más allá del render.

## Archivos afectados

- `src/systems/EnemyBrain.js` — helper puro `summonSlots(...)` para el tope de invocación.
- `src/scenes/GameScene.js` — tracking de summons (`_summonTrackers`, marca de hijos, decremento en `onEnemyDeath`); `executeAttack` (summon con tope, `giantFireball`, `lobAoe` por elemento); hooks `startLavaRiver` + `updateLavaRiver`; intercambio a `soloSequence` de la última hermana; render de zona `tentacle`; mejora de `updateWhirlpool`.
- `src/data/bosses/fire.js` — Ignatius (quitar `lobAoe` de ciclos, añadir `giantFireball` + summon + `startLavaRiver`, ajustar `spawnLavaFloor`); `SISTERS_TRIO` (hp 360/480/300, movimientos kite/chase/kite, `soloSequence` con `lobAoe`).
- `src/data/bosses/water.js` — `soldado_hielo`, `tiburon_abisal`, formas `dama_ballena`/`dama_kraken`: steps de summon con tope; `lobAoe` con `style`/elemento agua.
- `src/data/tuning.js` — constantes del río de lava (cooldown, telegraph, activo, 18 dps + burn) y del giant fireball si se centralizan.
- `tools/gen-*.mjs` + `src/data/sprites/recipes.js` + `src/config.js` (`TEX.tentacle`) — sprite HD del tentáculo del Kraken (generación + recipe + clave de textura).
- `tests/` — tests de `summonSlots` (puro): respeta el cap, no repone durante el cooldown, repone tras expirar.

## Estrategia de testeo

- **Unit (`node --test`):** `summonSlots` cubre la aritmética del tope/cooldown. El resto (hazards, render, tracking en escena) es Phaser → playtest.
- **Playtest manual:**
  - Ignatius: ≤3 invocados vivos, 20 s de espera al morir uno; giant fireball lenta y esquivable; río de lava aparece esporádico con orientación variable; menos charcos saturando.
  - Trío: triángulos variados; al quedar 1 hermana, el triángulo desaparece y la superviviente deja charcos de lava.
  - Soldado_hielo ≤2 guardias; tiburón abisal ≤1 tiburón joven; ballena ≤2 cangrejos + ≤2 pez globo.
  - Kraken: el remolino se reconoce como remolino; los tentáculos se ven de agua (no lava) y brotan del suelo.

## Decisiones cerradas

1. **Tentáculos del Kraken:** ✅ **sprite HD** (gen-tool + recipe + `TEX.tentacle`), no procedural.
2. **Carriles de `spawnLavaFloor`:** ✅ **2 carriles** (de 4).
3. **Río de lava:** ✅ **18 dps + burn** (menos letal que el triángulo de las hijas, pero conserva el burn).
