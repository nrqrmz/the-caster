// src/systems/SpriteForge.js
// PURE. Forge a recipe + parts + palettes into color-grid frames per anim/direction.

export const DESIGN = 32;
const ROLE_MAP = { o: 'outline', b: 'base', s: 'shade', h: 'highlight', a: 'accent' };
const DIRS = ['down', 'up', 'side'];

function emptyGrid() {
  return Array.from({ length: DESIGN }, () => new Array(DESIGN).fill(null));
}

// Compose every part into a DESIGN×DESIGN grid of color ints (or null = transparent).
// Each part resolves against its own palette: partPalette(ref) wins, else `palette`.
// A part authored at res < DESIGN is nearest-neighbor upscaled by DESIGN/res (rows +
// anchor), so legacy 16-grid art fills the 32 grid unchanged.
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
            if (y < 0 || y >= DESIGN || x < 0 || x >= DESIGN) continue;
            g[y][x] = color;
          }
        }
      }
    }
  }
  return g;
}

function shiftV(grid, dy) {
  const out = emptyGrid();
  for (let y = 0; y < DESIGN; y++) {
    const ny = y + dy;
    if (ny < 0 || ny >= DESIGN) continue;
    for (let x = 0; x < DESIGN; x++) out[ny][x] = grid[y][x];
  }
  return out;
}

// Walk step: shift the lower half (rows >= DESIGN/2) horizontally.
function legShift(grid, dx) {
  const split = (DESIGN / 2) | 0;
  const out = grid.map((row) => row.slice());
  for (let y = split; y < DESIGN; y++) {
    const row = new Array(DESIGN).fill(null);
    for (let x = 0; x < DESIGN; x++) {
      const nx = x + dx;
      if (nx < 0 || nx >= DESIGN) continue;
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
  const n = grid.length;
  const out = [];
  for (let y = 0; y < n * f; y++) {
    const row = [];
    for (let x = 0; x < n * f; x++) row.push(grid[(y / f) | 0][(x / f) | 0]);
    out.push(row);
  }
  return out;
}

export function forge(recipe, parts, palette, partPalette = () => null) {
  const scale = recipe.scale ?? (recipe.size ? recipe.size / DESIGN : 1);
  const anim = recipe.anim ?? {};
  const anims = {};
  for (const dir of DIRS) {
    const base = composeColorGrid(recipe, parts, dir, palette, partPalette);
    const sets = { idle: idleFrames(base, anim.idle ?? 2), walk: walkFrames(base, anim.walk ?? 2) };
    for (const state of ['idle', 'walk']) {
      anims[`${state}-${dir}`] = sets[state].map((grid) => scaleGrid(grid, scale));
    }
  }
  return { size: DESIGN * scale, fps: recipe.fps ?? 5, anims };
}
