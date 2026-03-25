/**
 * SkinRenderer — процедурная отрисовка скинов охотника.
 * Данные скинов вынесены в SkinData.js.
 */

import { SKINS } from '../data/SkinData.js';

// Реэкспорт SKINS для обратной совместимости
export { SKINS } from '../data/SkinData.js';

/**
 * Рисует скин охотника на Graphics объекте.
 * @param {Phaser.GameObjects.Graphics} g
 * @param {number} skinIndex — индекс в массиве SKINS (0-10)
 * @param {number} coatAngle — угол для анимации пальто
 */
export function drawSkinPose(g, skinIndex, coatAngle) {
  g.clear();
  const skin = SKINS[skinIndex] || SKINS[0];

  // Outline — неоновое свечение
  g.lineStyle(2, skin.outline, skin.outlineAlpha);
  g.strokeRoundedRect(-10, -24, 20, 50, 3);

  // Пальто полы (анимация ветра)
  g.fillStyle(skin.coat);
  const sway = Math.sin(coatAngle) * 4;
  g.fillTriangle(-9, 10, -14 + sway, 26, -3, 24);
  g.fillTriangle(9, 10, 14 + sway, 26, 3, 24);

  // Тело
  g.fillStyle(skin.body);
  g.fillRoundedRect(-8, -2, 16, 18, 2);

  // Пояс + пряжка
  g.fillStyle(skin.belt);
  g.fillRect(-8, 8, 16, 2);
  g.fillStyle(skin.buckle, 0.8);
  g.fillRect(-2, 7, 4, 4);

  // === Спец-элементы по типу скина ===

  // Plague Doctor — клюв вместо стандартного лица
  if (skin.special === 'beak') {
    // Шляпа (широкополая)
    g.fillStyle(skin.hat, 0.9);
    g.fillEllipse(0, -14, 30, 8);
    // Тулья (высокая)
    g.fillStyle(skin.body);
    g.fillRoundedRect(-7, -26, 14, 14, 2);
    g.fillStyle(skin.hatBand);
    g.fillRect(-7, -15, 14, 2);
    // Маска-клюв
    g.fillStyle(0x2A2A2A);
    g.fillRect(-4, -11, 8, 5);
    // Клюв вниз
    g.fillStyle(0x333333);
    g.fillTriangle(-2, -6, 2, -6, 0, 2);
    // Глаза-линзы
    g.fillStyle(skin.eyes, 0.8);
    g.fillCircle(-2, -9, 1.5);
    g.fillCircle(2, -9, 1.5);
  }
  // Samurai — шлем кабуто
  else if (skin.special === 'katana') {
    // Шлем кабуто
    g.fillStyle(skin.hat, 0.9);
    g.fillRoundedRect(-10, -24, 20, 12, 3);
    // Рога мэдатэ
    g.lineStyle(2, skin.hatBand, 0.8);
    g.lineBetween(-3, -24, -10, -32);
    g.lineBetween(3, -24, 10, -32);
    // Менпо (маска)
    g.fillStyle(skin.hat, 0.7);
    g.fillRect(-5, -12, 10, 4);
    // Лицо
    g.fillStyle(skin.face);
    g.fillRect(-4, -10, 8, 3);
    // Глаза
    g.fillStyle(skin.eyes);
    g.fillCircle(-2, -9, 1);
    g.fillCircle(2, -9, 1);
    // Катана за спиной (диагональ)
    g.lineStyle(2, 0xCCCCCC, 0.6);
    g.lineBetween(6, -18, 14, 20);
    g.lineStyle(1.5, skin.hatBand, 0.5);
    g.lineBetween(6, -18, 8, -22);
    // Лента шлема
    g.fillStyle(skin.hatBand);
    g.fillRect(-10, -15, 20, 2);
  }
  // Neon Reaper — капюшон + коса
  else if (skin.special === 'scythe') {
    // Капюшон (вместо шляпы)
    g.fillStyle(skin.body, 0.9);
    g.fillRoundedRect(-9, -26, 18, 16, 6);
    // Тень лица (темнота под капюшоном)
    g.fillStyle(0x050010, 0.9);
    g.fillRect(-5, -12, 10, 6);
    // Горящие глаза
    g.fillStyle(skin.eyes, 0.9);
    g.fillCircle(-2, -9, 1.5);
    g.fillCircle(2, -9, 1.5);
    // Свечение глаз
    g.fillStyle(skin.eyes, 0.2);
    g.fillCircle(-2, -9, 4);
    g.fillCircle(2, -9, 4);
    // Коса — древко
    g.lineStyle(2, 0x555555, 0.7);
    g.lineBetween(-14, -10, -14, 24);
    // Лезвие косы
    g.lineStyle(2, skin.outline, 0.8);
    g.beginPath();
    g.arc(-14, -10, 12, -Math.PI * 0.8, -Math.PI * 0.2, false);
    g.strokePath();
    g.fillStyle(skin.outline, 0.3);
    g.fillTriangle(-14, -10, -24, -16, -20, -2);
  }
  // Void Hunter — разломы
  else if (skin.special === 'void_cracks') {
    // Стандартная шляпа
    g.fillStyle(skin.hat, 0.8);
    g.fillEllipse(0, -12, 28, 7);
    g.fillStyle(skin.body);
    g.fillRoundedRect(-7, -22, 14, 12, 2);
    g.fillStyle(skin.hatBand);
    g.fillRect(-7, -13, 14, 2);
    // Лицо
    g.fillStyle(skin.face);
    g.fillRect(-4, -10, 8, 5);
    g.fillStyle(skin.eyes);
    g.fillCircle(-2, -8, 1);
    g.fillCircle(2, -8, 1);
    // Фиолетовые разломы на теле
    g.lineStyle(1, skin.outline, 0.6);
    g.lineBetween(-3, 0, -6, 8);
    g.lineBetween(-6, 8, -2, 14);
    g.lineBetween(4, 2, 7, 10);
    g.lineBetween(7, 10, 3, 16);
    // Свечение из разломов
    g.fillStyle(skin.outline, 0.15);
    g.fillCircle(-4, 6, 5);
    g.fillCircle(5, 8, 4);
  }
  // Все остальные скины — стандартная структура
  else {
    // Шляпа — поля
    g.fillStyle(skin.hat, 0.8);
    g.fillEllipse(0, -12, 28, 7);
    // Тулья
    g.fillStyle(skin.body);
    g.fillRoundedRect(-7, -22, 14, 12, 2);
    // Лента
    g.fillStyle(skin.hatBand);
    g.fillRect(-7, -13, 14, 2);
    // Лицо
    g.fillStyle(skin.face);
    g.fillRect(-4, -10, 8, 5);
    // Глаза
    g.fillStyle(skin.eyes);
    g.fillCircle(-2, -8, 1);
    g.fillCircle(2, -8, 1);
  }

  // Руки
  g.fillStyle(skin.body);
  g.fillRect(-12, 0, 4, 11);
  g.fillRect(8, 0, 4, 11);
  // Кисти
  g.fillStyle(skin.face, 0.5);
  g.fillRect(-12, 10, 4, 3);
  g.fillRect(8, 10, 4, 3);

  // Ноги
  g.fillStyle(skin.pants);
  g.fillRect(-6, 16, 5, 8);
  g.fillRect(1, 16, 5, 8);

  // Сапоги
  g.fillStyle(skin.boots);
  g.fillRect(-7, 22, 6, 4);
  g.fillRect(1, 22, 6, 4);

  // === Спецэффекты (дополнительные слои) ===

  // Ghost — полупрозрачность обрабатывается через alpha контейнера
  // Fire — искры рисуются отдельным менеджером
  // Glitch — горизонтальные полоски смещения
  if (skin.special === 'glitch') {
    g.fillStyle(skin.outline, 0.15);
    g.fillRect(-12, -5, 24, 2);
    g.fillRect(-10, 5, 20, 1);
    g.fillRect(-14, 15, 28, 2);
  }

  // Frost — кристаллики
  if (skin.special === 'frost') {
    g.fillStyle(0xCCEEFF, 0.4);
    g.fillCircle(-8, -4, 2);
    g.fillCircle(9, 6, 1.5);
    g.fillCircle(-5, 18, 1.5);
    g.fillCircle(6, 14, 2);
  }

  // Gold sparkle — золотые точки
  if (skin.special === 'sparkle') {
    g.fillStyle(0xFFFF88, 0.5);
    g.fillCircle(-6, -2, 1);
    g.fillCircle(7, 4, 1.5);
    g.fillCircle(-3, 12, 1);
    g.fillCircle(5, -16, 1);
    g.fillCircle(-8, 8, 1);
  }

  // Blood drip — кровавые капли
  if (skin.special === 'blood_drip') {
    g.fillStyle(0xFF1744, 0.5);
    g.fillRect(-6, 4, 2, 6);
    g.fillRect(5, 0, 2, 8);
    g.fillRect(-2, 10, 1, 5);
    g.fillCircle(-6, 10, 1.5);
    g.fillCircle(5, 8, 1.5);
  }
}
