import { BOUNTY_HEIGHT, MOON_HEIGHT } from '../constants.js';
import { playBounty, playMoonwalker } from '../audio.js';
import { profile } from '../data/index.js';
import { t } from '../i18n.js';
import { drawSteelFrame } from '../managers/UIFactory.js';

const NEON_FONT = "'Inter', 'Helvetica Neue', sans-serif";

// Пасхалки: Bounty Claimed (1000m) и Moonwalker (3000m) — Neon Western
// Canvas 2D API — рисуются в экранных координатах
export class EasterEggs {
  constructor(scene) {
    this.scene = scene;
    this.bountyShown = false;
    this.moonReached = false;
    this.onHeartBonus = null; // callback для бонуса сердец

    // Анимация Bounty
    this._bountyActive = false;
    this._bountyY = -40;
    this._bountyAlpha = 1;
    this._bountyTime = 0;
    this._bountyPhase = 'enter'; // enter, hold, exit

    // Анимация Moonwalker
    this._moonActive = false;
    this._moonAlpha = 0;
    this._moonGlowAlpha = 0;
    this._moonTime = 0;
    this._moonPhase = 'glow_in'; // glow_in, glow_out, text_in, text_out, done
  }

  reset() {
    this.bountyShown = false;
    this.moonReached = false;
    this._bountyActive = false;
    this._moonActive = false;
  }

  // Вызывать каждый кадр из update
  check(currentHeight) {
    if (currentHeight >= BOUNTY_HEIGHT && !this.bountyShown) {
      this.bountyShown = true;
      this._startBounty();
      if (this.onHeartBonus) this.onHeartBonus();
    }
    if (currentHeight >= MOON_HEIGHT && !this.moonReached) {
      this.moonReached = true;
      this._startMoonwalker();
      if (this.onHeartBonus) this.onHeartBonus();
    }
  }

  _startBounty() {
    playBounty();
    this._bountyActive = true;
    this._bountyY = -40;
    this._bountyAlpha = 1;
    this._bountyTime = 0;
    this._bountyPhase = 'enter';
  }

  _startMoonwalker() {
    playMoonwalker();
    profile.saveMoon();
    this._moonActive = true;
    this._moonAlpha = 0;
    this._moonGlowAlpha = 0;
    this._moonTime = 0;
    this._moonPhase = 'glow_in';
  }

  // Отрисовка пасхалок — в экранных координатах
  draw(ctx, delta) {
    if (this._bountyActive) this._drawBounty(ctx, delta);
    if (this._moonActive) this._drawMoonwalker(ctx, delta);
  }

  _drawBounty(ctx, delta) {
    const W = this.scene.W;
    this._bountyTime += delta;

    // Анимация фаз
    if (this._bountyPhase === 'enter') {
      // Back.easeOut: 500ms, -40 → 130
      const t = Math.min(this._bountyTime / 500, 1);
      const s = 1.70158;
      const t1 = t - 1;
      const eased = 1 + (s + 1) * t1 * t1 * t1 + s * t1 * t1;
      this._bountyY = -40 + 170 * eased;
      if (t >= 1) {
        this._bountyPhase = 'hold';
        this._bountyTime = 0;
      }
    } else if (this._bountyPhase === 'hold') {
      this._bountyY = 130;
      if (this._bountyTime > 2000) {
        this._bountyPhase = 'exit';
        this._bountyTime = 0;
      }
    } else if (this._bountyPhase === 'exit') {
      const t = Math.min(this._bountyTime / 400, 1);
      this._bountyY = 130 - 190 * t;
      this._bountyAlpha = 1 - t;
      if (t >= 1) this._bountyActive = false;
    }

    if (!this._bountyActive) return;

    ctx.globalAlpha = this._bountyAlpha;

    // Рамка
    drawSteelFrame(ctx, W / 2, this._bountyY, 240, 60);

    // Текст
    ctx.font = `bold 26px ${NEON_FONT}`;
    ctx.fillStyle = '#FFB800';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#0A0E1A';
    ctx.lineWidth = 5;
    ctx.strokeText(t('bounty'), W / 2, this._bountyY);
    ctx.fillText(t('bounty'), W / 2, this._bountyY);

    ctx.globalAlpha = 1;
  }

  _drawMoonwalker(ctx, delta) {
    const W = this.scene.W;
    this._moonTime += delta;

    if (this._moonPhase === 'glow_in') {
      const t = Math.min(this._moonTime / 1500, 1);
      this._moonGlowAlpha = t * 0.4;
      if (t >= 1) { this._moonPhase = 'glow_out'; this._moonTime = 0; }
    } else if (this._moonPhase === 'glow_out') {
      const t = Math.min(this._moonTime / 1500, 1);
      this._moonGlowAlpha = 0.4 * (1 - t);
      this._moonAlpha = Math.min(t * 1.25, 0.8); // Текст появляется
      if (t >= 1) { this._moonPhase = 'text_hold'; this._moonTime = 0; }
    } else if (this._moonPhase === 'text_hold') {
      this._moonAlpha = 0.8;
      this._moonGlowAlpha = 0;
      if (this._moonTime > 2500) { this._moonPhase = 'text_out'; this._moonTime = 0; }
    } else if (this._moonPhase === 'text_out') {
      const t = Math.min(this._moonTime / 2000, 1);
      this._moonAlpha = 0.8 * (1 - t);
      if (t >= 1) this._moonActive = false;
    }

    if (!this._moonActive) return;

    // Лунное свечение
    if (this._moonGlowAlpha > 0.01) {
      ctx.globalAlpha = this._moonGlowAlpha;
      ctx.fillStyle = '#00F5D4';
      ctx.beginPath(); ctx.arc(W * 0.72, 80, 70, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = this._moonGlowAlpha * 0.5;
      ctx.beginPath(); ctx.arc(W * 0.72, 80, 35, 0, Math.PI * 2); ctx.fill();
    }

    // Надпись "MOONWALKER"
    if (this._moonAlpha > 0.01) {
      ctx.globalAlpha = this._moonAlpha;
      ctx.font = `italic 22px ${NEON_FONT}`;
      ctx.fillStyle = '#00F5D4';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#0A0E1A';
      ctx.lineWidth = 4;
      ctx.strokeText(t('moonwalker'), W / 2, 180);
      ctx.fillText(t('moonwalker'), W / 2, 180);
    }

    ctx.globalAlpha = 1;
  }

  destroy() {
    // Ничего — нет Phaser объектов
  }
}
