// Telegram Mini App — Stars оплата + leaderboard

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

// Сохранить рекорд на сервер
export async function saveScoreOnline(score) {
  if (!isTelegram()) return null;

  try {
    const resp = await fetch(`${WORKER_URL}/save-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData: window.Telegram.WebApp.initData,
        score,
      }),
    });

    if (!resp.ok) return null;
    return await resp.json();
  } catch (err) {
    console.error('Save score error:', err);
    return null;
  }
}

// Загрузить лидерборд
export async function fetchLeaderboard() {
  try {
    const resp = await fetch(`${WORKER_URL}/leaderboard`);
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.leaderboard || [];
  } catch (err) {
    console.error('Leaderboard error:', err);
    return [];
  }
}
