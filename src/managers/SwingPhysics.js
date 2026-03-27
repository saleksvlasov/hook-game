import { clamp } from '../engine/math.js';
import {
  GRAVITY, HOOK_RANGE, MAX_ROPE_LENGTH, MIN_ROPE,
  SWING_FRICTION, RELEASE_BOOST, HOOK_COOLDOWN,
  FALL_SPEED_PENALTY_START, FALL_SPEED_PENALTY_MAX,
  HOOK_RANGE_FALLING_MIN, MIN_SWING_SPEED,
} from '../constants.js';

/**
 * Физика маятника и хука — чистые расчёты без side-effects.
 * Все значения (isHooked, swingAngle и т.д.) остаются в GameScene.
 */
export class SwingPhysics {

  // ===================== HOOK: ПОИСК ЯКОРЯ =====================

  /**
   * Пытается зацепиться за ближайший якорь.
   * @returns {{ anchor, ropeLength, swingAngle, swingSpeed } | null}
   */
  tryHook(px, py, vx, vy, anchors, now, lastReleaseTime, screenW, overrides = {}) {
    // Кулдаун — нельзя мгновенно перецепиться
    const cooldown = overrides.hookCooldown ?? HOOK_COOLDOWN;
    if (now - lastReleaseTime < cooldown) return null;

    const effectiveRange = this.getEffectiveRange(vy, overrides.hookRange);

    let nearest = null;
    let minDist = Infinity;

    for (const anchor of anchors) {
      // Быстрый фильтр по Y — пропускаем далёкие якоря без sqrt
      const dy = py - anchor.y;
      if (dy < -effectiveRange || dy > effectiveRange) continue;

      // Якоря выше — полный радиус, якоря ниже — уменьшенный (но не запрещены)
      const isBelow = anchor.y > py + 50;
      const range = isBelow ? effectiveRange * 0.75 : effectiveRange;
      // Простое расстояние по X (без wrap — избегаем телепортации через край экрана)
      const dx = Math.abs(px - anchor.x);
      if (dx > range) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist && dist < range) {
        minDist = dist;
        nearest = anchor;
      }
    }

    // Промах — нет якорей в радиусе
    if (!nearest) return null;

    // Не клампим сверху — стартуем с реального расстояния, плавно подтягиваем в updatePendulum
    const ropeLength = Math.max(minDist, MIN_ROPE);

    const dx = px - nearest.x;
    const dy = py - nearest.y;
    const swingAngle = Math.atan2(dy, dx);

    // Конвертируем инерцию полёта в угловую скорость маятника
    const tangent = -vx * Math.sin(swingAngle) + vy * Math.cos(swingAngle);
    let swingSpeed = tangent / ropeLength;

    // Начальный толчок — достаточный для раскачки, но не для перелёта
    if (Math.abs(swingSpeed) < MIN_SWING_SPEED) {
      const dir = Math.sign(swingSpeed) || (px < nearest.x ? -1 : 1);
      swingSpeed = dir * MIN_SWING_SPEED;
    }

    return { anchor: nearest, ropeLength, swingAngle, swingSpeed };
  }

  // ===================== RELEASE: СКОРОСТЬ ПРИ ОТПУСКАНИИ =====================

  /**
   * Рассчитывает вектор скорости при отпускании крюка.
   * @returns {{ vx: number, vy: number }}
   */
  calcRelease(swingAngle, swingSpeed, ropeLength, overrides = {}) {
    const releaseBoost = overrides.releaseBoost ?? RELEASE_BOOST;
    const speed = swingSpeed * ropeLength * releaseBoost;
    return {
      vx: -speed * Math.sin(swingAngle),
      vy:  speed * Math.cos(swingAngle),
    };
  }

  // ===================== PENDULUM UPDATE =====================

  /**
   * Один шаг физики маятника.
   * @param {number} dt — секунды (delta / 1000)
   * @param {{ x: number, y: number }} anchor
   * @param {{ angle: number, speed: number, ropeLen: number }} state
   * @returns {{ x: number, y: number, angle: number, speed: number }}
   */
  updatePendulum(dt, anchor, state) {
    // Плавное подтягивание верёвки к MAX_ROPE_LENGTH (~300px/сек)
    let ropeLen = state.ropeLen;
    if (ropeLen > MAX_ROPE_LENGTH) {
      ropeLen = Math.max(MAX_ROPE_LENGTH, ropeLen - 300 * dt);
    }

    const angularAccel = (GRAVITY / ropeLen) * Math.cos(state.angle);
    let speed = state.speed + angularAccel * dt;
    speed *= SWING_FRICTION;

    const angle = state.angle + speed * dt;

    const x = anchor.x + Math.cos(angle) * ropeLen;
    const y = anchor.y + Math.sin(angle) * ropeLen;

    return { x, y, angle, speed, ropeLen };
  }

  // ===================== WRAP-AROUND =====================

  /** Телепортация при выходе за край мира. Возвращает offset или 0. */
  wrapX(x, width) {
    if (x < 0) return width;
    if (x > width) return -width;
    return 0;
  }

  // ===================== FALL PENALTY =====================

  /** Эффективный радиус зацепа с учётом штрафа за падение. */
  getEffectiveRange(vy, hookRange = HOOK_RANGE) {
    const fallSpeed = Math.max(0, vy);
    const penalty = clamp(
      (fallSpeed - FALL_SPEED_PENALTY_START) / (FALL_SPEED_PENALTY_MAX - FALL_SPEED_PENALTY_START),
      0, 1
    );
    return hookRange * (1 - penalty * (1 - HOOK_RANGE_FALLING_MIN));
  }
}
