// Рендер верёвки — Bezier кривая с неоновым cyan свечением
// Canvas 2D API вместо Phaser Graphics
export class RopeRenderer {
  constructor(scene) {
    this.scene = scene;
    this._visible = false;
    this._ax = 0; this._ay = 0;
    this._px = 0; this._py = 0;
    this._ropeLength = 0;
  }

  create() {
    // Ничего — всё рисуется в draw()
  }

  // Запомнить данные для отрисовки (вызывается из GameScene)
  setPoints(ax, ay, px, py, ropeLength) {
    this._visible = true;
    this._ax = ax; this._ay = ay;
    this._px = px; this._py = py;
    this._ropeLength = ropeLength;
  }

  clear() {
    this._visible = false;
  }

  draw(ctx) {
    if (!this._visible) return;

    const ax = this._ax, ay = this._ay;
    const px = this._px, py = this._py;
    const ropeLength = this._ropeLength;

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
    this._bezier(ctx, ax + 1, ay + 2, cpX + 1, cpY + 2, px + 1, py + 2);

    // Основная верёвка — neon cyan
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#00F5D4';
    ctx.lineWidth = 2.5;
    this._bezier(ctx, ax, ay, cpX, cpY, px, py);

    // Highlight — холодный белый блик
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = '#E0F0FF';
    ctx.lineWidth = 1;
    this._bezier(ctx, ax, ay - 1, cpX, cpY - 1, px, py - 1);

    ctx.globalAlpha = 1;
  }

  _bezier(ctx, x1, y1, cx, cy, x2, y2) {
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
