// Cloudflare Worker — invoice + leaderboard для THE HOOK
// Переменные окружения: BOT_TOKEN (secret), KV namespace: SCORES
// Деплоится на Cloudflare Workers (бесплатно)

import { verifyTelegramDataAsync } from './verify.js';

const STAR_PRICE = 6;
const LEADERBOARD_SIZE = 100;

export default {
  async fetch(request, env) {
    // CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(),
      });
    }

    const url = new URL(request.url);

    // POST endpoints
    if (request.method === 'POST') {
      if (url.pathname === '/create-invoice') {
        return handleCreateInvoice(env);
      }
      if (url.pathname === '/save-score') {
        return handleSaveScore(request, env);
      }
    }

    // GET endpoints
    if (request.method === 'GET') {
      if (url.pathname === '/leaderboard') {
        return handleLeaderboard(env);
      }
    }

    return new Response('Not found', { status: 404 });
  },
};

// ---- Invoice (Stars) ----

async function handleCreateInvoice(env) {
  const botToken = env.BOT_TOKEN;
  if (!botToken) {
    return jsonResponse({ error: 'BOT_TOKEN not configured' }, 500);
  }

  const invoicePayload = {
    title: 'Continue',
    description: 'Continue climbing from where you fell',
    payload: `continue_${Date.now()}`,
    provider_token: '',
    currency: 'XTR',
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

// ---- Save Score ----

async function handleSaveScore(request, env) {
  if (!env.SCORES) {
    return jsonResponse({ error: 'KV not configured' }, 500);
  }

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

  // Валидация Telegram initData через HMAC-SHA256
  const user = await verifyTelegramDataAsync(initData, env.BOT_TOKEN);
  if (!user) {
    return jsonResponse({ error: 'Invalid initData' }, 403);
  }

  const userId = String(user.id);
  const key = `user:${userId}`;

  // Читаем текущий рекорд
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

    // Обновляем sorted leaderboard (топ-100)
    await updateLeaderboard(env, userId, record);

    return jsonResponse({ newBest: true, score });
  }

  return jsonResponse({ newBest: false, score: currentBest });
}

// ---- Leaderboard ----

async function handleLeaderboard(env) {
  if (!env.SCORES) {
    return jsonResponse({ error: 'KV not configured' }, 500);
  }

  const lb = await env.SCORES.get('leaderboard', 'json');
  return jsonResponse({ leaderboard: lb || [] });
}

async function updateLeaderboard(env, userId, record) {
  const lb = (await env.SCORES.get('leaderboard', 'json')) || [];

  // Убираем старую запись этого юзера
  const filtered = lb.filter((e) => e.userId !== userId);

  // Добавляем новую
  filtered.push({
    userId,
    name: record.name,
    username: record.username,
    score: record.score,
  });

  // Сортируем по убыванию, обрезаем до LEADERBOARD_SIZE
  filtered.sort((a, b) => b.score - a.score);
  const top = filtered.slice(0, LEADERBOARD_SIZE);

  await env.SCORES.put('leaderboard', JSON.stringify(top));
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
