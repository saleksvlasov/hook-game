import { between, distance } from '../engine/math.js';
import {
  GROUND_Y, SPAWN_Y, ANCHOR_SPACING_Y,
  PERK_PICKUPS, PERK_PICKUP_START_HEIGHT, PERK_PICKUP_RADIUS,
} from '../constants.js';

// Roguelite пикапы перков — спавнятся рядом с крюками, подбираются на раунд
// При смерти — сброс всех раундовых уровней
export class PerkPickupManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.#highestY = SPAWN_Y;
    this.#lastPickupY = {};
  }

  // Приватные поля
  #highestY;
  #lastPickupY;

  create() {
    this.#highestY = SPAWN_Y;
    this.#lastPickupY = {};
  }

  // Генерировать пикапы до targetY
  generateUpTo(targetY, anchors) {
    const startY = GROUND_Y - PERK_PICKUP_START_HEIGHT * 10;

    while (this.#highestY - ANCHOR_SPACING_Y > targetY) {
      this.#highestY -= ANCHOR_SPACING_Y;
      if (this.#highestY > startY) continue;

      for (const [id, cfg] of Object.entries(PERK_PICKUPS)) {
        if (Math.random() > cfg.chance) continue;

        // Проверка минимальной дистанции между пикапами одного типа
        const lastY = this.#lastPickupY[id] ?? Infinity;
        if (Math.abs(this.#highestY - lastY) < cfg.minDistance) continue;

        // X — рядом с якорем если есть на этом уровне, иначе рандом
        let x = between(50, this.scene.W - 50);
        for (const a of (anchors || [])) {
          if (Math.abs(a.y - this.#highestY) < ANCHOR_SPACING_Y * 0.4) {
            const side = Math.random() > 0.5 ? 1 : -1;
            x = a.x + side * between(60, 80);
            x = Math.max(40, Math.min(this.scene.W - 40, x));
            break;
          }
        }

        const seed = x * 3.14 + this.#highestY * 2.71;
        this.active.push({
          id,
          x, y: this.#highestY,
          baseX: x, baseY: this.#highestY,
          phase: seed % (Math.PI * 2),
          hit: false,
          fadeOut: false,
          fadeLife: 0,
          alpha: 1,
        });

        this.#lastPickupY[id] = this.#highestY;
      }
    }
  }

  // Обновление анимации (float bob + pulse)
  update(delta, playerY) {
    const time = this.scene.time.now;
    const visTop = playerY - 800;
    const visBot = playerY + 800;

    let w = 0;
    for (let i = 0; i < this.active.length; i++) {
      const p = this.active[i];

      // Cleanup
      if (p.fadeOut && p.fadeLife <= 0) continue;
      if (!p.hit && !p.fadeOut && p.baseY > playerY + 3000) continue;
      this.active[w++] = p;

      if (p.fadeOut) {
        p.fadeLife -= delta;
        p.alpha = Math.max(0, p.fadeLife / 300);
        continue;
      }
      if (p.baseY < visTop || p.baseY > visBot) continue;

      // Float bob
      p.y = p.baseY + Math.sin(time * 0.002 + p.phase) * 6;
      p.alpha = 0.7 + 0.3 * Math.sin(time * 0.004 + p.phase);
    }
    this.active.length = w;
  }

  // Проверка подбора (возвращает id перка или null)
  checkPickup(playerX, playerY) {
    for (const p of this.active) {
      if (p.hit || p.fadeOut) continue;
      if (Math.abs(p.baseY - playerY) > 300) continue;
      if (distance(playerX, playerY, p.x, p.y) < PERK_PICKUP_RADIUS) {
        p.hit = true;
        p.fadeOut = true;
        p.fadeLife = 400;
        return p.id;
      }
    }
    return null;
  }

  // Отрисовка
  draw(ctx) {
    const cam = this.scene.camera;
    const top = cam.scrollY - 60;
    const bot = cam.scrollY + this.scene.H + 60;
    const time = this.scene.time.now;

    for (const p of this.active) {
      if (p.baseY < top || p.baseY > bot) continue;
      if (p.alpha <= 0) continue;

      const cfg = PERK_PICKUPS[p.id];
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);

      // Glow circle
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 18);
      grad.addColorStop(0, cfg.color + '55');
      grad.addColorStop(1, cfg.color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // Border circle
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 2;
      ctx.shadowColor = cfg.color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Icon label
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = cfg.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cfg.label, 0, 0);

      ctx.restore();
    }
  }

  // Soft reset — очистка для нового раунда
  reset() {
    this.active.length = 0;
    this.#highestY = SPAWN_Y;
    this.#lastPickupY = {};
  }

  destroy() {
    this.active.length = 0;
  }
}
