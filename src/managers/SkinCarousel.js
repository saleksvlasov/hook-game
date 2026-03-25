import Phaser from 'phaser';
import { getActiveSkin, setActiveSkin, isSkinUnlocked } from '../storage.js';
import { SKINS, drawSkinPose } from './SkinRenderer.js';
import { getLang } from '../i18n.js';
import { t } from '../i18n.js';

// ===== NEON WESTERN ПАЛИТРА =====
const NEON_CYAN = 0x00F5D4;
const NEON_AMBER_STR = '#FFB800';
const NEON_CYAN_STR = '#00F5D4';
const NEON_PINK_STR = '#FF2E63';
const NEON_FONT = "'Inter', 'Helvetica Neue', sans-serif";

/**
 * Горизонтальная карусель скинов + тултип-карточка.
 * Вынесено из MenuScene для декомпозиции.
 */
export class SkinCarousel {
  constructor(scene) {
    this.scene = scene;
    this.skinSelectorOpen = false;
    this.skinSelectorElements = [];
    this._skinItems = [];
    this._tooltipElements = [];
    this._skinScrollX = 0;
    // Pointer handlers (ссылки для cleanup)
    this._skinPointerDown = null;
    this._skinPointerMove = null;
    this._skinPointerUp = null;
  }

  /** Открыть / закрыть карусель */
  toggle() {
    if (this.skinSelectorOpen) {
      this._close();
      return;
    }
    this._open();
  }

  // --- Внутренние методы ---

  _close() {
    for (const el of this.skinSelectorElements) {
      if (el && el.destroy) el.destroy();
    }
    this.skinSelectorElements = [];
    this._skinItems = [];
    this.skinSelectorOpen = false;
    this._removePointerListeners();
  }

  _open() {
    this.skinSelectorOpen = true;
    const s = this.scene;
    const W = s.W;
    const H = s.H;
    const cellW = 56;
    const y = H * 0.88;
    const activeSkin = getActiveSkin();
    const activeIdx = SKINS.findIndex(sk => sk.id === activeSkin);
    const totalW = SKINS.length * cellW;

    // Начальный offset — центрируем на активном скине
    const centerOffset = W / 2 - (activeIdx >= 0 ? activeIdx : 0) * cellW - cellW / 2;
    this._skinScrollX = Phaser.Math.Clamp(centerOffset, W - totalW, 0);

    // Состояние свайпа
    let dragging = false;
    let dragStartX = 0;
    let totalDragDist = 0;

    // Фон полоса
    const bgStrip = s.add.graphics().setDepth(18);
    bgStrip.fillStyle(0x0A0E1A, 0.92);
    bgStrip.fillRect(0, y - 35, W, 70);
    bgStrip.lineStyle(1, 0x00F5D4, 0.15);
    bgStrip.lineBetween(0, y - 35, W, y - 35);
    this.skinSelectorElements.push(bgStrip);

    // Скины
    this._skinItems = [];
    for (let i = 0; i < SKINS.length; i++) {
      const skin = SKINS[i];
      const x = this._skinScrollX + i * cellW + cellW / 2;
      const unlocked = isSkinUnlocked(skin.id);
      const isActive = skin.id === activeSkin;

      const container = s.add.container(x, y).setDepth(19);
      const gfx = s.add.graphics();
      drawSkinPose(gfx, i, 0);
      container.add(gfx);
      container.setScale(0.65);
      if (!unlocked) container.setAlpha(0.25);

      let frame = null;
      if (isActive) {
        frame = s.add.graphics().setDepth(20);
        frame.lineStyle(2, 0x00F5D4, 0.7);
        frame.strokeRoundedRect(x - 22, y - 28, 44, 56, 6);
        this.skinSelectorElements.push(frame);
      }

      this._skinItems.push({ container, frame, index: i });
      this.skinSelectorElements.push(container);
    }

    // Подсказка
    const hint = s.add.text(W / 2, y + 32, '← swipe · tap to preview →', {
      fontSize: '10px', fontFamily: "'Inter', sans-serif", color: '#4A5580',
    }).setOrigin(0.5).setDepth(18);
    this.skinSelectorElements.push(hint);

    // --- Pointer обработчики ---
    const self = this;

    this._skinPointerDown = function (pointer) {
      if (pointer.y < y - 40 || pointer.y > y + 40) return;
      dragging = true;
      dragStartX = pointer.x;
      totalDragDist = 0;
    };

    this._skinPointerMove = function (pointer) {
      if (!dragging) return;
      const dx = pointer.x - dragStartX;
      totalDragDist += Math.abs(dx);
      self._skinScrollX = Phaser.Math.Clamp(self._skinScrollX + dx, W - totalW, 0);
      dragStartX = pointer.x;
      self._reposition();
    };

    this._skinPointerUp = function (pointer) {
      if (!dragging) return;
      dragging = false;
      if (totalDragDist < 8 && pointer.y >= y - 40 && pointer.y <= y + 40) {
        const tapX = pointer.x;
        for (const item of self._skinItems) {
          const skinX = self._skinScrollX + item.index * cellW + cellW / 2;
          if (Math.abs(tapX - skinX) < cellW / 2) {
            self.showTooltip(item.index, skinX, y);
            break;
          }
        }
      }
    };

    s.input.on('pointerdown', this._skinPointerDown);
    s.input.on('pointermove', this._skinPointerMove);
    s.input.on('pointerup', this._skinPointerUp);
  }

  /** Перепозиционировать скины при свайпе */
  _reposition() {
    if (!this._skinItems) return;
    const cellW = 56;
    const y = this.scene.H * 0.88;
    for (const item of this._skinItems) {
      const x = this._skinScrollX + item.index * cellW + cellW / 2;
      item.container.setX(x);
      if (item.frame) {
        item.frame.clear();
        item.frame.lineStyle(2, 0x00F5D4, 0.7);
        item.frame.strokeRoundedRect(x - 22, y - 28, 44, 56, 6);
      }
    }
  }

  /** Показать тултип-карточку скина по центру экрана */
  showTooltip(skinIndex) {
    this.hideTooltip();

    const skin = SKINS[skinIndex];
    if (!skin) return;

    const s = this.scene;
    const W = s.W;
    const H = s.H;
    const lang = getLang();
    this._tooltipElements = [];

    // Затемнение фона
    const overlay = s.add.rectangle(W / 2, H / 2, W, H, 0x0A0E1A, 0.7)
      .setDepth(30).setInteractive();
    overlay.on('pointerdown', () => this.hideTooltip());
    this._tooltipElements.push(overlay);

    // Карточка
    const cardW = 260;
    const cardH = 220;
    const cx = W / 2;
    const cy = H / 2;

    const card = s.add.graphics().setDepth(31);
    card.fillStyle(0x0E1225, 0.95);
    card.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
    card.lineStyle(1.5, skin.outline, 0.5);
    card.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
    this._tooltipElements.push(card);

    // Скин крупно
    const skinContainer = s.add.container(cx, cy - 40).setDepth(32).setScale(2);
    const skinGfx = s.add.graphics();
    drawSkinPose(skinGfx, skinIndex, 0);
    skinContainer.add(skinGfx);
    this._tooltipElements.push(skinContainer);

    // Имя скина
    const name = skin.name[lang] || skin.name.en;
    const nameText = s.add.text(cx, cy + 30, name, {
      fontSize: '18px', fontFamily: NEON_FONT, fontStyle: 'bold',
      color: '#' + skin.outline.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(32);
    this._tooltipElements.push(nameText);

    // Условие получения
    const unlocked = isSkinUnlocked(skin.id);
    let conditionText;
    if (unlocked) {
      conditionText = t('skin_equipped');
    } else if (skin.week === 0) {
      conditionText = 'FREE';
    } else {
      conditionText = `Week ${skin.week} ${t('challenge_title')}`;
    }

    const condText = s.add.text(cx, cy + 55, conditionText, {
      fontSize: '12px', fontFamily: NEON_FONT,
      color: unlocked ? NEON_CYAN_STR : '#4A5580',
    }).setOrigin(0.5).setDepth(32);
    this._tooltipElements.push(condText);

    // Кнопка EQUIP или LOCKED
    if (unlocked && skin.id !== getActiveSkin()) {
      const equipText = s.add.text(cx, cy + 85, t('skin_equip'), {
        fontSize: '14px', fontFamily: NEON_FONT, fontStyle: 'bold',
        color: NEON_AMBER_STR, backgroundColor: 'rgba(255,184,0,0.1)',
        padding: { x: 20, y: 8 },
      }).setOrigin(0.5).setDepth(32).setInteractive({ useHandCursor: true });

      equipText.on('pointerdown', () => {
        setActiveSkin(skin.id);
        // Обновить охотника в меню через scene
        if (s.menuHunterObj) s.menuHunterObj.redraw(skinIndex);
        this.hideTooltip();
        // Пересоздать селектор для обновления рамки
        if (this.skinSelectorOpen) {
          this._close();
          this._open();
        }
      });
      this._tooltipElements.push(equipText);
    } else if (!unlocked) {
      const lockText = s.add.text(cx, cy + 85, `🔒 ${t('skin_locked')}`, {
        fontSize: '14px', fontFamily: NEON_FONT, color: NEON_PINK_STR,
      }).setOrigin(0.5).setDepth(32);
      this._tooltipElements.push(lockText);
    }
  }

  /** Скрыть тултип скина */
  hideTooltip() {
    if (this._tooltipElements) {
      for (const el of this._tooltipElements) {
        if (el && el.destroy) el.destroy();
      }
      this._tooltipElements = [];
    }
  }

  /** Cleanup всех элементов + listeners */
  destroy() {
    this.hideTooltip();
    this._removePointerListeners();
    for (const el of this.skinSelectorElements || []) {
      if (el && el.destroy) el.destroy();
    }
    this.skinSelectorElements = [];
    this._skinItems = [];
  }

  _removePointerListeners() {
    const inp = this.scene.input;
    if (this._skinPointerDown) inp.off('pointerdown', this._skinPointerDown);
    if (this._skinPointerMove) inp.off('pointermove', this._skinPointerMove);
    if (this._skinPointerUp) inp.off('pointerup', this._skinPointerUp);
    this._skinPointerDown = null;
    this._skinPointerMove = null;
    this._skinPointerUp = null;
  }
}
