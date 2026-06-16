import { GAME_WIDTH, GAME_HEIGHT, COLORS, DEBUG } from './config.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import DialogueScene from './scenes/DialogueScene.js';
import SkillTreeScene from './scenes/SkillTreeScene.js';
import BranchScene from './scenes/BranchScene.js';
import MapScene from './scenes/MapScene.js';
import ShopScene from './scenes/ShopScene.js';
import PauseScene from './scenes/PauseScene.js';
import GameOverScene from './scenes/GameOverScene.js';
import { initLanguage } from './i18n/index.js';

// Resolve language before any scene renders text.
initLanguage(typeof navigator !== 'undefined' ? navigator.language : undefined, window.localStorage);

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.bg,
  pixelArt: true, // nearest-neighbor filtering so pixel-art sprites stay crisp when scaled
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [BootScene, MenuScene, GameScene, MapScene, BranchScene, UIScene, DialogueScene, SkillTreeScene, ShopScene, PauseScene, GameOverScene],
};

const game = new Phaser.Game(config);

// Debug-only handle for inspection/automation (e.g. Playwright). Hidden in release.
if (DEBUG) window.__game = game;

// Re-fit when the viewport changes (address bar, rotation).
function refit() {
  game.scale.refresh();
}
window.addEventListener('resize', refit);
window.addEventListener('orientationchange', () => setTimeout(refit, 200));
