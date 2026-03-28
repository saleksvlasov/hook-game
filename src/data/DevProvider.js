import { SHIELD_COST, SAW_COST } from '../constants.js';

// Dev-провайдер — мок для локальной разработки без Telegram
// Данные хранятся в памяти, сбрасываются при перезагрузке
// Используется автоматически когда нет Telegram initData

export class DevProvider {
  // Приватные поля
  #data = {
    bestScore: 0,
    moonReached: false,
    activeSkin: 'default',
    unlockedSkins: ['default'],
    weeklyProgress: {},
    lang: null,
    embers: 500, // dev: стартовый баланс для тестирования
    upgrades: {},
    hasShield: false,
    hasSaw: false,
  };

  async loadProfile() {
    return {
      ...this.#data,
      gamesCount: 0,
      hasSaw: this.#data.hasSaw,
    };
  }

  async saveField(key, value) {
    this.#data[key] = value;
  }

  async saveScore(score) {
    const isNew = score > this.#data.bestScore;
    if (isNew) this.#data.bestScore = score;
    return { newBest: isNew, score };
  }

  async saveChallenge() {
    return null;
  }

  async claimSkin() {
    return null;
  }

  async fetchLeaderboard() {
    return [];
  }

  async saveEmbers(embers) {
    this.#data.embers = embers;
  }

  async saveUpgrade(upgradeId) {
    // Мок — просто подтверждаем, клиент уже обновил оптимистично
    return { ok: true, embers: this.#data.embers, upgrades: this.#data.upgrades };
  }

  async saveShield(use = false) {
    if (use) {
      this.#data.hasShield = false;
      return { ok: true, hasShield: false };
    }
    if (this.#data.embers < SHIELD_COST) return { error: 'Insufficient embers' };
    if (this.#data.hasShield) return { error: 'Already owned' };
    this.#data.hasShield = true;
    this.#data.embers -= SHIELD_COST;
    return { ok: true, embers: this.#data.embers, hasShield: true };
  }

  async saveSaw(use = false) {
    if (use) {
      this.#data.hasSaw = false;
      return { ok: true, hasSaw: false };
    }
    if (this.#data.embers < SAW_COST) return { error: 'Insufficient embers' };
    if (this.#data.hasSaw) return { error: 'Already owned' };
    this.#data.hasSaw = true;
    this.#data.embers -= SAW_COST;
    return { ok: true, embers: this.#data.embers, hasSaw: true };
  }

  isAuthorized() {
    return false;
  }
}
