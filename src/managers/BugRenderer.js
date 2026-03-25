// Процедурная отрисовка жуков-препятствий — Neon Western палитра

// Beetle: neon pink тело, cyan глаза
export function drawBeetle(gfx) {
  // Тело — neon pink
  gfx.fillStyle(0xFF2E63, 0.8);
  gfx.fillEllipse(0, 0, 20, 14);
  // Разделительная линия на панцире
  gfx.lineStyle(1, 0xA01040, 0.6);
  gfx.lineBetween(0, -7, 0, 7);
  // Голова
  gfx.fillStyle(0xCC1850, 0.9);
  gfx.fillCircle(0, -10, 5);
  // Рожки
  gfx.lineStyle(1.5, 0xFF2E63, 0.8);
  gfx.lineBetween(-2, -14, -5, -20);
  gfx.lineBetween(2, -14, 5, -20);
  // Лапки (3 пары)
  gfx.lineStyle(1, 0xCC1850, 0.7);
  for (let i = 0; i < 3; i++) {
    const ly = -4 + i * 5;
    gfx.lineBetween(-10, ly, -16, ly - 3);
    gfx.lineBetween(10, ly, 16, ly - 3);
  }
  // Глаза — neon cyan
  gfx.fillStyle(0x00F5D4, 0.8);
  gfx.fillCircle(-3, -11, 1.5);
  gfx.fillCircle(3, -11, 1.5);
}

// Spider: тёмное тело, cyan нитка, pink узор и глаза
export function drawSpider(gfx) {
  // Нитка вверх — neon cyan
  gfx.lineStyle(0.8, 0x00F5D4, 0.3);
  gfx.lineBetween(0, -8, 0, -30);
  // Тело — тёмный purple
  gfx.fillStyle(0x1A0520, 0.9);
  gfx.fillCircle(0, 0, 8);
  // Брюшко
  gfx.fillStyle(0x120318, 0.9);
  gfx.fillEllipse(0, 8, 10, 12);
  // Узор на спине — neon pink крест
  gfx.lineStyle(1, 0xFF2E63, 0.5);
  gfx.lineBetween(-3, 5, 3, 11);
  gfx.lineBetween(3, 5, -3, 11);
  // 8 лапок (4 пары, изогнутые)
  gfx.lineStyle(1, 0x2A0830, 0.8);
  const legAngles = [-0.8, -0.4, 0.2, 0.6];
  for (const angle of legAngles) {
    const ly = angle * 10;
    // Левая лапка — два сегмента
    gfx.lineBetween(-8, ly, -16, ly - 6);
    gfx.lineBetween(-16, ly - 6, -20, ly + 2);
    // Правая
    gfx.lineBetween(8, ly, 16, ly - 6);
    gfx.lineBetween(16, ly - 6, 20, ly + 2);
  }
  // Глаза — neon pink
  gfx.fillStyle(0xFF2E63, 0.7);
  gfx.fillCircle(-3, -5, 1);
  gfx.fillCircle(3, -5, 1);
  gfx.fillCircle(-2, -3, 0.8);
  gfx.fillCircle(2, -3, 0.8);
}

// Scorpion: тёмный purple тело, pink клешни, amber жало
export function drawScorpion(gfx) {
  // Тело — тёмный purple
  gfx.fillStyle(0x2A0830, 0.9);
  gfx.fillEllipse(0, 0, 24, 10);
  // Голова
  gfx.fillStyle(0x1E0620, 0.9);
  gfx.fillEllipse(-14, 0, 8, 7);
  // Клешни — neon pink
  gfx.lineStyle(1.5, 0xFF2E63, 0.8);
  // Левая клешня
  gfx.lineBetween(-18, -2, -24, -8);
  gfx.lineBetween(-24, -8, -20, -12);
  gfx.lineBetween(-24, -8, -28, -10);
  // Правая клешня (зеркально по Y-оси -> вниз)
  gfx.lineBetween(-18, 2, -24, 8);
  gfx.lineBetween(-24, 8, -20, 12);
  gfx.lineBetween(-24, 8, -28, 10);
  // Хвост — 4 сегмента загибающиеся вверх
  gfx.lineStyle(2, 0x2A0830, 0.8);
  gfx.lineBetween(12, 0, 18, -3);
  gfx.lineBetween(18, -3, 22, -8);
  gfx.lineBetween(22, -8, 24, -14);
  // Жало — neon amber
  gfx.fillStyle(0xFFB800, 0.8);
  gfx.fillTriangle(23, -14, 25, -14, 24, -20);
  // Лапки (4 пары)
  gfx.lineStyle(0.8, 0x1E0620, 0.6);
  for (let i = 0; i < 4; i++) {
    const lx = -8 + i * 6;
    gfx.lineBetween(lx, -5, lx - 2, -10);
    gfx.lineBetween(lx, 5, lx - 2, 10);
  }
  // Глаза — neon amber
  gfx.fillStyle(0xFFB800, 0.7);
  gfx.fillCircle(-16, -2, 1);
  gfx.fillCircle(-16, 2, 1);
}

// Firefly: cyan свечение, пульсирующий хвост
export function drawFirefly(gfx) {
  // Свечение — neon cyan (будет пульсировать в update)
  gfx.fillStyle(0x00F5D4, 0.15);
  gfx.fillCircle(0, 0, 16);
  gfx.fillStyle(0x00F5D4, 0.08);
  gfx.fillCircle(0, 0, 24);
  // Тело — очень тёмный
  gfx.fillStyle(0x0E0A18, 0.9);
  gfx.fillEllipse(0, 0, 8, 6);
  // Крылья
  gfx.fillStyle(0x4A4040, 0.3);
  gfx.fillEllipse(-5, -2, 8, 4);
  gfx.fillEllipse(5, -2, 8, 4);
  // Светящийся хвост — neon cyan
  gfx.fillStyle(0x00F5D4, 0.9);
  gfx.fillCircle(0, 4, 3);
  gfx.fillStyle(0x00F5D4, 0.6);
  gfx.fillCircle(0, 4, 5);
}

// Универсальный роутер — рисует жука по типу (0-3)
export function drawBug(gfx, type) {
  gfx.clear();
  switch (type) {
    case 0: drawBeetle(gfx); break;
    case 1: drawSpider(gfx); break;
    case 2: drawScorpion(gfx); break;
    case 3: drawFirefly(gfx); break;
  }
}
