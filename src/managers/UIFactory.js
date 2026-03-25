import {
  GOLD_HEX, DARK_RED_HEX, RUST, BLOOD_RED_HEX, BRASS_HEX,
  STEEL, STEEL_LIGHT, AMBER_GLOW, EMBER_HEX, BG_DARK_HEX,
} from '../constants.js';

// ===================== ПРОЦЕДУРНЫЕ UI УТИЛИТЫ =====================
// Стиль MUI + Hunt Showdown — чистый, яркий, с amber акцентами

// MUI-стиль кнопка — elevated card с amber бордером
export function drawGlassButton(gfx, x, y, w, h, opts = {}) {
  const { pressed = false, hover = false } = opts;
  const offsetY = pressed ? 2 : 0;
  const left = x - w / 2;
  const top = y - h / 2 + offsetY;

  gfx.clear();

  // Тень снизу (только если не нажата)
  if (!pressed) {
    gfx.fillStyle(0x000000, 0.3);
    gfx.fillRoundedRect(left + 1, top + 3, w, h, 10);
  }

  // Основной фон — тёмный blue-grey, хорошо видно
  gfx.fillStyle(0x2A3040, 0.85);
  gfx.fillRoundedRect(left, top, w, h, 10);

  // Top highlight — белая полоска сверху
  gfx.fillStyle(0xFFFFFF, 0.10);
  gfx.fillRoundedRect(left + 2, top, w - 4, 2, { tl: 10, tr: 10, bl: 0, br: 0 });

  // Border — amber, яркость зависит от состояния
  const borderAlpha = pressed ? 0.3 : hover ? 0.6 : 0.4;
  gfx.lineStyle(1.5, AMBER_GLOW, borderAlpha);
  gfx.strokeRoundedRect(left, top, w, h, 10);
}

// Обратная совместимость
export { drawGlassButton as drawOrnamentalButton };

// Пунктирная линия — маленькие точки каждые 12px
export function drawChainDecoration(gfx, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.floor(len / 12);

  for (let i = 0; i <= steps; i++) {
    const t = i / Math.max(steps, 1);
    const cx = x1 + dx * t;
    const cy = y1 + dy * t;

    // Простые точки — steel с лёгкой альфой
    gfx.fillStyle(STEEL_LIGHT, 0.2);
    gfx.fillCircle(cx, cy, 1.5);
  }
}

// Обратная совместимость
export { drawChainDecoration as drawRopeDecoration };

// Процедурные капли крови — без изменений
export function drawBloodSplatter(gfx, x, y, radius, intensity = 0.7) {
  const color = BLOOD_RED_HEX;

  // Центральное пятно — несколько перекрывающихся кругов
  for (let i = 0; i < 5; i++) {
    const ox = (Math.random() - 0.5) * radius * 0.4;
    const oy = (Math.random() - 0.5) * radius * 0.3;
    const r = radius * (0.15 + Math.random() * 0.2);
    gfx.fillStyle(color, intensity * (0.5 + Math.random() * 0.3));
    gfx.fillCircle(x + ox, y + oy, r);
  }

  // Разлетающиеся капли
  const dropCount = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < dropCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = radius * (0.4 + Math.random() * 0.6);
    const ddx = Math.cos(angle) * dist;
    const ddy = Math.sin(angle) * dist;
    const r = 1 + Math.random() * 3;
    gfx.fillStyle(color, intensity * (0.25 + Math.random() * 0.3));
    gfx.fillCircle(x + ddx, y + ddy, r);
  }

  // Подтёки вниз
  for (let i = 0; i < 3; i++) {
    const ox = (Math.random() - 0.5) * radius * 0.5;
    const dripLen = 8 + Math.random() * 15;
    gfx.fillStyle(color, intensity * 0.35);
    gfx.fillRect(x + ox - 1, y + radius * 0.1, 2, dripLen);
  }
}

// MUI-стиль рамка — elevated card
export function drawSteelFrame(gfx, x, y, w, h) {
  const left = x - w / 2;
  const top = y - h / 2;

  // Фон — blue-grey полупрозрачный
  gfx.fillStyle(0x252D3D, 0.7);
  gfx.fillRoundedRect(left, top, w, h, 8);

  // Border — стальной
  gfx.lineStyle(1, 0x4A5568, 0.4);
  gfx.strokeRoundedRect(left, top, w, h, 8);

  // Top highlight — белая линия сверху
  gfx.fillStyle(0xFFFFFF, 0.06);
  gfx.fillRoundedRect(left + 2, top, w - 4, 1, { tl: 8, tr: 8, bl: 0, br: 0 });
}

// Обратная совместимость
export { drawSteelFrame as drawWantedPosterFrame };

// Посимвольное появление текста (typewriter)
export function createTypewriterText(scene, x, y, text, style, charDelay = 40) {
  const textObj = scene.add.text(x, y, '', style).setOrigin(0.5);
  let idx = 0;

  const timer = scene.time.addEvent({
    delay: charDelay,
    repeat: text.length - 1,
    callback: () => {
      idx++;
      textObj.setText(text.substring(0, idx));
    },
  });

  return textObj;
}

// Вспышка искр — яркий ember стиль, крупные частицы
export function createEmberBurst(scene, x, y, count = 10, depth = 20) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 60;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - 20; // вверх
    const size = 1.5 + Math.random() * 2; // 1.5–3.5px

    const ember = scene.add.graphics().setDepth(depth);
    ember.fillStyle(EMBER_HEX, 0.9);
    ember.fillCircle(x, y, size);

    scene.tweens.add({
      targets: ember,
      x: dx,
      y: dy,
      alpha: 0,
      duration: 400 + Math.random() * 400,
      ease: 'Cubic.easeOut',
      onComplete: () => ember.destroy(),
    });
  }
}

// Ржавые края — no-op в новом дизайне
export function drawRustedEdge() {}
