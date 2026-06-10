# Motor de Enemigos Componible + Mundo de Fuego — Documento de Diseño

**Fecha:** 2026-06-09
**Estado:** Aprobado (diseño) — pendiente plan de implementación
**Spec 1 de la iniciativa "Identidad de combate y dificultad"**

---

## 0. Contexto y problema

El juego hoy tiene **3 tipos de enemigos** (`villager`, `warrior`, `archer`) usados **idénticos en los 4 mundos**: ir a Fuego o a Tierra es la misma pelea con otro color. Las oleadas (`basicWaves`/`interWaves` en `regions.js`) son compartidas, con counts bajos. Minibosses y levelbosses son blobs genéricos (mismo `chase`, solo escalan hp/daño); solo los temple bosses tienen algo de identidad vía `BossMechanics`. La dificultad escala suave y **solo por poder del jugador** (`Difficulty.js`: +4%/punto, +15%/elemento), así que el juego se siente fácil y homogéneo.

### Objetivos
1. Un **motor de enemigos componible y data-driven** que permita un roster grande y variado sin explotar en mantenimiento.
2. **Jefes bespoke** (cada miniboss/levelboss/mago de templo con su propio gameplay), no blobs con más vida.
3. El **mundo de Fuego completo** como primer consumidor y prueba del motor: ~20 criaturas únicas + 5 peleas de jefe.
4. **Dificultad real**: oleadas más densas, presión sostenida, escalado absoluto (no solo relativo al poder).
5. Un **botón de borrar guardado** (debug) para iterar el balance.

### Restricciones (heredadas, fijas — ver `CLAUDE.md`)
- Sin build / sin bundler. Módulos ES nativos + Phaser 3 por CDN.
- Mobile-only, portrait, 480×854 lógico.
- Persistencia en `localStorage`, sin servidor.
- **Split puro/Phaser**: toda decisión testeable vive en `systems/`/`data/` sin importar Phaser; las escenas/objetos solo ejecutan.
- Texturas/colores centralizados en `config.js` (`TEX`/`COLORS`).

### Alcance de esta spec
Motor componible **+ mundo de Fuego completo + botón de borrar guardado**. Agua/Aire/Tierra/Castillo son **specs posteriores** (cada mundo su propio ciclo diseño→plan→implementación), que reusan el motor y añaden componentes nuevos solo cuando hagan falta.

---

## 1. El motor de enemigos componible

**Idea central:** un enemigo deja de ser una clase y pasa a ser **un dato que combina piezas reutilizables**. El código que se mantiene son las piezas (pocas), no las criaturas (muchas).

### 1.1 Esquema de un enemigo

Vive en `data/enemies/<mundo>.js`:

```js
{
  key: 'acolito_brasa',
  tier: 'basic' | 'elite' | 'miniboss' | 'levelboss' | 'templeboss',
  tex, color, radius, hp, speed, damage,
  movement: { type: 'kite', range: 200 },              // 1 pieza de movimiento
  attacks: [                                            // 0..N piezas de ataque
    { type: 'shootSpread', count: 3, arc: 30, speed: 260,
      damage: 8, every: 1400, telegraph: 300 }
  ],
  modifiers: ['explodesOnDeath'],                       // 0..N efectos
  phases: [ /* ... */ ]                                 // solo jefes (Sección 2)
}
```

### 1.2 Librería de Movimiento (cada enemigo usa exactamente 1)

| Pieza | Comportamiento |
|-------|----------------|
| `chase` | Corre en línea recta hacia el objetivo, siempre. |
| `kite` | Mantiene una distancia ideal: retrocede si te acercas, avanza si te alejas. |
| `zigzag` | Avanza hacia ti serpenteando de lado a lado (esquiva el auto-fire). |
| `orbit` | Gira a un radio fijo alrededor del objetivo, como satélite. |
| `charge` | Se detiene, **telegrafía**, embiste a gran velocidad, se recupera (vulnerable), repite. |
| `strafe` | Se mueve lateralmente manteniendo distancia media ("baila"). |
| `erratic` | Flota en direcciones semi-aleatorias, sin perseguir claramente. |
| `static` | No se mueve; ataca desde su sitio. |
| `burrow` | Se hunde (invulnerable/invisible), se reposiciona, reaparece junto al objetivo. |
| `flee` | Huye activamente, manteniéndose lejos (soportes). |

### 1.3 Librería de Ataque (0..N por enemigo)

| Pieza | Comportamiento |
|-------|----------------|
| `melee` | Daño por contacto, sin proyectil. |
| `shootStraight` | 1 proyectil directo a la posición del objetivo. |
| `shootSpread` | Varios proyectiles en abanico (arco). |
| `shootBurst` | Ráfaga rápida de varios proyectiles en la misma dirección. |
| `shootHoming` | Proyectil lento que persigue curvándose. |
| `nova` | Anillo de proyectiles en todas direcciones desde el enemigo. |
| `lobAoe` | Zona de daño telegrafiada lanzada al suelo, que perdura. |
| `beam` | Rayo/línea continua telegrafiada que barre o apunta (élites/jefes). |
| `summon` | Invoca enemigos nuevos. |
| `dashStrike` | Embestida corta telegrafiada que golpea al llegar (ataque puntual). |
| `auraDamage` | Aura que daña al entrar (o buffea aliados, según parámetros). |

### 1.4 Librería de Efectos/Modificadores (0..N por enemigo)

| Pieza | Comportamiento |
|-------|----------------|
| `onHitSlow` | Sus impactos te ralentizan unos segundos. |
| `onHitBurn` | Sus impactos aplican quemadura (DoT). |
| `onHitPoison` | Igual que burn pero veneno (más usado en Tierra; ya en catálogo). |
| `shielded` | Escudo (frontal o total) que reduce/bloquea daño hasta romperlo o flanquear. |
| `splitsOnDeath` | Al morir se divide en 2+ enemigos menores. |
| `explodesOnDeath` | Al morir suelta explosión/proyectiles. |
| `enrageBelowHp` | Bajo cierto % de vida acelera / dispara más rápido. |
| `healAllies` | Cura periódicamente a enemigos cercanos. |
| `reviveOnce` | Resucita una vez tras morir, con vida parcial. |

### 1.5 Límite puro/Phaser (lo más importante)

- **`systems/EnemyBrain.js` (puro, testeable):** recibe `(def, estadoDinámico, posiciónObjetivo, dt)` y devuelve una **intención**:
  ```js
  {
    velocity: { x, y },
    telegraphs: [ { kind, ...geom } ],          // avisos a dibujar este frame
    attacks: [ {
      projectiles: [ { angle, speed, damage, tex, aoe } ],
      zones:    [ { x, y, radius, dps, duration } ],
      summons:  [ { type, count } ],
    } ],
  }
  ```
  Toda la matemática de patrones, targeting, timing y telegrafía es pura → corre bajo `node --test`.
- **`objects/Enemy.js` (Phaser):** cada frame llama al brain, aplica `velocity`, y entrega las intenciones de ataque/telegrafía a `GameScene`, que **ejecuta** (spawnea proyectiles/zonas/adds vía `ProjectilePool`, dibuja telegrafías). Phaser nunca decide.
- **Telegrafía integrada:** un ataque con `telegraph: 300` emite primero una intención de aviso y, 300 ms después, la de disparo.

### 1.6 Migración (sin romper lo existente)

- El `updateBehavior` actual (chase/ranged hardcodeado) se reemplaza por el brain.
- `villager`/`warrior`/`archer` se reexpresan como recetas (`chase+melee`, `chase+melee` tanque, `kite+shootStraight`) → prueba de retrocompatibilidad (regresión).
- `enemies.js` se divide en `data/enemies/` por mundo, con un **registro** que resuelve `type` → def. Las oleadas en `regions.js` ya referencian `type` por string; eso no cambia.
- `BossMechanics` (`nova`/`boulder`/`poisonFloor`) se reabsorbe como piezas de ataque del catálogo (`nova`, `lobAoe`, `boulder`→`shootStraight` pesado) y **se elimina**: un solo sistema de ataques.
- **Capacidad de proyectiles:** Fuego es denso; se dimensiona un pool de disparos enemigos adecuado (hoy `ProjectilePool` es `maxSize: 200` compartido) y se aplican topes de concurrencia (Sección 5).

---

## 2. Jefes: fases, patrones coreografiados, telegrafías, multi-jefe

Un jefe es **el mismo esquema de enemigo** (`tier` de jefe) más cuatro capas que los enemigos normales no usan. El **vocabulario de piezas es compartido** (no hay dos sistemas de ataque), pero **cada jefe se diseña a mano como una pelea única**: su identidad viene de su recipe de fases + secuencia + gimmick, no de compartir comportamiento con un enemigo basura.

### 2.1 Fases (por umbral de vida)

```js
phases: [
  { from: 1.0, movement: {...}, sequence: [...] },                         // 100%–60%
  { from: 0.6, movement: {...}, sequence: [...], enter: ['spawnLavaFloor'] }, // <60%
  { from: 0.3, speedMul: 1.5, sequence: [...] },                           // <30% frenesí
]
```
Cada fase reescribe movimiento, secuencia de ataque y un hook `enter` que dispara algo una vez al entrar (romper el suelo, invocar, etc.).

### 2.2 Patrón coreografiado (secuenciador), no temporizadores sueltos

Una fase corre una **secuencia ordenada que se repite**, para que el jugador *aprenda* la pelea:

```js
sequence: [
  { do: 'charge',      telegraph: 500, dur: 800 },
  { do: 'wait',        dur: 400 },
  { do: 'shootSpread', count: 9, arc: 120, telegraph: 300 },
  { do: 'summon',      type: 'imp_brasa', count: 2 },
]
```
El secuenciador es una **máquina de pasos sobre el tiempo → lógica pura, testeable** (el `EnemyBrain` en modo jefe).

### 2.3 Telegrafías obligatorias

Todo paso pesado declara su ventana de aviso; `GameScene` dibuja la señal (suelo que brilla, línea de embestida, anillo de carga). Capa de justicia: difícil pero leíble, nunca injusto.

### 2.4 Gimmick de arena (uno por jefe)

Efecto de campo exclusivo que reestructura la pelea: `lavaFloor` (carriles/zonas de lava), `lavaPools` (charcos que se acumulan), `totems` (jefe invulnerable hasta destruirlos), `triangle` (Sección 4.4). El render/colisión es Phaser; la **regla** ("invulnerable mientras haya tótems") es pura.

### 2.5 Encuentros multi-jefe

La fase `levelBoss` puede declarar **varias entidades-jefe simultáneas**:

```js
{ type: 'levelBoss', bosses: [pyra, vesta, favilla], clearWhen: 'allDead' }
```
`GameScene` spawnea las tres; **cada una corre su propio brain/fases independiente**; la fase se limpia cuando mueren todas. `WaveRunner`/`beginPhase` se extienden para manejar N jefes en una fase (hoy asumen uno). UI: barras de vida múltiples.

---

## 3. El roster de Fuego (~20 criaturas)

**Identidad de Fuego:** mayoría **ranged**, **foco en daño**, **denso en proyectiles** (el reto es leer y esquivar). Progresión **cultistas humanos (niveles bajos) → bestias elementales invocadas (cerca del templo)**. Stats exactas se afinan en implementación; esto es el roster de partida (se puede añadir/cortar al construir).

### 3.1 Cultistas (humanos de Ignatius — presencia nv 1–6)

| # | Criatura | Movimiento | Ataque | Modificador | Rol |
|---|----------|-----------|--------|-------------|-----|
| 1 | Acólito de Brasa | `kite` | `shootStraight` | — | Ranged base |
| 2 | Lanzabrasas | `kite` | `shootSpread` (3) | — | Negación de área |
| 3 | Iniciado Veloz | `zigzag` | `melee` | — | Único melee común, te mueve |
| 4 | Piromante | `strafe` | `shootBurst` (4) | — | Presión sostenida |
| 5 | Encapuchado de Pira | `static` | `lobAoe` | — | Control de zona |
| 6 | Pirovidente | `kite` | `shootHoming` | — | Fuerza esquivar/juke |
| 7 | Caballero de Brasa | `charge` | `melee` | `shielded` (frontal) | Bruiser, hay que flanquear |
| 8 | Sacerdote de la Llama | `flee` | `summon` | `healAllies` | Soporte, kill prioritario |
| 9 | Portaestandarte | `orbit` | — | `auraDamage` (buff aliados) | Buff andante, kill prioritario |

### 3.2 Bestias (elementales invocados — presencia nv 4–7)

| # | Criatura | Movimiento | Ataque | Modificador | Rol |
|---|----------|-----------|--------|-------------|-----|
| 10 | Larva de Magma | `chase` lenta | `melee` | `explodesOnDeath` | Castiga matarla de cerca |
| 11 | Salamandra | `zigzag` | `shootStraight` | — | Ranged errático |
| 12 | Espíritu de Ceniza | `erratic` | `shootSpread` | `onHitBurn` | Daño por goteo |
| 13 | Can de Lava | `charge` | `dashStrike` | — | Melee rápido en ráfagas |
| 14 | Elemental de Fuego | `kite` | `nova` | `onHitBurn` | Mini bullet-hell andante |
| 15 | Coloso de Magma | `chase` muy lenta | `lobAoe` pesado | `shielded` | Tanque lento que bombardea |
| 16 | Fénix Menor | `orbit` | `shootBurst` | `reviveOnce` | Volador resistente |

### 3.3 Invocados / ambientales

| # | Criatura | Movimiento | Ataque | Modificador | Rol |
|---|----------|-----------|--------|-------------|-----|
| 17 | Imp de Brasa | `zigzag` | `melee` | — | Add que sueltan sacerdotes/jefes |
| 18 | Avispa de Brasa | `zigzag` rápida | `melee` | (enjambre) | Relleno de swarm |
| 19 | Tótem de Pira | `static` | `nova` lenta | `auraDamage` | Torreta/peligro fijo |
| 20 | Brasa Errante (wisp) | `erratic` | — | `auraDamage` (quema al rozar) | Presión ambiental |

### 3.4 Introducción a lo largo de los 7 niveles

- **Nv 1** — Acólito, Lanzabrasas, Iniciado.
- **Nv 2** — + Piromante, Larva de Magma.
- **Nv 3** — + Encapuchado, Pirovidente, Salamandra.
- **Nv 4** — + Sacerdote, Can de Lava, Espíritu de Ceniza · **miniboss: Pyra**.
- **Nv 5** — + Caballero, Portaestandarte, Elemental, Avispa, Tótem · **miniboss: Vesta**.
- **Nv 6** — + Coloso, Fénix Menor · **miniboss: Favilla** + **levelboss: las tres hermanas (triángulo)**.
- **Nv 7** — roster completo como minions · **mago de templo: Ignatius**.

---

## 4. Las 5 peleas de jefe de Fuego

**Familia:** **Ignatius** (padre, Mago del Fuego) y sus tres hijas **Pyra, Vesta, Favilla**. Las enfrentas solas en nv 4/5/6, juntas en el levelboss del nv 6, y al padre en el templo (nv 7). Vida exacta se afina en Sección 5.

### 4.1 Pyra — Daño (nv4 miniboss)
Ráfaga + cono + incendia el suelo.
- **Movimiento:** `kite`.
- **Fase 1 (100–50%):** `shootSpread` (abanico) → pausa → `lobAoe` (charco en tu posición) → repite. Charcos telegrafiados.
- **Fase 2 (<50%):** `enrageBelowHp`; mete `nova` entre abanicos y suelta 2 charcos por ciclo.
- **Gimmick:** `lavaPools` se **acumulan** y duran más → pierdes terreno seguro poco a poco.
- **Sensación:** puzzle de posicionamiento; castiga quedarte quieto.

### 4.2 Vesta — Tanque/Melee (nv5 miniboss)
Espada en fuego; ser alcanzada por su espada aplica burning. Caza activa.
- **Movimiento:** `charge`.
- **Fase 1:** `charge` (línea telegrafiada) → `dashStrike` al llegar (aplica `onHitBurn`) → recupera (vulnerable) → `shootBurst` corto → repite.
- **Fase 2 (<40%):** `shielded` frontal (pegarle por la espalda), embiste más rápido, doble embestida.
- **Gimmick:** si embiste contra un muro lo agrieta y suelta `nova` de onda + ascuas → puedes cebar la embestida al muro, pero la onda castiga.
- **Sensación:** lee la embestida, esquiva, castiga la recuperación; el escudo te obliga a reposicionar.

### 4.3 Favilla — Summoner/Healer (nv6 miniboss)
Invoca, cura, se esconde entre sus minions.
- **Movimiento:** `flee` (se queda atrás, protegida por su enjambre).
- **Fase 1:** `summon` (imps) → pulsos de `auraDamage` → `lobAoe` → repite. `healAllies` pasivo.
- **Fase 2 (<50%):** `enter`: enciende 3 tótems → **invulnerable hasta destruir los tótems** (los tótems hacen `nova`).
- **Gimmick:** `totems` (la única pelea de "mata el gimmick").
- **Sensación:** puzzle de prioridad de objetivo; divides foco entre adds y tótems.

### 4.4 Las Tres Hermanas — multi-jefe / triángulo de lava (nv6 levelboss)
El reencuentro. Las tres a la vez en **variantes atenuadas** (menos vida c/u, patrón de una sola fase) para que 3 patrones simultáneos sigan siendo leíbles. Sinergia de pinza: **Vesta te empuja** → hacia los charcos de **Pyra** → mientras los imps de **Favilla** llenan los huecos.

**Mecánica del triángulo de lava (firma del encuentro):**
1. **Telegrafiada + las tres se anclan:** cada cierto tiempo las hermanas se detienen y canalizan (~1–1.5 s); las **líneas entre ellas brillan como aviso**; luego se enciende la lava.
2. **Solo el perímetro** del triángulo arde (según sus posiciones), no el relleno.
3. **Tamaño controlado:** antes de canalizar, la IA las reposiciona a una formación más o menos equilátera y de tamaño justo (ni te encierra en un punto, ni cubre toda la arena).
4. **Pulsante:** el perímetro arde unos segundos y se apaga; al rato se reforma según las **nuevas** posiciones.
5. **Atrapada dentro = a merced de las tres**, pero con espacio para esquivar (duro, no imposible).
6. **Cruzar la lava = burning auto-infligido** — cuesta de verdad pero es salida válida (no mata). Gancho futuro: un dash/inmunidad del árbol de habilidades cruzaría limpio.
7. **Se degrada al matar hermanas:** 3 vivas = triángulo; 2 vivas = una **sola línea de lava** entre ambas; 1 viva = solo su kit. Incentivo de kill order + des-escalada.

Además, al morir una hermana las otras **enfurecen** (`enrageBelowHp` disparado por la muerte de una hermana) — *"¡Hermana!"*. `clearWhen: allDead`. Vida total ajustada para ser un **muro real** antes del templo.

### 4.5 Ignatius — el padre (nv7 mago de templo, setpiece de 3 fases)
El examen final del mundo; el toolkit más rico, referencia a sus hijas muertas.
- **Fase 1 (100–66%) "Duelo":** `kite` + `shootSpread` + `shootHoming`. Telegrafiado; enseña su ritmo.
- **Fase 2 (66–33%) "La Pira":** `enter: spawnLavaFloor` → carriles de lava que debes tejer; añade `nova` + `lobAoe`. *"¡Mataste a mis hijas!"*
- **Fase 3 (<33%) "Frenesí":** `enrage` total: todo más rápido, `beam` rotatorio telegrafiado que barre la arena, última oleada de imps.
- **Gimmick:** `lavaFloor` (carriles) + `beam` rotatorio de la fase 3.
- **Sensación:** el examen — esquivar proyectiles densos, leer telegrafías, gestionar espacio, todo a la vez.

---

## 5. Dificultad y balance

Problema de raíz: hoy `Difficulty` escala **solo por poder** (relativa, nunca absoluta). Se ataca en cinco frentes.

### 5.1 Modelo de dos factores

```
multiplicadorEnemigo = curvaBase(region, nivel)  ×  escalaPoder(save)
```
- **`curvaBase`** — escalón **absoluto** por profundidad (nv1 ≈ 1.0 → ~2.3× en nv7), independiente del poder. Cada mundo tiene su **perfil**; el de Fuego inclina hacia *daño y densidad de proyectiles*, no hacia vida.
- **`escalaPoder`** — la actual (`PER_POINT`/`PER_ELEMENT`), quizá un pelo más agresiva, para que sobre-nivelarte no trivialice. `scaleEnemyDef` se mantiene como punto de aplicación.

### 5.2 Oleadas de Fuego: presión sostenida

- **Más enemigos, mayoría ranged**, con **tope de concurrencia** (~12–16 vivos) para que sea denso pero leíble.
- **`spawnDelay` más corto + oleadas que solapan** (la siguiente empieza antes de limpiar la anterior).
- **Regla de composición:** cada oleada = *ancla de amenaza* (élite/ranged que define el puzzle) + relleno + 1 melee que te obliga a moverte. Ej. nv1: 2 Acólitos + 1 Lanzabrasas + 2 Iniciados (en vez de "5 aldeanos").

### 5.3 Equidad (difícil ≠ injusto)

- Telegrafía obligatoria en todo golpe pesado (del motor).
- Topes de concurrencia y de proyectiles en pantalla + pool de disparos enemigos dimensionado para Fuego.
- Lectura visual: proyectiles enemigos con color/forma claramente distinta a los del jugador.

### 5.4 Presupuesto de daño / supervivencia

- Golpe normal ≈ porción chica de vida; golpe pesado **telegrafiado** = castigo grande pero esquivable; `onHitBurn`/lava = DoT que importa.
- **Nada de one-shots** salvo lo claramente telegrafiado. Cruzar la lava del triángulo duele pero no mata.

### 5.5 Vida de jefes (puntos de partida, se afinan en playtest)

Relativos a hoy (miniboss 300, levelboss 650, templo 950):
- Cada hermana en solitario (nv4/5/6): **check real**, ~1.3–1.5× el miniboss actual, pero con su kit haciendo el trabajo (no solo más HP).
- Trío (nv6 levelboss): **muro**, vida total alta repartida en tres, con des-escalada al matar una.
- Ignatius (nv7): la pelea más larga, 3 fases.

### 5.6 Tuning centralizado

Todo el balance (curvas, perfiles por mundo, topes de concurrencia/proyectiles, presupuesto de daño) vive en un módulo **puro** `data/tuning.js` → se itera sin tocar lógica y es testeable.

---

## 6. Botón de borrar guardado + testing

### 6.1 Botón de borrar guardado (debug)

- **Qué hace:** borra la(s) clave(s) de `localStorage` de `SaveSystem` y reinicia a un guardado fresco (progreso + poder a cero), para re-probar la curva de dificultad.
- **Dónde:** botón discreto en el **Menú** ("Borrar guardado") con **confirmación rápida**.
- **Cómo:** `SaveSystem` recibe `removeItem` por inyección; se le agrega `wipe()` (puro, testeable) que elimina la clave; el botón lo llama y reinicia a Boot. Detrás de un flag `DEBUG` en `config.js` (ocultarlo para release = una línea).
- **Orden:** se construye **primero** en la implementación (trivial y necesario para testear lo demás).

### 6.2 Estrategia de testing

Convención del repo: **lógica pura → `node --test`; lo acoplado a Phaser → playtest** (con el botón debug acelerando la iteración).

Nuevos tests de lógica pura:
- `EnemyBrain.test.js` — intenciones de movimiento por tipo, generación de ataques, **timing de telegrafía**.
- `BossSequencer.test.js` — transición de fases por umbral de vida, avance/repetición de la secuencia.
- `TriangleHazard.test.js` — perímetro de 3 posiciones, **degradación** 3→línea→nada, detección "dentro", regla de daño al cruzar.
- `Difficulty.test.js` (extiende) — modelo de dos factores, curva base por profundidad, perfil por mundo.
- `Encounter.test.js` — limpieza multi-jefe (`allDead`), enfurecer al morir una hermana.
- `SaveSystem.test.js` (extiende) — `wipe()` borra la clave y deja guardado fresco.
- Sanity de `tuning.js` — curvas monótonas, topes positivos.
- **Regresión:** `villager`/`warrior`/`archer` como recetas se comportan igual que antes.

Playtest (Phaser): spawning en `GameScene`, render de telegrafías, colisión de lava/triángulo, densidad de proyectiles y topes de concurrencia.

---

## 7. Resumen de archivos afectados (orientativo)

**Nuevos:**
- `src/systems/EnemyBrain.js` — el motor (puro).
- `src/data/tuning.js` — balance centralizado (puro).
- `src/data/enemies/fire.js` — roster de Fuego (data).
- `src/data/enemies/index.js` — registro `type` → def.
- `src/data/bosses/fire.js` — Pyra, Vesta, Favilla, las tres hermanas, Ignatius (data).
- Tests: `EnemyBrain`, `BossSequencer`, `TriangleHazard`, `Encounter` (+ extensiones a `Difficulty`, `SaveSystem`).

**Modificados:**
- `src/objects/Enemy.js` — usa el brain en vez de `updateBehavior` hardcodeado.
- `src/scenes/GameScene.js` — ejecuta intenciones (proyectiles/zonas/adds/telegrafías), maneja fases multi-jefe y gimmicks de arena.
- `src/systems/WaveRunner.js` / `beginPhase` — soporte de N jefes por fase.
- `src/systems/Difficulty.js` — modelo de dos factores.
- `src/systems/SaveSystem.js` — `wipe()`.
- `src/scenes/MenuScene.js` — botón debug de borrar guardado.
- `src/data/regions.js` — oleadas de Fuego rediseñadas (densidad/composición/jefes nuevos).
- `src/config.js` — flag `DEBUG`, claves de textura/color nuevas, dimensionado de pool.

**Eliminados:**
- `src/systems/BossMechanics.js` — reabsorbido en el catálogo de ataques.

---

## 8. Fuera de alcance (specs posteriores)

- Mundos Agua, Aire, Tierra y Castillo (cada uno su propia spec, reusando el motor).
- Nuevas habilidades del jugador / sinergias del árbol (p. ej. el dash que cruza lava limpio).
- Arte con sprites (sigue siendo geométrico procedural).
