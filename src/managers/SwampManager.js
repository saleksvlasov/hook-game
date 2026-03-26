import { between } from '../engine/math.js';
import { GROUND_Y } from '../constants.js';
import { ObjectPool } from './ObjectPool.js';

// Менеджер болота + пузыри с object pool
// Canvas 2D API вместо Phaser Graphics
export class SwampManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.pool = new ObjectPool(
      () => ({ x: 0, y: 0, size: 0, life: 0, maxLife: 0, speed: 0 }),
      (b) => { b.life = 0; }
    );
    // Генерируем "текстуру" пола один раз
    this._floorRects = [];
  }

  create() {
    const W = this.scene.W;
    // Предгенерируем рандомные прямоугольники для пола
    const sx = -W * 2;
    const sw = W * 5;
    for (let x = sx; x < sx + sw; x += 8) {
      const h = 1 + Math.random() * 3;
      this._floorRects.push({ x, h, alpha: 0.1 + Math.random() * 0.1 });
    }
  }

  update(delta) {
    const W = this.scene.W;

    // Спавн новых пузырей
    if (Math.random() < 0.03) {
      const b = this.pool.acquire();
      b.x = between(20, W - 20);
      b.y = GROUND_Y - 10;
      b.size = 1.5 + Math.random() * 3;
      const lifetime = 800 + Math.random() * 1200;
      b.life = lifetime;
      b.maxLife = lifetime;
      b.speed = 5 + Math.random() * 12;
      this.active.push(b);
    }

    // Обновляем пузыри
    let writeIdx = 0;
    for (let i = 0; i < this.active.length; i++) {
      const b = this.active[i];
      b.life -= delta;
      b.y -= b.speed * delta / 1000;
      b.x += Math.sin(b.life * 0.005) * 0.3;
      if (b.life <= 0) {
        this.pool.release(b);
        continue;
      }
      this.active[writeIdx++] = b;
    }
    this.active.length = writeIdx;

    // Жёсткий лимит (write-pointer, без splice)
    if (this.active.length > 20) {
      const excess = this.active.length - 20;
      for (let i = 0; i < excess; i++) {
        this.pool.release(this.active[i]);
      }
      for (let i = 0; i < 20; i++) {
        this.active[i] = this.active[i + excess];
      }
      this.active.length = 20;
    }
  }

  // Отрисовка болота и пузырей
  draw(ctx) {
    const W = this.scene.W;
    const sx = -W * 2;
    const sw = W * 5;

    // Визуал литейного пола
    ctx.fillStyle = '#0a0c10';
    ctx.globalAlpha = 1;
    ctx.fillRect(sx, GROUND_Y - 10, sw, 30);

    ctx.fillStyle = '#15171c';
    ctx.globalAlpha = 0.9;
    ctx.fillRect(sx, GROUND_Y - 16, sw, 6);

    ctx.fillStyle = '#2a1a10';
    ctx.globalAlpha = 0.3;
    ctx.fillRect(sx, GROUND_Y - 14, sw, 4);

    // Рандомные прямоугольники текстуры
    ctx.fillStyle = '#2A3050';
    for (const r of this._floorRects) {
      ctx.globalAlpha = r.alpha;
      ctx.fillRect(r.x, GROUND_Y - 16 - r.h, 6, r.h);
    }

    // Пузыри
    for (let i = 0; i < this.active.length; i++) {
      const b = this.active[i];
      const frac = b.life / b.maxLife;
      const alpha = frac * 0.25;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#4A3020';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size * frac, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
  }

  reset() {
    for (const b of this.active) this.pool.release(b);
    this.active.length = 0;
  }

  destroy() {
    this.reset();
    this.pool.clear();
  }
}
