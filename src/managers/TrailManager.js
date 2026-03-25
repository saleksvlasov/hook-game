import Phaser from 'phaser';
import { TRAIL_SPEED_THRESHOLD, Z } from '../constants.js';
import { ObjectPool } from './ObjectPool.js';

// Менеджер trail-частиц — неоновый cyan→pink градиент
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
      p.y -= delta * 0.01; // частицы всплывают вверх
      if (p.life <= 0) {
        this.pool.release(p);
        continue;
      }
      const frac = p.life / p.maxLife;
      const alpha = frac * 0.8; // Ярче чем было (0.7→0.8)
      const size = p.size * frac;
      // Neon: cyan → pink градиент при затухании
      const r = Math.floor(0 + 255 * (1 - frac));    // 0 → 255 (pink)
      const g = Math.floor(245 * frac);                // 245 → 0 (cyan green)
      const b = Math.floor(212 * frac + 100 * (1 - frac)); // 212 → 100
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
