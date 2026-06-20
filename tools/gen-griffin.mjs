// Griffin silhouette — eagle forequarters + lion hindquarters, profile facing RIGHT, 32-grid.
// Serves: grifo (boss nv7, size 96, barkBrown 0x6d4c41, flip:true).
//
// Parts authored:
//   griffin_wings — large feathered wing fanning up-and-back behind the body (back layer),
//                   plus a far-wing tip peeking over the back. Harpy-style feather quills.
//   griffin_body  — lion haunches + tufted tail (rear/left), eagle plumed chest (front/right),
//                   four legs: thick lion paws (rear) + splayed eagle talons (front).
//   griffin_head  — raised eagle head with crest plumes at the nape and a fierce brow.
//   griffin_beak  — curved hooked beak (palette: bone) — pale, drawn over the head front.
//   griffin_eyes  — single glowing raptor eye (palette: glow).
// Run: node tools/gen-griffin.mjs

const N = 32, cx = 16;
const layers = {
  griffin_wings:  {},
  griffin_body:   {},
  griffin_talons: {},
  griffin_head:   {},
  griffin_beak:   {},
  griffin_eyes:   {},
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
const disk = (L, cx0, cy0, r, role) => {
  for (let y = Math.floor(cy0 - r); y <= Math.ceil(cy0 + r); y++)
    for (let x = Math.floor(cx0 - r); x <= Math.ceil(cx0 + r); x++)
      if (((x - cx0) / r) ** 2 + ((y - cy0) / r) ** 2 <= 1) put(L, x, y, role);
};
function line(L, x0, y0, x1, y1, r) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { put(L, x, y, r); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}
function blob(L, cx0, cy0, rx, ry, role = 'b') {
  for (let y = Math.floor(cy0 - ry); y <= Math.ceil(cy0 + ry); y++)
    for (let x = Math.floor(cx0 - rx); x <= Math.ceil(cx0 + rx); x++) {
      const d = ((x - cx0) / rx) ** 2 + ((y - cy0) / ry) ** 2;
      if (d > 1) continue;
      let r = role;
      if (d > 0.80) r = 'o';
      else if ((x - cx0) / rx + (y - cy0) / ry < -0.55) r = 'h';
      else if ((x - cx0) / rx + (y - cy0) / ry > 0.6) r = 's';
      put(L, x, y, r);
    }
}

// ============================ GRIFFIN_WINGS (feathered fan, back layer) ============================
// One grand near-wing fanning up and back from the shoulder, plus a far-wing tip over the back.
const shx = 17, shy = 13;            // wing root at the shoulder
const tips = [
  [5, 4, 'h'],    // upper-back tip (lightest)
  [9, 2, 'h'],    // top tip
  [13, 3, 'b'],   // top-front tip
  [16, 6, 'b'],   // front tip
  [6, 9, 's'],    // lower-back tip (shade)
];
// Primary feather quills shoulder → each tip
for (const [tx, ty] of tips) line('griffin_wings', shx, shy, tx, ty, 'b');
// Feather body: blobs along each quill for membrane fill
for (const [tx, ty] of tips) {
  for (let k = 1; k < 6; k++) {
    const f = k / 6;
    const bx = Math.round(shx + (tx - shx) * f);
    const by = Math.round(shy + (ty - shy) * f);
    put('griffin_wings', bx, by, 'b');
    put('griffin_wings', bx, by + 1, 'b');
  }
}
// Highlight along the upper feathers
line('griffin_wings', shx - 1, shy - 1, 9, 3, 'h');
line('griffin_wings', shx - 1, shy - 1, 13, 4, 'h');
// Tip outlines + leading-edge outline
for (const [tx, ty] of tips) put('griffin_wings', tx, ty, 'o');
line('griffin_wings', shx, shy - 1, 9, 2, 'o');
line('griffin_wings', 9, 2, 5, 4, 'o');
line('griffin_wings', 5, 4, 6, 9, 'o');   // trailing back edge
// Far-wing tip peeking over the back (depth)
line('griffin_wings', 19, 12, 23, 6, 's');
line('griffin_wings', 23, 6, 21, 9, 's');
put('griffin_wings', 23, 6, 'o');

// ============================ GRIFFIN_BODY (lion hind + eagle chest + 4 legs + tail) ============================
// Lion haunch (rear/left)
blob('griffin_body', 9, 18, 5, 4);
// Mid torso
blob('griffin_body', 15, 18, 5, 3.5);
// Eagle chest (front/right, rising)
blob('griffin_body', 21, 17, 4, 4);
// Neck base up toward the head
line('griffin_body', 22, 14, 25, 11, 'b');
line('griffin_body', 23, 14, 25, 12, 'b');
put('griffin_body', 24, 13, 'b');

// Eagle chest plumes — scalloped highlight band on the front of the chest
for (let y = 14; y <= 21; y++) put('griffin_body', 23 - ((y % 2)), y, 'h');
for (let y = 15; y <= 20; y++) put('griffin_body', 22 - ((y % 2)), y, 'h');

// Long tufted lion tail (far left)
line('griffin_body', 5, 18, 2, 17, 'b');
line('griffin_body', 2, 17, 1, 14, 'b');
disk('griffin_body', 1, 13, 1.7, 'b');     // tuft
put('griffin_body', 0, 12, 'h');
put('griffin_body', 1, 11, 'h');

// Rear lion legs — thick, with paws
for (const lx of [7, 12]) {
  for (let y = 21; y <= 26; y++) { put('griffin_body', lx - 1, y, 'b'); put('griffin_body', lx, y, 'b'); put('griffin_body', lx + 1, y, 'b'); }
  put('griffin_body', lx - 1, 27, 'b'); put('griffin_body', lx, 27, 'b'); put('griffin_body', lx + 1, 27, 'b');
  put('griffin_body', lx - 1, 28, 'o'); put('griffin_body', lx, 28, 'o'); put('griffin_body', lx + 1, 28, 'o');
}
// Front eagle legs — OWN layer (gold talons): two SEPARATED shanks, each with 3 splayed toes.
function talon(c0) {
  // thin tarsus / shank (1px wide), y21..25
  for (let y = 21; y <= 25; y++) put('griffin_talons', c0, y, 'b');
  put('griffin_talons', c0, 21, 'h');                                              // knee highlight
  put('griffin_talons', c0, 26, 'b');                                              // knuckle
  // three splayed toes: left out, centre down, right out — each ending in an 'o' claw
  put('griffin_talons', c0 - 1, 27, 'b'); put('griffin_talons', c0 - 2, 28, 'o');  // left toe + claw
  put('griffin_talons', c0,     27, 'b'); put('griffin_talons', c0,     28, 'o');  // centre toe + claw
  put('griffin_talons', c0 + 1, 27, 'b'); put('griffin_talons', c0 + 2, 28, 'o');  // right toe + claw
}
talon(18);   // left foot
talon(23);   // right foot (wider gap between the two thin shanks)

// Dorsal highlight + belly shade
for (let x = 6; x <= 20; x++) put('griffin_body', x, 14, 'h');
for (let x = 7; x <= 19; x++) put('griffin_body', x, 21, 's');

// Automatic outline pass (clean silhouette)
{
  const keys = Object.keys(layers.griffin_body).map(k => k.split(',').map(Number));
  const get = (xx, yy) => layers.griffin_body[`${xx},${yy}`];
  const empty = (xx, yy) => xx < 0 || xx >= N || yy < 0 || yy >= N || !get(xx, yy);
  for (const [x, y] of keys) {
    if (empty(x - 1, y) || empty(x + 1, y) || empty(x, y - 1) || empty(x, y + 1))
      put('griffin_body', x, y, 'o');
  }
}

// ============================ GRIFFIN_HEAD (eagle head + crest + brow) ============================
// Crest plumes at the nape (behind = left of head)
for (const [px, py, h] of [[22, 7, 4], [23, 6, 5], [24, 7, 4]]) {
  for (let k = 0; k < h; k++) put('griffin_head', px, py + k, k < 2 ? 'h' : 'b');
  put('griffin_head', px, py, 'o');
}
// Head
blob('griffin_head', 25, 11, 2.6, 2.4);
// Fierce brow
line('griffin_head', 24, 9, 26, 10, 'o');

// ============================ GRIFFIN_BEAK (bone palette, hooked) ============================
put('griffin_beak', 26, 11, 'b');
put('griffin_beak', 27, 11, 'b'); put('griffin_beak', 28, 11, 'b');
put('griffin_beak', 27, 12, 'b'); put('griffin_beak', 28, 12, 'b');
put('griffin_beak', 28, 13, 'b');                 // hook curling down
put('griffin_beak', 29, 11, 'o'); put('griffin_beak', 29, 12, 'o');
put('griffin_beak', 28, 14, 'o'); put('griffin_beak', 27, 13, 'o');

// ============================ GRIFFIN_EYES (glow palette) ============================
put('griffin_eyes', 25, 10, 'b');

// ============================ emit ============================
function emit(name) {
  const keys = Object.keys(layers[name]);
  if (!keys.length) { console.log(`// ${name} EMPTY`); return; }
  const xs = keys.map(k => +k.split(',')[0]), ys = keys.map(k => +k.split(',')[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const rows = [];
  for (let y = miny; y <= maxy; y++) { let row = ''; for (let x = minx; x <= maxx; x++) row += layers[name][`${x},${y}`] ?? '.'; rows.push(row); }
  const block = `[\n${rows.map(r => `      '${r}',`).join('\n')}\n    ]`;
  console.log(`  ${name}: {\n    res: 32, w: ${maxx - minx + 1}, h: ${maxy - miny + 1}, anchor: { x: ${minx}, y: ${miny} },\n    down: ${block}, up: ${block}, side: ${block},\n  },`);
}

emit('griffin_wings');
emit('griffin_body');
emit('griffin_talons');
emit('griffin_head');
emit('griffin_beak');
emit('griffin_eyes');
