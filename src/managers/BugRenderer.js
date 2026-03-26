// Процедурная отрисовка жуков-препятствий — Neon Western палитра
// Canvas 2D API вместо Phaser Graphics

// Хелперы
function fillCircle(ctx, cx, cy, r) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function fillEllipse(ctx, cx, cy, w, h) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function lineBetween(ctx, x1, y1, x2, y2) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function fillTriangle(ctx, x1, y1, x2, y2, x3, y3) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.closePath();
  ctx.fill();
}

// Beetle: neon pink тело, cyan глаза
export function drawBeetle(ctx) {
  // Тело — neon pink
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#FF2E63';
  fillEllipse(ctx, 0, 0, 20, 14);
  // Разделительная линия на панцире
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = '#A01040';
  ctx.lineWidth = 1;
  lineBetween(ctx, 0, -7, 0, 7);
  // Голова
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#CC1850';
  fillCircle(ctx, 0, -10, 5);
  // Рожки
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#FF2E63';
  ctx.lineWidth = 1.5;
  lineBetween(ctx, -2, -14, -5, -20);
  lineBetween(ctx, 2, -14, 5, -20);
  // Лапки (3 пары)
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = '#CC1850';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const ly = -4 + i * 5;
    lineBetween(ctx, -10, ly, -16, ly - 3);
    lineBetween(ctx, 10, ly, 16, ly - 3);
  }
  // Глаза — neon cyan
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#00F5D4';
  fillCircle(ctx, -3, -11, 1.5);
  fillCircle(ctx, 3, -11, 1.5);
  ctx.globalAlpha = 1;
}

// Spider: тёмное тело, cyan нитка, pink узор и глаза
export function drawSpider(ctx) {
  // Нитка вверх — neon cyan
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = '#00F5D4';
  ctx.lineWidth = 0.8;
  lineBetween(ctx, 0, -8, 0, -30);
  // Тело — тёмный purple
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#1A0520';
  fillCircle(ctx, 0, 0, 8);
  // Брюшко
  ctx.fillStyle = '#120318';
  fillEllipse(ctx, 0, 8, 10, 12);
  // Узор на спине — neon pink крест
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#FF2E63';
  ctx.lineWidth = 1;
  lineBetween(ctx, -3, 5, 3, 11);
  lineBetween(ctx, 3, 5, -3, 11);
  // 8 лапок (4 пары, изогнутые)
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#2A0830';
  ctx.lineWidth = 1;
  const legAngles = [-0.8, -0.4, 0.2, 0.6];
  for (const angle of legAngles) {
    const ly = angle * 10;
    lineBetween(ctx, -8, ly, -16, ly - 6);
    lineBetween(ctx, -16, ly - 6, -20, ly + 2);
    lineBetween(ctx, 8, ly, 16, ly - 6);
    lineBetween(ctx, 16, ly - 6, 20, ly + 2);
  }
  // Глаза — neon pink
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#FF2E63';
  fillCircle(ctx, -3, -5, 1);
  fillCircle(ctx, 3, -5, 1);
  fillCircle(ctx, -2, -3, 0.8);
  fillCircle(ctx, 2, -3, 0.8);
  ctx.globalAlpha = 1;
}

// Scorpion: тёмный purple тело, pink клешни, amber жало
export function drawScorpion(ctx) {
  // Тело — тёмный purple
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#2A0830';
  fillEllipse(ctx, 0, 0, 24, 10);
  // Голова
  ctx.fillStyle = '#1E0620';
  fillEllipse(ctx, -14, 0, 8, 7);
  // Клешни — neon pink
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#FF2E63';
  ctx.lineWidth = 1.5;
  // Левая клешня
  lineBetween(ctx, -18, -2, -24, -8);
  lineBetween(ctx, -24, -8, -20, -12);
  lineBetween(ctx, -24, -8, -28, -10);
  // Правая клешня
  lineBetween(ctx, -18, 2, -24, 8);
  lineBetween(ctx, -24, 8, -20, 12);
  lineBetween(ctx, -24, 8, -28, 10);
  // Хвост — 4 сегмента
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#2A0830';
  ctx.lineWidth = 2;
  lineBetween(ctx, 12, 0, 18, -3);
  lineBetween(ctx, 18, -3, 22, -8);
  lineBetween(ctx, 22, -8, 24, -14);
  // Жало — neon amber
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#FFB800';
  fillTriangle(ctx, 23, -14, 25, -14, 24, -20);
  // Лапки (4 пары)
  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = '#1E0620';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < 4; i++) {
    const lx = -8 + i * 6;
    lineBetween(ctx, lx, -5, lx - 2, -10);
    lineBetween(ctx, lx, 5, lx - 2, 10);
  }
  // Глаза — neon amber
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = '#FFB800';
  fillCircle(ctx, -16, -2, 1);
  fillCircle(ctx, -16, 2, 1);
  ctx.globalAlpha = 1;
}

// Firefly: cyan свечение, пульсирующий хвост
export function drawFirefly(ctx) {
  // Свечение — neon cyan
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = '#00F5D4';
  fillCircle(ctx, 0, 0, 16);
  ctx.globalAlpha = 0.08;
  fillCircle(ctx, 0, 0, 24);
  // Тело — очень тёмный
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#0E0A18';
  fillEllipse(ctx, 0, 0, 8, 6);
  // Крылья
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#4A4040';
  fillEllipse(ctx, -5, -2, 8, 4);
  fillEllipse(ctx, 5, -2, 8, 4);
  // Светящийся хвост — neon cyan
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#00F5D4';
  fillCircle(ctx, 0, 4, 3);
  ctx.globalAlpha = 0.6;
  fillCircle(ctx, 0, 4, 5);
  ctx.globalAlpha = 1;
}

// Heart pickup — neon pink сердце с cyan свечением
export function drawHeart(ctx) {
  // Свечение
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#FF2E63';
  fillCircle(ctx, 0, 0, 18);

  // Сердце — bezier path
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#FF2E63';
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(-10, 0, -14, -8, -8, -13);
  ctx.bezierCurveTo(-3, -17, 0, -13, 0, -9);
  ctx.bezierCurveTo(0, -13, 3, -17, 8, -13);
  ctx.bezierCurveTo(14, -8, 10, 0, 0, 8);
  ctx.fill();

  // Блик
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = '#FFFFFF';
  fillCircle(ctx, -4, -10, 2.5);
  ctx.globalAlpha = 1;
}

// Универсальный роутер — рисует жука по типу (0-4)
export function drawBug(ctx, type) {
  switch (type) {
    case 0: drawBeetle(ctx); break;
    case 1: drawSpider(ctx); break;
    case 2: drawScorpion(ctx); break;
    case 3: drawFirefly(ctx); break;
    case 4: drawHeart(ctx); break;
  }
}
