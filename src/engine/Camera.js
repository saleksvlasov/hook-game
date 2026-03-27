// Камера — scroll, lerp, shake, flash, fadeIn
// Замена Phaser.Cameras.Scene2D.Camera

import { lerp as mathLerp } from './math.js';

export class Camera {
  // Shake
  #shakeIntensity = 0;
  #shakeDuration = 0;
  #shakeElapsed = 0;
  #shakeOffsetX = 0;
  #shakeOffsetY = 0;

  // Flash
  #flashAlpha = 0;
  #flashDuration = 0;
  #flashElapsed = 0;
  #flashColor = 'rgba(255,255,255,1)';

  // FadeIn
  #fadeAlpha = 1; // 1 = полностью чёрный, 0 = прозрачный
  #fadeDuration = 0;
  #fadeElapsed = 0;
  #fadeColor = '#000';
  #fadeActive = false;

  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.scrollX = 0;
    this.scrollY = 0;
  }

  // Плавное следование за целью
  lerpTo(targetX, targetY, factorX, factorY) {
    this.scrollX = mathLerp(this.scrollX, targetX, factorX);
    this.scrollY = mathLerp(this.scrollY, targetY, factorY);
  }

  // Встряска камеры
  shake(duration, intensity) {
    this.#shakeDuration = duration;
    this.#shakeIntensity = intensity;
    this.#shakeElapsed = 0;
  }

  // Вспышка камеры
  flash(duration, r = 255, g = 255, b = 255, alpha = 1) {
    this.#flashDuration = duration;
    this.#flashElapsed = 0;
    this.#flashColor = `rgba(${r},${g},${b},${alpha})`;
    this.#flashAlpha = 1;
  }

  // Fade in (из чёрного)
  fadeIn(duration, r = 0, g = 0, b = 0) {
    this.#fadeDuration = duration;
    this.#fadeElapsed = 0;
    this.#fadeAlpha = 1;
    this.#fadeColor = `rgb(${r},${g},${b})`;
    this.#fadeActive = true;
  }

  // Обновление эффектов — вызывать каждый кадр
  update(delta) {
    // Shake
    if (this.#shakeElapsed < this.#shakeDuration) {
      this.#shakeElapsed += delta;
      const t = 1 - this.#shakeElapsed / this.#shakeDuration;
      const intensity = this.#shakeIntensity * t * this.width;
      this.#shakeOffsetX = (Math.random() * 2 - 1) * intensity;
      this.#shakeOffsetY = (Math.random() * 2 - 1) * intensity;
    } else {
      this.#shakeOffsetX = 0;
      this.#shakeOffsetY = 0;
    }

    // Flash
    if (this.#flashElapsed < this.#flashDuration) {
      this.#flashElapsed += delta;
      this.#flashAlpha = this.#flashDuration > 0 ? 1 - this.#flashElapsed / this.#flashDuration : 0;
    } else {
      this.#flashAlpha = 0;
    }

    // FadeIn
    if (this.#fadeActive) {
      this.#fadeElapsed += delta;
      this.#fadeAlpha = this.#fadeDuration > 0 ? 1 - this.#fadeElapsed / this.#fadeDuration : 0;
      if (this.#fadeAlpha <= 0) {
        this.#fadeAlpha = 0;
        this.#fadeActive = false;
      }
    }
  }

  // Применить трансформацию камеры к canvas context
  applyTransform(ctx) {
    ctx.save();
    ctx.translate(
      -this.scrollX + this.#shakeOffsetX,
      -this.scrollY + this.#shakeOffsetY,
    );
  }

  // Снять трансформацию
  resetTransform(ctx) {
    ctx.restore();
  }

  // Рисовать эффекты поверх (flash, fadeIn) — вызывать ПОСЛЕ всего рендера
  drawEffects(ctx) {
    // Flash
    if (this.#flashAlpha > 0.01) {
      ctx.globalAlpha = this.#flashAlpha;
      ctx.fillStyle = this.#flashColor;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    }

    // FadeIn
    if (this.#fadeAlpha > 0.01) {
      ctx.globalAlpha = this.#fadeAlpha;
      ctx.fillStyle = this.#fadeColor;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    }
  }
}
