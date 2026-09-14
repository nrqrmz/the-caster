// src/data/sprites/gridTransform.js
// PURE. Turn row-string grids (SpriteForge part rows) of top-down creatures that are
// authored facing DOWN (head at the bottom) into their other facings.

// 180° turn: facing UP (head at the top). A turn, not a mirror, so asymmetric
// details (runes, alternating steps) stay correct.
export function rot180(rows) {
  return rows.slice().reverse().map((row) => [...row].reverse().join(''));
}

// 90° counter-clockwise: the bottom row (head) becomes the right column → SIDE view
// facing right (FacingController flips it for left). A W×H grid becomes H×W.
export function rotHeadRight(rows) {
  const h = rows.length, w = rows[0].length;
  return Array.from({ length: w }, (_, ny) =>
    Array.from({ length: h }, (_, nx) => rows[nx][w - 1 - ny]).join(''));
}
