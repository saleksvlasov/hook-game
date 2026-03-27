import { BOUNTY_HEIGHT, MOON_HEIGHT } from '../constants.js';
import { playBounty, playMoonwalker } from '../audio.js';
import { profile } from '../data/index.js';
import { t } from '../i18n.js';
import { drawSteelFrame } from '../managers/UIFactory.js';

const NEON_FONT = "'Inter', 'Helvetica Neue', sans-serif";

// Пасхалки: Bounty Claimed (1000m) и Moonwalker (3000m) — Neon Western
// Canvas 2D API — рисуются в экранных координатах
export class EasterEggs {
  // Приватные поля — Bounty
  #bountyActive = false;
  #bountyY = -40;
  #bountyAlpha = 1;
  #bountyTime = 0;
  #bountyPhase = 'enter'; // enter, hold, exit

  // Приватные поля — Moonwalker
  #moonActive = false;
  #moonAlpha = 0;
  #moonGlowAlpha = 0;
  #moonTime = 0;
  #moonPhase = 'glow_in'; // glow_in, glow_out, text_in, text_out, done

  constructor(scene) {
    this.scene = scene;
    this.bountyShown = false;
    this.moonReached = false;
    this.onHeartBonus = null; // callback для бонуса сердец
  }

  reset() {
    this.bountyShown = false;
    this.moonReached = false;
    this.#bountyActive = false;
    this.#moonActive = false;
  }

  // Вызывать каждый кадр из update
  check(currentHeight) {
    if (currentHeight >= BOUNTY_HEIGHT && !this.bountyShown) {
      this.bountyShown = true;
      this.#startBounty();
      if (this.onHeartBonus) this.onHeartBonus();
    }
    if (currentHeight >= MOON_HEIGHT && !this.moonReached) {
      this.moonReached = true;
      this.#startMoonwalker();
      if (this.onHeartBonus) this.onHeartBonus();
    }
  }

  #startBounty() {
    playBounty();
    this.#bountyActive = true;
    this.#bountyY = -40;
    this.#bountyAlpha = 1;
    this.#bountyTime = 0;
    this.#bountyPhase = 'enter';
  }

  #startMoonwalker() {
    playMoonwalker();
    profile.saveMoon();
    this.#moonActive = true;
    this.#moonAlpha = 0;
    this.#moonGlowAlpha = 0;
    this.#moonTime = 0;
    this.#moonPhase = 'glow_in';
  }

  // Отрисовка пасхалок — в экранных координатах
  draw(ctx, delta) {
    if (this.#bountyActive) this.#drawBounty(ctx, delta);
    if (this.#moonActive) this.#drawMoonwalker(ctx, delta);
  }

  #drawBounty(ctx, delta) {
    const W = this.scene.W;
    this.#bountyTime += delta;

    // Анимация фаз
    if (this.#bountyPhase === 'enter') {
      // Back.easeOut: 500ms, -40 → 130
      const t = Math.min(this.#bountyTime / 500, 1);
      const s = 1.70158;
      const t1 = t - 1;
      const eased = 1 + (s + 1) * t1 * t1 * t1 + s * t1 * t1;
      this.#bountyY = -40 + 170 * eased;
      if (t >= 1) {
        this.#bountyPhase = 'hold';
        this.#bountyTime = 0;
      }
    } else if (this.#bountyPhase === 'hold') {
      this.#bountyY = 130;
      if (this.#bountyTime > 2000) {
        this.#bountyPhase = 'exit';
        this.#bountyTime = 0;
      }
    } else if (this.#bountyPhase === 'exit') {
      const t = Math.min(this.#bountyTime / 400, 1);
      this.#bountyY = 130 - 190 * t;
      this.#bountyAlpha = 1 - t;
      if (t >= 1) this.#bountyActive = false;
    }

    if (!this.#bountyActive) return;

    ctx.globalAlpha = this.#bountyAlpha;

    // Рамка
    drawSteelFrame(ctx, W / 2, this.#bountyY, 240, 60);

    // Текст
    ctx.font = `bold 26px ${NEON_FONT}`;
    ctx.fillStyle = '#FFB800';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#0A0E1A';
    ctx.lineWidth = 5;
    ctx.strokeText(t('bounty'), W / 2, this.#bountyY);
    ctx.fillText(t('bounty'), W / 2, this.#bountyY);

    ctx.globalAlpha = 1;
  }

  #drawMoonwalker(ctx, delta) {
    const W = this.scene.W;
    this.#moonTime += delta;

    if (this.#moonPhase === 'glow_in') {
      const t = Math.min(this.#moonTime / 1500, 1);
      this.#moonGlowAlpha = t * 0.4;
      if (t >= 1) { this.#moonPhase = 'glow_out'; this.#moonTime = 0; }
    } else if (this.#moonPhase === 'glow_out') {
      const t = Math.min(this.#moonTime / 1500, 1);
      this.#moonGlowAlpha = 0.4 * (1 - t);
      this.#moonAlpha = Math.min(t * 1.25, 0.8); // Текст появляется
      if (t >= 1) { this.#moonPhase = 'text_hold'; this.#moonTime = 0; }
    } else if (this.#moonPhase === 'text_hold') {
      this.#moonAlpha = 0.8;
      this.#moonGlowAlpha = 0;
      if (this.#moonTime > 2500) { this.#moonPhase = 'text_out'; this.#moonTime = 0; }
    } else if (this.#moonPhase === 'text_out') {
      const t = Math.min(this.#moonTime / 2000, 1);
      this.#moonAlpha = 0.8 * (1 - t);
      if (t >= 1) this.#moonActive = false;
    }

    if (!this.#moonActive) return;

    // Лунное свечение
    if (this.#moonGlowAlpha > 0.01) {
      ctx.globalAlpha = this.#moonGlowAlpha;
      ctx.fillStyle = '#00F5D4';
      ctx.beginPath(); ctx.arc(W * 0.72, 80, 70, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = this.#moonGlowAlpha * 0.5;
      ctx.beginPath(); ctx.arc(W * 0.72, 80, 35, 0, Math.PI * 2); ctx.fill();
    }

    // Надпись "MOONWALKER"
    if (this.#moonAlpha > 0.01) {
      ctx.globalAlpha = this.#moonAlpha;
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
