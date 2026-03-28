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

  // Рисовать огненный щит-ауру вокруг игрока
  drawShield(ctx, x, y, radius, shieldAlpha = 0, timerMs = 40000) {
    if (shieldAlpha <= 0) return;

    const now = performance.now();
    const expiring = timerMs <= 5000;
    const expired01 = expiring ? 1 - timerMs / 5000 : 0;

    // Пульсация — ускоряется при истечении
    const pulseSpeed = expiring ? 0.012 + expired01 * 0.02 : 0.004;
    const pulse = 0.5 + 0.5 * Math.sin(now * pulseSpeed);
    const pulse2 = 0.5 + 0.5 * Math.sin(now * 0.007 + 1.5);

    // При истечении — мерцание
    let dimmer = 1;
    if (expiring) {
      const rate = 180 - expired01 * 100;
      dimmer = Math.floor(now / rate) % 2 === 0 ? 1 : 0.3;
    }

    const alpha = Math.max(0.15 + pulse * 0.1, shieldAlpha) * dimmer;

    // Палитра: Ember Orange → Amber → при истечении Pink
    const coreR = expiring ? Math.round(255) : 255;
    const coreG = expiring ? Math.round(107 - expired01 * 61) : 107; // FF6B35 → FF2E63
    const coreB = expiring ? Math.round(53 + expired01 * 46) : 53;
    const glowR = 255;
    const glowG = expiring ? Math.round(184 - expired01 * 138) : 184; // FFB800
    const glowB = expiring ? Math.round(0 + expired01 * 99) : 0;

    ctx.save();

    // 1. Огненное свечение (широкий glow)
    const glowR2 = radius + 12 + pulse * 6;
    ctx.globalAlpha = alpha * 0.35;
    const glowGrad = ctx.createRadialGradient(x, y, radius * 0.6, x, y, glowR2);
    glowGrad.addColorStop(0, `rgba(${glowR},${glowG},${glowB},${alpha * 0.3})`);
    glowGrad.addColorStop(0.6, `rgba(${coreR},${coreG},${coreB},${alpha * 0.15})`);
    glowGrad.addColorStop(1, `rgba(${coreR},${coreG},${coreB},0)`);
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, y, glowR2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Внутренняя заливка — тёплый gradient
    ctx.globalAlpha = alpha * 0.7;
    const innerGrad = ctx.createRadialGradient(x, y, 0, x, y, radius);
    innerGrad.addColorStop(0, `rgba(${glowR},${glowG},${glowB},0)`);
    innerGrad.addColorStop(0.5, `rgba(${coreR},${coreG},${coreB},${alpha * 0.1})`);
    innerGrad.addColorStop(0.85, `rgba(${coreR},${coreG},${coreB},${alpha * 0.35})`);
    innerGrad.addColorStop(1, `rgba(${glowR},${glowG},${glowB},${alpha * 0.5})`);
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Вращающиеся огненные дуги (3 сегмента разной скорости)
    const rot1 = now * 0.003;
    const rot2 = -now * 0.002;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = alpha * 1.0;

    // Amber дуги — быстрые
    ctx.strokeStyle = `rgb(${glowR},${glowG},${glowB})`;
    for (let i = 0; i < 3; i++) {
      const start = rot1 + i * Math.PI * 2 / 3;
      const len = Math.PI / 3 + pulse * Math.PI / 6;
      ctx.beginPath();
      ctx.arc(x, y, radius - 1, start, start + len);
      ctx.stroke();
    }

    // Orange дуги — медленные, противоход
    ctx.strokeStyle = `rgb(${coreR},${coreG},${coreB})`;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = alpha * 0.8;
    for (let i = 0; i < 2; i++) {
      const start = rot2 + i * Math.PI;
      const len = Math.PI / 4 + pulse2 * Math.PI / 5;
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, start, start + len);
      ctx.stroke();
    }

    // 4. Огненные частицы-искры (8 штук, вращаются + пляшут)
    ctx.globalAlpha = alpha * 1.3;
    const sparkCount = 8;
    for (let i = 0; i < sparkCount; i++) {
      const baseAngle = rot1 * 1.8 + i * (Math.PI * 2 / sparkCount);
      const wobble = Math.sin(now * 0.008 + i * 2.3) * 4;
      const sparkR = radius + wobble;
      const sx = x + Math.cos(baseAngle) * sparkR;
      const sy = y + Math.sin(baseAngle) * sparkR;

      // Ядро искры — яркий amber
      const size = 2 + pulse * 1.5;
      ctx.fillStyle = `rgb(${glowR},${glowG},${glowB})`;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();

      // Хвост искры — мягкий glow
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = `rgb(${coreR},${coreG},${coreB})`;
      ctx.beginPath();
      ctx.arc(sx, sy, size + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = alpha * 1.3;
    }

    // 5. Пунктирное внешнее кольцо — бегущие штрихи
    ctx.lineWidth = 1;
    ctx.globalAlpha = alpha * 0.4;
    ctx.strokeStyle = `rgb(${glowR},${glowG},${glowB})`;
    ctx.setLineDash([3, 7]);
    ctx.lineDashOffset = -now * 0.04;
    ctx.beginPath();
    ctx.arc(x, y, radius + 5 + pulse * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

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
