import { between } from '../engine/math.js';
import { distance } from '../engine/math.js';
import { ANCHOR_SPACING_Y, GROUND_Y, SPAWN_Y, OBSTACLE_START_HEIGHT, OBSTACLE_CHANCE, OBSTACLE_HIT_RADIUS } from '../constants.js';
import { drawBug } from './BugRenderer.js';

// Менеджер жуков-препятствий — спавн, коллизии, cleanup
// Canvas 2D API вместо Phaser Graphics + Container
export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];          // [{x, y, type, hit, baseY, alpha, fadeOut}]
    this.highestObstacleY = SPAWN_Y;
    this.W = scene.W;
  }

  create() {
    // Ничего на старте — жуки появляются от OBSTACLE_START_HEIGHT
  }

  // Генерировать жуков до targetY
  generateUpTo(targetY, anchors) {
    const startY = GROUND_Y - OBSTACLE_START_HEIGHT * 10;

    while (this.highestObstacleY - ANCHOR_SPACING_Y > targetY) {
      this.highestObstacleY -= ANCHOR_SPACING_Y;

      if (this.highestObstacleY > startY) continue;
      if (Math.random() > OBSTACLE_CHANCE) continue;

      // X: рандом, но минимум 40px от ближайшего якоря на этом уровне
      let x = between(40, this.W - 40);
      for (const a of anchors) {
        if (Math.abs(a.y - this.highestObstacleY) < ANCHOR_SPACING_Y * 0.5) {
          if (Math.abs(a.x - x) < 40) {
            x = a.x > this.W / 2 ? between(40, this.W / 2 - 40) : between(this.W / 2 + 40, this.W - 40);
          }
        }
      }

      this.addObstacle(x, this.highestObstacleY + between(-30, 30));
    }
  }

  addObstacle(x, y) {
    const type = between(0, 3); // 0=beetle, 1=spider, 2=scorpion, 3=firefly
    this.active.push({ x, y, type, hit: false, baseY: y, alpha: 1, fadeOut: false, fadeLife: 0 });
  }

  // Обновление: покачивание + cleanup
  update(delta, playerY) {
    const time = this.scene.time.now;

    for (const obs of this.active) {
      // Fade out анимация для попавших жуков
      if (obs.fadeOut) {
        obs.fadeLife -= delta;
        obs.alpha = Math.max(0, obs.fadeLife / 300);
        continue;
      }
      if (obs.hit) continue;

      const sway = Math.sin(time * 0.003 + obs.x * 0.1) * 3;
      obs.y = obs.baseY + sway;

      // Firefly — плавная пульсация
      if (obs.type === 3) {
        const pulse = 0.5 + 0.5 * Math.sin(time * 0.005 + obs.x);
        obs.alpha = 0.7 + pulse * 0.3;
      }
    }

    // Cleanup
    let writeIdx = 0;
    for (let i = 0; i < this.active.length; i++) {
      const obs = this.active[i];
      if ((obs.fadeOut && obs.fadeLife <= 0) || (!obs.hit && !obs.fadeOut && obs.baseY > playerY + 3000)) {
        continue;
      }
      this.active[writeIdx++] = obs;
    }
    this.active.length = writeIdx;
  }

  // Проверка коллизии с игроком
  checkCollision(playerX, playerY) {
    for (const obs of this.active) {
      if (obs.hit) continue;
      const dist = distance(playerX, playerY, obs.x, obs.y);
      if (dist < OBSTACLE_HIT_RADIUS) {
        obs.hit = true;
        obs.fadeOut = true;
        obs.fadeLife = 300;
        return true;
      }
    }
    return false;
  }

  // Отрисовка всех жуков
  draw(ctx) {
    for (const obs of this.active) {
      if (obs.alpha <= 0) continue;
      ctx.save();
      ctx.translate(obs.x, obs.y);
      ctx.globalAlpha = obs.alpha;
      drawBug(ctx, obs.type);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  destroy() {
    this.active = [];
  }
}
