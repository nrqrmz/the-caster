import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import DialogueScene from './scenes/DialogueScene.js';
import SkillTreeScene from './scenes/SkillTreeScene.js';
import BranchScene from './scenes/BranchScene.js';
import MapScene from './scenes/MapScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.bg,
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
  scene: [BootScene, MenuScene, GameScene, MapScene, BranchScene, UIScene, DialogueScene, SkillTreeScene],
};

const game = new Phaser.Game(config);

// Re-fit when the viewport changes (address bar, rotation).
function refit() {
  game.scale.refresh();
}
window.addEventListener('resize', refit);
window.addEventListener('orientationchange', () => setTimeout(refit, 200));
