import { SKINS, drawSkinPose } from './SkinRenderer.js';
import { profile } from '../data/index.js';
import { clamp } from '../engine/math.js';

// Рендер охотника — скин из SkinRenderer
// Canvas 2D API вместо Phaser Graphics
export class HunterRenderer {
  // Приватные поля
  #rotation = 0;
  #coatAngle = 0;

  constructor(scene) {
    this.scene = scene;
    this.coatTime = 0;
    this.skinIndex = 0;
  }

  // Установить скин по id
  setSkin(skinId) {
    this.skinIndex = SKINS.findIndex(s => s.id === skinId);
    if (this.skinIndex < 0) this.skinIndex = 0;
  }

  // Загрузить активный скин из storage
  loadActiveSkin() {
    this.setSkin(profile.activeSkin);
  }

  create() {
    this.loadActiveSkin();
  }

  // Обновление анимации: rotation и coat sway
  updateAnimation(delta, playerX, playerY, vx, vy, swingSpeed, swingAngle, isHooked) {
    this.coatTime += delta * 0.005;

    // Наклон охотника
    if (!isHooked) {
      const targetRot = clamp(vx / 600, -0.4, 0.4);
      this.#rotation += (targetRot - this.#rotation) * 0.1;
    } else {
      const targetRot = (swingAngle - Math.PI / 2) * 0.3;
      this.#rotation += (targetRot - this.#rotation) * 0.15;
    }

    // Интенсивность анимации пальто от скорости
    const speed = Math.sqrt(vx * vx + vy * vy);
    const swingContrib = isHooked ? Math.abs(swingSpeed) * 3 : 0;
    const coatIntensity = Math.min(1, (speed + swingContrib * 100) / 400);
    this.#coatAngle = this.coatTime * (1 + coatIntensity * 2);
  }

  // Рисовать охотника в мировых координатах
  draw(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.#rotation);
    drawSkinPose(ctx, this.skinIndex, this.#coatAngle || 0);
    ctx.restore();
  }

  // Рисовать ghost (клон для wrap-around)
  drawGhost(ctx, x, y) {
    this.draw(ctx, x, y);
  }

  destroy() {
    // Ничего — нет Phaser объектов
  }
}
