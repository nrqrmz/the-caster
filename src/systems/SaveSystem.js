// src/systems/SaveSystem.js
export const SAVE_VERSION = 3;
const SAVE_KEY = 'the-caster:save';

export const DEFAULT_SAVE = {
  version: SAVE_VERSION,
  skillPoints: 0,
  purchasedNodes: [],
  unlockedSkills: [],
  elements: [],
  regionProgress: {},
  gold: 0,
  inventory: { potion: 0, elixir: 0, phoenix: 0 },
  respecCount: 0,
  seenIntros: [],
};

function freshSave() {
  return JSON.parse(JSON.stringify(DEFAULT_SAVE));
}

// v1 → v2: derive elements from old unlockedTemples, drop currentScenario.
function migrateV1toV2(old) {
  return {
    version: 2,
    skillPoints: old.skillPoints || 0,
    purchasedNodes: old.purchasedNodes || [],
    unlockedSkills: old.unlockedSkills || [],
    elements: old.unlockedTemples || [],
    regionProgress: {},
  };
}

// v2 → v3: add economy fields.
function migrateV2toV3(old) {
  return {
    ...freshSave(),
    skillPoints: old.skillPoints || 0,
    purchasedNodes: old.purchasedNodes || [],
    unlockedSkills: old.unlockedSkills || [],
    elements: old.elements || [],
    regionProgress: old.regionProgress || {},
  };
}

export class SaveSystem {
  constructor(storage) {
    this.storage = storage; // getItem/setItem/removeItem
  }

  load() {
    const raw = this.storage.getItem(SAVE_KEY);
    if (!raw) return freshSave();
    try {
      const parsed = JSON.parse(raw);
      if (parsed.version === SAVE_VERSION) return { ...freshSave(), ...parsed };
      if (parsed.version === 2) return migrateV2toV3(parsed);
      if (parsed.version === 1) return migrateV2toV3(migrateV1toV2(parsed));
      return freshSave();
    } catch {
      return freshSave();
    }
  }

  write(state) { this.storage.setItem(SAVE_KEY, JSON.stringify(state)); }
  reset() { this.storage.removeItem(SAVE_KEY); }
}
