// src/systems/Campaign.js
// Pure campaign progress rules. No Phaser. Content is passed in as arguments.

export function clearedCount(save, regionId) {
  return (save.regionProgress && save.regionProgress[regionId] && save.regionProgress[regionId].cleared) || 0;
}

// Linear within a branch: level 0 always open; level i opens once i levels are cleared.
export function isLevelUnlocked(save, regionId, index) {
  return index <= clearedCount(save, regionId);
}

export function isRegionComplete(save, region) {
  return clearedCount(save, region.id) >= region.levels.length;
}

export function isCastleUnlocked(save, requiredElements) {
  const owned = (save && save.elements) || [];
  return requiredElements.every((el) => owned.includes(el));
}

// Returns a NEW save advancing the region by one, awarding the level's reward.
// Only the next-in-line level (index === clearedCount) advances; anything else is a no-op.
export function grantClear(save, region, index) {
  const cur = clearedCount(save, region.id);
  if (index !== cur) return save;

  const level = region.levels[index];
  const next = {
    ...save,
    regionProgress: { ...save.regionProgress, [region.id]: { cleared: cur + 1 } },
    skillPoints: (save.skillPoints || 0) + ((level.reward && level.reward.skillPoints) || 0),
  };

  if (level.kind === 'temple' && region.element) {
    const owned = save.elements || [];
    if (!owned.includes(region.element)) next.elements = [...owned, region.element];
    if (region.grantsSkill) {
      const skills = save.unlockedSkills || [];
      if (!skills.includes(region.grantsSkill)) next.unlockedSkills = [...skills, region.grantsSkill];
    }
  }
  return next;
}
