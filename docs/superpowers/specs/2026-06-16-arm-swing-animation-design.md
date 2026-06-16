# Arm-Swing Animation — Design (Sub-project D, feature 1)

> Part of **Sub-project D** (richer animation), after the pixel-art HD roster redraw
> (sub-project C) completed. D's three features are independent and tackled one at a
> time: **(1) arm-swing**, (2) kraken whirlpool, (3) lava-as-fire. This spec covers
> feature 1 only.

## Goal

Make humanoid arms move, via **hand-authored animation frames per creature** (full
artistic control, no procedural-transform engine). Delivered in two steps:

1. **Ambient sway** — the free arm swings while walking + a subtle idle sway. Start
   with the **hero (princess)**, then expand to enemy families incrementally.
2. **Attack animation** — a new `attack` state (melee swing / cast gesture) triggered
   from combat.

## Background — how animation works today

`SpriteForge.forge(recipe, parts, palette, partPalette)` (pure) composes ONE base
color-grid per direction (`composeColorGrid`), then **derives** the animation frames
by transforming that whole grid:

- `idle` frames = `[base, shiftV(base, 1)]` (a vertical bob).
- `walk` frames = `[legShift(base, -1), legShift(base, 1)]` (shift the lower half).

`FacingController.update(vx, vy, aim)` plays `${key}-${state}-${dir}` (`state` ∈
{`idle`,`walk`}) based on movement. Arms are **baked into** the body/robe/skin parts
(no separate arm parts), so today they only move with the global bob/leg-shift.

## Design

### 1. Data model — per-part authored frames (backward-compatible)

A part keeps its static `down`/`up`/`side` role-grids (the base pose, unchanged). It
**may also** carry an optional `anim` field holding **per-state, per-direction frame
lists** — each frame is a role-grid drawn in a different pose:

```js
// static part (unchanged):
mage_robe: { res: 32, w, h, anchor, down: [...], up: [...], side: [...] }

// part with authored animation (new `anim` field; `down/up/side` stay as the base/idle-0):
hero_arm: {
  res: 32, w, h, anchor,
  down: ['base pose rows...'], up: [...], side: [...],   // static fallback
  anim: {
    walk:   { down: [ ['poseA'], ['poseB'], ['poseC'] ], side: [...], up: [...] },
    attack: { down: [ ['windup'], ['swing'], ['recover'] ], side: [...], up: [...] },
  },
}
```

`anim[state][dir]` is a list of role-grids (one per frame). A part with no `anim`, or
no entry for a given `state`/`dir`, falls back to its static `[dir]` grid — so every
existing part is untouched.

### 2. Forge — compose per state-frame

- `composeColorGrid(recipe, parts, dir, palette, partPalette, state, frameIndex = 0)`
  gains `state` + `frameIndex`. For each part: if `part.anim?.[state]?.[dir]` exists,
  use `frames[frameIndex % frames.length]`; otherwise use the static `part[dir]`
  (ignoring `state`/`frameIndex`). Upscale / anchor / palette logic is unchanged.
- `forge` builds each state's frames by composing per index:
  - A state is **authored** when *any* part has `anim[state]`; else it falls back to
    today's derived motion (idle-bob / walk leg-shift) over the base compose.
  - For an authored state with `count` frames, frame `i = composeColorGrid(..., state, i)`.
    Static parts contribute their base grid every frame; animated parts cycle their
    authored poses. The global idle-bob / leg-shift is **not** applied on authored
    states (the authored frames already encode the motion).
- Frame counts come from `recipe.anim` (`idle`/`walk`, plus the new optional `attack`).
  The forge cycles authored grids via `% frames.length`, so a mismatch degrades
  gracefully rather than throwing.

### 3. Attack state (step 2)

- New anim state `attack` with its own authored frames (arm swinging a weapon / casting
  gesture). `recipe.anim.attack = N`.
- `FacingController` stays movement-driven for idle/walk. GameScene **triggers** the
  attack animation when the entity acts: on melee contact / projectile fire / cast, play
  `${key}-attack-${dir}` once (non-looping), then hand control back to the
  FacingController. A small per-entity "attack anim lock" prevents idle/walk from
  overriding it mid-swing.
- Exact trigger points: the hero's basic orb fire and Fireball cast; enemy `executeAttack`
  paths (melee / shoot). Wiring detail belongs in the plan.

### 4. Authoring workflow

Each creature's generator (`gen-*.mjs`) emits the moving part with **multiple frames**
for the animated state(s). Because arms are baked into the body/skin part, that part is
re-drawn per frame with the arm repositioned (the generator already builds parts pixel
by pixel, so it produces a list of grids). Static creatures emit single grids as today.

### 5. Scope & rollout

- **Step 1, hero first:** author the princess's walk (2–3 frames, free arm swinging) +
  a subtle 2-frame idle sway. Validate the whole pipeline end-to-end in the running game.
- Then expand ambient sway to enemy humanoid families (mages, cultists, knights) as
  desired — each just gains authored arm frames; no engine change.
- **Step 2:** add the `attack` state for the hero (cast/orb gesture) + enemy melee/cast,
  wired from combat.

## Testing

`SpriteForge` is pure → unit-tested:

- A part with an authored-frame list yields **distinct** frames (frame 0 ≠ frame 1 where
  the authored grids differ); a static part yields identical content across frames.
- `composeColorGrid(..., frameIndex)` selects the right authored frame; static parts
  ignore `frameIndex`.
- A recipe mixing static + animated parts forges without error; **the existing
  every-recipe parity test stays green** (static recipes unchanged).
- `forge` produces `attack-<dir>` frame sets when `anim.attack` is set.

Plus the live in-game smoke test (hero walking shows the arm swing; attack plays on
fire/cast) before each commit.

## Out of scope (this feature)

Kraken whirlpool and lava-as-fire (D features 2 & 3). Leg/skirt motion stays on the
existing derived leg-shift unless a creature opts into authored walk frames.
