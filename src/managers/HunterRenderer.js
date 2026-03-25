import Phaser from 'phaser';
import { SKINS, drawSkinPose } from './SkinRenderer.js';
import { getActiveSkin } from '../storage.js';

// Рендер охотника — скин из SkinRenderer
export class HunterRenderer {
  constructor(scene) {
    this.scene = scene;
    this.graphics = null;
    this.coatTime = 0;
    this.skinIndex = 0;
    // Порог перерисовки — пропускаем если пальто почти не изменилось
    this._lastCoatAngle = -999;
  }

  // Установить скин по id
  setSkin(skinId) {
    this.skinIndex = SKINS.findIndex(s => s.id === skinId);
    if (this.skinIndex < 0) this.skinIndex = 0;
  }

  // Загрузить активный скин из storage
  loadActiveSkin() {
    this.setSkin(getActiveSkin());
  }

  create(playerContainer) {
    this.graphics = this.scene.add.graphics();
    this.loadActiveSkin();
    this.drawPose(this.graphics, 0);
    playerContainer.add(this.graphics);
  }

  // Обновление анимации: rotation и coat sway
  updateAnimation(delta, playerContainer, vx, vy, swingSpeed, swingAngle, isHooked) {
    this.coatTime += delta * 0.005;

    // Наклон охотника
    if (!isHooked) {
      const targetRot = Phaser.Math.Clamp(vx / 600, -0.4, 0.4);
      playerContainer.rotation += (targetRot - playerContainer.rotation) * 0.1;
    } else {
      const targetRot = (swingAngle - Math.PI / 2) * 0.3;
      playerContainer.rotation += (targetRot - playerContainer.rotation) * 0.15;
    }

    // Интенсивность анимации пальто от скорости
    const speed = Math.sqrt(vx * vx + vy * vy);
    const swingContrib = isHooked ? Math.abs(swingSpeed) * 3 : 0;
    const coatIntensity = Math.min(1, (speed + swingContrib * 100) / 400);
    this.drawPose(this.graphics, this.coatTime * (1 + coatIntensity * 2));
  }

  drawPose(g, coatAngle) {
    // Пропускаем перерисовку если угол пальто изменился незначительно
    if (Math.abs(coatAngle - this._lastCoatAngle) < 0.03) return;
    this._lastCoatAngle = coatAngle;
    drawSkinPose(g, this.skinIndex, coatAngle);
  }

  destroy() {
    if (this.graphics) this.graphics.destroy();
  }
}
