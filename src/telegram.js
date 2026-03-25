// Telegram Mini App — Stars оплата
// WORKER_URL — заменить на реальный URL после деплоя Worker'а

const WORKER_URL = 'https://thehook-invoice.sidodji1337.workers.dev';

// Проверка: запущены ли мы внутри Telegram
export function isTelegram() {
  return !!window.Telegram?.WebApp?.initData;
}

// Запросить Continue за Stars через Telegram.WebApp.openInvoice
export async function purchaseContinue() {
  if (!isTelegram()) return false;

  try {
    // Запрашиваем invoice link у Worker'а
    const resp = await fetch(`${WORKER_URL}/create-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!resp.ok) return false;

    const { invoice_url } = await resp.json();
    if (!invoice_url) return false;

    // Открываем нативное окно оплаты Telegram
    return new Promise((resolve) => {
      window.Telegram.WebApp.openInvoice(invoice_url, (status) => {
        // status: 'paid' | 'cancelled' | 'failed' | 'pending'
        resolve(status === 'paid');
      });
    });
  } catch (err) {
    console.error('Stars payment error:', err);
    return false;
  }
}
