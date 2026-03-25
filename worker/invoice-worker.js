// Cloudflare Worker — создаёт invoice link для Telegram Stars
// Деплоится на Cloudflare Workers (бесплатно)
// Переменная окружения BOT_TOKEN — задаётся в настройках Worker'а

const STAR_PRICE = 1; // цена Continue в Stars

export default {
  async fetch(request, env) {
    // CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);

    if (url.pathname === '/create-invoice') {
      return handleCreateInvoice(env);
    }

    return new Response('Not found', { status: 404 });
  },
};

async function handleCreateInvoice(env) {
  const botToken = env.BOT_TOKEN;
  if (!botToken) {
    return jsonResponse({ error: 'BOT_TOKEN not configured' }, 500);
  }

  const invoicePayload = {
    title: 'Continue',
    description: 'Continue climbing from where you fell',
    payload: `continue_${Date.now()}`,
    provider_token: '', // пустой для Stars
    currency: 'XTR', // XTR = Telegram Stars
    prices: [{ label: 'Continue', amount: STAR_PRICE }],
  };

  const resp = await fetch(
    `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoicePayload),
    }
  );

  const data = await resp.json();

  if (!data.ok) {
    return jsonResponse({ error: data.description }, 500);
  }

  return jsonResponse({ invoice_url: data.result });
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
