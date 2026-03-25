// ===================== ИГРОВЫЕ КОНСТАНТЫ =====================

// Физика
export const GRAVITY = 1200;           // Было 800 — тяжелее падение, как в Flappy Bird
export const HOOK_RANGE = 280;         // Было 500 — нельзя зацепиться издалека
export const MAX_ROPE_LENGTH = 160;    // Макс длина верёвки — короткие качели
export const MIN_ROPE = 40;
export const SWING_FRICTION = 0.997;   // Было 0.9995 — маятник быстрее теряет энергию
export const TRAIL_SPEED_THRESHOLD = 150;

// Мир
export const WORLD_HEIGHT = 100000;
export const ANCHOR_SPACING_Y = 280;
export const GROUND_Y = WORLD_HEIGHT - 10;
export const SPAWN_Y = WORLD_HEIGHT - 200;

// Пасхалки
export const BOUNTY_HEIGHT = 100;
export const MOON_HEIGHT = 300;

// Цвета — Hunt Showdown палитра
export const GOLD = '#C8A96E';
export const GOLD_HEX = 0xC8A96E;
export const DARK_RED = '#6B0F0F';
export const DARK_RED_HEX = 0x6B0F0F;
export const RUST = 0x7A4A1E;
export const BG_DARK = '#1a0e06';
export const HUNTER_BODY = 0x5a3518;
export const HUNTER_FACE = 0xF0DDB0;
export const TRAIL_COLOR = 0xFF6B00;

// Расширенная палитра — UI редизайн
export const BLOOD_RED_HEX = 0x8B0000;
export const BRASS_HEX = 0xB8964E;
export const LEATHER_DARK = 0x2A1508;
export const LEATHER_LIGHT = 0x3D2010;
export const HINT_COLOR = '#9B8050';
export const RECORD_COLOR = '#8B7040';

// Шрифт
export const FONT = 'Georgia, serif';

// Z-индексы (слои отрисовки)
export const Z = {
  BG:         -10,
  MOON:       -9,
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
