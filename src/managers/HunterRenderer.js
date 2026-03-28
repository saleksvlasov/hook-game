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

  // Визуальные эффекты активных перков — яркие, сочные, как trail кометы
  drawPerkEffects(ctx, x, y, perkLevels, isHooked, swingSpeed) {
    if (!perkLevels) return;
    const now = performance.now();

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // === hook_range: яркий cyan пульсирующий круг дальности ===
    if (perkLevels.hook_range > 0) {
      const lvl = perkLevels.hook_range;
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.004);
      const r = 35 + lvl * 8;

      // Glow заполнение
      ctx.globalAlpha = 0.06 + lvl * 0.02 + pulse * 0.03;
      const grad = ctx.createRadialGradient(x, y, r * 0.6, x, y, r);
      grad.addColorStop(0, 'rgba(0,245,212,0)');
      grad.addColorStop(0.7, `rgba(0,245,212,${0.05 + lvl * 0.02})`);
      grad.addColorStop(1, 'rgba(0,245,212,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Яркие бегущие сегменты
      ctx.globalAlpha = 0.15 + lvl * 0.05;
      ctx.strokeStyle = '#00F5D4';
      ctx.lineWidth = 2;
      const rot = now * 0.002;
      for (let i = 0; i < 3; i++) {
        const s = rot + i * Math.PI * 2 / 3;
        ctx.beginPath();
        ctx.arc(x, y, r, s, s + Math.PI / 4 + pulse * Math.PI / 6);
        ctx.stroke();
      }
    }

    // === swing_power: amber/gold искры-пламя при качании ===
    if (perkLevels.swing_power > 0 && isHooked) {
      const lvl = perkLevels.swing_power;
      const speed = Math.abs(swingSpeed || 0);
      const intensity = Math.min(speed / 2.5, 1);
      if (intensity > 0.1) {
        const sparkCount = 3 + Math.min(lvl, 8);
        for (let i = 0; i < sparkCount; i++) {
          const angle = now * 0.01 + i * 0.9;
          const flicker = Math.sin(now * 0.015 + i * 2.1) * 0.5 + 0.5;
          const dist = 10 + flicker * 15 + intensity * 8;
          const sx = x + Math.cos(angle) * dist;
          const sy = y + Math.sin(angle) * dist;
          const size = (2 + intensity * 3 + flicker * 2) * (0.5 + lvl * 0.08);

          // Ядро — яркий белый/жёлтый
          ctx.globalAlpha = intensity * (0.3 + flicker * 0.4);
          ctx.fillStyle = `rgb(255,${200 + Math.round(flicker * 55)},${50 + Math.round(flicker * 100)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, size, 0, Math.PI * 2);
          ctx.fill();

          // Halo
          ctx.globalAlpha = intensity * 0.15;
          ctx.fillStyle = '#FFB800';
          ctx.beginPath();
          ctx.arc(sx, sy, size + 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // === iron_heart: pink пульсирующий glow + сердечные частицы ===
    if (perkLevels.iron_heart > 0) {
      const lvl = perkLevels.iron_heart;
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.003);
      const r = 25 + lvl * 8;

      // Большой мягкий glow
      ctx.globalAlpha = 0.08 + lvl * 0.04 + pulse * 0.03;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(255,46,99,${0.15 + lvl * 0.05})`);
      grad.addColorStop(0.6, `rgba(255,46,99,${0.05 + lvl * 0.02})`);
      grad.addColorStop(1, 'rgba(255,46,99,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();

      // Мелкие pink искры на орбите
      ctx.globalAlpha = 0.25 + lvl * 0.1;
      for (let i = 0; i < lvl + 1; i++) {
        const a = now * 0.003 + i * Math.PI * 2 / (lvl + 1);
        const d = r * 0.7 + Math.sin(now * 0.005 + i) * 4;
        ctx.fillStyle = '#FF2E63';
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // === quick_hook: быстрые cyan дуги + искры (ощущение скорости) ===
    if (perkLevels.quick_hook > 0) {
      const lvl = perkLevels.quick_hook;
      const rot = now * (0.006 + lvl * 0.003);
      const r = 20 + lvl * 3;

      // Дуги — быстрые, яркие
      ctx.strokeStyle = '#00F5D4';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.2 + lvl * 0.08;
      for (let i = 0; i < 3; i++) {
        const s = rot + i * Math.PI * 2 / 3;
        ctx.beginPath();
        ctx.arc(x, y, r, s, s + Math.PI / 5);
        ctx.stroke();
      }

      // Искры на концах дуг
      ctx.globalAlpha = 0.3 + lvl * 0.1;
      for (let i = 0; i < 3; i++) {
        const a = rot + i * Math.PI * 2 / 3 + Math.PI / 5;
        ctx.fillStyle = '#00F5D4';
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // === ember_magnet: вращающиеся магнитики + притягивающиеся искры ===
    if (perkLevels.ember_magnet > 0) {
      const lvl = perkLevels.ember_magnet;
      const magnetCount = Math.min(lvl + 1, 4); // 2-4 магнитика
      const orbitR = 30 + lvl * 4;
      const magnetRot = now * 0.002;

      // Вращающиеся магнитики
      for (let i = 0; i < magnetCount; i++) {
        const angle = magnetRot + i * Math.PI * 2 / magnetCount;
        const wobble = Math.sin(now * 0.005 + i * 1.5) * 3;
        const mx = x + Math.cos(angle) * (orbitR + wobble);
        const my = y + Math.sin(angle) * (orbitR + wobble);

        // Тело магнита — U-форма (две дуги)
        ctx.globalAlpha = 0.5 + lvl * 0.1;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        const mSize = 5 + lvl;
        const mAngle = angle + Math.PI / 2; // перпендикулярно орбите

        // Красная половина
        ctx.strokeStyle = '#FF2E63';
        ctx.beginPath();
        ctx.arc(mx, my, mSize, mAngle, mAngle + Math.PI);
        ctx.stroke();

        // Синяя/cyan половина
        ctx.strokeStyle = '#00F5D4';
        ctx.beginPath();
        ctx.arc(mx, my, mSize, mAngle + Math.PI, mAngle + Math.PI * 2);
        ctx.stroke();

        // Яркий glow вокруг магнита
        ctx.globalAlpha = 0.15 + lvl * 0.03;
        const mGlow = ctx.createRadialGradient(mx, my, 0, mx, my, mSize + 6);
        mGlow.addColorStop(0, 'rgba(255,107,53,0.3)');
        mGlow.addColorStop(1, 'rgba(255,107,53,0)');
        ctx.fillStyle = mGlow;
        ctx.beginPath();
        ctx.arc(mx, my, mSize + 6, 0, Math.PI * 2);
        ctx.fill();

        // Искры летят от магнита к игроку (3 на магнит)
        for (let j = 0; j < 3; j++) {
          const st = ((now * 0.002 + i * 0.7 + j * 0.5) % 1); // 0→1
          const sparkAngle = angle + (Math.random() - 0.5) * 0.3;
          const sparkDist = orbitR * (1 - st);
          const sx = x + Math.cos(sparkAngle) * sparkDist;
          const sy = y + Math.sin(sparkAngle) * sparkDist;
          const sparkSize = 1.5 + st * 2;

          ctx.globalAlpha = st * 0.6; // ярче к центру
          ctx.fillStyle = '#FFB800';
          ctx.beginPath();
          ctx.arc(sx, sy, sparkSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.restore();
  }

  // Орбитальные мини-щиты вокруг игрока (аналог drawSaw)
  drawShield(ctx, x, y, radius, shieldAlpha = 0, timerMs = 40000) {
    if (shieldAlpha <= 0) return;

    const now = performance.now();
    const expiring = timerMs <= 5000;
    const expired01 = expiring ? 1 - timerMs / 5000 : 0;

    let dim = 1;
    if (expiring) {
      const rate = 200 - expired01 * 130;
      dim = Math.floor(now / rate) % 2 === 0 ? 1 : 0.35;
    }

    const drawAlpha = Math.max(0.3, shieldAlpha) * dim;
    const rot = now * 0.0015;
    const SHIELDS = 6;
    const R_ORBIT = 36;
    const SZ = 8;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. Glow
    ctx.globalAlpha = drawAlpha * 0.15;
    ctx.fillStyle = '#FF6B35';
    ctx.beginPath();
    ctx.arc(x, y, R_ORBIT + 12, 0, Math.PI * 2);
    ctx.fill();

    // 2. Пунктирная орбита
    ctx.globalAlpha = drawAlpha * 0.25;
    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(x, y, R_ORBIT, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Мини-щиты на орбите
    ctx.globalAlpha = drawAlpha * 0.85;
    for (let i = 0; i < SHIELDS; i++) {
      const angle = rot + (i * Math.PI * 2) / SHIELDS;
      const sx = x + Math.cos(angle) * R_ORBIT;
      const sy = y + Math.sin(angle) * R_ORBIT;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle + Math.PI / 2);

      // Форма щита: плоский верх → заострённый низ
      ctx.beginPath();
      ctx.moveTo(0, -SZ);
      ctx.lineTo(SZ * 0.75, -SZ * 0.6);
      ctx.lineTo(SZ * 0.75, SZ * 0.2);
      ctx.quadraticCurveTo(SZ * 0.75, SZ * 0.7, 0, SZ);
      ctx.quadraticCurveTo(-SZ * 0.75, SZ * 0.7, -SZ * 0.75, SZ * 0.2);
      ctx.lineTo(-SZ * 0.75, -SZ * 0.6);
      ctx.closePath();

      ctx.fillStyle = 'rgba(255, 107, 53, 0.35)';
      ctx.fill();
      ctx.strokeStyle = '#FF6B35';
      ctx.lineWidth = 1.2;
      ctx.shadowColor = '#FF6B35';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    ctx.restore();
  }

  // Вращающаяся пила вокруг игрока
  drawSaw(ctx, x, y, alpha, timerMs, rotAngle) {
    if (alpha <= 0) return;
    const t = performance.now() * 0.001;

    // Expiring (< 5 sec): мигание нарастающей частотой
    let drawAlpha = alpha;
    if (timerMs < 5000) {
      const freq = 8 + (5 - timerMs / 1000) * 3;
      drawAlpha = alpha * (0.3 + 0.7 * Math.abs(Math.sin(t * freq)));
    }

    ctx.save();
    ctx.globalAlpha = drawAlpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y);

    const R_INNER = 32;   // было 22 — увеличено чтобы пила крутилась вокруг тела, а не вокруг лица
    const R_OUTER = 44;   // было 33
    const TEETH = 12;

    // Внутреннее кольцо — orange
    ctx.save();
    ctx.rotate(rotAngle);
    ctx.beginPath();
    ctx.arc(0, 0, R_INNER, 0, Math.PI * 2);
    ctx.strokeStyle = '#FF6B35';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#FF6B35';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Зубья — 12 треугольников
    ctx.fillStyle = '#FFB800';
    ctx.shadowColor = '#FFB800';
    ctx.shadowBlur = 6;
    for (let i = 0; i < TEETH; i++) {
      const θ = (i / TEETH) * Math.PI * 2;
      const p0x = Math.cos(θ - 0.17) * R_INNER;
      const p0y = Math.sin(θ - 0.17) * R_INNER;
      const p1x = Math.cos(θ + 0.22) * R_OUTER;
      const p1y = Math.sin(θ + 0.22) * R_OUTER;
      const p2x = Math.cos(θ + 0.17) * R_INNER;
      const p2y = Math.sin(θ + 0.17) * R_INNER;
      ctx.beginPath();
      ctx.moveTo(p0x, p0y);
      ctx.lineTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // Пунктирное внешнее кольцо — вращается в обратную сторону
    ctx.save();
    ctx.rotate(-rotAngle * 0.43);
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2); // было 26 — увеличено пропорционально R_INNER
    ctx.strokeStyle = '#FFB800';
    ctx.lineWidth = 1;
    ctx.globalAlpha = drawAlpha * 0.4;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
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
