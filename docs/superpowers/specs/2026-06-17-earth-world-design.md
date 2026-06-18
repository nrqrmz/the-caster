# Mundo de Tierra (El Jardín de Circe) — Documento de Diseño

**Fecha:** 2026-06-17
**Estado:** Aprobado (diseño) — pendiente plan de implementación
**Spec 4 de la iniciativa de mundos** (reusa el motor componible de Fuego/Agua/Aire; ver `2026-06-09-fire-world-enemy-engine-design.md`, `2026-06-10-water-world-design.md` y `2026-06-17-air-world-design.md`). Se apoya en la **estructura de 8 niveles** (`2026-06-10-campaign-8-levels-design.md`).

---

## 0. Contexto y problema

Fuego validó el motor componible (movimientos/ataques/modificadores + jefes por fases). Agua añadió control/atrición, el remolino y la cambiaformas (`forms:` del `BossBrain`). Aire añadió velocidad/desplazamiento, stun/lift al caster, `drain`, `evade`, `flying`, `untargetable` y el avance de fase por meter. **Tierra es el cuarto y último mundo elemental**: reusa todo ese motor (incluidas las piezas de Aire) y añade **solo las piezas que su identidad exige**. Hoy Tierra usa el contenido genérico (`villager`/`warrior`/`archer`, jefes-blob) y mecánicas de templo placeholder; este spec lo reemplaza por un mundo propio: **20 criaturas**, **5 peleas de jefe bespoke**, una mecánica-firma (la **transmutación de humanos en bestias**) y una pelea final contra una **invocadora pura** que fabrica su propio bestiario.

Tierra es **el clímax pre-final**: al completarla se cumplen los `REQUIRED_ELEMENTS` (`fire`/`water`/`air`/`earth`) y se desbloquea el **Castillo**. La narrativa base ya existe en `regions.js`: **Tierra** otorga **Poison** (`grantsSkill: 'poison'`); las mecánicas de templo de Tierra ya referencian `poisonFloor` + `boulder`. Este spec fija la identidad: **El Jardín de Circe**, un jardín-bosque encantado y tóxico, dominio personal de la hechicera **Circe**, donde cultiva sus hierbas venenosas (*pharmaka*) y atesora cautivos humanos para transformarlos en bestias.

> **Nota de hilo clásico.** Los mundos anteriores usan figuras artúricas (Agua = Morgan le Fay; Aire = Sir Galahad). Tierra gira a **mitología griega** con **Circe** como jefa de templo, y sus jefes intermedios mezclan **bestiario de bosque** (Alfa Licántropo, Dríada + Ent, Grifo) con una figura mítica griega (**Céfalo & Lélaps**). **Nimue/Viviana** y el setpiece de **Merlín aprisionado en un árbol** quedan **reservados** para un mundo/zona posterior (candidato: Castillo o zona secreta), no se gastan aquí.

### Restricciones (heredadas, fijas — ver `CLAUDE.md`)
- Sin build / sin bundler. Módulos ES nativos + Phaser 3 por CDN. Mobile-only, portrait, 480×854.
- Persistencia en `localStorage`. **Split puro/Phaser:** toda decisión testeable vive en `systems/`/`data/`.
- Texturas/colores centralizados en `config.js`. Arte geométrico/sprites; lógica no toca texturas.
- **Estándar de campaña:** 8 niveles, un jefe por nivel (nv4/5/6 minibosses, nv7 levelboss, nv8 templeboss).

### Alcance
Mundo de Tierra completo: piezas nuevas + roster (20) + 5 jefes + la transmutación + perfil de dificultad. **Fuera de alcance:** Castillo (spec propia), nuevas skills del jugador, sprites finales.

---

## 1. Identidad de combate

**Tierra = terreno + triage + aguante.** Cómo cada mundo te quita el control: Fuego por **densidad de balas**, Agua por **fricción** (te frena/sujeta), Aire por **fuerza** (te empuja/eleva). **Tierra te clava en el sitio (`root`) y te niega el suelo (terreno tóxico), y sobre todo te obliga a decidir a quién matar primero (el triage de la transmutación).** El reto es **gestión de posición sostenida y priorización de objetivos**, no la densidad de balas (Fuego), la vida/sostenido (Agua) ni la reacción al desplazamiento (Aire).

Tres pilares:
- **Terreno que niega el suelo:** charcos venenosos (`poisonFloor`), nubes de espora, suelo de raíces. Control de espacio: dónde te paras y por cuánto tiempo.
- **Triage de transformación (firma):** Circe y sus élites convierten **humanos débiles** en **bestias**. Carrera por matarlos como humanos (frágiles, sin amenaza real) **antes** de tener que enfrentarlos como bestias (rápidas, peligrosas). Invierte la lógica de los adds: el relleno débil se vuelve letal si lo ignoras.
- **Aguante vegetal/pétreo:** golems, ents y bestias de **alto HP**, golpes pesados y lentos, **`root`** que te clava donde no querías.

**Sinergia con Poison (la skill que desbloqueas aquí):** tu charco que **envenena Y te cura** (`poisonHeal`, "zoneregen") brilla en este mundo — DoT de área contra los enjambres que Circe fabrica + auto-sanación en una pelea de atrición/alto HP. Volverías el arma del jardín (el suelo tóxico) contra él. Pega **full** sobre la chusma; los `elite` (minibosses/levelboss/templeboss) **resisten CC** — estándar heredado.

**Equidad (difícil ≠ injusto), reglas duras de este mundo:**
- **`root` breve y telegrafiado:** ~0.8 s, siempre avisado (la raíz/zarza se ve crecer). **Conservas tu kit** (puedes castear y auto-apuntar mientras estás enraizado) — a diferencia del stun de Aire, Tierra nunca te quita el cast.
- **Freno anti-encadenado:** tras recibir `root`, una **ventana de inmunidad** corta (reusa el `ccImmune` de Aire) impide que un campo de zarzas te perma-bloquee.
- **El triage es justo:** el bolt de transmutación viaja **telegrafiado y homing lento** → siempre tienes una ventana para rematar al cautivo o reposicionarte; si el cautivo muere antes de que llegue, el bolt **se disipa**.
- Densidad de proyectiles **menor** que en Fuego; el reto viene del terreno, la prioridad y el aguante, no del bullet-hell.

---

## 2. Piezas nuevas del motor (lo que Tierra construye)

Todo lo demás se **reusa** del catálogo de Fuego/Agua/Aire (`chase`/`kite`/`flee`/`charge`/`orbit`/`strafe`/`erratic`/`static`/`zigzag`/`burrow`/`evade`; `melee`/`shootStraight`/`shootSpread`/`shootBurst`/`shootHoming`/`nova`/`lobAoe`/`summon`/`dashStrike`; `shielded`/`healAllies`/`auraDamage`/`explodesOnDeath`/`reviveOnce`/`splitsOnDeath`/`onHitSlow`/`drain`/`resist`/`flying`/`untargetable`; secuenciador de fases y de **formas** del `BossBrain`). Piezas **nuevas**:

### 2.1 `root` al caster — inmovilización breve que conserva el kit
Nuevo estado del caster. A diferencia del `stun`/`lift` de Aire (que quitan el cast), `root`:
- Inmoviliza el **movimiento** del caster durante **~800 ms** (no puede desplazarse).
- **Conserva el casteo y el auto-aim** — sigues disparando orbes y skills mientras estás clavado. La pérdida es **posicional**, no ofensiva.
- **Telegrafiado** por la fuente (la raíz/zarza/pisotón se ve crecer antes de prender).
- **Anti-encadenado:** tras expirar un `root`, `ccImmuneRemaining` (~600 ms, comparte el mecanismo de Aire) durante el cual nuevos `root` se ignoran. Evita el perma-lock en un campo de zarzas.
- Estado en `Caster` (`rootRemaining`), espejo de `slowRemaining`/`stunRemaining`; consumido en `caster.moveBy` **pero no** en el auto-aim. Parámetros en `tuning.js`.
- Lo aplican: Zarza Estranguladora, las raíces de la Dríada, el pisotón del Coloso Musgoso/Ent, y Circe.

### 2.2 `transmute` — transformación de un minion amigo (mecánica firma)
Nuevo ataque, único de Tierra. A diferencia de **todos** los ataques previos (que apuntan al jugador), `transmute` apunta a un **minion AMIGO débil** (un cautivo humano):
1. La fuente (Circe / Ninfa Transmutadora) **selecciona un cautivo** vivo en rango (preferentemente uno que huye, `flee`).
2. Lanza un **bolt homing telegrafiado y lento** que persigue al cautivo.
3. **Al impactar al cautivo:** el cautivo es **reemplazado** por una **bestia** (HP llena, kit de bestia) en su posición.
4. **Interrupción del jugador:** si el cautivo **muere antes** de que el bolt llegue, el bolt **se disipa** (sin efecto). Ésa es la carrera del triage.
- **Puro/testeable:** la **selección del blanco** (cautivo vivo más adecuado) y el **mapa de transformación** (qué cautivo → qué bestia) viven en lógica pura; el vuelo del bolt y el swap de entidad los ejecuta `GameScene`.
- **Mapa de transformación (datos):** p.ej. Náufrago Encantado → Lobo; Acólito Cautivo → Jabalí; Sierva del Jardín → Pixie/bestia menor. Definido en `data/enemies/earth.js`.
- Parámetros (velocidad del bolt, cooldown, rango de selección) en `tuning.js`.

### 2.3 `mutateOnDeath` — mutación/peligro al morir (modificador)
Nuevo modificador, hermano de `splitsOnDeath`/`explodesOnDeath`. Al morir, la criatura **deja otra entidad o peligro** en su lugar:
- **Hongo Esporario** → una **nube de esporas** (zona de daño tipo `poisonFloor` temporal).
- **Lobo / bestia herida** → un **humano débil que huye** (`flee`) — *flavor de transmutación reversible: la bestia revierte cuando la "matas".*
- **Selectivo:** solo 2–3 criaturas lo usan, con intención (no satura el roster).
- Puro/testeable: el spawn al morir (qué deja, dónde). Ejecutado en `GameScene` donde se resuelve la muerte del enemigo.

### 2.4 `poisonFloor` — peligro de suelo tóxico (REUSO, no nuevo)
**Ya existe y está completo:** `BossMechanics.poisonFloor` → `scene.spawnPoisonZone(x, y, radius, dps, duration)` (una zona circular en el suelo que aplica DPS mientras el caster esté dentro, con duración). Tierra lo **reusa tal cual** como peligro ambiental/de jefe — lo siembran Brote Pústula, la Dríada y Circe vía `BossMechanics`/`spawnPoisonZone`. **No se construye nada nuevo aquí.** La única extensión posible es permitir que una criatura del roster (Brote Pústula) lo dispare como ataque (`lobAoe` que llama a `spawnPoisonZone` en el punto de impacto en vez de sobre el caster) — un pequeño wrapper, no un sistema nuevo.

### 2.5 Escenografía de spawn: jaulas y cuevas (arena de Circe)
No es motor nuevo — es **flavor + puntos de spawn fijos** sobre el `summon` existente. La arena de Circe (nv8) tiene **puntos de liberación como escenografía**: **jaulas en troncos de árbol** y **bocas de cueva**. Circe **abre** un punto → brota un **lote de N cautivos** que **huyen** (`flee`). Vive en `GameScene`/`regions.js` (colocación de nodos + animación de apertura), no en lógica nueva.

> **Reuso (sin motor nuevo):**
> - La **pelea de dos formas** de Céfalo→Felino (§4.2) reusa íntegro el secuenciador `forms:` del `BossBrain` + la coreografía "cae cadáver → se levanta en otra forma" de **Galahad** (Aire). Lo único nuevo es *flavor* (el cameo de Circe en la transición).
> - El **`untargetable`** del Grifo en vuelo (§4.4) y de Céfalo protegido por Lélaps (§4.2) reusan la pieza del Líder Cultista (Aire).
> - **Soltamos `QuicksandHazard`** (estaba propuesto para el nv6): el `root` de la Dríada + el aguante del Ent hacen el muro redundante. Una pieza nueva menos.

### 2.6 Regla de movimiento del mundo: `flee` = humanos cautivos
Convención de diseño, no motor: **`flee` queda reservado para los humanos cautivos** (presa que huye porque va a ser transformada). El resto de criaturas usan `kite`/`chase`/etc. Esto hace legible el triage: lo que **huye** es lo que Circe quiere transmutar, y lo que debes rematar primero.

---

## 3. El roster de Tierra (20 criaturas)

Identidad: bestiario de bosque (puro), terreno + veneno + aguante. Densidad de proyectiles menor que Fuego. 🔧 = usa pieza nueva. Stats de partida; se afinan en implementación/playtest.

### 3.1 Cautivos — víctimas humanas (fodder de transmutación, frágiles) — nv1–8
| # | Criatura | HP | Spd | Dmg | R | Movimiento | Ataque | Modificadores | Rol |
|---|---|----|----|----|---|---|---|---|---|
| 1 | Náufrago Encantado | 18 | 90 | 8 | 16 | `chase` | `melee` | — | Fodder base; blanco de 🔧`transmute` → Lobo |
| 2 | Acólito Cautivo | 16 | 70 | 7 | 16 | `kite` 200 | `shootStraight` | — | Ranged débil; 🔧`transmute` → Jabalí |
| 3 | Sierva del Jardín | 14 | 85 | 0 | 14 | 🔧`flee` | — | deja charco al morir (`lobAoe`/`poisonFloor` corto) | Huye; 🔧`transmute` → fey menor |

### 3.2 Bestias — fauna / resultado del `transmute` — nv1–6
| # | Criatura | HP | Spd | Dmg | R | Movimiento | Ataque | Modificadores | Rol |
|---|---|----|----|----|---|---|---|---|---|
| 4 | Lobo | 30 | 130 | 11 | 16 | `chase` | `melee` | `evade` | Fauna veloz / resultado transmute |
| 5 | Jabalí Embravecido | 60 | 100 | 16 | 18 | `charge` | `dashStrike` | — | Embiste en línea |
| 6 | Oso del Jardín | 150 | 70 | 20 | 22 | `chase` | `melee` | — | Bruiser de alto HP |
| 7 | Hombre Lobo | 110 | 120 | 18 | 19 | `chase` | `dashStrike` | `evade` + 🔧`drain`(+6) | Bestia mayor / resultado transmute élite |

### 3.3 Flora / hongos — terreno + veneno, estáticos/lentos — nv2–7
| # | Criatura | HP | Spd | Dmg | R | Movimiento | Ataque | Modificadores | Rol |
|---|---|----|----|----|---|---|---|---|---|
| 8 | Hongo Esporario | 40 | 0 | 6 | 16 | `static` | — | `auraDamage`(8, 40) + 🔧`mutateOnDeath`(nube de esporas) | Rozarlo daña; al morir deja zona |
| 9 | Brote Pústula | 50 | 0 | 0 | 16 | `static` | `lobAoe` (🔧`poisonFloor`) | — | Siembra charcos venenosos |
| 10 | Zarza Estranguladora | 70 | 0 | 8 | 18 | `static` | raíces (🔧`root` 0.8 s) | — | Te clava a distancia corta |
| 11 | Flor Carnívora | 60 | 0 | 9 | 18 | `static` | `shootHoming` (esporas) | — | Torreta homing |
| 12 | Enredadera Reptante | 45 | 45 | 10 | 16 | `chase` lento | `melee` | `onHitSlow` (lodo) + `splitsOnDeath` | Reptante pegajosa que se parte |

### 3.4 Fey pequeños — rápidos / enjambre — nv1–5
| # | Criatura | HP | Spd | Dmg | R | Movimiento | Ataque | Modificadores | Rol |
|---|---|----|----|----|---|---|---|---|---|
| 13 | Pixie | 16 | 135 | 5 | 12 | `erratic` | `melee` | 🔧`flying` | Enjambre; gran objetivo de DoT de área |
| 14 | Duende Ladrón | 24 | 110 | 9 | 14 | `erratic` | `melee` | — | Relleno veloz errático |
| 15 | Fuego Fatuo del Pantano | 26 | 80 | 7 | 14 | `erratic` | — | 🔧`flying` + `auraDamage`(8, 40) + `onHitSlow` | Vuela; rozarlo ralentiza |

### 3.5 Golems / pétreos — muro, lentos, golpes pesados — nv3–7
| # | Criatura | HP | Spd | Dmg | R | Movimiento | Ataque | Modificadores | Rol |
|---|---|----|----|----|---|---|---|---|---|
| 16 | Golem de Lodo | 90 | 50 | 12 | 20 | `chase` lento | `melee` | `onHitSlow` + `splitsOnDeath` | Tanque que se parte en lodo menor |
| 17 | Golem de Piedra | 220 | 45 | 14 | 22 | `chase` lento | `lobAoe` (boulder) | `shielded`(.3) | Muro pesado a distancia |
| 18 | Tótem de Espinas | 120 | 0 | 10 | 20 | `static` | `shootSpread` (3 espinas) | — | Torreta de negación de área |
| 19 | Coloso Musgoso | 300 | 40 | 18 | 24 | `chase` lento | `melee` | pisotón 🔧`root` (0.8 s) | Muro andante que te clava |

### 3.6 Élite del jardín (la fuente de la mecánica firma) — nv5–8
| # | Criatura | HP | Spd | Dmg | R | Movimiento | Ataque | Modificadores | Rol |
|---|---|----|----|----|---|---|---|---|---|
| 20 | Ninfa Transmutadora | 70 | 70 | 6 | 16 | `kite` 230 | 🔧`transmute` | — | Convierte cautivos en bestias; kill-priority |

### 3.7 Calendario de introducción (8 niveles)
- **Nv1** — Náufrago Encantado, Lobo, Pixie.
- **Nv2** — + Acólito Cautivo, Duende Ladrón, Hongo Esporario.
- **Nv3** — + Jabalí Embravecido, Brote Pústula, Tótem de Espinas.
- **Nv4** — + Oso del Jardín, Fuego Fatuo del Pantano, Golem de Lodo · **miniboss: El Señor Lobo (Alfa Licántropo)**.
- **Nv5** — + Sierva del Jardín, Zarza Estranguladora, Ninfa Transmutadora · **miniboss: Céfalo & Lélaps** (→ Circe transmuta → Felino).
- **Nv6** — + Hombre Lobo, Flor Carnívora, Enredadera Reptante, Golem de Piedra · **miniboss: La Dríada & su Ent** (dual con vínculo).
- **Nv7** — Coloso Musgoso + roster como minions/invocados · **levelboss: El Grifo** (guardián del sanctum).
- **Nv8** — roster como minions + cautivos · **templeboss: Circe** (invocadora pura, la transmutación).

---

## 4. Las 5 peleas de jefe

Identidad de jefes: **bestiario de bosque** + terreno/aguante, cada uno con su gancho. HP de partida (referencia heredada: miniboss ~400–520, levelboss ~650, templo repartido por fase); se afina en playtest. Todos `elite: true` (resisten CC).

### 4.1 El Señor Lobo — bruiser vampírico-licántropo (nv4 miniboss)
Un alfa rápido que te acosa y llama a su manada.
- `hp 460, spd 120, dmg 18, r 22` · **Movimiento:** `charge` (windup/dash/recover). **Modificadores:** `evade` + 🔧`drain`(+8).
- **Fase 1 (100–50%):** `dashStrike` (drena) → recupera (vulnerable) → `dashStrike`; invoca Lobos (count 2, cap 4, respawnMs 12000).
- **Fase 2 (<50%):** `speedMul` 1.3; doble embestida; **aullido** que invoca un lote extra de Lobos.
- **Sensación:** presentación de la amenaza-bestia y la velocidad; castiga el contacto, premia leer el dash.

### 4.2 Céfalo & Lélaps → (Circe) → el Felino (nv5 miniboss)
El cazador mítico y su sabueso infalible. **Primera aparición de Circe** + presentación de la transmutación. Reusa `FormSequencer` + coreografía del cadáver de Galahad.

**Fase 1 — el cazador y su sabueso (dúo):**
- **Lélaps** (el sabueso "que siempre atrapa"): `hp 120, spd 140` · `chase` implacable, `melee`. Te acosa sin descanso.
- **Céfalo** (el francotirador de jabalina "infalible"): `hp 300, spd 70` · `kite`/`strafe`, `shootHoming` con **jabalina de madera y punta de plata** (homing = "nunca falla"). **`untargetable`/`shielded` mientras Lélaps viva** (el sabueso lo guarda) → el jugador **solo puede matar al perro**.

**Interludio — Circe (cameo):** cae Lélaps → **se petrifica en un bloque pétreo 1:1 infranqueable** (frena el movimiento, **no** los proyectiles; persiste el resto de la pelea). Entra Circe, suelta una línea (*«Un cazador sin su presa… qué triste. Te daré garras propias.»*), lanza el 🔧`transmute` sobre Céfalo y **desaparece**. El jugador **nunca mata al Céfalo humano** — Circe lo reclama frente a ti (presagio).

**Fase 2 — el Felino:** Céfalo muta en una **bestia felina veloz** (`hp 360, spd 150`): `charge`/`dashStrike` + `evade`, `melee`. Otra pelea, otro ritmo, alrededor del bloque de Lélaps.
- **Sensación:** el primer "esto les pasa a los que entran a mi jardín"; presenta a Circe y la transmutación a escala de jefe.

### 4.3 La Dríada & su Ent — jefe dual con vínculo (nv6 miniboss)
La ninfa del árbol y su tanque, con un vínculo mítico de hamadríada.
- **La Dríada** (cerebro): `hp 280, spd 75` · **Movimiento:** `kite` 230 (**no `flee`** — se mantiene a rango de heal cerca del Ent). Crowd control (raíces 🔧`root`) + `healAllies`(15, 200) sobre el Ent.
- **El Ent** (tanque): `hp 520, spd 40, dmg 18, r 26` · **Movimiento:** `chase` lento. Golpes pesados, pisotón 🔧`root`. Camina y te presiona.
- **Vínculo (puro mito hamadríada):** matas al **Ent → muere también la Dríada** (su vasija-árbol cae). Matas a la **Dríada → el Ent sigue** (pero sin curas ni CC).
- **El puzzle de prioridad (las dos rutas):**
  - *Finura:* cazas a la Dríada (perseguir a la escurridiza, metiéndote en la zona del Ent) → cortas curas+CC → el Ent queda manejable.
  - *Fuerza:* todo sobre el Ent (tanque lento, fácil de pegar pero curado → premia **burst/Fireball burning**) → si cae el Ent, cae la Dríada con él.
- **Sensación:** decisión de objetivo activa; premia la build correcta (DoT sostenido contra el muro curado).

### 4.4 El Grifo — guardián del sanctum (nv7 levelboss)
Su propio nivel dedicado. Híbrido de águila y león, guardián de la última puerta antes de Circe; **flavor: la obra/mascota prize de Circe** (águila+león = su ensamblaje), guiño a la transmutación. **HP alto** (el más tanque del mundo junto al Ent).
- `hp 700, spd 110, dmg 20, r 26, resist 0.20` · **Gimmick:** alterna **vuelo** y **tierra**.
- **En vuelo:** 🔧`flying` (inmune al terreno) + 🔧`untargetable` (auto-fuego/Lightning/daño lo ignoran) → **picadas** (`charge`/`dashStrike`), inalcanzable.
- **En tierra:** aterriza telegrafiado → **reachable** = ventana de daño; invoca bestias (`summon` con cap: Lobos/Jabalíes).
- **Anti-spam de vuelo (regla dura, en `tuning.js`):**
  - La **tierra es el estado por defecto**; el vuelo es la puntuación. Ventanas de tierra **generosas y garantizadas** cada ciclo.
  - **Vuelo acotado:** máximo de picadas consecutivas → **aterrizaje forzado** telegrafiado. No encadena vuelo indefinidamente.
  - **Cooldown** tras aterrizar antes de volver a volar.
  - Las invocaciones (con cap) te ocupan durante el vuelo, sin inundarte.
  - La fase aérea **nunca** debe sentirse como un muro de invulnerabilidad.
- **Fases por HP:** en fase tardía, picadas más rápidas / más invocaciones, **pero la regla anti-spam se mantiene** (las ventanas de tierra no desaparecen).
- **Sensación:** el único boss aéreo del mundo; ritmo de timing (esquiva el vuelo peleando contra adds → castiga en tierra) que aporta verticalidad a un mundo todo-terreno.

### 4.5 Circe — la invocadora que fabrica el bestiario (nv8 templeboss)
"No los odio… solo desperdician la forma que tienen." Examen final del mundo. **Summoner pura: humana toda la pelea** (sin cambiaformas — se distingue de Galahad). Su gancho es **fabricar y comandar** el bestiario: libera cautivos y los 🔧`transmuta` en bestias.

**Caracterización:** Circe **ama la naturaleza y a sus bestias, pero desprecia la forma humana.** No mata a sus cautivos: los **"libera" solo para cazarlos y transformarlos** — para ella, volverlos bestias es *mejorarlos*. La princesa es solo la siguiente.

**Escenografía de la arena (§2.5):** **jaulas en troncos de árbol** y **bocas de cueva** como puntos de liberación fijos. Circe abre uno → brota un lote de N cautivos que **huyen** (`flee`).

- **Stats base:** `hp 900` repartido por fase, `spd 60, dmg 12, r 24`. **Movimiento:** `kite`/`strafe`. Ataque directo: dardos de hierba (`shootStraight`/`shootSpread`).
- **Fase 1 (100–66%):** abre jaulas (invoca cautivos) + lanza 🔧`transmute` **de a uno** → la carrera del triage; `poisonFloor` ocasional. Aprendes la mecánica.
- **Fase 2 (66–33%):** + raíces 🔧`root` + transmutación más rápida + un **Hombre Lobo guardabestias** que la protege; más `poisonFloor`.
- **Fase 3 (<33%) desesperada:** **transmutación masiva** (varios cautivos a la vez), `poisonFloor` por todo el campo, invoca a sus "favoritas" (bestias mayores).
- **Pulla durante la pelea** (texto flotante ligero, estilo Líder Cultista de Aire): *«Cuando acabe contigo, serás un conejito precioso.»*
- **Muerte de Circe = fin de escena (`onClear`):** al caer, **todas las bestias supervivientes revierten a humanos liberados**, el jardín se marchita, y cierra con el diálogo de fin de mundo. Dispara el `onClear` (en `regions.js`), completa los `REQUIRED_ELEMENTS` → **desbloquea el Castillo.**
- **Sensación:** un setpiece de gestión y prioridad (sobrevivir y triagear lo que ella fabrica) que cierra el arco elemental con catarsis y abre el clímax del juego.

---

## 5. Dificultad y oleadas (perfil de Tierra)

Reusa el modelo de dos factores (`baseDifficulty(levelIndex) × escalaPoder(save)`); `BASE_CURVE` ya cubre 8 niveles. El **perfil de Tierra** inclina hacia **aguante, terreno y prioridad**, no hacia densidad de balas (Fuego), HP/sostenido reactivo (Agua) ni desplazamiento (Aire):
- **Enemigos de alto HP y golpes pesados**, terreno tóxico/raíces en pantalla, presión de triage en vez de muros de proyectiles.
- **Regla de composición de oleada:** *ancla* (un transmutador —Ninfa— o una flora que pone terreno —Brote Pústula/Zarza— que define el puzzle) + *cautivos* (fodder de 🔧`transmute`, huyen) + *un tanque* (Golem/Oso) + *la presión de prioridad*. Ej. nv5: Ninfa Transmutadora (ancla: fabrica bestias) + Náufragos/Acólitos cautivos (fodder que huye) + Golem de Lodo (tanque).
- **`root` moderado y telegrafiado**, con ventana de inmunidad anti-encadenado; conserva siempre el cast.
- **Veneno de terreno** (`poisonFloor`/esporas) como control de espacio, no como bullet-hell.
- Topes: `CONCURRENCY_CAP` (16) compartido; los summons de jefes usan `cap`/`respawnMs` (Señor Lobo, Grifo, Circe) para no inundar; los cautivos liberados cuentan dentro del tope.
- Tuning centralizado en `tuning.js` (`root` al caster, `transmute`, `mutateOnDeath`, `poisonFloor`, anti-spam del vuelo del Grifo, vínculo Dríada↔Ent, lotes de cautivos de Circe).

---

## 6. Testing

Convención: **lógica pura → `node --test`; lo Phaser → playtest**.

Nuevos tests de lógica pura:
- `Caster` (extiende, vía `CombatSystem`/estado puro): `root` (inmoviliza el movimiento, **conserva casteo/auto-aim**, expira, ventana de inmunidad anti-encadenado ignora el siguiente CC).
- `transmute`: selección del cautivo (vivo, en rango, preferentemente el que huye); el mapa de transformación (cautivo → bestia correcta); **se disipa si el cautivo muere antes** de que el bolt llegue.
- `mutateOnDeath`: el spawn correcto al morir (hongo → nube de esporas; bestia → humano que huye); dónde aparece.
- Vínculo **Dríada↔Ent** (lógica pura del encuentro): muerte del Ent ⇒ muere la Dríada; muerte de la Dríada ⇏ muere el Ent; `healAllies` de la Dríada sobre el Ent.
- Anti-spam del **vuelo del Grifo** (estado puro): máximo de picadas → aterrizaje forzado; cooldown antes de re-volar; las ventanas de tierra no desaparecen por fase.
- `FormSequencer` (ya existe, de Agua/Aire): orden Céfalo (humano) → Felino, transformación al llegar a 0 HP de la fase 1, el cameo de Circe en la transición.
- flag `flying`/`untargetable` (ya existen): los gimmicks de suelo saltan a los `flying`; `Caster.nearestEnemy`/`SkillTargeting`/`hitEnemy` ignoran al Grifo en vuelo y a Céfalo protegido.
- **Regresión:** Fuego/Agua/Aire intactos (las piezas reusadas no cambian de comportamiento); las piezas nuevas no afectan a enemigos que no las declaran.

Playtest (Phaser): feel del `root` (0.8 s) y su ventana de inmunidad; legibilidad del triage (¿da tiempo a rematar al cautivo antes del bolt?); el bloque petrificado de Lélaps en la fase 2 del Felino; el puzzle de la Dríada↔Ent (¿valen las dos rutas?, ¿Fireball ayuda?); el ritmo vuelo/tierra del Grifo (¿la fase aérea frustra o se siente justa?); la arena de jaulas/cuevas de Circe (¿se lee de dónde salen los cautivos?); la reversión de bestias→humanos al morir Circe; densidad de terreno (`poisonFloor`/esporas) sin saturar.

---

## 7. Resumen de archivos afectados (orientativo)

**Nuevos:**
- `src/data/enemies/earth.js` — roster de Tierra (20 recetas) + el mapa de `transmute` (cautivo → bestia).
- `src/data/bosses/earth.js` — El Señor Lobo, Céfalo & Lélaps (con `forms`), La Dríada & su Ent (con vínculo), El Grifo, Circe.
- Tests: `root`/anti-encadenado (extensión de `Caster`/`CombatSystem`), `transmute` (selección + mapa + disipado), `mutateOnDeath`, vínculo Dríada↔Ent, anti-spam del Grifo, flags reusados. *(`poisonFloor`/`spawnPoisonZone` ya existe — no hay sistema nuevo de hazard.)*

**Modificados:**
- `src/systems/EnemyBrain.js` — selección de blanco amigo para `transmute` (lógica pura).
- `src/systems/BossBrain.js` — manejo del vínculo Dríada↔Ent y del estado vuelo/tierra del Grifo (la cambiaformas de Céfalo ya existe).
- `src/objects/Enemy.js` — `mutateOnDeath`, flag de cautivo/transmutable, estado de bestia resultante.
- `src/objects/Caster.js` — estado `root` y ventana de inmunidad en `moveBy` (**sin tocar** el auto-aim).
- `src/scenes/GameScene.js` — aplicación de `root`/`poisonFloor` al caster; vuelo del bolt de `transmute` + swap de entidad al impactar (y disipado si el cautivo muere); `mutateOnDeath` al morir; bloque petrificado de Lélaps (colisión de movimiento, no de proyectiles); estado vuelo/tierra + `untargetable` del Grifo; jaulas/cuevas de la arena de Circe + apertura; texto flotante de las pullas; reversión bestias→humanos al morir Circe.
- `src/data/enemies/index.js` — registrar el roster de Tierra.
- `src/data/regions.js` — oleadas de Tierra (composición/calendario §3.7) + cableado de los 5 jefes + pulla de Circe + `onClear` de Circe; mecánicas de templo de Tierra.
- `src/data/tuning.js` — params: `root`, `transmute`, `mutateOnDeath`, `poisonFloor`, anti-spam del vuelo del Grifo, vínculo Dríada↔Ent, lotes de cautivos de Circe.
- `src/config.js` — claves `TEX`/`COLORS` de Tierra (jabalina de madera con punta de plata `TEX.woodJavelin`/`COLORS.wood`/`COLORS.silver`; tintes de veneno/lodo/piedra/musgo; texturas sobredimensionadas del Ent y el Grifo).

---

## 8. Fuera de alcance (specs posteriores y reservas)

- **El Castillo** (spec propia, clímax final del juego).
- **Nuevas skills/sinergias del jugador.**
- **Sprites finales** (se reusan claves geométricas + colores; el Ent y el Grifo necesitan texturas sobredimensionadas).
- **Re-balanceo fino entre mundos** (se afina en playtest por mundo).
- **Reserva narrativa (NO parte de Tierra):** **Nimue/Viviana** + el setpiece de **Merlín aprisionado en un árbol** quedan reservados para un mundo/zona posterior (candidato: Castillo o zona secreta). Es material demasiado bueno para gastarlo aquí.
