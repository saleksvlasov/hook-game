import { Z } from '../constants.js';

// Рендер верёвки — Bezier кривая с неоновым cyan свечением
export class RopeRenderer {
  constructor(scene) {
    this.scene = scene;
    this.graphics = null;
  }

  create() {
    this.graphics = this.scene.add.graphics().setDepth(Z.ROPE);
  }

  draw(ax, ay, px, py, ropeLength) {
    this.graphics.clear();

    const midX = (ax + px) / 2;
    const midY = (ay + py) / 2;
    const sagX = (py - ay) * 0.08;
    const sagY = ropeLength * 0.08;
    const cpX = midX + sagX;
    const cpY = midY + sagY;

    // Тень
    this.graphics.lineStyle(4, 0x000000, 0.3);
    this._bezier(this.graphics, ax + 1, ay + 2, cpX + 1, cpY + 2, px + 1, py + 2);

    // Основная верёвка — neon cyan
    this.graphics.lineStyle(2.5, 0x00F5D4, 0.7);
    this._bezier(this.graphics, ax, ay, cpX, cpY, px, py);

    // Highlight — холодный белый блик
    this.graphics.lineStyle(1, 0xE0F0FF, 0.25);
    this._bezier(this.graphics, ax, ay - 1, cpX, cpY - 1, px, py - 1);
  }

  clear() {
    if (this.graphics) this.graphics.clear();
  }

  _bezier(gfx, x1, y1, cx, cy, x2, y2) {
    const steps = 20;
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const it = 1 - t;
      gfx.lineTo(
        it * it * x1 + 2 * it * t * cx + t * t * x2,
        it * it * y1 + 2 * it * t * cy + t * t * y2
      );
    }
    gfx.strokePath();
  }

  destroy() {
    if (this.graphics) this.graphics.destroy();
  }
}
