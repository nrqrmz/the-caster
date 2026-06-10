// src/systems/Economy.js
// Pure economy logic. No Phaser. Imports only pure data.
import { SHOP_ITEMS } from '../data/shop.js';
import { SKILL_TREE } from '../data/skilltree.js';

const GOLD_BASE = { basic: 8, intermediate: 12, pretemple: 20, levelboss: 20, temple: 35 };
const GOLD_PAR_MS = { basic: 30000, intermediate: 45000, pretemple: 60000, levelboss: 60000, temple: 50000 };

// Gold for clearing a level: base(kind) × difficulty mult × time factor (fast = more).
export function goldReward(level, mult, clearMs) {
  const base = GOLD_BASE[level.kind] || 10;
  const par = GOLD_PAR_MS[level.kind] || 45000;
  const timeFactor = Math.max(0.75, Math.min(1.5, 1.5 - 0.5 * (clearMs / par)));
  return Math.round(base * mult * timeFactor);
}

export function respecCost(respecCount) {
  return 100 * Math.pow(3, respecCount || 0);
}

function itemByKey(key) { return SHOP_ITEMS.find((i) => i.key === key); }

export function canBuy(save, itemKey) {
  const item = itemByKey(itemKey);
  return !!item && (save.gold || 0) >= item.price;
}

export function buy(save, itemKey) {
  if (!canBuy(save, itemKey)) return save;
  const item = itemByKey(itemKey);
  return {
    ...save,
    gold: save.gold - item.price,
    inventory: { ...save.inventory, [itemKey]: ((save.inventory && save.inventory[itemKey]) || 0) + 1 },
  };
}

export function canRespec(save) {
  return (save.purchasedNodes || []).length > 0 && (save.gold || 0) >= respecCost(save.respecCount);
}

export function respec(save) {
  if (!canRespec(save)) return save;
  const cost = respecCost(save.respecCount);
  const refund = (save.purchasedNodes || []).reduce(
    (sum, id) => sum + (SKILL_TREE[id] ? SKILL_TREE[id].cost : 0), 0,
  );
  return {
    ...save,
    gold: save.gold - cost,
    skillPoints: (save.skillPoints || 0) + refund,
    purchasedNodes: [],
    respecCount: (save.respecCount || 0) + 1,
  };
}
