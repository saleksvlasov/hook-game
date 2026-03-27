import { TelegramProvider, getCurrentWeek } from './TelegramProvider.js';
import { DevProvider } from './DevProvider.js';
import { setLang } from '../i18n.js';

// Единая точка входа к данным пользователя
// Telegram → сервер (единственный источник правды)
// Без Telegram → DevProvider (мок в памяти, для локальной разработки)
class UserProfile {
  // Приватные поля
  #provider = null;
  #data = null;
  #listeners = [];
  #initialized = false;

  // Инициализация — загружает данные с сервера или мока
  // Бросает ошибку если сервер недоступен (только в Telegram)
  async init() {
    const hasTelegram = !!(window.Telegram?.WebApp?.initData);

    if (hasTelegram) {
      // Продакшн: Telegram Mini App → серверные данные
      this.#provider = new TelegramProvider();
      const serverData = await this.#provider.loadProfile();
      if (!serverData) {
        throw new Error('Server unavailable');
      }
      this.#data = serverData;
    } else {
      // Разработка: без Telegram → мок в памяти
      console.log('[DEV] Telegram не обнаружен — используется DevProvider');
      this.#provider = new DevProvider();
      this.#data = await this.#provider.loadProfile();
    }

    this.#initialized = true;

    // Установить язык из профиля
    if (this.#data.lang) {
      setLang(this.#data.lang);
    }
  }

  // --- Синхронные геттеры ---

  get bestScore() { return this.#data?.bestScore || 0; }
  get moonReached() { return this.#data?.moonReached || false; }
  get activeSkin() { return this.#data?.activeSkin || 'default'; }
  get unlockedSkins() { return this.#data?.unlockedSkins || ['default']; }
  get weeklyProgress() { return this.#data?.weeklyProgress || {}; }
  get lang() { return this.#data?.lang || null; }
  get gamesCount() { return this.#data?.gamesCount || 0; }
  get embers() { return this.#data?.embers || 0; }
  get upgrades() { return this.#data?.upgrades || {}; }
  get isAuthorized() { return this.#provider?.isAuthorized() || false; }
  get currentWeek() { return getCurrentWeek(); }

  isSkinUnlocked(skinId) {
    return this.unlockedSkins.includes(skinId);
  }

  // --- Сеттеры ---

  saveBest(score) {
    if (score <= this.#data.bestScore) return false;
    this.#data.bestScore = score;
    this.#provider.saveScore(score).catch(() => {});
    return true;
  }

  saveMoon() {
    this.#data.moonReached = true;
    this.#provider.saveField('moonReached', true).catch(() => {});
  }

  setActiveSkin(skinId) {
    this.#data.activeSkin = skinId;
    this.#provider.saveField('activeSkin', skinId).catch(() => {});
  }

  unlockSkin(skinId) {
    if (!this.#data.unlockedSkins.includes(skinId)) {
      this.#data.unlockedSkins.push(skinId);
      this.#provider.saveField('unlockedSkins', this.#data.unlockedSkins).catch(() => {});
    }
  }

  setLang(code) {
    this.#data.lang = code;
    setLang(code);
    this.#provider.saveField('lang', code).catch(() => {});
  }

  incrementGames() {
    // per-session — не сохраняется на сервер
    this.#data.gamesCount = (this.#data.gamesCount || 0) + 1;
    return this.#data.gamesCount;
  }

  updateWeeklyProgress(weeklyProgress) {
    this.#data.weeklyProgress = weeklyProgress;
    this.#provider.saveField('weeklyProgress', weeklyProgress).catch(() => {});
  }

  // --- Эмберы и апгрейды ---

  getUpgradeLevel(upgradeId) {
    return this.#data?.upgrades?.[upgradeId] || 0;
  }

  // Предварительное начисление эмберов (клиентское, сервер начислит реальные через saveChallenge)
  addEmbers(amount) {
    this.#data.embers = (this.#data.embers || 0) + amount;
    // Не шлём на сервер — эмберы начисляются серверно в /save-challenge
  }

  // Синхронизировать серверный баланс эмберов (вызывается после ответа saveChallenge)
  syncEmbers(serverEmbers) {
    if (typeof serverEmbers === 'number') {
      this.#data.embers = serverEmbers;
    }
  }

  async purchaseUpgrade(upgradeId, cost) {
    if ((this.#data.embers || 0) < cost) return false;
    // Оптимистичное обновление клиента
    this.#data.embers -= cost;
    if (!this.#data.upgrades) this.#data.upgrades = {};
    this.#data.upgrades[upgradeId] = (this.#data.upgrades[upgradeId] || 0) + 1;
    this.#notify();

    // Сервер сам считает стоимость и списывает
    const result = await this.#provider.saveUpgrade(upgradeId);
    if (result?.error) {
      // Откат оптимистичного обновления
      this.#data.embers += cost;
      this.#data.upgrades[upgradeId]--;
      this.#notify();
      return false;
    }
    // Синхронизировать баланс с сервером
    if (result?.embers !== undefined) {
      this.#data.embers = result.embers;
    }
    if (result?.upgrades) {
      this.#data.upgrades = result.upgrades;
    }
    this.#notify();
    return true;
  }

  // --- Async операции ---

  async saveChallenge(height, hitCount, gameTime) {
    const result = await this.#provider.saveChallenge(height, hitCount, gameTime);
    // Сервер возвращает embersEarned — синхронизируем
    if (result?.embersEarned !== undefined) {
      // Серверный баланс = авторитетный (но мы не знаем его тут,
      // просто доверяем серверу — при следующем sync-profile синхронизируется)
    }
    return result;
  }

  async claimSkin() {
    const result = await this.#provider.claimSkin();
    if (result?.skinId) {
      if (!this.#data.unlockedSkins.includes(result.skinId)) {
        this.#data.unlockedSkins.push(result.skinId);
      }
    }
    return result;
  }

  async fetchLeaderboard() {
    return this.#provider.fetchLeaderboard();
  }

  // --- Подписка на обновления ---

  onUpdated(callback) {
    this.#listeners.push(callback);
    return () => { this.#listeners = this.#listeners.filter(cb => cb !== callback); };
  }

  #notify() {
    for (const cb of this.#listeners) {
      try { cb(this.#data); } catch {}
    }
  }
}

// Singleton
export const profile = new UserProfile();
