// Cloudflare Worker — THE HOOK: invoice + leaderboard
// Переменные окружения: BOT_TOKEN (secret)
// KV Binding: SCORES
// Копировать ВЕСЬ этот файл в Cloudflare Workers Editor

const STAR_PRICE = 6;
const LEADERBOARD_SIZE = 100;

// ---- Telegram initData HMAC-SHA256 валидация ----

async function verifyTelegramData(initData, botToken) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    const encoder = new TextEncoder();

    // secret_key = HMAC-SHA256("WebAppData", botToken)
    // Web Crypto: importKey = ключ HMAC, sign = данные
    const webAppKey = encoder.encode('WebAppData');
    const secretKey = await crypto.subtle.importKey(
      'raw', webAppKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const secretBuf = await crypto.subtle.sign(
      'HMAC', secretKey, encoder.encode(botToken)
    );

    // result = HMAC-SHA256(secret_key, data_check_string)
    const hmacKey = await crypto.subtle.importKey(
      'raw', secretBuf, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sigBuf = await crypto.subtle.sign(
      'HMAC', hmacKey, encoder.encode(dataCheckString)
    );

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

// ---- Main handler ----

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);

    if (request.method === 'POST') {
      if (url.pathname === '/create-invoice') return handleCreateInvoice(env);
      if (url.pathname === '/save-score') return handleSaveScore(request, env);
    }

    if (request.method === 'GET') {
      if (url.pathname === '/leaderboard') return handleLeaderboard(env);
    }

    return new Response('Not found', { status: 404 });
  },
};

// ---- Invoice (Stars) ----

async function handleCreateInvoice(env) {
  const botToken = env.BOT_TOKEN;
  if (!botToken) return jsonResponse({ error: 'BOT_TOKEN not configured' }, 500);

  const resp = await fetch(
    `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Continue',
        description: 'Continue climbing from where you fell',
        payload: `continue_${Date.now()}`,
        provider_token: '',
        currency: 'XTR',
        prices: [{ label: 'Continue', amount: STAR_PRICE }],
      }),
    }
  );

  const data = await resp.json();
  if (!data.ok) return jsonResponse({ error: data.description }, 500);

  return jsonResponse({ invoice_url: data.result });
}

// ---- Save Score ----

async function handleSaveScore(request, env) {
  if (!env.SCORES) return jsonResponse({ error: 'KV not configured' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const { initData, score } = body;
  if (!initData || typeof score !== 'number' || score < 0) {
    return jsonResponse({ error: 'Missing initData or score' }, 400);
  }

  const user = await verifyTelegramData(initData, env.BOT_TOKEN);
  if (!user) return jsonResponse({ error: 'Invalid initData' }, 403);

  const userId = String(user.id);
  const key = `user:${userId}`;

  const existing = await env.SCORES.get(key, 'json');
  const currentBest = existing?.score || 0;

  if (score > currentBest) {
    const record = {
      score,
      name: user.first_name + (user.last_name ? ` ${user.last_name}` : ''),
      username: user.username || null,
      updatedAt: Date.now(),
    };
    await env.SCORES.put(key, JSON.stringify(record));
    await updateLeaderboard(env, userId, record);

    return jsonResponse({ newBest: true, score });
  }

  return jsonResponse({ newBest: false, score: currentBest });
}

// ---- Leaderboard ----

async function handleLeaderboard(env) {
  if (!env.SCORES) return jsonResponse({ error: 'KV not configured' }, 500);

  const lb = await env.SCORES.get('leaderboard', 'json');
  return jsonResponse({ leaderboard: lb || [] });
}

async function updateLeaderboard(env, userId, record) {
  const lb = (await env.SCORES.get('leaderboard', 'json')) || [];

  const filtered = lb.filter((e) => e.userId !== userId);
  filtered.push({
    userId,
    name: record.name,
    username: record.username,
    score: record.score,
  });

  filtered.sort((a, b) => b.score - a.score);
  await env.SCORES.put('leaderboard', JSON.stringify(filtered.slice(0, LEADERBOARD_SIZE)));
}

// ---- Helpers ----

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
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
