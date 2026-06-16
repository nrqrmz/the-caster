// High-craft jellyfish (medusa + medusa_cria). A translucent glowing bell with a
// glassy highlight, an inner core, wavy trailing tentacles, and glowing eyes.
// Bell/guts/tentacles take the creature type color; eyes use the glow palette.
// Run: node tools/gen-jelly.mjs
const N = 32, cx = 16;
const layers = { tent: {}, bell: {}, guts: {}, eyes: {} };
const put = (L, x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layers[L][`${x},${y}`] = r; };

// ---------- BELL: domed translucent hood ----------
for (let y = 2; y <= 14; y++) for (let x = 5; x <= 27; x++) {
  const d = ((x + 0.5 - cx) / 10) ** 2 + ((y + 0.5 - 8.5) / 6.8) ** 2;
  if (d > 1 || y > 14) continue;
  let r = 'b';
  if (d > 0.82) r = 'o';                                  // rim outline
  else if (x < cx - 1 && y < 8 && d < 0.55) r = 'h';      // glassy upper-left sheen
  else if (d > 0.6) r = 's';                              // edge shade (volume)
  else if (y < 6) r = 'h';                                // top dome light band
  put('bell', x, y, r);
}
// scalloped bottom rim (poke gaps so it reads as a jellyfish skirt)
for (const x of [8, 12, 16, 20, 24]) { put('bell', x, 14, '.'); put('bell', x, 13, x === cx ? '.' : 's'); }
// re-outline the scallop lobes
for (let x = 6; x <= 26; x++) if (layers.bell[`${x},13`] === 'b') put('bell', x, 13, 's');

// ---------- GUTS: glowing inner core / oral arms under the bell ----------
for (let y = 9; y <= 14; y++) for (let x = 13; x <= 19; x++) {
  const d = ((x + 0.5 - cx) / 3.2) ** 2 + ((y + 0.5 - 11) / 3) ** 2;
  if (d <= 1) put('guts', x, y, d > 0.5 ? 'b' : 'a');     // bright accent core
}

// ---------- EYES: two soft glowing eyes on the bell ----------
for (const x of [13, 19]) { put('eyes', x, 8, 'h'); put('eyes', x, 9, 'b'); }

// ---------- TENTACLES: clean separate trailing strands (one per lane) ----------
// Gentle constant-amplitude wave (< half the lane spacing) so strands never cross.
const strands = [
  { x: 10, len: 11, ph: 0.0 }, { x: 13, len: 15, ph: 1.1 }, { x: 16, len: 18, ph: 2.2 },
  { x: 19, len: 15, ph: 3.3 }, { x: 22, len: 11, ph: 4.4 },
];
for (const { x: tx, len, ph } of strands) {
  for (let i = 0; i < len; i++) {
    const y = 14 + i;
    const wob = Math.sin(i * 0.5 + ph) * 1.0;             // gentle sway, stays in lane
    const x = Math.round(tx + wob);
    const base = Math.abs(tx - cx) > 4 ? 's' : 'b';       // outer strands a touch darker
    put('tent', x, y, i >= len - 2 ? 'o' : base);         // dark taper at the tip
    if (i <= 2) put('tent', x + (tx < cx ? 1 : -1), y, 's'); // thicker where it joins the bell
  }
}

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
emit('tent', 'jelly_tentacles');
emit('bell', 'jelly_bell');
emit('guts', 'jelly_guts');
emit('eyes', 'jelly_eyes');
