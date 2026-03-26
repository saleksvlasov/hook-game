import { between, clamp } from '../engine/math.js';
import { ANCHOR_SPACING_Y, HOOK_RANGE, SPAWN_Y } from '../constants.js';

// Менеджер якорей — процедурная генерация, отрисовка, cleanup
// Canvas 2D API вместо Phaser Graphics + Container
export class AnchorManager {
  constructor(scene) {
    this.scene = scene;
    this.anchors = [];    // [{x, y, highlighted}]
    this.highestAnchorY = SPAWN_Y - 120;
    this.prevAnchorX = scene.W / 2;
  }

  create() {
    this.addAnchor(
      this.scene.W / 2 + between(-60, 60),
      this.highestAnchorY
    );
    // Генерируем на 3000px вверх от спавна
    this.generateAnchorsUpTo(SPAWN_Y - 3000);
  }

  // Процедурная генерация — добавляет якоря вверх до targetY
  generateAnchorsUpTo(targetY) {
    const maxDeltaX = Math.sqrt(HOOK_RANGE * HOOK_RANGE * 0.72 - ANCHOR_SPACING_Y * ANCHOR_SPACING_Y);

    while (this.highestAnchorY - ANCHOR_SPACING_Y > targetY) {
      this.highestAnchorY -= ANCHOR_SPACING_Y;
      let x;
      do {
        x = between(60, this.scene.W - 60);
      } while (Math.abs(x - this.prevAnchorX) < this.scene.W * 0.15);

      // Ограничение разброса
      const deltaX = x - this.prevAnchorX;
      if (Math.abs(deltaX) > maxDeltaX) {
        x = this.prevAnchorX + Math.sign(deltaX) * maxDeltaX + between(-20, 20);
        x = clamp(x, 60, this.scene.W - 60);
      }

      this.prevAnchorX = x;
      this.addAnchor(x, this.highestAnchorY);
    }
  }

  // Удаление якорей далеко ниже игрока (>3000px)
  cleanup(playerY) {
    const cutoff = playerY + 3000;
    let w = 0;
    for (let i = 0; i < this.anchors.length; i++) {
      if (this.anchors[i].y <= cutoff) {
        this.anchors[w++] = this.anchors[i];
      }
    }
    this.anchors.length = w;
  }

  addAnchor(x, y) {
    this.anchors.push({ x, y, highlighted: false, scale: 1 });
  }

  highlightAnchor(anchor, active) {
    anchor.highlighted = active;
    anchor.scale = active ? 1.2 : 1;
  }

  // Отрисовка всех якорей — вызывается из GameScene.update()
  draw(ctx) {
    for (const a of this.anchors) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.scale(a.scale, a.scale);
      this._drawButcherHook(ctx, a.highlighted);
      ctx.restore();
    }
  }

  _drawButcherHook(ctx, active) {
    // Стержень — тёмная сталь
    ctx.fillStyle = '#2A3050';
    ctx.globalAlpha = 1;
    ctx.fillRect(-2, -22, 4, 12);

    // S-образный крюк — cyan (неактив) / amber (актив)
    const hookColor = active ? '#FFB800' : '#00F5D4';
    const hookAlpha = active ? 1 : 0.7;
    ctx.globalAlpha = hookAlpha;
    ctx.strokeStyle = hookColor;
    ctx.lineWidth = 3.5;

    ctx.beginPath();
    ctx.arc(6, -10, 7, Math.PI, 0, true);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-4, 3, 8, 0, Math.PI, true);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, -3);
    ctx.lineTo(-4, 3);
    ctx.stroke();

    // Остриё
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = hookColor;
    ctx.beginPath();
    ctx.moveTo(-12, 3);
    ctx.lineTo(-11, 10);
    ctx.lineTo(-7, 4);
    ctx.closePath();
    ctx.fill();

    // Неоновая ржавчина — pink пятна
    ctx.fillStyle = '#FF2E63';
    ctx.globalAlpha = 0.1;
    ctx.beginPath(); ctx.arc(4, -6, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-6, 5, 1.5, 0, Math.PI * 2); ctx.fill();

    if (active) {
      // Cyan свечение — три кольца
      ctx.fillStyle = '#00F5D4';
      ctx.globalAlpha = 0.15;
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.06;
      ctx.beginPath(); ctx.arc(0, 0, 25, 0, Math.PI * 2); ctx.fill();
      // Третье кольцо — amber
      ctx.fillStyle = '#FFB800';
      ctx.globalAlpha = 0.04;
      ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2); ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  // Самый нижний якорь
  getLowestY() {
    let maxY = 0;
    for (const a of this.anchors) {
      if (a.y > maxY) maxY = a.y;
    }
    return maxY;
  }

  destroy() {
    this.anchors.length = 0;
  }
}
