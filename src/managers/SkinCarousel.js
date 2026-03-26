import { profile } from '../data/index.js';
import { SKINS, drawSkinPose } from './SkinRenderer.js';
import { getLang, t } from '../i18n.js';
import { clamp } from '../engine/math.js';
import { drawGlassButton } from './UIFactory.js';

// ===== NEON WESTERN ПАЛИТРА =====
const NEON_CYAN_STR = '#00F5D4';
const NEON_AMBER_STR = '#FFB800';
const NEON_PINK_STR = '#FF2E63';
const NEON_FONT = "'Inter', 'Helvetica Neue', sans-serif";

/**
 * Горизонтальная карусель скинов + тултип-карточка.
 * Canvas 2D API — всё рисуется в draw(ctx).
 */
export class SkinCarousel {
  constructor(scene) {
    this.scene = scene;
    this.skinSelectorOpen = false;
    this._skinScrollX = 0;
    this._tooltipSkinIndex = -1;
    this._tooltipVisible = false;

    // Pointer state
    this._dragging = false;
    this._dragStartX = 0;
    this._totalDragDist = 0;

    // Handlers
    this._onPointerDown = null;
    this._onPointerMove = null;
    this._onPointerUp = null;
  }

  get isOpen() { return this.skinSelectorOpen; }

  // Обработка тапа когда карусель открыта (вне карусели — закрыть)
  handleTap(x, y) {
    const H = this.scene.H;
    const stripY = H * 0.88;
    // Если тап в зоне карусели — обрабатывается через pointer handlers
    // Если тап вне — закрываем карусель
    if (y < stripY - 45 || y > stripY + 45) {
      this._close();
    }
  }

  toggle() {
    if (this.skinSelectorOpen) {
      this._close();
    } else {
      this._open();
    }
  }

  _close() {
    this.skinSelectorOpen = false;
    this._tooltipVisible = false;
    this._removePointerListeners();
  }

  _open() {
    this.skinSelectorOpen = true;
    this._tooltipVisible = false;

    const cellW = 56;
    const activeSkin = profile.activeSkin;
    const activeIdx = SKINS.findIndex(sk => sk.id === activeSkin);
    const totalW = SKINS.length * cellW;
    const W = this.scene.W;

    // Начальный offset
    const centerOffset = W / 2 - (activeIdx >= 0 ? activeIdx : 0) * cellW - cellW / 2;
    this._skinScrollX = clamp(centerOffset, W - totalW, 0);

    this._setupPointerListeners();
  }

  _setupPointerListeners() {
    const cellW = 56;
    const totalW = SKINS.length * cellW;
    const W = this.scene.W;
    const y = this.scene.H * 0.88;
    const self = this;

    this._onPointerDown = (e) => {
      if (e.y < y - 40 || e.y > y + 40) return;
      self._dragging = true;
      self._dragStartX = e.x;
      self._totalDragDist = 0;
    };

    this._onPointerMove = (e) => {
      if (!self._dragging) return;
      const dx = e.x - self._dragStartX;
      self._totalDragDist += Math.abs(dx);
      self._skinScrollX = clamp(self._skinScrollX + dx, W - totalW, 0);
      self._dragStartX = e.x;
    };

    this._onPointerUp = (e) => {
      if (!self._dragging) return;
      self._dragging = false;
      if (self._totalDragDist < 8 && e.y >= y - 40 && e.y <= y + 40) {
        const tapX = e.x;
        for (let i = 0; i < SKINS.length; i++) {
          const skinX = self._skinScrollX + i * cellW + cellW / 2;
          if (Math.abs(tapX - skinX) < cellW / 2) {
            self._tooltipSkinIndex = i;
            self._tooltipVisible = true;
            break;
          }
        }
      }
    };

    this.scene.input.on('pointerdown', this._onPointerDown);
    this.scene.input.on('pointermove', this._onPointerMove);
    this.scene.input.on('pointerup', this._onPointerUp);
  }

  // Обработка тапа на тултипе (equip/close) — вызывается из MenuScene
  handleTooltipTap(x, y) {
    if (!this._tooltipVisible) return false;

    const W = this.scene.W;
    const H = this.scene.H;
    const cx = W / 2;
    const cy = H / 2;
    const cardW = 260;
    const cardH = 220;

    // Внутри карточки?
    if (x >= cx - cardW / 2 && x <= cx + cardW / 2 && y >= cy - cardH / 2 && y <= cy + cardH / 2) {
      // Проверяем кнопку EQUIP (cy + 75..cy + 95)
      const skin = SKINS[this._tooltipSkinIndex];
      if (skin && profile.isSkinUnlocked(skin.id) && skin.id !== profile.activeSkin) {
        if (y >= cy + 70 && y <= cy + 100) {
          profile.setActiveSkin(skin.id);
          if (this.scene.menuHunterObj) this.scene.menuHunterObj.redraw(this._tooltipSkinIndex);
          this._tooltipVisible = false;
          // Пересоздать карусель для обновления рамки
          if (this.skinSelectorOpen) {
            this._close();
            this._open();
          }
          return true;
        }
      }
      return true; // Клик внутри карточки — поглощаем
    }

    // Клик за пределами карточки — закрываем
    this._tooltipVisible = false;
    return true;
  }

  draw(ctx) {
    if (!this.skinSelectorOpen) return;

    const W = this.scene.W;
    const cellW = 56;
    const y = this.scene.H * 0.88;
    const activeSkin = profile.activeSkin;

    // Фон полоса
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, y - 35, W, 70);
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#00F5D4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y - 35);
    ctx.lineTo(W, y - 35);
    ctx.stroke();

    // Скины
    for (let i = 0; i < SKINS.length; i++) {
      const skin = SKINS[i];
      const x = this._skinScrollX + i * cellW + cellW / 2;
      const unlocked = profile.isSkinUnlocked(skin.id);
      const isActive = skin.id === activeSkin;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.65, 0.65);
      ctx.globalAlpha = unlocked ? 1 : 0.25;
      drawSkinPose(ctx, i, 0);
      ctx.restore();

      // Рамка для активного скина
      if (isActive) {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = '#00F5D4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(x - 22, y - 28, 44, 56, 6);
        } else {
          ctx.rect(x - 22, y - 28, 44, 56);
        }
        ctx.stroke();
      }
    }

    // Подсказка
    ctx.globalAlpha = 1;
    ctx.font = `10px 'Inter', sans-serif`;
    ctx.fillStyle = '#4A5580';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2190 swipe \u00B7 tap to preview \u2192', W / 2, y + 32);

    // Тултип-карточка
    if (this._tooltipVisible) {
      this._drawTooltip(ctx);
    }

    ctx.globalAlpha = 1;
  }

  _drawTooltip(ctx) {
    const skin = SKINS[this._tooltipSkinIndex];
    if (!skin) return;

    const W = this.scene.W;
    const H = this.scene.H;
    const lang = getLang();
    const cx = W / 2;
    const cy = H / 2;
    const cardW = 260;
    const cardH = 220;

    // Затемнение фона
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, W, H);

    // Карточка
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = '#0E1225';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
    } else {
      ctx.rect(cx - cardW / 2, cy - cardH / 2, cardW, cardH);
    }
    ctx.fill();

    // Рамка карточки
    const outlineHex = typeof skin.outline === 'number'
      ? '#' + skin.outline.toString(16).padStart(6, '0')
      : skin.outline;
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = outlineHex;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
    } else {
      ctx.rect(cx - cardW / 2, cy - cardH / 2, cardW, cardH);
    }
    ctx.stroke();

    // Скин крупно
    ctx.save();
    ctx.translate(cx, cy - 40);
    ctx.scale(2, 2);
    ctx.globalAlpha = 1;
    drawSkinPose(ctx, this._tooltipSkinIndex, 0);
    ctx.restore();

    // Имя
    const name = skin.name[lang] || skin.name.en;
    ctx.globalAlpha = 1;
    ctx.font = `bold 18px ${NEON_FONT}`;
    ctx.fillStyle = outlineHex;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, cx, cy + 30);

    // Условие получения
    const unlocked = profile.isSkinUnlocked(skin.id);
    let conditionText;
    if (unlocked) {
      conditionText = t('skin_equipped');
    } else if (skin.week === 0) {
      conditionText = 'FREE';
    } else {
      conditionText = `Week ${skin.week} ${t('challenge_title')}`;
    }

    ctx.font = `12px ${NEON_FONT}`;
    ctx.fillStyle = unlocked ? NEON_CYAN_STR : '#4A5580';
    ctx.fillText(conditionText, cx, cy + 55);

    // Кнопка EQUIP или LOCKED
    if (unlocked && skin.id !== profile.activeSkin) {
      ctx.font = `bold 14px ${NEON_FONT}`;
      ctx.fillStyle = NEON_AMBER_STR;
      ctx.globalAlpha = 1;
      // Фон кнопки
      ctx.fillStyle = 'rgba(255,184,0,0.1)';
      const btnW = 100;
      const btnH = 32;
      ctx.fillRect(cx - btnW / 2, cy + 70, btnW, btnH);
      ctx.fillStyle = NEON_AMBER_STR;
      ctx.fillText(t('skin_equip'), cx, cy + 86);
    } else if (!unlocked) {
      ctx.font = `14px ${NEON_FONT}`;
      ctx.fillStyle = NEON_PINK_STR;
      ctx.fillText(`\uD83D\uDD12 ${t('skin_locked')}`, cx, cy + 85);
    }
  }

  destroy() {
    this._removePointerListeners();
    this._tooltipVisible = false;
    this.skinSelectorOpen = false;
  }

  _removePointerListeners() {
    const inp = this.scene.input;
    if (this._onPointerDown) inp.off('pointerdown', this._onPointerDown);
    if (this._onPointerMove) inp.off('pointermove', this._onPointerMove);
    if (this._onPointerUp) inp.off('pointerup', this._onPointerUp);
    this._onPointerDown = null;
    this._onPointerMove = null;
    this._onPointerUp = null;
  }
}
