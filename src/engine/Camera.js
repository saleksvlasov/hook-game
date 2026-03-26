// Камера — scroll, lerp, shake, flash, fadeIn
// Замена Phaser.Cameras.Scene2D.Camera

import { lerp as mathLerp } from './math.js';

export class Camera {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.scrollX = 0;
    this.scrollY = 0;

    // Shake
    this._shakeIntensity = 0;
    this._shakeDuration = 0;
    this._shakeElapsed = 0;
    this._shakeOffsetX = 0;
    this._shakeOffsetY = 0;

    // Flash
    this._flashAlpha = 0;
    this._flashDuration = 0;
    this._flashElapsed = 0;
    this._flashColor = 'rgba(255,255,255,1)';

    // FadeIn
    this._fadeAlpha = 1; // 1 = полностью чёрный, 0 = прозрачный
    this._fadeDuration = 0;
    this._fadeElapsed = 0;
    this._fadeColor = '#000';
    this._fadeActive = false;
  }

  // Плавное следование за целью
  lerpTo(targetX, targetY, factorX, factorY) {
    this.scrollX = mathLerp(this.scrollX, targetX, factorX);
    this.scrollY = mathLerp(this.scrollY, targetY, factorY);
  }

  // Встряска камеры
  shake(duration, intensity) {
    this._shakeDuration = duration;
    this._shakeIntensity = intensity;
    this._shakeElapsed = 0;
  }

  // Вспышка камеры
  flash(duration, r = 255, g = 255, b = 255, alpha = 1) {
    this._flashDuration = duration;
    this._flashElapsed = 0;
    this._flashColor = `rgba(${r},${g},${b},${alpha})`;
    this._flashAlpha = 1;
  }

  // Fade in (из чёрного)
  fadeIn(duration, r = 0, g = 0, b = 0) {
    this._fadeDuration = duration;
    this._fadeElapsed = 0;
    this._fadeAlpha = 1;
    this._fadeColor = `rgb(${r},${g},${b})`;
    this._fadeActive = true;
  }

  // Обновление эффектов — вызывать каждый кадр
  update(delta) {
    // Shake
    if (this._shakeElapsed < this._shakeDuration) {
      this._shakeElapsed += delta;
      const t = 1 - this._shakeElapsed / this._shakeDuration;
      const intensity = this._shakeIntensity * t * this.width;
      this._shakeOffsetX = (Math.random() * 2 - 1) * intensity;
      this._shakeOffsetY = (Math.random() * 2 - 1) * intensity;
    } else {
      this._shakeOffsetX = 0;
      this._shakeOffsetY = 0;
    }

    // Flash
    if (this._flashElapsed < this._flashDuration) {
      this._flashElapsed += delta;
      this._flashAlpha = 1 - this._flashElapsed / this._flashDuration;
    } else {
      this._flashAlpha = 0;
    }

    // FadeIn
    if (this._fadeActive) {
      this._fadeElapsed += delta;
      this._fadeAlpha = 1 - this._fadeElapsed / this._fadeDuration;
      if (this._fadeAlpha <= 0) {
        this._fadeAlpha = 0;
        this._fadeActive = false;
      }
    }
  }

  // Применить трансформацию камеры к canvas context
  applyTransform(ctx) {
    ctx.save();
    ctx.translate(
      -this.scrollX + this._shakeOffsetX,
      -this.scrollY + this._shakeOffsetY,
    );
  }

  // Снять трансформацию
  resetTransform(ctx) {
    ctx.restore();
  }

  // Рисовать эффекты поверх (flash, fadeIn) — вызывать ПОСЛЕ всего рендера
  drawEffects(ctx) {
    // Flash
    if (this._flashAlpha > 0.01) {
      ctx.globalAlpha = this._flashAlpha;
      ctx.fillStyle = this._flashColor;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    }

    // FadeIn
    if (this._fadeAlpha > 0.01) {
      ctx.globalAlpha = this._fadeAlpha;
      ctx.fillStyle = this._fadeColor;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    }
  }
}
