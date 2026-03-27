import { profile, getCurrentWeek } from '../data/index.js';
import { SKINS } from './SkinRenderer.js';

// Пул типов испытаний (цели повышены до 100к — тестовый период)
const CHALLENGE_TYPES = [
  { type: 'reach', genTarget: (w) => 100000 + w * 5000 },         // набрать Xм за одну игру
  { type: 'total', genTarget: (w) => 150000 + w * 10000 },        // суммарно Xм за неделю
  { type: 'no_hit', genTarget: (w) => 100000 + w * 5000 },        // Xм без столкновений с жуками
  { type: 'games', genTarget: (w) => 500 + w * 50 },              // сыграть X игр за неделю
  { type: 'streak', genTarget: (w) => 100000 + w * 5000, count: 3 }, // набрать Xм 3 раза подряд
];

export class ChallengeManager {
  constructor() {
    this.week = getCurrentWeek();
    // Данные приходят из profile (который уже загрузил с сервера)
    this.data = { unlockedSkins: profile.unlockedSkins, weeklyProgress: { ...profile.weeklyProgress } };
    this.#ensureWeekChallenge();
    this.cleanupOldWeeks();

    // Подписка: когда серверные данные придут — обновить локальное состояние
    this.#unsubscribe = profile.onUpdated((serverData) => {
      this.#syncFromServer(serverData);
    });
  }

  // Приватное поле для отписки
  #unsubscribe = null;

  destroy() {
    if (this.#unsubscribe) {
      this.#unsubscribe();
      this.#unsubscribe = null;
    }
  }

  // Обновить состояние из серверных данных (сервер = правда)
  #syncFromServer(serverData) {
    if (!serverData?.weeklyProgress) return;

    const weekKey = `week${this.week}`;
    const serverChallenge = serverData.weeklyProgress[weekKey];

    if (serverChallenge) {
      const localChallenge = this.data.weeklyProgress[weekKey];
      if (!localChallenge) {
        // Локально нет — берём серверное целиком
        this.data.weeklyProgress[weekKey] = serverChallenge;
      } else {
        // Merge: берём максимальный прогресс
        localChallenge.progress = Math.max(localChallenge.progress || 0, serverChallenge.progress || 0);
        localChallenge.streakCount = Math.max(localChallenge.streakCount || 0, serverChallenge.streakCount || 0);
        localChallenge.completed = localChallenge.completed || serverChallenge.completed;
        localChallenge.claimed = localChallenge.claimed || serverChallenge.claimed;
      }
    }

    // Скины — объединяем
    if (serverData.unlockedSkins) {
      this.data.unlockedSkins = [...new Set([
        ...this.data.unlockedSkins,
        ...serverData.unlockedSkins,
      ])];
    }
  }

  // Генерация испытания для текущей недели (детерминированная по номеру недели)
  #ensureWeekChallenge() {
    const weekKey = `week${this.week}`;
    const existing = this.data.weeklyProgress[weekKey];

    // Пересчитываем таргет по клиентской формуле, сохраняя прогресс
    if (existing) {
      const typeIdx = this.week % CHALLENGE_TYPES.length;
      const ct = CHALLENGE_TYPES[typeIdx];
      const correctTarget = ct.genTarget(this.week);
      if (existing.target !== correctTarget && !existing.completed) {
        existing.target = correctTarget;
        existing.type = ct.type;
        profile.updateWeeklyProgress(this.data.weeklyProgress);
      }
      return;
    }

    // Детерминированный выбор типа по номеру недели
    const typeIdx = this.week % CHALLENGE_TYPES.length;
    const ct = CHALLENGE_TYPES[typeIdx];

    // Скин = циклический (week 1 → skin 1, week 11 → skin 1 снова)
    const skinIdx = ((this.week - 1) % (SKINS.length - 1)) + 1;
    const rewardSkin = SKINS[skinIdx]?.id || 'default';

    this.data.weeklyProgress[weekKey] = {
      type: ct.type,
      target: ct.genTarget(this.week),
      count: ct.count || 1,
      progress: 0,
      streakCount: 0,
      completed: false,
      rewardSkin,
      claimed: false,
    };
    profile.updateWeeklyProgress(this.data.weeklyProgress);
  }

  getCurrentChallenge() {
    return this.data.weeklyProgress[`week${this.week}`] || null;
  }

  updateProgress(gameResult) {
    const ch = this.getCurrentChallenge();
    if (!ch || ch.completed) return false;

    let changed = false;

    switch (ch.type) {
      case 'reach':
        if (gameResult.height > ch.progress) {
          ch.progress = gameResult.height;
          changed = true;
        }
        if (ch.progress >= ch.target) ch.completed = true;
        break;

      case 'total':
        ch.progress += gameResult.height;
        changed = true;
        if (ch.progress >= ch.target) ch.completed = true;
        break;

      case 'no_hit':
        if (gameResult.hitCount === 0 && gameResult.height > ch.progress) {
          ch.progress = gameResult.height;
          changed = true;
        }
        if (ch.progress >= ch.target) ch.completed = true;
        break;

      case 'games':
        ch.progress += 1;
        changed = true;
        if (ch.progress >= ch.target) ch.completed = true;
        break;

      case 'streak':
        if (gameResult.height >= ch.target) {
          ch.streakCount = (ch.streakCount || 0) + 1;
          changed = true;
        } else {
          ch.streakCount = 0;
          changed = true;
        }
        ch.progress = ch.streakCount;
        if (ch.streakCount >= (ch.count || 3)) ch.completed = true;
        break;
    }

    if (changed) profile.updateWeeklyProgress(this.data.weeklyProgress);
    return ch.completed;
  }

  claimReward() {
    const ch = this.getCurrentChallenge();
    if (!ch || !ch.completed || ch.claimed) return null;

    ch.claimed = true;
    profile.unlockSkin(ch.rewardSkin);
    profile.updateWeeklyProgress(this.data.weeklyProgress);
    return ch.rewardSkin;
  }

  cleanupOldWeeks() {
    const keys = Object.keys(this.data.weeklyProgress);
    for (const key of keys) {
      const weekNum = parseInt(key.replace('week', ''), 10);
      if (weekNum < this.week - 2) {
        delete this.data.weeklyProgress[key];
      }
    }
    profile.updateWeeklyProgress(this.data.weeklyProgress);
  }
}
