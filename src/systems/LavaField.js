// src/systems/LavaField.js
// PURE. Deterministic animated lava/fire field for rendering hazard zones as living
// lava. Everything is a function of `time` (ms) + position, so it is reproducible and
// unit-testable (no Math.random / Date.now). The scene turns these into draw calls.

const TAU = Math.PI * 2;

// Base molten brightness 0..1 (slow pulse) for lerping the pool's fill color.
export function lavaPulse(time) {
  return (Math.sin(time * 0.004) + 1) / 2;
}

// Flickering rim alpha 0..1.
export function lavaRimAlpha(time) {
  return 0.45 + 0.45 * Math.abs(Math.sin(time * 0.006));
}

// Bright bubbling cracks/spots that drift + pulse inside the pool. Returns offsets
// (relative to the pool center) with a per-spot radius and brightness 0..1.
export function lavaSpots(radius, time, count = 7) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const ang = i * 2.39996 + time * 0.0006 * (1 + (i % 3) * 0.25);     // golden-angle drift
    const dist = radius * (0.18 + 0.58 * ((Math.sin(i * 1.7 + time * 0.0009) + 1) / 2));
    const bright = 0.35 + 0.65 * ((Math.sin(time * 0.005 + i * 2.1) + 1) / 2);
    const r = radius * (0.10 + 0.07 * ((Math.cos(time * 0.004 + i) + 1) / 2));
    out.push({ x: Math.cos(ang) * dist, y: Math.sin(ang) * dist, r, bright });
  }
  return out;
}

// Rising embers above the pool: each cycles upward and fades, then respawns. Returns
// offsets (relative to center; y is negative going up), an alpha 0..1 and a radius.
export function lavaEmbers(radius, time, count = 6) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const cycle = 1300 + (i % 4) * 280;            // ms for one rise
    const t = ((time + i * 233) % cycle) / cycle;  // 0..1
    const x = (((i * 53) % 100) / 100 - 0.5) * radius * 1.1 + Math.sin(time * 0.003 + i) * 2;
    out.push({ x, y: -t * radius * 1.7, alpha: 1 - t, r: 0.8 + (1 - t) * 1.4 });
  }
  return out;
}

// Linear interpolation of two 0xRRGGBB ints (t in 0..1).
export function lerpColor(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t), g = Math.round(ag + (bg - ag) * t), bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

// Embers along a line segment (for the sisters' triangle lava edges): points spaced
// along [a,b] each with a rising/fading ember offset. Returns absolute {x, y, alpha, r}.
export function lavaEdgeEmbers(a, b, time, perEdge = 5) {
  const out = [];
  for (let i = 0; i < perEdge; i++) {
    const f = (i + 0.5) / perEdge;
    const px = a.x + (b.x - a.x) * f, py = a.y + (b.y - a.y) * f;
    const cycle = 1100 + (i % 3) * 240;
    const t = ((time + i * 311 + f * 700) % cycle) / cycle;
    out.push({ x: px + Math.sin(time * 0.004 + i) * 2, y: py - t * 14, alpha: 1 - t, r: 0.8 + (1 - t) * 1.2 });
  }
  return out;
}

export const LAVA = { dark: 0x7a1500, mid: 0xff5722, hot: 0xff7043, bright: 0xffd54f, ember: 0xffe082, TAU };
