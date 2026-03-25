import Phaser from 'phaser';
import { GOLD_HEX, HUNTER_BODY, HUNTER_FACE, BG_DARK_HEX, RUST } from '../constants.js';

// Рендер охотника — неоновый силуэт с cyan свечением
export class HunterRenderer {
  constructor(scene) {
    this.scene = scene;
    this.graphics = null;
    this.coatTime = 0;
  }

  create(playerContainer) {
    this.graphics = this.scene.add.graphics();
    this.drawPose(this.graphics, 0);
    playerContainer.add(this.graphics);
  }

  // Обновление анимации: rotation и coat sway
  updateAnimation(delta, playerContainer, vx, vy, swingSpeed, swingAngle, isHooked) {
    this.coatTime += delta * 0.005;

    // Наклон охотника
    if (!isHooked) {
      const targetRot = Phaser.Math.Clamp(vx / 600, -0.4, 0.4);
      playerContainer.rotation += (targetRot - playerContainer.rotation) * 0.1;
    } else {
      const targetRot = (swingAngle - Math.PI / 2) * 0.3;
      playerContainer.rotation += (targetRot - playerContainer.rotation) * 0.15;
    }

    // Интенсивность анимации пальто от скорости
    const speed = Math.sqrt(vx * vx + vy * vy);
    const swingContrib = isHooked ? Math.abs(swingSpeed) * 3 : 0;
    const coatIntensity = Math.min(1, (speed + swingContrib * 100) / 400);
    this.drawPose(this.graphics, this.coatTime * (1 + coatIntensity * 2));
  }

  drawPose(g, coatAngle) {
    g.clear();

    // Неоновый cyan outline — охотник светится на тёмном фоне
    g.lineStyle(2, 0x00F5D4, 0.5);
    g.strokeRoundedRect(-10, -24, 20, 50, 3);

    // Пальто полы (анимация ветра)
    g.fillStyle(HUNTER_BODY);
    const coatSway = Math.sin(coatAngle) * 4;
    g.fillTriangle(-9, 10, -14 + coatSway, 26, -3, 24);
    g.fillTriangle(9, 10, 14 + coatSway, 26, 3, 24);

    // Тело — тёмный силуэт (deep purple)
    g.fillStyle(HUNTER_BODY);
    g.fillRoundedRect(-8, -2, 16, 18, 2);

    // Пояс + пряжка (neon amber)
    g.fillStyle(RUST);
    g.fillRect(-8, 8, 16, 2);
    g.fillStyle(0xFFB800, 0.8);
    g.fillRect(-2, 7, 4, 4);

    // Шляпа — поля neon amber
    g.fillStyle(0xFFB800, 0.8);
    g.fillEllipse(0, -12, 28, 7);
    // Тулья — тёмный силуэт
    g.fillStyle(HUNTER_BODY);
    g.fillRoundedRect(-7, -22, 14, 12, 2);
    // Лента — neon cyan
    g.fillStyle(0x00F5D4);
    g.fillRect(-7, -13, 14, 2);

    // Лицо — светло-бежевое
    g.fillStyle(HUNTER_FACE);
    g.fillRect(-4, -10, 8, 5);
    // Глаза — тёмный фон
    g.fillStyle(BG_DARK_HEX);
    g.fillCircle(-2, -8, 1);
    g.fillCircle(2, -8, 1);

    // Руки — тёмный силуэт
    g.fillStyle(HUNTER_BODY);
    g.fillRect(-12, 0, 4, 11);
    g.fillRect(8, 0, 4, 11);
    // Кисти — полупрозрачные
    g.fillStyle(HUNTER_FACE, 0.5);
    g.fillRect(-12, 10, 4, 3);
    g.fillRect(8, 10, 4, 3);

    // Ноги — очень тёмный purple
    g.fillStyle(0x0E0A18);
    g.fillRect(-6, 16, 5, 8);
    g.fillRect(1, 16, 5, 8);

    // Сапоги — чуть светлее
    g.fillStyle(0x151020);
    g.fillRect(-7, 22, 6, 4);
    g.fillRect(1, 22, 6, 4);
  }

  destroy() {
    if (this.graphics) this.graphics.destroy();
  }
}
