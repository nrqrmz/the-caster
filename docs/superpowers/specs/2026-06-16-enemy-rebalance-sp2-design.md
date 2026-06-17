# SP-2 — Features de comportamiento: facing del can_lava y retrabajo del burrow

**Fecha:** 2026-06-16
**Serie:** Revisión de enemigos Fuego/Agua (SP-2 de 3). SP-1 = rebalance de stats + fixes localizados. SP-3 = sistema de invocación + setpieces de boss.

## Objetivo

Dos cambios de **comportamiento** que requieren lógica nueva (no solo datos), ambos empujados a módulos puros y testeables (`FacingController`/`EnemyBrain`) según la convención del proyecto:

1. El **can_lava** (perro de lava) mira siempre a la princesa: su cabeza apunta hacia ella y el sprite se voltea (`flipX`) cuando ella cruza al lado opuesto.
2. Retrabajo del movimiento **`burrow`** para que alterne *nadar hacia la princesa (vulnerable)* con *sumergirse (inalcanzable)*, con una ventana de daño más larga y regulada, en vez del emerge→golpe→sumerge casi instantáneo de hoy.

Fuera de alcance: stats del tiburón/can_lava (van en SP-1), el summon de tiburón_joven por el abisal (SP-3), animaciones del Kraken (SP-3).

## 1. can_lava mira a la princesa

### Estado actual

`FacingController.update(vx, vy, aim)` (en `src/objects/FacingController.js`) decide la dirección y el `flipX` del sprite. Hoy:
- Si el enemigo se mueve, el facing se deriva de la **velocidad** (`pickFacing(vx, vy)`).
- El parámetro `aim` (apuntar a un punto del mundo) **solo** se usa cuando el enemigo está quieto, y hoy únicamente se lo pasa la heroína (auto-aim). `Enemy.preUpdate` llama `this.facing.update(vx, vy)` sin `aim`.

Resultado: el can_lava, que usa movimiento `charge` (windup quieto → dash), mira según su velocidad de dash, no hacia la princesa. Durante el windup (quieto, sin `aim`) mantiene la última dirección.

### Cambio

Marcar el can_lava con un flag de datos `facePlayer: true` en su def (`enemies/fire.js`). Para los enemigos con ese flag, el facing horizontal se rige **siempre** por la posición de la princesa, no por la velocidad:

- **`pickFacing` (puro):** sin cambios de firma; se añade una rama de orientación-a-objetivo que ya existe conceptualmente (calcula `flipX` desde un vector). La lógica nueva vive en `FacingController`.
- **`FacingController`:** nuevo modo `facePlayer` (recibido en el constructor desde `def.facePlayer`). Cuando está activo, `update` calcula el `flipX` a partir del vector `aim - sprite` **cada frame** (no solo en idle): la cabeza apunta a la princesa y el sprite se voltea en el instante en que ella cruza la vertical del perro. El estado de animación (`walk`/`idle`) sigue derivándose del movimiento; solo el `flipX`/dirección lateral pasa a regirse por el `aim`.
- **`Enemy.preUpdate`:** cuando `this.def.facePlayer` y existe `this.scene.caster`, pasar `aim = { x: caster.x, y: caster.y }` a `facing.update(vx, vy, aim)`. (El `Enemy` ya tiene `this.scene`; la heroína vive en `scene.caster`.)

### Detalle del flip

El sprite del perro es de vista lateral (`side`). La regla operativa: `flipX = (caster.x < enemy.x)` — si la princesa está a la izquierda, el sprite se voltea; si está a la derecha, no. Esto produce exactamente "si la princesa cruza esa línea en dirección opuesta, invertimos el sprite". Sin histéresis en SP-2; si el parpadeo cuando la princesa queda justo sobre la línea molesta en playtest, se añade una banda muerta de ~8 px (tunable) en una iteración posterior.

### Tests

`pickFacing` es puro y ya está testeado. Añadir un test para la rama `facePlayer` del `FacingController` no es trivial (toca anims de Phaser), así que la cobertura unitaria se limita a la función pura que calcula el `flipX` desde el vector objetivo; el comportamiento se valida en playtest.

## 2. Retrabajo del movimiento `burrow`

### Estado actual

`MOVEMENTS.burrow` (en `src/systems/EnemyBrain.js`) es una máquina de estados:

`submerged` (1500 ms, invuln + oculto) → `reposition` (teletransporta junto a la princesa) → `telegraph` (400 ms, anillo de aviso) → `attack` (un `dashStrike` instantáneo) → `recover` (600 ms, vulnerable) → `submerged`.

Problemas que reporta el usuario:
- Emerge y se sumerge casi de inmediato: la única ventana vulnerable es `recover` (~600 ms) más el telegraph. Demasiado corta para hacerle daño.
- Nunca "nada hacia la princesa" de forma visible: teletransporta y golpea. No hay fase de persecución.

Lo usan: `tiburon_joven` (enemigo), `tiburon_abisal` (boss) y `dama_tiburon` (forma de La Dama del Lago). El cambio aplica a los tres — deseable, pero a tener en cuenta (ver §Notas).

### Nuevo ciclo

Alternar **sumergido (inalcanzable)** con **superficie persiguiendo (vulnerable)**, con una ventana de superficie larga:

1. **`submerged`** (`submergeMs`, p. ej. 1500 ms): invuln + oculto, velocidad 0. Al expirar → `reposition`.
2. **`reposition`**: teletransporta a un punto cercano a la princesa (como hoy, para reaparecer con amenaza). → `emerge`.
3. **`emerge`** (`emergeMs` telegraph, p. ej. 450 ms): anillo de aviso de superficie (`surfacing: true`). Aún invulnerable durante el aviso (se mantiene el comportamiento de telegraph). Al expirar → `surface`.
4. **`surface`** (`surfaceMs`, p. ej. 2500 ms): **nada hacia la princesa con `chase`** a velocidad normal, **vulnerable** (`vulnerable: true`) toda la fase. Hace daño por contacto (melee). Opcionalmente, un `dashStrike` único al entrar a la superficie (lunge) si la def lo declara, conservando la mecánica de golpe telegrafiado. Al expirar `surfaceMs` → `submerged` (vuelve a hundirse).

Cambios de flags que ya lee `Enemy`/`GameScene`:
- `submerged: true` durante `submerged` y `emerge` → `_burrowed` (invuln, oculto).
- `surfacing: true` durante `emerge` → anillo de aviso.
- `vulnerable: true` durante toda la fase `surface` → el enemigo recibe daño y persigue.
- `dashStrike: true` solo en el frame del lunge de entrada (si la def lo usa).

Resultado: ventana vulnerable de ~2.5 s en la que el enemigo **nada visiblemente hacia la princesa** y puede recibir daño, alternando con ~2 s de inmersión inalcanzable. Es la alternancia burrow/chase que pide el usuario.

### Parámetros (tunables, en `tuning.js` + overrides por def)

Nuevas constantes en `src/data/tuning.js` (defaults del burrow):

| Constante | Valor propuesto | Rol |
|---|---|---|
| `BURROW_SUBMERGE_MS` | 1500 (sin cambio) | inmersión invuln |
| `BURROW_TELEGRAPH_MS` | 450 (de 400) | anillo de emerge |
| `BURROW_SURFACE_MS` | 2500 (**nuevo**) | ventana de superficie/persecución vulnerable |

Se elimina la dependencia de `BURROW_RECOVER_MS` en el nuevo flujo (ya no hay fase `recover` separada; la vulnerabilidad vive en `surface`). Cada def puede sobreescribir vía `movement.surfaceMs` / `submergeMs` / `emergeMs`. Los defs de `tiburon_joven`, `tiburon_abisal` y las formas `dama_tiburon` se ajustan a estos campos (datos), reemplazando `repositionMs`/`recoverMs`/`attackMs`/`dashMul` por el nuevo esquema donde aplique.

### Interacción con BossBrain (tiburón abisal y dama_tiburon)

`tiburon_abisal` y `dama_tiburon` usan `phases` (BossBrain) para sus ataques **en paralelo** al movimiento `burrow`. Hoy sus secuencias disparan `dashStrike` + `wait`. Con la nueva ventana de superficie larga, las secuencias de esos bosses deben re-tunearse (datos en `bosses/water.js`) para que sus `dashStrike`/`wait` ocurran durante la fase `surface` (vulnerable) y no mientras están sumergidos. Es ajuste de timings en la def, no lógica nueva; se itera en playtest. El movimiento y el ataque siguen desacoplados (no se introduce sincronización dura entre ambos en SP-2).

### Tests

`MOVEMENTS.burrow` es puro → test unitario de la nueva máquina de estados: avanzar el reloj y assertar las transiciones (`submerged`→`emerge`→`surface`→`submerged`), que `surface` emite `vulnerable: true` y velocidad hacia el objetivo, y que `submerged`/`emerge` emiten `submerged: true`. Reemplaza/extiende los tests existentes del burrow.

## Archivos afectados

- `src/objects/FacingController.js` — modo `facePlayer` (flip por `aim` cada frame).
- `src/objects/Enemy.js` — `preUpdate` pasa `aim = caster` cuando `def.facePlayer`.
- `src/data/enemies/fire.js` — `can_lava`: añadir `facePlayer: true`.
- `src/systems/EnemyBrain.js` — `MOVEMENTS.burrow`: nueva máquina de estados con fase `surface`/chase vulnerable.
- `src/data/tuning.js` — `BURROW_SURFACE_MS` (nuevo), `BURROW_TELEGRAPH_MS` ajustado; retiro de uso de `BURROW_RECOVER_MS` en el flujo.
- `src/data/enemies/water.js` — `tiburon_joven`: campos de burrow al nuevo esquema.
- `src/data/bosses/water.js` — `tiburon_abisal` y formas `dama_tiburon`: campos de burrow + re-tuneo de secuencias para disparar en la fase `surface`.
- `tests/` — tests nuevos/actualizados del burrow (puro) y del cálculo de flip `facePlayer`.

## Estrategia de testeo

- **Unit (`node --test`):** máquina de estados del burrow; función pura de flip por objetivo. Los tests existentes del burrow se actualizan al nuevo flujo.
- **Playtest manual:** (a) el can_lava siempre mira a la princesa y voltea al cruzar; (b) el tiburón nada visiblemente hacia la princesa durante ~2.5 s recibiendo daño, luego se hunde ~1.5 s invulnerable; la ventana de daño se siente justa, no frustrante.

## Notas

- El retrabajo del `burrow` también afecta a `dama_tiburon` (forma del temple boss de agua). Es coherente con la queja del usuario sobre el burrow en general, pero conviene revisar esa pelea en playtest tras el cambio.
- El `dashStrike` de entrada en la superficie es opcional por def; si en playtest el lunge se siente injusto con la ventana larga, se deja al tiburón solo con persecución + contacto.
