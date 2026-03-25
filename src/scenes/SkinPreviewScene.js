import Phaser from 'phaser';
import { SKINS, drawSkinPose } from '../managers/SkinRenderer.js';
import { getLang } from '../i18n.js';

/**
 * Временная сцена для превью всех 11 скинов (0-10).
 * Показывает сетку 3×4 с именами.
 */
export class SkinPreviewScene extends Phaser.Scene {
  constructor() {
    super('SkinPreviewScene');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    const lang = getLang();

    // Фон
    this.add.rectangle(W / 2, H / 2, W, H, 0x0A0E1A);

    // Заголовок
    this.add.text(W / 2, 30, 'WEEKLY SKINS', {
      fontSize: '22px',
      fontFamily: "'Inter', sans-serif",
      fontStyle: 'bold',
      color: '#FFB800',
    }).setOrigin(0.5);

    // Сетка: 3 колонки, 4 ряда
    const cols = 3;
    const cellW = W / cols;
    const cellH = (H - 60) / 4;
    const startY = 70;

    for (let i = 0; i < SKINS.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = cellW * col + cellW / 2;
      const cy = startY + cellH * row + cellH / 2 - 10;

      // Контейнер для скина
      const container = this.add.container(cx, cy);
      const gfx = this.add.graphics();
      drawSkinPose(gfx, i, 0);
      container.add(gfx);
      container.setScale(1.4);

      // Рамка вокруг скина
      const border = this.add.graphics();
      const outline = SKINS[i].outline;
      border.lineStyle(1, outline, 0.3);
      border.strokeRoundedRect(cx - cellW / 2 + 8, cy - cellH / 2 + 4, cellW - 16, cellH - 8, 8);

      // Имя скина
      const name = SKINS[i].name[lang] || SKINS[i].name.en;
      this.add.text(cx, cy + cellH / 2 - 20, name, {
        fontSize: '11px',
        fontFamily: "'Inter', sans-serif",
        color: '#' + outline.toString(16).padStart(6, '0'),
      }).setOrigin(0.5);

      // Номер недели
      const weekLabel = SKINS[i].week === 0 ? 'FREE' : `Week ${SKINS[i].week}`;
      this.add.text(cx, cy - cellH / 2 + 14, weekLabel, {
        fontSize: '9px',
        fontFamily: "'Inter', sans-serif",
        color: '#4A5580',
      }).setOrigin(0.5);
    }

    // Подсказка внизу
    this.add.text(W / 2, H - 15, 'Tap to return to menu', {
      fontSize: '12px',
      fontFamily: "'Inter', sans-serif",
      color: '#4A5580',
    }).setOrigin(0.5);

    this.input.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });
  }
}
