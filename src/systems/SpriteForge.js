// src/systems/SpriteForge.js
// PURE. Forge a recipe + parts + palettes into color-grid frames per anim/direction.

export const DESIGN = 32;
const ROLE_MAP = { o: 'outline', b: 'base', s: 'shade', h: 'highlight', a: 'accent' };
const DIRS = ['down', 'up', 'side'];

function emptyGrid(w = DESIGN, h = DESIGN) {
  return Array.from({ length: h }, () => new Array(w).fill(null));
}

// Compose every part into a DESIGN×DESIGN grid of color ints (or null = transparent).
// Each part resolves against its own palette: partPalette(ref) wins, else `palette`.
// A part authored at res < DESIGN is nearest-neighbor upscaled by DESIGN/res (rows +
// anchor), so legacy 16-grid art fills the 32 grid unchanged.
export function composeColorGrid(recipe, parts, dir, palette, partPalette = () => null, state = null, frameIndex = 0) {
  const gw = recipe.gridW ?? DESIGN, gh = recipe.gridH ?? DESIGN;
  const g = emptyGrid(gw, gh);
  for (const ref of recipe.parts) {
    const name = typeof ref === 'string' ? ref : ref.name;
    const part = parts[name];
    if (!part) throw new Error(`SpriteForge: unknown part '${name}'`);
    // Authored per-state, per-direction frames win; else the static grid.
    const authored = state && part.anim && part.anim[state] && part.anim[state][dir];
    const rows = authored ? authored[frameIndex % authored.length] : part[dir];
    if (rows == null) continue;
    const f = DESIGN / (part.res ?? 16);
    const pal = (typeof ref === 'object' ? partPalette(ref) : null) || palette;
    const ax = ((typeof ref === 'object' && ref.x != null) ? ref.x : part.anchor.x) * f;
    const ay = ((typeof ref === 'object' && ref.y != null) ? ref.y : part.anchor.y) * f;
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const ch = rows[r][c];
        if (ch === '.') continue;
        const role = ROLE_MAP[ch];
        if (!role) throw new Error(`SpriteForge: unknown role char '${ch}'`);
        const color = pal[role];
        for (let dy = 0; dy < f; dy++) {
          for (let dx = 0; dx < f; dx++) {
            const y = ay + r * f + dy, x = ax + c * f + dx;
            if (y < 0 || y >= gh || x < 0 || x >= gw) continue;
            g[y][x] = color;
          }
        }
      }
    }
  }
  return g;
}

function shiftV(grid, dy) {
  const h = grid.length, w = grid[0].length;
  const out = emptyGrid(w, h);
  for (let y = 0; y < h; y++) {
    const ny = y + dy;
    if (ny < 0 || ny >= h) continue;
    for (let x = 0; x < w; x++) out[ny][x] = grid[y][x];
  }
  return out;
}

// Walk step: shift the lower half (rows >= h/2) horizontally.
function legShift(grid, dx) {
  const h = grid.length, w = grid[0].length;
  const split = (h / 2) | 0;
  const out = grid.map((row) => row.slice());
  for (let y = split; y < h; y++) {
    const row = new Array(w).fill(null);
    for (let x = 0; x < w; x++) {
      const nx = x + dx;
      if (nx < 0 || nx >= w) continue;
      row[nx] = grid[y][x];
    }
    out[y] = row;
  }
  return out;
}

function idleFrames(base, count) { return padFrames([base, shiftV(base, 1)], count, base); }
function walkFrames(base, count) { return padFrames([legShift(base, -1), legShift(base, 1)], count, base); }
function padFrames(frames, count, fallback) {
  if (count <= frames.length) return frames.slice(0, Math.max(1, count));
  const out = frames.slice();
  while (out.length < count) out.push(fallback);
  return out;
}

function scaleGrid(grid, f) {
  if (f === 1) return grid;
  const rows = grid.length, cols = grid[0].length;
  const out = [];
  for (let y = 0; y < rows * f; y++) {
    const row = [];
    for (let x = 0; x < cols * f; x++) row.push(grid[(y / f) | 0][(x / f) | 0]);
    out.push(row);
  }
  return out;
}

// True when some part authors frames for this state+direction.
function hasAuthored(recipe, parts, state, dir) {
  return recipe.parts.some((ref) => {
    const p = parts[typeof ref === 'string' ? ref : ref.name];
    return !!(p && p.anim && p.anim[state] && p.anim[state][dir]);
  });
}

export function forge(recipe, parts, palette, partPalette = () => null) {
  const gw = recipe.gridW ?? DESIGN, gh = recipe.gridH ?? DESIGN;
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
        frames = padFrames([base], count, base);
      }
      anims[`${state}-${dir}`] = frames.map((grid) => scaleGrid(grid, scale));
    }
  }
  return { size: DESIGN * scale, width: gw * scale, height: gh * scale, fps: recipe.fps ?? 5, anims };
}
