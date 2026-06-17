# Mundo de Aire (La Torre Montaña) — Documento de Diseño

**Fecha:** 2026-06-17
**Estado:** Aprobado (diseño) — pendiente plan de implementación
**Spec 3 de la iniciativa de mundos** (reusa el motor componible de Fuego/Agua; ver `2026-06-09-fire-world-enemy-engine-design.md` y `2026-06-10-water-world-design.md`). Se apoya en la **estructura de 8 niveles** (`2026-06-10-campaign-8-levels-design.md`).

---

## 0. Contexto y problema

Fuego validó el motor componible (movimientos/ataques/modificadores + jefes por fases). Agua añadió control/atrición, el remolino y la cambiaformas (`forms:` del `BossBrain`). Aire es el **tercer mundo**: reusa todo ese motor y añade **solo las piezas que su identidad exige**. Hoy Aire usa el contenido genérico (`villager`/`warrior`/`archer`, jefes-blob) y mecánicas de templo placeholder; este spec lo reemplaza por un mundo propio: **20 criaturas**, **5 peleas de jefe bespoke**, dos mecánicas-setpiece firma (el **tornado-ojo** y el **ritual del líder intangible**) y una pelea final de **vampiro inmortal cambiaformas**.

La narrativa base ya existe en `regions.js`: **Aire** otorga **Lightning**; jefe de templo = un vampiro. Este spec fija la identidad: **La Torre Montaña**, una ciudadela en lo alto de la montaña entre nubes de tormenta, gobernada por **Sir Galahad** — el caballero artúrico que encontró el Grial y fue maldecido con la inmortalidad (el santo vuelto monstruo). Conecta con el hilo artúrico de Agua (ver §8: renombrar la Dama del Lago → **Morgan le Fay**).

### Restricciones (heredadas, fijas — ver `CLAUDE.md`)
- Sin build / sin bundler. Módulos ES nativos + Phaser 3 por CDN. Mobile-only, portrait, 480×854.
- Persistencia en `localStorage`. **Split puro/Phaser:** toda decisión testeable vive en `systems/`/`data/`.
- Texturas/colores centralizados en `config.js`. Arte geométrico/sprites; lógica no toca texturas.
- **Estándar de campaña:** 8 niveles, un jefe por nivel (nv4/5/6 minibosses, nv7 levelboss, nv8 templeboss).

### Alcance
Mundo de Aire completo: piezas nuevas + roster (20) + 5 jefes + tornado-ojo + ritual + Galahad cambiaformas + perfil de dificultad. **Fuera de alcance:** Tierra/Castillo (specs propias), nuevas skills del jugador, sprites finales. El renombrado de la Dama → Morgan le Fay es un **ajuste pequeño aparte** (§8), no entra en el plan de implementación de Aire.

---

## 1. Identidad de combate

**Aire = velocidad + desplazamiento.** Donde Agua te quita el control por **fricción** (te frena, te sujeta), Aire te lo quita por **fuerza**: te empuja —a veces hacia los enemigos—, te eleva una fracción de segundo, te aturde con descargas, y el gran tornado te jala al ojo. El reto es **reacción y posicionamiento**, no la densidad de balas (Fuego) ni la vida/sostenido (Agua).

Tres pilares:
- **Velocidad:** enemigos rápidos de picada y retirada (voladores), duelistas que dashean y esquivan tus orbes. El mundo se mueve rápido y te obliga a reaccionar.
- **Desplazamiento:** ráfagas que te empujan, tornaditos que te elevan, el tornado-ojo que te jala a un punto predecible. Pierdes el control de tu posición por la fuerza.
- **Atrición vampírica (al servicio del pilar):** el **drenado** castiga dejar que te toquen → te obliga a seguir móvil. No es el sostenido de Agua (sanadores), sino "no te dejes pegar".

**Equidad (difícil ≠ injusto), reglas duras de este mundo:**
- **Stun/lift muy breves y telegrafiados:** stun **0.3 s**, lift **0.5 s**, siempre avisados (el tornadito/descarga se ve venir). El efecto dura poco pero la **consecuencia** pesa (elevado = no esquivas un instante; empujado = caes donde no querías) → lo respetas y juegas para no comértelo otra vez.
- **Freno anti-encadenado:** tras recibir stun/lift, una **ventana de inmunidad** corta (o diminishing) impide que un enjambre te **perma-bloquee** hasta morir. La tensión se mantiene; la frustración no.
- **Empuje resistible:** el `onHitPush` y el tornado-ojo te desplazan, no te bloquean; siempre conservas avance neto empujando en contra.
- Densidad de proyectiles **menor** que en Fuego; el reto viene del movimiento y el desplazamiento, no del bullet-hell.

**Lightning (la skill que desbloqueas aquí):** encaja con el mundo — los enemigos rápidos se **agrupan** (enjambres de murciélagos), gran objetivo para la cadena. Pega **full** sobre la chusma; los `elite` (minibosses/levelboss/formas) **resisten CC** — estándar heredado.

---

## 2. Piezas nuevas del motor (lo que Aire construye)

Todo lo demás se **reusa** del catálogo de Fuego/Agua (`chase`/`kite`/`flee`/`charge`/`orbit`/`strafe`/`erratic`/`static`/`zigzag`/`burrow`; `melee`/`shootStraight`/`shootSpread`/`shootBurst`/`shootHoming`/`nova`/`lobAoe`/`summon`/`dashStrike`; `shielded`/`healAllies`/`auraDamage`/`explodesOnDeath`/`reviveOnce`/`onHitSlow`/`splitsOnDeath`/`resist`; secuenciador de fases y de **formas** del `BossBrain`). Piezas **nuevas**:

### 2.1 `stun` / `lift` al caster — pérdida total y breve de control
Hoy existe slow al caster (`onHitSlow`, de Agua), pero no la **pérdida total de control**. Se añade un estado del caster:
- **`stun`**: el caster no puede moverse ni castear durante **300 ms**.
- **`lift`**: el caster es elevado durante **500 ms** — no puede moverse ni esquivar (puede seguir recibiendo daño); flavor de "te alza el viento".
- Ambos **telegrafiados** por la fuente (tornadito, descarga). Estado en `Caster` (`stunRemaining`/`liftRemaining`), espejo de `slowRemaining`; consumido en `caster.moveBy`/auto-aim (no dispara mientras está stuneado/elevado).
- **Anti-encadenado:** tras expirar un stun/lift, `ccImmuneRemaining` (~600 ms) durante el cual nuevos stun/lift se ignoran. Evita el perma-lock.
- Lo aplican: tornaditos (`lift`), descargas/rayos `onHitStun` (`stun`), y el roce del Fuego Fatuo (`onHitStun`). Parámetros en `tuning.js`.

### 2.2 `onHitPush` — empuje direccional al caster
Nuevo modificador/efecto de impacto. Al recibir un golpe de un enemigo/ataque con `onHitPush`, el caster recibe un **impulso** (vector desde el origen del golpe) de magnitud `pushForce` aplicado durante `pushMs`. Espejo del tirón del remolino de Agua, pero **dirigido/hacia afuera** (y a veces, por diseño de encuentro, hacia el peligro). Resistible: empujando en contra conservas avance neto. Aplicado en `GameScene` donde se resuelve daño/impacto al caster; consumido en `caster.moveBy`. Lo usan el Torbellino Errante y la forma Murciélago Gigante de Galahad.

### 2.3 `TornadoHazard` — gimmick de arena firma (el tornado-ojo)
`TornadoHazard` **puro/testeable** (espejo de `WhirlpoolHazard`), renderizado y aplicado al caster por `GameScene`. Exclusivo del **Elemental de Tormenta** (nv6).
1. **Telegrafía:** se dibuja el embudo desde un centro (avisa posición y tamaño).
2. **Zona de influencia:** círculo de radio R; dentro, cada frame se suma al movimiento del caster una **fuerza hacia el centro** (el ojo).
3. **Fuerza graduada y resistible:** ~0 en el borde → fuerte cerca del centro. Aun cerca del ojo, empujando hacia afuera conservas avance neto → cuesta salir, **nunca te atrapa del todo**.
4. **El ojo es la trampa, no el daño** (inversión del remolino de Agua, cuyo centro *duele*): el ojo es **apacible respecto al tornado**, pero te **encierra en un punto predecible** → blanco fácil para los rayos/tornaditos del Elemental. El peligro real es perder el control de posición mientras el jefe te castiga ahí.
5. **Pulsante:** activo ~4–5 s, se disipa y se reforma en una posición **nueva**.
6. **Escala por fase:** en fase tardía, tirón más fuerte y radio seguro menor.
7. **Afecta solo al jugador** (no a enemigos/proyectiles). Los **voladores** (`flying`) lo ignoran (vuelan por encima).

### 2.4 `drain` (robo de vida) — modificador
Nuevo modificador. Cuando el enemigo golpea al caster (contacto o proyectil), **se cura** `drain.heal` HP (clamp a su HP máx). Es la atrición vampírica del mundo: castiga el contacto, refuerza "mantente móvil". Ejecutado donde se resuelve el daño al caster (`GameScene`). Lo usan muchos humanoides vampiros y formas de Galahad.

### 2.5 `evade` — movimiento de esquiva (dash dodge)
Nuevo movimiento en `EnemyBrain.MOVEMENTS`. El enemigo persigue/kitea normal, pero al detectar un **orbe entrante** dentro de un radio de aviso (o en cooldown), ejecuta un **dash lateral corto** para esquivar → tu auto-fuego (que apunta al más cercano) deja de ser fiable, te obliga a posicionarte y a usar skills. Puro/testeable (decisión de esquivar + dirección del dash); el dash en sí lo ejecuta el cuerpo Arcade. Cooldown para que no sea inmune. Lo usan el Duelista Nocturno, el Caballero de Sangre y la forma humana de Galahad.

### 2.6 `flying` (flag) — inmune al terreno
Flag de criatura. Un enemigo `flying` **no es afectado por los gimmicks de suelo** (tornado-ojo, ráfagas de empuje ambientales) — vuela por encima — y tiende a moverse rápido/errático (murciélagos, arpías, espíritus). Respetado por `TornadoHazard`/zonas en `GameScene` (saltan a los `flying`). Es solo un flag de datos; no cambia colisión con el caster ni con tus orbes.

### 2.7 `untargetable` (flag) — fuera del auto-fuego
Flag de criatura. Un enemigo `untargetable` **es ignorado por `Caster.nearestEnemy`** (auto-fuego) y por `SkillTargeting` (Lightning), y **no recibe daño** (`hitEnemy` lo ignora). Hermano del invuln del `burrow` sumergido, pero persistente y declarado. Lo usa el **Líder Cultista** (nv7) durante su fase de canalización, con un **escudo de ritual visible** para que la intangibilidad se lea como intencional, no como bug. Se desactiva por evento (barra de ritual llena) → el líder se vuelve targeteable.

### 2.8 Avance de fase por **meter** (no por HP) — extensión de `BossBrain`
Hoy las fases de un jefe avanzan por **umbral de HP** (`from: 0.5`). El **Líder Cultista** (nv7) avanza por un **meter externo** (la barra del ritual): su Fase A (canalizando, `untargetable`, invocando) **no termina por HP** sino cuando la **barra se llena** (timer mientras canaliza). Al llenarse, transiciona a Fase B (targeteable, deja de invocar, pelea normal de ~200 HP). Se añade un disparador de fase **por evento/meter** en el `BossBrain` (o un manejo bespoke en `GameScene` para nv7). La barra del ritual es estado puro/testeable (llenado por timer, evento al completarse).

> **Reuso (sin motor nuevo):** la **cambiaformas** de Galahad (§4.5) reusa íntegro el secuenciador `forms:` del `BossBrain` (la Dama del Lago). Lo único nuevo es *flavor* (animación "cae cadáver → resucita" en la transición, y "se quema" en la muerte real) y datos (la forma Rage ×2 = valores de la forma Rage duplicados).

---

## 3. El roster de Aire (20 criaturas)

Identidad: velocidad + desplazamiento, vampiros y criaturas de tormenta. Densidad de proyectiles menor que Fuego. 🔧 = usa pieza nueva. Stats de partida; se afinan en implementación/playtest.

### 3.1 Humanoides vampiros (por tierra; les afecta el terreno) — nv1–7
| # | Criatura | HP | Spd | Dmg | R | Movimiento | Ataque | Modificadores | Rol |
|---|---|----|----|----|---|---|---|---|---|
| 1 | Siervo de la Torre | 24 | 95 | 9 | 16 | `chase` | `melee` | 🔧`drain`(+4) | Relleno melee veloz |
| 2 | Duelista Nocturno | 30 | 120 | 12 | 16 | 🔧`evade` | `dashStrike` | 🔧`drain`(+5) | Esquiva tus orbes, hit-and-run |
| 3 | Acólito del Trueno | 22 | 70 | 8 | 16 | `kite` 210 | `shootStraight` (rayo) | — | Ranged base |
| 4 | Heraldo del Rayo | 24 | 66 | 7 | 16 | `kite` 220 | `shootStraight` 🔧`onHitStun` (0.3 s) | — | Te aturde a distancia |
| 5 | Sacerdote de Sangre | 95 | 72 | 10 | 16 | `strafe` 190 | — | `healAllies`(12, 140) | Sanador que se queda con la manada; kill-priority |
| 6 | Guardia Nocturno | 150 | 90 | 16 | 20 | `charge` | `melee` | 🔧`drain`(+6) + `shielded`(.4) | Bruiser rápido, flanquear |
| 7 | Hechicero del Viento | 60 | 65 | 8 | 16 | `kite` 230 | 🔧tornadito (`lift` 0.5 s) | — | Te eleva, niega espacio |
| 8 | Vástago Vampírico | 42 | 85 | 11 | 16 | `chase` | `melee` | 🔧`drain`(+5) + `reviveOnce` | **Se levanta una vez** — te obliga a rematar |

### 3.2 Voladores (🔧`flying`: inmunes al terreno, rápidos/erráticos) — nv1–6
| # | Criatura | HP | Spd | Dmg | R | Movimiento | Ataque | Modificadores | Rol |
|---|---|----|----|----|---|---|---|---|---|
| 9 | Murciélago | 20 | 130 | 6 | 14 | `erratic` | `melee` | 🔧`flying` + 🔧`drain`(+3) | Enjambre — gran objetivo de cadena para Lightning |
| 10 | Arpía | 40 | 110 | 13 | 16 | `charge` (picada) | `dashStrike` | 🔧`flying` | Dive-bomb |
| 11 | Espíritu de Tormenta | 30 | 80 | 8 | 16 | `erratic` | `shootStraight` (rayo) | 🔧`flying` | Ranged volador |
| 12 | Fuego Fatuo | 26 | 75 | 8 | 14 | `erratic` | — | 🔧`flying` + `auraDamage`(9, 42) + 🔧`onHitStun` (0.3 s) | Rozarlo te aturde |
| 13 | Vampiro Alado | 120 | 100 | 18 | 19 | `charge` (dive) | `dashStrike` | 🔧`flying` + 🔧`drain`(+8) | Volador pesado |

### 3.3 Ambientales / torreta — nv3–7
| # | Criatura | HP | Spd | Dmg | R | Movimiento | Ataque | Modificadores | Rol |
|---|---|----|----|----|---|---|---|---|---|
| 14 | Gárgola Pararrayos | 250 | 0 | 8 | 18 | `static` | `nova` (rayo) 🔧`onHitStun` | `shielded`(.25) | Torreta/peligro fijo |
| 15 | Centinela de Piedra | 60 | 0 | 10 | 18 | `static` | `shootHoming` | — | Torreta homing |
| 16 | Torbellino Errante | 40 | 50 | 0 | 20 | `erratic` | — | 🔧`onHitPush` + `lift` (0.5 s) | Peligro ambiental que te desplaza |
| 17 | Tronador | 30 | 64 | 8 | 16 | `kite` 230 | `shootSpread` (3 rayos, arc 36) | — | Negación de área a distancia |

### 3.4 Fodder del ritual (nv7)
| # | Criatura | HP | Spd | Dmg | R | Movimiento | Ataque | Modificadores | Rol |
|---|---|----|----|----|---|---|---|---|---|
| 18 | Cultista | 16 | 60 | 7 | 16 | `chase` | `melee` | — | Relleno melee (oleadas/ritual) |
| 19 | Cultista Canalizador | 14 | 0 | 0 | 16 | `static` | — (canaliza) | — | Alimenta el rito (invocado por el líder) |
| 20 | Guardián del Rito | 18 | 70 | 8 | 16 | `chase` | `melee` | — | Defiende al líder (invocado) |

### 3.5 Calendario de introducción (8 niveles)
- **Nv1** — Siervo de la Torre, Murciélago, Acólito del Trueno.
- **Nv2** — + Duelista Nocturno, Heraldo del Rayo, Espíritu de Tormenta.
- **Nv3** — + Arpía, Tronador, Centinela de Piedra.
- **Nv4** — + Guardia Nocturno, Fuego Fatuo, Gárgola Pararrayos · **miniboss: Caballero de Sangre**.
- **Nv5** — + Vástago Vampírico, Torbellino Errante · **miniboss: Bruja del Vendaval**.
- **Nv6** — + Vampiro Alado · **miniboss: Elemental de Tormenta** (tornado-ojo).
- **Nv7** — Cultista, Cultista Canalizador, Guardián del Rito · **levelboss: el Líder Cultista** (el ritual, nivel dedicado).
- **Nv8** — roster como minions · **templeboss: Sir Galahad** (cambiaformas).

---

## 4. Las 5 peleas de jefe

Identidad de jefes: **velocidad + desplazamiento**, cada uno con un gancho propio. HP de partida (referencia: miniboss ~300–520, levelboss ~650, templo repartido por forma); se afina en playtest. Todos `elite: true` (resisten CC).

### 4.1 Caballero de Sangre — bruiser vampírico veloz (nv4 miniboss)
A diferencia de los knights lentos de Agua (Soldado de Hielo, Guardia de Hielo), este **acosa**: muy rápido, dashea, se cura de ti y esquiva.
- `hp 440, spd 110, dmg 20, r 24` · **Movimiento:** `charge` (windup 450 / dash 340 / recover 500, ×3.2). **Modificadores:** 🔧`drain`(+10) + 🔧`evade`.
- **Fase 1 (100–50%):** `dashStrike` (drena) → recupera (vulnerable) → `dashStrike` → recupera.
- **Fase 2 (<50%):** `speedMul` 1.3; doble embestida; invoca Murciélagos (count 2, cap 4, respawnMs 12000).
- **Sensación:** un knight que te persigue de verdad y te roba vida; castiga el contacto, premia leer el dash.

### 4.2 Bruja del Vendaval — control aéreo (nv5 miniboss)
Conjura tornaditos que te elevan y descargas que aturden.
- `hp 420, spd 75, dmg 16, r 26` · **Movimiento:** `strafe` 260.
- **Fase 1 (100–50%):** conjura tornadito (🔧`lift`) → rayo aturdidor (`shootHoming` + 🔧`onHitStun`) → invoca Murciélagos (count 2, cap 4, respawnMs 12000).
- **Fase 2 (<50%):** `speedMul` 1.15; **dos** tornaditos por ciclo + `shootSpread` de rayos.
- **Al morir:** dispara una línea — *"Ahora te enfrentarás a la tormenta…"* — que puentea narrativamente a nv6.
- **Sensación:** presentación del desplazamiento a escala de jefe; aprende a no quedarte quieto bajo los tornaditos.

### 4.3 Elemental de Tormenta — setpiece del tornado-ojo (nv6 miniboss)
"Enfrentas la tormenta misma." **Estático**, enorme (**sprite sobredimensionado, 128×64+**), anclado arriba bajo la barra de vida. HP/`resist` **a escala de levelboss** pese al slot de miniboss — es el **muro de vida del mundo** (porque nv7, el ritual, está lleno de enemigos de vida corta).
- `hp 680, spd 0, dmg 18, r 56, resist 0.20` · **Movimiento:** `static`. **Gimmick:** 🔧tornado-ojo.
- **Fase 1 (100–60%):** tornaditos (`lobAoe` con 🔧`lift`) + nova de rayos (🔧`onHitStun`) + invoca Murciélagos (cap 4, respawnMs 12000).
- **Fase 2 (<60%) `enter: spawnTornado`:** el **gran tornado-ojo** pulsante + rayos aturdidores más rápidos.
- **Fase 3 (<30%) frenesí:** tirón del tornado más fuerte, radio seguro menor, más tornaditos, invoca Arpías.
- **Daño al jefe = loop de posición:** como tu auto-fuego pega al **más cercano** (`Caster.nearestEnemy`) y el jefe está fijo arriba, debes **empujar hacia arriba** —al campo de tornados/rayos— para que el Elemental sea tu objetivo más cercano (o limpiar adds y aprovechar el hueco). El **cap bajo de summons** deja un carril para subir. Riesgo/recompensa puro; sin mecánica nueva de targeting.
- **Sensación:** el puzzle de movilidad de Aire — te arriesgas a subir bajo el tirón del ojo mientras lees rayos y tornaditos.

### 4.4 El Líder Cultista — el ritual (nv7 levelboss)
Su propio nivel dedicado. En el centro, el **ataúd de Galahad**; un líder cultista (vestuario distinto) canaliza el ritual para revivirlo. **Ironía dramática:** la princesa cree que matando cultistas detiene el rito; en realidad el líder lo completa mientras canaliza, y su propia muerte es la llave.
- **Fase A — canalizando:** el líder es 🔧`untargetable` (escudo de ritual visible), `static`, e invoca Cultistas Canalizadores / Guardianes del Rito / Cultistas (con cap + respawnMs). **La barra del ritual se llena por timer** mientras canaliza —no por las muertes—; el jugador la ve crecer pase lo que pase y no asocia que la fuente es el propio líder. De cuando en cuando suelta frases que **engañan** ("ya casi, maestro… solo un poco más…") — texto flotante ligero, sin pausar.
- **Fase B — barra llena (🔧avance por meter, no por HP):** el líder **deja de invocar**, se vuelve **targeteable** y pelea de frente: `hp 200, spd 60`, algunos proyectiles (`shootStraight`/`shootSpread` de rayos), **perfectamente derrotable**. Su muerte **completa el ritual** → se abre el ataúd, Galahad despierta. La princesa "gana" matándolo… y con eso lo revive.
- **Sensación:** un setpiece de gestión (sobrevivir las oleadas mientras descifras por qué no baja la barra), no de aguante; cierra con un giro narrativo que arma el clímax del mundo.

### 4.5 Sir Galahad — el vampiro inmortal (nv8 templeboss)
"El Grial no da vida eterna: da muerte eterna." Examen final del mundo. Cambiaformas (reusa el secuenciador `forms:` del `BossBrain`): barra por forma; al agotar la HP de una forma **no muere — cae cadáver al suelo y se vuelve a levantar** en la siguiente forma (HP llena, más `resist`). Solo la muerte de la **última** forma termina la pelea. El truco del cadáver hace que el jugador **nunca sepa si por fin murió** → el terror de pelear contra un inmortal.

| # | Forma | HP | Spd | Dmg | R | Resist | Kit |
|---|---|----|----|----|---|---|---|
| 1 | Humano (Galahad) | 340 | 80 | 14 | 26 | 0 | `strafe`/`kite` + dardos de sangre (`shootStraight`) + 🔧`evade` · enseña su ritmo |
| 2 | Rage | 460 | 110 | 20 | 26 | 0.10 | `dashStrike` + 🔧`drain` + invoca Murciélagos |
| 3 | Rage ×2 | 560 | 150 | 22 | 26 | 0.20 | Cadencia/velocidad de la forma Rage **duplicadas** (se ve sobrehumano); telegrafías intactas para que siga siendo justo |
| 4 | Murciélago Gigante | 700 | 100 | 24 | 48 | 0.30 | 🔧`flying` + dive-bombs (`charge`) + ráfaga 🔧`onHitPush` + `nova` de murciélagos · el muro |
| 5 | Final (humano) | ~90 | 55 | 10 | 24 | 0 | Kit mínimo (un último dardo o nada) |

- **Transformación (formas 1→4):** telegrafía (~1000 ms) + breve invulnerabilidad + re-tint/re-tex, tematizado como **"cae cadáver → resucita"**. **Limpia sus propios adds** al cambiar (cada forma empieza fresca).
- **Muerte real:** al caer la forma Final, **revierte/cae al suelo y se prende en llamas** ("por fin lo destruiste"). La muerte de esa forma dispara el `onClear` (diálogo de cierre del mundo, en `regions.js`).
- **Sensación:** boss-rush en un cuerpo que recapitula el mundo (humano veloz → frenesí → tormenta de murciélagos) y cierra con la catarsis de ver arder al inmortal.

---

## 5. Dificultad y oleadas (perfil de Aire)

Reusa el modelo de dos factores (`baseDifficulty(levelIndex) × escalaPoder(save)`); `BASE_CURVE` ya cubre 8 niveles. El **perfil de Aire** inclina hacia **velocidad y desplazamiento**, no hacia densidad de balas (Fuego) ni HP/sostenido (Agua):
- **Enemigos rápidos y voladores**, mucho movimiento en pantalla, presión de contacto (drain) en vez de muros de proyectiles.
- **Regla de composición de oleada:** *ancla* (un Hechicero del Viento o un Sacerdote de Sangre que define el puzzle) + *relleno* (Siervos/Murciélagos) + *una amenaza de movilidad* (un Duelista que esquiva o un Vampiro Alado que pica). Ej. nv5: Hechicero del Viento (ancla: te eleva) + Murciélagos (relleno/cadena) + Duelista Nocturno (amenaza evasiva).
- **Stun/lift moderados y telegrafiados**, con ventana de inmunidad anti-encadenado; **tornado-ojo solo en el Elemental** (nv6) → el desplazamiento se siente, sin frustrar.
- **Drenado** como atrición ligera: incentiva no dejarse tocar, refuerza la movilidad.
- Topes: `CONCURRENCY_CAP` (16) compartido; los summons de jefes usan `cap`/`respawnMs` (Bruja, Elemental, Caballero, Líder Cultista) para no inundar; los enjambres de murciélagos cuentan dentro del tope.
- Tuning centralizado en `tuning.js` (stun/lift al caster, `onHitPush`, tornado-ojo, `drain`, cooldown del `evade`, timer de la barra del ritual).

---

## 6. Testing

Convención: **lógica pura → `node --test`; lo Phaser → playtest**.

Nuevos tests de lógica pura:
- `Caster` (extiende, vía `CombatSystem`/estado puro): `stun`/`lift` (inmoviliza, expira, **ventana de inmunidad anti-encadenado** ignora el siguiente CC).
- `onHitPush`: vector de empuje (dirección desde el origen, magnitud, expiración); resistible (avance neto en contra).
- `TornadoHazard`: vector de fuerza por distancia (0 en borde, fuerte cerca del ojo), "está-dentro", el **ojo no daña** (inversión del remolino), escala por fase, **ignora a los `flying`**.
- `drain`: el enemigo se cura al golpear (clamp a HP máx).
- `evade` (`EnemyBrain` extiende): decide esquivar ante orbe entrante / en cooldown; dirección del dash; respeta cooldown (no inmune).
- flag `flying`: los gimmicks de suelo lo saltan.
- flag `untargetable`: `Caster.nearestEnemy`/`SkillTargeting` lo ignoran; `hitEnemy` no le hace daño; se vuelve targeteable al evento de barra llena.
- Avance de fase **por meter** (`BossBrain` extiende / lógica del ritual): la barra del ritual se llena por timer; al completarse, transición A→B (deja de invocar, se vuelve targeteable); el `reviveOnce` del Vástago no re-revive.
- `FormSequencer` (ya existe, de Agua): orden de las 5 formas de Galahad, transformación al llegar a 0 HP, **muerte real en la forma Final**, subida de HP/`resist` por forma; la forma Rage ×2 = valores de Rage duplicados.
- **Regresión:** Fuego/Agua intactos (las piezas reusadas no cambian de comportamiento); las piezas nuevas no afectan a enemigos que no las declaran.

Playtest (Phaser): feel de stun/lift (0.3/0.5 s) y la ventana de inmunidad; fuerza y render del tornado-ojo; el loop de posición del Elemental (¿se puede subir a pegarle?); el truco del cadáver y el re-tint de Galahad (incluida la quema final); legibilidad del `untargetable` del líder (escudo de ritual) y de las frases que engañan; densidad y tope de los enjambres de murciélagos; el `evade` del Duelista (¿esquiva sin sentirse inmune?).

---

## 7. Resumen de archivos afectados (orientativo)

**Nuevos:**
- `src/data/enemies/air.js` — roster de Aire (20 recetas).
- `src/data/bosses/air.js` — Caballero de Sangre, Bruja del Vendaval, Elemental de Tormenta, Líder Cultista, Galahad (con `forms`).
- `src/systems/TornadoHazard.js` — gimmick del tornado-ojo (puro).
- Tests: `TornadoHazard`, extensiones de `Caster`/`CombatSystem` (stun/lift/push/drain), `EnemyBrain` (`evade`), lógica del ritual (meter), flags `flying`/`untargetable`.

**Modificados:**
- `src/systems/EnemyBrain.js` — movimiento `evade`.
- `src/systems/BossBrain.js` — avance de fase por meter (ritual); (la cambiaformas ya existe).
- `src/objects/Enemy.js` — flags `flying`/`untargetable`, estado para `evade`, `drain` al golpear.
- `src/objects/Caster.js` — estado `stun`/`lift`/`push` y ventana de inmunidad en `moveBy`/auto-aim.
- `src/scenes/GameScene.js` — aplicación de stun/lift/push/drain al resolver daño; render+fuerza del tornado-ojo; `flying` salta gimmicks; `untargetable` en colisiones/daño; barra del ritual + transición del líder; texto flotante de las frases; animación de cadáver/quema de Galahad.
- `src/objects/Caster.js` / `nearestEnemy` + `SkillTargeting` — saltar `untargetable`.
- `src/scenes/UIScene.js` — barra del ritual (nv7) y barra-por-forma de Galahad (ya existe de Agua).
- `src/data/enemies/index.js` — registrar el roster de Aire.
- `src/data/regions.js` — oleadas de Aire (composición/calendario §3.5) + cableado de los 5 jefes + línea de muerte de la Bruja + `onClear` de Galahad; mecánicas de templo de Aire.
- `src/data/tuning.js` — params: stun/lift, `onHitPush`, tornado-ojo, `drain`, cooldown de `evade`, timer del ritual.
- `src/config.js` — claves `TEX`/`COLORS` de Aire (formas + tintes de tormenta/rayo/sangre; textura sobredimensionada del Elemental).

---

## 8. Fuera de alcance (specs posteriores y ajuste adyacente)

- **Mundos Tierra y el Castillo** (cada uno su spec).
- **Nuevas skills/sinergias del jugador** (p.ej. un dash que escape limpio del tornado o cancele el lift — gancho mencionado).
- **Sprites finales** (se reusan claves geométricas + colores; el Elemental necesita una textura sobredimensionada).
- **Re-balanceo fino entre mundos** (se afina en playtest por mundo).
- **Ajuste adyacente (hilo artúrico, NO parte del plan de Aire):** renombrar la **Dama del Lago → Morgan le Fay** ("Madam le Fay") en el mundo de Agua. Es solo cambiar strings en `regions.js` + claves i18n `story.water.*`/`speaker.*` (el mundo de Agua ya está hecho). Se trata como un PR pequeño aparte para no acoplarlo a la implementación de Aire.
