import Phaser from 'phaser';
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
  tryHook(px, py, vx, vy, anchors, now, lastReleaseTime, screenW) {
    // Кулдаун — нельзя мгновенно перецепиться
    if (now - lastReleaseTime < HOOK_COOLDOWN) return null;

    const effectiveRange = this.getEffectiveRange(vy);

    let nearest = null;
    let minDist = Infinity;

    for (const anchor of anchors) {
      // Якоря выше — полный радиус, якоря ниже — уменьшенный (но не запрещены)
      const isBelow = anchor.y > py + 50;
      const range = isBelow ? effectiveRange * 0.75 : effectiveRange;
      // Wrap-aware расстояние по X — учитываем телепортацию
      const dx1 = Math.abs(px - anchor.x);
      const dx2 = Math.abs(px - anchor.x + screenW);
      const dx3 = Math.abs(px - anchor.x - screenW);
      const dx = Math.min(dx1, dx2, dx3);
      const dy = py - anchor.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist && dist < range) {
        minDist = dist;
        nearest = anchor;
      }
    }

    // Промах — нет якорей в радиусе
    if (!nearest) return null;

    const ropeLength = Phaser.Math.Clamp(minDist, MIN_ROPE, MAX_ROPE_LENGTH);

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
  calcRelease(swingAngle, swingSpeed, ropeLength) {
    const speed = swingSpeed * ropeLength * RELEASE_BOOST;
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
    const angularAccel = (GRAVITY / state.ropeLen) * Math.cos(state.angle);
    let speed = state.speed + angularAccel * dt;
    speed *= SWING_FRICTION;

    const angle = state.angle + speed * dt;

    const x = anchor.x + Math.cos(angle) * state.ropeLen;
    const y = anchor.y + Math.sin(angle) * state.ropeLen;

    return { x, y, angle, speed };
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
  getEffectiveRange(vy) {
    const fallSpeed = Math.max(0, vy);
    const penalty = Phaser.Math.Clamp(
      (fallSpeed - FALL_SPEED_PENALTY_START) / (FALL_SPEED_PENALTY_MAX - FALL_SPEED_PENALTY_START),
      0, 1
    );
    return HOOK_RANGE * (1 - penalty * (1 - HOOK_RANGE_FALLING_MIN));
  }
}
