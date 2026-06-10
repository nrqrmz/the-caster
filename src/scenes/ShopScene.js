import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config.js';
import { SHOP_ITEMS } from '../data/shop.js';
import { SaveSystem } from '../systems/SaveSystem.js';
import { canBuy, buy } from '../systems/Economy.js';

export default class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  create() {
    this.save = new SaveSystem(window.localStorage);
    this.state = this.save.load();
    this.cameras.main.setBackgroundColor(COLORS.bg);

    this.add.text(GAME_WIDTH / 2, 40, 'Tienda', { fontFamily: 'sans-serif', fontSize: '24px', color: '#fff' }).setOrigin(0.5);
    this.goldText = this.add.text(GAME_WIDTH / 2, 74, '', { fontFamily: 'sans-serif', fontSize: '18px', color: '#ffd54f' }).setOrigin(0.5);

    this.rows = [];
    SHOP_ITEMS.forEach((item, i) => {
      const y = 140 + i * 92;
      const bg = this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 50, 76, 0x241c33).setStrokeStyle(2, 0xffd54f, 0.4).setInteractive();
      this.add.text(40, y - 18, `${item.icon} ${item.label}`, { fontFamily: 'sans-serif', fontSize: '17px', color: '#fff' });
      const owned = this.add.text(40, y + 10, '', { fontFamily: 'sans-serif', fontSize: '13px', color: '#9b8fb5' });
      this.add.text(GAME_WIDTH - 40, y, `${item.price} oro`, { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffd54f' }).setOrigin(1, 0.5);
      bg.on('pointerdown', () => this.buyItem(item.key));
      this.rows.push({ key: item.key, bg, owned });
    });

    const back = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 50, 200, 48, 0x4fc3f7, 0.25).setStrokeStyle(2, 0x4fc3f7).setInteractive();
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50, 'Volver', { fontFamily: 'sans-serif', fontSize: '18px', color: '#fff' }).setOrigin(0.5);
    back.on('pointerdown', () => this.scene.start('Map'));

    this.refresh();
  }

  buyItem(key) {
    if (!canBuy(this.state, key)) return;
    this.state = buy(this.state, key);
    this.save.write(this.state);
    this.refresh();
  }

  refresh() {
    this.goldText.setText(`Oro: ${this.state.gold || 0}`);
    for (const row of this.rows) {
      const n = (this.state.inventory && this.state.inventory[row.key]) || 0;
      row.owned.setText(`tienes: ${n}`);
      row.bg.setFillStyle(canBuy(this.state, row.key) ? 0x2a2a16 : 0x1a1622);
    }
  }
}
