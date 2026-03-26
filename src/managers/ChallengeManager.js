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

// Версия данных — при изменении сбрасывает ВСЁ: рекорды + скины + прогресс (тестовый период)
const CHALLENGE_DATA_VERSION = 5;

export class ChallengeManager {
  constructor() {
    this.week = getCurrentWeek();
    this._migrateIfNeeded();
    this.data = { unlockedSkins: profile.unlockedSkins, weeklyProgress: { ...profile.weeklyProgress } };
    this._ensureWeekChallenge();
    this.cleanupOldWeeks();

    // Подписка: когда серверные данные придут — обновить локальное состояние
    profile.onUpdated((serverData) => {
      this._syncFromServer(serverData);
    });
  }

  // Обновить состояние из серверных данных (merge: берём максимум прогресса)
  _syncFromServer(serverData) {
    if (!serverData?.weeklyProgress) return;

    const weekKey = `week${this.week}`;
    const serverChallenge = serverData.weeklyProgress[weekKey];
    const localChallenge = this.data.weeklyProgress[weekKey];

    if (serverChallenge) {
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

  // Полный сброс при изменении версии данных
  _migrateIfNeeded() {
    const stored = parseInt(localStorage.getItem('thehook_challenge_ver') || '0', 10);
    if (stored < CHALLENGE_DATA_VERSION) {
      // Если на устройстве УЖЕ были данные — сбрасываем (реальная миграция)
      // Если устройство новое (нет thehook_challenges) — просто ставим версию
      const hasExistingData = !!localStorage.getItem('thehook_challenges') || !!localStorage.getItem('thehook_best');
      if (hasExistingData) {
        // Сбрасываем только скины и прогресс испытаний (локальный кэш)
        // bestScore НЕ трогаем — сервер является источником правды
        profile.updateWeeklyProgress({});
        profile._data.unlockedSkins = ['default'];
        profile._data.activeSkin = 'default';
        profile._provider.saveField('unlockedSkins', ['default']).catch(() => {});
        profile._provider.saveField('activeSkin', 'default').catch(() => {});
        profile._data.gamesCount = 0;
        profile._provider.saveField('gamesCount', 0).catch(() => {});
      }
      try { localStorage.setItem('thehook_challenge_ver', String(CHALLENGE_DATA_VERSION)); } catch {}
    }
  }

  // Генерация испытания для текущей недели (детерминированная по номеру недели)
  _ensureWeekChallenge() {
    const weekKey = `week${this.week}`;
    const existing = this.data.weeklyProgress[weekKey];

    // Миграция: всегда пересчитываем таргет по формуле, сохраняя прогресс
    if (existing) {
      const typeIdx = this.week % CHALLENGE_TYPES.length;
      const ct = CHALLENGE_TYPES[typeIdx];
      const correctTarget = ct.genTarget(this.week);
      if (existing.target !== correctTarget && !existing.completed) {
        existing.target = correctTarget;
        existing.type = ct.type; // тип тоже мог устареть
        profile.updateWeeklyProgress(this.data.weeklyProgress);
      }
      return;
    }

    // Детерминированный выбор типа по номеру недели
    const typeIdx = this.week % CHALLENGE_TYPES.length;
    const ct = CHALLENGE_TYPES[typeIdx];

    // Скин = циклический (week 1 → skin 1, week 11 → skin 1 снова)
    const skinIdx = ((this.week - 1) % (SKINS.length - 1)) + 1; // skip 'default' (idx 0)
    const rewardSkin = SKINS[skinIdx]?.id || 'default';

    this.data.weeklyProgress[weekKey] = {
      type: ct.type,
      target: ct.genTarget(this.week),
      count: ct.count || 1,
      progress: 0,        // текущий прогресс
      streakCount: 0,     // для streak типа
      completed: false,
      rewardSkin,
      claimed: false,      // награда забрана
    };
    profile.updateWeeklyProgress(this.data.weeklyProgress);
  }

  // Получить текущее испытание
  getCurrentChallenge() {
    return this.data.weeklyProgress[`week${this.week}`] || null;
  }

  // Обновить прогресс после игры
  // gameResult = { height, hitCount, gamesPlayed }
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

  // Забрать награду (разблокировать скин)
  claimReward() {
    const ch = this.getCurrentChallenge();
    if (!ch || !ch.completed || ch.claimed) return null;

    ch.claimed = true;
    // Разблокируем скин через profile API
    profile.unlockSkin(ch.rewardSkin);
    profile.updateWeeklyProgress(this.data.weeklyProgress);
    return ch.rewardSkin;
  }

  // Очистка старых недель (оставляем только текущую + 2 предыдущие)
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
