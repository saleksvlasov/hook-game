import Phaser from 'phaser';
import { TRAIL_SPEED_THRESHOLD, Z } from '../constants.js';
import { ObjectPool } from './ObjectPool.js';

// Менеджер trail-частиц (ember) с object pool
export class TrailManager {
  constructor(scene) {
    this.scene = scene;
    this.active = [];      // Активные частицы
    this.graphics = null;
    this.pool = new ObjectPool(
      () => ({ x: 0, y: 0, life: 0, maxLife: 0, size: 0 }),
      (p) => { p.life = 0; }
    );
  }

  create() {
    this.graphics = this.scene.add.graphics().setDepth(Z.TRAIL);
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

    this.graphics.clear();

    // Обновляем живые частицы, мёртвые возвращаем в пул
    let writeIdx = 0;
    for (let i = 0; i < this.active.length; i++) {
      const p = this.active[i];
      p.life -= delta;
      p.y -= delta * 0.01; // embers float up
      if (p.life <= 0) {
        this.pool.release(p);
        continue;
      }
      const frac = p.life / p.maxLife;
      const alpha = frac * 0.7;
      const size = p.size * frac;
      // Ember: bright orange → dark red → fade
      const r = Math.floor(255 * frac);
      const g = Math.floor(120 * frac * frac);
      const b = Math.floor(30 * frac * frac * frac);
      const hex = Phaser.Display.Color.GetColor(r, g, b);
      this.graphics.fillStyle(hex, alpha);
      this.graphics.fillCircle(p.x, p.y, size);
      this.active[writeIdx++] = p;
    }
    this.active.length = writeIdx;

    // Жёсткий лимит на случай всплеска
    if (this.active.length > 80) {
      for (let i = 0; i < this.active.length - 80; i++) {
        this.pool.release(this.active[i]);
      }
      this.active.splice(0, this.active.length - 80);
    }
  }

  reset() {
    for (const p of this.active) this.pool.release(p);
    this.active.length = 0;
    if (this.graphics) this.graphics.clear();
  }

  destroy() {
    this.reset();
    this.pool.clear();
    if (this.graphics) this.graphics.destroy();
  }
}
