import Phaser from 'phaser';
import { ANCHOR_SPACING_Y, GROUND_Y, SPAWN_Y, OBSTACLE_START_HEIGHT, OBSTACLE_CHANCE, OBSTACLE_HIT_RADIUS, Z } from '../constants.js';

// Менеджер жуков-препятствий — Neon Western палитра
export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];          // [{container, x, y, type, hit}]
    this.highestObstacleY = SPAWN_Y;
    this.W = scene.W;
  }

  create() {
    // Ничего на старте — жуки появляются от OBSTACLE_START_HEIGHT
  }

  // Генерировать жуков до targetY (вызывается из GameScene вместе с anchorMgr)
  generateUpTo(targetY, anchors) {
    const startY = GROUND_Y - OBSTACLE_START_HEIGHT * 10;

    while (this.highestObstacleY - ANCHOR_SPACING_Y > targetY) {
      this.highestObstacleY -= ANCHOR_SPACING_Y;

      // Только выше стартовой высоты
      if (this.highestObstacleY > startY) continue;

      // Шанс спавна
      if (Math.random() > OBSTACLE_CHANCE) continue;

      // X: рандом, но минимум 40px от ближайшего якоря на этом уровне
      let x = Phaser.Math.Between(40, this.W - 40);
      // Проверяем расстояние до якорей на похожей высоте
      for (const a of anchors) {
        if (Math.abs(a.y - this.highestObstacleY) < ANCHOR_SPACING_Y * 0.5) {
          if (Math.abs(a.x - x) < 40) {
            x = a.x > this.W / 2 ? Phaser.Math.Between(40, this.W / 2 - 40) : Phaser.Math.Between(this.W / 2 + 40, this.W - 40);
          }
        }
      }

      this.addObstacle(x, this.highestObstacleY + Phaser.Math.Between(-30, 30));
    }
  }

  addObstacle(x, y) {
    const type = Phaser.Math.Between(0, 3); // 0=beetle, 1=spider, 2=scorpion, 3=firefly
    const container = this.scene.add.container(x, y).setDepth(Z.OBSTACLES);
    const gfx = this.scene.add.graphics();
    this.drawBug(gfx, type);
    container.add(gfx);

    this.active.push({ container, x, y, type, hit: false, baseY: y });
  }

  drawBug(gfx, type) {
    gfx.clear();
    switch (type) {
      case 0: this._drawBeetle(gfx); break;
      case 1: this._drawSpider(gfx); break;
      case 2: this._drawScorpion(gfx); break;
      case 3: this._drawFirefly(gfx); break;
    }
  }

  // Beetle: neon pink тело, cyan глаза
  _drawBeetle(gfx) {
    // Тело — neon pink
    gfx.fillStyle(0xFF2E63, 0.8);
    gfx.fillEllipse(0, 0, 20, 14);
    // Разделительная линия на панцире
    gfx.lineStyle(1, 0xA01040, 0.6);
    gfx.lineBetween(0, -7, 0, 7);
    // Голова
    gfx.fillStyle(0xCC1850, 0.9);
    gfx.fillCircle(0, -10, 5);
    // Рожки
    gfx.lineStyle(1.5, 0xFF2E63, 0.8);
    gfx.lineBetween(-2, -14, -5, -20);
    gfx.lineBetween(2, -14, 5, -20);
    // Лапки (3 пары)
    gfx.lineStyle(1, 0xCC1850, 0.7);
    for (let i = 0; i < 3; i++) {
      const ly = -4 + i * 5;
      gfx.lineBetween(-10, ly, -16, ly - 3);
      gfx.lineBetween(10, ly, 16, ly - 3);
    }
    // Глаза — neon cyan
    gfx.fillStyle(0x00F5D4, 0.8);
    gfx.fillCircle(-3, -11, 1.5);
    gfx.fillCircle(3, -11, 1.5);
  }

  // Spider: тёмное тело, cyan нитка, pink узор и глаза
  _drawSpider(gfx) {
    // Нитка вверх — neon cyan
    gfx.lineStyle(0.8, 0x00F5D4, 0.3);
    gfx.lineBetween(0, -8, 0, -30);
    // Тело — тёмный purple
    gfx.fillStyle(0x1A0520, 0.9);
    gfx.fillCircle(0, 0, 8);
    // Брюшко
    gfx.fillStyle(0x120318, 0.9);
    gfx.fillEllipse(0, 8, 10, 12);
    // Узор на спине — neon pink крест
    gfx.lineStyle(1, 0xFF2E63, 0.5);
    gfx.lineBetween(-3, 5, 3, 11);
    gfx.lineBetween(3, 5, -3, 11);
    // 8 лапок (4 пары, изогнутые)
    gfx.lineStyle(1, 0x2A0830, 0.8);
    const legAngles = [-0.8, -0.4, 0.2, 0.6];
    for (const angle of legAngles) {
      const ly = angle * 10;
      // Левая лапка — два сегмента
      gfx.lineBetween(-8, ly, -16, ly - 6);
      gfx.lineBetween(-16, ly - 6, -20, ly + 2);
      // Правая
      gfx.lineBetween(8, ly, 16, ly - 6);
      gfx.lineBetween(16, ly - 6, 20, ly + 2);
    }
    // Глаза — neon pink
    gfx.fillStyle(0xFF2E63, 0.7);
    gfx.fillCircle(-3, -5, 1);
    gfx.fillCircle(3, -5, 1);
    gfx.fillCircle(-2, -3, 0.8);
    gfx.fillCircle(2, -3, 0.8);
  }

  // Scorpion: тёмный purple тело, pink клешни, amber жало
  _drawScorpion(gfx) {
    // Тело — тёмный purple
    gfx.fillStyle(0x2A0830, 0.9);
    gfx.fillEllipse(0, 0, 24, 10);
    // Голова
    gfx.fillStyle(0x1E0620, 0.9);
    gfx.fillEllipse(-14, 0, 8, 7);
    // Клешни — neon pink
    gfx.lineStyle(1.5, 0xFF2E63, 0.8);
    // Левая клешня
    gfx.lineBetween(-18, -2, -24, -8);
    gfx.lineBetween(-24, -8, -20, -12);
    gfx.lineBetween(-24, -8, -28, -10);
    // Правая клешня (зеркально по Y-оси -> вниз)
    gfx.lineBetween(-18, 2, -24, 8);
    gfx.lineBetween(-24, 8, -20, 12);
    gfx.lineBetween(-24, 8, -28, 10);
    // Хвост — 4 сегмента загибающиеся вверх
    gfx.lineStyle(2, 0x2A0830, 0.8);
    gfx.lineBetween(12, 0, 18, -3);
    gfx.lineBetween(18, -3, 22, -8);
    gfx.lineBetween(22, -8, 24, -14);
    // Жало — neon amber
    gfx.fillStyle(0xFFB800, 0.8);
    gfx.fillTriangle(23, -14, 25, -14, 24, -20);
    // Лапки (4 пары)
    gfx.lineStyle(0.8, 0x1E0620, 0.6);
    for (let i = 0; i < 4; i++) {
      const lx = -8 + i * 6;
      gfx.lineBetween(lx, -5, lx - 2, -10);
      gfx.lineBetween(lx, 5, lx - 2, 10);
    }
    // Глаза — neon amber
    gfx.fillStyle(0xFFB800, 0.7);
    gfx.fillCircle(-16, -2, 1);
    gfx.fillCircle(-16, 2, 1);
  }

  // Firefly: cyan свечение вместо orange
  _drawFirefly(gfx) {
    // Свечение — neon cyan (будет пульсировать в update)
    gfx.fillStyle(0x00F5D4, 0.15);
    gfx.fillCircle(0, 0, 16);
    gfx.fillStyle(0x00F5D4, 0.08);
    gfx.fillCircle(0, 0, 24);
    // Тело — очень тёмный
    gfx.fillStyle(0x0E0A18, 0.9);
    gfx.fillEllipse(0, 0, 8, 6);
    // Крылья
    gfx.fillStyle(0x4A4040, 0.3);
    gfx.fillEllipse(-5, -2, 8, 4);
    gfx.fillEllipse(5, -2, 8, 4);
    // Светящийся хвост — neon cyan
    gfx.fillStyle(0x00F5D4, 0.9);
    gfx.fillCircle(0, 4, 3);
    gfx.fillStyle(0x00F5D4, 0.6);
    gfx.fillCircle(0, 4, 5);
  }

  // Обновление: покачивание + проверка коллизий
  update(delta, playerY) {
    const time = this.scene.time.now;

    // Покачивание жуков
    for (const obs of this.active) {
      if (obs.hit) continue;
      const sway = Math.sin(time * 0.003 + obs.x * 0.1) * 3;
      obs.container.setY(obs.baseY + sway);

      // Firefly — пульсация glow каждые ~10 кадров
      if (obs.type === 3 && Math.floor(time / 160) % 10 === 0) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.005 + obs.x);
        obs.container.setAlpha(0.7 + pulse * 0.3);
      }
    }

    // Cleanup: далеко ниже игрока ИЛИ уже hit (destroyed)
    for (let i = this.active.length - 1; i >= 0; i--) {
      const obs = this.active[i];
      if (obs.hit || obs.baseY > playerY + 3000) {
        if (!obs.hit && obs.container) obs.container.destroy();
        this.active.splice(i, 1);
      }
    }
  }

  // Проверка коллизии с игроком — вызывается из GameScene
  checkCollision(playerX, playerY) {
    for (const obs of this.active) {
      if (obs.hit) continue;
      const dist = Phaser.Math.Distance.Between(playerX, playerY, obs.x, obs.container.y);
      if (dist < OBSTACLE_HIT_RADIUS) {
        obs.hit = true;
        // Визуальный фидбек — мигание и fade
        this.scene.tweens.add({
          targets: obs.container,
          alpha: 0,
          duration: 300,
          onComplete: () => obs.container.destroy(),
        });
        return true; // столкновение!
      }
    }
    return false;
  }

  destroy() {
    for (const obs of this.active) {
      obs.container.destroy();
    }
    this.active = [];
  }
}
