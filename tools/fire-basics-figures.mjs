// tools/fire-basics-figures.mjs
// Recortes y parámetros por criatura sobre tools/refs/fuego-basicos-small.png (1569×192).
// slot = columnas [x0, x1] de la figura IZQUIERDA de cada panel; rows = filas bajo el título.
// scale = píxeles de salida por píxel de referencia (mínimo); MIN_WIDTH sube la escala de
// las figuras delgadas para que la silueta mida ≥ 32 px de ancho (el alto sigue el ratio).
// Los demás campos sobreescriben DEFAULTS de tools/lib/figure.mjs; overrides = retoques
// [x, y, 0xRRGGBB | null] en coordenadas del lienzo final. Lo leen gen- y preview-fire-basics.
import { fileURLToPath } from 'node:url';

export const REF_PATH = fileURLToPath(new URL('./refs/fuego-basicos-small.png', import.meta.url));

const ROWS = [76, 188];
const MIN_WIDTH = 32;

export const FIGURES = {
  acolito_brasa:    { slot: [22, 66], rows: ROWS, minWidth: MIN_WIDTH, scale: 0.40 },
  lanzabrasas:      { slot: [172, 229], rows: ROWS, minWidth: MIN_WIDTH, scale: 0.42 },
  piromante:        { slot: [321, 382], rows: ROWS, minWidth: MIN_WIDTH, scale: 0.42 },
  pirovidente:      { slot: [476, 603], rows: ROWS, minWidth: MIN_WIDTH, scale: 0.40 },
  sacerdote_llama:  { slot: [646, 745], rows: ROWS, minWidth: MIN_WIDTH, scale: 0.40 },
  encapuchado_pira: { slot: [786, 851], rows: ROWS, minWidth: MIN_WIDTH, scale: 0.40 },
  iniciado_veloz:   { slot: [953, 1006], rows: ROWS, minWidth: MIN_WIDTH, scale: 0.46 },
  salamandra:       { slot: [1105, 1156], rows: ROWS, minWidth: MIN_WIDTH, scale: 0.40, peel: 0 },
  larva_magma:      { slot: [1266, 1316], rows: ROWS, minWidth: MIN_WIDTH, scale: 0.40 },
  espiritu_ceniza:  { slot: [1440, 1481], rows: ROWS, minWidth: MIN_WIDTH, scale: 0.40 },
};
