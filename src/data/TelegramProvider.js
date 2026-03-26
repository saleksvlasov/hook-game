import { DataProvider } from './DataProvider.js';
import { LocalProvider } from './LocalProvider.js';

const WORKER_URL = 'https://thehook-invoice.sidodji1337.workers.dev';

// Telegram Mini App — сервер как источник правды, localStorage как кэш
export class TelegramProvider extends DataProvider {
  constructor() {
    super();
    this._cache = new LocalProvider();
    this._initData = window.Telegram?.WebApp?.initData || '';
  }

  // Загрузить профиль: сначала кэш, потом сервер (merge)
  async loadProfile() {
    const cached = this._cache.readCache();

    // Подтягиваем серверные данные
    const server = await this._fetchServer('/sync-profile', {
      clientData: {
        moonReached: cached.moonReached,
        activeSkin: cached.activeSkin,
      },
    });

    if (!server) return cached;

    // Merge: сервер = source of truth, с объединением скинов
    const merged = {
      bestScore: Math.max(cached.bestScore, server.bestScore || 0),
      moonReached: cached.moonReached || server.moonReached || false,
      activeSkin: server.activeSkin || cached.activeSkin || 'default',
      unlockedSkins: [...new Set([
        ...(cached.unlockedSkins || ['default']),
        ...(server.unlockedSkins || ['default']),
      ])],
      weeklyProgress: server.weeklyProgress || cached.weeklyProgress || {},
      // Локальные данные — не с сервера
      lang: cached.lang,
      gamesCount: cached.gamesCount,
    };

    // Обновляем кэш
    this._cache.writeCache(merged);
    return merged;
  }

  async saveField(key, value) {
    await this._cache.saveField(key, value);
    // Серверные поля синхронизируем
    if (key === 'activeSkin') {
      this._fireAndForget('/save-active-skin', { skinId: value });
    }
    if (key === 'moonReached' && value === true) {
      this._fireAndForget('/save-moon', {});
    }
  }

  async saveScore(score) {
    // Кэш
    const cacheResult = await this._cache.saveScore(score);
    // Сервер
    const server = await this._fetchServer('/save-score', { score });
    return server || cacheResult;
  }

  async saveChallenge(height, hitCount, gameTime) {
    const server = await this._fetchServer('/save-challenge', { height, hitCount, gameTime });
    if (server) {
      // Обновляем кэш из серверного ответа
      const profile = this._cache.readCache();
      if (server.challenge) {
        const weekKey = `week${server.week}`;
        profile.weeklyProgress[weekKey] = server.challenge;
      }
      if (server.unlockedSkins) {
        profile.unlockedSkins = [...new Set([...profile.unlockedSkins, ...server.unlockedSkins])];
      }
      this._cache.writeCache(profile);
    }
    return server;
  }

  async claimSkin() {
    const server = await this._fetchServer('/claim-skin', {});
    if (server?.success) {
      const profile = this._cache.readCache();
      if (server.skinId && !profile.unlockedSkins.includes(server.skinId)) {
        profile.unlockedSkins.push(server.skinId);
      }
      this._cache.writeCache(profile);
    }
    return server;
  }

  async fetchLeaderboard() {
    try {
      const resp = await fetch(`${WORKER_URL}/leaderboard`);
      if (!resp.ok) return [];
      const data = await resp.json();
      return data.leaderboard || [];
    } catch {
      return [];
    }
  }

  isAuthorized() {
    return !!this._initData;
  }

  // --- Приватные ---

  async _fetchServer(path, body) {
    if (!this._initData) return null;
    try {
      const resp = await fetch(`${WORKER_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: this._initData, ...body }),
      });
      if (!resp.ok) return null;
      return await resp.json();
    } catch {
      return null;
    }
  }

  // Fire-and-forget — не блокирует, ошибки молча проглатываются
  _fireAndForget(path, body) {
    this._fetchServer(path, body).catch(() => {});
  }
}
