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

  // Визуальные эффекты активных перков вокруг игрока
  drawPerkEffects(ctx, x, y, perkLevels, isHooked, swingSpeed) {
    if (!perkLevels) return;
    const now = performance.now();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // === hook_range: cyan кольцо-пульс дальности при свободном полёте ===
    if (perkLevels.hook_range > 0 && !isHooked) {
      const lvl = perkLevels.hook_range;
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.003);
      ctx.globalAlpha = 0.04 + lvl * 0.008 + pulse * 0.02;
      ctx.strokeStyle = '#00F5D4';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.lineDashOffset = -now * 0.02;
      ctx.beginPath();
      ctx.arc(x, y, 40 + lvl * 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // === swing_power: amber огоньки на руках при качании ===
    if (perkLevels.swing_power > 0 && isHooked) {
      const lvl = perkLevels.swing_power;
      const intensity = Math.min(Math.abs(swingSpeed || 0) / 3, 1);
      if (intensity > 0.2) {
        const sparkCount = Math.min(lvl, 6);
        ctx.globalAlpha = intensity * 0.3;
        for (let i = 0; i < sparkCount; i++) {
          const angle = now * 0.008 + i * 1.2;
          const dist = 12 + Math.sin(now * 0.01 + i) * 4;
          const sx = x + Math.cos(angle) * dist;
          const sy = y + Math.sin(angle) * dist;
          const size = 1.5 + intensity * 1.5;
          ctx.fillStyle = '#FFB800';
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // === iron_heart: pink glow вокруг игрока (сильнее с уровнем) ===
    if (perkLevels.iron_heart > 0) {
      const lvl = perkLevels.iron_heart;
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.002);
      ctx.globalAlpha = 0.03 + lvl * 0.015 + pulse * 0.01;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 20 + lvl * 4);
      grad.addColorStop(0, 'rgba(255, 46, 99, 0.15)');
      grad.addColorStop(1, 'rgba(255, 46, 99, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, 20 + lvl * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // === quick_hook: cyan вращающийся индикатор (2 быстрые дуги) ===
    if (perkLevels.quick_hook > 0) {
      const lvl = perkLevels.quick_hook;
      const rot = now * (0.004 + lvl * 0.002);
      ctx.globalAlpha = 0.12 + lvl * 0.04;
      ctx.strokeStyle = '#00F5D4';
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const start = rot + i * Math.PI;
        ctx.beginPath();
        ctx.arc(x, y, 16, start, start + Math.PI / 4);
        ctx.stroke();
      }
    }

    // === ember_magnet: оранжевые частицы стягиваются к игроку ===
    if (perkLevels.ember_magnet > 0) {
      const lvl = perkLevels.ember_magnet;
      const count = Math.min(lvl + 1, 4);
      ctx.globalAlpha = 0.2 + lvl * 0.04;
      for (let i = 0; i < count; i++) {
        const t = ((now * 0.001 + i * 1.7) % 2) / 2; // 0→1 цикл
        const angle = i * Math.PI * 2 / count + now * 0.001;
        const dist = 30 * (1 - t); // летят к центру
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;
        const size = 1.5 * (1 - t * 0.5);
        ctx.fillStyle = '#FF6B35';
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  // Рисовать огненный щит (additive blend для яркого горения)
  drawShield(ctx, x, y, radius, shieldAlpha = 0, timerMs = 40000) {
    if (shieldAlpha <= 0) return;

    const now = performance.now();
    const expiring = timerMs <= 5000;
    const expired01 = expiring ? 1 - timerMs / 5000 : 0;

    // Пульсации на разных частотах
    const p1 = 0.5 + 0.5 * Math.sin(now * (expiring ? 0.012 + expired01 * 0.02 : 0.005));
    const p2 = 0.5 + 0.5 * Math.sin(now * 0.007 + 1.5);
    const p3 = 0.5 + 0.5 * Math.sin(now * 0.003 + 3.0);

    // Мерцание при истечении
    let dim = 1;
    if (expiring) {
      const rate = 200 - expired01 * 130;
      dim = Math.floor(now / rate) % 2 === 0 ? 1 : 0.35;
    }

    const alpha = Math.max(0.25 + p1 * 0.15, shieldAlpha) * dim;

    // Цвета: Orange core + Amber glow → Pink при истечении
    const cr = 255, cg = Math.round(107 - expired01 * 61), cb = Math.round(53 + expired01 * 46);
    const gr = 255, gg = Math.round(184 - expired01 * 138), gb = Math.round(expired01 * 99);

    ctx.save();

    // === ADDITIVE BLEND — ключ к яркому горению ===
    ctx.globalCompositeOperation = 'lighter';

    // 1. Широкое огненное свечение
    const glowSize = radius + 15 + p1 * 8;
    ctx.globalAlpha = alpha * 0.5;
    const glow = ctx.createRadialGradient(x, y, radius * 0.4, x, y, glowSize);
    glow.addColorStop(0, `rgba(${gr},${gg},${gb},${alpha * 0.25})`);
    glow.addColorStop(0.5, `rgba(${cr},${cg},${cb},${alpha * 0.15})`);
    glow.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    // 2. Яркое кольцо пламени
    ctx.globalAlpha = alpha * 0.6;
    const ring = ctx.createRadialGradient(x, y, radius - 6, x, y, radius + 4);
    ring.addColorStop(0, `rgba(${gr},${gg},${gb},0)`);
    ring.addColorStop(0.3, `rgba(${gr},${gg},${gb},${alpha * 0.4})`);
    ring.addColorStop(0.6, `rgba(${cr},${cg},${cb},${alpha * 0.6})`);
    ring.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
    ctx.fill();

    // 3. Вращающиеся огненные дуги (3 быстрые + 2 медленные)
    const rot = now * 0.003;
    ctx.lineWidth = 3;
    ctx.globalAlpha = alpha * 0.9;
    ctx.strokeStyle = `rgb(${gr},${gg},${gb})`;
    for (let i = 0; i < 3; i++) {
      const s = rot + i * Math.PI * 2 / 3;
      ctx.beginPath();
      ctx.arc(x, y, radius, s, s + Math.PI / 3 + p1 * Math.PI / 5);
      ctx.stroke();
    }
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha * 0.7;
    ctx.strokeStyle = `rgb(${cr},${cg},${cb})`;
    for (let i = 0; i < 2; i++) {
      const s = -now * 0.002 + i * Math.PI;
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, s, s + Math.PI / 4 + p2 * Math.PI / 4);
      ctx.stroke();
    }

    // 4. Огненные языки пламени (12 штук, пляшут по контуру)
    const flameCount = 12;
    for (let i = 0; i < flameCount; i++) {
      const angle = rot * 1.5 + i * (Math.PI * 2 / flameCount);
      const flicker = Math.sin(now * 0.01 + i * 1.7) * 0.5 + 0.5;
      const wobble = Math.sin(now * 0.008 + i * 2.3) * 5;
      const fr = radius + wobble;
      const fx = x + Math.cos(angle) * fr;
      const fy = y + Math.sin(angle) * fr;

      // Ядро пламени — белый/жёлтый (additive = яркий!)
      const coreSize = 2 + flicker * 2;
      ctx.globalAlpha = alpha * (0.5 + flicker * 0.5);
      ctx.fillStyle = `rgb(255,${220 + Math.round(flicker * 35)},${100 + Math.round(flicker * 80)})`;
      ctx.beginPath();
      ctx.arc(fx, fy, coreSize, 0, Math.PI * 2);
      ctx.fill();

      // Glow вокруг ядра
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.beginPath();
      ctx.arc(fx, fy, coreSize + 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Яркие всполохи (4 больших, медленные, дают ощущение мощи)
    ctx.globalAlpha = alpha * 0.35;
    for (let i = 0; i < 4; i++) {
      const angle = now * 0.001 + i * Math.PI / 2;
      const burstR = radius + 6 + p3 * 8;
      const bx = x + Math.cos(angle) * burstR;
      const by = y + Math.sin(angle) * burstR;
      const bGrad = ctx.createRadialGradient(bx, by, 0, bx, by, 6 + p1 * 4);
      bGrad.addColorStop(0, `rgba(255,255,200,${alpha * 0.5})`);
      bGrad.addColorStop(1, `rgba(${gr},${gg},${gb},0)`);
      ctx.fillStyle = bGrad;
      ctx.beginPath();
      ctx.arc(bx, by, 6 + p1 * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // Восстанавливает globalCompositeOperation
  }

  // Рисовать ghost (клон для wrap-around)
  drawGhost(ctx, x, y) {
    this.draw(ctx, x, y);
  }

  destroy() {
    // Ничего — нет Phaser объектов
  }
}
