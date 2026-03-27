import { POWER_ARC_TIERS } from '../constants.js';

// Менеджер Power Arc — расчёт тира визуальной прогрессии по высоте
// Чистый калькулятор, без рендеринга
export class PowerArcManager {
  #tier = 0;
  #tierProgress = 0;

  get tier() { return this.#tier; }
  get tierProgress() { return this.#tierProgress; }
  get tierData() { return POWER_ARC_TIERS[this.#tier]; }

  // Обновить тир по текущей высоте (метры)
  // Возвращает true если тир изменился
  update(heightMeters) {
    const prevTier = this.#tier;

    // Найти активный тир
    let tier = 0;
    for (let i = POWER_ARC_TIERS.length - 1; i >= 0; i--) {
      if (heightMeters >= POWER_ARC_TIERS[i].startHeight) {
        tier = i;
        break;
      }
    }
    this.#tier = tier;

    // Прогресс внутри тира (0-1)
    const t = POWER_ARC_TIERS[tier];
    const range = t.endHeight - t.startHeight;
    this.#tierProgress = range > 0
      ? Math.min(1, (heightMeters - t.startHeight) / range)
      : 1;

    return this.#tier !== prevTier;
  }

  reset() {
    this.#tier = 0;
    this.#tierProgress = 0;
  }

  destroy() {
    // no-op
  }
}
