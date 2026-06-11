// src/systems/FormSequencer.js
// Pure (no Phaser). Manages multi-form boss lifecycle (shapeshifter).
// Each form has independent hp, resist, and a full movement/phase kit.
// applyDamage reduces current form hp (after resist). When a form hits 0:
//   - If not the last form: sets transformPending = true (caller triggers transform).
//   - If the last form: sets fightOver = true.
// completeTransform() advances to the next form with full hp.

export class FormSequencer {
  constructor(forms) {
    if (!forms || forms.length === 0) throw new Error('FormSequencer requires at least one form');
    this.forms = forms;
    this.activeFormIndex = 0;
    this.currentHp = forms[0].hp;
    this.transformPending = false;
    this.fightOver = false;
  }

  activeForm() {
    return this.forms[this.activeFormIndex];
  }

  isLastForm() {
    return this.activeFormIndex === this.forms.length - 1;
  }

  // Apply damage to the current form, accounting for its resist.
  applyDamage(rawDamage) {
    if (this.fightOver || this.transformPending) return;
    const resist = this.activeForm().resist ?? 0;
    const actual = rawDamage * (1 - Math.max(0, Math.min(1, resist)));
    this.currentHp = Math.max(0, this.currentHp - actual);
    if (this.currentHp <= 0) {
      if (this.isLastForm()) {
        this.fightOver = true;
      } else {
        this.transformPending = true;
      }
    }
  }

  // Called by GameScene after the transform animation completes.
  completeTransform() {
    if (!this.transformPending) return;
    this.activeFormIndex += 1;
    this.currentHp = this.forms[this.activeFormIndex].hp;
    this.transformPending = false;
  }

  // Convenience: hp fraction for the UI bar.
  hpFraction() {
    return this.currentHp / (this.activeForm().hp || 1);
  }
}
