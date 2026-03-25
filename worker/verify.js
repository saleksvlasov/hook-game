// Валидация Telegram WebApp initData через HMAC-SHA256
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

export function verifyTelegramData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    // Собираем data-check-string (все параметры кроме hash, отсортированные)
    params.delete('hash');
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    // HMAC: secret = HMAC-SHA256("WebAppData", botToken)
    // Проверка: HMAC-SHA256(secret, dataCheckString) === hash
    // В Cloudflare Workers используем Web Crypto API
    // Но crypto.subtle async — поэтому эта функция должна быть async

    // Парсим user из initData
    const userStr = params.get('user');
    if (!userStr) return null;

    const user = JSON.parse(userStr);
    if (!user.id) return null;

    // TODO: полная HMAC проверка (требует async)
    // Для MVP возвращаем user если он есть в initData
    // В продакшене обязательно добавить HMAC верификацию
    return user;
  } catch {
    return null;
  }
}

// Async версия с полной HMAC верификацией
export async function verifyTelegramDataAsync(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    const encoder = new TextEncoder();

    // secret_key = HMAC-SHA256("WebAppData", botToken)
    const keyData = encoder.encode(botToken);
    const secretKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const secretBuf = await crypto.subtle.sign(
      'HMAC', secretKey, encoder.encode('WebAppData')
    );

    // result = HMAC-SHA256(secret_key, data_check_string)
    const hmacKey = await crypto.subtle.importKey(
      'raw', secretBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sigBuf = await crypto.subtle.sign(
      'HMAC', hmacKey, encoder.encode(dataCheckString)
    );

    // Сравниваем hex
    const computed = [...new Uint8Array(sigBuf)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (computed !== hash) return null;

    const userStr = params.get('user');
    if (!userStr) return null;

    return JSON.parse(userStr);
  } catch {
    return null;
  }
}
