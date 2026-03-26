import { TelegramProvider, getCurrentWeek } from './TelegramProvider.js';

// Единая точка входа к данным пользователя
// Архитектура: СЕРВЕР = единственный источник правды, localStorage = кэш
class UserProfile {
  constructor() {
    this._provider = null;
    this._data = null;
    this._listeners = [];
    this._initialized = false;
  }

  // Инициализация — вызвать один раз в main.js (await обязателен)
  async init() {
    this._provider = new TelegramProvider();

    // Мгновенно: кэш для первого кадра
    this._data = this._provider.readCache();
    this._initialized = true;

    // Async: загружаем серверные данные (сервер ПЕРЕЗАПИСЫВАЕТ кэш)
    try {
      const serverData = await this._provider.loadProfile();
      if (serverData) {
        this._data = serverData;
        this._notify();
      }
    } catch {
      // Сервер недоступен — работаем с кэшем
    }
  }

  // --- Синхронные геттеры (из кэша/серверных данных) ---

  get bestScore() { return this._data?.bestScore || 0; }
  get moonReached() { return this._data?.moonReached || false; }
  get activeSkin() { return this._data?.activeSkin || 'default'; }
  get unlockedSkins() { return this._data?.unlockedSkins || ['default']; }
  get weeklyProgress() { return this._data?.weeklyProgress || {}; }
  get lang() { return this._data?.lang || null; }
  get gamesCount() { return this._data?.gamesCount || 0; }
  get isAuthorized() { return this._provider?.isAuthorized() || false; }
  get currentWeek() { return getCurrentWeek(); }

  isSkinUnlocked(skinId) {
    return this.unlockedSkins.includes(skinId);
  }

  // --- Сеттеры (обновляют _data + сервер + кэш) ---

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

  updateWeeklyProgress(weeklyProgress) {
    this._data.weeklyProgress = weeklyProgress;
    this._provider.saveField('weeklyProgress', weeklyProgress).catch(() => {});
  }

  // --- Async операции ---

  async saveChallenge(height, hitCount, gameTime) {
    return this._provider.saveChallenge(height, hitCount, gameTime);
  }

  async claimSkin() {
    const result = await this._provider.claimSkin();
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

  // --- Подписка на серверные обновления ---

  onUpdated(callback) {
    this._listeners.push(callback);
    return () => { this._listeners = this._listeners.filter(cb => cb !== callback); };
  }

  _notify() {
    for (const cb of this._listeners) {
      try { cb(this._data); } catch {}
    }
  }
}

// Singleton
export const profile = new UserProfile();
