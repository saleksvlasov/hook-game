import { LocalProvider } from './LocalProvider.js';

// Заглушка для Yandex Games — делегирует LocalProvider
// TODO: реализовать через Yandex Cloud Saves API
export class YandexProvider extends LocalProvider {
  isAuthorized() {
    return false;
  }
}
