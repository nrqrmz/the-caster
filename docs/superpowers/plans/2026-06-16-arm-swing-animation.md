# Arm-Swing Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make humanoid arms move via hand-authored animation frames per creature — ambient walk/idle sway (step 1, hero first) and an `attack` state triggered from combat (step 2, hero first).

**Architecture:** Extend the pure `SpriteForge` so a part may carry an optional `anim` field (`anim[state][dir]` = a list of role-grids, one per frame). The forge composes each animation frame by index, picking a part's authored frame for that state when present and falling back to its static grid otherwise; unauthored states keep today's derived idle-bob / walk leg-shift. Add an `attack` state (non-looping) registered in `BootScene` and triggered by `FacingController.playAttack()` from the hero's fire/cast. Authored pixel frames are produced by each creature's `tools/gen-*.mjs` generator following the existing preview→approve→splice workflow.

**Tech Stack:** Native ES modules, Phaser 3 (CDN), `node:test` + `node:assert/strict`. Pure modules: `SpriteForge.js`. Phaser-coupled: `BootScene.js`, `FacingController.js`, `Caster.js`.

**Spec:** `docs/superpowers/specs/2026-06-16-arm-swing-animation-design.md`

---

## File Structure

- `src/systems/SpriteForge.js` — **modify**: `composeColorGrid` gains `state`/`frameIndex`; `forge` composes authored states per-frame and adds the `attack` state. (Pure — fully unit-tested.)
- `tests/sprites/SpriteForge.test.js` — **modify**: add tests for authored-frame selection + per-state forge output.
- `src/scenes/BootScene.js` — **modify**: register `attack-*` anims non-looping (`repeat: 0`).
- `src/objects/FacingController.js` — **modify**: add `playAttack()` + an attack lock so a one-shot attack anim isn't overridden by idle/walk.
- `src/objects/Caster.js` — **modify**: call `this.facing.playAttack()` when the hero fires the basic orb.
- `src/scenes/GameScene.js` — **modify**: call `this.caster.facing.playAttack()` when the Fireball is cast.
- `tools/gen-princess.mjs` + `src/data/sprites/parts.js` — **modify**: emit/splice the princess's `anim.walk` (step 1) and `anim.attack` (step 2) arm frames.

Authoring tasks (3 and 6) reuse the **preview harness** documented in `docs/superpowers/plans/2026-06-16-pixel-art-hd.md` ("Reusable preview harness"): serve `python3 -m http.server 8000`, dynamic-import the source with a cache-bust, forge, draw on a canvas, screenshot, get visual approval, then splice.

---

## Task 1: Forge — `composeColorGrid` selects authored frames per state

**Files:**
- Modify: `src/systems/SpriteForge.js`
- Test: `tests/sprites/SpriteForge.test.js`

- [ ] **Step 1: Write the failing test**

Append to `tests/sprites/SpriteForge.test.js`:
```js
test('composeColorGrid selects an authored frame for a state, else falls back to static', () => {
  const parts = {
    a: {
      res: 32, w: 1, h: 1, anchor: { x: 0, y: 0 }, down: ['b'], up: ['b'], side: ['b'],
      anim: { walk: { down: [['h'], ['s']] } },
    },
  };
  // no state -> static base
  assert.equal(composeColorGrid({ parts: ['a'] }, parts, 'down', PAL)[0][0], PAL.base);
  // authored walk frame 0 -> 'h', frame 1 -> 's'
  assert.equal(composeColorGrid({ parts: ['a'] }, parts, 'down', PAL, () => null, 'walk', 0)[0][0], PAL.highlight);
  assert.equal(composeColorGrid({ parts: ['a'] }, parts, 'down', PAL, () => null, 'walk', 1)[0][0], PAL.shade);
  // frameIndex cycles via modulo
  assert.equal(composeColorGrid({ parts: ['a'] }, parts, 'down', PAL, () => null, 'walk', 2)[0][0], PAL.highlight);
  // a state the part doesn't author -> static base
  assert.equal(composeColorGrid({ parts: ['a'] }, parts, 'down', PAL, () => null, 'attack', 0)[0][0], PAL.base);
  // a dir the part doesn't author for this state -> static base
  assert.equal(composeColorGrid({ parts: ['a'] }, parts, 'up', PAL, () => null, 'walk', 1)[0][0], PAL.base);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/sprites/SpriteForge.test.js`
Expected: FAIL — `composeColorGrid` ignores the extra args; authored frame returns `PAL.base` instead of `PAL.highlight`.

- [ ] **Step 3: Implement the authored-frame selection**

In `src/systems/SpriteForge.js`, change the `composeColorGrid` signature and the `rows` lookup. Replace:
```js
export function composeColorGrid(recipe, parts, dir, palette, partPalette = () => null) {
  const g = emptyGrid();
  for (const ref of recipe.parts) {
    const name = typeof ref === 'string' ? ref : ref.name;
    const part = parts[name];
    if (!part) throw new Error(`SpriteForge: unknown part '${name}'`);
    const rows = part[dir];
    if (rows == null) continue;
```
with:
```js
export function composeColorGrid(recipe, parts, dir, palette, partPalette = () => null, state = null, frameIndex = 0) {
  const g = emptyGrid();
  for (const ref of recipe.parts) {
    const name = typeof ref === 'string' ? ref : ref.name;
    const part = parts[name];
    if (!part) throw new Error(`SpriteForge: unknown part '${name}'`);
    // Authored per-state, per-direction frames win; else the static grid.
    const authored = state && part.anim && part.anim[state] && part.anim[state][dir];
    const rows = authored ? authored[frameIndex % authored.length] : part[dir];
    if (rows == null) continue;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/sprites/SpriteForge.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite (nothing else regressed)**

Run: `node --test`
Expected: PASS (the recipe-parity test still forges every recipe; static parts are unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/systems/SpriteForge.js tests/sprites/SpriteForge.test.js
git commit -m "feat(anim): composeColorGrid selects authored per-state frames"
```

---

## Task 2: Forge — `forge` composes authored states per-frame + adds `attack`

**Files:**
- Modify: `src/systems/SpriteForge.js`
- Test: `tests/sprites/SpriteForge.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `tests/sprites/SpriteForge.test.js`:
```js
test('forge composes authored walk frames per index (distinct frames); idle stays derived', () => {
  const parts = {
    a: {
      res: 32, w: 1, h: 1, anchor: { x: 0, y: 0 }, down: ['b'], up: ['b'], side: ['b'],
      anim: { walk: { down: [['h'], ['s']], up: [['h'], ['s']], side: [['h'], ['s']] } },
    },
  };
  const out = forge({ size: 32, parts: ['a'], anim: { idle: 2, walk: 2 } }, parts, PAL);
  // authored walk: top-left pixel differs per frame
  assert.equal(out.anims['walk-down'][0][0][0], PAL.highlight);
  assert.equal(out.anims['walk-down'][1][0][0], PAL.shade);
  // idle is unauthored -> derived from base (frame 0 = base color)
  assert.equal(out.anims['idle-down'][0][0][0], PAL.base);
});

test('forge produces non-empty attack frames only when anim.attack is set', () => {
  const parts = {
    a: {
      res: 32, w: 1, h: 1, anchor: { x: 0, y: 0 }, down: ['b'], up: ['b'], side: ['b'],
      anim: { attack: { down: [['o'], ['a']], up: [['o'], ['a']], side: [['o'], ['a']] } },
    },
  };
  const noAttack = forge({ size: 32, parts: ['a'], anim: { idle: 1, walk: 1 } }, parts, PAL);
  assert.equal(noAttack.anims['attack-down'], undefined); // no attack state requested
  const out = forge({ size: 32, parts: ['a'], anim: { idle: 1, walk: 1, attack: 2 } }, parts, PAL);
  assert.equal(out.anims['attack-down'].length, 2);
  assert.equal(out.anims['attack-down'][0][0][0], PAL.outline);
  assert.equal(out.anims['attack-down'][1][0][0], PAL.accent);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/sprites/SpriteForge.test.js`
Expected: FAIL — `forge` ignores authored frames (walk-down both frames = base) and never emits `attack-*`.

- [ ] **Step 3: Rewrite `forge` to compose per state + frame**

In `src/systems/SpriteForge.js`, add a helper above `forge` and replace the `forge` body. Add:
```js
// True when some part authors frames for this state+direction.
function hasAuthored(recipe, parts, state, dir) {
  return recipe.parts.some((ref) => {
    const p = parts[typeof ref === 'string' ? ref : ref.name];
    return !!(p && p.anim && p.anim[state] && p.anim[state][dir]);
  });
}
```
Replace the whole `export function forge(...) { ... }` with:
```js
export function forge(recipe, parts, palette, partPalette = () => null) {
  const scale = recipe.scale ?? (recipe.size ? recipe.size / DESIGN : 1);
  const anim = recipe.anim ?? {};
  const states = ['idle', 'walk', ...(anim.attack ? ['attack'] : [])];
  const anims = {};
  for (const dir of DIRS) {
    const base = composeColorGrid(recipe, parts, dir, palette, partPalette);
    for (const state of states) {
      const count = Math.max(1, anim[state] ?? 2);
      let frames;
      if (hasAuthored(recipe, parts, state, dir)) {
        frames = [];
        for (let i = 0; i < count; i++) frames.push(composeColorGrid(recipe, parts, dir, palette, partPalette, state, i));
      } else if (state === 'idle') {
        frames = idleFrames(base, count);
      } else if (state === 'walk') {
        frames = walkFrames(base, count);
      } else {
        frames = padFrames([base], count, base); // attack with no authored frames = static hold
      }
      anims[`${state}-${dir}`] = frames.map((grid) => scaleGrid(grid, scale));
    }
  }
  return { size: DESIGN * scale, fps: recipe.fps ?? 5, anims };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/sprites/SpriteForge.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `node --test`
Expected: PASS — every existing recipe forges unchanged (no recipe has `anim.attack` or authored parts yet, so `states` = `['idle','walk']` and `hasAuthored` is false everywhere).

- [ ] **Step 6: Commit**

```bash
git add src/systems/SpriteForge.js tests/sprites/SpriteForge.test.js
git commit -m "feat(anim): forge composes authored per-state frames + optional attack state"
```

---

## Task 3 (STEP 1 — ambient sway): author the princess's walk arm frames

**Files:**
- Modify: `tools/gen-princess.mjs` (emit `anim.walk` for the arm-bearing part)
- Modify: `src/data/sprites/parts.js` (splice the authored frames into that part)

> The arm is baked into `princess_skin`. Give that part an `anim.walk` whose `down`/`up`/
> `side` are 2-frame lists: the skin re-drawn with the **free arm** in two positions
> (forward-swing / back-swing). The pixel rows are authored creatively by the implementer
> (same bar as the pixel-art work: forges, parity green, reads in the browser). Keep `w`/`h`/
> `anchor` identical to the static `princess_skin` so frames register at the same place.

- [ ] **Step 1: Author the walk frames in `tools/gen-princess.mjs`**

In the generator, build the free-arm pixels into TWO variant grids per direction (arm swung
forward vs back) and emit them under an `anim.walk` block for the skin part, e.g.:
```js
//   anim: { walk: { down: [<armFwd rows>, <armBack rows>], up: [...], side: [...] } },
```
(The generator already composes the skin pixel-by-pixel; produce two passes with the free
arm column shifted by ~1px and emit both as the frame list.)

- [ ] **Step 2: Live-preview both walk frames for approval**

Serve `python3 -m http.server 8000`. Emit a temp module and forge the hero recipe, then
draw `out.anims['walk-down'][0]` and `[1]` side-by-side (use the preview harness from the
pixel-art plan, forging with the hero palette resolver). Screenshot. **Get user approval**
that the arm visibly swings between the two frames and nothing else shifts. Iterate.

- [ ] **Step 3: Splice the authored frames into `src/data/sprites/parts.js`**

Add the `anim: { walk: {...} }` field to the `princess_skin` part (keep its existing
`down`/`up`/`side` as the static base). Remove the temp preview module.

- [ ] **Step 4: Verify parity + full suite**

Run: `node --test`
Expected: PASS — `tests/sprites/recipes.test.js` forges the hero recipe (now with authored
walk frames) without error.

- [ ] **Step 5: Browser smoke test**

Run the game; walk the hero around. Confirm her free arm swings while walking and returns
to rest when idle. (Idle stays the derived bob until Task 6 adds an idle sway, optional.)

- [ ] **Step 6: Commit**

```bash
git add tools/gen-princess.mjs src/data/sprites/parts.js
git commit -m "feat(anim): princess free-arm walk swing (authored frames)"
```

> **STEP 1 (ambient sway, hero) is now done.** Expanding the sway to enemy humanoid
> families (mages/cultists/knights) is the same recipe — author each family's arm `anim.walk`
> — and can be added later without engine changes; out of scope for this plan's core.

---

## Task 4 (STEP 2 — attack): register `attack-*` anims non-looping

**Files:**
- Modify: `src/scenes/BootScene.js`

- [ ] **Step 1: Make attack anims play once**

In `src/scenes/BootScene.js`, inside `paintForged`, replace the `this.anims.create({...})` call:
```js
      this.anims.create({
        key: `${key}-${animName}`,
        frames: frameKeys,
        frameRate: out.fps,
        repeat: -1,
      });
```
with:
```js
      this.anims.create({
        key: `${key}-${animName}`,
        frames: frameKeys,
        frameRate: out.fps,
        repeat: animName.startsWith('attack') ? 0 : -1, // attacks play once
      });
```

- [ ] **Step 2: Verify parse + full suite**

Run: `node --check src/scenes/BootScene.js && node --test`
Expected: exit 0 / PASS (no recipe emits `attack-*` yet, so behavior is unchanged).

- [ ] **Step 3: Commit**

```bash
git add src/scenes/BootScene.js
git commit -m "feat(anim): register attack anims as non-looping (repeat 0)"
```

---

## Task 5 (STEP 2 — attack): `FacingController.playAttack()` + hero triggers

**Files:**
- Modify: `src/objects/FacingController.js`
- Modify: `src/objects/Caster.js`
- Modify: `src/scenes/GameScene.js`
- Test: `tests/` (pickFacing stays green; attack lock is Phaser-coupled → smoke-tested)

- [ ] **Step 1: Add the attack lock to `FacingController`**

In `src/objects/FacingController.js`, add `this.attacking = false;` to the constructor (after
`this.lastDir = lastDir;`), then add a `playAttack` method and an early-out in `update`.

Add the method:
```js
  // Play the one-shot attack anim for the current facing; ignored if the creature has no
  // attack anim. Locks idle/walk until the attack anim completes.
  playAttack() {
    const key = `${this.key}-attack-${this.lastDir}`;
    const sceneAnims = this.sprite.scene && this.sprite.scene.anims;
    if (!sceneAnims || !sceneAnims.exists(key)) return;
    this.attacking = true;
    this.sprite.once('animationcomplete', () => { this.attacking = false; });
    this.sprite.anims.play(key, true);
  }
```
At the very top of `update(vx, vy, aim)`, before the existing body, add:
```js
    if (this.attacking) {
      // keep playing the attack anim to completion; only track facing for the next swing
      const moving = Math.abs(vx) + Math.abs(vy) > MOVE_EPS;
      if (moving) this.lastDir = pickFacing(vx, vy, this.lastDir).dir;
      return;
    }
```

- [ ] **Step 2: Trigger the hero's basic-orb attack in `Caster`**

In `src/objects/Caster.js`, in `updateAutoAim`, fire the attack anim when the orb fires.
Replace:
```js
    this._shotTimer = this.stats.shotRate;
    onFire(target);
```
with:
```js
    this._shotTimer = this.stats.shotRate;
    if (this.facing) this.facing.playAttack();
    onFire(target);
```

- [ ] **Step 3: Trigger the hero's Fireball cast in `GameScene`**

In `src/scenes/GameScene.js`, find the Fireball cast (the line firing `TEX.fireball`, around
line 576: `const orb = this.orbs.fire(TEX.fireball, this.caster.x, this.caster.y, ...)`).
On the line immediately before that `this.orbs.fire(TEX.fireball, ...)` call, add:
```js
    if (this.caster.facing) this.caster.facing.playAttack();
```

- [ ] **Step 4: Confirm the pure facing test still passes**

Run: `node --test`
Expected: PASS — `pickFacing` is unchanged; the attack lock is Phaser-only and not unit-tested
(consistent with the file's existing "touches Phaser anims (not unit-tested)" note).

- [ ] **Step 5: Parse check**

Run: `node --check src/objects/FacingController.js && node --check src/objects/Caster.js && node --check src/scenes/GameScene.js`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/objects/FacingController.js src/objects/Caster.js src/scenes/GameScene.js
git commit -m "feat(anim): FacingController.playAttack() + hero orb/fireball attack triggers"
```

---

## Task 6 (STEP 2 — attack): author the princess's attack frames + enable the state

**Files:**
- Modify: `tools/gen-princess.mjs` (emit `anim.attack` for the arm-bearing part)
- Modify: `src/data/sprites/parts.js` (splice the attack frames)
- Modify: `src/data/sprites/recipes.js` (add `attack` to the hero recipe's `anim`)

- [ ] **Step 1: Author the attack frames in `tools/gen-princess.mjs`**

Emit an `anim.attack` block on the skin part: a 2–3 frame cast/strike where the staff/free
arm raises and thrusts (windup → strike → recover). Same `w`/`h`/`anchor` as the static part.

- [ ] **Step 2: Add `attack` to the hero recipe**

In `src/data/sprites/recipes.js`, change the hero recipe's `anim`:
```js
    archetype: 'hero', size: 32, anim: { idle: 2, walk: 2 }, fps: 5,
```
to:
```js
    archetype: 'hero', size: 32, anim: { idle: 2, walk: 2, attack: 3 }, fps: 5,
```
(Use the frame count you authored in Step 1.)

- [ ] **Step 3: Live-preview the attack frames for approval**

Forge the hero recipe and draw `out.anims['attack-down'][0..N]` in a row (preview harness).
Screenshot. **Get user approval** that the attack reads as a cast/strike. Iterate. Remove the
temp preview module.

- [ ] **Step 4: Splice the attack frames into `src/data/sprites/parts.js`**

Add `anim.attack` to `princess_skin` (alongside the `anim.walk` from Task 3).

- [ ] **Step 5: Verify parity + full suite**

Run: `node --test`
Expected: PASS — the hero recipe forges with `idle`/`walk`/`attack`; parity green.

- [ ] **Step 6: Browser smoke test**

Run the game; let the hero auto-fire and cast Fireball. Confirm the attack animation plays
once per shot/cast (arm strikes, returns to idle/walk), the facing is correct, and movement
isn't interrupted oddly.

- [ ] **Step 7: Commit**

```bash
git add tools/gen-princess.mjs src/data/sprites/parts.js src/data/sprites/recipes.js
git commit -m "feat(anim): princess attack animation (cast/strike), wired to fire + cast"
```

> **STEP 2 (attack, hero) is now done.** Enemy attack animations (melee/cast) are the same
> mechanism — author each enemy family's `anim.attack` and call `enemy.facing.playAttack()`
> at its `executeAttack` / shot point in `GameScene`; a follow-up, out of scope here.

---

## Done criteria

- `node --test` green, including new `SpriteForge` tests (authored-frame selection + per-state
  forge) and the unchanged every-recipe parity test.
- A part may carry `anim[state][dir]` authored frame lists; static parts are untouched.
- The hero's free arm swings while walking (Task 3) and an attack animation plays once on
  basic-orb fire and Fireball cast (Tasks 4–6), with correct facing and no derived-motion
  override mid-swing.
- The game stays runnable after every task (unauthored creatures keep today's idle/walk).

## Out of scope

Ambient sway / attack for enemy families (same mechanism, follow-up). Kraken whirlpool and
lava-as-fire (Sub-project D features 2 & 3, separate specs/plans). Idle-sway authored frames
for the hero are optional and not required by this plan.
