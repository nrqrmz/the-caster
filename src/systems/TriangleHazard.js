// src/systems/TriangleHazard.js
// Pure (no Phaser). Geometry for the three-sisters lava triangle. Edges are
// derived from the live sisters' positions: 3 → triangle, 2 → a single line,
// ≤1 → none (the hazard degrades as sisters die).

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t)); // clamp to the segment (not the infinite line)
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// positions: array of {x,y}. Returns array of [A,B] segments.
export function hazardEdges(positions) {
  const p = positions;
  if (p.length >= 3) return [[p[0], p[1]], [p[1], p[2]], [p[2], p[0]]];
  if (p.length === 2) return [[p[0], p[1]]];
  return [];
}

export function distanceToNearestEdge(px, py, edges) {
  let best = Infinity;
  for (const [a, b] of edges) best = Math.min(best, distToSegment(px, py, a.x, a.y, b.x, b.y));
  return best;
}

export function onAnyEdge(px, py, edges, width) {
  return edges.length > 0 && distanceToNearestEdge(px, py, edges) <= width;
}

function sign(px, py, a, b) { return (px - b.x) * (a.y - b.y) - (a.x - b.x) * (py - b.y); }

export function pointInTriangle(px, py, a, b, c) {
  const d1 = sign(px, py, a, b), d2 = sign(px, py, b, c), d3 = sign(px, py, c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}
