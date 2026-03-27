// Рендер верёвки — Bezier кривая с неоновым cyan свечением
// Power Arc: толщина, glow и цвет зависят от тира
export class RopeRenderer {
  // Приватные поля
  #visible = false;
  #ax = 0;
  #ay = 0;
  #px = 0;
  #py = 0;
  #ropeLength = 0;

  // Tier params (defaults = novice)
  #ropeWidth = 2.5;
  #ropeGlow = 0;

  constructor(scene) {
    this.scene = scene;
  }

  create() {
    // Ничего — всё рисуется в draw()
  }

  // Установить параметры Power Arc тира
  setTierParams(tierData) {
    this.#ropeWidth = tierData.ropeWidth;
    this.#ropeGlow = tierData.ropeGlow;
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
    ctx.lineWidth = this.#ropeWidth + 1.5;
    this.#bezier(ctx, ax + 1, ay + 2, cpX + 1, cpY + 2, px + 1, py + 2);

    // Glow (тиры 1+)
    if (this.#ropeGlow > 0) {
      let glowAlpha = this.#ropeGlow * 0.4;
      // Master+: пульсация
      if (this.#ropeGlow >= 0.5) {
        glowAlpha *= 0.85 + 0.15 * Math.sin(performance.now() * 0.005);
      }
      ctx.globalAlpha = glowAlpha;
      ctx.strokeStyle = '#00F5D4';
      ctx.lineWidth = this.#ropeWidth + 6;
      this.#bezier(ctx, ax, ay, cpX, cpY, px, py);
    }

    // Основная верёвка — neon cyan
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#00F5D4';
    ctx.lineWidth = this.#ropeWidth;
    this.#bezier(ctx, ax, ay, cpX, cpY, px, py);

    // Legend: золотой highlight
    if (this.#ropeGlow >= 0.8) {
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#FFB800';
      ctx.lineWidth = this.#ropeWidth - 0.5;
      this.#bezier(ctx, ax, ay, cpX, cpY, px, py);
    }

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
