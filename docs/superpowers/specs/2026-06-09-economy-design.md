# The Caster — Diseño: Economía (oro + tienda + respec) (Subsistema #3)

**Fecha:** 2026-06-09
**Estado:** Aprobado (diseño) — pendiente plan de implementación
**Relacionado:** `2026-06-09-skill-tree-epic-roadmap.md` (épico, §5), `2026-06-09-skill-tree-design.md` (#2, ya implementado).

---

## 1. Objetivo y alcance

Agregar la capa económica que cierra el bucle de progresión: ganas **oro** al terminar niveles, lo gastas en una **tienda** (consumibles que llevas en un inventario) o en **respecear** el árbol — pero no alcanza para ambos, así que decides.

**Dentro de alcance:** oro (recompensa al limpiar nivel), tienda en el mapa + inventario persistente, 3 consumibles (poción / elixir / pluma de fénix), respec del árbol con costo escalado en oro, `Save` v3 + migración.

**Fuera de alcance:** meta-progresión (logros / modo survival) → #4; números finos de balance; arte/audio.

## 2. Decisiones (resumen)

| Tema | Decisión |
|---|---|
| Oro | Se otorga **al terminar un nivel**: base por tipo × multiplicador de dificultad actual × factor de tiempo (rápido = bonus). Finito. |
| Tienda | Botón en el **`MapScene`** → `ShopScene`. Compras a **inventario persistente** (no es pre-nivel). |
| Consumibles | 🧪 Poción (auto bajo HP), ⚗️ Elixir (**botón manual** en HUD, +daño temporal), 🪶 Fénix (auto-revive al morir). Se consumen del inventario al dispararse. |
| Respec | Botón en `SkillTreeScene`; cuesta `100 × 3^respecCount` oro; devuelve los skill points gastados; sube `respecCount`. |
| Tensión | El oro finito alcanza para buffs **o** respec, no ambos. |

## 3. Oro

- Función pura `Economy.goldReward(level, mult, clearMs)` → entero.
  - `base` por `level.kind`: básico 8 · intermedio 12 · pre-templo 20 · templo 35 *(tunable)*.
  - `× mult` (el `difficultyMultiplier(save)` que ya usa `GameScene`): más duro = más oro, coherente con el sistema de dificultad.
  - `× timeFactor`: derivado de `clearMs` contra un "par" por tipo; limpiar rápido sube la recompensa, lento la baja. Clamp ~`[0.75, 1.5]` *(forma fija; par/curva tunables en el plan)*.
- `GameScene` cronometra el nivel: marca el inicio cuando arranca la primera fase (tras el diálogo de intro) y calcula `clearMs` en `finishLevel`.
- En `finishLevel`: tras `Campaign.grantClear` (skill points), suma `gold += goldReward(...)`, persiste, y el diálogo de fin muestra "+N oro" junto a los puntos.

## 4. Tienda (`ShopScene`)

- Botón **"🛒 Tienda"** en `MapScene` (junto al del árbol), mostrando el saldo de oro.
- `ShopScene` lista los ítems de `SHOP_ITEMS` con ícono, nombre, precio y tu saldo. Tocar un ítem **comprable** (oro ≥ precio) → `Economy.buy` (oro −precio, `inventory[item] += 1`), persiste, refresca. Botón "Volver" → `Map`.
- Datos en `src/data/shop.js`: `SHOP_ITEMS` (lista, define orden de UI) con `{ key, label, icon, price, ...params }`. Precios *(tunables)*: poción 40 · elixir 60 · fénix 150.

## 5. Consumibles (inventario persistente)

Cantidades en `save.inventory`. Se consumen (decrementan + persisten) al dispararse.

- 🧪 **Poción** — *auto*: cuando `caster.hp / maxHp < threshold` (0.30) y `inventory.potion > 0`, consume 1 y cura `healPct` (0.5) de `maxHp` (clamp a maxHp).
- ⚗️ **Elixir** — *manual*: botón en el HUD; al tocar, si `inventory.elixir > 0`, consume 1 y aplica un **buff de +daño** (`dmgMult` 1.5) por `durationMs` (8000) a **todo el daño saliente** (orbe básico + skills). El HUD muestra cantidad y el buff activo.
- 🪶 **Pluma de fénix** — *auto*: cuando un golpe sería letal y `inventory.phoenix > 0`, consume 1 y **revive** al `revivePct` (0.5) de `maxHp` en vez de morir.
- Params viven en la entrada de `SHOP_ITEMS` de cada ítem (precio + efecto en un solo lugar).

**Aplicación del buff de daño:** `GameScene` mantiene un `damageBuffRemaining` (ms) y un multiplicador; el daño saliente (fireOrb, cast_*) se multiplica por el buff activo. (Es runtime de combate, no un stat persistente del árbol.)

**Persistencia al consumir:** consumir escribe el inventario al save de inmediato (si lo gastas, se fue — incluso si luego mueres y reinicias el nivel).

## 6. Respec

- Botón **"Reiniciar árbol (N oro)"** en `SkillTreeScene`, mostrando el costo actual.
- `Economy.respecCost(respecCount)` = `100 × 3^respecCount` (100 → 300 → 900 …). Escalada **permanente**.
- `Economy.respec(save)`: requiere `gold ≥ cost`; devuelve un save nuevo con `gold -= cost`, `skillPoints += refund` (suma de `cost` de los `purchasedNodes`), `purchasedNodes = []`, `respecCount += 1`. (No toca elementos dominados ni progreso de campaña.)
- `canRespec(save)` gobierna si el botón está activo.

## 7. Save v3 (migración)

- `SAVE_VERSION = 3`. `DEFAULT_SAVE` agrega: `gold: 0`, `inventory: { potion: 0, elixir: 0, phoenix: 0 }`, `respecCount: 0`.
- `load()`: v3 → merge con fresh; v2 → `migrateV2toV3` (conserva todo, agrega los campos nuevos en 0); v1 → `migrateV2toV3(migrateV1toV2(parsed))`; versión desconocida → fresh; parse error → fresh.

## 8. Arquitectura

- **Pura (sin Phaser, testeable):**
  - `src/systems/Economy.js`: `goldReward(level, mult, clearMs)`, `respecCost(respecCount)`, `canBuy(save, itemKey)`, `buy(save, itemKey)`, `canRespec(save)`, `respec(save)`. Importa `SHOP_ITEMS` (precios) y `SKILL_TREE` (refund), ambos data pura.
  - `src/data/shop.js`: `SHOP_ITEMS`.
  - `src/systems/SaveSystem.js`: v3 + `migrateV2toV3`.
- **Phaser (playtest):**
  - `ShopScene` (nueva): lista, comprar, volver.
  - `MapScene`: botón Tienda + saldo de oro.
  - `SkillTreeScene`: botón respec.
  - `GameScene`: cronómetro de nivel; `gold` en `finishLevel`; disparadores de poción/fénix en `damageCaster`; buff de elixir (estado + multiplicador en el daño saliente); carga `inventory` del save y lo persiste al consumir.
  - `UIScene`: botón de elixir (cantidad + estado del buff).

## 9. Testing (lógica pura, `node --test`)

- `Economy.goldReward`: crece con `mult` y con base por tipo; el factor de tiempo sube con clears rápidos y está clamp-eado; entero.
- `Economy.respecCost`: 100, 300, 900… (×3 por `respecCount`).
- `Economy.buy`: requiere oro suficiente; descuenta y sube inventario; inmutable; `canBuy` correcto.
- `Economy.respec`: requiere oro; descuenta, devuelve los puntos gastados, limpia `purchasedNodes`, sube `respecCount`; inmutable; no toca `elements`/`regionProgress`.
- `SaveSystem`: migración v2→v3 (y v1→v3) conserva datos y agrega `gold/inventory/respecCount`; fresh v3 correcto.
- El "feel" (auto-poción, fénix, buff de elixir, oro por tiempo) se valida **jugando**.

## 10. Fuera de alcance (recordatorio)

- Meta-progresión: logros / modo survival por ahorrar oro → **#4**.
- Números finos de balance (oro, precios, params, par de tiempo), arte/audio.
