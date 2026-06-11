// src/systems/SpriteForge.js
// PURE. Forge a recipe + parts + palette into color-grid frames per anim/direction.

export const DESIGN = 16;
const ROLE_MAP = { o: 'outline', b: 'base', s: 'shade', h: 'highlight', a: 'accent' };
const DIRS = ['down', 'up', 'side'];

function emptyGrid() {
  return Array.from({ length: DESIGN }, () => new Array(DESIGN).fill('.'));
}

// Stamp every part of a recipe onto a DESIGN x DESIGN grid of role chars.
export function composeGrid(recipe, parts, dir) {
  const g = emptyGrid();
  for (const ref of recipe.parts) {
    const name = typeof ref === 'string' ? ref : ref.name;
    const part = parts[name];
    if (!part) throw new Error(`SpriteForge: unknown part '${name}'`);
    const rows = part[dir];
    if (rows == null) continue;
    const ax = (typeof ref === 'object' && ref.x != null) ? ref.x : part.anchor.x;
    const ay = (typeof ref === 'object' && ref.y != null) ? ref.y : part.anchor.y;
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const ch = rows[r][c];
        if (ch === '.') continue;
        const y = ay + r, x = ax + c;
        if (y < 0 || y >= DESIGN || x < 0 || x >= DESIGN) continue;
        g[y][x] = ch;
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

// Walk step: shift the lower half (rows >= DESIGN/2) horizontally — covers the leg region
// for typical humanoid sprites whose content is centred in the grid.
function legShift(grid, dx) {
  const split = (DESIGN / 2) | 0;
  const out = grid.map((row) => row.slice());
  for (let y = split; y < DESIGN; y++) {
    const row = new Array(DESIGN).fill('.');
    for (let x = 0; x < DESIGN; x++) {
      const nx = x + dx;
      if (nx < 0 || nx >= DESIGN) continue;
      row[nx] = grid[y][x];
    }
    out[y] = row;
  }
  return out;
}

function idleFrames(base, count) {
  const frames = [base, shiftV(base, 1)];     // frame 1 = subtle 1px bob down
  return padFrames(frames, count, base);
}

function walkFrames(base, count) {
  const frames = [legShift(base, -1), legShift(base, 1)];
  return padFrames(frames, count, base);
}

function padFrames(frames, count, fallback) {
  if (count <= frames.length) return frames.slice(0, Math.max(1, count));
  const out = frames.slice();
  while (out.length < count) out.push(fallback);
  return out;
}

function resolve(grid, palette) {
  return grid.map((row) => row.map((ch) => {
    if (ch === '.') return null;
    const role = ROLE_MAP[ch];
    if (!role) throw new Error(`SpriteForge: unknown role char '${ch}'`);
    return palette[role];
  }));
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

export function forge(recipe, parts, palette) {
  const scale = recipe.scale ?? (recipe.size ? recipe.size / DESIGN : 1);
  const anim = recipe.anim ?? {};
  const anims = {};
  for (const dir of DIRS) {
    const base = composeGrid(recipe, parts, dir);
    const sets = { idle: idleFrames(base, anim.idle ?? 2), walk: walkFrames(base, anim.walk ?? 2) };
    for (const state of ['idle', 'walk']) {
      anims[`${state}-${dir}`] = sets[state].map((g) => scaleGrid(resolve(g, palette), scale));
    }
  }
  return { size: DESIGN * scale, fps: recipe.fps ?? 5, anims };
}
