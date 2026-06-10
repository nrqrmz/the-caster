# The Caster — Roadmap: Skills, Árbol y Economía

**Fecha:** 2026-06-09
**Estado:** Roadmap (visión + decisiones tomadas) — los specs detallados se escriben por subsistema, justo antes de implementar.
**Relacionado:** `2026-06-09-the-caster-design.md` (diseño base), `2026-06-09-the-caster-scenarios-design.md` (campaña).

---

## 1. Propósito de este documento

Lo que empezó como "expandir el skill tree" creció a **varios sistemas entrelazados**. Este roadmap captura **toda la visión y todas las decisiones ya tomadas** para que no se pierdan, y fija el **orden de construcción**. Cada subsistema tendrá su propio ciclo **spec → plan → implementación** (su spec detallado se escribe justo antes de construirlo, ya informado por lo anterior).

Este doc es la fuente de verdad de la visión; vive en git, no en la memoria de una sesión.

## 2. Subsistemas y orden

| # | Subsistema | Depende de | Ciclo |
|---|---|---|---|
| 1 | **Skills elementales jugables** + HUD multi-skill | campaña (templos otorgan elementos) | **primero** |
| 2 | **Árbol de habilidades** (ramas + tracks + UI) | #1 | segundo |
| 3 | **Economía**: oro + tienda pre-nivel + respec | #1, #2 | tercero |
| 4 | **Meta-progresión**: logros / modo survival | #3 | futuro |

Regla: cada ciclo entrega algo **jugable y testeado**. La lógica pura se mantiene Phaser-free y con tests (`node --test`), siguiendo la convención del proyecto.

---

## 3. Subsistema #1 — Skills elementales jugables (DISEÑO CASI CERRADO)

Hoy solo **fireball** es jugable; aire/agua/tierra se desbloquean en sus templos pero no tienen gameplay. Este ciclo las vuelve a las cuatro jugables. Cada skill es un **botón activo con cooldown** en el HUD (como fireball hoy); solo aparecen las ya desbloqueadas (vía templo de la campaña).

| Skill | Elemento | Mecánica base | "Especial" |
|---|---|---|---|
| 🔥 **Fireball** | fuego | Proyectil que explota en área (ya existe) | **Quemadura/Burn**: nodo que desbloquea DoT a los golpeados; luego sube daño/duración |
| ⚡ **Lightning** | aire | Rayo instantáneo al enemigo más cercano que **salta en cadena** a otros cercanos | **Cadena**: nº de saltos 2→3→4→5 |
| ☠️ **Poison** | tierra | Suelta una **zona venenosa a los pies de la hechicera**: daña enemigos por segundo **y la regenera a ella** mientras está parada dentro | Doble filo daño/sustain |
| ❄️ **Freeze** | agua | **Explosión de escarcha** en área: **congela** (inmoviliza) a enemigos débiles; solo **ralentiza** a élites | Efecto por tier de enemigo |

**Decisiones cerradas:**
- ⚡ Se llama **Lightning** (no "thunderbolt"): la mecánica de cadena se lee mejor así. Cambia la clave `thunderbolt`→`lightning` que hoy otorga el templo de aire (cambio menor en `regions.js`).
- ☠️ La zona de poison cae **a los pies del caster** (no apuntada): te paras ahí para regenerarte; los enemigos que la cruzan reciben daño.
- ❄️ Freeze necesita una marca de **"élite"** en los datos de enemigo (miniboss/levelBoss/templeBoss = élite → ralentiza; aldeano/guerrero/arquero = débil → congela).
- 🔥 La **Quemadura** es un nodo desbloqueable (no viene de base con fireball).

**Pendiente para el spec de #1:** HUD multi-botón (4 skills, solo las desbloqueadas; layout en portrait), nuevas stats base por skill (`lightning*`, `poison*`, `freeze*`, `fireballRadius`, flags de burn/freeze), y cómo se inmoviliza/ralentiza (parar `setVelocity`/multiplicar speed por un factor temporal). Estas skills introducen stats que el árbol (#2) luego potenciará.

---

## 4. Subsistema #2 — Árbol de habilidades

- **Forma:** árbol ramificado real (no la lista plana actual). Dentro de cada rama, **tracks lineales por atributo** (ej. Daño I→II→III, −Cooldown I→II, Área I→II); se compran en orden dentro de cada track. No hay forks exclusivos. La "decisión de build" es **en qué ramas/tracks inviertes tus puntos escasos**.
- **Ramas elementales (4):** una por skill (fireball, lightning, poison, freeze), con tracks de **+daño, −cooldown, +duración, +área** y su especial (burn / cadena / regen-de-zona / % de ralentización). **Se desbloquean al dominar ese elemento** (completar su templo en la campaña).
- **Ramas generales (disponibles desde el inicio):** *Ataque básico* (daño, cadencia), *Vida* (vida máx, **Regen** — stat nueva: HP/seg pasivo en combate), *Movilidad* (velocidad).
- **Puntos finitos:** la campaña no permite repetir niveles → los skill points son finitos (~70 en total). El árbol debe tener **más nodos de los que puedes pagar** → fuerza especialización. (No se puede maximizar todo.)
- **UI nueva:** árbol 2D ramificado, navegable en portrait (probablemente scroll/pan). El layout visual se diseña en el ciclo de #2 (candidato a usar el companion visual).
- El motor ya soporta esto: `SkillTree.getStats` aplica efectos `{stat, add}` con `requires` y `STAT_FLOORS`. Lo que falta es la data (más nodos/tracks), las stats nuevas y la UI de árbol.

---

## 5. Subsistema #3 — Economía (oro + tienda + respec)

- **Oro:** se otorga **al completar un nivel** (no hay moneditas en pantalla por kill). El monto depende de la **dificultad de los enemigos del nivel** y del **tiempo que tomó limpiarlo** (más rápido / más duro = más oro). El oro es **finito** (sin farmeo, igual que los skill points).
- **Tienda pre-nivel:** antes de entrar a cada nivel puedes comprar **consumibles para esa corrida**:
  - **Poción:** se **auto-consume** cuando tu vida baja de cierto umbral (auto-cura).
  - **Elixir de daño:** buff temporal de +daño durante el nivel.
  - **Pluma de fénix:** **auto-revive** con un % de vida si te matan.
- **Respec del árbol:** cuesta **oro** (no skill points, para no dejarte en desventaja de poder), con **costo escalado ×3 permanente** (100 → 300 → 900 → …). Como el oro es finito y el costo crece, el sistema **se auto-limita** a unos pocos respecs por partida: puedes **corregir e iterar, pero no probar 40 builds**.
- **Tensión central:** el oro alcanza para **buffs O respec, no para ambos** → decisión estratégica entre potenciar tus corridas o reconfigurar tu build.
- **Stats nuevas en el save:** `gold`, `respecCount` (para el escalado), e inventario de consumibles comprados.

---

## 6. Subsistema #4 — Meta-progresión (futuro)

- Si **no gastas oro** (ni en buffs ni en respecs), se premia el ahorro con **meta-recompensas**: desbloquear **logros** y/o el **modo Survival** (Arena/Endless, ya mencionado como futuro en el diseño base).
- Es el subsistema más grande y abierto (un modo de juego nuevo) — se diseña al final, en su propio ciclo, una vez que la economía exista.

---

## 7. Fuera de alcance / a decidir más adelante

- Números finos de balance (daño/cooldowns/áreas de cada skill, curva de costos del árbol, oro por nivel, umbrales de la poción, % de la pluma de fénix). Se afinan jugando, en cada ciclo.
- Arte final y audio.
- El diseño detallado del modo Survival.
