import { GOLD, FONT, Z, HINT_COLOR, RECORD_COLOR } from '../constants.js';
import { t } from '../i18n.js';
import { createEmberBurst } from '../managers/UIFactory.js';

// Менеджер HUD — счёт, рекорд, подсказка (premium glassmorphism)
export class HUDManager {
  constructor(scene) {
    this.scene = scene;
    this.heightText = null;
    this.maxHeightText = null;
    this.hintText = null;
    this.bgPanel = null;
    this.lastMilestone = 0;
  }

  create() {
    const W = this.scene.W;

    // Отступ для safe area (Dynamic Island, notch, статусбар)
    const envTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0', 10);
    const safeTop = Math.max(envTop, 10);

    // MUI Chip панель — плоская, pill-shape
    this.bgPanel = this.scene.add.graphics();
    this.bgPanel.fillStyle(0xFFFFFF, 0.05);
    this.bgPanel.fillRoundedRect(W / 2 - 76, safeTop + 10, 152, 52, 26);
    this.bgPanel.lineStyle(1, 0xF5B842, 0.18);
    this.bgPanel.strokeRoundedRect(W / 2 - 76, safeTop + 10, 152, 52, 26);
    this.bgPanel.setScrollFactor(0).setDepth(Z.HUD);

    this.heightText = this.scene.add.text(W / 2, safeTop + 18, `0${t('unit_m')}`, {
      fontSize: '36px',
      color: GOLD,
      fontFamily: FONT,
      fontStyle: 'bold',
      stroke: '#101520',
      strokeThickness: 5,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(Z.HUD);

    this.maxHeightText = this.scene.add.text(W / 2, safeTop + 56, `${t('record')}: 0${t('unit_m')}`, {
      fontSize: '14px',
      color: '#A09060',
      fontFamily: FONT,
      fontStyle: 'bold',
      stroke: '#101520',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(Z.HUD);

    // Label — метка "ГЛУБИНА" (ярче, читаемее)
    this.scene.add.text(W / 2, safeTop + 4, t('depth'), {
      fontSize: '11px',
      color: '#8A90A0',
      fontFamily: FONT,
      letterSpacing: 4,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(Z.HUD);

    this.hintText = this.scene.add.text(W / 2, safeTop + 78, t('click_hook'), {
      fontSize: '16px',
      color: HINT_COLOR,
      fontFamily: FONT,
      fontStyle: 'bold italic',
      stroke: '#101520',
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(Z.HUD);

    // Пульсация подсказки
    this.scene.tweens.add({
      targets: this.hintText,
      alpha: { from: 0.6, to: 1.0 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });
  }

  updateHeight(currentHeight, maxHeight, sessionBest) {
    this.heightText.setText(`\u2191 ${currentHeight}${t('unit_m')}`);
    this.maxHeightText.setText(
      `${t('record')}: ${Math.max(maxHeight, sessionBest)}${t('unit_m')}`
    );

    // Milestone каждые 50м — pop + искры
    const milestone = Math.floor(currentHeight / 50) * 50;
    if (milestone > 0 && milestone > this.lastMilestone) {
      this.lastMilestone = milestone;

      // Scale pop на тексте высоты
      this.scene.tweens.add({
        targets: this.heightText,
        scaleX: { from: 1.0, to: 1.12 },
        scaleY: { from: 1.0, to: 1.12 },
        duration: 100,
        yoyo: true,
      });

      // Искры вокруг текста
      const textX = this.heightText.x;
      const textY = this.heightText.y + this.heightText.height / 2;
      createEmberBurst(this.scene, textX, textY, 3);
    }
  }

  setHint(key) {
    this.hintText.setText(t(key));

    // Scale pop при смене подсказки
    this.scene.tweens.add({
      targets: this.hintText,
      scaleX: { from: 1.0, to: 1.15 },
      scaleY: { from: 1.0, to: 1.15 },
      duration: 100,
      yoyo: true,
    });
  }

  destroy() {
    // Phaser уничтожает объекты сцены автоматически при stop
  }
}
