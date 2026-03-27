// FPS-счётчик для dev-режима
// Автоматически убирается из prod-сборки через import.meta.env.DEV
// Показывает rolling average FPS за последние 60 кадров + просадки

const HISTORY_SIZE = 60;  // кадров для rolling average
const WARN_FPS = 55;      // ниже — amber предупреждение
const CRIT_FPS = 45;      // ниже — pink критичное

const COLOR_OK   = '#00F5D4'; // neon cyan
const COLOR_WARN = '#FFB800'; // neon amber
const COLOR_CRIT = '#FF2E63'; // neon pink
const COLOR_BG   = 'rgba(10, 14, 26, 0.8)';

export class FPSCounter {
  // Приватные поля
  #history = new Float32Array(HISTORY_SIZE); // кольцевой буфер интервалов (ms)
  #head = 0;                                 // указатель на текущую позицию
  #count = 0;                                // сколько кадров уже накоплено
  #lastTime = 0;
  #enabled;

  constructor() {
    // Только в dev-режиме Vite
    this.#enabled = import.meta.env.DEV;
  }

  get isEnabled() { return this.#enabled; }

  // Вызывается в начале каждого кадра с timestamp из rAF
  tick(timestamp) {
    if (!this.#enabled) return;

    if (this.#lastTime > 0) {
      const dt = timestamp - this.#lastTime;
      this.#history[this.#head] = dt;
      this.#head = (this.#head + 1) % HISTORY_SIZE;
      if (this.#count < HISTORY_SIZE) this.#count++;
    }
    this.#lastTime = timestamp;
  }

  // Текущий rolling average FPS
  #getAvgFPS() {
    if (this.#count === 0) return 0;
    let sum = 0;
    const n = this.#count;
    for (let i = 0; i < n; i++) {
      sum += this.#history[i];
    }
    return 1000 / (sum / n);
  }

  // Минимальный FPS за буфер (worst frame)
  #getMinFPS() {
    if (this.#count === 0) return 0;
    let max = 0;
    const n = this.#count;
    for (let i = 0; i < n; i++) {
      if (this.#history[i] > max) max = this.#history[i];
    }
    return 1000 / max;
  }

  // Отрисовка в правом верхнем углу canvas
  draw(ctx, canvasWidth) {
    if (!this.#enabled) return;

    const avg = this.#getAvgFPS();
    const min = this.#getMinFPS();

    const color = avg < CRIT_FPS ? COLOR_CRIT
                : avg < WARN_FPS ? COLOR_WARN
                : COLOR_OK;

    const x = canvasWidth - 8;
    const y = 8;
    const lineH = 14;
    const padX = 6;
    const padY = 4;

    ctx.save();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Текстовые строки
    const avgStr = `FPS ${avg.toFixed(0)}`;
    const minStr = `MIN ${min.toFixed(0)}`;

    ctx.font = `bold 11px 'Inter', monospace`;
    const w = Math.max(ctx.measureText(avgStr).width, ctx.measureText(minStr).width);

    const bgX = x - w - padX * 2;
    const bgY = y;
    const bgW = w + padX * 2;
    const bgH = lineH * 2 + padY * 2;

    // Фон
    ctx.fillStyle = COLOR_BG;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(bgX, bgY, bgW, bgH, 4);
    } else {
      ctx.rect(bgX, bgY, bgW, bgH);
    }
    ctx.fill();

    // Рамка — цвет по состоянию
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Текст
    ctx.fillStyle = color;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(avgStr, x, y + padY);

    // MIN — чуть тусклее
    ctx.globalAlpha = 0.6;
    ctx.fillText(minStr, x, y + padY + lineH);

    ctx.restore();
  }
}
