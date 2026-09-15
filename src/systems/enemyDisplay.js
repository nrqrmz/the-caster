// src/systems/enemyDisplay.js
// PURE (no Phaser). Cómo mostrar el sprite de un enemigo normal según su receta.
// Sin `body`: cuadrado de radius*2 (comportamiento histórico). Con `body`: la rejilla
// tiene un cuadro de cuerpo de size×size (body.size, por defecto BODY_PX) en (body.x, body.y);
// el resto (halo, antorchas, alas) sobresale. La escala es uniforme, el origen cae en el
// centro del cuerpo (x,y del enemigo = centro del cuerpo) y el cuerpo físico cubre solo ese
// cuadro. Con size = radius*2 la escala es 1 (sprite a tamaño real).
export const BODY_PX = 32;

export function displayFor(recipe, radius) {
  if (!recipe || !recipe.body) return { square: radius * 2 };
  const { gridW, gridH, body } = recipe;
  if (typeof gridW !== 'number' || typeof gridH !== 'number') {
    throw new Error('displayFor: recipe with body needs gridW and gridH');
  }
  const size = body.size ?? BODY_PX;
  return {
    scale: (radius * 2) / size,
    originX: (body.x + size / 2) / gridW,
    originY: (body.y + size / 2) / gridH,
    body: { w: size, h: size, x: body.x, y: body.y },
    half: radius,
  };
}
