import { getActiveSkin } from '../storage.js';
import { SKINS, drawSkinPose } from './SkinRenderer.js';

// ===== NEON WESTERN ПАЛИТРА =====
const NEON_CYAN = 0x00F5D4;

/**
 * Анимация охотника на маятнике в главном меню.
 * Вынесено из MenuScene для декомпозиции.
 */
export class MenuHunter {
  constructor(scene) {
    this.scene = scene;
    this.swing = null;
    this.container = null;
    this.hookGfx = null;
    this.ropeGfx = null;
  }

  /** Создать охотника, крюк и верёвку */
  create() {
    const s = this.scene;
    const anchorX = s.W / 2;
    const anchorY = s.H * 0.35;
    const ropeLen = 120;

    this.hookGfx = s.add.graphics().setDepth(5);
    this.container = s.add.container(anchorX, anchorY + ropeLen).setDepth(6);
    const g = s.add.graphics();
    this._drawHunter(g);
    this.container.add(g);
    this.ropeGfx = s.add.graphics().setDepth(4);
    this.swing = { angle: Math.PI / 2, speed: 0.8, anchorX, anchorY, ropeLen };
  }

  /** Перерисовать охотника (при смене скина) */
  redraw(skinIndex) {
    if (!this.container || !this.container.list[0]) return;
    const gfx = this.container.list[0];
    gfx.clear();
    drawSkinPose(gfx, skinIndex, 0);
  }

  /** Обновление маятника — вызывать из scene.update() */
  update(time, delta) {
    if (!this.swing) return;
    const sw = this.swing;
    const dt = delta / 1000;

    // Физика маятника
    const angularAccel = (400 / sw.ropeLen) * Math.cos(sw.angle);
    sw.speed += angularAccel * dt;
    sw.speed *= 0.998;
    sw.angle += sw.speed * dt;

    const px = sw.anchorX + Math.cos(sw.angle) * sw.ropeLen;
    const py = sw.anchorY + Math.sin(sw.angle) * sw.ropeLen;

    this.container.setPosition(px, py);
    this.container.setRotation((sw.angle - Math.PI / 2) * 0.35);
    this._drawHook(sw.anchorX, sw.anchorY);

    // Верёвка — Bézier, neon cyan
    this.ropeGfx.clear();
    const midX = (sw.anchorX + px) / 2;
    const midY = (sw.anchorY + py) / 2;
    const cpX = midX + (py - sw.anchorY) * 0.06;
    const cpY = midY + sw.ropeLen * 0.06;
    this.ropeGfx.lineStyle(2.5, NEON_CYAN, 0.5);
    this.ropeGfx.beginPath();
    this.ropeGfx.moveTo(sw.anchorX, sw.anchorY);
    for (let i = 1; i <= 16; i++) {
      const tt = i / 16;
      const it = 1 - tt;
      this.ropeGfx.lineTo(
        it * it * sw.anchorX + 2 * it * tt * cpX + tt * tt * px,
        it * it * sw.anchorY + 2 * it * tt * cpY + tt * tt * py,
      );
    }
    this.ropeGfx.strokePath();
  }

  /** Получить контейнер (для stagger-анимации) */
  getContainer() {
    return this.container;
  }

  /** Cleanup */
  destroy() {
    if (this.hookGfx) { this.hookGfx.destroy(); this.hookGfx = null; }
    if (this.ropeGfx) { this.ropeGfx.destroy(); this.ropeGfx = null; }
    if (this.container) { this.container.destroy(); this.container = null; }
    this.swing = null;
  }

  // --- Приватные ---

  _drawHunter(g) {
    const skinIdx = SKINS.findIndex(sk => sk.id === getActiveSkin());
    drawSkinPose(g, skinIdx >= 0 ? skinIdx : 0, 0);
  }

  _drawHook(x, y) {
    this.hookGfx.clear();
    const g = this.hookGfx;
    // Крюк — neon cyan
    g.lineStyle(3, NEON_CYAN, 0.6);
    g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x, y - 4); g.strokePath();
    g.lineStyle(3, NEON_CYAN, 0.5);
    g.beginPath(); g.arc(x + 6, y - 4, 6, Math.PI, 0, true); g.strokePath();
    g.beginPath(); g.arc(x - 4, y + 8, 5, 0, Math.PI, true); g.strokePath();
    g.fillStyle(NEON_CYAN, 0.7);
    g.fillTriangle(x - 9, y + 8, x - 8, y + 14, x - 5, y + 8);
  }
}
