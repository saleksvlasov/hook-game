/**
 * SkinRenderer — 10 уникальных скинов охотника для еженедельных испытаний.
 * Каждый скин — процедурная отрисовка (без ассетов).
 *
 * Скины:
 *  0  — Default (базовый neon western)
 *  1  — Ghost (призрачный белый с голубым свечением)
 *  2  — Inferno (огненный, красно-оранжевый)
 *  3  — Plague Doctor (чумной доктор, маска-клюв)
 *  4  — Samurai (самурайская броня + катана)
 *  5  — Phantom (невидимка, полупрозрачный + глитч)
 *  6  — Gold Baron (золотой барон, весь в золоте)
 *  7  — Frost Walker (ледяной, бело-голубой)
 *  8  — Blood Moon (кровавая луна, тёмно-красный)
 *  9  — Neon Reaper (жнец, розово-фиолетовый + коса)
 *  10 — Void Hunter (пустотный, чёрный + фиолетовые разломы)
 */

// Определения скинов — цвета и особенности
export const SKINS = [
  {
    id: 'default',
    name: { en: 'Bounty Hunter', ru: 'Охотник за головами' },
    body: 0x1A1030, outline: 0x00F5D4, outlineAlpha: 0.5,
    hat: 0xFFB800, hatBand: 0x00F5D4, buckle: 0xFFB800,
    face: 0xE8D0B0, eyes: 0x0A0E1A,
    pants: 0x0E0A18, boots: 0x151020,
    coat: 0x1A1030, belt: 0x00F5D4,
    special: null,
    week: 0, // всегда доступен
  },
  {
    id: 'ghost',
    name: { en: 'Ghost', ru: 'Призрак' },
    body: 0xC8D8E8, outline: 0x88CCFF, outlineAlpha: 0.6,
    hat: 0xAABBDD, hatBand: 0x88CCFF, buckle: 0xAABBDD,
    face: 0xE8F0FF, eyes: 0x4488CC,
    pants: 0xB0C0D8, boots: 0x9AB0C8,
    coat: 0xC8D8E8, belt: 0x88CCFF,
    special: 'ghost', // полупрозрачный + мерцание
    week: 1,
  },
  {
    id: 'inferno',
    name: { en: 'Inferno', ru: 'Инферно' },
    body: 0x8B1A00, outline: 0xFF4500, outlineAlpha: 0.7,
    hat: 0xFF6B00, hatBand: 0xFFAA00, buckle: 0xFFCC00,
    face: 0xE8C0A0, eyes: 0xFF2200,
    pants: 0x5A1000, boots: 0x3A0800,
    coat: 0x8B1A00, belt: 0xFF4500,
    special: 'fire', // огненные частицы
    week: 2,
  },
  {
    id: 'plague',
    name: { en: 'Plague Doctor', ru: 'Чумной Доктор' },
    body: 0x1A1A1A, outline: 0x44CC44, outlineAlpha: 0.4,
    hat: 0x222222, hatBand: 0x44CC44, buckle: 0x44CC44,
    face: 0x2A2A2A, eyes: 0x44CC44, // маска — зелёные "глаза"
    pants: 0x151515, boots: 0x0A0A0A,
    coat: 0x1A1A1A, belt: 0x333333,
    special: 'beak', // клюв маски
    week: 3,
  },
  {
    id: 'samurai',
    name: { en: 'Samurai', ru: 'Самурай' },
    body: 0x8B0000, outline: 0xFFD700, outlineAlpha: 0.5,
    hat: 0xCC0000, hatBand: 0xFFD700, buckle: 0xFFD700,
    face: 0xF0D0A0, eyes: 0x1A0A00,
    pants: 0x5A0000, boots: 0x3A0A0A,
    coat: 0x8B0000, belt: 0xFFD700,
    special: 'katana', // катана за спиной
    week: 4,
  },
  {
    id: 'phantom',
    name: { en: 'Phantom', ru: 'Фантом' },
    body: 0x2A1A3A, outline: 0xAA66FF, outlineAlpha: 0.3,
    hat: 0x3A2A4A, hatBand: 0xAA66FF, buckle: 0xAA66FF,
    face: 0xD0B8E8, eyes: 0xAA66FF,
    pants: 0x1A0E28, boots: 0x150A20,
    coat: 0x2A1A3A, belt: 0x6633AA,
    special: 'glitch', // глитч-полоски
    week: 5,
  },
  {
    id: 'gold_baron',
    name: { en: 'Gold Baron', ru: 'Золотой Барон' },
    body: 0xAA8800, outline: 0xFFDD00, outlineAlpha: 0.7,
    hat: 0xFFCC00, hatBand: 0xFFFFAA, buckle: 0xFFDD00,
    face: 0xF0DDB0, eyes: 0x6A4400,
    pants: 0x886600, boots: 0x775500,
    coat: 0xAA8800, belt: 0xFFCC00,
    special: 'sparkle', // золотые искры
    week: 6,
  },
  {
    id: 'frost',
    name: { en: 'Frost Walker', ru: 'Ледяной Странник' },
    body: 0x4488AA, outline: 0x88DDFF, outlineAlpha: 0.6,
    hat: 0x66AACC, hatBand: 0xAAEEFF, buckle: 0xCCF0FF,
    face: 0xD0E8F0, eyes: 0x2266AA,
    pants: 0x336688, boots: 0x225577,
    coat: 0x4488AA, belt: 0x88CCEE,
    special: 'frost', // кристаллики льда
    week: 7,
  },
  {
    id: 'blood_moon',
    name: { en: 'Blood Moon', ru: 'Кровавая Луна' },
    body: 0x3A0010, outline: 0xFF1744, outlineAlpha: 0.6,
    hat: 0x5A0020, hatBand: 0xFF1744, buckle: 0xFF4444,
    face: 0xD0A0A0, eyes: 0xFF0000,
    pants: 0x2A000A, boots: 0x1A0005,
    coat: 0x3A0010, belt: 0x880020,
    special: 'blood_drip', // кровавые капли
    week: 8,
  },
  {
    id: 'neon_reaper',
    name: { en: 'Neon Reaper', ru: 'Неоновый Жнец' },
    body: 0x1A0030, outline: 0xFF2E63, outlineAlpha: 0.6,
    hat: 0x2A0048, hatBand: 0xFF2E63, buckle: 0xFF69B4,
    face: 0x0A0A0A, eyes: 0xFF2E63, // капюшон — тёмное лицо, горящие глаза
    pants: 0x150028, boots: 0x0E0018,
    coat: 0x1A0030, belt: 0xAA1155,
    special: 'scythe', // неоновая коса
    week: 9,
  },
  {
    id: 'void_hunter',
    name: { en: 'Void Hunter', ru: 'Пустотный Охотник' },
    body: 0x050508, outline: 0x8833FF, outlineAlpha: 0.5,
    hat: 0x0A0A10, hatBand: 0x8833FF, buckle: 0xAA55FF,
    face: 0x202030, eyes: 0x8833FF,
    pants: 0x030305, boots: 0x020203,
    coat: 0x050508, belt: 0x5522AA,
    special: 'void_cracks', // фиолетовые разломы на теле
    week: 10,
  },
];

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
