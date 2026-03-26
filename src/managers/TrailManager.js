import { TRAIL_SPEED_THRESHOLD } from '../constants.js';
import { ObjectPool } from './ObjectPool.js';

// Менеджер trail-частиц — неоновый cyan→pink градиент
// Canvas 2D API вместо Phaser Graphics
export class TrailManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.pool = new ObjectPool(
      () => ({ x: 0, y: 0, life: 0, maxLife: 0, size: 0 }),
      (p) => { p.life = 0; }
    );
  }

  create() {
    // Ничего — всё рисуется в draw()
  }

  update(delta, playerX, playerY, effectiveSpeed) {
    // Спавн новых частиц при быстром движении
    if (effectiveSpeed > TRAIL_SPEED_THRESHOLD) {
      const p = this.pool.acquire();
      p.x = playerX + (Math.random() - 0.5) * 6;
      p.y = playerY + (Math.random() - 0.5) * 6;
      p.life = 400;
      p.maxLife = 400;
      p.size = Math.min(5, 1.5 + effectiveSpeed / 250);
      this.active.push(p);
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

    // Жёсткий лимит
    if (this.active.length > 80) {
      for (let i = 0; i < this.active.length - 80; i++) {
        this.pool.release(this.active[i]);
      }
      this.active.splice(0, this.active.length - 80);
    }
  }

  // Отрисовка trail-частиц
  draw(ctx) {
    for (let i = 0; i < this.active.length; i++) {
      const p = this.active[i];
      const frac = p.life / p.maxLife;
      const alpha = frac * 0.8;
      const size = p.size * frac;
      // Neon: cyan → pink градиент при затухании
      const r = Math.floor(0 + 255 * (1 - frac));
      const g = Math.floor(245 * frac);
      const b = Math.floor(212 * frac + 100 * (1 - frac));

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
