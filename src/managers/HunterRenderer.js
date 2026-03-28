import { SKINS, drawSkinPose } from './SkinRenderer.js';
import { profile } from '../data/index.js';
import { clamp } from '../engine/math.js';

// Рендер охотника — скин из SkinRenderer
// Power Arc: аура/glow за персонажем зависит от тира
export class HunterRenderer {
  // Приватные поля
  #rotation = 0;
  #coatAngle = 0;
  #hunterGlow = 0;

  constructor(scene) {
    this.scene = scene;
    this.coatTime = 0;
    this.skinIndex = 0;
  }

  // Установить скин по id
  setSkin(skinId) {
    this.skinIndex = SKINS.findIndex(s => s.id === skinId);
    if (this.skinIndex < 0) this.skinIndex = 0;
  }

  // Загрузить активный скин из storage
  loadActiveSkin() {
    this.setSkin(profile.activeSkin);
  }

  create() {
    this.loadActiveSkin();
  }

  // Установить параметры Power Arc тира
  setTierParams(tierData) {
    this.#hunterGlow = tierData.hunterGlow;
  }

  // Обновление анимации: rotation и coat sway
  updateAnimation(delta, playerX, playerY, vx, vy, swingSpeed, swingAngle, isHooked) {
    this.coatTime += delta * 0.005;

    // Наклон охотника
    if (!isHooked) {
      const targetRot = clamp(vx / 600, -0.4, 0.4);
      this.#rotation += (targetRot - this.#rotation) * 0.1;
    } else {
      const targetRot = (swingAngle - Math.PI / 2) * 0.3;
      this.#rotation += (targetRot - this.#rotation) * 0.15;
    }

    // Интенсивность анимации пальто от скорости
    const speed = Math.sqrt(vx * vx + vy * vy);
    const swingContrib = isHooked ? Math.abs(swingSpeed) * 3 : 0;
    const coatIntensity = Math.min(1, (speed + swingContrib * 100) / 400);
    this.#coatAngle = this.coatTime * (1 + coatIntensity * 2);
  }

  // Рисовать охотника в мировых координатах
  draw(ctx, x, y) {
    // Power Arc glow — мягкая аура ЗА персонажем (radialGradient)
    if (this.#hunterGlow > 0) {
      ctx.save();
      const radius = 25 + this.#hunterGlow * 15;
      const alpha = this.#hunterGlow * 0.35;

      let r, g, b;
      if (this.#hunterGlow >= 0.7) {
        // Legend: amber-cyan shift
        const shift = Math.sin(performance.now() * 0.003) * 0.5 + 0.5;
        r = Math.floor(0 + 255 * shift);
        g = Math.floor(245 * (1 - shift) + 184 * shift);
        b = Math.floor(212 * (1 - shift));
      } else {
        r = 0; g = 245; b = 212; // Neon Cyan
      }

      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.4})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.#rotation);
    drawSkinPose(ctx, this.skinIndex, this.#coatAngle || 0);
    ctx.restore();
  }

  // Рисовать щит-ауру вокруг игрока
  drawShield(ctx, x, y, radius, shieldAlpha = 0, timerMs = 40000) {
    if (shieldAlpha <= 0) return;

    const now = performance.now();
    const expiring = timerMs <= 5000; // Последние 5 секунд
    const expired01 = expiring ? 1 - timerMs / 5000 : 0; // 0→1 по мере истечения

    // Пульсация — ускоряется при истечении
    const pulseSpeed = expiring ? 0.015 + expired01 * 0.025 : 0.005;
    const basePulse = 0.5 + 0.5 * Math.sin(now * pulseSpeed);

    // Мигание при истечении (вкл/выкл каждые 200-80ms)
    let blinkOn = true;
    if (expiring) {
      const blinkRate = 200 - expired01 * 120; // 200ms → 80ms
      blinkOn = Math.floor(now / blinkRate) % 2 === 0;
    }

    const baseAlpha = expiring
      ? (blinkOn ? 0.12 + basePulse * 0.15 : 0.04)
      : 0.08 + basePulse * 0.07;
    const alpha = Math.max(baseAlpha, shieldAlpha);

    // Цвет: cyan → pink при истечении
    const r = Math.round(0 + expired01 * 255);
    const g = Math.round(245 - expired01 * 199);
    const b = Math.round(212 - expired01 * 113);
    const color = `rgb(${r},${g},${b})`;
    const colorA = (a) => `rgba(${r},${g},${b},${a})`;

    ctx.save();

    // 1. Внешнее свечение (glow)
    ctx.globalAlpha = alpha * 0.4;
    const glowGrad = ctx.createRadialGradient(x, y, radius, x, y, radius + 8 + basePulse * 4);
    glowGrad.addColorStop(0, colorA(alpha * 0.3));
    glowGrad.addColorStop(1, colorA(0));
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius + 8 + basePulse * 4, 0, Math.PI * 2);
    ctx.fill();

    // 2. Основная заливка (gradient aura)
    ctx.globalAlpha = alpha;
    const grad = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius);
    grad.addColorStop(0, colorA(0));
    grad.addColorStop(0.6, colorA(alpha * 0.2));
    grad.addColorStop(1, colorA(alpha * 0.6));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Вращающиеся сегменты (4 дуги)
    const rotation = now * 0.002;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha * 1.2;
    for (let i = 0; i < 4; i++) {
      const segStart = rotation + i * Math.PI / 2;
      const segLen = Math.PI / 4 + basePulse * Math.PI / 8;
      ctx.beginPath();
      ctx.arc(x, y, radius - 1, segStart, segStart + segLen);
      ctx.stroke();
    }

    // 4. Внешний контур (тонкий, пульсирующий)
    ctx.lineWidth = 1;
    ctx.globalAlpha = alpha * 0.5;
    ctx.setLineDash([4, 6]);
    ctx.lineDashOffset = -now * 0.03;
    ctx.beginPath();
    ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Искры на контуре (6 точек вращающихся)
    ctx.globalAlpha = alpha * 1.5;
    const sparkCount = 6;
    for (let i = 0; i < sparkCount; i++) {
      const angle = rotation * 1.5 + i * (Math.PI * 2 / sparkCount);
      const sparkR = radius + basePulse * 3;
      const sx = x + Math.cos(angle) * sparkR;
      const sy = y + Math.sin(angle) * sparkR;
      const size = 1.5 + basePulse;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Рисовать ghost (клон для wrap-around)
  drawGhost(ctx, x, y) {
    this.draw(ctx, x, y);
  }

  destroy() {
    // Ничего — нет Phaser объектов
  }
}
