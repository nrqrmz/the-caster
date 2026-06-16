// src/i18n/index.js
// Pure localization layer. No Phaser. Resolution + detection + persistence.
import es from './locales/es.js';
import en from './locales/en.js';

const LOCALES = { es, en };
const STORAGE_KEY = 'caster.lang';

let _lang = 'es';
let _storage = null;

export function detectLanguage(navLang) {
  return (typeof navLang === 'string' && navLang.toLowerCase().startsWith('es')) ? 'es' : 'en';
}

function getPath(obj, key) {
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
}

// Pure resolver: primary dict, then fallback dict, then the key itself.
export function translate(key, primary, fallback, params) {
  let val = getPath(primary, key);
  if (val === undefined) val = getPath(fallback, key);
  if (typeof val !== 'string') {
    if (typeof console !== 'undefined' && console.warn) console.warn(`[i18n] missing key: ${key}`);
    return key;
  }
  return interpolate(val, params);
}

export function getLanguage() { return _lang; }

export function setLanguage(lang) {
  _lang = lang === 'es' ? 'es' : 'en';
  if (_storage) _storage.setItem(STORAGE_KEY, _lang);
  return _lang;
}

// Resolve the language at boot: a persisted choice wins; otherwise detect + persist.
export function initLanguage(navLang, storage) {
  _storage = storage || null;
  const saved = _storage ? _storage.getItem(STORAGE_KEY) : null;
  if (saved === 'es' || saved === 'en') {
    _lang = saved;
  } else {
    _lang = detectLanguage(navLang);
    if (_storage) _storage.setItem(STORAGE_KEY, _lang);
  }
  return _lang;
}

export function t(key, params) {
  const other = _lang === 'es' ? 'en' : 'es';
  return translate(key, LOCALES[_lang], LOCALES[other], params);
}

// Resolve an array of {speaker, text} keys (dialogue) to display strings.
export function tLines(lines) {
  return (lines || []).map((l) => ({ speaker: t(l.speaker), text: t(l.text) }));
}
