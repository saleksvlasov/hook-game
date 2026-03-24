import { GOLD, BG_DARK, FONT, Z } from '../constants.js';
import { t } from '../i18n.js';

// Менеджер HUD — счёт, рекорд, подсказка
export class HUDManager {
  constructor(scene) {
    this.scene = scene;
    this.heightText = null;
    this.maxHeightText = null;
    this.hintText = null;
  }

  create() {
    const W = this.scene.W;

    // Отступ для iPhone Dynamic Island / notch / статусбар
    const isIphone = /iPhone/.test(navigator.userAgent);
    const hasNotch = isIphone && screen.height >= 812;
    const safeTop = hasNotch ? 60 : 10;

    this.heightText = this.scene.add.text(W / 2, safeTop + 18, `0${t('unit_m')}`, {
      fontSize: '32px',
      color: GOLD,
      fontFamily: FONT,
      fontStyle: 'bold',
      stroke: BG_DARK,
      strokeThickness: 5,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(Z.HUD);

    this.maxHeightText = this.scene.add.text(W / 2, safeTop + 54, `${t('record')}: 0${t('unit_m')}`, {
      fontSize: '14px',
      color: '#6B5030',
      fontFamily: FONT,
      stroke: BG_DARK,
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(Z.HUD);

    // Label
    this.scene.add.text(W / 2, safeTop + 4, t('depth'), {
      fontSize: '10px',
      color: '#5B4020',
      fontFamily: FONT,
      letterSpacing: 4,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(Z.HUD);

    this.hintText = this.scene.add.text(W / 2, safeTop + 76, t('click_hook'), {
      fontSize: '12px',
      color: '#4B3A20',
      fontFamily: FONT,
      fontStyle: 'italic',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(Z.HUD);
  }

  updateHeight(currentHeight, maxHeight, sessionBest) {
    this.heightText.setText(`\u2191 ${currentHeight}${t('unit_m')}`);
    this.maxHeightText.setText(
      `${t('record')}: ${Math.max(maxHeight, sessionBest)}${t('unit_m')}`
    );
  }

  setHint(key) {
    this.hintText.setText(t(key));
  }

  destroy() {
    // Phaser уничтожает объекты сцены автоматически при stop
  }
}
