// ===================== ИГРОВЫЕ КОНСТАНТЫ =====================

// Физика — расчёт [MATH] агента v2
export const GRAVITY = 980;              // Маятник (не arcade! arcade.gravity.y = 550 в main.js)
export const HOOK_RANGE = 300;           // Было 380→200(сломано). Достаёшь ближайший, но не через один
export const MAX_ROPE_LENGTH = 220;      // Период ~3s, макс v=657 px/s при 90° амплитуде
export const MIN_ROPE = 50;
export const SWING_FRICTION = 0.9992;    // Было 0.9996 — 4.7%/сек потеря, 3 качания = -20% энергии
export const RELEASE_BOOST = 1.25;       // Было 1.4→1.15(слишком мало). Хороший swing достаёт
export const TRAIL_SPEED_THRESHOLD = 150;

// Хук: штраф за падение — чем быстрее падаешь, тем меньше радиус зацепа
export const FALL_SPEED_PENALTY_START = 200;  // px/s — начало штрафа
export const FALL_SPEED_PENALTY_MAX = 1000;   // px/s — максимальный штраф
export const HOOK_RANGE_FALLING_MIN = 0.5;    // множитель — 150px при макс штрафе

// Кулдаун хука — нельзя мгновенно перецепиться
export const HOOK_COOLDOWN = 180;         // ms после отпускания
export const MIN_SWING_SPEED = 1.5;       // Начальный толчок маятника (rad/s)

// Мир
export const WORLD_HEIGHT = 100000;
export const ANCHOR_SPACING_Y = 240;     // Вертикаль между крюками
export const GROUND_Y = WORLD_HEIGHT - 10;
export const SPAWN_Y = WORLD_HEIGHT - 400;

// Пасхалки
export const BOUNTY_HEIGHT = 500;
export const MOON_HEIGHT = 1500;

// Препятствия — жуки
export const OBSTACLE_START_HEIGHT = 50;    // метры — начало спавна (ближе для видимости)
export const OBSTACLE_CHANCE = 0.4;         // 40% шанс жука на уровне каждого крюка
export const OBSTACLE_HIT_RADIUS = 22;      // пиксели — радиус коллизии

// Сердца / жизни
export const HEARTS_MAX = 6;                  // Половинки (3 полных сердца)
export const HEARTS_MAX_BONUS = 8;            // С бонусом (4 полных сердца)
export const HEART_DAMAGE = 1;                // Урон от жука (1 половинка = 0.5 сердца)
export const HEART_PICKUP_CHANCE = 0.08;      // 8% шанс на уровне
export const HEART_PICKUP_MIN_HEIGHT = 150;   // Минимальная высота для спавна (метры)
export const HEART_PICKUP_MIN_DISTANCE = 15000; // Минимум 1500м между пикапами (пиксели)
export const HEART_PICKUP_RADIUS = 28;        // Радиус коллизии пикапа
export const HEART_BONUS_DURATION = 40000;    // 40 секунд бонусного 4-го сердца

// ===== ПАЛИТРА NEON WESTERN =====
// Неоновый вестерн — яркий неон на глубоком тёмном фоне
export const NEON_CYAN = '#00F5D4';
export const NEON_CYAN_HEX = 0x00F5D4;
export const NEON_PINK = '#FF2E63';
export const NEON_PINK_HEX = 0xFF2E63;
export const NEON_AMBER = '#FFB800';
export const NEON_AMBER_HEX = 0xFFB800;

export const GOLD = '#FFB800';           // Neon Amber (замена янтаря)
export const GOLD_HEX = 0xFFB800;
export const EMBER = '#FF6B35';          // Тлеющий неон (тёплый trail)
export const EMBER_HEX = 0xFF6B35;
export const DARK_RED = '#FF2E63';       // Neon Pink — опасность, смерть
export const DARK_RED_HEX = 0xFF2E63;
export const RUST = 0x00F5D4;            // Neon Cyan — крюки, активные элементы
export const BG_DARK = '#0A0E1A';        // Глубокий navy-black
export const BG_DARK_HEX = 0x0A0E1A;

// Охотник
export const HUNTER_BODY = 0x1A1030;     // Тёмный силуэт (deep purple)
export const HUNTER_FACE = 0xE8D0B0;
export const TRAIL_COLOR = 0x00F5D4;     // Cyan trail

// Стальная палитра — нейтральные тона
export const STEEL = 0x2A3050;
export const STEEL_LIGHT = 0x4A5580;
export const STEEL_HEX = '#2A3050';
export const STEEL_LIGHT_HEX = '#4A5580';

// UI акценты
export const BLOOD_RED_HEX = 0xFF2E63;  // Neon Pink
export const BRASS_HEX = 0x00F5D4;      // Neon Cyan (крюки, кнопки)
export const HINT_COLOR = '#00F5D4';     // Cyan подсказки
export const RECORD_COLOR = '#FFB800';   // Neon Amber рекорд
export const AMBER_GLOW = 0x00F5D4;     // Cyan свечение (крюки, кнопки)

// Шрифт — современный sans-serif
export const FONT = "'Inter', 'Helvetica Neue', sans-serif";
// Моноширинный шрифт — для HUD чисел (neon glow)
export const FONT_MONO = "'Share Tech Mono', monospace";

// ===== БИОМЫ =====
export const BIOMES = [
  {
    name: 'foundry',          // Глубокий navy — начальная зона
    startHeight: 0,
    endHeight: 1500,
    bgTop: '#0A0E1A',
    bgMid: '#121830',
    bgBot: '#0E1225',
    fogColor: 0x101828,
    fogAlpha: 0.10,
    particleColor: 0x00F5D4,  // Cyan искры
    particleAlpha: 0.45,
    parallaxColor: 0x2A3050,
    parallaxAlpha: 0.30,
  },
  {
    name: 'ironworks',        // Purple-navy — таинственная зона
    startHeight: 1500,
    endHeight: 3000,
    bgTop: '#0E0A20',
    bgMid: '#1A1035',
    bgBot: '#150D28',
    fogColor: 0x1A1035,
    fogAlpha: 0.12,
    particleColor: 0xFFB800,  // Amber искры
    particleAlpha: 0.40,
    parallaxColor: 0x2A1845,
    parallaxAlpha: 0.25,
  },
  {
    name: 'furnace',          // Deep red-purple — опасная зона
    startHeight: 3000,
    endHeight: 5000,
    bgTop: '#1A0520',
    bgMid: '#2A0830',
    bgBot: '#200620',
    fogColor: 0x2A0830,
    fogAlpha: 0.14,
    particleColor: 0xFF2E63,  // Pink искры
    particleAlpha: 0.50,
    parallaxColor: 0x3A1040,
    parallaxAlpha: 0.30,
  },
  {
    name: 'storm',            // Electric blue — грозовая зона
    startHeight: 5000,
    endHeight: 7000,
    bgTop: '#050E25',
    bgMid: '#0A1840',
    bgBot: '#081535',
    fogColor: 0x0A1840,
    fogAlpha: 0.16,
    particleColor: 0xE0F0FF,  // White-blue искры
    particleAlpha: 0.35,
    parallaxColor: 0x1A2850,
    parallaxAlpha: 0.32,
  },
  {
    name: 'cosmos',           // Deep space — финальная зона
    startHeight: 7000,
    endHeight: 99999,
    bgTop: '#050510',
    bgMid: '#0A0A20',
    bgBot: '#080818',
    fogColor: 0x0A0A20,
    fogAlpha: 0.08,
    particleColor: 0xFFFFFF,  // Белые звёзды
    particleAlpha: 0.60,
    parallaxColor: 0x151530,
    parallaxAlpha: 0.20,
  },
];

// Z-индексы убраны — порядок отрисовки определяется порядком вызовов draw() в update()
