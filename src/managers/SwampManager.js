import Phaser from 'phaser';
import { GROUND_Y, STEEL, Z } from '../constants.js';
import { ObjectPool } from './ObjectPool.js';

// Менеджер болота + пузыри с object pool
export class SwampManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];
    this.graphics = null;
    this.pool = new ObjectPool(
      () => ({ x: 0, y: 0, size: 0, life: 0, maxLife: 0, speed: 0 }),
      (b) => { b.life = 0; }
    );
  }

  create() {
    const W = this.scene.W;

    // Визуал литейного пола
    const gfx = this.scene.add.graphics().setDepth(Z.SWAMP);
    const sx = -W * 2;
    const sw = W * 5;
    gfx.fillStyle(0x0a0c10);
    gfx.fillRect(sx, GROUND_Y - 10, sw, 30);
    gfx.fillStyle(0x15171c, 0.9);
    gfx.fillRect(sx, GROUND_Y - 16, sw, 6);
    gfx.fillStyle(0x2a1a10, 0.3);
    gfx.fillRect(sx, GROUND_Y - 14, sw, 4);
    for (let x = sx; x < sx + sw; x += 8) {
      const h = 1 + Math.random() * 3;
      gfx.fillStyle(STEEL, 0.1 + Math.random() * 0.1);
      gfx.fillRect(x, GROUND_Y - 16 - h, 6, h);
    }

    // Графика для пузырей
    this.graphics = this.scene.add.graphics().setDepth(Z.SWAMP_BUBBLES);
  }

  update(delta) {
    const W = this.scene.W;

    // Спавн новых пузырей
    if (Math.random() < 0.03) {
      const b = this.pool.acquire();
      b.x = Phaser.Math.Between(20, W - 20);
      b.y = GROUND_Y - 10;
      b.size = 1.5 + Math.random() * 3;
      const lifetime = 800 + Math.random() * 1200;
      b.life = lifetime;
      b.maxLife = lifetime;
      b.speed = 5 + Math.random() * 12;
      this.active.push(b);
    }

    this.graphics.clear();

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
      const frac = b.life / b.maxLife;
      const alpha = frac * 0.25;
      this.graphics.lineStyle(1, 0x4A3020, alpha);
      this.graphics.strokeCircle(b.x, b.y, b.size * frac);
      this.active[writeIdx++] = b;
    }
    this.active.length = writeIdx;

    // Жёсткий лимит
    if (this.active.length > 20) {
      for (let i = 0; i < this.active.length - 20; i++) {
        this.pool.release(this.active[i]);
      }
      this.active.splice(0, this.active.length - 20);
    }
  }

  reset() {
    for (const b of this.active) this.pool.release(b);
    this.active.length = 0;
    if (this.graphics) this.graphics.clear();
  }

  destroy() {
    this.reset();
    this.pool.clear();
    if (this.graphics) this.graphics.destroy();
  }
}
