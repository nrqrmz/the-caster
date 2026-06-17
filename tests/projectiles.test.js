import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PROJECTILES, ELEMENT_DEFAULT_PROJECTILE, resolveProjectile } from '../src/data/projectiles.js';

test('el catálogo tiene los tipos con su efecto', () => {
  assert.equal(PROJECTILES.arrow.effect, null);
  assert.equal(PROJECTILES.bolt.effect, null); // rayo de Aire: mismo daño directo, sin efecto extra
  assert.deepEqual(PROJECTILES.fire.effect, { kind: 'burn', dps: 6, ms: 2000 });
  assert.deepEqual(PROJECTILES.ice.effect, { kind: 'slow', factor: 0.6, ms: 1200 });
  assert.deepEqual(PROJECTILES.poison.effect, { kind: 'dot', dps: 5, ms: 2500 });
});

test('cada entrada declara una textura y un tinte', () => {
  for (const k of ['arrow', 'bolt', 'fire', 'ice', 'poison']) {
    assert.ok(PROJECTILES[k].tex, `${k} debe tener tex`);
    assert.equal(typeof PROJECTILES[k].tint, 'number', `${k} debe tener tinte numérico`);
  }
});

test('resolveProjectile: el campo del ataque gana', () => {
  assert.equal(resolveProjectile({ projectile: 'poison' }, 'fire'), 'poison');
});

test('resolveProjectile: sin campo usa el default del elemento', () => {
  assert.equal(resolveProjectile({}, 'fire'), 'fire');
  assert.equal(resolveProjectile({}, 'water'), 'ice');
  assert.equal(resolveProjectile({}, 'air'), 'bolt'); // Aire dispara rayos, no flechas
  assert.equal(resolveProjectile({}, 'earth'), 'arrow');
});

test('resolveProjectile: fallback a arrow para elemento desconocido/null', () => {
  assert.equal(resolveProjectile({}, null), 'arrow');
  assert.equal(resolveProjectile({}, 'castle'), 'arrow');
  assert.equal(resolveProjectile(undefined, undefined), 'arrow');
});

test('ELEMENT_DEFAULT_PROJECTILE cubre los mundos elementales', () => {
  assert.equal(ELEMENT_DEFAULT_PROJECTILE.fire, 'fire');
  assert.equal(ELEMENT_DEFAULT_PROJECTILE.water, 'ice');
  assert.equal(ELEMENT_DEFAULT_PROJECTILE.air, 'bolt');
});
