// ===================== ПРОЦЕДУРНЫЕ UI УТИЛИТЫ =====================
// Neon Western — тёмное стекло + неоновые акценты cyan/pink/amber
// Canvas 2D API вместо Phaser Graphics

// Неоновая палитра (строки для ctx)
const NEON_CYAN_STR = '#00F5D4';
const NEON_PINK_STR = '#FF2E63';
const NEON_AMBER_STR = '#FFB800';
const BG_DARK_STR = '#0A0E1A';

// Хелпер: Phaser hex → CSS строка
function hexToCSS(hex) {
  return '#' + hex.toString(16).padStart(6, '0');
}

// Хелпер: ctx.roundRect с fallback для старых браузеров
function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}

// Flat minimal кнопка — тёмное стекло + неоновая cyan рамка
export function drawGlassButton(ctx, x, y, w, h, opts = {}) {
  const { pressed = false, hover = false } = opts;
  const left = x - w / 2;
  const top = y - h / 2;
  const radius = 12;

  // Тёмный стеклянный фон
  const bgAlpha = pressed ? 0.7 : 0.6;
  ctx.globalAlpha = bgAlpha;
  ctx.fillStyle = BG_DARK_STR;
  roundRect(ctx, left, top, w, h, radius);
  ctx.fill();

  // Неоновая cyan рамка
  const borderAlpha = pressed ? 0.7 : hover ? 0.6 : 0.4;
  ctx.globalAlpha = borderAlpha;
  ctx.strokeStyle = NEON_CYAN_STR;
  ctx.lineWidth = 1;
  roundRect(ctx, left, top, w, h, radius);
  ctx.stroke();

  // Тонкая неоновая линия-блик сверху (1px, cyan)
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = NEON_CYAN_STR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(left + radius, top);
  ctx.lineTo(left + w - radius, top);
  ctx.stroke();

  ctx.globalAlpha = 1;
}


// Пунктирная линия — неоновые cyan чёрточки
export function drawChainDecoration(ctx, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.floor(len / 12);

  // Нормализованное направление для чёрточек
  const nx = dx / (len || 1);
  const ny = dy / (len || 1);
  const dashHalf = 3;

  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = NEON_CYAN_STR;
  ctx.lineWidth = 1;

  for (let i = 0; i <= steps; i++) {
    const t = i / Math.max(steps, 1);
    const cx = x1 + dx * t;
    const cy = y1 + dy * t;

    ctx.beginPath();
    ctx.moveTo(cx - nx * dashHalf, cy - ny * dashHalf);
    ctx.lineTo(cx + nx * dashHalf, cy + ny * dashHalf);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}


// Процедурные капли крови — неоновый pink
export function drawBloodSplatter(ctx, x, y, radius, intensity = 0.7, rng = Math.random) {
  // Центральное пятно
  for (let i = 0; i < 5; i++) {
    const ox = (rng() - 0.5) * radius * 0.4;
    const oy = (rng() - 0.5) * radius * 0.3;
    const r = radius * (0.15 + rng() * 0.2);
    ctx.globalAlpha = intensity * (0.5 + rng() * 0.3);
    ctx.fillStyle = NEON_PINK_STR;
    ctx.beginPath();
    ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Разлетающиеся капли
  const dropCount = 8 + Math.floor(rng() * 5);
  for (let i = 0; i < dropCount; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = radius * (0.4 + rng() * 0.6);
    const ddx = Math.cos(angle) * dist;
    const ddy = Math.sin(angle) * dist;
    const r = 1 + rng() * 3;
    ctx.globalAlpha = intensity * (0.25 + rng() * 0.3);
    ctx.fillStyle = NEON_PINK_STR;
    ctx.beginPath();
    ctx.arc(x + ddx, y + ddy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Подтёки вниз
  for (let i = 0; i < 3; i++) {
    const ox = (rng() - 0.5) * radius * 0.5;
    const dripLen = 8 + rng() * 15;
    ctx.globalAlpha = intensity * 0.35;
    ctx.fillStyle = NEON_PINK_STR;
    ctx.fillRect(x + ox - 1, y + radius * 0.1, 2, dripLen);
  }

  ctx.globalAlpha = 1;
}

// Рамка-chip (MUI Chip стиль) — тёмное стекло + тонкая cyan рамка
export function drawSteelFrame(ctx, x, y, w, h) {
  const left = x - w / 2;
  const top = y - h / 2;
  const radius = Math.min(h / 2, 16);

  // Фон — тёмное стекло
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = BG_DARK_STR;
  roundRect(ctx, left, top, w, h, radius);
  ctx.fill();

  // Рамка — тонкая cyan
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = NEON_CYAN_STR;
  ctx.lineWidth = 1;
  roundRect(ctx, left, top, w, h, radius);
  ctx.stroke();

  ctx.globalAlpha = 1;
}


// MUI Chip — pill-shape с текстом, тёмное стекло + cyan рамка
export function drawChip(ctx, x, y, w, h) {
  const left = x - w / 2;
  const top = y - h / 2;
  const radius = h / 2; // полный pill

  // Фон — тёмное стекло
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = BG_DARK_STR;
  roundRect(ctx, left, top, w, h, radius);
  ctx.fill();

  // Рамка — тонкая cyan
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = NEON_CYAN_STR;
  ctx.lineWidth = 1;
  roundRect(ctx, left, top, w, h, radius);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

// Посимвольное появление текста (typewriter) — хранит состояние
export function createTypewriterState(text, charDelay = 40) {
  return {
    fullText: text,
    currentText: '',
    charDelay,
    elapsed: 0,
    idx: 0,
    done: false,
  };
}

// Обновить состояние typewriter — вызывать каждый кадр
export function updateTypewriter(state, delta) {
  if (state.done) return;
  state.elapsed += delta;
  while (state.elapsed >= state.charDelay && state.idx < state.fullText.length) {
    state.elapsed -= state.charDelay;
    state.idx++;
    state.currentText = state.fullText.substring(0, state.idx);
  }
  if (state.idx >= state.fullText.length) state.done = true;
}

// Вспышка искр — данные для частиц (рисуются в update сцены)
export function createEmberBurstParticles(x, y, count = 10) {
  const particles = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 60;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - 20;
    const size = 2 + Math.random() * 2;
    const isCyan = Math.random() < 0.5;
    particles.push({
      x, y, dx, dy, size,
      color: isCyan ? NEON_CYAN_STR : NEON_PINK_STR,
      life: 400 + Math.random() * 400,
      maxLife: 400 + Math.random() * 400,
    });
  }
  return particles;
}

// Обновить и нарисовать ember частицы — возвращает живые
export function updateAndDrawEmbers(ctx, particles, delta) {
  let writeIdx = 0;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.life -= delta;
    if (p.life <= 0) continue;
    const frac = p.life / p.maxLife;
    const progress = 1 - frac;
    p.x += p.dx * (delta / p.maxLife);
    p.y += p.dy * (delta / p.maxLife);

    ctx.globalAlpha = frac * 0.9;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * frac, 0, Math.PI * 2);
    ctx.fill();
    particles[writeIdx++] = p;
  }
  particles.length = writeIdx;
  ctx.globalAlpha = 1;
  return particles;
}

