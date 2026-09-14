// tools/lib/figure.mjs
// PURE (no Phaser, no fs). Convierte una figura de una hoja de referencia RGBA en
// un sprite de rejilla con colores propios: fondo por flood fill, cuantizado a
// resolución original, reducción por voto ponderado, pelado de halos oscuros,
// despeckle, contorno y caja del cuerpo de 32×32. Solo herramienta de desarrollo.

export const BODY = 32;
export const CHARS = '0123456789ABCDEF';
export const DEFAULTS = {
  bg: [16, 14, 25], // color del panel de la referencia
  bgTol: 14,        // distancia Manhattan RGB máxima para contar como fondo
  colors: 12,       // tamaño de la paleta por mediana (máx. 16)
  cover: 0.5,       // fracción mínima de píxeles de figura para que un píxel de salida sea opaco
  glowLum: 150,     // luminancia desde la que un color cuenta como brillo
  glowWeight: 3,    // peso del voto de los brillos (ojos, llamas)
  peel: 2,          // pasadas de pelado de bordes oscuros
  peelLum: 45,      // luminancia bajo la que un borde se pela
};

const lum = (c) => 0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255);
const rgbInt = (r, g, b) => (r << 16) | (g << 8) | b;
const dist2 = (a, b) => {
  const dr = ((a >> 16) & 255) - ((b >> 16) & 255), dg = ((a >> 8) & 255) - ((b >> 8) & 255), db = (a & 255) - (b & 255);
  return dr * dr + dg * dg + db * db;
};
const opaqueAt = (g, x, y) => y >= 0 && y < g.length && x >= 0 && x < g[0].length && g[y][x] != null;
const isEdge = (g, x, y) => !opaqueAt(g, x + 1, y) || !opaqueAt(g, x - 1, y) || !opaqueAt(g, x, y + 1) || !opaqueAt(g, x, y - 1);

// Mediana determinista: colors (ints 0xRRGGBB) → hasta n colores distintos.
export function medianCut(colors, n) {
  const boxes = [colors.slice()];
  while (boxes.length < n) {
    let best = -1, bestRange = 0, bestCh = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (const sh of [16, 8, 0]) {
        let lo = 255, hi = 0;
        for (const c of box) { const v = (c >> sh) & 255; if (v < lo) lo = v; if (v > hi) hi = v; }
        if (hi - lo > bestRange) { bestRange = hi - lo; best = i; bestCh = sh; }
      }
    });
    if (best < 0) break;
    const box = boxes[best].slice().sort((a, b) => (((a >> bestCh) & 255) - ((b >> bestCh) & 255)) || (a - b));
    const mid = box.length >> 1;
    boxes.splice(best, 1, box.slice(0, mid), box.slice(mid));
  }
  const pal = boxes.map((box) => {
    let r = 0, g = 0, b = 0;
    for (const c of box) { r += (c >> 16) & 255; g += (c >> 8) & 255; b += c & 255; }
    return rgbInt(Math.round(r / box.length), Math.round(g / box.length), Math.round(b / box.length));
  });
  return [...new Set(pal)];
}

// img: { width, height, data: RGBA }.
// fig: { slot: [x0, x1], rows: [y0, y1], scale, ...DEFAULTS overrides, overrides: [[x, y, 0xRRGGBB | null], …] }
// → { gridW, gridH, body: { x, y }, colors: { char: int }, rows: string[] }
export function convertFigure(img, fig) {
  const o = { ...DEFAULTS, ...fig };
  if (o.colors > CHARS.length) throw new Error(`convertFigure: colors ${o.colors} > ${CHARS.length}`);
  const [x0, x1] = o.slot, [y0, y1] = o.rows;
  const W = x1 - x0 + 1, H = y1 - y0 + 1;
  const px = (x, y) => { const i = ((y0 + y) * img.width + (x0 + x)) * 4; return rgbInt(img.data[i], img.data[i + 1], img.data[i + 2]); };

  // 1. Fondo: flood fill desde el borde del recorte sobre píxeles parecidos al panel.
  const bgLike = (x, y) => {
    const c = px(x, y);
    return Math.abs(((c >> 16) & 255) - o.bg[0]) + Math.abs(((c >> 8) & 255) - o.bg[1]) + Math.abs((c & 255) - o.bg[2]) <= o.bgTol;
  };
  const bg = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) stack.push([x, 0], [x, H - 1]);
  for (let y = 0; y < H; y++) stack.push([0, y], [W - 1, y]);
  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || y < 0 || x >= W || y >= H || bg[y * W + x] || !bgLike(x, y)) continue;
    bg[y * W + x] = 1;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  // 2. Caja ajustada de la figura.
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (bg[y * W + x]) continue;
    if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (maxX < 0) throw new Error('convertFigure: empty slot');
  const bw = maxX - minX + 1, bh = maxY - minY + 1;

  // 3. Paleta por mediana sobre los píxeles originales (colores nítidos, sin mezclas).
  const samples = [];
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) if (!bg[y * W + x]) samples.push(px(x, y));
  const pal = medianCut(samples, o.colors);
  const nearestIdx = (c) => { let bi = 0, bd = Infinity; pal.forEach((p, i) => { const d = dist2(c, p); if (d < bd) { bd = d; bi = i; } }); return bi; };

  // 4. Reducción por voto: cada píxel de salida toma el color más votado; los brillos votan ×glowWeight.
  const s = o.scale;
  const ow = Math.ceil(bw * s), oh = Math.ceil(bh * s);
  let grid = Array.from({ length: oh }, () => new Array(ow).fill(null));
  for (let oy = 0; oy < oh; oy++) for (let ox = 0; ox < ow; ox++) {
    const sx0 = Math.floor(ox / s), sx1 = Math.min(bw, Math.ceil((ox + 1) / s));
    const sy0 = Math.floor(oy / s), sy1 = Math.min(bh, Math.ceil((oy + 1) / s));
    let n = 0, fg = 0;
    const votes = new Array(pal.length).fill(0);
    for (let y = sy0; y < sy1; y++) for (let x = sx0; x < sx1; x++) {
      n++;
      if (bg[(minY + y) * W + (minX + x)]) continue;
      fg++;
      const i = nearestIdx(px(minX + x, minY + y));
      votes[i] += lum(pal[i]) >= o.glowLum ? o.glowWeight : 1;
    }
    if (!n || fg / n < o.cover) continue;
    let best = 0;
    for (let i = 1; i < votes.length; i++) if (votes[i] > votes[best]) best = i;
    grid[oy][ox] = pal[best];
  }

  // 5. Pelado: quita bordes oscuros (halos de brillo/sombra) `peel` veces.
  for (let pass = 0; pass < o.peel; pass++) {
    const prev = grid;
    grid = prev.map((row, y) => row.map((c, x) => (c != null && lum(c) < o.peelLum && isEdge(prev, x, y) ? null : c)));
  }
  // 6. Despeckle: quita píxeles opacos sin vecinos opacos.
  { const prev = grid;
    grid = prev.map((row, y) => row.map((c, x) => (c != null && !opaqueAt(prev, x + 1, y) && !opaqueAt(prev, x - 1, y) && !opaqueAt(prev, x, y + 1) && !opaqueAt(prev, x, y - 1) ? null : c))); }
  // 7. Contorno: los bordes de la silueta que no son brillo pasan al color más oscuro.
  const darkest = pal.reduce((d, p) => (lum(p) < lum(d) ? p : d), pal[0]);
  { const prev = grid;
    grid = prev.map((row, y) => row.map((c, x) => (c != null && lum(c) < o.glowLum && isEdge(prev, x, y) ? darkest : c))); }

  // 8. Caja del cuerpo: 32×32 apoyada abajo y centrada en la masa de las 32 filas inferiores.
  let sumX = 0, cnt = 0;
  for (let y = Math.max(0, oh - BODY); y < oh; y++) for (let x = 0; x < ow; x++) if (grid[y][x] != null) { sumX += x; cnt++; }
  const bx = Math.round((cnt ? sumX / cnt : ow / 2) + 0.5 - BODY / 2);
  const by = oh - BODY;
  const cx0 = Math.min(0, bx), cy0 = Math.min(0, by);
  const gridW = Math.max(ow, bx + BODY) - cx0, gridH = Math.max(oh, by + BODY) - cy0;
  const canvas = Array.from({ length: gridH }, () => new Array(gridW).fill(null));
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) canvas[y - cy0][x - cx0] = grid[y][x];

  // 9. Retoques a mano en coordenadas del lienzo.
  for (const [x, y, c] of o.overrides ?? []) {
    if (x < 0 || y < 0 || x >= gridW || y >= gridH) throw new Error(`convertFigure: override (${x},${y}) outside ${gridW}×${gridH}`);
    canvas[y][x] = c;
  }

  // 10. Letras por luminancia (oscuro → claro).
  const used = [...new Set(canvas.flat().filter((c) => c != null))].sort((a, b) => lum(a) - lum(b) || a - b);
  if (used.length > CHARS.length) throw new Error(`convertFigure: ${used.length} colors > ${CHARS.length}`);
  const charOf = new Map(used.map((c, i) => [c, CHARS[i]]));
  return {
    gridW, gridH,
    body: { x: bx - cx0, y: by - cy0 },
    colors: Object.fromEntries(used.map((c, i) => [CHARS[i], c])),
    rows: canvas.map((row) => row.map((c) => (c == null ? '.' : charOf.get(c))).join('')),
  };
}
