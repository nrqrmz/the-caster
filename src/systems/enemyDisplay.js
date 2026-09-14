// src/systems/enemyDisplay.js
// PURE (no Phaser). Cómo mostrar el sprite de un enemigo normal según su receta.
// Sin `body`: cuadrado de radius*2 (comportamiento histórico). Con `body`: la rejilla
// tiene un cuadro de cuerpo de BODY_PX×BODY_PX en (body.x, body.y); el resto (halo,
// antorchas, humo) sobresale. La escala es uniforme, el origen cae en el centro del
// cuerpo (x,y del enemigo = centro del cuerpo) y el cuerpo físico cubre solo ese cuadro.
export const BODY_PX = 32;

export function displayFor(recipe, radius) {
  if (!recipe || !recipe.body) return { square: radius * 2 };
  const { gridW, gridH, body } = recipe;
  if (typeof gridW !== 'number' || typeof gridH !== 'number') {
    throw new Error('displayFor: recipe with body needs gridW and gridH');
  }
  return {
    scale: (radius * 2) / BODY_PX,
    originX: (body.x + BODY_PX / 2) / gridW,
    originY: (body.y + BODY_PX / 2) / gridH,
    body: { w: BODY_PX, h: BODY_PX, x: body.x, y: body.y },
    half: radius,
  };
}
