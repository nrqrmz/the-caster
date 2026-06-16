// High-craft armored knight (v2). Open-faced great-helm framing a shadow face with
// glowing eyes (the cultist formula, in metal); rounded pauldrons, a ridged
// breastplate with rivets, faulds, and a thick point-up sword. Multi-hue via
// per-part palettes: helm/body/sword = creature type color; visor=shadow, eyes=glow.
// Run: node tools/gen-warrior.mjs
const N = 32, cx = 16;
const layers = { sword: {}, body: {}, shield: {}, helm: {}, visor: {}, eyes: {} };
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };
const disc = (x, y, cx0, cy0, rx, ry) => ((x + 0.5 - cx0) / rx) ** 2 + ((y + 0.5 - cy0) / ry) ** 2;

// ---------- HELM: rounded metal dome + cheek guards + nasal bar, open face ----------
// crest fin on top (dark type color, not a bright nub)
for (let y = 0; y <= 3; y++) for (const x of [cx]) put('helm', x, y, y === 0 ? 'o' : 's');
put('helm', cx - 1, 3, 's'); put('helm', cx + 1, 3, 's');
// dome
for (let y = 3; y <= 9; y++) for (let x = 8; x <= 24; x++) {
  const d = disc(x, y, cx, 8.5, 6.4, 6);
  if (d > 1 || y > 9) continue;
  let r = 'b';
  if (d > 0.78) r = 'o';
  else if (x > cx + 1 && y > 6) r = 's';            // shadow lower-right
  else if (x < cx - 1 && y < 8) r = 'h';            // sheen upper-left
  put('helm', x, y, r);
}
// cheek guards (metal strips framing the face) + jaw
for (let y = 9; y <= 15; y++) {
  for (const x of [cx - 6, cx - 5, cx + 5, cx + 6]) { put('helm', x, y, x < cx ? 'b' : 's'); }
  put('helm', cx - 7, y, 'o'); put('helm', cx + 7, y, 'o');
}
for (let x = cx - 6; x <= cx + 6; x++) put('helm', x, 15, 'o');   // chin guard
// nasal bar + brow
for (let y = 9; y <= 13; y++) put('helm', cx, y, y === 9 ? 's' : 'b');
for (let x = cx - 5; x <= cx + 5; x++) put('helm', x, 9, 's');    // brow ridge

// ---------- FACE: shadow cavity (left + right of the nasal bar) ----------
for (let y = 10; y <= 14; y++) for (let x = cx - 4; x <= cx + 4; x++) {
  if (x === cx) continue;                          // nasal bar stays metal
  if (disc(x, y, cx, 12, 5, 3) <= 1.1) put('visor', x, y, y >= 14 ? 'o' : 'b');
}
// ---------- EYES: glowing slits either side of the nasal bar ----------
for (const x of [cx - 2, cx + 2]) { put('eyes', x, 11, 'h'); put('eyes', x, 12, 'b'); }

// ---------- BODY: rounded pauldrons, ridged breastplate, belt, faulds ----------
// pauldrons (two overhanging discs)
for (let y = 14; y <= 19; y++) for (let x = 5; x <= 27; x++) {
  const dl = disc(x, y, 9, 16, 4.2, 3.2), dr = disc(x, y, 23, 16, 4.2, 3.2);
  if (dl <= 1) put('body', x, y, dl > 0.6 ? 'o' : (x < 9 ? 'h' : 's'));
  if (dr <= 1) put('body', x, y, dr > 0.6 ? 'o' : (x < 23 ? 'b' : 's'));
}
// breastplate (tapered, center ridge + rivets)
for (let y = 16; y <= 23; y++) {
  const half = 5.5 - (y - 16) * 0.15;
  const L = Math.round(cx - half), R = Math.round(cx + half);
  for (let x = L; x <= R; x++) {
    let r = 'b';
    if (x === L || x === R) r = 'o';
    else if (x <= L + 1) r = 'h';
    else if (x >= R - 1) r = 's';
    if (Math.abs(x - cx) <= 0 && y <= 22) r = 'h';  // center ridge
    put('body', x, y, r);
  }
}
for (const [rx, ry] of [[cx - 3, 18], [cx + 3, 18], [cx - 3, 21], [cx + 3, 21]]) put('body', rx, ry, 's'); // rivets
for (let x = cx - 5; x <= cx + 5; x++) put('body', x, 23, 'a');  // belt
// faulds (armored skirt with plate divisions + leg split)
for (let y = 24; y <= 30; y++) {
  const half = 5 + (y - 24) * 0.3;
  const L = Math.round(cx - half), R = Math.round(cx + half);
  for (let x = L; x <= R; x++) {
    let r = 'b';
    if (x === L || x === R) r = 'o';
    else if (x >= R - 1) r = 's';
    if (x === Math.round(cx - half * 0.5) || x === Math.round(cx + half * 0.5)) r = 's'; // plate seams
    put('body', x, y, r);
  }
  put('body', cx, y, '.');                         // central leg split
}
// ---------- ARMS: armored forearms + gauntlets (left holds shield, right the sword) ----------
// left forearm down the left side, ending in a gauntlet that grips the shield
for (let y = 19; y <= 24; y++) { put('body', 8, y, 'o'); put('body', 9, y, 'b'); put('body', 10, y, 's'); }
for (let x = 8; x <= 10; x++) put('body', x, 25, 's');           // left gauntlet
// right forearm angling out to the sword grip + gauntlet
for (let y = 19; y <= 24; y++) { const x = 22 + Math.round((y - 19) * 0.7); put('body', x - 1, y, 'o'); put('body', x, y, 'b'); put('body', x + 1, y, 's'); }
for (let x = 25; x <= 27; x++) { put('body', x, 23, 'b'); put('body', x, 24, 's'); } // right gauntlet on grip

// ---------- SHIELD: small heater shield held in the left hand, in front of the chest ----------
for (let y = 16; y <= 27; y++) {
  const t = (y - 16) / 11, half = 4 - t * 3.4;     // straight top tapering to a point
  const L = Math.round(10 - half), R = Math.round(10 + half);
  for (let x = L; x <= R; x++) {
    let r = 'b';
    if (x === L || x === R || y === 16 || y >= 26) r = 'o';
    else if (x <= L + 1) r = 'h';                   // lit left rim
    else if (x >= R - 1) r = 's';
    put('shield', x, y, r);
  }
}
for (let x = 8; x <= 12; x++) put('shield', x, 19, 'a');         // emblem cross-bar
for (let y = 18; y <= 23; y++) put('shield', 10, y, 'a');        // emblem upright
put('shield', 10, 21, 'h');                                      // central boss glint

// ---------- SWORD: thick, point-up, held to the right ----------
for (let y = 3; y <= 19; y++) { put('sword', 26, y, 'b'); put('sword', 27, y, 's'); put('sword', 26, y, y % 2 ? 'h' : 'b'); }
put('sword', 26, 3, 'a'); put('sword', 27, 3, 'a'); put('sword', 26, 4, 'a'); // bright tip
for (let x = 24; x <= 29; x++) put('sword', x, 20, 'o');         // crossguard
put('sword', 24, 21, 'a'); put('sword', 29, 21, 'a');           // guard tips
for (let y = 21; y <= 24; y++) { put('sword', 26, y, 's'); put('sword', 27, y, 'o'); } // grip
for (let x = 25; x <= 28; x++) put('sword', x, 25, 'a');        // pommel

function emit(name, pretty) {
  const keys = Object.keys(layers[name]);
  if (!keys.length) { console.log(`// ${name} EMPTY`); return; }
  const xs = keys.map(k => +k.split(',')[0]), ys = keys.map(k => +k.split(',')[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const rows = [];
  for (let y = miny; y <= maxy; y++) { let row = ''; for (let x = minx; x <= maxx; x++) row += layers[name][`${x},${y}`] ?? '.'; rows.push(row); }
  const block = `[\n${rows.map(r => `      '${r}',`).join('\n')}\n    ]`;
  console.log(`  ${pretty}: {\n    res: 32, w: ${maxx - minx + 1}, h: ${maxy - miny + 1}, anchor: { x: ${minx}, y: ${miny} },\n    down: ${block}, up: ${block}, side: ${block},\n  },`);
}
emit('sword', 'knight_sword');
emit('body', 'knight_body');
emit('shield', 'knight_shield');
emit('helm', 'knight_helm');
emit('visor', 'knight_visor');
emit('eyes', 'knight_eyes');
