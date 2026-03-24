import {
  GOLD_HEX, DARK_RED_HEX, RUST, BLOOD_RED_HEX, BRASS_HEX,
  LEATHER_DARK, LEATHER_LIGHT,
} from '../constants.js';

// ===================== ПРОЦЕДУРНЫЕ UI УТИЛИТЫ =====================
// Готический вестерн стиль — все функции рисуют на переданном Graphics

// Готическая кнопка с заклёпками и градиентом
export function drawOrnamentalButton(gfx, x, y, w, h, opts = {}) {
  const { pressed = false, fillTop = LEATHER_DARK, fillBot = LEATHER_LIGHT, borderColor = GOLD_HEX } = opts;
  const offsetY = pressed ? 2 : 0;
  const left = x - w / 2;
  const top = y - h / 2 + offsetY;

  gfx.clear();

  // Glow (только в обычном состоянии)
  if (!pressed) {
    gfx.fillStyle(borderColor, 0.08);
    gfx.fillRoundedRect(left - 4, top - 4, w + 8, h + 8, 4);
  }

  // Тень кнопки
  if (!pressed) {
    gfx.fillStyle(0x000000, 0.4);
    gfx.fillRoundedRect(left + 2, top + 3, w, h, 3);
  }

  // Градиент: тёмный верх → светлый низ
  gfx.fillStyle(fillTop);
  gfx.fillRoundedRect(left, top, w, h / 2, { tl: 3, tr: 3, bl: 0, br: 0 });
  gfx.fillStyle(fillBot);
  gfx.fillRoundedRect(left, top + h / 2, w, h / 2, { tl: 0, tr: 0, bl: 3, br: 3 });

  // Рамка — 2 слоя для объёма
  gfx.lineStyle(3, borderColor, pressed ? 0.5 : 0.7);
  gfx.strokeRoundedRect(left, top, w, h, 3);
  gfx.lineStyle(1, borderColor, 0.2);
  gfx.strokeRoundedRect(left - 1, top - 1, w + 2, h + 2, 4);

  // Заклёпки в углах
  const rivetR = 2.5;
  const rivetPad = 7;
  const rivets = [
    [left + rivetPad, top + rivetPad],
    [left + w - rivetPad, top + rivetPad],
    [left + rivetPad, top + h - rivetPad],
    [left + w - rivetPad, top + h - rivetPad],
  ];
  for (const [rx, ry] of rivets) {
    gfx.fillStyle(BRASS_HEX, 0.8);
    gfx.fillCircle(rx, ry, rivetR);
    gfx.lineStyle(1, 0x000000, 0.4);
    gfx.strokeCircle(rx, ry, rivetR);
    // Блик
    gfx.fillStyle(0xFFFFFF, 0.15);
    gfx.fillCircle(rx - 0.5, ry - 0.5, 1);
  }

  // Гвозди на серединах верхней/нижней граней
  const nailY = [top + 1, top + h - 1];
  for (const ny of nailY) {
    gfx.fillStyle(BRASS_HEX, 0.5);
    gfx.fillCircle(left + w / 2, ny, 1.5);
  }
}

// Верёвочный разделитель
export function drawRopeDecoration(gfx, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.floor(len / 8);
  const ux = dx / len;
  const uy = dy / len;

  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const cx = x1 + dx * t;
    const cy = y1 + dy * t;
    const alpha = (i % 2 === 0) ? 0.35 : 0.2;
    gfx.fillStyle(RUST, alpha);
    gfx.fillEllipse(cx, cy, 7, 3);
  }

  // Крючки на концах
  gfx.lineStyle(1.5, RUST, 0.4);
  gfx.beginPath();
  gfx.arc(x1 - 3, y1, 3, Math.PI * 0.5, Math.PI * 1.5, false);
  gfx.strokePath();
  gfx.beginPath();
  gfx.arc(x2 + 3, y2, 3, -Math.PI * 0.5, Math.PI * 0.5, false);
  gfx.strokePath();
}

// Процедурные капли крови
export function drawBloodSplatter(gfx, x, y, radius, intensity = 0.7) {
  const color = BLOOD_RED_HEX;

  // Центральное пятно — несколько перекрывающихся кругов
  for (let i = 0; i < 5; i++) {
    const ox = (Math.random() - 0.5) * radius * 0.4;
    const oy = (Math.random() - 0.5) * radius * 0.3;
    const r = radius * (0.15 + Math.random() * 0.2);
    gfx.fillStyle(color, intensity * (0.4 + Math.random() * 0.3));
    gfx.fillCircle(x + ox, y + oy, r);
  }

  // Разлетающиеся капли
  const dropCount = 8 + Math.floor(Math.random() * 5);
  for (let i = 0; i < dropCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = radius * (0.4 + Math.random() * 0.6);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const r = 1 + Math.random() * 3;
    gfx.fillStyle(color, intensity * (0.2 + Math.random() * 0.3));
    gfx.fillCircle(x + dx, y + dy, r);
  }

  // Подтёки вниз
  for (let i = 0; i < 3; i++) {
    const ox = (Math.random() - 0.5) * radius * 0.5;
    const dripLen = 8 + Math.random() * 15;
    gfx.fillStyle(color, intensity * 0.3);
    gfx.fillRect(x + ox - 1, y + radius * 0.1, 2, dripLen);
  }
}

// Рамка розыскного плаката
export function drawWantedPosterFrame(gfx, x, y, w, h) {
  const left = x - w / 2;
  const top = y - h / 2;

  // Фон "бумаги"
  gfx.fillStyle(0x1a0f00, 0.6);
  gfx.fillRect(left, top, w, h);

  // Внешняя рамка — слегка неровная
  gfx.lineStyle(2, RUST, 0.5);
  gfx.beginPath();
  gfx.moveTo(left, top);
  const edges = [
    [left + w, top], [left + w, top + h], [left, top + h], [left, top]
  ];
  for (const [ex, ey] of edges) {
    // Добавляем лёгкую неровность
    gfx.lineTo(ex + (Math.random() - 0.5) * 1.5, ey + (Math.random() - 0.5) * 1.5);
  }
  gfx.strokePath();

  // Внутренняя рамка
  gfx.lineStyle(1, GOLD_HEX, 0.2);
  gfx.strokeRect(left + 4, top + 4, w - 8, h - 8);

  // Угловые "гвозди"
  const cornerPad = 4;
  const corners = [
    [left + cornerPad, top + cornerPad],
    [left + w - cornerPad, top + cornerPad],
    [left + cornerPad, top + h - cornerPad],
    [left + w - cornerPad, top + h - cornerPad],
  ];
  for (const [cx, cy] of corners) {
    gfx.fillStyle(RUST, 0.6);
    gfx.fillCircle(cx, cy, 2);
  }
}

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

// Вспышка искр — для нажатий кнопок и переходов
export function createEmberBurst(scene, x, y, count = 10, depth = 20) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 60;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - 20; // вверх
    const size = 1 + Math.random() * 2;

    const ember = scene.add.graphics().setDepth(depth);
    ember.fillStyle(0xFF6B00, 0.8);
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

// Ржавые края поверх рамки
export function drawRustedEdge(gfx, x, y, w, h, edgeWidth = 4) {
  const left = x - w / 2;
  const top = y - h / 2;

  for (let i = 0; i < 20; i++) {
    const side = Math.floor(Math.random() * 4);
    let rx, ry, rw, rh;
    switch (side) {
      case 0: // top
        rx = left + Math.random() * w;
        ry = top;
        rw = 2 + Math.random() * 4;
        rh = 1 + Math.random() * edgeWidth;
        break;
      case 1: // bottom
        rx = left + Math.random() * w;
        ry = top + h - edgeWidth;
        rw = 2 + Math.random() * 4;
        rh = 1 + Math.random() * edgeWidth;
        break;
      case 2: // left
        rx = left;
        ry = top + Math.random() * h;
        rw = 1 + Math.random() * edgeWidth;
        rh = 2 + Math.random() * 4;
        break;
      case 3: // right
        rx = left + w - edgeWidth;
        ry = top + Math.random() * h;
        rw = 1 + Math.random() * edgeWidth;
        rh = 2 + Math.random() * 4;
        break;
    }
    gfx.fillStyle(RUST, 0.1 + Math.random() * 0.2);
    gfx.fillRect(rx, ry, rw, rh);
  }
}
