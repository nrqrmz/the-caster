// PURE data (no Phaser; importa solo constantes de config.js, que es Phaser-free).
// Catálogo de proyectiles enemigos: cada tipo define su sprite, su tinte y el
// efecto implícito que aplica al jugador al impactar. Consumido por
// GameScene.executeAttack (textura/tinte/efecto) vía resolveProjectile().
import { TEX, COLORS } from '../config.js';

export const PROJECTILES = {
  arrow:  { tex: TEX.arrow,      tint: COLORS.arrow,     effect: null },
  bolt:   { tex: TEX.bolt,       tint: COLORS.lightning, effect: null },
  fire:   { tex: TEX.fireball,   tint: COLORS.fireball,  effect: { kind: 'burn', dps: 6, ms: 2000 } },
  ice:    { tex: TEX.iceShard,   tint: COLORS.ice,       effect: { kind: 'slow', factor: 0.6, ms: 1200 } },
  poison: { tex: TEX.poisonGlob, tint: COLORS.poison,    effect: { kind: 'dot',  dps: 5, ms: 2500 } },
};

// Tipo por defecto según el elemento del mundo (cuando el ataque no lo declara).
// Aire = rayo (bolt). Earth/castle siguen en 'arrow' hasta tener proyectil propio.
export const ELEMENT_DEFAULT_PROJECTILE = {
  fire: 'fire', water: 'ice', air: 'bolt', earth: 'arrow', castle: 'arrow',
};

// El campo del ataque gana; si no, el default del mundo; si no, 'arrow'.
export function resolveProjectile(att, element) {
  return (att && att.projectile) || ELEMENT_DEFAULT_PROJECTILE[element] || 'arrow';
}
