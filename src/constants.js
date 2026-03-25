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
    startHeight: 0,
    endHeight: 1500,
    bgTop: '#1a1e28',
    bgMid: '#252a35',
    bgBot: '#1e2230',
    fogColor: 0x2a2e38,
    fogAlpha: 0.08,
    particleColor: 0xFF6B35,
    particleAlpha: 0.35,
    parallaxColor: 0x3A4050,
    parallaxAlpha: 0.25,
  },
  {
    name: 'ironworks',
    startHeight: 1500,
    endHeight: 3000,
    bgTop: '#1e2028',
    bgMid: '#2a2535',
    bgBot: '#252030',
    fogColor: 0x352820,
    fogAlpha: 0.10,
    particleColor: 0xF0A030,
    particleAlpha: 0.30,
    parallaxColor: 0x5A3828,
    parallaxAlpha: 0.20,
  },
  {
    name: 'furnace',
    startHeight: 3000,
    endHeight: 5000,
    bgTop: '#28201a',
    bgMid: '#3a2818',
    bgBot: '#302218',
    fogColor: 0x3a2510,
    fogAlpha: 0.12,
    particleColor: 0xFF4500,
    particleAlpha: 0.40,
    parallaxColor: 0x6A3018,
    parallaxAlpha: 0.25,
  },
  {
    name: 'storm',
    startHeight: 5000,
    endHeight: 7000,
    bgTop: '#141a2a',
    bgMid: '#1e2840',
    bgBot: '#182035',
    fogColor: 0x253048,
    fogAlpha: 0.14,
    particleColor: 0x88AACC,
    particleAlpha: 0.25,
    parallaxColor: 0x3A4560,
    parallaxAlpha: 0.28,
  },
  {
    name: 'cosmos',
    startHeight: 7000,
    endHeight: 99999,
    bgTop: '#0a0e18',
    bgMid: '#101828',
    bgBot: '#0c1220',
    fogColor: 0x182848,
    fogAlpha: 0.06,
    particleColor: 0xFFFFFF,
    particleAlpha: 0.50,
    parallaxColor: 0x284070,
    parallaxAlpha: 0.15,
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
