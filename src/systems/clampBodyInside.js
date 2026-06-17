// PURE (no Phaser). Devuelve {x, y} para que un cuerpo de tamaño halfW×halfH
// (medios anchos) quede completo dentro de [0,W] × [0,H], con un margen extra
// contra los bordes. Usado por GameScene.containEnemy y el burrow del EnemyBrain.
function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

export function clampBodyInside(x, y, halfW, halfH, W, H, margin = 0) {
  return {
    x: clamp(x, halfW + margin, W - halfW - margin),
    y: clamp(y, halfH + margin, H - halfH - margin),
  };
}
