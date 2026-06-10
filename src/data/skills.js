// src/data/skills.js
// Registry of active skills (pure data). Drives the HUD buttons (icon/color/order)
// and the cast dispatch. The element matches the temple that unlocks the skill.
import { COLORS } from '../config.js';

export const SKILLS = [
  { key: 'fireball',  element: 'fire',  icon: '🔥', color: COLORS.fireball },
  { key: 'lightning', element: 'air',   icon: '⚡', color: COLORS.lightning },
  { key: 'poison',    element: 'earth', icon: '☠️', color: COLORS.poison },
  { key: 'freeze',    element: 'water', icon: '❄️', color: COLORS.ice },
];
