import { getCurrentWeek, getChallenges, saveChallenges, unlockSkin } from '../storage.js';
import { SKINS } from './SkinRenderer.js';

// Пул типов испытаний
const CHALLENGE_TYPES = [
  { type: 'reach', genTarget: (w) => 1000 + w * 100 },         // набрать Xм за одну игру
  { type: 'total', genTarget: (w) => 3000 + w * 500 },         // суммарно Xм за неделю
  { type: 'no_hit', genTarget: (w) => 500 + w * 100 },         // Xм без столкновений с жуками
  { type: 'games', genTarget: (w) => 20 + w * 5 },             // сыграть X игр за неделю
  { type: 'streak', genTarget: (w) => 300 + w * 50, count: 3 }, // набрать Xм 3 раза подряд
];

export class ChallengeManager {
  constructor() {
    this.week = getCurrentWeek();
    this.data = getChallenges();
    this._ensureWeekChallenge();
  }

  // Генерация испытания для текущей недели (детерминированная по номеру недели)
  _ensureWeekChallenge() {
    const weekKey = `week${this.week}`;
    if (this.data.weeklyProgress[weekKey]) return;

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
    saveChallenges(this.data);
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

    if (changed) saveChallenges(this.data);
    return ch.completed;
  }

  // Забрать награду (разблокировать скин)
  claimReward() {
    const ch = this.getCurrentChallenge();
    if (!ch || !ch.completed || ch.claimed) return null;

    ch.claimed = true;
    unlockSkin(ch.rewardSkin);
    saveChallenges(this.data);
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
    saveChallenges(this.data);
  }
}
