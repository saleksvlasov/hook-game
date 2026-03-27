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
  constructor(scene) {
    this.scene = scene;
    this.lastMilestone = 0;
    this._challengeMgr = null;

    // Состояние текстов
    this._heightStr = '0м';
    this._recordStr = '';
    this._hintStr = '';
    this._depthStr = '';
    this._challengeStr = '';
    this._hasChallengeWidget = false;

    // Анимация scale pop
    this._heightScale = 1;
    this._hintScale = 1;
    this._hintAlpha = 1;
    this._hintPulseTime = 0;

    // Hearts
    this._hearts = 6;
    this._maxHearts = 6;
    this._heartBlink = false;
    this._heartBlinkTime = 0;
    this._bonusTimer = 0; // ms оставшееся для 4-го сердца

    // Safe area отступ
    const envTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0', 10);
    this._safeTop = Math.max(envTop, 10);
  }

  create(challengeMgr) {
    this._challengeMgr = challengeMgr || null;
    this._hintStr = t('click_hook');
    this._depthStr = t('depth');
    this._recordStr = `${t('record')}: 0${t('unit_m')}`;

    // Виджет еженедельного испытания — показываем всегда
    const ch = this._challengeMgr ? this._challengeMgr.getCurrentChallenge() : null;
    if (ch) {
      this._hasChallengeWidget = true;
      this._updateChallengeStr(ch);
    }
  }

  _updateChallengeStr(ch) {
    const weekNum = this._challengeMgr.week;
    if (ch.completed) {
      // Испытание выполнено
      this._challengeStr = `🏆 WEEK ${weekNum}: ${t('challenge_completed')}`;
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
    this._challengeStr = `WEEK ${weekNum}: ${label} — ${ch.progress}/${ch.target}`;
  }

  updateHeight(currentHeight, maxHeight, sessionBest) {
    this._heightStr = `\u2191 ${currentHeight}${t('unit_m')}`;
    this._recordStr = `${t('record')}: ${Math.max(maxHeight, sessionBest)}${t('unit_m')}`;

    // Milestone каждые 50м — scale pop
    const milestone = Math.floor(currentHeight / 50) * 50;
    if (milestone > 0 && milestone > this.lastMilestone) {
      this.lastMilestone = milestone;
      this._heightScale = 1.12;
    }
  }

  setHint(key) {
    this._hintStr = t(key);
    this._hintScale = 1.15;
  }

  updateHearts(hearts, maxHearts, bonusTimer) {
    if (hearts < this._hearts) {
      this._heartBlink = true;
      this._heartBlinkTime = 0;
    }
    this._hearts = hearts;
    this._maxHearts = maxHearts;
    if (bonusTimer !== undefined) this._bonusTimer = bonusTimer;
  }

  updateBonusTimer(ms) {
    this._bonusTimer = Math.max(0, ms);
  }

  updateChallenge(progress, target) {
    if (!this._hasChallengeWidget) return;
    const ch = this._challengeMgr ? this._challengeMgr.getCurrentChallenge() : null;
    if (ch) this._updateChallengeStr(ch);
  }

  // Отрисовка HUD — вызывается в экранных координатах
  draw(ctx, delta) {
    const W = this.scene.W;
    const safeTop = this._safeTop;

    // Убираем scale pop анимацию
    if (this._heightScale > 1) {
      this._heightScale = Math.max(1, this._heightScale - delta * 0.005);
    }
    if (this._hintScale > 1) {
      this._hintScale = Math.max(1, this._hintScale - delta * 0.005);
    }

    // Пульсация подсказки 0.5→1.0
    this._hintPulseTime += delta;
    this._hintAlpha = 0.5 + 0.5 * Math.sin(this._hintPulseTime * 0.004);

    // === Neon glass панель ===
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = NEON_BG;
    const panelX = W / 2 - 76;
    const panelY = safeTop + 10;
    const panelW = 152;
    const panelH = 52;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(panelX, panelY, panelW, panelH, 26);
    } else {
      ctx.rect(panelX, panelY, panelW, panelH);
    }
    ctx.fill();

    // Cyan рамка
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = NEON_CYAN;
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(panelX, panelY, panelW, panelH, 26);
    } else {
      ctx.rect(panelX, panelY, panelW, panelH);
    }
    ctx.stroke();

    // Scanlines на панели
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.03;
    for (let sy = panelY; sy < panelY + panelH; sy += 3) {
      ctx.fillRect(panelX, sy, panelW, 1);
    }

    // === Label "ГЛУБИНА" ===
    ctx.globalAlpha = 1;
    ctx.font = `11px ${FONT_MONO}`;
    ctx.fillStyle = NEON_STEEL;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(this._depthStr, W / 2, safeTop + 4);

    // === Высота — крупный amber ===
    ctx.save();
    ctx.translate(W / 2, safeTop + 18);
    ctx.scale(this._heightScale, this._heightScale);
    ctx.font = `bold 36px ${FONT_MONO}`;
    ctx.fillStyle = NEON_AMBER;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    // Cyan glow через shadow
    ctx.shadowColor = '#00F5D4';
    ctx.shadowBlur = 2;
    ctx.strokeStyle = NEON_BG;
    ctx.lineWidth = 5;
    ctx.strokeText(this._heightStr, 0, 0);
    ctx.fillText(this._heightStr, 0, 0);
    ctx.shadowBlur = 0;
    ctx.restore();

    // === Рекорд — cyan ===
    ctx.font = `bold 14px ${FONT_MONO}`;
    ctx.fillStyle = NEON_CYAN;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.shadowColor = '#00F5D4';
    ctx.shadowBlur = 2;
    ctx.strokeStyle = NEON_BG;
    ctx.lineWidth = 2;
    ctx.strokeText(this._recordStr, W / 2, safeTop + 56);
    ctx.fillText(this._recordStr, W / 2, safeTop + 56);
    ctx.shadowBlur = 0;

    // === Подсказка ===
    ctx.save();
    ctx.translate(W / 2, safeTop + 78);
    ctx.scale(this._hintScale, this._hintScale);
    ctx.globalAlpha = this._hintAlpha;
    ctx.font = `bold italic 16px ${NEON_FONT}`;
    ctx.fillStyle = NEON_CYAN;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = NEON_BG;
    ctx.lineWidth = 3;
    ctx.strokeText(this._hintStr, 0, 0);
    ctx.fillText(this._hintStr, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;

    // === Сердца — правый верхний угол ===
    const heartCount = Math.ceil(this._maxHearts / 2); // 3 или 4
    const heartSize = 12;
    const heartGap = 6;

    // Blink при ударе
    if (this._heartBlink) {
      this._heartBlinkTime += delta;
      if (this._heartBlinkTime > 500) this._heartBlink = false;
    }
    const showHearts = !this._heartBlink || Math.floor(this._heartBlinkTime / 80) % 2 === 0;

    if (showHearts) {
      for (let i = 0; i < heartCount; i++) {
        const hx = W - 20 - i * (heartSize * 2 + heartGap);
        const hy = safeTop + 20;
        const halfHearts = this._hearts - i * 2;
        const state = halfHearts >= 2 ? 'full' : halfHearts === 1 ? 'half' : 'empty';
        // 4-е сердце (i=3) — бонусное, рисуем с пульсацией
        const isBonus = i === 3 && this._maxHearts > 6;
        if (isBonus) {
          const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.006);
          ctx.globalAlpha = pulse;
        }
        this._drawHUDHeart(ctx, hx, hy, heartSize, state);
        if (isBonus) ctx.globalAlpha = 1;
      }

      // Таймер бонусного сердца — под сердцами
      if (this._maxHearts > 6 && this._bonusTimer > 0) {
        const secs = Math.ceil(this._bonusTimer / 1000);
        const timerX = W - 20 - 3 * (heartSize * 2 + heartGap); // Под 4-м сердцем
        const timerY = safeTop + 36;
        ctx.font = `bold 11px ${NEON_FONT}`;
        ctx.fillStyle = '#FF2E63';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.globalAlpha = 0.9;
        ctx.fillText(`${secs}s`, timerX, timerY);
        ctx.globalAlpha = 1;
      }
    }

    // === Виджет еженедельного испытания (отступ от подсказки) ===
    if (this._hasChallengeWidget) {
      const chipY = safeTop + 114;
      ctx.globalAlpha = 0.85;
      ctx.font = `13px ${NEON_FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Измеряем текст для chip-фона
      const tw = ctx.measureText(this._challengeStr).width + 24;
      const th = 26;
      drawChip(ctx, W / 2, chipY, tw, th);

      ctx.fillStyle = NEON_AMBER;
      ctx.strokeStyle = NEON_BG;
      ctx.lineWidth = 2;
      ctx.strokeText(this._challengeStr, W / 2, chipY);
      ctx.fillText(this._challengeStr, W / 2, chipY);
      ctx.globalAlpha = 1;
    }
  }

  // Рисование одного HUD-сердца (full/half/empty)
  _drawHUDHeart(ctx, x, y, size, state) {
    ctx.save();
    ctx.translate(x, y);
    const s = size / 12;

    // Bezier path сердца
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
      // Левая половина заполнена
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
      // Контур
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = '#FF2E63';
      ctx.lineWidth = 1;
      heartPath();
      ctx.stroke();
    } else {
      // Empty — только контур
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
