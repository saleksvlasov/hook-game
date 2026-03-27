// Steering Behaviors — Craig Reynolds
// Переиспользуемый модуль для жуков, NPC, движущихся якорей
// Без аллокаций в hot path — все вектора inline

// --- Утилиты ---

// Обрезка вектора до максимальной длины (inline, без объектов)
function truncate(vx, vy, max) {
  const sq = vx * vx + vy * vy;
  if (sq > max * max) {
    const len = Math.sqrt(sq);
    return [vx / len * max, vy / len * max];
  }
  return [vx, vy];
}

// --- Базовые поведения ---
// Все возвращают [fx, fy] — вектор управляющей силы (steering force)

/**
 * Seek — двигаться к цели с максимальной скоростью
 * @returns [fx, fy] steering force
 */
export function seek(agent, targetX, targetY) {
  const dx = targetX - agent.x;
  const dy = targetY - agent.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.001) return [0, 0];

  // desired velocity = направление к цели × maxSpeed
  const desiredX = dx / dist * agent.maxSpeed;
  const desiredY = dy / dist * agent.maxSpeed;

  // steering = desired - current velocity
  return truncate(desiredX - agent.vx, desiredY - agent.vy, agent.maxForce);
}

/**
 * Flee — убегать от угрозы (только внутри panicRadius)
 * @returns [fx, fy] steering force
 */
export function flee(agent, threatX, threatY, panicRadius) {
  const dx = agent.x - threatX;
  const dy = agent.y - threatY;
  const distSq = dx * dx + dy * dy;

  // За пределами паники — не реагируем
  if (distSq > panicRadius * panicRadius) return [0, 0];

  const dist = Math.sqrt(distSq);
  if (dist < 0.001) return [agent.maxForce, 0]; // экстренно убегаем вправо

  const desiredX = dx / dist * agent.maxSpeed;
  const desiredY = dy / dist * agent.maxSpeed;

  return truncate(desiredX - agent.vx, desiredY - agent.vy, agent.maxForce);
}

/**
 * Arrive — двигаться к цели с замедлением при приближении
 * @returns [fx, fy] steering force
 */
export function arrive(agent, targetX, targetY, slowRadius) {
  const dx = targetX - agent.x;
  const dy = targetY - agent.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.5) return [0, 0];

  // Скорость пропорциональна расстоянию внутри slowRadius
  let speed = agent.maxSpeed;
  if (dist < slowRadius) {
    speed = agent.maxSpeed * (dist / slowRadius);
  }

  const desiredX = dx / dist * speed;
  const desiredY = dy / dist * speed;

  return truncate(desiredX - agent.vx, desiredY - agent.vy, agent.maxForce);
}

/**
 * Wander — когерентное случайное блуждание
 * Точка на окружности перед агентом + jitter = плавные повороты
 * @param {object} agent — должен иметь поле wanderAngle
 * @returns [fx, fy] steering force
 */
export function wander(agent, wanderRadius, wanderDist, wanderJitter) {
  // Сдвигаем wander-точку на случайный угол
  agent.wanderAngle += (Math.random() - 0.5) * wanderJitter;

  // Центр wander-окружности — впереди агента
  const speed = Math.sqrt(agent.vx * agent.vx + agent.vy * agent.vy);
  let headingX, headingY;
  if (speed > 0.01) {
    headingX = agent.vx / speed;
    headingY = agent.vy / speed;
  } else {
    // Нет скорости — случайное направление
    headingX = Math.cos(agent.wanderAngle);
    headingY = Math.sin(agent.wanderAngle);
  }

  const circleCenterX = agent.x + headingX * wanderDist;
  const circleCenterY = agent.y + headingY * wanderDist;

  // Точка на окружности
  const targetX = circleCenterX + Math.cos(agent.wanderAngle) * wanderRadius;
  const targetY = circleCenterY + Math.sin(agent.wanderAngle) * wanderRadius;

  return seek(agent, targetX, targetY);
}

/**
 * Contain — мягкое возвращение в границы
 * Чем дальше от центра — тем сильнее тянет назад
 * @returns [fx, fy] steering force
 */
export function contain(agent, centerX, centerY, radiusX, radiusY) {
  const dx = agent.x - centerX;
  const dy = agent.y - centerY;

  // Нормализованное отклонение [0..1+]
  const nx = radiusX > 0 ? Math.abs(dx) / radiusX : 0;
  const ny = radiusY > 0 ? Math.abs(dy) / radiusY : 0;

  let fx = 0, fy = 0;

  // Включается плавно от 70% радиуса
  if (nx > 0.7) {
    const strength = (nx - 0.7) / 0.3; // 0→1 от 70%→100%
    fx = -Math.sign(dx) * strength * agent.maxForce * 2;
  }
  if (ny > 0.7) {
    const strength = (ny - 0.7) / 0.3;
    fy = -Math.sign(dy) * strength * agent.maxForce * 2;
  }

  return [fx, fy];
}

// --- Интеграция ---

/**
 * Применить суммарную силу к агенту — обновить скорость и позицию
 * @param {object} agent — { x, y, vx, vy, maxSpeed }
 * @param {number} fx — суммарная сила X
 * @param {number} fy — суммарная сила Y
 * @param {number} delta — ms между кадрами
 */
export function applyForce(agent, fx, fy, delta) {
  // Масштабируем по delta (нормализуем к 16.67ms = 60fps)
  const dt = delta / 16.667;

  agent.vx += fx * dt;
  agent.vy += fy * dt;

  // Обрезка скорости
  const [tvx, tvy] = truncate(agent.vx, agent.vy, agent.maxSpeed);
  agent.vx = tvx;
  agent.vy = tvy;

  // Обновляем позицию
  agent.x += agent.vx * dt;
  agent.y += agent.vy * dt;
}
