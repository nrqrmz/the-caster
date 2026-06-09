// src/systems/SaveSystem.js
export const SAVE_VERSION = 1;
const SAVE_KEY = 'the-caster:save';

export const DEFAULT_SAVE = {
  version: SAVE_VERSION,
  skillPoints: 0,
  purchasedNodes: [],
  unlockedSkills: [],
  unlockedTemples: [],
  currentScenario: 'scenario1',
};

function freshSave() {
  return JSON.parse(JSON.stringify(DEFAULT_SAVE));
}

export class SaveSystem {
  constructor(storage) {
    this.storage = storage; // must implement getItem/setItem/removeItem
  }

  load() {
    const raw = this.storage.getItem(SAVE_KEY);
    if (!raw) return freshSave();
    try {
      const parsed = JSON.parse(raw);
      if (parsed.version !== SAVE_VERSION) return freshSave();
      return { ...freshSave(), ...parsed };
    } catch {
      return freshSave();
    }
  }

  write(state) {
    this.storage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  reset() {
    this.storage.removeItem(SAVE_KEY);
  }
}
