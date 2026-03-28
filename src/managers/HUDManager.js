import { FONT_MONO } from '../constants.js';
import { t, tf } from '../i18n.js';
import { drawChip } from '../managers/UIFactory.js';

// ===== NEON WESTERN ПАЛИТРА =====
const NEON_CYAN = '#00F5D4';
const NEON_AMBER = '#FFB800';
const NEON_BG = '#0A0E1A';
const NEON_STEEL = '#4A5580';
const NEON_FONT = "'Inter', 'Helvetica Neue', sans-serif";

// Менеджер HUD — счёт, рекорд, подсказка (neon western glassmorphism)
// Canvas 2D API — рисуется в экранных координатах (после camera.resetTransform)
export class HUDManager {
  // Приватные поля — тексты
  #heightStr = '0м';
  #recordStr = '';
  #hintStr = '';
  #challengeStr = '';
  #hasChallengeWidget = false;
  #challengeMgr = null;

  // Приватные поля — анимация
  #heightScale = 1;
  #hintScale = 1;
  #hintAlpha = 1;
  #hintPulseTime = 0;
  #hintVisible = true;

  // Приватные поля — Hearts
  #hearts = 6;
  #maxHearts = 6;
  #heartBlink = false;
  #heartBlinkTime = 0;
  #bonusTimer = 0;

  // Embers
  #embersEarned = 0;

  // Perk levels для отображения иконок
  #perkLevels = null;

  // Shield timer (ms оставшееся)
  #shieldTimer = 0;

  // Safe area отступ
  #safeTop;

  constructor(scene) {
    this.scene = scene;
    this.lastMilestone = 0;

    const envTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0', 10);
    this.#safeTop = Math.max(envTop, 10);
  }

  create(challengeMgr) {
    this.#challengeMgr = challengeMgr || null;
    this.#hintStr = t('click_hook');
    this.#recordStr = `${t('record')}: 0${t('unit_m')}`;
    this.#hintVisible = true;
    this.#hintPulseTime = 0;

    const ch = this.#challengeMgr ? this.#challengeMgr.getCurrentChallenge() : null;
    if (ch) {
      this.#hasChallengeWidget = true;
      this.#updateChallengeStr(ch);
    }
  }

  #updateChallengeStr(ch) {
    const weekNum = this.#challengeMgr.week;
    if (ch.completed) {
      this.#challengeStr = `🏆 WEEK ${weekNum}: ${t('challenge_completed')}`;
      return;
    }
    const labelMap = {
      reach: 'challenge_reach',
      total: 'challenge_total',
      no_hit: 'challenge_no_hit',
      games: 'challenge_games',
      streak: 'challenge_streak',
    };
    const label = tf(labelMap[ch.type] || 'challenge_reach', ch.target, ch.count || 3);
    this.#challengeStr = `WEEK ${weekNum}: ${label} — ${ch.progress}/${ch.target}`;
  }

  updateHeight(currentHeight, maxHeight, sessionBest) {
    this.#heightStr = `\u2191 ${currentHeight}${t('unit_m')}`;
    this.#recordStr = `${t('record')}: ${Math.max(maxHeight, sessionBest)}${t('unit_m')}`;

    const milestone = Math.floor(currentHeight / 50) * 50;
    if (milestone > 0 && milestone > this.lastMilestone) {
      this.lastMilestone = milestone;
      this.#heightScale = 1.12;
    }
  }

  setHint(key) {
    this.#hintStr = t(key);
    this.#hintScale = 1.15;
    this.#hintVisible = true;
    this.#hintPulseTime = 0;
  }

  updateEmbers(count) {
    this.#embersEarned = count;
  }

  setPerkLevels(perkLevels) {
    this.#perkLevels = perkLevels;
  }

  updateShieldTimer(ms) {
    this.#shieldTimer = Math.max(0, ms);
  }

  updateHearts(hearts, maxHearts, bonusTimer) {
    if (hearts < this.#hearts) {
      this.#heartBlink = true;
      this.#heartBlinkTime = 0;
    }
    this.#hearts = hearts;
    this.#maxHearts = maxHearts;
    if (bonusTimer !== undefined) this.#bonusTimer = bonusTimer;
  }

  updateBonusTimer(ms) {
    this.#bonusTimer = Math.max(0, ms);
  }

  updateChallenge(progress, target) {
    if (!this.#hasChallengeWidget) return;
    const ch = this.#challengeMgr ? this.#challengeMgr.getCurrentChallenge() : null;
    if (ch) this.#updateChallengeStr(ch);
  }

  // Отрисовка HUD — вызывается в экранных координатах
  draw(ctx, delta) {
    const W = this.scene.W;
    const H = this.scene.H;
    const safeTop = this.#safeTop;

    // Scale pop анимация
    if (this.#heightScale > 1) {
      this.#heightScale = Math.max(1, this.#heightScale - delta * 0.005);
    }
    if (this.#hintScale > 1) {
      this.#hintScale = Math.max(1, this.#hintScale - delta * 0.005);
    }

    // Скрыть подсказку через 5 сек
    this.#hintPulseTime += delta;
    if (this.#hintPulseTime > 5000) this.#hintVisible = false;
    this.#hintAlpha = 0.5 + 0.5 * Math.sin(this.#hintPulseTime * 0.004);

    // === Neon glass панель (динамическая ширина) ===
    ctx.font = `bold 32px ${FONT_MONO}`;
    const heightTextW = ctx.measureText(this.#heightStr).width;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = NEON_BG;
    const panelW = Math.max(140, heightTextW + 32);
    const panelH = 46;
    const panelX = W / 2 - panelW / 2;
    const panelY = safeTop + 8;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(panelX, panelY, panelW, panelH, 23);
    else ctx.rect(panelX, panelY, panelW, panelH);
    ctx.fill();

    // Cyan рамка
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = NEON_CYAN;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(panelX, panelY, panelW, panelH, 23);
    else ctx.rect(panelX, panelY, panelW, panelH);
    ctx.stroke();

    // Scanlines
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.03;
    for (let sy = panelY; sy < panelY + panelH; sy += 3) {
      ctx.fillRect(panelX, sy, panelW, 1);
    }

    // === Высота — amber (без label ВЫСОТА) ===
    ctx.save();
    ctx.translate(W / 2, safeTop + 16);
    ctx.scale(this.#heightScale, this.#heightScale);
    ctx.font = `bold 32px ${FONT_MONO}`;
    ctx.fillStyle = NEON_AMBER;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 1;
    ctx.shadowColor = NEON_AMBER;
    ctx.shadowBlur = 2;
    ctx.strokeStyle = NEON_BG;
    ctx.lineWidth = 4;
    ctx.strokeText(this.#heightStr, 0, 0);
    ctx.fillText(this.#heightStr, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();

    // === Рекорд — cyan ===
    ctx.font = `bold 13px ${FONT_MONO}`;
    ctx.fillStyle = NEON_CYAN;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 1;
    ctx.shadowColor = '#00F5D4';
    ctx.shadowBlur = 1;
    ctx.strokeStyle = NEON_BG;
    ctx.lineWidth = 2;
    ctx.strokeText(this.#recordStr, W / 2, safeTop + 52);
    ctx.fillText(this.#recordStr, W / 2, safeTop + 52);
    ctx.shadowBlur = 0;

    // === Подсказка (скрывается через 5 сек, ПОД challenge) ===
    if (this.#hintVisible && this.#hintStr) {
      ctx.save();
      ctx.translate(W / 2, safeTop + 100);
      ctx.scale(this.#hintScale, this.#hintScale);
      ctx.globalAlpha = this.#hintAlpha;
      ctx.font = `bold italic 14px ${NEON_FONT}`;
      ctx.fillStyle = NEON_CYAN;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.strokeStyle = NEON_BG;
      ctx.lineWidth = 3;
      ctx.strokeText(this.#hintStr, 0, 0);
      ctx.fillText(this.#hintStr, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // === Сердца — правый верхний угол (адаптивный размер) ===
    const heartCount = Math.ceil(this.#maxHearts / 2);
    const heartSize = heartCount > 4 ? 10 : 12;
    const heartGap = heartCount > 4 ? 4 : 6;

    if (this.#heartBlink) {
      this.#heartBlinkTime += delta;
      if (this.#heartBlinkTime > 500) this.#heartBlink = false;
    }
    const showHearts = !this.#heartBlink || Math.floor(this.#heartBlinkTime / 80) % 2 === 0;

    if (showHearts) {
      for (let i = 0; i < heartCount; i++) {
        const hx = W - 20 - i * (heartSize * 2 + heartGap);
        const hy = safeTop + 20;
        const halfHearts = this.#hearts - i * 2;
        const state = halfHearts >= 2 ? 'full' : halfHearts === 1 ? 'half' : 'empty';
        // Бонусное = последнее сердце, только при активном таймере
        const isBonus = this.#bonusTimer > 0 && i === heartCount - 1;
        if (isBonus) {
          const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.006);
          ctx.globalAlpha = pulse;
        }
        this.#drawHUDHeart(ctx, hx, hy, heartSize, state);
        if (isBonus) ctx.globalAlpha = 1;
      }

      if (this.#bonusTimer > 0) {
        const secs = Math.ceil(this.#bonusTimer / 1000);
        const timerX = W - 20 - (heartCount - 1) * (heartSize * 2 + heartGap);
        const timerY = safeTop + 36;
        ctx.font = `bold 12px ${NEON_FONT}`;
        ctx.fillStyle = '#FF2E63';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.globalAlpha = 0.9;
        ctx.fillText(`${secs}s`, timerX, timerY);
        ctx.globalAlpha = 1;
      }
    }

    // === Ember counter — ВЕРХ слева (компактный) ===
    if (this.#embersEarned > 0) {
      const ex = 16;
      const ey = safeTop + 20;
      const label = `+${this.#embersEarned}`;
      ctx.font = `bold 13px ${FONT_MONO}`;
      const tw = ctx.measureText(label).width;
      // Dark pill
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#0A0E1A';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(ex - 10, ey - 10, tw + 28, 20, 10);
      else ctx.rect(ex - 10, ey - 10, tw + 28, 20);
      ctx.fill();
      // Огонёк
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#FF6B35';
      ctx.beginPath();
      ctx.arc(ex, ey, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFB800';
      ctx.beginPath();
      ctx.arc(ex, ey - 1.5, 4, 0, Math.PI * 2);
      ctx.fill();
      // Число
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#FF6B35';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, ex + 11, ey);
      ctx.globalAlpha = 1;
    }

    // === Перки — НИЗ слева (горизонтальная полоска) ===
    this.#drawPerkIcons(ctx, W, H);

    // === Виджет challenge ===
    if (this.#hasChallengeWidget) {
      const chipY = safeTop + 75;
      ctx.globalAlpha = 0.85;
      ctx.font = `12px ${NEON_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Ограничиваем ширину chip
      const rawW = ctx.measureText(this.#challengeStr).width + 24;
      const tw = Math.min(rawW, W - 32);
      const th = 26;
      drawChip(ctx, W / 2, chipY, tw, th);

      ctx.fillStyle = NEON_AMBER;
      ctx.strokeStyle = NEON_BG;
      ctx.lineWidth = 2;
      ctx.strokeText(this.#challengeStr, W / 2, chipY);
      ctx.fillText(this.#challengeStr, W / 2, chipY);
      ctx.globalAlpha = 1;
    }

    // === Shield timer — НИЗУ по центру (над кнопкой) ===
    if (this.#shieldTimer > 0) {
      const secs = Math.ceil(this.#shieldTimer / 1000);
      const expiring = this.#shieldTimer <= 5000;
      const expired01 = expiring ? 1 - this.#shieldTimer / 5000 : 0;

      // Цвет: cyan → pink при истечении
      const timerColor = expiring ? '#FF2E63' : NEON_CYAN;

      // Мигание последние 5 сек
      let show = true;
      if (expiring) {
        const rate = 200 - expired01 * 120;
        show = Math.floor(Date.now() / rate) % 2 === 0;
      }

      if (show) {
        ctx.font = `bold ${expiring ? 16 : 14}px ${FONT_MONO}`;
        ctx.fillStyle = timerColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.globalAlpha = 0.95;
        ctx.shadowColor = timerColor;
        ctx.shadowBlur = expiring ? 6 : 4;
        ctx.strokeStyle = NEON_BG;
        ctx.lineWidth = 3;
        ctx.strokeText(`\u{1F6E1} ${secs}s`, W / 2, H - 56);
        ctx.fillText(`\u{1F6E1} ${secs}s`, W / 2, H - 56);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
    }
  }

  // Иконки перков — низ экрана, горизонтальная полоска
  #drawPerkIcons(ctx, W, H) {
    if (!this.#perkLevels) return;

    const PERKS = [
      { id: 'hook_range',   icon: '\u2197', color: '#00F5D4' },
      { id: 'swing_power',  icon: '\u26A1', color: '#FFB800' },
      { id: 'iron_heart',   icon: '\u2665', color: '#FF2E63' },
      { id: 'quick_hook',   icon: '\u21BB', color: '#00F5D4' },
      { id: 'ember_magnet', icon: '\u2742', color: '#FF6B35' },
    ];

    let x = 8;
    const y = H - 16;
    const h = 18;
    const gap = 4;

    for (const perk of PERKS) {
      const lvl = this.#perkLevels[perk.id];
      if (!lvl) continue;

      const label = `${perk.icon}${lvl}`;
      ctx.font = `bold 12px ${FONT_MONO}`;
      const tw = ctx.measureText(label).width + 10;

      // Pill подложка
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = '#0A0E1A';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y - h / 2, tw, h, h / 2);
      else ctx.rect(x, y - h / 2, tw, h);
      ctx.fill();

      // Рамка
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = perk.color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y - h / 2, tw, h, h / 2);
      else ctx.rect(x, y - h / 2, tw, h);
      ctx.stroke();

      // Текст
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = perk.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 5, y);

      x += tw + gap;
    }
    ctx.globalAlpha = 1;
  }

  // Рисование одного HUD-сердца (full/half/empty)
  #drawHUDHeart(ctx, x, y, size, state) {
    ctx.save();
    ctx.translate(x, y);
    const s = size / 12;

    const heartPath = () => {
      ctx.beginPath();
      ctx.moveTo(0, 6 * s);
      ctx.bezierCurveTo(-8 * s, -1 * s, -12 * s, -7 * s, -7 * s, -11 * s);
      ctx.bezierCurveTo(-3 * s, -14 * s, 0, -11 * s, 0, -8 * s);
      ctx.bezierCurveTo(0, -11 * s, 3 * s, -14 * s, 7 * s, -11 * s);
      ctx.bezierCurveTo(12 * s, -7 * s, 8 * s, -1 * s, 0, 6 * s);
    };

    if (state === 'full') {
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#FF2E63';
      heartPath();
      ctx.fill();
    } else if (state === 'half') {
      ctx.save();
      heartPath();
      ctx.clip();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#FF2E63';
      ctx.fillRect(-14 * s, -16 * s, 14 * s, 24 * s);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#FF2E63';
      ctx.fillRect(0, -16 * s, 14 * s, 24 * s);
      ctx.restore();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#FF2E63';
      ctx.lineWidth = 1;
      heartPath();
      ctx.stroke();
    } else {
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = '#FF2E63';
      ctx.lineWidth = 1;
      heartPath();
      ctx.stroke();
    }

    ctx.restore();
  }

  destroy() {
    // Ничего — нет Phaser объектов
  }
}
