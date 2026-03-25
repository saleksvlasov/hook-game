/**
 * SkinData — определения 11 скинов охотника для еженедельных испытаний.
 * Каждый скин — набор цветов и спецэффектов (без логики отрисовки).
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
