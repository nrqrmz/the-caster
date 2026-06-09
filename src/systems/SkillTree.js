// src/systems/SkillTree.js
import { SKILL_TREE } from '../data/skilltree.js';
import { BASE_STATS, STAT_FLOORS } from '../data/stats.js';

export function canPurchase(save, nodeId) {
  const node = SKILL_TREE[nodeId];
  if (!node) return { ok: false, reason: 'nodo inexistente' };
  if (save.purchasedNodes.includes(nodeId)) return { ok: false, reason: 'ya comprado' };
  const missing = node.requires.filter((r) => !save.purchasedNodes.includes(r));
  if (missing.length) return { ok: false, reason: 'falta requisito previo' };
  if (save.skillPoints < node.cost) return { ok: false, reason: 'puntos insuficientes' };
  return { ok: true };
}

export function purchase(save, nodeId) {
  const check = canPurchase(save, nodeId);
  if (!check.ok) throw new Error(`No se puede comprar ${nodeId}: ${check.reason}`);
  const node = SKILL_TREE[nodeId];
  return {
    ...save,
    skillPoints: save.skillPoints - node.cost,
    purchasedNodes: [...save.purchasedNodes, nodeId],
  };
}

export function getStats(save) {
  const stats = { ...BASE_STATS };
  for (const nodeId of save.purchasedNodes) {
    const node = SKILL_TREE[nodeId];
    if (!node) continue;
    const { stat, add } = node.effect;
    stats[stat] = (stats[stat] ?? 0) + add;
  }
  for (const [stat, floor] of Object.entries(STAT_FLOORS)) {
    if (stats[stat] < floor) stats[stat] = floor;
  }
  return stats;
}
