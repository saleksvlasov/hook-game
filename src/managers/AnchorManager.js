import Phaser from 'phaser';
import { ANCHOR_SPACING_Y, SPAWN_Y, GOLD_HEX, RUST, EMBER_HEX, AMBER_GLOW, Z } from '../constants.js';

// Менеджер якорей — процедурная генерация, отрисовка, cleanup
export class AnchorManager {
  constructor(scene) {
    this.scene = scene;
    this.anchors = [];
    this.anchorContainers = [];
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
        if (this.anchorContainers[i]) {
          this.anchorContainers.splice(i, 1);
        }
      }
    }
  }

  addAnchor(x, y) {
    const c = this.scene.add.container(x, y).setDepth(Z.ANCHORS);
    const g = this.scene.add.graphics();
    this.drawButcherHook(g, false);
    c.add(g);
    this.anchorContainers.push(c);

    const dot = this.scene.add.circle(x, y, 12, 0xffffff, 0).setDepth(Z.ANCHORS);
    dot._container = c;
    this.anchors.push(dot);
  }

  drawButcherHook(g, active) {
    g.clear();

    // Стержень крепления
    g.fillStyle(active ? GOLD_HEX : RUST);
    g.fillRect(-2, -22, 4, 12);

    // S-образный крюк — золотой для видимости
    const hookColor = active ? 0xFFB84D : GOLD_HEX;
    g.lineStyle(3.5, hookColor, active ? 1 : 0.7);
    g.beginPath();
    g.arc(6, -10, 7, Math.PI, 0, true);
    g.strokePath();
    g.beginPath();
    g.arc(-4, 3, 8, 0, Math.PI, true);
    g.strokePath();
    g.lineStyle(3, hookColor, active ? 1 : 0.7);
    g.lineBetween(6, -3, -4, 3);

    // Остриё
    g.fillStyle(active ? 0xFFB84D : GOLD_HEX, 0.8);
    g.fillTriangle(-12, 3, -11, 10, -7, 4);

    // Ржавые пятна
    g.fillStyle(RUST, 0.2);
    g.fillCircle(4, -6, 2);
    g.fillCircle(-6, 5, 1.5);

    if (active) {
      // Тёплое янтарное свечение
      g.fillStyle(AMBER_GLOW, 0.12);
      g.fillCircle(0, 0, 15);
      g.fillStyle(AMBER_GLOW, 0.05);
      g.fillCircle(0, 0, 25);
      // Второе кольцо — ember feel
      g.fillStyle(EMBER_HEX, 0.04);
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
    this.anchorContainers.length = 0;
  }
}
