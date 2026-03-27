// Telegram Mini App — СЕРВЕР = единственный источник правды
// localStorage полностью убран — все данные только с сервера

const WORKER_URL = 'https://thehook-invoice.sidodji1337.workers.dev';

// Дата запуска — для расчёта текущей недели
const LAUNCH_DATE = 1773792000000; // 2026-03-18T00:00:00Z

// Текущая неделя от даты запуска (0-based)
export function getCurrentWeek() {
  return Math.floor((Date.now() - LAUNCH_DATE) / (7 * 24 * 60 * 60 * 1000));
}

export class TelegramProvider {
  constructor() {
    this._initData = window.Telegram?.WebApp?.initData || '';
  }

  // Загрузить профиль с сервера. Возвращает null при ошибке.
  async loadProfile() {
    const server = await this._fetchServer('/sync-profile', {
      clientData: {},
    });

    if (!server) return null;

    return {
      bestScore: server.bestScore || 0,
      moonReached: server.moonReached || false,
      activeSkin: server.activeSkin || 'default',
      unlockedSkins: server.unlockedSkins || ['default'],
      weeklyProgress: server.weeklyProgress || {},
      lang: server.lang || null,
      gamesCount: 0, // per-session, не хранится
    };
  }

  // Сохранить поле на сервере
  async saveField(key, value) {
    if (key === 'activeSkin') {
      this._fireAndForget('/save-active-skin', { skinId: value });
    }
    if (key === 'moonReached' && value === true) {
      this._fireAndForget('/save-moon', {});
    }
    if (key === 'lang') {
      this._fireAndForget('/save-lang', { lang: value });
    }
  }

  // Сохранить рекорд на сервере
  async saveScore(score) {
    const server = await this._fetchServer('/save-score', { score });
    return server || { newBest: false, score };
  }

  // Сохранить результат игры + обновить челлендж
  async saveChallenge(height, hitCount, gameTime) {
    return this._fetchServer('/save-challenge', { height, hitCount, gameTime });
  }

  // Забрать скин за челлендж
  async claimSkin() {
    return this._fetchServer('/claim-skin', {});
  }

  // Загрузить лидерборд
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

  _fireAndForget(path, body) {
    this._fetchServer(path, body).catch(() => {});
  }
}
