// ===================== ИГРОВЫЕ КОНСТАНТЫ =====================

// Физика
export const GRAVITY = 800;
export const HOOK_RANGE = 500;
export const MIN_ROPE = 40;
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
  GAME_OVER:  30,
  HTML_BUTTONS: 100,
};
