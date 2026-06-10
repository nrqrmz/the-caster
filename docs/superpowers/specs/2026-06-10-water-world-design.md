# Mundo de Agua (El Lago) — Documento de Diseño

**Fecha:** 2026-06-10
**Estado:** Aprobado (diseño) — pendiente plan de implementación
**Spec 2 de la iniciativa de mundos** (reusa el motor componible de Fuego; ver `2026-06-09-fire-world-enemy-engine-design.md`). Se apoya en la **estructura de 8 niveles** (`2026-06-10-campaign-8-levels-design.md`).

---

## 0. Contexto y problema

Fuego ya validó el motor componible (movimientos/ataques/modificadores + jefes por fases). Agua es el **segundo mundo**: reusa ese motor y añade **solo las piezas nuevas que su identidad exige**. Hoy Agua usa el contenido genérico (`villager`/`warrior`/`archer`, jefes-blob); este spec lo reemplaza por un mundo propio: ~20 criaturas, 5 peleas de jefe bespoke, un gimmick de arena firma (el remolino) y una pelea final de cambiaformas.

La narrativa ya existe en `regions.js`: **El Lago**, otorga **Freeze**, jefa de templo = la **Dama del Lago** ("Tu madre suplicó por su vida en estas aguas. Yo no escuché").

### Restricciones (heredadas, fijas — ver `CLAUDE.md`)
- Sin build / sin bundler. Módulos ES nativos + Phaser 3 por CDN. Mobile-only, portrait, 480×854.
- Persistencia en `localStorage`. **Split puro/Phaser:** toda decisión testeable vive en `systems/`/`data/`.
- Texturas/colores centralizados en `config.js`. Arte geométrico procedural (formas + tinte; sprites después sin tocar lógica).
- **Estándar de campaña:** 8 niveles, un jefe por nivel (nv4/5/6 minibosses, nv7 levelboss, nv8 templeboss).

### Alcance
Mundo de Agua completo: piezas nuevas + roster + 5 jefes + remolino + Dama cambiaformas + perfil de dificultad. **Fuera de alcance:** Aire/Tierra/Castillo (specs propias), nuevas skills del jugador, sprites.

---

## 1. Identidad de combate

**Agua = control + desgaste.** El reto no es esquivar una lluvia de proyectiles (eso es Fuego), sino **moverte cuando el mundo te lo impide**: te frenan, te arrastran (remolino) y, mientras, los sanadores alargan cada pelea. Es el opuesto mecánico de Fuego.

Tres pilares:
- **Control:** slows que te quitan la esquiva; el remolino que te roba el control de posición.
- **Desgaste/sostenido:** sanadores frecuentes, enemigos tanque y `splitsOnDeath` → peleas largas, **prioridad de objetivo**.
- **Anti-turtle:** el Sapo Desovador castiga jugar pasivo multiplicándose → presión para avanzar.

**Equidad (difícil ≠ injusto), reglas duras de este mundo:**
- Slow **moderado**: solo **3 enemigos** lo aplican, con tope (nunca por debajo del 45% de velocidad) y duración corta.
- El remolino es **telegrafiado y resistible** (te cuesta moverte, no te bloquea).
- Sanadores **frágiles** y de **kill prioritario**, con su cura **visible** (sabes a quién matar primero).
- Densidad de proyectiles **menor** que en Fuego; el reto viene del control y la atrición, no del bullet-hell.

**Freeze (la skill que desbloqueas aquí):** funciona **normal** sobre la chusma — te da el juguete justo cuando el mundo te llena de control (les das vuelta a la tortilla). Los **jefes resisten CC** (freeze/slow ignorados o muy reducidos en `elite`) — estándar esperado.

---

## 2. Piezas nuevas del motor (lo que Agua construye)

Todo lo demás se **reusa** del catálogo de Fuego (`chase`/`kite`/`flee`/`charge`/`orbit`/`strafe`/`erratic`/`static`; `melee`/`shootStraight`/`shootSpread`/`shootBurst`/`shootHoming`/`nova`/`lobAoe`/`summon`; `shielded`/`healAllies`/`auraDamage`/`explodesOnDeath`/`reviveOnce`). Piezas **nuevas**:

### 2.1 `onHitSlow` — frenar al JUGADOR
Hoy existe slow/freeze **sobre enemigos** (la skill Freeze del jugador), pero **no sobre el caster**. Se añade un mecanismo de **slow al caster** espejo del de `Enemy` (`slowRemaining`/`slowFactor` con piso):
- Al recibir un golpe (contacto o proyectil) de un enemigo con `onHitSlow`: velocidad del caster × **0.6** durante **1200 ms**, se refresca con nuevos golpes, **piso 0.45** (nunca por debajo del 45%).
- Lo aplican **3 enemigos**: Acólito de Escarcha, Guardia de Hielo, Burbuja Gélida.
- Aplicado en `GameScene` donde se resuelve daño al caster; consumido en `caster.moveBy`. Parámetros en `tuning.js`.

### 2.2 `burrow` — movimiento de acecho (sumergirse)
Nuevo movimiento en `EnemyBrain.MOVEMENTS`. Ciclo de estados (puro, testeable):
1. **Sumergido** (~1500 ms): **invulnerable + oculto** (no colisiona, no se dibuja o se dibuja como estela/ondas).
2. **Reposición**: se mueve/teletransporta a una posición junto al objetivo.
3. **Emerge telegrafiado** (~400 ms): anillo de aviso (lo dibuja `GameScene`).
4. **Ataque** (embiste / `dashStrike`) y **ventana vulnerable** al recuperarse.
5. Repite.
- La invulnerabilidad mientras sumergido la respeta `hitEnemy` (no recibe daño en ese estado).
- Lo usan el Tiburón Joven (#14) y, como jefes, el Tiburón Abisal y la forma-tiburón de la Dama.

### 2.3 `splitsOnDeath` — dividirse al morir
Nuevo modificador. Al morir, spawnea **2** copias menores (hp/radio reducidos, p.ej. 0.5×) de un `spawnType` dado (o de sí mismo escalado). **Una sola generación** (las crías llevan una bandera que les impide volver a dividirse) → no es infinito. Lo usa la Medusa (#13). Ejecutado en `onEnemyDeath` (`GameScene`).

### 2.4 Desove generacional (el Sapo)
El ciclo de vida que define al Sapo Desovador (jefe nv5) y al Huevo de Sapo (#19) / la Náyade (#16):
- **Huevo** (`static`, hp bajo, sin ataque) → eclosiona a los ~**3500 ms** en **Renacuajo**.
- **Renacuajo** (`zigzag`, melee débil) → crece a los ~**6000 ms** en **Sapo adulto** (`strafe` + `shootStraight`, y **pone huevos** en cooldown).
- **Tope anti-softlock:** toda la línea de ranas respeta el `CONCURRENCY_CAP` (16) — presiona de verdad pero **nunca llena la pantalla hasta trabar**. El **counter** es matar los huevos (frágiles) antes de que maduren.
- Implementación: estados/timers en el `def` + lógica de "promoción" (huevo→renacuajo→adulto) en `GameScene`/`EnemyBrain` (timer puro; el spawn es Phaser). El adulto reusa `summon` para poner huevos, con guardia de tope.

### 2.5 Remolino / Maelstrom — gimmick de arena firma
`WhirlpoolHazard` **puro/testeable** (espejo de `TriangleHazard`), renderizado y aplicado al caster por `GameScene`. Exclusivo del **Kraken** (nv7) y la **forma-kraken de la Dama** (nv8).
1. **Telegrafía + el jefe se ancla:** canaliza ~1200 ms; se dibuja el espiral desde un centro (avisa posición y tamaño).
2. **Zona de influencia:** círculo de radio R; dentro, cada frame se suma al movimiento del caster una **fuerza hacia el centro**.
3. **Fuerza graduada y resistible:** ~0 en el borde → **0.7× la velocidad del caster** en el centro. Aun en el centro, empujando hacia afuera conservas ~30% de avance neto → cuesta salir, **nunca te atrapa del todo**.
4. **El centro tiene peso:** **DoT leve** (como cruzar la lava de Fuego — cuesta pero no mata). El peligro real es perder el control de posición mientras el jefe te castiga.
5. **Pulsante:** activo ~4-5 s, se disipa, y se reforma al rato en una posición **nueva**.
6. **Sinergia:** mientras te arrastra, el jefe golpea con **tentáculos telegrafiados** (perímetro + tu posición). Peleas el tirón *y* lees los tentáculos.
7. **Escala por fase** (no degrada como el triángulo): en fase tardía, tirón más fuerte y radio seguro menor.
8. **Afecta solo al jugador** (no a enemigos/proyectiles).

### 2.6 Secuenciador de FORMAS (cambiaformas) — extensión de `BossBrain`
Hoy las fases cambian `movement`/`sequence`/`speedMul`/`enter`, pero **no** la criatura (tex/stats/resistencia). Para la Dama se añade una capa **encima** del secuenciador de fases:
- Un jefe puede declarar **`forms: [formaA, formaB, …]`**; cada forma es una **criatura completa** (`tex`, `color`, `radius`, `speed`, `hp`, `resist`, + su kit `movement`/`sequence`/`phases`).
- **Una barra de vida por forma.** Al agotar la HP de una forma, **no muere: se transforma** a la siguiente (HP llena de esa forma). Solo la muerte de la **última** forma termina la pelea.
- **Transformación = telegrafía (~1000 ms) + breve invulnerabilidad + re-tint/re-tex** + efecto "el agua cambia de forma". **Limpia sus propios adds** (cada forma empieza fresca).
- Cada forma sube **HP y `resist`** (reducción de daño base).
- **Motor:** el "secuenciador de formas" es lógica pura/testeable (orden, transformación al llegar a 0 HP, fin en la última). Cada forma corre su kit con el `BossBrain` existente. El re-tint/invuln/barra-por-forma = Phaser.

### 2.7 `resist` (reducción de daño) + inmunidad a CC de jefes
- `resist` (0..1): reducción de daño base de una forma/enemigo (distinto de `shielded`, que es situacional). Lo usan las formas de la Dama.
- Los `elite` (minibosses/levelboss/templeboss y formas) **resisten CC**: `applyFreeze`/`applySlow` se ignoran o se reducen fuertemente en ellos (decisión A — Freeze pega full en la chusma, los jefes resisten).

---

## 3. El roster de Agua (20 criaturas)

Identidad: control + desgaste, **muchos sanadores y criaturas del lago**, densidad de proyectiles menor que Fuego. 🔧 = usa pieza nueva. Stats exactas se afinan en implementación.

### 3.1 Ahogados / cultistas de la Dama (humanos — nv1–6)
| # | Criatura | Movimiento | Ataque | Modificador | Rol |
|---|---|---|---|---|---|
| 1 | Acólito de Escarcha | `kite` | `shootStraight` | 🔧`onHitSlow` | Ranged que te frena |
| 2 | Lanzahielos | `kite` | `shootSpread` (3) | — | Negación de área |
| 3 | Ahogado | `chase` lento | `melee` | — | Relleno melee (enjambre) |
| 4 | Sacerdotisa del Lago | `flee` | — | `healAllies` | **Sanadora, kill prioritario** |
| 5 | Vidente de Marea | `kite` | `shootHoming` | — | Te obliga a esquivar |
| 6 | Guardia de Hielo | `charge` | `melee` | `shielded` + 🔧`onHitSlow` | Bruiser, flanquear |
| 7 | Corista del Abismo | `orbit` | — | `auraDamage` | Aura andante, kill prioritario |

### 3.2 Bestias del lago (elementales — nv4–8)
| # | Criatura | Movimiento | Ataque | Modificador | Rol |
|---|---|---|---|---|---|
| 8 | Renacuajo | `zigzag` | `melee` | — | Add (del Sapo/Náyades) |
| 9 | Rana Saltarina | `erratic` | `melee` | — | Melee saltarín |
| 10 | Sapo Escupidor | `strafe` | `shootStraight` | — | Ranged |
| 11 | Pez Globo | `erratic` | `melee` | `explodesOnDeath` | Castiga matarlo de cerca |
| 12 | Cangrejo Acorazado | `chase` muy lento | `melee` | `shielded` | Tanque, flanquear |
| 13 | Medusa | `erratic` | `auraDamage` | 🔧`splitsOnDeath` | Se divide al morir |
| 14 | Tiburón Joven | 🔧`burrow` | `dashStrike` | — | Acecha sumergido y embiste |
| 15 | Serpiente Marina | `kite` | `shootSpread` | — | Ranged serpenteante |
| 16 | Náyade | `flee` | `summon` (renacuajos) | `healAllies` | Soporte invocador |
| 20 | Tortuga Acorazada | `charge` | `melee` | `shielded` (alto) + `resist` | Tanque embestidor blindado |

### 3.3 Invocados / ambientales
| # | Criatura | Movimiento | Ataque | Modificador | Rol |
|---|---|---|---|---|---|
| 17 | Burbuja Gélida | `erratic` | — | `auraDamage` + 🔧`onHitSlow` | Presión ambiental que congela al rozar |
| 18 | Tótem de Escarcha | `static` | `nova` (lenta) | `auraDamage` | Torreta/peligro fijo |
| 19 | Huevo de Sapo | `static` | — (eclosiona) | 🔧desove | Unidad de spawn del Sapo/Náyade |

### 3.4 Calendario de introducción (8 niveles)
- **Nv1** — Ahogado, Acólito de Escarcha, Lanzahielos.
- **Nv2** — + Sacerdotisa del Lago, Renacuajo.
- **Nv3** — + Vidente de Marea, Sapo Escupidor, Rana Saltarina.
- **Nv4** — + Guardia de Hielo, Cangrejo Acorazado, Pez Globo · **miniboss: Soldado de Hielo**.
- **Nv5** — + Corista del Abismo, Serpiente Marina, Burbuja Gélida · **miniboss: Sapo Desovador**.
- **Nv6** — + Medusa, Tiburón Joven, Tortuga Acorazada · **miniboss: Tiburón Abisal**.
- **Nv7** — Náyade y Tótem de Escarcha como apoyo · **levelboss: el Kraken** (remolino, nivel dedicado).
- **Nv8** — roster como minions · **templeboss: la Dama del Lago (cambiaformas)**.

---

## 4. Las 5 peleas de jefe

Identidad de jefes: **control + atrición**, cada uno con un gancho propio. Vida exacta se afina en playtest (referencia: miniboss ~300-520, levelboss ~650, templo repartido por forma).

### 4.1 Soldado de Hielo — bruiser (nv4 miniboss)
Caballero de escarcha; su contacto te congela el paso.
- **Movimiento:** `charge`. **Modificadores:** `shielded` (frontal) + 🔧`onHitSlow`.
- **Fase 1 (100–50%):** `charge` (línea telegrafiada) → `dashStrike` al llegar (aplica `onHitSlow`) → recupera (vulnerable) → `shootStraight` (esquirla) → repite.
- **Fase 2 (<50%):** `speedMul`; doble embestida; escudo más duro (pegar por la espalda).
- **Sensación:** lee la embestida, castiga la recuperación; el slow-al-golpear hace caro reposicionarse.

### 4.2 Sapo Desovador — summoner anti-turtle (nv5 miniboss)
Se multiplica si juegas pasivo.
- **Movimiento:** `strafe` (mantiene media distancia, protegido por su prole). **Gimmick:** 🔧desove generacional.
- **Fase 1 (100–50%):** pone **huevo** (telegrafiado) → `shootStraight` (escupe) → repite. Huevos → renacuajos → adultos.
- **Fase 2 (<50%):** pone **más huevos por ciclo** + `shootSpread`; la presión sube — si no limpiaste, te ahogan.
- **Tope:** la línea de ranas respeta `CONCURRENCY_CAP`. Counter: matar huevos.
- **Sensación:** check de agresión y tempo; turtlear = ahogarte en ranas.

### 4.3 Tiburón Abisal — acecho (nv6 miniboss)
Mucha vida; aparece y desaparece bajo el agua.
- **Movimiento:** 🔧`burrow` (sumerge → reposiciona → emerge telegrafiado → `dashStrike` → vulnerable). Mucha HP.
- **Fase 1:** ciclo burrow-dash; el emerger avisado por estela/aleta.
- **Fase 2 (<40%):** ciclo más rápido, sumersión más corta (frenesí), doble embestida.
- **Sensación:** lee la estela, ceba la embestida, castiga la recuperación; el sumergirse da ritmo (amenaza/respiro).

### 4.4 El Kraken — setpiece del remolino (nv7 levelboss)
Su propio nivel (estándar de 8 niveles). El gimmick necesita espacio para leerse.
- **Movimiento:** anclado/lento (es enorme). **Gimmick:** 🔧remolino.
- **Fase 1 (100–60%):** tentáculos telegrafiados (`lobAoe` en tu posición + perímetro) + `nova` de tinta/agua.
- **Fase 2 (<60%) `enter: spawnWhirlpool`:** maelstrom pulsante mientras los tentáculos golpean — peleas el tirón **y** esquivas tentáculos.
- **Fase 3 (<30%) frenesí:** tirón más fuerte, radio seguro menor, tentáculos más rápidos, invoca anguilas/adds.
- **Sensación:** el puzzle de movilidad de Agua — posicionarte bajo el tirón mientras lees telegrafías.

### 4.5 La Dama del Lago — cambiaformas (nv8 templeboss)
"El agua no tiene forma fija." Examen final del mundo; cicla por las criaturas que aprendiste a pelear y muere como lo que era.
- **`forms: [maga, tiburón, kraken, ballena, maga_final]`** (Sección 2.6). Barra por forma; cada forma sube HP/`resist`; transformación telegrafiada con invuln breve; limpia adds al cambiar.

| Forma | Kit | HP / Resist |
|---|---|---|
| **Maga** (humanoide) | `kite` + `shootSpread` (escarcha) + `shootHoming` · enseña su ritmo | baja / 0 |
| **Tiburón** | 🔧`burrow` + `dashStrike` · acecha y embiste | media / baja |
| **Kraken** | 🔧remolino + tentáculos (+ `nova`) · estalla el gimmick | alta / media |
| **Ballena** (final) | muy lenta + oleadas tidales (`lobAoe`/`nova` grandes) + invoca ahogados · el muro | máxima / alta |
| **Maga final** | ~20 HP, kit mínimo (un último frost o nada) | — |

- **Muerte:** al caer la ballena, **revierte a la maga con ~20 HP** (canalización de "el agua se deshace") y **muere como maga**. La muerte de esa forma dispara el `onClear` (diálogo de la Dama, ya en `regions.js`).
- **Sensación:** boss-rush en un cuerpo; el clímax recapitula el mundo y cierra con un beat humano.

---

## 5. Dificultad y oleadas (perfil de Agua)

Reusa el modelo de dos factores (`baseDifficulty(levelIndex) × escalaPoder(save)`); `BASE_CURVE` ya cubre 8 niveles. El **perfil de Agua** inclina hacia **vida/sostenido y control**, no hacia densidad de proyectiles:
- **Más HP y sanadores**, menos disparos en pantalla que Fuego. El reto es atrición + posicionamiento, no bullet-hell.
- **Regla de composición de oleada:** *ancla* (un sanador o un slower que define el puzzle) + *relleno* (ahogados/renacuajos) + *una amenaza de movilidad* (tiburón joven que acecha o un cargador). Ej. nv5: Sacerdotisa (ancla a proteger/matar) + Ahogados (relleno) + Guardia de Hielo (te frena).
- **Slow moderado** (3 enemigos, con tope) y **remolino solo en jefes** → el control se siente, sin frustrar.
- **Anti-turtle** vía el Sapo: incentiva avanzar.
- Topes: `CONCURRENCY_CAP` (16) compartido; la línea de ranas cuenta dentro del tope.
- Tuning centralizado en `tuning.js` (params de slow al caster, remolino, tiempos de burrow, ciclo de desove).

---

## 6. Testing

Convención: **lógica pura → `node --test`; lo Phaser → playtest**.

Nuevos tests de lógica pura:
- `EnemyBrain` (extiende): movimiento `burrow` (transiciones sumergido→reposición→emerge→ataque, timing).
- `CasterSlow` / `CombatSystem` (extiende): slow al caster (factor, refresco, **piso 0.45**, expiración).
- `splitsOnDeath`: genera 2 crías, **no re-split** (bandera de generación).
- Desove generacional: huevo→renacuajo→adulto por timers; respeto del tope.
- `WhirlpoolHazard`: vector de fuerza por distancia (0 en borde, 0.7× en centro), "está-dentro", **DoT del centro**, escala por fase.
- `FormSequencer` (extiende `BossBrain`): orden de formas, transformación al llegar a 0 HP, **revert-a-maga** final, fin de pelea en la maga_final; subida de HP/`resist` por forma.
- `resist`/inmunidad CC: el daño se reduce por `resist`; `applyFreeze`/`applySlow` se ignoran en `elite`.
- **Regresión:** Fuego intacto (las piezas reusadas no cambian de comportamiento); las 4 piezas nuevas no afectan a enemigos que no las declaran.

Playtest (Phaser): render del espiral y la fuerza del remolino; invuln/telegrafía del burrow; barra-por-forma y re-tint de la Dama; densidad y tope de la línea de ranas; feel del slow al caster.

---

## 7. Resumen de archivos afectados (orientativo)

**Nuevos:**
- `src/data/enemies/water.js` — roster de Agua (20 recetas).
- `src/data/bosses/water.js` — Soldado de Hielo, Sapo Desovador, Tiburón Abisal, Kraken, Dama (con `forms`).
- `src/systems/WhirlpoolHazard.js` — gimmick del remolino (puro).
- Tests: `WhirlpoolHazard`, `FormSequencer` (o extensión de `BossBrain.test`), extensiones de `EnemyBrain`/`CombatSystem`.

**Modificados:**
- `src/systems/EnemyBrain.js` — movimiento `burrow`.
- `src/systems/BossBrain.js` — secuenciador de formas (cambiaformas).
- `src/objects/Enemy.js` — estado de burrow (invuln/oculto), `resist`, inmunidad CC de elites.
- `src/scenes/GameScene.js` — slow al caster (`onHitSlow`), `splitsOnDeath`, promoción del desove, render+fuerza del remolino, transformación/barra de formas.
- `src/objects/Caster.js` — slow del caster en `moveBy`.
- `src/scenes/UIScene.js` — barra de vida por forma del jefe (cambiaformas).
- `src/data/enemies/index.js` — registrar el roster de Agua.
- `src/data/regions.js` — oleadas de Agua (composición/calendario) + cableado de los 5 jefes.
- `src/data/tuning.js` — params: slow al caster, remolino, burrow, ciclo de desove.
- `src/config.js` — claves `TEX`/`COLORS` de Agua (formas geométricas + tintes de hielo/azul).

---

## 8. Fuera de alcance (specs posteriores)

- Mundos Aire, Tierra y el Castillo (cada uno su spec).
- Nuevas skills/sinergias del jugador (p.ej. un dash que escape del remolino limpio — gancho mencionado).
- Arte con sprites (sigue geométrico procedural).
- Re-balanceo fino entre mundos (se afina en playtest por mundo).
