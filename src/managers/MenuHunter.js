import { profile } from '../data/index.js';
import { SKINS, drawSkinPose } from './SkinRenderer.js';

/**
 * Анимация охотника на маятнике в главном меню.
 * Canvas 2D API вместо Phaser Graphics + Container.
 */
export class MenuHunter {
  constructor(scene) {
    this.scene = scene;
    this.swing = null;
    this._skinIndex = 0;
    this._alpha = 1;
    this._visible = true;
  }

  create() {
    const anchorX = this.scene.W / 2;
    const anchorY = this.scene.H * 0.35;
    const ropeLen = 120;

    this._skinIndex = Math.max(0, SKINS.findIndex(sk => sk.id === profile.activeSkin));
    this.swing = { angle: Math.PI / 2, speed: 0.8, anchorX, anchorY, ropeLen };
  }

  redraw(skinIndex) {
    this._skinIndex = skinIndex;
  }

  setAlpha(alpha) { this._alpha = alpha; }
  setVisible(v) { this._visible = v; }
  getY() { return this.swing ? this.swing.anchorY + this.swing.ropeLen : 0; }

  update(time, delta) {
    if (!this.swing) return;
    const sw = this.swing;
    const dt = delta / 1000;

    // Физика маятника
    const angularAccel = (400 / sw.ropeLen) * Math.cos(sw.angle);
    sw.speed += angularAccel * dt;
    sw.speed *= 0.998;
    sw.angle += sw.speed * dt;
  }

  draw(ctx) {
    if (!this.swing || !this._visible) return;
    const sw = this.swing;

    const px = sw.anchorX + Math.cos(sw.angle) * sw.ropeLen;
    const py = sw.anchorY + Math.sin(sw.angle) * sw.ropeLen;

    ctx.save();
    ctx.globalAlpha = this._alpha;

    // Крюк
    this._drawHook(ctx, sw.anchorX, sw.anchorY);

    // Верёвка — Bézier, neon cyan
    const midX = (sw.anchorX + px) / 2;
    const midY = (sw.anchorY + py) / 2;
    const cpX = midX + (py - sw.anchorY) * 0.06;
    const cpY = midY + sw.ropeLen * 0.06;
    ctx.strokeStyle = '#00F5D4';
    ctx.globalAlpha = this._alpha * 0.5;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(sw.anchorX, sw.anchorY);
    ctx.quadraticCurveTo(cpX, cpY, px, py);
    ctx.stroke();

    // Охотник
    ctx.globalAlpha = this._alpha;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((sw.angle - Math.PI / 2) * 0.35);
    drawSkinPose(ctx, this._skinIndex, 0);
    ctx.restore();

    ctx.restore();
  }

  _drawHook(ctx, x, y) {
    ctx.save();
    // Крюк — neon cyan
    ctx.strokeStyle = '#00F5D4';
    ctx.globalAlpha = this._alpha * 0.6;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x, y - 4); ctx.stroke();
    ctx.globalAlpha = this._alpha * 0.5;
    ctx.beginPath(); ctx.arc(x + 6, y - 4, 6, Math.PI, 0, true); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - 4, y + 8, 5, 0, Math.PI, true); ctx.stroke();
    ctx.globalAlpha = this._alpha * 0.7;
    ctx.fillStyle = '#00F5D4';
    ctx.beginPath();
    ctx.moveTo(x - 9, y + 8);
    ctx.lineTo(x - 8, y + 14);
    ctx.lineTo(x - 5, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  destroy() {
    this.swing = null;
  }
}
