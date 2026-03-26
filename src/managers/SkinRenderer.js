/**
 * SkinRenderer — процедурная отрисовка скинов охотника.
 * Canvas 2D API вместо Phaser Graphics.
 * Данные скинов вынесены в SkinData.js.
 */

import { SKINS } from '../data/SkinData.js';

// Реэкспорт SKINS для обратной совместимости
export { SKINS } from '../data/SkinData.js';

// Хелпер: Phaser hex (number) → CSS строка
function hexCSS(hex) {
  if (typeof hex === 'string') return hex;
  return '#' + hex.toString(16).padStart(6, '0');
}

// Хелпер: fillRoundedRect через ctx.roundRect
function fillRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  ctx.fill();
}

// Хелпер: strokeRoundedRect
function strokeRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
  ctx.stroke();
}

// Хелпер: fillEllipse (Phaser fillEllipse = center based)
function fillEllipse(ctx, cx, cy, w, h) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

// Хелпер: fillCircle
function fillCircle(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

// Хелпер: lineBetween
function lineBetween(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

// Хелпер: fillTriangle
function fillTriangle(ctx, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

/**
 * Рисует скин охотника на Canvas 2D context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} skinIndex — индекс в массиве SKINS (0-10)
 * @param {number} coatAngle — угол для анимации пальто
 */
export function drawSkinPose(ctx, skinIndex, coatAngle) {
  const skin = SKINS[skinIndex] || SKINS[0];

  ctx.save();

  // Outline — неоновое свечение
  ctx.globalAlpha = skin.outlineAlpha;
  ctx.strokeStyle = hexCSS(skin.outline);
  ctx.lineWidth = 2;
  strokeRoundedRect(ctx, -10, -24, 20, 50, 3);

  ctx.globalAlpha = 1;

  // Пальто полы (анимация ветра)
  ctx.fillStyle = hexCSS(skin.coat);
  const sway = Math.sin(coatAngle) * 4;
  fillTriangle(ctx, -9, 10, -14 + sway, 26, -3, 24);
  fillTriangle(ctx, 9, 10, 14 + sway, 26, 3, 24);

  // Тело
  ctx.fillStyle = hexCSS(skin.body);
  fillRoundedRect(ctx, -8, -2, 16, 18, 2);

  // Пояс + пряжка
  ctx.fillStyle = hexCSS(skin.belt);
  ctx.fillRect(-8, 8, 16, 2);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = hexCSS(skin.buckle);
  ctx.fillRect(-2, 7, 4, 4);
  ctx.globalAlpha = 1;

  // === Спец-элементы по типу скина ===

  if (skin.special === 'beak') {
    // Plague Doctor — клюв
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = hexCSS(skin.hat);
    fillEllipse(ctx, 0, -14, 30, 8);
    ctx.fillStyle = hexCSS(skin.body);
    fillRoundedRect(ctx, -7, -26, 14, 14, 2);
    ctx.fillStyle = hexCSS(skin.hatBand);
    ctx.fillRect(-7, -15, 14, 2);
    ctx.fillStyle = '#2A2A2A';
    ctx.fillRect(-4, -11, 8, 5);
    ctx.fillStyle = '#333333';
    fillTriangle(ctx, -2, -6, 2, -6, 0, 2);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = hexCSS(skin.eyes);
    fillCircle(ctx, -2, -9, 1.5);
    fillCircle(ctx, 2, -9, 1.5);
    ctx.globalAlpha = 1;
  } else if (skin.special === 'katana') {
    // Samurai — шлем кабуто
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = hexCSS(skin.hat);
    fillRoundedRect(ctx, -10, -24, 20, 12, 3);
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = hexCSS(skin.hatBand);
    ctx.lineWidth = 2;
    lineBetween(ctx, -3, -24, -10, -32);
    lineBetween(ctx, 3, -24, 10, -32);
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = hexCSS(skin.hat);
    ctx.fillRect(-5, -12, 10, 4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = hexCSS(skin.face);
    ctx.fillRect(-4, -10, 8, 3);
    ctx.fillStyle = hexCSS(skin.eyes);
    fillCircle(ctx, -2, -9, 1);
    fillCircle(ctx, 2, -9, 1);
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 2;
    lineBetween(ctx, 6, -18, 14, 20);
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = hexCSS(skin.hatBand);
    ctx.lineWidth = 1.5;
    lineBetween(ctx, 6, -18, 8, -22);
    ctx.globalAlpha = 1;
    ctx.fillStyle = hexCSS(skin.hatBand);
    ctx.fillRect(-10, -15, 20, 2);
  } else if (skin.special === 'scythe') {
    // Neon Reaper — капюшон + коса
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = hexCSS(skin.body);
    fillRoundedRect(ctx, -9, -26, 18, 16, 6);
    ctx.fillStyle = 'rgba(5,0,16,0.9)';
    ctx.fillRect(-5, -12, 10, 6);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = hexCSS(skin.eyes);
    fillCircle(ctx, -2, -9, 1.5);
    fillCircle(ctx, 2, -9, 1.5);
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = hexCSS(skin.eyes);
    fillCircle(ctx, -2, -9, 4);
    fillCircle(ctx, 2, -9, 4);
    ctx.globalAlpha = 0.7;
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 2;
    lineBetween(ctx, -14, -10, -14, 24);
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = hexCSS(skin.outline);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-14, -10, 12, -Math.PI * 0.8, -Math.PI * 0.2, false);
    ctx.stroke();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = hexCSS(skin.outline);
    fillTriangle(ctx, -14, -10, -24, -16, -20, -2);
    ctx.globalAlpha = 1;
  } else if (skin.special === 'void_cracks') {
    // Void Hunter — разломы
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = hexCSS(skin.hat);
    fillEllipse(ctx, 0, -12, 28, 7);
    ctx.globalAlpha = 1;
    ctx.fillStyle = hexCSS(skin.body);
    fillRoundedRect(ctx, -7, -22, 14, 12, 2);
    ctx.fillStyle = hexCSS(skin.hatBand);
    ctx.fillRect(-7, -13, 14, 2);
    ctx.fillStyle = hexCSS(skin.face);
    ctx.fillRect(-4, -10, 8, 5);
    ctx.fillStyle = hexCSS(skin.eyes);
    fillCircle(ctx, -2, -8, 1);
    fillCircle(ctx, 2, -8, 1);
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = hexCSS(skin.outline);
    ctx.lineWidth = 1;
    lineBetween(ctx, -3, 0, -6, 8);
    lineBetween(ctx, -6, 8, -2, 14);
    lineBetween(ctx, 4, 2, 7, 10);
    lineBetween(ctx, 7, 10, 3, 16);
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = hexCSS(skin.outline);
    fillCircle(ctx, -4, 6, 5);
    fillCircle(ctx, 5, 8, 4);
    ctx.globalAlpha = 1;
  } else {
    // Стандартная шляпа
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = hexCSS(skin.hat);
    fillEllipse(ctx, 0, -12, 28, 7);
    ctx.globalAlpha = 1;
    ctx.fillStyle = hexCSS(skin.body);
    fillRoundedRect(ctx, -7, -22, 14, 12, 2);
    ctx.fillStyle = hexCSS(skin.hatBand);
    ctx.fillRect(-7, -13, 14, 2);
    ctx.fillStyle = hexCSS(skin.face);
    ctx.fillRect(-4, -10, 8, 5);
    ctx.fillStyle = hexCSS(skin.eyes);
    fillCircle(ctx, -2, -8, 1);
    fillCircle(ctx, 2, -8, 1);
  }

  // Руки
  ctx.globalAlpha = 1;
  ctx.fillStyle = hexCSS(skin.body);
  ctx.fillRect(-12, 0, 4, 11);
  ctx.fillRect(8, 0, 4, 11);
  // Кисти
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = hexCSS(skin.face);
  ctx.fillRect(-12, 10, 4, 3);
  ctx.fillRect(8, 10, 4, 3);

  // Ноги
  ctx.globalAlpha = 1;
  ctx.fillStyle = hexCSS(skin.pants);
  ctx.fillRect(-6, 16, 5, 8);
  ctx.fillRect(1, 16, 5, 8);

  // Сапоги
  ctx.fillStyle = hexCSS(skin.boots);
  ctx.fillRect(-7, 22, 6, 4);
  ctx.fillRect(1, 22, 6, 4);

  // === Спецэффекты ===

  if (skin.special === 'glitch') {
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = hexCSS(skin.outline);
    ctx.fillRect(-12, -5, 24, 2);
    ctx.fillRect(-10, 5, 20, 1);
    ctx.fillRect(-14, 15, 28, 2);
  }

  if (skin.special === 'frost') {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#CCEEFF';
    fillCircle(ctx, -8, -4, 2);
    fillCircle(ctx, 9, 6, 1.5);
    fillCircle(ctx, -5, 18, 1.5);
    fillCircle(ctx, 6, 14, 2);
  }

  if (skin.special === 'sparkle') {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FFFF88';
    fillCircle(ctx, -6, -2, 1);
    fillCircle(ctx, 7, 4, 1.5);
    fillCircle(ctx, -3, 12, 1);
    fillCircle(ctx, 5, -16, 1);
    fillCircle(ctx, -8, 8, 1);
  }

  if (skin.special === 'blood_drip') {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#FF1744';
    ctx.fillRect(-6, 4, 2, 6);
    ctx.fillRect(5, 0, 2, 8);
    ctx.fillRect(-2, 10, 1, 5);
    fillCircle(ctx, -6, 10, 1.5);
    fillCircle(ctx, 5, 8, 1.5);
  }

  ctx.restore();
}
