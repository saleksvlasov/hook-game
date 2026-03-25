import Phaser from 'phaser';
import { ANCHOR_SPACING_Y, GROUND_Y, SPAWN_Y, OBSTACLE_START_HEIGHT, OBSTACLE_CHANCE, OBSTACLE_HIT_RADIUS, Z } from '../constants.js';
import { drawBug } from './BugRenderer.js';

// Менеджер жуков-препятствий — спавн, коллизии, cleanup
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
    drawBug(gfx, type);
    container.add(gfx);

    this.active.push({ container, x, y, type, hit: false, baseY: y });
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
