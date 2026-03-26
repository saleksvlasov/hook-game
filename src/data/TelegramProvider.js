// Telegram Mini App — СЕРВЕР = единственный источник правды
// localStorage только как кэш для быстрого первого кадра

const WORKER_URL = 'https://thehook-invoice.sidodji1337.workers.dev';

// Ключи localStorage — единственное место определения
const KEYS = {
  BEST: 'thehook_best',
  MOON: 'thehook_moon',
  CHALLENGES: 'thehook_challenges',
  SKIN: 'thehook_skin',
  LANG: 'thehook_lang',
  GAMES: 'thehook_games',
};

// Дата запуска — для расчёта текущей недели
const LAUNCH_DATE = 1773792000000; // 2026-03-18T00:00:00Z

// Текущая неделя от даты запуска (0-based)
export function getCurrentWeek() {
  return Math.floor((Date.now() - LAUNCH_DATE) / (7 * 24 * 60 * 60 * 1000));
}

// Безопасное чтение/запись localStorage
function lsGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* quota exceeded */ }
}

// Прочитать кэш из localStorage (для мгновенного первого кадра)
function readCache() {
  const challengesRaw = lsGet(KEYS.CHALLENGES);
  let challenges = { unlockedSkins: ['default'], weeklyProgress: {} };
  if (challengesRaw) {
    try { challenges = JSON.parse(challengesRaw); } catch {}
  }
  return {
    bestScore: parseInt(lsGet(KEYS.BEST) || '0', 10),
    moonReached: lsGet(KEYS.MOON) === 'yes',
    activeSkin: lsGet(KEYS.SKIN) || 'default',
    unlockedSkins: challenges.unlockedSkins || ['default'],
    weeklyProgress: challenges.weeklyProgress || {},
    lang: lsGet(KEYS.LANG) || null,
    gamesCount: parseInt(lsGet(KEYS.GAMES) || '0', 10),
  };
}

// Записать весь профиль в localStorage (кэш)
function writeCache(data) {
  lsSet(KEYS.BEST, String(data.bestScore || 0));
  if (data.moonReached) lsSet(KEYS.MOON, 'yes');
  lsSet(KEYS.SKIN, data.activeSkin || 'default');
  if (data.lang) lsSet(KEYS.LANG, data.lang);
  lsSet(KEYS.GAMES, String(data.gamesCount || 0));
  lsSet(KEYS.CHALLENGES, JSON.stringify({
    unlockedSkins: data.unlockedSkins || ['default'],
    weeklyProgress: data.weeklyProgress || {},
  }));
}

export class TelegramProvider {
  constructor() {
    this._initData = window.Telegram?.WebApp?.initData || '';
  }

  // Загрузить профиль: кэш → сервер (сервер ПЕРЕЗАПИСЫВАЕТ кэш)
  async loadProfile() {
    const cached = readCache();

    // Подтягиваем серверные данные
    const server = await this._fetchServer('/sync-profile', {
      clientData: {
        moonReached: cached.moonReached,
        activeSkin: cached.activeSkin,
      },
    });

    // Сервер недоступен — возвращаем кэш (graceful degradation)
    if (!server) return cached;

    // СЕРВЕР = ПРАВДА. Берём всё с сервера, только lang и gamesCount — локальные
    const result = {
      bestScore: server.bestScore || 0,
      moonReached: server.moonReached || false,
      activeSkin: server.activeSkin || 'default',
      unlockedSkins: server.unlockedSkins || ['default'],
      weeklyProgress: server.weeklyProgress || {},
      lang: cached.lang,         // язык — локальная настройка
      gamesCount: cached.gamesCount, // счётчик игр — локальный
    };

    // Обновляем кэш
    writeCache(result);
    return result;
  }

  // Кэш для первого кадра (до ответа сервера)
  readCache() {
    return readCache();
  }

  // Сохранить поле: сервер + кэш
  async saveField(key, value) {
    // Кэш
    const data = readCache();
    data[key] = value;
    writeCache(data);

    // Серверные поля синхронизируем
    if (key === 'activeSkin') {
      this._fireAndForget('/save-active-skin', { skinId: value });
    }
    if (key === 'moonReached' && value === true) {
      this._fireAndForget('/save-moon', {});
    }
    if (key === 'weeklyProgress') {
      // weeklyProgress сохраняется через saveChallenge, не отдельным эндпоинтом
    }
  }

  // Сохранить рекорд: сервер + кэш
  async saveScore(score) {
    // Кэш
    const data = readCache();
    if (score > data.bestScore) {
      data.bestScore = score;
      writeCache(data);
    }
    // Сервер — источник правды
    const server = await this._fetchServer('/save-score', { score });
    return server || { newBest: score > data.bestScore, score };
  }

  // Сохранить результат игры + обновить челлендж
  async saveChallenge(height, hitCount, gameTime) {
    const server = await this._fetchServer('/save-challenge', { height, hitCount, gameTime });
    if (server) {
      // Обновляем кэш из серверного ответа (сервер = правда)
      const data = readCache();
      if (server.challenge) {
        const weekKey = `week${server.week}`;
        data.weeklyProgress[weekKey] = server.challenge;
      }
      if (server.unlockedSkins) {
        data.unlockedSkins = server.unlockedSkins;
      }
      writeCache(data);
    }
    return server;
  }

  // Забрать скин за челлендж
  async claimSkin() {
    const server = await this._fetchServer('/claim-skin', {});
    if (server?.success) {
      const data = readCache();
      if (server.skinId && !data.unlockedSkins.includes(server.skinId)) {
        data.unlockedSkins.push(server.skinId);
      }
      writeCache(data);
    }
    return server;
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
