// src/data/shop.js
// Consumables: one source of truth for price (shop) and effect params (GameScene).
export const SHOP_ITEMS = [
  { key: 'potion',  label: 'Poción',         icon: '🧪', price: 40,  healPct: 0.5, threshold: 0.3 },
  { key: 'elixir',  label: 'Elixir de daño', icon: '⚗️', price: 60,  dmgMult: 1.5, durationMs: 8000 },
  { key: 'phoenix', label: 'Pluma de fénix', icon: '🪶', price: 150, revivePct: 0.5 },
];
