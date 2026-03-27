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
  };

  async loadProfile() {
    return {
      ...this.#data,
      gamesCount: 0,
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

  isAuthorized() {
    return false;
  }
}
