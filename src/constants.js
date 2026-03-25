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
export const HOOK_RANGE_FALLING_MIN = 0.3;    // множитель — 60px при макс штрафе

// Кулдаун хука — нельзя мгновенно перецепиться
export const HOOK_COOLDOWN = 180;         // ms после отпускания
export const MIN_SWING_SPEED = 1.5;       // Начальный толчок маятника (rad/s)

// Мир
export const WORLD_HEIGHT = 100000;
export const ANCHOR_SPACING_Y = 240;     // Вертикаль между крюками
export const GROUND_Y = WORLD_HEIGHT - 10;
export const SPAWN_Y = WORLD_HEIGHT - 400;

// Пасхалки
export const BOUNTY_HEIGHT = 1000;
export const MOON_HEIGHT = 3000;

// Препятствия — жуки
export const OBSTACLE_START_HEIGHT = 50;    // метры — начало спавна (ближе для видимости)
export const OBSTACLE_CHANCE = 0.4;         // 40% шанс жука на уровне каждого крюка
export const OBSTACLE_HIT_RADIUS = 22;      // пиксели — радиус коллизии

// ===== ПАЛИТРА PREMIUM AMBER & SLATE =====
// Основные цвета — тёплый янтарь на глубоком navy-slate
export const GOLD = '#F5B842';           // Насыщенный тёплый янтарь (ярче, теплее)
export const GOLD_HEX = 0xF5B842;
export const EMBER = '#FF7A45';          // Тлеющий уголь (теплее)
export const EMBER_HEX = 0xFF7A45;
export const DARK_RED = '#D42A4A';       // Алый — ярче для контраста на тёмном фоне
export const DARK_RED_HEX = 0xD42A4A;
export const RUST = 0x9B6E4C;            // Тёплая ржавчина (светлее для видимости)
export const BG_DARK = '#141822';        // Глубокий navy (НЕ чёрный, НЕ серый)
export const BG_DARK_HEX = 0x141822;

// Охотник
export const HUNTER_BODY = 0x4A3525;     // Тёмная кожа
export const HUNTER_FACE = 0xF0DDB0;
export const TRAIL_COLOR = 0xFF7A45;     // Ember trail (теплее)

// Стальная палитра — светлее для лучшей читаемости
export const STEEL = 0x4A5068;
export const STEEL_LIGHT = 0x6E7588;
export const STEEL_HEX = '#4A5068';
export const STEEL_LIGHT_HEX = '#6E7588';

// UI акценты
export const BLOOD_RED_HEX = 0x8B0000;
export const BRASS_HEX = 0xC8A85E;      // Ярче для читаемости
export const HINT_COLOR = '#C8A050';     // Значительно ярче — читаемая подсказка
export const RECORD_COLOR = '#A09060';   // Теплее, читаемее
export const AMBER_GLOW = 0xF5B842;     // Для свечений (совпадает с GOLD)

// Шрифт — Georgia bold, premium gothic feel
export const FONT = 'Georgia, serif';

// ===== БИОМЫ =====
export const BIOMES = [
  {
    name: 'foundry',
    startHeight: 0,
    endHeight: 1500,
    bgTop: '#222838',
    bgMid: '#2e3545',
    bgBot: '#283040',
    fogColor: 0x353a48,
    fogAlpha: 0.10,
    particleColor: 0xFF6B35,
    particleAlpha: 0.45,
    parallaxColor: 0x4A5068,
    parallaxAlpha: 0.30,
  },
  {
    name: 'ironworks',
    startHeight: 1500,
    endHeight: 3000,
    bgTop: '#282530',
    bgMid: '#352e40',
    bgBot: '#302838',
    fogColor: 0x403025,
    fogAlpha: 0.12,
    particleColor: 0xF0A030,
    particleAlpha: 0.40,
    parallaxColor: 0x6A4830,
    parallaxAlpha: 0.25,
  },
  {
    name: 'furnace',
    startHeight: 3000,
    endHeight: 5000,
    bgTop: '#352820',
    bgMid: '#483520',
    bgBot: '#3D2E20',
    fogColor: 0x483010,
    fogAlpha: 0.14,
    particleColor: 0xFF4500,
    particleAlpha: 0.50,
    parallaxColor: 0x804020,
    parallaxAlpha: 0.30,
  },
  {
    name: 'storm',
    startHeight: 5000,
    endHeight: 7000,
    bgTop: '#1a2238',
    bgMid: '#283550',
    bgBot: '#202a45',
    fogColor: 0x304060,
    fogAlpha: 0.16,
    particleColor: 0x88AACC,
    particleAlpha: 0.35,
    parallaxColor: 0x4A5878,
    parallaxAlpha: 0.32,
  },
  {
    name: 'cosmos',
    startHeight: 7000,
    endHeight: 99999,
    bgTop: '#101525',
    bgMid: '#182238',
    bgBot: '#141a30',
    fogColor: 0x203050,
    fogAlpha: 0.08,
    particleColor: 0xFFFFFF,
    particleAlpha: 0.60,
    parallaxColor: 0x385080,
    parallaxAlpha: 0.20,
  },
];

// Z-индексы (слои отрисовки)
export const Z = {
  BG:         -10,
  MOON:       -9,
  BIOME_FAR:  -8,
  TREE_FAR:   -7,
  TREE_NEAR:  -6,
  ASH:        -5,
  FOG:        -4,
  SWAMP:       1,
  SWAMP_BUBBLES: 2,
  ANCHORS:     2,
  OBSTACLES:   3,   // между trail и rope
  TRAIL:       3,
  ROPE:        4,
  PLAYER:      5,
  HUD:        20,
  EASTER:     24,
  EASTER_TEXT: 25,
  BLOOD:      29,
  GAME_OVER:  30,
  TRANSITION: 50,
  HTML_BUTTONS: 100,
};
