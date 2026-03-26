import { between } from '../engine/math.js';
import { distance } from '../engine/math.js';
import {
  ANCHOR_SPACING_Y, GROUND_Y, SPAWN_Y,
  OBSTACLE_START_HEIGHT, OBSTACLE_CHANCE, OBSTACLE_HIT_RADIUS,
  HEART_PICKUP_CHANCE, HEART_PICKUP_MIN_HEIGHT,
  HEART_PICKUP_MIN_DISTANCE, HEART_PICKUP_RADIUS,
} from '../constants.js';
import { drawBug } from './BugRenderer.js';

// Менеджер жуков-препятствий + пикапы сердец
// Canvas 2D API вместо Phaser Graphics + Container
export class ObstacleManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.highestObstacleY = SPAWN_Y;
    this.W = scene.W;
    this.lastHeartPickupY = Infinity; // Y последнего пикапа сердца
  }

  create() {
    // Ничего на старте — жуки появляются от OBSTACLE_START_HEIGHT
  }

  // Генерировать жуков до targetY
  generateUpTo(targetY, anchors) {
    const startY = GROUND_Y - OBSTACLE_START_HEIGHT * 10;
    const heartStartY = GROUND_Y - HEART_PICKUP_MIN_HEIGHT * 10;

    while (this.highestObstacleY - ANCHOR_SPACING_Y > targetY) {
      this.highestObstacleY -= ANCHOR_SPACING_Y;

      // Heart pickup — type 4 (отдельно от жуков)
      if (this.highestObstacleY < heartStartY
          && Math.abs(this.highestObstacleY - this.lastHeartPickupY) > HEART_PICKUP_MIN_DISTANCE
          && Math.random() < HEART_PICKUP_CHANCE) {
        const hx = between(60, this.W - 60);
        const seed = hx * 3.7 + this.highestObstacleY * 1.3;
        this.active.push({
          x: hx, y: this.highestObstacleY, type: 4, hit: false,
          baseX: hx, baseY: this.highestObstacleY,
          alpha: 1, fadeOut: false, fadeLife: 0,
          mPhase: seed % (Math.PI * 2), mSpeed: 0.003,
          mRadiusX: 0, mRadiusY: 8,
        });
        this.lastHeartPickupY = this.highestObstacleY;
      }

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
    const seed = x * 7.31 + y * 3.17;
    const obs = {
      x, y, type, hit: false, baseX: x, baseY: y,
      alpha: 1, fadeOut: false, fadeLife: 0,
      // Движение — pre-computed параметры по типу
      mPhase: seed % (Math.PI * 2),
      mSpeed: 0, mRadiusX: 0, mRadiusY: 0,
    };
    switch (type) {
      case 0: // Beetle — горизонтальный патруль
        obs.mSpeed = 0.0008 + (seed % 100) / 100 * 0.0006;
        obs.mRadiusX = 35 + (seed % 50) / 50 * 25;
        obs.mRadiusY = 3;
        break;
      case 1: // Spider — вертикальный drop/climb
        obs.mSpeed = 0.0015 + (seed % 100) / 100 * 0.001;
        obs.mRadiusX = 4;
        obs.mRadiusY = 30 + (seed % 50) / 50 * 30;
        break;
      case 2: // Scorpion — диагональные рывки с паузами
        obs.mSpeed = 0.004;
        obs.mRadiusX = 40;
        obs.mRadiusY = 30;
        break;
      case 3: // Firefly — фигура-8 / лемниската
        obs.mSpeed = 0.002 + (seed % 100) / 100 * 0.001;
        obs.mRadiusX = 30 + (seed % 40) / 40 * 20;
        obs.mRadiusY = 20 + (seed % 40) / 40 * 15;
        break;
    }
    this.active.push(obs);
  }

  // Обновление: движение по типу + cleanup
  update(delta, playerY) {
    const time = this.scene.time.now;
    // Viewport culling — обновляем только видимых (±800px от игрока)
    const visTop = playerY - 800;
    const visBot = playerY + 800;

    for (const obs of this.active) {
      // Fade out анимация для попавших
      if (obs.fadeOut) {
        obs.fadeLife -= delta;
        obs.alpha = Math.max(0, obs.fadeLife / 300);
        continue;
      }
      if (obs.hit) continue;

      // Пропускаем далёкие — экономим trig
      if (obs.baseY < visTop || obs.baseY > visBot) continue;

      // Heart pickup — мягкая вертикальная пульсация
      if (obs.type === 4) {
        obs.y = obs.baseY + Math.sin(time * obs.mSpeed + obs.mPhase) * obs.mRadiusY;
        obs.alpha = 0.7 + 0.3 * Math.sin(time * 0.004 + obs.mPhase);
        continue;
      }

      // Движение жуков по типу
      const phase = obs.mPhase;
      switch (obs.type) {
        case 0: { // Beetle — горизонтальный патруль + лёгкий bob
          obs.x = obs.baseX + Math.sin(time * obs.mSpeed + phase) * obs.mRadiusX;
          obs.y = obs.baseY + Math.sin(time * obs.mSpeed * 2.3 + phase) * obs.mRadiusY;
          break;
        }
        case 1: { // Spider — асимметричный drop/climb
          const cycle = ((time * obs.mSpeed + phase) % (Math.PI * 2)) / (Math.PI * 2);
          let yOffset;
          if (cycle < 0.6) {
            yOffset = (cycle / 0.6) * obs.mRadiusY; // медленный спуск
          } else {
            yOffset = (1 - (cycle - 0.6) / 0.4) * obs.mRadiusY; // быстрый подъём
          }
          obs.y = obs.baseY + yOffset;
          obs.x = obs.baseX + Math.sin(time * 0.001 + phase) * obs.mRadiusX;
          break;
        }
        case 2: { // Scorpion — dash-pause (golden angle)
          const dashCycle = Math.floor((time + phase * 1000) / 1500);
          const dashT = ((time + phase * 1000) % 1500) / 1500;
          const prevAngle = dashCycle * 2.39996;
          const nextAngle = (dashCycle + 1) * 2.39996;
          if (dashT < 0.3) {
            // пауза — стоит на месте
            obs.x = obs.baseX + Math.cos(prevAngle) * obs.mRadiusX;
            obs.y = obs.baseY + Math.sin(prevAngle) * obs.mRadiusY;
          } else {
            // рывок — smoothstep интерполяция
            const lerpT = (dashT - 0.3) / 0.7;
            const eased = lerpT * lerpT * (3 - 2 * lerpT);
            obs.x = obs.baseX + (Math.cos(prevAngle) * (1 - eased) + Math.cos(nextAngle) * eased) * obs.mRadiusX;
            obs.y = obs.baseY + (Math.sin(prevAngle) * (1 - eased) + Math.sin(nextAngle) * eased) * obs.mRadiusY;
          }
          break;
        }
        case 3: { // Firefly — фигура-8
          const ft = time * obs.mSpeed + phase;
          obs.x = obs.baseX + Math.sin(ft) * obs.mRadiusX;
          obs.y = obs.baseY + Math.sin(ft * 2) * obs.mRadiusY;
          const pulse = 0.5 + 0.5 * Math.sin(time * 0.005 + obs.baseX);
          obs.alpha = 0.7 + pulse * 0.3;
          break;
        }
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

  // Проверка коллизии с жуками (skip type 4 = сердца)
  checkCollision(playerX, playerY) {
    for (const obs of this.active) {
      if (obs.hit || obs.type === 4) continue;
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

  // Проверка подбора сердца
  checkHeartPickup(playerX, playerY) {
    for (const obs of this.active) {
      if (obs.type !== 4 || obs.hit) continue;
      if (Math.abs(obs.baseY - playerY) > 200) continue;
      const dist = distance(playerX, playerY, obs.x, obs.y);
      if (dist < HEART_PICKUP_RADIUS) {
        obs.hit = true;
        obs.fadeOut = true;
        obs.fadeLife = 300;
        return true;
      }
    }
    return false;
  }

  // Отрисовка — только видимые
  draw(ctx) {
    const cam = this.scene.camera;
    const top = cam.scrollY - 50;
    const bot = cam.scrollY + this.scene.H + 50;
    for (const obs of this.active) {
      if (obs.alpha <= 0) continue;
      if (obs.y < top || obs.y > bot) continue;
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
