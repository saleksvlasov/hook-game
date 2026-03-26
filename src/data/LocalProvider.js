import { DataProvider } from './DataProvider.js';

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

// Безопасное чтение/запись localStorage
function lsGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* quota exceeded */ }
}

// Текущая неделя от даты запуска (0-based)
export function getCurrentWeek() {
  return Math.floor((Date.now() - LAUNCH_DATE) / (7 * 24 * 60 * 60 * 1000));
}

// localStorage как основное хранилище (fallback) и кэш для серверных провайдеров
export class LocalProvider extends DataProvider {
  // Загрузить профиль из localStorage
  async loadProfile() {
    return this.readCache();
  }

  // Синхронное чтение кэша — для мгновенного доступа к данным
  readCache() {
    const challengesRaw = lsGet(KEYS.CHALLENGES);
    let challenges = { unlockedSkins: ['default'], weeklyProgress: {} };
    if (challengesRaw) {
      try { challenges = JSON.parse(challengesRaw); } catch { /* повреждённые данные */ }
    }

    return {
      bestScore: parseInt(lsGet(KEYS.BEST) || '0', 10),
      moonReached: lsGet(KEYS.MOON) === 'yes',
      activeSkin: lsGet(KEYS.SKIN) || 'default',
      unlockedSkins: challenges.unlockedSkins || ['default'],
      weeklyProgress: challenges.weeklyProgress || {},
      lang: lsGet(KEYS.LANG) || null, // null → автодетект по браузеру
      gamesCount: parseInt(lsGet(KEYS.GAMES) || '0', 10),
    };
  }

  // Записать весь профиль в localStorage
  writeCache(profile) {
    lsSet(KEYS.BEST, String(profile.bestScore));
    if (profile.moonReached) lsSet(KEYS.MOON, 'yes');
    lsSet(KEYS.SKIN, profile.activeSkin);
    if (profile.lang) lsSet(KEYS.LANG, profile.lang);
    lsSet(KEYS.GAMES, String(profile.gamesCount));
    lsSet(KEYS.CHALLENGES, JSON.stringify({
      unlockedSkins: profile.unlockedSkins,
      weeklyProgress: profile.weeklyProgress,
    }));
  }

  // Сохранить одно поле
  async saveField(key, value) {
    const profile = this.readCache();
    profile[key] = value;
    this.writeCache(profile);
  }

  // Сохранить рекорд
  async saveScore(score) {
    const current = parseInt(lsGet(KEYS.BEST) || '0', 10);
    if (score > current) {
      lsSet(KEYS.BEST, String(score));
      return { newBest: true, score };
    }
    return { newBest: false, score: current };
  }

  // Сохранить результат игры (без серверной валидации)
  async saveChallenge(_height, _hitCount, _gameTime) {
    return null;
  }

  // Забрать скин (без серверной валидации)
  async claimSkin() {
    return null;
  }

  // Лидерборд недоступен без сервера
  async fetchLeaderboard() {
    return [];
  }

  isAuthorized() {
    return false;
  }
}
