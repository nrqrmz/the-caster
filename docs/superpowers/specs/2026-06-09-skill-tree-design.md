# The Caster — Diseño: Árbol de Habilidades (Subsistema #2)

**Fecha:** 2026-06-09
**Estado:** Aprobado (diseño) — pendiente plan de implementación
**Relacionado:** `2026-06-09-skill-tree-epic-roadmap.md` (épico), `2026-06-09-elemental-skills-design.md` (#1, ya implementado).

---

## 1. Objetivo y alcance

Convertir la lista plana actual de skill tree en un **árbol ramificado real** con decisiones de build, sobre las skills que ya existen (fireball + lightning/poison/freeze del ciclo #1) y los stats generales.

**Dentro de alcance:**
- Estructura de árbol: ramas con **tracks lineales por atributo**.
- 4 **ramas elementales** (gated al dominar el elemento en la campaña) + **ramas generales** (siempre disponibles).
- **UI de pestañas** (layout elegido): pestaña por rama; dentro, los tracks como columnas de nodos.
- **Stats/gameplay nuevos** que el árbol necesita: `healthRegen` (regen pasivo en combate), `fireballRadius` (para el track de Área de fuego), y el **burn** de fireball (DoT al impactar) con sus stats.
- Reutiliza el motor puro existente (`SkillTree.getStats/canPurchase/purchase`).

**Fuera de alcance:**
- **Respec** → ciclo de **economía (#3)** (cuesta oro; ver roadmap §5). El #2 no permite deshacer compras.
- Oro / tienda / consumibles → #3.
- Números finos de balance (costos/efectos exactos) y arte final.

## 2. Decisiones (resumen)

| Tema | Decisión |
|---|---|
| Forma de rama | **Tracks lineales** por atributo (daño I→II→III, −cd I→II, …). Sin forks exclusivos. |
| UI | **Pestañas** (opción B): General + 4 elementales; cada pestaña muestra sus tracks como columnas de nodos. |
| Ramas elementales | **Gated**: la pestaña se habilita al dominar ese elemento (`save.elements`). Bloqueada se ve, pero no comprable. |
| Ramas generales | Disponibles desde el inicio. |
| Puntos | **Finitos** (~70 en la campaña, sin farmeo). El árbol cuesta **más** de lo pagable → especializas. |
| Respec | **No** en #2 (va en #3 con oro). |

## 3. Estructura de datos

Se conserva el diccionario de nodos `SKILL_TREE` (id → `{ label, cost, requires:[], effect:{stat, add} }`) y se agrega una estructura de presentación/gating:

```js
// src/data/skilltree.js
export const SKILL_BRANCHES = [
  { key:'basic', label:'Ataque básico', element:null, tracks:[
    { label:'Daño',     nodes:['dmg1','dmg2','dmg3'] },
    { label:'Cadencia', nodes:['rate1','rate2','rate3'] } ] },
  { key:'vit', label:'Vida', element:null, tracks:[
    { label:'Vida máx', nodes:['hp1','hp2','hp3'] },
    { label:'Regen',    nodes:['regen1','regen2'] } ] },
  { key:'mob', label:'Movilidad', element:null, tracks:[
    { label:'Velocidad', nodes:['spd1','spd2'] } ] },
  { key:'fire', label:'🔥 Fuego', element:'fire', tracks:[
    { label:'Daño',      nodes:['f_dmg1','f_dmg2'] },
    { label:'−Cooldown', nodes:['f_cd1','f_cd2'] },
    { label:'Área',      nodes:['f_area1','f_area2'] },
    { label:'Quemadura', nodes:['f_burn1','f_burn2'] } ] },
  { key:'air', label:'⚡ Aire', element:'air', tracks:[
    { label:'Daño',      nodes:['l_dmg1','l_dmg2'] },
    { label:'−Cooldown', nodes:['l_cd1','l_cd2'] },
    { label:'Cadena',    nodes:['l_chain1','l_chain2','l_chain3'] } ] },
  { key:'earth', label:'☠️ Tierra', element:'earth', tracks:[
    { label:'Daño',          nodes:['p_dmg1','p_dmg2'] },
    { label:'−Cooldown',     nodes:['p_cd1','p_cd2'] },
    { label:'Duración',      nodes:['p_dur1','p_dur2'] },
    { label:'Regen de zona', nodes:['p_heal1','p_heal2'] } ] },
  { key:'water', label:'❄️ Agua', element:'water', tracks:[
    { label:'−Cooldown',      nodes:['w_cd1','w_cd2'] },
    { label:'Área',           nodes:['w_area1','w_area2'] },
    { label:'Duración',       nodes:['w_dur1','w_dur2'] },
    { label:'Ralentización',  nodes:['w_slow1','w_slow2'] } ] },
];
```

- **Linealidad:** dentro de un track, cada nodo `requires` el anterior (`dmg2.requires=['dmg1']`, etc.). `SKILL_TREE_ORDER` (de la UI plana actual) se retira; el orden lo da `SKILL_BRANCHES`.
- **Gating:** una rama con `element != null` está bloqueada hasta que `save.elements.includes(element)`. Helper puro `isBranchUnlocked(save, branch)`.

## 4. Tracks por rama (qué sube cada uno)

Valores **tunables** (se fijan en el plan); lo que el diseño fija es el **stat** que toca cada track y el patrón lineal (2–3 nodos, costo creciente). Efectos vía `effect:{stat, add}` (recuerda: `*Cooldown`/`shotRate`/`freezeSlowPct` usan `add` negativo).

| Rama | Track → stat |
|---|---|
| Ataque básico | Daño → `basicDamage` (+) · Cadencia → `shotRate` (−) |
| Vida | Vida máx → `maxHealth` (+) · Regen → `healthRegen` (+) |
| Movilidad | Velocidad → `moveSpeed` (+) |
| 🔥 Fuego | Daño → `fireballDamage` · −CD → `fireballCooldown` (−) · Área → `fireballRadius` · **Quemadura** → desbloquea/sube `burnDamage`/`burnDuration` |
| ⚡ Aire | Daño → `lightningDamage` · −CD → `lightningCooldown` (−) · Cadena → `lightningChain` (+1 por nodo: 2→3→4→5) |
| ☠️ Tierra | Daño → `poisonDamage` · −CD → `poisonCooldown` (−) · Duración → `poisonDuration` · Regen de zona → `poisonHeal` |
| ❄️ Agua | −CD → `freezeCooldown` (−) · Área → `freezeRadius` · Duración → `freezeDuration` · Ralentización → `freezeSlowPct` (−, élites aún más lentos) |

**Importante:** casi todos son **pura data** — el código de casteo (#1) ya lee esos stats, así que un nodo que los modifica "ya funciona" vía `getStats`. Las dos excepciones que requieren **gameplay nuevo** son la **Quemadura** y el **Regen pasivo** (ver §5).

## 5. Stats y gameplay nuevos

- **`healthRegen`** (nuevo en `BASE_STATS`, base 0): regen pasivo. En `GameScene.update`, `caster.hp = min(maxHp, hp + stats.healthRegen * dt)`.
- **`fireballRadius`** (nuevo en `BASE_STATS`, base 70): `cast_fireball` deja de usar el literal `70` y usa `this.stats.fireballRadius`. Permite el track de Área.
- **Burn** (nuevo): stats `burnDamage` (DoT/seg, base 0 → un nodo lo activa) y `burnDuration` (ms). Al impactar una explosión de fireball, los enemigos golpeados reciben un **estado de quemadura** (igual patrón que freeze/slow en `Enemy`: `burnRemaining`, `burnDps`), que tickea daño por segundo mientras dura. Con `burnDamage` base 0, la quemadura solo existe si compras el nodo que la activa.
- `STAT_FLOORS`: agregar pisos para los nuevos `*Cooldown`/`freezeSlowPct` que el árbol reduce (ej. `freezeSlowPct` no baja de 0.2), evitando valores rotos.

## 6. UI — `SkillTreeScene` (reescritura, pestañas)

- **Fila de pestañas** arriba: General (las 3 ramas generales agrupadas o como primera pestaña) + una por elemento (🔥⚡☠️❄️). Las pestañas de elementos **no dominados** se ven deshabilitadas con nota ("Domina el elemento en su templo").
- **Contenido de la pestaña activa:** sus tracks como **columnas**; cada columna es una etiqueta + una pila de nodos (comprado ✔ / comprable / bloqueado por requisito o puntos). Tap en un nodo comprable → `purchase`.
- **Cabecera:** puntos disponibles. **Botón Continuar** → vuelve al `Map` (como hoy).
- Reusa la lógica pura: `canPurchase(save,nodeId)` decide el estado visual de cada nodo; `purchase` aplica y persiste.
- *(General son 3 ramas; pueden ser 3 pestañas o una sola pestaña "General" con las 3 secciones. Decisión menor de la UI; el plan la fija.)*

## 7. Economía de puntos

Suma de costos del árbol **> ~70** (los puntos máximos de la campaña) → no puedes maximizar todo; eliges identidad de build. Sin respec en #2, la decisión pesa (el respec en oro llega en #3). Costos exactos = balance, en el plan.

## 8. Arquitectura

- **Pura (sin Phaser, testeable):**
  - `src/data/skilltree.js`: nodos `SKILL_TREE` (ampliados) + `SKILL_BRANCHES`. Retira `SKILL_TREE_ORDER`.
  - `src/systems/SkillTree.js`: reusar `getStats/canPurchase/purchase`; agregar `isBranchUnlocked(save, branch)` (pura).
  - `src/data/stats.js`: `healthRegen`, `fireballRadius`, `burnDamage`, `burnDuration` en `BASE_STATS` + pisos.
- **Compatibilidad de saves:** los IDs de nodo cambian respecto al árbol plano actual. `getStats`/`canPurchase` ya ignoran nodos inexistentes, así que un `purchasedNodes` viejo no rompe nada (a lo sumo se pierden puntos ya gastados en un dev temprano). El plan decide si basta con eso o conviene refundir puntos al cargar.
- **Phaser (playtest):**
  - `SkillTreeScene`: reescritura a pestañas + tracks.
  - `GameScene`: regen pasivo en `update`; `cast_fireball` usa `fireballRadius`; aplicar burn al impactar (estado en `Enemy`, tick por delta).
  - `Enemy`: estado `burnRemaining`/`burnDps` + tick (mismo patrón que freeze/slow).

## 9. Testing (lógica pura, `node --test`)

- `SkillTree`: ampliar tests — `getStats` con nodos nuevos (incl. `healthRegen`, `fireballRadius`, cadena, etc.), prerequisitos lineales de cada track, pisos respetados (ej. `freezeSlowPct` clamp).
- `isBranchUnlocked`: general siempre true; elemental true solo si `save.elements` incluye el elemento.
- (Opcional) un test de consistencia: todo `nodes[]` en `SKILL_BRANCHES` existe en `SKILL_TREE`, y cada track es una cadena `requires` válida.
- El "feel" (regen, burn, UI) se valida **jugando**.

## 10. Fuera de alcance (recordatorio)

- Respec, oro, tienda, consumibles → economía (#3).
- Números finos de balance; arte/audio; meta-progresión (#4).
