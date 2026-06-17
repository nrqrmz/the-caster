# Combat fixes & boss tuning (enemy-rebalance sp4)

**Date:** 2026-06-17
**Status:** Design approved, pending implementation plan
**Predecessors:** `2026-06-16-enemy-rebalance-sp1/sp2/sp3-design.md`, `2026-06-16-difficulty-rebalance-design.md`

## Summary

A polish/fix pass closing eight playtest issues across enemies and elemental bosses (Fire + Water branches). Two items are behavioral reworks (W3 contact-damage model, W7 shark burrow); the rest are targeted bug fixes, tuning, and rendering/readability changes. This is a single coherent batch → one spec, one plan.

The work splits cleanly along the project's pure-logic / Phaser-coupled boundary: decision math lands in `src/systems/` (unit-tested under `node --test`), rendering and setpiece wiring in `src/scenes/` and `src/objects/`.

## Goals

- Fix actor/hazard z-ordering so the princess (and other actors) render above ground hazards.
- Eliminate the dog (`can_lava`) facing toggle.
- Stop melee enemies (notably tadpoles) from draining HP every frame on contact; make tadpoles a swarm threat, not a one-touch kill.
- Cap Favilla's summons so she stays targetable.
- Keep the three sisters spread so the lava triangle/river stays wide and readable, and lower their combined fire rate to be dodgeable.
- Make the Kraken/Dama tentacle's danger zone unambiguous.
- Give the shark burrow a readable dorsal-fin telegraph and a safe minimum distance.

## Non-goals

- No change to the tentacle's damage *mechanic* (it stays a circular AoE puddle; only its readability improves).
- No change to tadpoles *chasing* the player (that is intended); only speed, damage, and contact cadence change.
- No new enemy/boss types, no campaign/structure changes.
- Air/Earth branches and the Castle are out of scope.

---

## Work items

### W1 · Lava/zone z-order (bug)

**Problem.** Ground hazards (lava puddles, poison zones, tentacle puddles) draw at depth 5 (`GameScene.js` — `lavaGfx` `setDepth(5)`, zone disks `setDepth(5)`), while the Caster and all enemies/bosses use the default depth 0. Result: hazards paint *over* the princess, hiding her sprite.

**Fix.** Establish an explicit depth convention and lift all actors above ground hazards:

| Layer | Depth |
|-------|-------|
| Ground hazards (lava/poison zones, tentacle puddles, triangle/river edges, lava river) | 5–7 (unchanged) |
| **Actors: Caster, enemies, bosses** | **~10 (new explicit depth)** |
| Telegraphs | 1400 (unchanged) |
| Boss health bars | 1500 (unchanged) |
| UI overlay | 1600 (unchanged) |

Actors read as standing *on* the lava. Assign the actor depth where the Caster and Enemy/Boss sprites are created (constructors or spawn paths), referencing a named constant rather than a magic number.

**Verification.** Manual playtest: stand the princess in a lava puddle / on a triangle edge and confirm she renders above it; confirm enemies/bosses also render above hazards but below telegraphs and bars.

---

### W2 · `can_lava` (dog) faces away from the princess (bug)

**Problem.** The dog often faces away from the princess, and its facing "toggles" rapidly.

**Root cause (confirmed).** `playAttack()` is only ever called on the Caster (`GameScene.js:647`, `Caster.js:35`), never on enemies — so an enemy's `FacingController.attacking` flag is always `false`, and for a `facePlayer:true` enemy the player-facing branch of `FacingController.update()` already runs every frame. The bug is in `facePlayerFlip()` (`FacingController.js:11-13`):

```js
export function facePlayerFlip(spriteX, targetX) {
  return targetX < spriteX; // flips the instant the player crosses the sprite's center
}
```

It has no dead-band, so when the princess is near the dog's x (directly above/below, or as it charges through her) sub-pixel jitter flips the sprite every frame → the observed toggle / facing-away. The source comment on line 10 already anticipated this: *"Sin histéresis (banda muerta opcional a futuro)."*

**Fix.** Add hysteresis. `facePlayerFlip` becomes stateful on the current flip, only flipping once the player is clearly past the center by a dead-band margin:

```js
// keep current facing until the player is clearly (deadband px) to the other side
export function facePlayerFlip(spriteX, targetX, currentFlip, deadband = 12) {
  if (currentFlip  && targetX > spriteX + deadband) return false; // player clearly right → face right
  if (!currentFlip && targetX < spriteX - deadband) return true;  // player clearly left  → face left
  return currentFlip; // inside the dead-band: don't toggle
}
```

The caller in `FacingController.update()` passes `this.sprite.flipX` as `currentFlip`. Still one cheap comparison per frame (no added cost), applies to every `facePlayer:true` enemy.

**Verification.** Unit test `facePlayerFlip` (no toggle when target oscillates within the dead-band around `spriteX`; flips correctly once past the margin on each side). Manual: watch a `can_lava` dog near/under the princess — no rapid toggling.

---

### W3 · Global melee contact cooldown + tadpole nerf (systemic + tuning)

**Problem.** The player↔enemies overlap (`GameScene.js:~117`) applies `enemy.def.damage × 0.02 × 16` (≈ `damage × 0.32`) **every frame** the bodies overlap, with no cooldown. For the tadpole (`renacuajo`, `damage 7`) that is ≈134 HP/s — a single touch can drain the player's whole bar. This affects *all* melee enemies, not just tadpoles.

**Fix (two parts).**

1. **Per-enemy melee contact cooldown (systemic).** Make melee contact a *discrete hit* gated by a per-enemy cooldown (~600ms i-frame style): on overlap, if the enemy's contact timer has elapsed, apply one clean melee hit, then reset its timer; otherwise no damage. Tune the single-hit damage value so the discrete-hit model is fair (a discrete hit should feel like a hit, not a per-frame tick — pick a per-hit damage derived from each enemy's `damage` field rather than the old `×0.32`/frame figure). The cooldown is stored per enemy instance. On-hit modifiers (`onHitBurn`, `onHitSlow`) apply on the same gated hit, not every frame.
   - Keep this logic pure where practical: a small helper deciding "should this contact deal damage now?" given the enemy's last-hit timestamp and the cooldown belongs in a testable module; `GameScene` owns the timestamp storage and applies the resulting damage.
2. **Tadpole tuning.** `renacuajo` (`src/data/enemies/water.js`): `speed` 105 → ~70, `damage` 7 → ~5. Movement stays `zigzag` (chasing the player is intended). The tadpole becomes a swarm threat that is dangerous in numbers and on repeated contact, not a one-touch kill.

**Verification.** Unit test the contact-cooldown helper (first contact deals damage; subsequent contacts within the cooldown deal none; a contact after the cooldown deals damage again). `node --test` suite stays green. Manual: brush a single tadpole and confirm it no longer empties the bar; confirm other melee enemies (e.g. `ahogado`, `caballero_brasa`) now hit in discrete ticks.

---

### W4 · Favilla summon cap (tuning)

**Problem.** Favilla (`src/data/bosses/fire.js`) summons with no `cap` field, so her adds are limited only by the global 16-enemy concurrency cap. Phase 2 loops `summon 3 avispa_brasa` + `summon 2 imp_brasa` + nova (~900ms cadence), flooding the arena and making her impossible to target.

Current (for reference):
```js
phases: [
  { from: 1.0, sequence: [
    { do: 'summon', spawnType: 'imp_brasa', count: 2, dur: 1000 },
    { do: 'lobAoe', radius: 60, dps: 20, duration: 3000, telegraph: 500, dur: 1200 },
  ] },
  { from: 0.5, speedMul: 1.15, sequence: [
    { do: 'summon', spawnType: 'avispa_brasa', count: 3, dur: 900 },
    { do: 'summon', spawnType: 'imp_brasa', count: 2, dur: 900 },
    { do: 'nova', count: 12, speed: 200, damage: 10, telegraph: 400, dur: 800 },
  ] },
],
```

**Fix.** Add a `cap` to her summon attacks (matching the existing Ignatius cap-3 convention — the summon system already supports a `cap` field that bounds total summoned-alive via `summonSlots`). Target **cap 3 total adds alive** for Favilla, and lengthen the phase-2 summon `dur` so adds replenish slowly rather than flooding. Keep the `healAllies` modifier so "kill the healer first" stays the tactical hook.

**Verification.** Manual playtest: Favilla maintains at most ~3 adds, stays clickable/targetable. Confirm the cap logic path (existing `summonSlots`) honors the new `cap`.

---

### W5 · Three sisters: formation + fire rate (tuning + setpiece)

**Problem.** In the nv7 trio (`SISTERS_TRIO`, `src/data/bosses/fire.js`), Vesta uses `chase` while Pyra and Favilla use `kite` at range 240 *from the player*, so all three orbit the same point and the lava triangle collapses to nothing. Combined fire volume (Pyra's 5-shot spread + Favilla's 12-shot nova + Vesta's straight shot) is also hard to dodge.

The hazard geometry already degrades by live count (`TriangleHazard.js:16-21`): 3 → triangle, 2 → single line ("river"), ≤1 → none. So the fix is to drive the sisters' *movement* by live count.

**Fix (two parts).**

1. **Movement by live count.** Drive each sister's target by how many sisters are alive (Vesta = the tank/chaser when alive):
   - **3 alive:** Vesta `chase`s the princess; Pyra and Favilla move to and **hold fixed spread anchor positions** in the arena (e.g. left and right anchors in the upper play area) → a wide, readable triangle regardless of where the player stands.
   - **2 alive:** both surviving sisters switch to `kite`, **kept apart** from each other → the single-line "river" forms wide.
   - **1 alive:** unchanged — the survivor adopts her existing `soloSequence` (restores `lobAoe` lava pools).

   The geometry of "where should each sister stand given live count, roles, and the player position" is a pure, testable helper (returns target points per sister); `GameScene` moves each sister toward its target (Vesta chases the player directly). This keeps the setpiece logic out of the generic per-enemy brain. Anchors are expressed against the 480×854 logical arena.

2. **Fire rate.** Raise the trio sequences' attack cooldowns (increase `dur`) and/or trim shot counts (Pyra's spread `count`, Favilla's nova `count`) so the combined volume is dodgeable. Tune values during implementation against playtest; the target is "readable, dodgeable triangle showcase," not a bullet wall.

**Verification.** Unit test the formation helper (3 alive → three well-separated targets with Vesta tracking the player; 2 alive → two separated targets; 1 alive → solo/no formation). Manual: the triangle stays large and visible with 3 sisters; the river line stays wide with 2; combined fire is dodgeable.

---

### W6 · Tentacle readability (polish — Kraken / Dama Ballena)

**Problem.** The Kraken/Dama tentacle (`lobAoe`) is a circular AoE puddle lobbed at the player's feet: a ~500ms white telegraph circle, then a circular damage zone (radius 55–70 Kraken / ~90 Dama, 18–28 dps) for 2.5–4s. The tall tentacle sprite is purely cosmetic and grows/retracts, but it visually reads as if its whole length hurts — only the base circle does.

**Fix.** Keep a **visible ground circle matching the actual hitbox radius** under the tentacle for the zone's entire active duration, so the danger zone is unambiguous. No change to the damage mechanic, radius, dps, or timing — readability only. (The existing telegraph circle already matches the radius before activation; this extends a matching ground marker through the active phase under the cosmetic tentacle.)

**Verification.** Manual playtest: the hurtful area is obvious throughout the tentacle's life; standing just outside the ground circle takes no damage, inside it does.

---

### W7 · Shark burrow: dorsal-fin telegraph + safe distance (feature + tuning)

**Problem.** While burrowed, the shark goes to alpha 0.15 (faint, invulnerable), sits still, then teleports to ~80px from the player and surfaces — it can effectively appear on top of the princess, and the submerged phase gives no readable "it's coming for you" cue.

Current burrow cycle (`MOVEMENTS.burrow`, `EnemyBrain.js:99-138`): submerged (sit, `{x:0,y:0,submerged:true}`) → reposition (teleport to 80px from player, still submerged) → emerge (450ms warning ring, still submerged) → surface (visible, vulnerable, chases). `_burrowed` gates invulnerability in `GameScene`.

**Fix (two parts).**

1. **Swim + dorsal-fin telegraph.** Rework the submerged phase so the shark **swims toward the princess** (instead of sit-then-teleport), staying invulnerable, while the renderer shows **only a dorsal fin** moving in its travel direction (body hidden). The shark approaches until it reaches the safe minimum distance (W8), then runs the emerge warning and surfaces fully visible and vulnerable. The movement returns the swim velocity + a `submerged`/fin flag the scene uses to draw the fin and hide the body; the reposition-teleport is replaced (or constrained) by this swim-to-safe-distance behavior.
   - Movement decision stays in `EnemyBrain.burrow` (pure, testable). The fin visual (a small dorsal-fin marker following the shark, oriented to its heading) is drawn by `GameScene` while the shark is submerged, mirroring how the existing surfacing warning ring is drawn.
2. Body visibility: submerged = body hidden / fin shown; surfacing = fin + warning ring; surface = full body visible, vulnerable.

**Verification.** Unit test the burrow movement (submerged phase produces motion toward the target and does not close inside the safe distance; surface phase is `vulnerable`). Manual: you can see the fin tracking toward the princess; the shark surfaces visible and never on top of her.

---

### W8 · Summon/spawn minimum distance (tuning)

**Problem.** `spawnEnemy` (`GameScene.js:~269-286`) spawns at a random screen edge with no minimum-distance guard, and the burrow reposition uses just 80px. Summoned sharks can appear adjacent to the princess.

**Fix.** Enforce a **160px minimum distance from the princess** as the closest valid spawn/reposition point (farther is fine; 160px is the floor). Apply to shark spawns (and summons generally) and to the burrow swim/reposition target in W7. Where a candidate point is closer than 160px, push it out to the 160px radius (preserving direction) or pick another valid point.

**Verification.** Unit test the distance clamp (a target inside 160px is pushed to exactly the 160px boundary; a target outside is unchanged). Manual: sharks never spawn/surface within 160px of the princess.

---

## Architecture & testing notes

- **Pure-logic changes** (`src/systems/`, `src/data/`), unit-tested under `node --test`:
  - W2 `facePlayerFlip` hysteresis (`FacingController.js` — `facePlayerFlip` is the pure, exported part).
  - W3 contact-cooldown decision helper + tadpole stat edits.
  - W5 sisters formation helper (target points by live count) + trio fire-rate/count edits.
  - W7 burrow swim/safe-distance movement (`EnemyBrain.burrow`).
  - W8 minimum-distance clamp helper.
- **Phaser-coupled changes** (`src/scenes/`, `src/objects/`), manual playtest:
  - W1 depth assignments, W6 tentacle ground circle, W7 dorsal-fin visual + body visibility, and the scene-side wiring of W3/W4/W5/W8.
- The existing 246-test suite must stay green; new tests are added for each pure helper above.
- All texture/color keys via `config.js` (`TEX`/`COLORS`); no inlined keys or hex.

## Open tuning values (resolved during implementation against playtest)

These are starting points, not hard constraints — finalize by feel:

- W2 dead-band: ~12px.
- W3 contact cooldown: ~600ms; tadpole speed ~70, damage ~5; per-hit melee damage derived from `def.damage`.
- W4 Favilla cap: 3 adds alive; lengthened phase-2 summon cadence.
- W5 sister anchors (480×854 arena), trio fire-rate cooldowns / shot counts.
- W8 minimum distance: 160px (fixed — explicit user requirement).
