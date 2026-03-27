import { TRAIL_SPEED_THRESHOLD } from '../constants.js';
import { ObjectPool } from './ObjectPool.js';

// Менеджер trail-частиц — неоновый cyan→pink градиент
// Power Arc: размер, spawn rate и цвет зависят от тира
export class TrailManager {
  // Tier params (defaults = novice)
  #sizeMult = 1.0;
  #spawnMult = 1.0;
  #tierGlow = 0; // 0 = no outer glow, >0 = legend glow

  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.pool = new ObjectPool(
      () => ({ x: 0, y: 0, life: 0, maxLife: 0, size: 0, amber: false }),
      (p) => { p.life = 0; p.amber = false; }
    );
  }

  create() {
    // Ничего — всё рисуется в draw()
  }

  // Установить параметры Power Arc тира
  setTierParams(tierData) {
    this.#sizeMult = tierData.trailSizeMult;
    this.#spawnMult = tierData.trailSpawnMult;
    this.#tierGlow = tierData.hunterGlow; // reuse glow threshold for outer glow
  }

  update(delta, playerX, playerY, effectiveSpeed) {
    // Спавн новых частиц при быстром движении
    if (effectiveSpeed > TRAIL_SPEED_THRESHOLD) {
      const spawnCount = Math.min(3, Math.floor(this.#spawnMult));
      for (let s = 0; s < spawnCount; s++) {
        const p = this.pool.acquire();
        p.x = playerX + (Math.random() - 0.5) * 6;
        p.y = playerY + (Math.random() - 0.5) * 6;
        p.life = 400;
        p.maxLife = 400;
        p.size = Math.min(5, 1.5 + effectiveSpeed / 250) * this.#sizeMult;
        // Journeyman+: часть частиц amber
        p.amber = this.#spawnMult >= 1.6 && Math.random() < 0.3;
        this.active.push(p);
      }
    }

    // Обновляем живые частицы, мёртвые возвращаем в пул
    let writeIdx = 0;
    for (let i = 0; i < this.active.length; i++) {
      const p = this.active[i];
      p.life -= delta;
      p.y -= delta * 0.01; // частицы всплывают вверх
      if (p.life <= 0) {
        this.pool.release(p);
        continue;
      }
      this.active[writeIdx++] = p;
    }
    this.active.length = writeIdx;

    // Жёсткий лимит — масштабируется с тиром, cap 200
    const maxParticles = Math.min(200, Math.ceil(80 * this.#spawnMult));
    if (this.active.length > maxParticles) {
      const excess = this.active.length - maxParticles;
      for (let i = 0; i < excess; i++) {
        this.pool.release(this.active[i]);
      }
      for (let i = 0; i < maxParticles; i++) {
        this.active[i] = this.active[i + excess];
      }
      this.active.length = maxParticles;
    }
  }

  // Отрисовка trail-частиц
  draw(ctx) {
    for (let i = 0; i < this.active.length; i++) {
      const p = this.active[i];
      const frac = p.life / p.maxLife;
      const alpha = frac * 0.8;
      const size = p.size * frac;

      let r, g, b;
      if (p.amber) {
        // Amber частицы: gold → orange при затухании
        r = 255;
        g = Math.floor(184 * frac + 107 * (1 - frac));
        b = Math.floor(53 * (1 - frac));
      } else {
        // Neon: cyan → pink градиент при затухании
        r = Math.floor(0 + 255 * (1 - frac));
        g = Math.floor(245 * frac);
        b = Math.floor(212 * frac + 100 * (1 - frac));
      }

      // Legend: outer glow за частицей
      if (this.#tierGlow >= 0.7) {
        ctx.globalAlpha = alpha * 0.2;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size * 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  reset() {
    for (const p of this.active) this.pool.release(p);
    this.active.length = 0;
  }

  destroy() {
    this.reset();
    this.pool.clear();
  }
}
