import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectLanguage, initLanguage, getLanguage, setLanguage, t, tLines, translate,
} from '../src/i18n/index.js';
import es from '../src/i18n/locales/es.js';
import en from '../src/i18n/locales/en.js';

// Minimal in-memory storage matching the getItem/setItem contract.
function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    _data: data,
  };
}

test('detectLanguage: es-prefix → es, everything else → en', () => {
  assert.equal(detectLanguage('es-MX'), 'es');
  assert.equal(detectLanguage('ES'), 'es');
  assert.equal(detectLanguage('en-US'), 'en');
  assert.equal(detectLanguage('fr-FR'), 'en');
  assert.equal(detectLanguage(undefined), 'en');
});

test('translate: nested lookup, cross-dict fallback, missing → key', () => {
  const a = { menu: { play: 'Jugar' } };
  const b = { menu: { play: 'Play', extra: 'Only here' } };
  assert.equal(translate('menu.play', a, b), 'Jugar');
  assert.equal(translate('menu.extra', a, b), 'Only here');
  assert.equal(translate('menu.missing', a, b), 'menu.missing');
});

test('translate: interpolates {params}, leaves them when no params', () => {
  const d = { x: { g: 'Oro: {gold}' } };
  assert.equal(translate('x.g', d, {}, { gold: 12 }), 'Oro: 12');
  assert.equal(translate('x.g', d, {}), 'Oro: {gold}');
});

test('initLanguage: no saved value → detects from navigator and persists', () => {
  const s = fakeStorage();
  const lang = initLanguage('es-MX', s);
  assert.equal(lang, 'es');
  assert.equal(getLanguage(), 'es');
  assert.equal(s.getItem('caster.lang'), 'es');
});

test('initLanguage: a saved value wins over the navigator', () => {
  const s = fakeStorage({ 'caster.lang': 'en' });
  const lang = initLanguage('es-MX', s);
  assert.equal(lang, 'en');
  assert.equal(getLanguage(), 'en');
});

test('setLanguage switches active language and persists', () => {
  const s = fakeStorage();
  initLanguage('es', s);
  setLanguage('en');
  assert.equal(getLanguage(), 'en');
  assert.equal(s.getItem('caster.lang'), 'en');
  assert.equal(t('menu.play'), '▶  TAP TO PLAY');
});

test('t resolves against the active locale', () => {
  const s = fakeStorage();
  initLanguage('es', s);
  assert.equal(t('menu.subtitle'), 'venganza elemental');
  setLanguage('en');
  assert.equal(t('menu.subtitle'), 'elemental vengeance');
});

test('tLines resolves speaker+text keys to strings', () => {
  const s = fakeStorage();
  initLanguage('es', s);
  const out = tLines([{ speaker: 'speaker.narrator', text: 'menu.play' }]);
  assert.deepEqual(out, [{ speaker: 'Narrador', text: '▶  TAP PARA JUGAR' }]);
});

function keyPaths(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') out.push(...keyPaths(v, p));
    else out.push(p);
  }
  return out.sort();
}

test('PARITY: es and en locales have identical key sets', () => {
  assert.deepEqual(keyPaths(es), keyPaths(en));
});
