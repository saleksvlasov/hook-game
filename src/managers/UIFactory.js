// ===================== ПРОЦЕДУРНЫЕ UI УТИЛИТЫ =====================
// Neon Western — тёмное стекло + неоновые акценты cyan/pink/amber

// Неоновая палитра
const NEON_CYAN = 0x00F5D4;
const NEON_PINK = 0xFF2E63;
const NEON_AMBER = 0xFFB800;
const BG_DARK_NEON = 0x0A0E1A;

// Flat minimal кнопка — тёмное стекло + неоновая cyan рамка
export function drawGlassButton(gfx, x, y, w, h, opts = {}) {
  const { pressed = false, hover = false } = opts;
  const left = x - w / 2;
  const top = y - h / 2;
  const radius = 12;

  gfx.clear();

  // Тёмный стеклянный фон
  const bgAlpha = pressed ? 0.7 : 0.6;
  gfx.fillStyle(BG_DARK_NEON, bgAlpha);
  gfx.fillRoundedRect(left, top, w, h, radius);

  // Неоновая cyan рамка
  const borderAlpha = pressed ? 0.7 : hover ? 0.6 : 0.4;
  gfx.lineStyle(1, NEON_CYAN, borderAlpha);
  gfx.strokeRoundedRect(left, top, w, h, radius);

  // Тонкая неоновая линия-блик сверху (1px, cyan)
  gfx.lineStyle(1, NEON_CYAN, 0.15);
  gfx.beginPath();
  gfx.moveTo(left + radius, top);
  gfx.lineTo(left + w - radius, top);
  gfx.strokePath();
}

// Обратная совместимость
export { drawGlassButton as drawOrnamentalButton };

// Пунктирная линия — неоновые cyan чёрточки
export function drawChainDecoration(gfx, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.floor(len / 12);

  // Нормализованное направление для чёрточек
  const nx = dx / (len || 1);
  const ny = dy / (len || 1);
  const dashHalf = 3; // полудлина чёрточки

  for (let i = 0; i <= steps; i++) {
    const t = i / Math.max(steps, 1);
    const cx = x1 + dx * t;
    const cy = y1 + dy * t;

    // Чёрточки — neon cyan
    gfx.lineStyle(1, NEON_CYAN, 0.15);
    gfx.beginPath();
    gfx.moveTo(cx - nx * dashHalf, cy - ny * dashHalf);
    gfx.lineTo(cx + nx * dashHalf, cy + ny * dashHalf);
    gfx.strokePath();
  }
}

// Обратная совместимость
export { drawChainDecoration as drawRopeDecoration };

// Процедурные капли крови — неоновый pink вместо тёмного красного
export function drawBloodSplatter(gfx, x, y, radius, intensity = 0.7) {
  const color = NEON_PINK;

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

// Рамка-chip (MUI Chip стиль) — тёмное стекло + тонкая cyan рамка
export function drawSteelFrame(gfx, x, y, w, h) {
  const left = x - w / 2;
  const top = y - h / 2;
  const radius = Math.min(h / 2, 16); // pill если маленький, 16px если большой

  // Фон — тёмное стекло
  gfx.fillStyle(BG_DARK_NEON, 0.4);
  gfx.fillRoundedRect(left, top, w, h, radius);

  // Рамка — тонкая cyan
  gfx.lineStyle(1, NEON_CYAN, 0.15);
  gfx.strokeRoundedRect(left, top, w, h, radius);
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

// Вспышка искр — cyan + pink неоновые частицы
export function createEmberBurst(scene, x, y, count = 10, depth = 20) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 60;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed - 20; // вверх
    const size = 2 + Math.random() * 2; // 2–4px (крупнее)

    // Случайный выбор: cyan или pink
    const color = Math.random() < 0.5 ? NEON_CYAN : NEON_PINK;

    const ember = scene.add.graphics().setDepth(depth);
    ember.fillStyle(color, 0.9);
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

// MUI Chip — pill-shape с текстом, тёмное стекло + cyan рамка
export function drawChip(gfx, x, y, w, h) {
  const left = x - w / 2;
  const top = y - h / 2;
  const radius = h / 2; // полный pill

  // Фон — тёмное стекло
  gfx.fillStyle(BG_DARK_NEON, 0.4);
  gfx.fillRoundedRect(left, top, w, h, radius);

  // Рамка — тонкая cyan
  gfx.lineStyle(1, NEON_CYAN, 0.15);
  gfx.strokeRoundedRect(left, top, w, h, radius);
}

// Neon glow утилита — добавляет тень-свечение на текстовый объект Phaser
export function applyNeonGlow(textObj, color = '#00F5D4', blur = 8) {
  textObj.setShadow(0, 0, color, blur, true, true);
  return textObj;
}

// Ржавые края — no-op в новом дизайне
export function drawRustedEdge() {}
