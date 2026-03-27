// Рендер верёвки — Bezier кривая с неоновым cyan свечением
// Canvas 2D API вместо Phaser Graphics
export class RopeRenderer {
  // Приватные поля
  #visible = false;
  #ax = 0;
  #ay = 0;
  #px = 0;
  #py = 0;
  #ropeLength = 0;

  constructor(scene) {
    this.scene = scene;
  }

  create() {
    // Ничего — всё рисуется в draw()
  }

  // Запомнить данные для отрисовки (вызывается из GameScene)
  setPoints(ax, ay, px, py, ropeLength) {
    this.#visible = true;
    this.#ax = ax; this.#ay = ay;
    this.#px = px; this.#py = py;
    this.#ropeLength = ropeLength;
  }

  clear() {
    this.#visible = false;
  }

  draw(ctx) {
    if (!this.#visible) return;

    const ax = this.#ax, ay = this.#ay;
    const px = this.#px, py = this.#py;
    const ropeLength = this.#ropeLength;

    const midX = (ax + px) / 2;
    const midY = (ay + py) / 2;
    const sagX = (py - ay) * 0.08;
    const sagY = ropeLength * 0.08;
    const cpX = midX + sagX;
    const cpY = midY + sagY;

    // Тень
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    this.#bezier(ctx, ax + 1, ay + 2, cpX + 1, cpY + 2, px + 1, py + 2);

    // Основная верёвка — neon cyan
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#00F5D4';
    ctx.lineWidth = 2.5;
    this.#bezier(ctx, ax, ay, cpX, cpY, px, py);

    // Highlight — холодный белый блик
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#E0F0FF';
    ctx.lineWidth = 1;
    this.#bezier(ctx, ax, ay - 1, cpX, cpY - 1, px, py - 1);

    ctx.globalAlpha = 1;
  }

  #bezier(ctx, x1, y1, cx, cy, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    // Квадратичная Безье
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();
  }

  destroy() {
    // Ничего — нет Phaser объектов
  }
}
