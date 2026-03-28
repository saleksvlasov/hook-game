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
export const EMBER = '#FF6B35';          // Ember Orange — валюта, кузница, trail
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

// ===== STEERING BEHAVIORS =====
// Параметры для каждого типа жука — Craig Reynolds steering
export const STEERING = {
  // Beetle — медленный бродяга, бродит вокруг базы
  beetle: {
    maxSpeed: 0.8,
    maxForce: 0.02,
    wanderRadius: 20,
    wanderDist: 40,
    wanderJitter: 0.3,
    containRadiusX: 50,
    containRadiusY: 25,
  },
  // Spider — патруль между точками паутины
  spider: {
    maxSpeed: 1.2,
    maxForce: 0.04,
    arriveSlowRadius: 30,
    patrolPoints: 3,
    patrolRadiusX: 40,
    patrolRadiusY: 50,
    containRadiusX: 60,
    containRadiusY: 70,
  },
  // Scorpion — агрессивный, ходит к игроку но убегает если слишком близко
  scorpion: {
    maxSpeed: 1.5,
    maxForce: 0.05,
    wanderRadius: 15,
    wanderDist: 30,
    wanderJitter: 0.4,
    fleeRadius: 80,
    fleeWeight: 1.5,
    wanderWeight: 0.6,
    containRadiusX: 60,
    containRadiusY: 45,
  },
  // Firefly — хаотичный мерцающий бродяга
  firefly: {
    maxSpeed: 0.6,
    maxForce: 0.015,
    wanderRadius: 25,
    wanderDist: 50,
    wanderJitter: 0.8,
    containRadiusX: 40,
    containRadiusY: 30,
  },
};

// ===== POWER ARC — визуальная прогрессия внутри рана =====
export const POWER_ARC_TIERS = [
  { name: 'novice',      startHeight: 0,    endHeight: 500,   ropeWidth: 2.5, ropeGlow: 0,    trailSizeMult: 1.0, trailSpawnMult: 1.0, hunterGlow: 0 },
  { name: 'apprentice',  startHeight: 500,  endHeight: 1500,  ropeWidth: 3.0, ropeGlow: 0.15, trailSizeMult: 1.2, trailSpawnMult: 1.3, hunterGlow: 0.1 },
  { name: 'journeyman',  startHeight: 1500, endHeight: 3000,  ropeWidth: 3.5, ropeGlow: 0.3,  trailSizeMult: 1.5, trailSpawnMult: 1.6, hunterGlow: 0.25 },
  { name: 'master',      startHeight: 3000, endHeight: 5000,  ropeWidth: 4.0, ropeGlow: 0.5,  trailSizeMult: 1.8, trailSpawnMult: 2.0, hunterGlow: 0.4 },
  { name: 'legend',      startHeight: 5000, endHeight: 99999, ropeWidth: 5.0, ropeGlow: 0.8,  trailSizeMult: 2.5, trailSpawnMult: 2.5, hunterGlow: 0.7 },
];

// ===== EMBER ECONOMY =====
export const EMBER_RATE = 0.05;  // 1 ember за 20м высоты
export const EMBER_MILESTONES = [
  { height: 100, bonus: 15 },
  { height: 500, bonus: 40 },
  { height: 1000, bonus: 80 },
  { height: 2000, bonus: 150 },
  { height: 3000, bonus: 300 },
];

export const UPGRADES = {
  iron_heart: { maxLevel: 3, effect: 1, costs: [300, 800, 1800] },
};

// ===== ROGUELITE PERK PICKUPS =====
export const PERK_PICKUP_START_HEIGHT = 30;    // метры — начало спавна
export const PERK_PICKUP_RADIUS = 40;          // px коллизии при подборе (было 26 → 40, легче подобрать)

export const PERK_PICKUPS = {
  hook_range: {
    chance: 0.100,       // было 0.020 → x5
    minDistance: 300,    // было 1200 → /4 (px между пикапами одного типа)
    maxLevel: 6,
    effect: 0.04,      // +4% per level → max +24%
    color: '#00F5D4',  // Cyan
    label: '\u2295',   // ⊕ CIRCLED PLUS — geometric, не emoji, всегда следует fillStyle
  },
  swing_power: {
    chance: 0.120,       // было 0.020 → x6
    minDistance: 250,    // было 1000
    maxLevel: 10,
    effect: 0.03,
    color: '#FF2E63',  // Pink
    label: '\u21AF',   // ↯ DOWNWARDS ZIGZAG ARROW — geometric, не emoji
  },
  quick_hook: {
    chance: 0.040,       // было 0.0075 → x5
    minDistance: 600,    // было 2000
    maxLevel: 3,
    effect: 0.10,
    color: '#FFB800',  // Amber
    label: '◈',
  },
  ember_magnet: {
    chance: 0.040,       // было 0.0075 → x5
    minDistance: 600,    // было 2000
    maxLevel: 5,
    effect: 0.10,
    color: '#FF6B35',  // Orange
    label: '◉',
  },
};

export const SHIELD_COST = 300;
export const SHIELD_DURATION = 40000; // 40 секунд
export const SHIELD_RADIUS = 33; // радиус отталкивания жуков

export const SAW_COST = 600;
export const SAW_DURATION = 60000; // 60 секунд
export const SAW_RADIUS = 45; // радиус уничтожения жуков

// Z-индексы убраны — порядок отрисовки определяется порядком вызовов draw() в update()
