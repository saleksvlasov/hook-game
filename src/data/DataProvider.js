// Абстрактный интерфейс хранилища данных
// Реализации: LocalProvider (localStorage), TelegramProvider (Cloudflare Worker), YandexProvider (заглушка)
export class DataProvider {
  // Загрузить профиль пользователя
  async loadProfile() { throw new Error('Not implemented'); }

  // Сохранить одно поле профиля (ключ + значение)
  async saveField(key, value) { throw new Error('Not implemented'); }

  // Сохранить рекорд → {newBest: boolean, score: number} | null
  async saveScore(score) { throw new Error('Not implemented'); }

  // Сохранить результат игры + обновить челлендж
  async saveChallenge(height, hitCount, gameTime) { throw new Error('Not implemented'); }

  // Забрать награду за челлендж → {skinId, unlockedSkins} | null
  async claimSkin() { throw new Error('Not implemented'); }

  // Загрузить лидерборд → [{userId, name, username, score}]
  async fetchLeaderboard() { throw new Error('Not implemented'); }

  // Авторизован ли пользователь (есть серверный провайдер)
  isAuthorized() { return false; }
}
