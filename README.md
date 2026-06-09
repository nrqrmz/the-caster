# The Caster

Mobile top-down survivor built with Phaser 3. No build step — just open `index.html`.

Play as an orphaned sorceress avenging her parents: move with a virtual joystick, auto-fire orbs, unlock Fireball at the fire temple, beat the boss, and spend skill points in a persistent skill tree.

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000  (use a mobile device or the browser's device toolbar, portrait)
```

## Test (game logic only)

```bash
node --test
```

Tests cover the Phaser-free logic: save system, skill tree, damage, and wave sequencing.

## Deploy (GitHub Pages)

Hosted as static files from the repository root — no build. See the deploy steps below or in
`docs/superpowers/plans/2026-06-09-the-caster-vertical-slice.md` (Task 6.2).
