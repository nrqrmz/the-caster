# The Caster

Mobile top-down survivor built with Phaser 3. No build step — just open `index.html`.

Play as an orphaned sorceress avenging her parents against the Council of Mages: explore a map of 4 elemental branches (volcano/lake/mountain/forest) in any order, clear each branch's 7 levels to its temple boss, master all 4 elements to unlock the King's Castle, and spend skill points in a persistent skill tree. Difficulty scales with your power.

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
