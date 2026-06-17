// Tentáculo de agua (lobAoe, Kraken/Dama): columna vertical acuática que brota del suelo.
// Diseño en rejilla 32×32: base ancha abajo, cuerpo estrecho arriba, punta redondeada.
// El sprite se renderiza con setOrigin(0.5, 1) y se anima con scaleY 0→1→0 en la vida
// de la zona, dando la ilusión de que brota del suelo y se retrae.
//
// Roles de color (paleta del tipo, en este caso water/waterDeep vía recipe.baseColor):
//   o = outline (borde oscuro)
//   b = base    (color principal)
//   s = shade   (sombra interior)
//   h = highlight (brillo)
//   a = accent  (núcleo más claro)
//
// Run: node tools/gen-tentacle.mjs
// Salida: un bloque para pegar en src/data/sprites/parts.js (clave tentacle_body).

const N = 32;
const layer = {};
const put = (x, y, r) => { if (x >= 0 && x < N && y >= 0 && y < N) layer[`${x},${y}`] = r; };

// ---- geometría del tentáculo ----
// El sprite representa el tentáculo de abajo a arriba.
// y=0  = PUNTA (arriba en diseño), y=31 = BASE (suelo)
//
// Perfil: ancho w(y) varía de 2 px en punta a 10 px en base.
// Eje centrado en cx=16.
const cx = 16;

for (let y = 0; y < N; y++) {
  // t=0 en punta (y=0), t=1 en base (y=31)
  const t = y / (N - 1);
  // ancho total: 2 en punta, 10 en base (interpolación cuadrática para perfil cónico)
  const halfW = 1 + 4 * (t * t) + t * 0.5;
  const left  = Math.round(cx - halfW);
  const right = Math.round(cx + halfW);

  for (let x = left; x <= right; x++) {
    let r;
    if (x === left || x === right) {
      r = 'o'; // borde
    } else if (x === left + 1) {
      r = 'h'; // brillo a la izquierda (luz desde arriba-izquierda)
    } else if (x >= right - 1) {
      r = 's'; // sombra en el lado derecho
    } else if (x === cx) {
      // nervio central: highlight en la zona alta, shade en la baja
      r = t < 0.5 ? 'h' : 'b';
    } else {
      r = 'b';
    }
    put(x, y, r);
  }
}

// Punta redondeada: pequeño cap en y=0 (2 px de ancho = solo el eje)
put(cx, 0, 'a');        // núcleo brillante en la punta
put(cx - 1, 1, 'h');
put(cx + 1, 1, 'h');

// Ventosas / marcas a lo largo del cuerpo (detail acuático)
for (const [vx, vy] of [[cx - 1, 6], [cx + 2, 11], [cx - 1, 17], [cx + 2, 23]]) {
  put(vx, vy, 's');
  put(vx, vy + 1, 'a');
}

// Base más ancha: la última fila (y=31) ya tiene halfW máximo; añadir borde inferior
for (let x = Math.round(cx - 5.5); x <= Math.round(cx + 5.5); x++) {
  if (layer[`${x},31`] !== 'o') put(x, 31, layer[`${x},31`] || 'b');
  put(x, 31, x === Math.round(cx - 5.5) || x === Math.round(cx + 5.5) ? 'o' : (layer[`${x},31`] || 'b'));
}

// ---- emit ----
const keys = Object.keys(layer);
const xs = keys.map((k) => +k.split(',')[0]);
const ys = keys.map((k) => +k.split(',')[1]);
const minx = Math.min(...xs), maxx = Math.max(...xs);
const miny = Math.min(...ys), maxy = Math.max(...ys);
const rows = [];
for (let y = miny; y <= maxy; y++) {
  let row = '';
  for (let x = minx; x <= maxx; x++) row += layer[`${x},${y}`] ?? '.';
  rows.push(row);
}
const block = `[\n${rows.map((r) => `      '${r}',`).join('\n')}\n    ]`;
console.log(`  tentacle_body: {`);
console.log(`    res: 32, w: ${maxx - minx + 1}, h: ${maxy - miny + 1}, anchor: { x: ${minx}, y: ${miny} },`);
console.log(`    down: ${block}, up: ${block}, side: ${block},`);
console.log(`  },`);
