import { between } from '../engine/math.js';
import { distance } from '../engine/math.js';
import { seek, flee, wander, arrive, contain, applyForce } from '../engine/Steering.js';
import {
  ANCHOR_SPACING_Y, GROUND_Y, SPAWN_Y,
  OBSTACLE_START_HEIGHT, OBSTACLE_CHANCE, OBSTACLE_HIT_RADIUS,
  HEART_PICKUP_CHANCE, HEART_PICKUP_MIN_HEIGHT,
  HEART_PICKUP_MIN_DISTANCE, HEART_PICKUP_RADIUS,
  STEERING,
} from '../constants.js';
import { drawBug } from './BugRenderer.js';

// Менеджер жуков-препятствий + пикапы сердец
// Canvas 2D API, Steering Behaviors (Craig Reynolds)
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
      // Steering — скорость и wander angle
      vx: 0, vy: 0,
      maxSpeed: 0, maxForce: 0,
      wanderAngle: seed % (Math.PI * 2),
      // Spider patrol — массив целевых точек
      patrolTargets: null,
      patrolIdx: 0,
    };

    // Инициализация steering параметров по типу
    switch (type) {
      case 0: { // Beetle — wander + contain
        const s = STEERING.beetle;
        obs.maxSpeed = s.maxSpeed;
        obs.maxForce = s.maxForce;
        break;
      }
      case 1: { // Spider — patrol arrive между точками
        const s = STEERING.spider;
        obs.maxSpeed = s.maxSpeed;
        obs.maxForce = s.maxForce;
        // Генерируем патрульные точки вокруг базы
        obs.patrolTargets = [];
        for (let i = 0; i < s.patrolPoints; i++) {
          const angle = (i / s.patrolPoints) * Math.PI * 2 + seed;
          obs.patrolTargets.push({
            x: x + Math.cos(angle) * s.patrolRadiusX,
            y: y + Math.sin(angle) * s.patrolRadiusY,
          });
        }
        break;
      }
      case 2: { // Scorpion — wander + flee от игрока
        const s = STEERING.scorpion;
        obs.maxSpeed = s.maxSpeed;
        obs.maxForce = s.maxForce;
        break;
      }
      case 3: { // Firefly — wander (высокий jitter)
        const s = STEERING.firefly;
        obs.maxSpeed = s.maxSpeed;
        obs.maxForce = s.maxForce;
        break;
      }
    }

    this.active.push(obs);
  }

  // Обновление: steering behaviors + cleanup
  update(delta, playerY, playerX) {
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

      // Пропускаем далёкие — экономим CPU
      if (obs.baseY < visTop || obs.baseY > visBot) continue;

      // Heart pickup — мягкая вертикальная пульсация (без steering)
      if (obs.type === 4) {
        obs.y = obs.baseY + Math.sin(time * obs.mSpeed + obs.mPhase) * obs.mRadiusY;
        obs.alpha = 0.7 + 0.3 * Math.sin(time * 0.004 + obs.mPhase);
        continue;
      }

      // --- Steering behaviors по типу ---
      let fx = 0, fy = 0;

      switch (obs.type) {
        case 0: { // Beetle — wander + contain
          const s = STEERING.beetle;
          const [wx, wy] = wander(obs, s.wanderRadius, s.wanderDist, s.wanderJitter);
          const [cx, cy] = contain(obs, obs.baseX, obs.baseY, s.containRadiusX, s.containRadiusY);
          fx = wx + cx;
          fy = wy + cy;
          break;
        }
        case 1: { // Spider — patrol arrive
          const s = STEERING.spider;
          const target = obs.patrolTargets[obs.patrolIdx];
          const [ax, ay] = arrive(obs, target.x, target.y, s.arriveSlowRadius);
          fx = ax;
          fy = ay;
          // Переключаем цель когда достаточно близко
          const dx = target.x - obs.x;
          const dy = target.y - obs.y;
          if (dx * dx + dy * dy < 16) { // < 4px
            obs.patrolIdx = (obs.patrolIdx + 1) % obs.patrolTargets.length;
          }
          // Мягкий contain на всякий случай
          const [cx, cy] = contain(obs, obs.baseX, obs.baseY, s.containRadiusX, s.containRadiusY);
          fx += cx;
          fy += cy;
          break;
        }
        case 2: { // Scorpion — wander + flee от игрока
          const s = STEERING.scorpion;
          const [wx, wy] = wander(obs, s.wanderRadius, s.wanderDist, s.wanderJitter);
          // Flee от игрока если он рядом
          const px = playerX !== undefined ? playerX : obs.baseX;
          const [flx, fly] = flee(obs, px, playerY, s.fleeRadius);
          const [cx, cy] = contain(obs, obs.baseX, obs.baseY, s.containRadiusX, s.containRadiusY);
          fx = wx * s.wanderWeight + flx * s.fleeWeight + cx;
          fy = wy * s.wanderWeight + fly * s.fleeWeight + cy;
          break;
        }
        case 3: { // Firefly — wander хаотичный + contain
          const s = STEERING.firefly;
          const [wx, wy] = wander(obs, s.wanderRadius, s.wanderDist, s.wanderJitter);
          const [cx, cy] = contain(obs, obs.baseX, obs.baseY, s.containRadiusX, s.containRadiusY);
          fx = wx + cx;
          fy = wy + cy;
          // Пульсация альфы
          const pulse = 0.5 + 0.5 * Math.sin(time * 0.005 + obs.baseX);
          obs.alpha = 0.7 + pulse * 0.3;
          break;
        }
      }

      applyForce(obs, fx, fy, delta);
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
  checkCollision(playerX, playerY, hitRadius = OBSTACLE_HIT_RADIUS) {
    for (const obs of this.active) {
      if (obs.hit || obs.type === 4) continue;
      const dist = distance(playerX, playerY, obs.x, obs.y);
      if (dist < hitRadius) {
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
  draw(ctx, armorRadius = 0) {
    const cam = this.scene.camera;
    const top = cam.scrollY - 50;
    const bot = cam.scrollY + this.scene.H + 50;
    const showShield = armorRadius > 0 && armorRadius < OBSTACLE_HIT_RADIUS;
    const shieldAlpha = showShield
      ? 0.15 + 0.10 * Math.sin(performance.now() * 0.004)
      : 0;
    for (const obs of this.active) {
      if (obs.alpha <= 0) continue;
      if (obs.y < top || obs.y > bot) continue;
      ctx.save();
      ctx.translate(obs.x, obs.y);
      ctx.globalAlpha = obs.alpha;
      drawBug(ctx, obs.type);
      // Shield ring — показываем уменьшенный радиус коллизии
      if (showShield && obs.type !== 4) {
        ctx.globalAlpha = shieldAlpha;
        ctx.strokeStyle = '#00F5D4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, armorRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // Soft reset для inline restart — очистка без пересоздания менеджера
  reset() {
    this.active.length = 0;
    this.highestObstacleY = SPAWN_Y;
    this.lastHeartPickupY = Infinity;
  }

  destroy() {
    this.active = [];
  }
}
