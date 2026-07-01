# Pase de dificultad — Mundo de Aire (La Torre Montaña)

**Fecha:** 2026-06-30
**Rama:** `balance/air-world`
**Objetivo:** subir la dificultad de Air al nivel de los pases de Fire y Water, **preservando y reforzando su identidad** (no "otro mundo de otro color"). Auditoría a detalle: cada enemigo, cada nivel, cada jefe, calibrado contra los equivalentes ya-beefeados de Fire/Water.

> Precedente: `balance/water-world` (beef de enemigos + reestructura de oleadas + beef de jefes + timing). Este spec aplica la misma disciplina a Air, pero con decisiones propias de identidad.

---

## 1. La identidad de Air como lente

Cada mundo tiene un **verbo mecánico distinto**. Toda decisión de este pase se mide contra la firma de Air, no contra "subir números":

| Mundo | Firma mecánica |
|---|---|
| Fire | Densidad de proyectiles + rushers |
| Water | Desgaste: healers-ancla, cadenas de vida, control (slow/freeze), tanques |
| **Air** | **Velocidad + desplazamiento + drain vampírico + dominio aéreo** |
| Earth | (futuro) transmute + root/veneno |

**Air presiona por:** te mueven a la fuerza (push/lift/stun), te drenan la sangre, los voladores rompen tu auto-fire, y enseña el kit de Lightning (cadenas en enjambres de murciélagos).

---

## 2. Enemigos (roster de 20)

Ningún enemigo está huérfano, pero **6 aparecen una sola vez** en toda la rama de 8 niveles. Se **reparten a 2–3 niveles cada uno** para que se sientan:

| Enemigo | Hoy | → Objetivo | Rol |
|---|---|---|---|
| `guardia_nocturno` | nv4 | nv4,5,6 | el "muro" de Air (bruiser blindado veloz) |
| `espiritu_tormenta` | nv2 | nv2,3,5 | caster volador (nuevo proyectil plasma-slow) |
| `fuego_fatuo` | nv4 | nv4,5,6 | aura de stun voladora |
| `vampiro_alado` | nv6 | nv5,6 | diver pesado (drain) |
| `gargola_pararrayos` | nv4 | nv4,5,6 | torreta (más grande) |
| `centinela_piedra` | nv3 | nv3,4,5 | torreta homing/petrify |

**Decisión de rol — sin tanque nuevo:** Air es movilidad, no muros lentos. NO se agrega un tipo tanque. El `guardia_nocturno` (rápido + blindado 40%) ES el "muro" de Air; se sube su presencia y render.

---

## 3. Barrido de render (jerarquía de silueta)

`radius` define hitbox **y** tamaño en pantalla (`setDisplaySize(radius*2, radius*2)`). Hoy todo Air vive en 16–20 → sin jerarquía visual. Se crean tres escalones:

| Enemigo | radius hoy → **objetivo** |
|---|---|
| `gargola_pararrayos` | 18 → **36** |
| `centinela_piedra` | 18 → **36** |
| `vampiro_alado` | 19 → **32** |
| `guardia_nocturno` | 20 → **32** |
| `torbellino_errante` | 20 → **36** |
| `arpia` | 16 → **24** |
| `fuego_fatuo` | 16 → **24** |
| resto (fodder/casters/healer/ritual) | **16** |

Resultado: **fodder/casters 16 · amenazas medias 24 · pesados/torretas/hazard 32–36.** Cero motor, solo datos (el sprite se forja al `radius`).

---

## 4. Densidad de oleadas (nv1–6)

Filosofía: **intermedio entre Fire y Water**, que **escale en cantidad Y diversidad**. Air pega más por cabeza (rápido + drena), así que no llega a la densidad-Water (20–27), pero sube muy por encima de hoy.

| Nivel | Fire | Water | Air hoy | **Air objetivo** (pico, #tipos) |
|---|---|---|---|---|
| nv1 basic | 16 | 33 | 19 | **~22** (pico 8, 3 tipos) |
| nv2 basic | 25 | 40 | 26 | **~30** (pico 11, 5 tipos) |
| nv3 basic | 34 | 48 | 33 | **~38** (pico 14, 6 tipos) |
| nv4 inter | 17 | 36 | 17 | **~28** (pico 15, 5 tipos) |
| nv5 inter | 21 | 42 | 19 | **~33** (pico 17, 6 tipos) |
| nv6 clímax | 26 | 48 | 20 | **~40** (pico 20, 7 tipos) |

**Arregla la escalada plana:** hoy los intermedios van 17→19→20 (planos). Objetivo **28→33→40**, creciente, y el clímax nv6 (40) supera al nv3 (38). El dip en nv4 es correcto (ahí entra el miniboss).

---

## 5. Proyectiles — un diseño+efecto por caster

Hoy **6 de 7 casters disparan el mismo `bolt` amarillo** (3 idénticos). Cada caster recibe **proyectil visual + efecto propios**. Todos reusan efectos existentes salvo `slowChance` (añadido menor). El **rojo queda reservado al drain**; los proyectiles usan otros colores.

| Enemigo | Proyectil (diseño) | Color | Efecto | Motor |
|---|---|---|---|---|
| `acolito_trueno` | rayo recto fino (base) | amarillo | — | existe |
| `espiritu_tormenta` | esfera de plasma lenta | azul-blanco | **slow** | existe |
| `tronador` | trueno en abanico ancho | amarillo pálido | **push** leve | existe |
| `heraldo_rayo` | rayo dentado incandescente | blanco-amarillo | **stun** | existe |
| `hechicero_viento` | tornado (ya distinto) | gris | **lift** | existe |
| `gargola_pararrayos` | arco de pararrayos (nova grande) | amarillo | **stun** | existe |
| `centinela_piedra` | chispa rastreadora pétrea | violeta/gris-piedra | **petrify (root ~0.6s)** | `root` existe |

**`petrify` = `root` corto (~0.6s):** pies clavados pero SIGUES disparando/casteando (no `stun`, que sería muerte segura con homing). Justo por: proyectil lento+telegrafiado, single-target, torreta estática (reposicionarte la neutraliza). Plan B si es brutal: bajar a slow.

Los diseños de proyectil se implementan como tipos en `data/projectiles.js` (tex/tint/effect) o sprites nuevos ligeros.

---

## 6. Drain — rework a sifón "Blood Omen" (`drainBite`)

**El sello vampírico de Air, hoy invisible.** El drain actual (`modifier drain` heal) solo cura al contacto físico, poco, y **sin ningún feedback visual**. Rework completo:

### Mecánica `drainBite { amount, range, cooldown }`
- **Sifón a distancia, sin contacto físico**, por proximidad.
- **Mordisco discreto + cooldown por instancia** (no chorro continuo → sin spam de VFX): si estás dentro de `range` px y el cooldown está listo → un mordisco (te roba `amount`, el vampiro se cura lo mismo = transferencia), luego cooldown.
- **VFX:** tether de rayo **rojo sangre** (generalizar `drawZap(points, color)`) del vampiro hacia la princesa + número flotante rojo "−N". Un zap por mordisco.
- **Encima** del daño/efectos normales del enemigo.
- Cooldown **por enemigo** (patrón `tryMeleeContact` con `_drainReadyAt`).
- En Galahad, cura la forma activa (ruta `_formSeq`).

### Escalonado (enemigos regulares)
| Categoría | Enemigos | Mordisco | Cooldown | Rango |
|---|---|---|---|---|
| Pesados | `guardia_nocturno`, `vampiro_alado`, `vastago_vampirico` | 14 hp | 1800ms | 130px |
| Enjambre | `murcielago`, `siervo_torre` | 6 hp | 1800ms | 130px |

Los jefes sobreescriben sus params (ver §7). **Plan B** si el enjambre fulmina: cap global "solo los 2 vampiros más cercanos sifonean".

---

## 7. Jefes

### nv4 — Caballero de Sangre (tanque-vampiro veloz)
| Stat | Hoy → **Objetivo** |
|---|---|
| hp | 440 → **640** |
| shielded | — → **0.25** |
| speed | 110 → **180** (terror; ≤ player 200) |
| radius | 24 → **28** |
| drainBite | contacto → **20hp @ 150px, cd 4000ms** (charger que embiste y muerde) |
| movimiento | charge/dashStrike (melee) |
| **dardo de sangre** (nuevo) | `shootStraight` **violeta**, muy veloz (~320), recto, **~35% `slowChance`** + daño |
| P2 | evade + dash×2 + invoca murciélagos |

### nv5 — Bruja del Vendaval (jefa-tormenta escurridiza)
| Stat | Hoy → **Objetivo** |
|---|---|
| hp | 420 → **640** |
| shielded | — → **0.15** |
| speed | 75 → **100** |
| radius | 26 → **30** |
| kit | lift + stun (se mantiene) |

**Nueva mecánica — "Blink de Tormenta"** (variante del `submerge` del Kraken que **reubica**):
1. Cadencia: 1×/ciclo (beat dramático).
2. Rayo vertical cae donde está → **desaparece** (untargetable + invisible).
3. Brotan **4 espíritus** en ese punto.
4. Tras **3600ms**, rayo vertical en un **punto nuevo aleatorio** (lejos de la princesa) → **reaparece** ahí.

**Summons (rompe el "todos invocan murciélagos"):** arpías (cap 3) · espíritus (cap 6, del blink) · torbellino/tornado (cap 1–2). **No** murciélagos.

### nv6 — Elemental de Tormenta (esponja-horda "virtualmente infinita")
| Aspecto | Hoy → **Objetivo** |
|---|---|
| hp | 680 → **2000** |
| shield | resist 0.20 → **shielded 0.25** |
| render | 128×64 → **256×128** |
| radius/hitbox | 56 → **~100** |
| posición | **x=240, y≈320** (`anchorY = 0.375`, 3ª banda vertical desde abajo, centrado) |

**Horda por fase — SOLO no-humanoides** (criaturas), combinación retadora por fase, cap creciente, respawn acelerando. Cap global del motor = **16 vivos** (el jefe no cuenta) → red de seguridad de rendimiento; kill-one/spawn-one mantiene la arena llena.

| Fase | Invoca (×tanda, cap) | respawn | vivos aprox |
|---|---|---|---|
| P1 (100%) | murciélago (3, cap5) + espíritu (2, cap3) | 7s | ~8 |
| P2 (<60%) | murciélago (3, cap5) + arpía (2, cap4) + torbellino (1, cap2) | 5s | ~11 + ojo |
| P3 (<30%) | murciélago (3,c5) + espíritu (2,c3) + fuego fatuo (2,c3) + arpía (2,c3) + torbellino (1,c2) | 4s | ~16 (tope) |

Escala: cap 8→11→**16** · variedad 2→**5** tipos · respawn 7→5→**4s**.

**Ojo del tornado** (`spawnTornado`, jalón al centro) reforzado:
- `TORNADO_EYE_PULL` 0.7 → **0.9** (base 140→180 px/s)
- `scaleForPhase` P3 1.6 → **1.9** (P3 = 342 px/s, te arranca al centro)
- `TORNADO_TELEGRAPH_MS` 1100 → **800** (entra más rápido)
- `TORNADO_RADIUS` 130 (sin cambio)

### nv7 — Líder Cultista: "El Ritual de Galahad" (setpiece nuevo)

**Disposición** (centrada): ataúd vertical **sólido** (StaticBlock rectangular, x=240, la princesa NO lo atraviesa) · **Líder** en la cabecera norte (unreachable) · **6 cultistas** flanqueando (3 izq + 3 der) · **gárgola** al pie sur.

**Mecánica del rito:**
- Barra **siempre avanza** durante **3 min** (`RITUAL_FILL_MS` 38000 → **180000**). Matar guardias NO la frena → **imposible de evitar**.
- **Reemplazo de guardias:** al matar un cultista del ataúd, el nuevo **NO aparece en su lugar** (se vería como bug) — **spawnea en un borde y CORRE al ataúd** hacia la ranura vacía (movimiento hacia punto fijo, no hacia la princesa); al llegar retoma el canto.
- **Oleadas abundantes** aparte (llenan el cap de 16): humanoides casters (acólito/heraldo/hechicero/tronador) + healer (`sacerdote_sangre`), cap alto.
- **6 guardias + gárgola = setpiece exento del cap** (las oleadas llenan el cap aparte → pantalla repleta).
- Al cumplirse 180s: todo killable, incluido el líder → matarlo = **última sangre** → limpia el nivel → Galahad revive (ironía trágica).

**Arte nuevo:** sprite de **ataúd** (se resuelve con subagent + Playwright).

### nv8 — Galahad (temple boss, 5 formas)

Cambiaformas (reusa `FormSequencer`). Gemelo de la Dama del Lago; cada forma comparada vs la forma equivalente de la Dama y subida a ≥ ella.

| # | Forma | hp | speed | resist | radius | drainBite | Kit / notas |
|---|---|---|---|---|---|---|---|
| 1 | Humano | **640** | 150 | 0.10 | 26 | 20 @ **300px** / 4000ms | evade (esquiva orbes), **dardos violeta**, P2 **+ homing + nova** |
| 2 | Rage | **700** | 180 | 0.15 | 30 | 24 @ 150px / 4000ms | charge, murciélagos, **P2 triple dash** |
| 3 | Rage ×2 | **780** | 200 | 0.20 | 30 | 28 @ 150px / 4000ms | cadencia doblada, **P2 cuádruple dash** |
| 4 | Murciélago | **950** | 120 | 0.30 | **72** (render **200×100**) | 30 @ 180px / 4000ms | volador, dive, **nova ráfaga 14→16 (push)**, murciélagos cap 8 |
| 5 | Final | **250** | 55 | 0 | 24 | — | flee, **spread violeta desesperado** |

**Suma: 3320 hp** → el cambiaformas más duro del juego (vs Dama 2930). Todos los drainBite cd 4000ms. Resist trepa 0.1→0.3.

**deathFeint (el suspenso "¿ya murió?"):**
- **Cadáver siempre horizontal** (sprite `galahad_cadaver` 2:1 tumbado), mismo tamaño consistente cada muerte.
- **Entre formas:** yace muerto + **unreachable 3600ms**, luego se levanta como la siguiente forma. ×4.
- **Muerte final:** yace muerto + unreachable **3600ms IDÉNTICO** a los feints (no sabes si es el final) → **entonces** se enciende en fuego → termina el nivel (onClear + diálogo de cierre).
- Cada "muerte" se ve exactamente igual → suspenso puro hasta que el fuego confirma.

---

## 8. Trabajo de motor nuevo

| Pieza | Detalle |
|---|---|
| `drainBite` modifier | sifón por proximidad + cooldown por instancia + `drawZap` rojo + float "−N"; params por instancia/jefe |
| `slowChance` | efecto de probabilidad al impactar un disparo (roll `random < chance`) |
| `drawZap(points, color)` | generalizar (hoy fijo a `COLORS.lightning`) para el tether rojo y los rayos verticales |
| Blink de la Bruja | variante de `submerge` que **reubica** + rayo vertical (tell) + spawn de 4 espíritus |
| Ataúd sólido | `StaticBlock` extendido a rectángulo (no cuadrado) + colisión con caster |
| Setpiece exento del cap | 6 guardias + gárgola no cuentan para `CONCURRENCY_CAP` |
| Guardia respawn-a-ranura | spawnea en borde y se mueve a un **punto fijo** (ranura), no a la princesa |
| deathFeint timing | ventana 1000ms → **3600ms** entre formas **y** 3600ms en la muerte final antes del fuego |
| Elemental render/pos | `setDisplaySize(256,128)` + `anchorY 0.375` + radius ~100; scheduling de horda por fase |

## 9. Constantes de tuning

| Constante | Hoy → **Objetivo** |
|---|---|
| `RITUAL_FILL_MS` | 38000 → **180000** |
| `TORNADO_EYE_PULL` | 0.7 → **0.9** |
| `scaleForPhase` (P3) | 1.6 → **1.9** |
| `TORNADO_TELEGRAPH_MS` | 1100 → **800** |
| deathFeint window (nuevo) | **3600ms** |
| drainBite defaults (nuevos) | pesados 14/130/1800 · enjambre 6/130/1800 |

## 10. Arte nuevo

- **Sprite de ataúd** (Galahad) — subagent + Playwright.
- **7 diseños de proyectil** de casters (algunos = tint/tex nuevo en `projectiles.js`, otros sprites ligeros).
- Verificar que `galahad_cadaver` renderiza **horizontal** consistente.

## 11. Fuera de alcance / Plan B

- **Densidad:** si en playtest es brutal, se afina a la baja.
- **Speeds** (Caballero 180, Galahad hasta 200): plan B bajar si las peleas se arrastran.
- **deathFeint 3600ms:** plan B más corto si cansa (ya bajado de 5s).
- **Drain enjambre:** plan B cap global "2 vampiros más cercanos sifonean".
- **petrify del centinela:** plan B bajar a slow.
- No se rediseñan kits que ya funcionan ni se toca el engine fuera de lo listado en §8.

## 12. Tests

Actualizar/añadir pins de `node --test` para: stats de jefes (hp/resist/radius por forma de Galahad, Caballero, Bruja, Elemental), `RITUAL_FILL_MS`, constantes de tornado, y el roster/recipes de Air si cambian summons. Mantener la suite verde.
