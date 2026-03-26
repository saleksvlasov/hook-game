// Математические утилиты — замена Phaser.Math

// Случайное целое число в диапазоне [min, max]
export function between(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Зажать значение в диапазоне [min, max]
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

// Линейная интерполяция: start → end с фактором t ∈ [0,1]
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

// Расстояние между двумя точками
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}
