// tools/fire-basics-figures.mjs
// Recortes y parámetros por criatura sobre tools/refs/fuego-basicos-small.png (1569×192).
// slot = columnas [x0, x1] de la figura IZQUIERDA de cada panel; rows = filas bajo el título.
// scale = píxeles de salida por píxel de referencia (cuerpo ≈ 32 px de alto).
// Los demás campos sobreescriben DEFAULTS de tools/lib/figure.mjs; overrides = retoques
// [x, y, 0xRRGGBB | null] en coordenadas del lienzo final. Lo leen gen- y preview-fire-basics.
import { fileURLToPath } from 'node:url';

export const REF_PATH = fileURLToPath(new URL('./refs/fuego-basicos-small.png', import.meta.url));

const ROWS = [76, 188];

export const FIGURES = {
  acolito_brasa: { slot: [22, 66], rows: ROWS, scale: 0.40 },
  pirovidente:   { slot: [476, 603], rows: ROWS, scale: 0.40 },
};
