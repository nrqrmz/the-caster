// tools/fire-bosses-figures.mjs
// Recortes y parámetros por figura de los jefes de Fuego y la Escolta del Templo, sobre dos
// referencias: tools/refs/fuego-jefes.png (1560×523, 4 paneles en fila) y
// tools/refs/fuego-escolta.png (714×717, un panel). ref = PNG de la figura; slot = columnas
// interiores del panel [x0, x1]; rows = filas entre el subtítulo y el pie. Jefes: bodySize =
// radius*2 del jefe (hitbox a escala 1) y fitSide = lado mayor de la silueta (48 o 64). Escolta:
// como los básicos, minWidth 32 con el alto por ratio y scale inicial. Lo demás sobreescribe
// DEFAULTS de tools/lib/figure.mjs. Lo leen gen- y preview-fire-bosses.
import { fileURLToPath } from 'node:url';

const JEFES = fileURLToPath(new URL('./refs/fuego-jefes.png', import.meta.url));
const ESCOLTA = fileURLToPath(new URL('./refs/fuego-escolta.png', import.meta.url));

// Lado mayor de la silueta de cada jefe y lado del cuadro del cuerpo (radius*2) de cada figura.
export const SIDE = { pyra: 48, vesta: 64, favilla: 48, ignatius: 64 };
export const BODY = { pyra: 48, vesta: 64, favilla: 48, ignatius: 60, escolta_templo: 32 };

const ROWS = [103, 474];
const BG_JEFES = [13, 12, 17];
const boss = (key, slot, extra = {}) => ({ ref: JEFES, slot, rows: ROWS, bodySize: BODY[key], fitSide: SIDE[key], bg: BG_JEFES, bgTol: 24, ...extra });

export const FIGURES = {
  pyra:     boss('pyra', [12, 378]),
  ignatius: boss('ignatius', [1176, 1542]),
};
