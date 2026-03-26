// Telegram Mini App — утилиты (Stars оплата, user id, аналитика)
// Серверная логика синхронизации данных — в src/data/TelegramProvider.js

const WORKER_URL = 'https://thehook-invoice.sidodji1337.workers.dev';

// Проверка: запущены ли мы внутри Telegram
export function isTelegram() {
  return !!window.Telegram?.WebApp?.initData;
}

// Telegram user id (для отметки своей позиции в лидерборде)
export function getTelegramUserId() {
  try {
    const user = window.Telegram?.WebApp?.initDataUnsafe?.user;
    return user?.id ? String(user.id) : null;
  } catch { return null; }
}

// Запросить Continue за Stars через Telegram.WebApp.openInvoice
export async function purchaseContinue() {
  if (!isTelegram()) return false;

  try {
    const resp = await fetch(`${WORKER_URL}/create-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!resp.ok) return false;

    const { invoice_url } = await resp.json();
    if (!invoice_url) return false;

    return new Promise((resolve) => {
      window.Telegram.WebApp.openInvoice(invoice_url, (status) => {
        resolve(status === 'paid');
      });
    });
  } catch (err) {
    console.error('Stars payment error:', err);
    return false;
  }
}

// Трекинг событий аналитики (fire-and-forget)
export function trackEvent(event, data = {}) {
  fetch(`${WORKER_URL}/track-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, ...data }),
  }).catch(() => {}); // молча — аналитика не должна ломать игру
}
