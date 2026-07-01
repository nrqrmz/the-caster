// PURE data (no Phaser; importa solo constantes de config.js, que es Phaser-free).
// Catálogo de proyectiles enemigos: cada tipo define su sprite, su tinte y el
// efecto implícito que aplica al jugador al impactar. Consumido por
// GameScene.executeAttack (textura/tinte/efecto) vía resolveProjectile().
import { TEX, COLORS } from '../config.js';

export const PROJECTILES = {
  arrow:  { tex: TEX.arrow,      tint: COLORS.arrow,     effect: null },
  bolt:   { tex: TEX.bolt,       tint: COLORS.lightning, effect: null },
  // Tornado: recicla el sprite del torbellino_errante. No lleva `effect` (burn/slow/dot);
  // el lift al contacto lo aplica el flag `lift:true` del ataque (ver executeAttack).
  tornado: { tex: TEX.tornado,   tint: COLORS.whirlGrey, effect: null },
  fire:   { tex: TEX.fireball,   tint: COLORS.fireball,  effect: { kind: 'burn', dps: 6, ms: 2000 } },
  ice:    { tex: TEX.iceShard,   tint: COLORS.ice,       effect: { kind: 'slow', factor: 0.6, ms: 1200 } },
  poison: { tex: TEX.poisonGlob, tint: COLORS.poison,    effect: { kind: 'dot',  dps: 5, ms: 2500 } },
  // Esfera de plasma del Espíritu de Tormenta — entumece (slow eléctrico).
  plasma:     { tex: TEX.iceShard, tint: COLORS.plasmaBolt, effect: { kind: 'slow', factor: 0.6, ms: 1000 } },
  // Dardo de sangre (Caballero de Sangre, Galahad) — violeta; el slow va por att.slowChance.
  bloodDart:  { tex: TEX.bolt,     tint: COLORS.bloodMagic, effect: null },
  // Chispa rastreadora pétrea del Centinela — violeta-piedra; el petrify va por att.root.
  stoneSpark: { tex: TEX.bolt,     tint: COLORS.stoneSpark, effect: null },
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
