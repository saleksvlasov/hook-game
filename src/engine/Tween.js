// Минимальный Tween engine — замена Phaser.Tweens
// Easing формулы сверены с Phaser source (см. [MATH] отчёт)

// === Easing функции ===

const BACK_OVERSHOOT = 1.70158;

export const Ease = {
  Linear: (t) => t,

  // Sine.easeInOut: -(cos(πt) - 1) / 2
  SineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Sine.easeIn
  SineIn: (t) => 1 - Math.cos((t * Math.PI) / 2),

  // Sine.easeOut
  SineOut: (t) => Math.sin((t * Math.PI) / 2),

  // Cubic.easeOut: 1 - (1-t)³
  CubicOut: (t) => 1 - Math.pow(1 - t, 3),

  // Cubic.easeIn: t³
  CubicIn: (t) => t * t * t,

  // Back.easeOut: 1 + (s+1)(t-1)³ + s(t-1)²
  BackOut: (t) => {
    const s = BACK_OVERSHOOT;
    const t1 = t - 1;
    return 1 + (s + 1) * t1 * t1 * t1 + s * t1 * t1;
  },
};

// Маппинг строковых имён Phaser → функции
const EASE_MAP = {
  'Linear': Ease.Linear,
  'Sine.easeInOut': Ease.SineInOut,
  'Sine.easeIn': Ease.SineIn,
  'Sine.easeOut': Ease.SineOut,
  'Cubic.easeOut': Ease.CubicOut,
  'Cubic.easeIn': Ease.CubicIn,
  'Back.easeOut': Ease.BackOut,
};

function resolveEase(ease) {
  if (typeof ease === 'function') return ease;
  return EASE_MAP[ease] || Ease.Linear;
}

// === TweenManager ===

export class TweenManager {
  // Приватные поля
  #tweens = [];

  // Добавить tween — совместимый с Phaser API
  // config: { targets, duration, delay, ease, yoyo, repeat, onComplete, onUpdate, ...props }
  add(config) {
    const targets = Array.isArray(config.targets) ? config.targets : [config.targets];
    const ease = resolveEase(config.ease);
    const duration = config.duration || 1000;
    const delay = config.delay || 0;
    const yoyo = config.yoyo || false;
    const repeat = config.repeat ?? 0; // -1 = бесконечно
    const hold = config.hold || 0;

    // Собираем анимируемые свойства (всё кроме конфиг-полей)
    const RESERVED = ['targets', 'duration', 'delay', 'ease', 'yoyo', 'repeat', 'hold', 'onComplete', 'onUpdate'];
    const props = {};
    for (const key of Object.keys(config)) {
      if (RESERVED.includes(key)) continue;
      const val = config[key];
      if (typeof val === 'object' && val !== null && ('from' in val || 'to' in val)) {
        props[key] = val; // {from, to}
      } else if (typeof val === 'number') {
        props[key] = { to: val }; // короткая запись: alpha: 0.5 → {to: 0.5}
      }
    }

    for (const target of targets) {
      const startValues = {};
      for (const [key, val] of Object.entries(props)) {
        startValues[key] = val.from !== undefined ? val.from : target[key];
        // Если есть from — сразу устанавливаем начальное значение
        if (val.from !== undefined && target[key] !== undefined) {
          target[key] = val.from;
        }
      }

      this.#tweens.push({
        target,
        props,
        startValues,
        ease,
        duration,
        delay,
        yoyo,
        repeat,
        hold,
        elapsed: 0,
        repeatCount: 0,
        forward: true, // направление (для yoyo)
        onComplete: config.onComplete || null,
        onUpdate: config.onUpdate || null,
      });
    }
  }

  // Обновить все tweens — вызывается каждый кадр
  update(delta) {
    for (let i = this.#tweens.length - 1; i >= 0; i--) {
      const tw = this.#tweens[i];
      // Защита: clear() мог обнулить массив во время итерации (switchScene из onComplete)
      if (!tw) break;

      // Задержка
      if (tw.delay > 0) {
        tw.delay -= delta;
        continue;
      }

      tw.elapsed += delta;
      let t = Math.min(tw.elapsed / tw.duration, 1);

      // Yoyo: обратное направление
      if (!tw.forward) t = 1 - t;

      const eased = tw.ease(t);

      // Обновляем свойства
      for (const [key, val] of Object.entries(tw.props)) {
        const start = tw.startValues[key];
        const end = val.to !== undefined ? val.to : start;
        if (tw.target[key] !== undefined || tw.target['set' + key.charAt(0).toUpperCase() + key.slice(1)]) {
          tw.target[key] = start + (end - start) * eased;
        }
      }

      if (tw.onUpdate) tw.onUpdate(tw.target);

      // Завершение одной итерации
      if (tw.elapsed >= tw.duration) {
        if (tw.yoyo && tw.forward) {
          // Переход в обратном направлении
          tw.forward = false;
          tw.elapsed = 0;
        } else {
          // Итерация завершена
          if (tw.repeat === -1 || tw.repeatCount < tw.repeat) {
            tw.repeatCount++;
            tw.elapsed = 0;
            tw.forward = true;
            // Восстановить начальные значения
            for (const [key] of Object.entries(tw.props)) {
              tw.target[key] = tw.startValues[key];
            }
          } else {
            // Tween полностью завершён
            // Устанавливаем финальные значения
            for (const [key, val] of Object.entries(tw.props)) {
              tw.target[key] = val.to !== undefined ? val.to : tw.startValues[key];
            }
            if (tw.onComplete) tw.onComplete();
            // Swap-and-pop вместо splice (O(1) вместо O(n))
            // Guard: onComplete мог вызвать clear()
            if (this.#tweens.length > 0) {
              const last = this.#tweens.length - 1;
              if (i < last) this.#tweens[i] = this.#tweens[last];
              this.#tweens.length = last;
            }
          }
        }
      }
    }
  }

  // Остановить все tweens для объекта
  killTweensOf(target) {
    this.#tweens = this.#tweens.filter(tw => tw.target !== target);
  }

  // Остановить все tweens
  clear() {
    this.#tweens.length = 0;
  }
}
