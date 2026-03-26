import { LocalProvider, getCurrentWeek } from './LocalProvider.js';
import { TelegramProvider } from './TelegramProvider.js';
import { YandexProvider } from './YandexProvider.js';

// Единая точка входа к данным пользователя
// Определяет платформу, даёт синхронные геттеры (из кэша) и async сеттеры (кэш + сервер)
class UserProfile {
  constructor() {
    this._provider = null;
    this._data = null;
    this._listeners = [];
    this._initialized = false;
  }

  // Инициализация — вызвать один раз в main.js
  // Мгновенно читает кэш, async подтягивает сервер
  async init() {
    // Определяем платформу
    if (window.Telegram?.WebApp?.initData) {
      this._provider = new TelegramProvider();
    } else if (window.YaGames) {
      this._provider = new YandexProvider();
    } else {
      this._provider = new LocalProvider();
    }

    // Мгновенно: читаем кэш для синхронного доступа
    if (this._provider instanceof LocalProvider || this._provider instanceof YandexProvider) {
      this._data = this._provider.readCache();
    } else {
      // TelegramProvider: сначала кэш, потом сервер
      const localCache = new LocalProvider();
      this._data = localCache.readCache();
    }

    this._initialized = true;

    // Async: подтягиваем серверные данные
    try {
      const serverData = await this._provider.loadProfile();
      if (serverData) {
        const changed = this._hasChanges(serverData);
        this._data = serverData;
        if (changed) this._notify();
      }
    } catch {
      // Сервер недоступен — работаем с кэшем
    }
  }

  // --- Синхронные геттеры (из кэша) ---

  get bestScore() { return this._data?.bestScore || 0; }
  get moonReached() { return this._data?.moonReached || false; }
  get activeSkin() { return this._data?.activeSkin || 'default'; }
  get unlockedSkins() { return this._data?.unlockedSkins || ['default']; }
  get weeklyProgress() { return this._data?.weeklyProgress || {}; }
  get lang() { return this._data?.lang || null; }
  get gamesCount() { return this._data?.gamesCount || 0; }
  get isAuthorized() { return this._provider?.isAuthorized() || false; }
  get currentWeek() { return getCurrentWeek(); }

  // Проверить разблокирован ли скин
  isSkinUnlocked(skinId) {
    return this.unlockedSkins.includes(skinId);
  }

  // --- Сеттеры (кэш + async сервер) ---

  // Сохранить рекорд → boolean (isNewBest)
  saveBest(score) {
    if (score <= this._data.bestScore) return false;
    this._data.bestScore = score;
    this._provider.saveScore(score).catch(() => {});
    return true;
  }

  saveMoon() {
    this._data.moonReached = true;
    this._provider.saveField('moonReached', true).catch(() => {});
  }

  setActiveSkin(skinId) {
    this._data.activeSkin = skinId;
    this._provider.saveField('activeSkin', skinId).catch(() => {});
  }

  // Разблокировать скин (добавить в список)
  unlockSkin(skinId) {
    if (!this._data.unlockedSkins.includes(skinId)) {
      this._data.unlockedSkins.push(skinId);
      this._provider.saveField('unlockedSkins', this._data.unlockedSkins).catch(() => {});
    }
  }

  setLang(code) {
    this._data.lang = code;
    this._provider.saveField('lang', code).catch(() => {});
  }

  incrementGames() {
    this._data.gamesCount = (this._data.gamesCount || 0) + 1;
    this._provider.saveField('gamesCount', this._data.gamesCount).catch(() => {});
    return this._data.gamesCount;
  }

  // Обновить weeklyProgress в кэше (для ChallengeManager)
  updateWeeklyProgress(weeklyProgress) {
    this._data.weeklyProgress = weeklyProgress;
    this._provider.saveField('weeklyProgress', weeklyProgress).catch(() => {});
  }

  // --- Async операции (делегация провайдеру) ---

  async saveChallenge(height, hitCount, gameTime) {
    return this._provider.saveChallenge(height, hitCount, gameTime);
  }

  async claimSkin() {
    const result = await this._provider.claimSkin();
    // Обновляем кэш из ответа сервера
    if (result?.skinId) {
      if (!this._data.unlockedSkins.includes(result.skinId)) {
        this._data.unlockedSkins.push(result.skinId);
      }
    }
    return result;
  }

  async fetchLeaderboard() {
    return this._provider.fetchLeaderboard();
  }

  // --- Подписка на обновления (серверная синхронизация) ---

  onUpdated(callback) {
    this._listeners.push(callback);
    // Вернуть функцию отписки
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }

  // --- Приватные ---

  _notify() {
    for (const cb of this._listeners) {
      try { cb(this._data); } catch { /* callback ошибка не должна ломать приложение */ }
    }
  }

  _hasChanges(newData) {
    if (!this._data) return true;
    return (
      newData.bestScore !== this._data.bestScore ||
      newData.moonReached !== this._data.moonReached ||
      newData.activeSkin !== this._data.activeSkin ||
      newData.unlockedSkins?.length !== this._data.unlockedSkins?.length
    );
  }
}

// Singleton — один экземпляр на всё приложение
export const profile = new UserProfile();
