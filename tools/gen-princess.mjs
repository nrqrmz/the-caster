// Generates res:32 role-grid parts for the princess hero from the approved mockup
// geometry. Each pixel → {part, role}; roles o/b/s/h/a. Layers applied in order
// (later wins). The free (left) arm is emitted as an animated part: princess_skin
// carries `anim.walk` = 2 frames with the arm swinging. Run: node tools/gen-princess.mjs
const N = 32, cx = 16;

// classify() builds every static pixel EXCEPT the free (left) arm, which is added
// per-frame via leftArm() so it can swing.
function classify(x, y) {
  let out = null;
  const set = (part, role) => { out = { part, role }; };

  // --- gown: skirt (isosceles waist y18 -> hem y30) ---
  if (y >= 18 && y < 31) {
    const t = (y - 18) / 12, half = 2 + t * 9.2;
    const L = Math.round(cx - half), R = Math.round(cx + half);
    if (x >= L && x <= R) {
      let role = 'b';
      if (x <= L + 1 || x >= R - 1) role = 'o';
      else if (x <= L + 2 || x >= R - 2) role = 's';
      const f1 = cx - half * 0.4, f2 = cx + half * 0.4;
      if (Math.abs(x - f1) < 0.7 || Math.abs(x - f2) < 0.7) role = 's';
      if (Math.abs(x - cx) < 0.7) role = 'h';
      if (y === 30) role = 'a';                 // (2) thin 1-row gold hem
      set('gown', role);
    }
  }
  // --- gown: bodice ---
  if (y >= 13 && y < 18) {
    const t = (y - 13) / 4, half = 3.2 - t * 1.4;
    const L = Math.round(cx - half), R = Math.round(cx + half);
    if (x >= L && x <= R) set('gown', (x <= L || x >= R) ? 'o' : (x < cx ? 's' : 'b'));
  }
  if (y === 17 && x >= 14 && x <= 18) set('gown', 'a'); // waistband
  if (y === 13 && (x === 13 || x === 18)) set('gown', 'a'); // straps

  // --- neck ---
  if (y === 12 && (x === 15 || x === 16)) set('skin', 'b');
  if (y === 13 && x === 16) set('skin', 's');

  // --- head (skin oval) ---
  {
    const dx = (x + 0.5 - cx) / 3.5, dy = (y + 0.5 - 8.2) / 3.7;
    if (y >= 5 && y < 12 && dx * dx + dy * dy <= 1) set('skin', 'b');
    if (y >= 5 && y < 12 && dx * dx + dy * dy <= 1 && dx > 0.45) set('skin', 's'); // soft cheek shade
  }

  // --- hair (red): cap + long locks (drawn before arms so arms show over it) ---
  {
    const dx = (x + 0.5 - cx) / 6.2, dy = (y + 0.5 - 7) / 5.8;
    const cap = dx * dx + dy * dy <= 1 && y <= 10;
    const left = y > 5 && y < 23 && Math.abs(x - (9.5 - (y > 16 ? 1 : 0))) < 2.1;
    const right = y > 5 && y < 20 && Math.abs(x - 22.5) < 1.8;
    const faceWin = y >= 6 && y <= 11 && x >= 13 && x <= 19;
    if ((cap || left || right) && !faceWin) {
      let role = 'b';
      if (dx < -0.15 && dy < -0.1 && dx * dx + dy * dy < 0.6) role = 'h';
      else if (left && x < 10 && y % 3 === 0) role = 'h';
      else if (right && x >= 23) role = 's';     // (4) shade only the outer edge, not a block
      if (cap && dx * dx + dy * dy > 0.82) role = 'o';
      set('hair', role);
    }
  }
  if (y === 6 && (x === 13 || x === 19)) set('hair', 'b'); // fringe sides

  // --- (3) fine features on the face ---
  if (y === 7 && (x === 14 || x === 17)) set('skin', 'o'); // brows
  if (y === 8 && (x === 14 || x === 17)) set('skin', 'o'); // eyes
  if (y === 8 && (x === 15 || x === 16)) set('skin', 'h'); // nose-bridge highlight
  if (y === 10 && (x === 15 || x === 16)) set('skin', 's'); // soft mouth

  // --- staff (wood) ---
  if (x === 25 && y >= 10 && y < 28) set('staff', 'b');

  // --- right arm (skin): shoulder -> hand gripping the staff (2px) — STATIC ---
  const rightArm = [[19, 14], [20, 14], [20, 15], [21, 15], [22, 16], [23, 16], [24, 16], [24, 17], [25, 16]];
  for (const [ax, ay] of rightArm) if (x === ax && y === ay) set('skin', ay >= 16 ? 'b' : 's');

  // --- orb (orbblue) on the staff tip ---
  {
    const dx = x - 25, dy = y - 7;
    if (y >= 5 && y <= 9 && dx * dx + dy * dy <= 3) set('orb', 'b');
    if (x === 24 && y === 6) set('orb', 'h');
  }
  return out;
}

// The free (left) arm at a swing offset → list of [x, y, role]. dx/dy shift the whole
// arm + hand so it reads as a pendulum between walk frames.
function leftArm(dx, dy) {
  const pts = [];
  for (let yy = 14; yy <= 20; yy++) {
    const t = (yy - 14) / 6;                       // 0 at the shoulder -> 1 at the wrist
    const ox = Math.round(dx * t), oy = Math.round(dy * t); // pivot: shoulder fixed, swing grows toward the hand
    const lx = 12 - Math.round((yy - 14) * 0.15) + ox;
    const y = yy + oy;
    pts.push([lx, y, 'b']);
    pts.push([lx - 1, y, 's']);
  }
  for (let x = 10; x <= 12; x++) pts.push([x + dx, 21 + dy, 'b']); // hand (full swing, just below the wrist)
  return pts;
}

// static everything-but-left-arm
const parts = { gown: [], skin: [], hair: [], staff: [], orb: [] };
const grid = {};
for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
  const c = classify(x, y);
  if (!c) continue;
  (grid[c.part] ??= {})[`${x},${y}`] = c.role;
  parts[c.part].push([x, y]);
}

// Build the skin grid for a given left-arm offset: static skin pixels + that arm.
function skinFrame(dx, dy) {
  const m = { ...(grid.skin ?? {}) };
  for (const [x, y, role] of leftArm(dx, dy)) if (x >= 0 && x < N && y >= 0 && y < N) m[`${x},${y}`] = role;
  return m;
}
const skinBase = skinFrame(0, 0);                 // static / idle (arm at rest)
const walk0 = skinFrame(1, -2);                   // arm swung forward (hand up/in)
const walk1 = skinFrame(-1, 1);                   // arm swung back (hand down/out)
// attack = a cast thrust: free arm winds down/back, strikes up-forward, recovers.
const atk0 = skinFrame(-1, 2);                    // windup (arm pulled down/back)
const atk1 = skinFrame(2, -5);                    // strike (forearm raised up-forward)
const atk2 = skinFrame(0, -1);                    // recover (returning to rest)
const skinFrames = [skinBase, walk0, walk1, atk0, atk1, atk2];

// One shared bbox across every skin frame so static + anim register identically.
function bboxOf(maps) {
  let minx = N, maxx = -1, miny = N, maxy = -1;
  for (const m of maps) for (const k of Object.keys(m)) { const [x, y] = k.split(',').map(Number); minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  return { minx, maxx, miny, maxy };
}
function gridBlock(m, bb) {
  const rows = [];
  for (let y = bb.miny; y <= bb.maxy; y++) { let row = ''; for (let x = bb.minx; x <= bb.maxx; x++) row += m[`${x},${y}`] ?? '.'; rows.push(row); }
  return `[\n${rows.map(r => `      '${r}',`).join('\n')}\n    ]`;
}

function emitSkin() {
  const bb = bboxOf(skinFrames);
  const w = bb.maxx - bb.minx + 1, h = bb.maxy - bb.miny + 1;
  const baseBlock = gridBlock(skinBase, bb);
  const walkList = `[ ${gridBlock(walk0, bb)}, ${gridBlock(walk1, bb)} ]`;
  const atkList = `[ ${gridBlock(atk0, bb)}, ${gridBlock(atk1, bb)}, ${gridBlock(atk2, bb)} ]`;
  console.log(`  princess_skin: {\n    res: 32, w: ${w}, h: ${h}, anchor: { x: ${bb.minx}, y: ${bb.miny} },\n    down: ${baseBlock},\n    up: ${baseBlock},\n    side: ${baseBlock},\n    anim: {\n      walk: { down: ${walkList}, up: ${walkList}, side: ${walkList} },\n      attack: { down: ${atkList}, up: ${atkList}, side: ${atkList} },\n    },\n  },`);
}

function partName(p) { return ({ gown: 'body_gown', hair: 'hair_long', staff: 'staff_princess', orb: 'orb_princess' })[p]; }
function emit(part) {
  const pts = parts[part];
  if (!pts.length) { console.log(`// ${part}: EMPTY`); return; }
  const bb = bboxOf([grid[part]]);
  const w = bb.maxx - bb.minx + 1, h = bb.maxy - bb.miny + 1;
  const dirBlock = gridBlock(grid[part], bb);
  console.log(`  ${partName(part)}: {\n    res: 32, w: ${w}, h: ${h}, anchor: { x: ${bb.minx}, y: ${bb.miny} },\n    down: ${dirBlock},\n    up: ${dirBlock},\n    side: ${dirBlock},\n  },`);
}

emit('gown');
emitSkin();
emit('hair');
emit('staff');
emit('orb');
