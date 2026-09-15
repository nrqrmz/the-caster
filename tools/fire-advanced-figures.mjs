// tools/fire-advanced-figures.mjs
// Recortes y parámetros por criatura sobre tools/refs/fuego-avanzado.png (1536×1024): 2 filas
// de 5 paneles, una figura por panel. slot = columnas interiores del panel [x0, x1]; rows = filas
// entre el adorno del título y el pie "32 × 32 px". bodySize = radius*2 del enemigo (cuerpo a
// escala 1) y minWidth = bodySize por defecto (la silueta nunca es más estrecha que su cuerpo);
// una figura puede subirlo en extra (can_lava, de perfil). scale es la escala inicial
// (≈ bodySize / ancho de la figura); minWidth la sube si hace falta. Lo demás
// sobreescribe DEFAULTS de tools/lib/figure.mjs. Lo leen gen- y preview-fire-advanced.
import { fileURLToPath } from 'node:url';

export const REF_PATH = fileURLToPath(new URL('./refs/fuego-avanzado.png', import.meta.url));

const TOP = [144, 428], BOTTOM = [560, 856];
const BG = [13, 12, 15];
const fig = (slot, rows, bodySize, scale, extra = {}) => ({ slot, rows, bodySize, minWidth: bodySize, scale, bg: BG, ...extra });

export const FIGURES = {
  can_lava:      fig([620, 912], TOP, 34, 0.12, { minWidth: 56, peel: 0, bgTol: 30 }), // de perfil: a 34 de ancho no se lee; hitbox 34
  coloso_magma:  fig([937, 1219], TOP, 60, 0.24, { bgTol: 24 }),                        // bgTol: deja fuera la sombra de los pies
  brasa_errante: fig([1244, 1512], BOTTOM, 32, 0.15),
};
