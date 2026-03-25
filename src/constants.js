// ===================== ИГРОВЫЕ КОНСТАНТЫ =====================

// Физика
export const GRAVITY = 1200;
export const HOOK_RANGE = 280;
export const MAX_ROPE_LENGTH = 160;
export const MIN_ROPE = 40;
export const SWING_FRICTION = 0.997;
export const TRAIL_SPEED_THRESHOLD = 150;

// Мир
export const WORLD_HEIGHT = 100000;
export const ANCHOR_SPACING_Y = 280;
export const GROUND_Y = WORLD_HEIGHT - 10;
export const SPAWN_Y = WORLD_HEIGHT - 200;

// Пасхалки
export const BOUNTY_HEIGHT = 100;
export const MOON_HEIGHT = 300;

// ===== ПАЛИТРА EMBER & STEEL =====
// Основные цвета
export const GOLD = '#F0A030';           // Яркий янтарь (было #C8A96E)
export const GOLD_HEX = 0xF0A030;
export const EMBER = '#FF6B35';          // Тлеющий уголь
export const EMBER_HEX = 0xFF6B35;
export const DARK_RED = '#C41E3A';       // Алый (было #6B0F0F)
export const DARK_RED_HEX = 0xC41E3A;
export const RUST = 0x8B5E3C;            // Тёплая ржавчина (было 0x7A4A1E)
export const BG_DARK = '#0d0f12';        // Тёмная сталь (было #1a0e06)
export const BG_DARK_HEX = 0x0d0f12;

// Охотник
export const HUNTER_BODY = 0x4A3525;     // Тёмная кожа
export const HUNTER_FACE = 0xF0DDB0;
export const TRAIL_COLOR = 0xFF6B35;     // Ember trail

// Стальная палитра
export const STEEL = 0x3A3D45;
export const STEEL_LIGHT = 0x5A5D65;
export const STEEL_HEX = '#3A3D45';
export const STEEL_LIGHT_HEX = '#5A5D65';

// UI акценты
export const BLOOD_RED_HEX = 0x8B0000;
export const BRASS_HEX = 0xB8964E;
export const HINT_COLOR = '#A08040';     // Теплее (было #9B8050)
export const RECORD_COLOR = '#8B7A50';   // Теплее
export const AMBER_GLOW = 0xF0A030;     // Для свечений

// Шрифт
export const FONT = 'Georgia, serif';

// ===== БИОМЫ =====
export const BIOMES = [
  {
    name: 'foundry',
    startHeight: 0,        // от земли
    endHeight: 1500,
    bgTop: '#0d0f12',
    bgMid: '#1a1c20',
    bgBot: '#12141a',
    fogColor: 0x1a1c20,
    fogAlpha: 0.06,
    particleColor: 0xFF6B35,  // ember sparks
    particleAlpha: 0.25,
    parallaxColor: 0x2A2D35,  // steel beams
    parallaxAlpha: 0.15,
  },
  {
    name: 'ironworks',
    startHeight: 1500,
    endHeight: 3000,
    bgTop: '#12141a',
    bgMid: '#1e1a22',
    bgBot: '#1a1620',
    fogColor: 0x221a18,
    fogAlpha: 0.08,
    particleColor: 0xF0A030,  // amber sparks
    particleAlpha: 0.20,
    parallaxColor: 0x3D2A20,  // rusty pipes
    parallaxAlpha: 0.12,
  },
  {
    name: 'furnace',
    startHeight: 3000,
    endHeight: 5000,
    bgTop: '#1a1210',
    bgMid: '#2a1810',
    bgBot: '#1e1412',
    fogColor: 0x2a1808,
    fogAlpha: 0.10,
    particleColor: 0xFF4500,  // hot embers
    particleAlpha: 0.30,
    parallaxColor: 0x4A2010,  // lava glow
    parallaxAlpha: 0.18,
  },
  {
    name: 'storm',
    startHeight: 5000,
    endHeight: 7000,
    bgTop: '#0a0e18',
    bgMid: '#141a28',
    bgBot: '#0e1220',
    fogColor: 0x1a2030,
    fogAlpha: 0.12,
    particleColor: 0x6688AA,  // rain/lightning
    particleAlpha: 0.15,
    parallaxColor: 0x2A3040,  // storm clouds
    parallaxAlpha: 0.20,
  },
  {
    name: 'cosmos',
    startHeight: 7000,
    endHeight: 99999,
    bgTop: '#040608',
    bgMid: '#080a10',
    bgBot: '#060810',
    fogColor: 0x102040,
    fogAlpha: 0.04,
    particleColor: 0xFFFFFF,  // stars
    particleAlpha: 0.35,
    parallaxColor: 0x1a3060,  // aurora
    parallaxAlpha: 0.10,
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
