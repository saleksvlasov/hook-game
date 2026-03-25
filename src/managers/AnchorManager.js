import Phaser from 'phaser';
import { ANCHOR_SPACING_Y, SPAWN_Y, Z } from '../constants.js';

// Менеджер якорей — процедурная генерация, отрисовка, cleanup
// Neon Western: cyan неактивные крюки, amber активные, pink ржавчина
export class AnchorManager {
  constructor(scene) {
    this.scene = scene;
    this.anchors = [];
    this.highestAnchorY = SPAWN_Y - 120;  // Было -180 — первый якорь ближе к спавну
    this.prevAnchorX = scene.W / 2;
  }

  create() {
    this.addAnchor(
      this.scene.W / 2 + Phaser.Math.Between(-60, 60),
      this.highestAnchorY
    );
    // Генерируем на 3000px вверх от спавна
    this.generateAnchorsUpTo(SPAWN_Y - 3000);
  }

  // Процедурная генерация — добавляет якоря вверх до targetY
  generateAnchorsUpTo(targetY) {
    while (this.highestAnchorY - ANCHOR_SPACING_Y > targetY) {
      this.highestAnchorY -= ANCHOR_SPACING_Y;
      let x;
      do {
        x = Phaser.Math.Between(60, this.scene.W - 60);
      } while (Math.abs(x - this.prevAnchorX) < this.scene.W * 0.15);
      this.prevAnchorX = x;
      this.addAnchor(x, this.highestAnchorY);
    }
  }

  // Удаление якорей далеко ниже игрока (>3000px)
  cleanup(playerY) {
    const cutoff = playerY + 3000;
    for (let i = this.anchors.length - 1; i >= 0; i--) {
      if (this.anchors[i].y > cutoff) {
        const anchor = this.anchors[i];
        if (anchor._container) anchor._container.destroy();
        anchor.destroy();
        this.anchors.splice(i, 1);
      }
    }
  }

  addAnchor(x, y) {
    const c = this.scene.add.container(x, y).setDepth(Z.ANCHORS);
    const g = this.scene.add.graphics();
    this.drawButcherHook(g, false);
    c.add(g);
    const dot = this.scene.add.circle(x, y, 12, 0xffffff, 0).setDepth(Z.ANCHORS);
    dot._container = c;
    this.anchors.push(dot);
  }

  drawButcherHook(g, active) {
    g.clear();

    // Стержень — тёмная сталь
    g.fillStyle(0x2A3050);
    g.fillRect(-2, -22, 4, 12);

    // S-образный крюк — cyan (неактив) / amber (актив)
    const hookColor = active ? 0xFFB800 : 0x00F5D4;
    g.lineStyle(3.5, hookColor, active ? 1 : 0.7);
    g.beginPath();
    g.arc(6, -10, 7, Math.PI, 0, true);
    g.strokePath();
    g.beginPath();
    g.arc(-4, 3, 8, 0, Math.PI, true);
    g.strokePath();
    g.lineStyle(3, hookColor, active ? 1 : 0.7);
    g.lineBetween(6, -3, -4, 3);

    // Остриё — совпадает с цветом крюка
    g.fillStyle(hookColor, 0.9);
    g.fillTriangle(-12, 3, -11, 10, -7, 4);

    // Неоновая ржавчина — pink пятна
    g.fillStyle(0xFF2E63, 0.1);
    g.fillCircle(4, -6, 2);
    g.fillCircle(-6, 5, 1.5);

    if (active) {
      // Cyan свечение — три кольца
      g.fillStyle(0x00F5D4, 0.15);
      g.fillCircle(0, 0, 15);
      g.fillStyle(0x00F5D4, 0.06);
      g.fillCircle(0, 0, 25);
      // Третье кольцо — amber оттенок
      g.fillStyle(0xFFB800, 0.04);
      g.fillCircle(0, 0, 35);
    }
  }

  highlightAnchor(anchor, active) {
    const c = anchor._container;
    if (!c) return;
    c.setScale(active ? 1.2 : 1);
    this.drawButcherHook(c.list[0], active);
  }

  destroy() {
    for (const anchor of this.anchors) {
      if (anchor._container) anchor._container.destroy();
      anchor.destroy();
    }
    this.anchors.length = 0;
  }
}
