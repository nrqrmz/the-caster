// High-craft bare-headed mage/acolyte: a robed figure wearing a MITRE (same hue as
// the robe), a clean princess-style face, defined arms and visible skin hands.
// robe/mitre/arms = creature's type color; head + hands = skin palette;
// staff = wood + a glow orb (priestess only). Drowned variant swaps skin palette.
// Emits parts to splice/preview. Run: node tools/gen-mage.mjs
const N = 32, cx = 16;
const layers = {
  mitre: {}, hair: {}, robe: {}, head: {}, hands: {}, staff: {}, orb: {},
  club: {}, fish: {}, bow: {},                 // melee/ranged props
  vshirt: {}, vlegs: {}, hairshort: {},        // villager (shirt + trousers + short hair)
};
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };

// ---------- MITRE: tall pointed bishop's hat resting on the crown (type color) ----------
for (let y = 1; y <= 7; y++) {
  const half = Math.min(4.6, 0.4 + (y - 1) * 0.85);
  const L = Math.round(cx - half), R = Math.round(cx + half);
  for (let x = L; x <= R; x++) {
    let r = 'b';
    if (x === L || x === R) r = 'o';
    else if (x <= L + 1) r = 'h';                  // lit left
    else if (x >= R - 1) r = 's';                  // shadow right
    if (x === cx) r = 'a';                          // central orphrey band (accent trim)
    if (y === 1) r = 'o';                           // sharp peak
    put('mitre', x, y, r);
  }
}
for (let x = cx - 4; x <= cx + 4; x++) put('mitre', x, 7, 'a'); // base trim band

// ---------- HAIR (loose, to the waist): a smooth crown (NO center parting) that
// shows a bit of forehead, falling loose down both sides to ~the waist. Feminine
// variants use this INSTEAD of the mitre. Palette-driven. ----------
for (let y = 3; y <= 5; y++) {                      // smooth rounded crown (no part line)
  const half = 2.8 + (y - 3) * 1.1;
  const L = Math.round(cx - half), R = Math.round(cx + half);
  for (let x = L; x <= R; x++) {
    let r = 'b';
    if (x === L || x === R) r = 'o';
    else if (x <= L + 1) r = 'h';
    else if (x >= R - 1) r = 's';
    put('hair', x, y, r);
  }
}
for (let y = 5; y <= 22; y++) {                      // loose curtains: temples -> waist
  const cols = y >= 14 ? [10, 11, 12] : [11, 12];   // widen below the shoulders
  const colsR = y >= 14 ? [20, 21, 22] : [20, 21];
  cols.forEach((x, i) => put('hair', x, y, i === 0 ? 'o' : (y % 6 === 0 ? 'h' : 'b')));
  colsR.forEach((x, i, a) => put('hair', x, y, i === a.length - 1 ? 'o' : (y % 6 === 0 ? 'h' : 's')));
}
for (const x of [10, 11, 12, 20, 21, 22]) put('hair', x, 22, 's'); // rounded ends

// ---------- HEAD: skin oval with a clean princess-style face ----------
const inHead = (x, y) => ((x - cx) / 3.3) ** 2 + ((y - 9) / 3.9) ** 2 <= 1;
for (let y = 5; y <= 13; y++) for (let x = 11; x <= 21; x++) {
  if (!inHead(x, y)) continue;
  let r = 'b';
  if (x <= 13) r = 'h';                             // lit left cheek
  else if (x >= 19 || y >= 12) r = 's';            // jaw / right shade
  put('head', x, y, r);
}
// features (mirror the princess: eyes = dark dots, nose = highlight, mouth = shade)
put('head', 14, 8, 'o'); put('head', 18, 8, 'o');  // eyes
put('head', 13, 8, 's'); put('head', 19, 8, 's');  // eye sockets
put('head', cx, 9, 'h'); put('head', cx, 10, 'h'); // nose ridge
for (let x = 15; x <= 17; x++) put('head', x, 11, 's'); // mouth

// ---------- ROBE: narrow monastic column, shoulders y13 -> hem y31 ----------
for (let y = 13; y <= 31; y++) {
  const t = (y - 13) / 18;
  const half = 4.3 + 1.8 * t;                       // narrow shoulders, slight A-line
  const L = Math.round(cx - half), R = Math.round(cx + half);
  for (let x = L; x <= R; x++) {
    let r = 'b';
    if (x === L || x === R) r = 'o';
    else if (x <= L + 1) r = 'h';                  // lit left rim
    else if (x >= R - 1) r = 's';                  // shadow right
    if (Math.abs(x - cx) < 0.7 && y < 28) r = 'h'; // center seam
    put('robe', x, y, r);
  }
}
for (const x of [cx - 5, cx - 1, cx + 3, cx + 6]) { put('robe', x, 31, '.'); put('robe', x, 30, 's'); }

// ---------- ARMS: defined 2px sleeves hanging at the sides (robe color) ----------
for (let y = 14; y <= 23; y++) {
  put('robe', 10, y, 'o'); put('robe', 11, y, 'b');   // left sleeve
  put('robe', 21, y, 'b'); put('robe', 22, y, 'o');   // right sleeve
  if (y >= 16) { put('robe', 11, y, 's'); put('robe', 21, y, 's'); } // forearm shadow
}

// ---------- HANDS: small skin spheres at the sleeve ends ----------
for (const [hx, lit] of [[10, true], [22, false]]) {
  put('hands', hx, 24, lit ? 'h' : 'b'); put('hands', hx + 1, 24, 'b');
  put('hands', hx, 25, 'b'); put('hands', hx + 1, 25, 's');
}

// ---------- STAFF: clean wood rod (priestess) + a glow orb finial ----------
for (let y = 10; y <= 30; y++) { put('staff', 23, y, 'o'); put('staff', 24, y, 'b'); put('staff', 25, y, 's'); }
for (let y = 5; y <= 10; y++) for (let x = 22; x <= 27; x++) {
  const d = ((x - 24.3) / 2.6) ** 2 + ((y - 7.3) / 2.6) ** 2;
  if (d <= 1) put('orb', x, y, d > 0.62 ? 'o' : (d > 0.28 ? (x >= 25 ? 's' : 'b') : 'h'));
}

// ---------- CLUB / BAT: stout cudgel raised in the right hand (iniciado melee) ----------
for (let y = 15; y <= 23; y++) { put('club', 23, y, 'o'); put('club', 24, y, 'b'); } // handle
for (let y = 8; y <= 16; y++) for (let x = 21; x <= 27; x++) {                         // barrel
  const d = ((x - 24) / 2.4) ** 2 + ((y - 12) / 4) ** 2;
  if (d <= 1) put('club', x, y, d > 0.62 ? (x >= 25 ? 's' : 'o') : (x <= 23 ? 'h' : 'b'));
}

// ---------- FISH: a dead fish swung as a weapon (ahogado melee) ----------
for (let y = 11; y <= 16; y++) for (let x = 20; x <= 27; x++) {
  const d = ((x - 23.5) / 3.4) ** 2 + ((y - 13.5) / 2.3) ** 2;
  if (d <= 1) put('fish', x, y, d > 0.62 ? 'o' : (y <= 12 ? 'h' : 'b'));
}
for (const [x, y, r] of [[27, 12, 's'], [28, 11, 'o'], [28, 12, 's'], [27, 15, 's'], [28, 16, 'o'], [28, 15, 's']]) put('fish', x, y, r); // tail
put('fish', 21, 13, 'h');                            // eye glint

// ---------- BOW: a tall recurve bow (clear arc + taut string) with a nocked arrow.
// archer; the fired projectile is TEX.arrow. ----------
for (let y = 6; y <= 24; y++) {                      // curved limb: tips at x22, belly at x28
  const bulge = Math.round(6 * Math.sin(Math.PI * (y - 6) / 18));
  const x = 22 + bulge;
  put('bow', x, y, 'b'); put('bow', x + 1, y, 'o');  // limb + outer edge
  put('bow', 22, y, 'h');                            // taut string (chord between the tips)
}
put('bow', 22, 5, 'o'); put('bow', 22, 25, 'o');     // recurved tips
for (let x = 17; x <= 22; x++) put('bow', x, 15, 'a'); // nocked arrow shaft (points left)
put('bow', 17, 14, 'a'); put('bow', 17, 16, 'a');     // arrowhead

// ---------- VILLAGER SHIRT: torso + sleeves (no robe), type color ----------
for (let y = 13; y <= 20; y++) {
  const half = 4.6 - (y >= 19 ? 0.4 : 0);
  const L = Math.round(cx - half), R = Math.round(cx + half);
  for (let x = L; x <= R; x++) {
    let r = 'b';
    if (x === L || x === R) r = 'o';
    else if (x <= L + 1) r = 'h';
    else if (x >= R - 1) r = 's';
    put('vshirt', x, y, r);
  }
}
for (const x of [15, 16, 17]) put('vshirt', x, 13, 's'); // collar
for (let y = 14; y <= 23; y++) {                        // sleeves/arms hanging at the sides
  put('vshirt', 10, y, 'o'); put('vshirt', 11, y, 'b');
  put('vshirt', 21, y, 'b'); put('vshirt', 22, y, 'o');
  if (y >= 16) { put('vshirt', 11, y, 's'); put('vshirt', 21, y, 's'); }
}

// ---------- VILLAGER LEGS: two differentiated trousered legs + feet (pants palette) ----------
for (let y = 20; y <= 29; y++) {
  for (const x of [12, 13, 14]) put('vlegs', x, y, x === 12 ? 'o' : (x === 14 ? 's' : 'b')); // left leg
  for (const x of [17, 18, 19]) put('vlegs', x, y, x === 17 ? 'h' : (x === 19 ? 'o' : 'b')); // right leg
}
for (const x of [11, 12, 13, 14]) put('vlegs', x, 30, 'o'); // left foot
for (const x of [17, 18, 19, 20]) put('vlegs', x, 30, 'o'); // right foot

// ---------- VILLAGER SHORT HAIR: a clean rounded cap that hugs the head (male, short).
// Widest at the crown, tapering in at the temples — no protruding side locks. ----------
for (let y = 3; y <= 7; y++) {
  const half = y <= 5 ? 2.6 + (y - 3) * 0.9 : 4.4 - (y - 5) * 0.7; // bulge then hug in
  const L = Math.round(cx - half), R = Math.round(cx + half);
  for (let x = L; x <= R; x++) {
    let r = 'b';
    if (x === L || x === R) r = 'o';
    else if (x <= L + 1) r = 'h';
    else if (x >= R - 1) r = 's';
    put('hairshort', x, y, r);
  }
}

// ---------- emit ----------
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
emit('staff', 'mage_staff');
emit('orb', 'mage_orb');
emit('robe', 'mage_robe');
emit('mitre', 'mage_mitre');
emit('hair', 'mage_hair');
emit('head', 'mage_head');
emit('hands', 'mage_hands');
emit('club', 'mage_club');
emit('fish', 'mage_fish');
emit('bow', 'mage_bow');
emit('vshirt', 'villager_shirt');
emit('vlegs', 'villager_legs');
emit('hairshort', 'hair_short');
