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

  isAuthorized() {
    return false;
  }
}
