import Phaser from 'phaser';
import { ANCHOR_SPACING_Y, GROUND_Y, SPAWN_Y, OBSTACLE_START_HEIGHT, OBSTACLE_CHANCE, OBSTACLE_HIT_RADIUS, Z } from '../constants.js';

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

  // Beetle: овальное тело + 6 лапок + рожки
  _drawBeetle(gfx) {
    // Тело — тёмно-бурый овал
    gfx.fillStyle(0x5A2020, 0.9);
    gfx.fillEllipse(0, 0, 20, 14);
    // Разделительная линия на панцире
    gfx.lineStyle(1, 0x3A1010, 0.6);
    gfx.lineBetween(0, -7, 0, 7);
    // Голова
    gfx.fillStyle(0x4A1818, 0.9);
    gfx.fillCircle(0, -10, 5);
    // Рожки
    gfx.lineStyle(1.5, 0x6A3020, 0.8);
    gfx.lineBetween(-2, -14, -5, -20);
    gfx.lineBetween(2, -14, 5, -20);
    // Лапки (3 пары)
    gfx.lineStyle(1, 0x4A2018, 0.7);
    for (let i = 0; i < 3; i++) {
      const ly = -4 + i * 5;
      gfx.lineBetween(-10, ly, -16, ly - 3);
      gfx.lineBetween(10, ly, 16, ly - 3);
    }
    // Глаза — amber
    gfx.fillStyle(0xF0A030, 0.8);
    gfx.fillCircle(-3, -11, 1.5);
    gfx.fillCircle(3, -11, 1.5);
  }

  // Spider: круглое тело + 8 лапок + нитка
  _drawSpider(gfx) {
    // Нитка вверх
    gfx.lineStyle(0.8, 0x888888, 0.4);
    gfx.lineBetween(0, -8, 0, -30);
    // Тело
    gfx.fillStyle(0x3A2020, 0.9);
    gfx.fillCircle(0, 0, 8);
    // Брюшко
    gfx.fillStyle(0x2A1515, 0.9);
    gfx.fillEllipse(0, 8, 10, 12);
    // Узор на спине — красный крест
    gfx.lineStyle(1, 0x8B2020, 0.5);
    gfx.lineBetween(-3, 5, 3, 11);
    gfx.lineBetween(3, 5, -3, 11);
    // 8 лапок (4 пары, изогнутые)
    gfx.lineStyle(1, 0x3A1818, 0.8);
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
    // Глаза (8 штук, 2 ряда)
    gfx.fillStyle(0xCC4444, 0.7);
    gfx.fillCircle(-3, -5, 1);
    gfx.fillCircle(3, -5, 1);
    gfx.fillCircle(-2, -3, 0.8);
    gfx.fillCircle(2, -3, 0.8);
  }

  // Scorpion: вытянутое тело + клешни + хвост
  _drawScorpion(gfx) {
    // Тело
    gfx.fillStyle(0x4A3020, 0.9);
    gfx.fillEllipse(0, 0, 24, 10);
    // Голова
    gfx.fillStyle(0x3A2518, 0.9);
    gfx.fillEllipse(-14, 0, 8, 7);
    // Клешни
    gfx.lineStyle(1.5, 0x5A3828, 0.8);
    // Левая клешня
    gfx.lineBetween(-18, -2, -24, -8);
    gfx.lineBetween(-24, -8, -20, -12);
    gfx.lineBetween(-24, -8, -28, -10);
    // Правая клешня (зеркально по Y-оси → вниз)
    gfx.lineBetween(-18, 2, -24, 8);
    gfx.lineBetween(-24, 8, -20, 12);
    gfx.lineBetween(-24, 8, -28, 10);
    // Хвост — 4 сегмента загибающиеся вверх
    gfx.lineStyle(2, 0x5A3020, 0.8);
    gfx.lineBetween(12, 0, 18, -3);
    gfx.lineBetween(18, -3, 22, -8);
    gfx.lineBetween(22, -8, 24, -14);
    // Жало
    gfx.fillStyle(0xC41E3A, 0.8);
    gfx.fillTriangle(23, -14, 25, -14, 24, -20);
    // Лапки (4 пары)
    gfx.lineStyle(0.8, 0x3A2018, 0.6);
    for (let i = 0; i < 4; i++) {
      const lx = -8 + i * 6;
      gfx.lineBetween(lx, -5, lx - 2, -10);
      gfx.lineBetween(lx, 5, lx - 2, 10);
    }
    // Глаза
    gfx.fillStyle(0xF0A030, 0.7);
    gfx.fillCircle(-16, -2, 1);
    gfx.fillCircle(-16, 2, 1);
  }

  // Firefly: маленький с пульсирующим свечением
  _drawFirefly(gfx) {
    // Свечение (будет пульсировать в update)
    gfx.fillStyle(0xFF6B35, 0.15);
    gfx.fillCircle(0, 0, 16);
    gfx.fillStyle(0xFF6B35, 0.08);
    gfx.fillCircle(0, 0, 24);
    // Тело
    gfx.fillStyle(0x2A2020, 0.9);
    gfx.fillEllipse(0, 0, 8, 6);
    // Крылья
    gfx.fillStyle(0x4A4040, 0.3);
    gfx.fillEllipse(-5, -2, 8, 4);
    gfx.fillEllipse(5, -2, 8, 4);
    // Светящийся хвост
    gfx.fillStyle(0xFF6B35, 0.9);
    gfx.fillCircle(0, 4, 3);
    gfx.fillStyle(0xFFAA60, 0.6);
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

      // Firefly — пульсация glow (перерисовка каждые ~10 кадров для экономии)
      if (obs.type === 3 && Math.floor(time / 160) % 1 === 0) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.005 + obs.x);
        obs.container.setAlpha(0.7 + pulse * 0.3);
      }
    }

    // Cleanup далеко ниже игрока
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (this.active[i].baseY > playerY + 3000) {
        this.active[i].container.destroy();
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
