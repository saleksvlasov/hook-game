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
  // Приватные поля
  #skinScrollX = 0;
  #tooltipSkinIndex = -1;
  #tooltipVisible = false;
  #dragging = false;
  #dragStartX = 0;
  #totalDragDist = 0;
  #onPointerDown = null;
  #onPointerMove = null;
  #onPointerUp = null;

  constructor(scene) {
    this.scene = scene;
    this.skinSelectorOpen = false;
  }

  get isOpen() { return this.skinSelectorOpen; }
  get hasTooltip() { return this.#tooltipVisible; }

  // Обработка тапа когда карусель открыта (вне карусели — закрыть)
  handleTap(x, y) {
    const H = this.scene.H;
    const stripY = H * 0.88;
    // Если тап в зоне карусели — обрабатывается через pointer handlers
    // Если тап вне — закрываем карусель
    if (y < stripY - 45 || y > stripY + 45) {
      this.#close();
    }
  }

  toggle() {
    if (this.skinSelectorOpen) {
      this.#close();
    } else {
      this.#open();
    }
  }

  #close() {
    this.skinSelectorOpen = false;
    this.#tooltipVisible = false;
    this.#removePointerListeners();
  }

  #open() {
    this.skinSelectorOpen = true;
    this.#tooltipVisible = false;

    const cellW = 56;
    const activeSkin = profile.activeSkin;
    const activeIdx = SKINS.findIndex(sk => sk.id === activeSkin);
    const totalW = SKINS.length * cellW;
    const W = this.scene.W;

    // Начальный offset
    const centerOffset = W / 2 - (activeIdx >= 0 ? activeIdx : 0) * cellW - cellW / 2;
    this.#skinScrollX = clamp(centerOffset, W - totalW, 0);

    this.#setupPointerListeners();
  }

  #setupPointerListeners() {
    const cellW = 56;
    const totalW = SKINS.length * cellW;
    const W = this.scene.W;
    const y = this.scene.H * 0.88;

    this.#onPointerDown = (e) => {
      if (e.y < y - 40 || e.y > y + 40) return;
      this.#dragging = true;
      this.#dragStartX = e.x;
      this.#totalDragDist = 0;
    };

    this.#onPointerMove = (e) => {
      if (!this.#dragging) return;
      const dx = e.x - this.#dragStartX;
      this.#totalDragDist += Math.abs(dx);
      this.#skinScrollX = clamp(this.#skinScrollX + dx, W - totalW, 0);
      this.#dragStartX = e.x;
    };

    this.#onPointerUp = (e) => {
      if (!this.#dragging) return;
      this.#dragging = false;
      if (this.#totalDragDist < 8 && e.y >= y - 40 && e.y <= y + 40) {
        const tapX = e.x;
        for (let i = 0; i < SKINS.length; i++) {
          const skinX = this.#skinScrollX + i * cellW + cellW / 2;
          if (Math.abs(tapX - skinX) < cellW / 2) {
            this.#tooltipSkinIndex = i;
            this.#tooltipVisible = true;
            break;
          }
        }
      }
    };

    this.scene.input.on('pointerdown', this.#onPointerDown);
    this.scene.input.on('pointermove', this.#onPointerMove);
    this.scene.input.on('pointerup', this.#onPointerUp);
  }

  // Обработка тапа на тултипе (equip/close) — вызывается из MenuScene
  handleTooltipTap(x, y) {
    if (!this.#tooltipVisible) return false;

    const W = this.scene.W;
    const H = this.scene.H;
    const cx = W / 2;
    const cy = H / 2;
    const cardW = 260;
    const cardH = 220;

    // Внутри карточки?
    if (x >= cx - cardW / 2 && x <= cx + cardW / 2 && y >= cy - cardH / 2 && y <= cy + cardH / 2) {
      // Проверяем кнопку EQUIP (cy + 75..cy + 95)
      const skin = SKINS[this.#tooltipSkinIndex];
      if (skin && profile.isSkinUnlocked(skin.id) && skin.id !== profile.activeSkin) {
        if (y >= cy + 70 && y <= cy + 100) {
          profile.setActiveSkin(skin.id);
          if (this.scene.menuHunterObj) this.scene.menuHunterObj.redraw(this.#tooltipSkinIndex);
          this.#tooltipVisible = false;
          // Пересоздать карусель для обновления рамки
          if (this.skinSelectorOpen) {
            this.#close();
            this.#open();
          }
          return true;
        }
      }
      return true; // Клик внутри карточки — поглощаем
    }

    // Клик за пределами карточки — закрываем
    this.#tooltipVisible = false;
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
      const x = this.#skinScrollX + i * cellW + cellW / 2;
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
    if (this.#tooltipVisible) {
      this.#drawTooltip(ctx);
    }

    ctx.globalAlpha = 1;
  }

  #drawTooltip(ctx) {
    const skin = SKINS[this.#tooltipSkinIndex];
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
    drawSkinPose(ctx, this.#tooltipSkinIndex, 0);
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
    this.#removePointerListeners();
    this.#tooltipVisible = false;
    this.skinSelectorOpen = false;
  }

  #removePointerListeners() {
    const inp = this.scene.input;
    if (this.#onPointerDown) inp.off('pointerdown', this.#onPointerDown);
    if (this.#onPointerMove) inp.off('pointermove', this.#onPointerMove);
    if (this.#onPointerUp) inp.off('pointerup', this.#onPointerUp);
    this.#onPointerDown = null;
    this.#onPointerMove = null;
    this.#onPointerUp = null;
  }
}
