// PURE (no Phaser). Devuelve {x, y} para que un cuerpo de tamaño halfW×halfH
// (medios anchos) quede completo dentro de [0,W] × [0,H], con un margen extra
// contra los bordes. Usado por GameScene.containEnemy y el burrow del EnemyBrain.
function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

export function clampBodyInside(x, y, halfW, halfH, W, H, margin = 0) {
  const lo_x = halfW + margin;
  const hi_x = W - halfW - margin;
  const lo_y = halfH + margin;
  const hi_y = H - halfH - margin;

  // If body is too large in any dimension, degrade both to their hi values
  if (lo_x > hi_x || lo_y > hi_y) {
    return {
      x: hi_x,
      y: hi_y,
    };
  }

  return {
    x: clamp(x, lo_x, hi_x),
    y: clamp(y, lo_y, hi_y),
  };
}
