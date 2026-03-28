// Cloudflare Worker — THE HOOK: invoice + leaderboard
// Переменные окружения: BOT_TOKEN (secret)
// KV Binding: SCORES
// Копировать ВЕСЬ этот файл в Cloudflare Workers Editor

const STAR_PRICE = 50;
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
      if (url.pathname === '/save-challenge') return handleSaveChallenge(request, env);
      if (url.pathname === '/claim-skin') return handleClaimSkin(request, env);
      if (url.pathname === '/sync-challenges') return handleSyncChallenges(request, env);
      if (url.pathname === '/sync-profile') return handleSyncProfile(request, env);
      if (url.pathname === '/save-active-skin') return handleSaveActiveSkin(request, env);
      if (url.pathname === '/save-moon') return handleSaveMoon(request, env);
      if (url.pathname === '/save-lang') return handleSaveLang(request, env);
      if (url.pathname === '/track-event') return handleTrackEvent(request, env);
      if (url.pathname === '/save-embers') return handleSaveEmbers(request, env);
      if (url.pathname === '/save-upgrade') return handleSaveUpgrade(request, env);
    }

    if (request.method === 'GET') {
      if (url.pathname === '/leaderboard') return handleLeaderboard(env);
      if (url.pathname === '/analytics') return handleAnalytics(url, env);
    }

    // Admin: сброс лидерборда (POST /admin/reset-leaderboard?key=SECRET)
    if (request.method === 'POST' && url.pathname === '/admin/reset-leaderboard') {
      return handleResetLeaderboard(url, env);
    }

    // Admin: сброс апгрейдов (POST /admin/reset-upgrades?key=SECRET&user=ID)
    if (request.method === 'POST' && url.pathname === '/admin/reset-upgrades') {
      return handleResetUpgrades(url, env);
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

// ---- Save Challenge (анти-чит + еженедельные испытания) ----

async function handleSaveChallenge(request, env) {
  if (!env.CHALLENGES) return jsonResponse({ error: 'KV not configured' }, 500);

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { initData, height, hitCount, gameTime } = body;
  if (!initData || typeof height !== 'number') {
    return jsonResponse({ error: 'Missing fields' }, 400);
  }

  const user = await verifyTelegramData(initData, env.BOT_TOKEN);
  if (!user) return jsonResponse({ error: 'Invalid initData' }, 403);

  // === АНТИ-ЧИТ ПРОВЕРКИ ===
  // 1. Время игры: минимум 5 секунд при height > 50м
  if (height > 50 && gameTime < 5) {
    return jsonResponse({ error: 'Suspicious: too fast' }, 403);
  }
  // 2. Скорость набора высоты: макс ~30м/с (физически невозможно больше)
  if (gameTime > 0 && height / gameTime > 30) {
    return jsonResponse({ error: 'Suspicious: impossible speed' }, 403);
  }
  // 3. Абсолютный лимит: больше 15000м за одну игру = подозрительно
  if (height > 15000) {
    return jsonResponse({ error: 'Suspicious: too high' }, 403);
  }

  const userId = String(user.id);
  const key = `challenges:${userId}`;

  // Загрузить серверное состояние
  const existing = await env.CHALLENGES.get(key, 'json') || {
    unlockedSkins: ['default'],
    weeklyProgress: {},
  };

  // Определить текущую неделю
  const LAUNCH_DATE = 1773792000000; // 2025-03-25T00:00:00Z
  const currentWeek = Math.floor((Date.now() - LAUNCH_DATE) / (7 * 24 * 60 * 60 * 1000));
  const weekKey = `week${currentWeek}`;

  // Если нет данных за эту неделю — инициализировать
  if (!existing.weeklyProgress[weekKey]) {
    // Типы челленджей (детерминированные по неделе)
    const types = ['reach', 'total', 'no_hit', 'games', 'streak'];
    const typeIdx = currentWeek % types.length;
    const type = types[typeIdx];

    // Генерация целей (синхронизировано с клиентским ChallengeManager)
    const targets = {
      reach: 100000 + currentWeek * 5000,
      total: 150000 + currentWeek * 10000,
      no_hit: 100000 + currentWeek * 5000,
      games: 500 + currentWeek * 50,
      streak: 100000 + currentWeek * 5000,
    };

    // Скин-награда (циклический 1-10)
    const skinIds = ['ghost','inferno','plague','samurai','phantom','gold_baron','frost','blood_moon','neon_reaper','void_hunter'];
    const skinIdx = (currentWeek - 1) % skinIds.length;

    existing.weeklyProgress[weekKey] = {
      type,
      target: targets[type],
      count: type === 'streak' ? 3 : 1,
      progress: 0,
      streakCount: 0,
      completed: false,
      rewardSkin: skinIds[skinIdx < 0 ? 0 : skinIdx],
      claimed: false,
    };
  }

  const ch = existing.weeklyProgress[weekKey];

  // Обновить прогресс
  if (!ch.completed) {
    switch (ch.type) {
      case 'reach':
        if (height > ch.progress) ch.progress = height;
        if (ch.progress >= ch.target) ch.completed = true;
        break;
      case 'total':
        ch.progress += height;
        if (ch.progress >= ch.target) ch.completed = true;
        break;
      case 'no_hit':
        if (hitCount === 0 && height > ch.progress) ch.progress = height;
        if (ch.progress >= ch.target) ch.completed = true;
        break;
      case 'games':
        ch.progress += 1;
        if (ch.progress >= ch.target) ch.completed = true;
        break;
      case 'streak':
        if (height >= ch.target) {
          ch.streakCount = (ch.streakCount || 0) + 1;
        } else {
          ch.streakCount = 0;
        }
        ch.progress = ch.streakCount;
        if (ch.streakCount >= (ch.count || 3)) ch.completed = true;
        break;
    }
  }

  // Очистка старых недель (только текущая + 2 предыдущие)
  for (const k of Object.keys(existing.weeklyProgress)) {
    const wn = parseInt(k.replace('week', ''), 10);
    if (wn < currentWeek - 2) delete existing.weeklyProgress[k];
  }

  await env.CHALLENGES.put(key, JSON.stringify(existing));

  // === Начисление эмберов серверно ===
  let embersEarned = 0;
  if (env.SCORES && height > 0) {
    const profile = (await env.SCORES.get(`profile:${userId}`, 'json')) || {};
    const magnetLevel = profile.upgrades?.ember_magnet || 0;
    embersEarned = calcEmbers(height, magnetLevel);
    profile.embers = (profile.embers || 0) + embersEarned;
    await env.SCORES.put(`profile:${userId}`, JSON.stringify(profile));
  }

  return jsonResponse({
    week: currentWeek,
    challenge: ch,
    unlockedSkins: existing.unlockedSkins,
    embersEarned,
  });
}

// ---- Claim Skin (забрать награду за челлендж) ----

async function handleClaimSkin(request, env) {
  if (!env.CHALLENGES) return jsonResponse({ error: 'KV not configured' }, 500);

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { initData } = body;
  if (!initData) return jsonResponse({ error: 'Missing initData' }, 400);

  const user = await verifyTelegramData(initData, env.BOT_TOKEN);
  if (!user) return jsonResponse({ error: 'Invalid initData' }, 403);

  const userId = String(user.id);
  const key = `challenges:${userId}`;
  const existing = await env.CHALLENGES.get(key, 'json');
  if (!existing) return jsonResponse({ error: 'No data' }, 404);

  const LAUNCH_DATE = 1773792000000;
  const currentWeek = Math.floor((Date.now() - LAUNCH_DATE) / (7 * 24 * 60 * 60 * 1000));
  const weekKey = `week${currentWeek}`;
  const ch = existing.weeklyProgress[weekKey];

  if (!ch || !ch.completed || ch.claimed) {
    return jsonResponse({ error: 'Nothing to claim' }, 400);
  }

  ch.claimed = true;
  if (!existing.unlockedSkins.includes(ch.rewardSkin)) {
    existing.unlockedSkins.push(ch.rewardSkin);
  }

  await env.CHALLENGES.put(key, JSON.stringify(existing));

  return jsonResponse({
    success: true,
    skinId: ch.rewardSkin,
    unlockedSkins: existing.unlockedSkins,
  });
}

// ---- Sync Challenges (синхронизация состояния челленджей) ----

async function handleSyncChallenges(request, env) {
  if (!env.CHALLENGES) return jsonResponse({ error: 'KV not configured' }, 500);

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { initData } = body;
  if (!initData) return jsonResponse({ error: 'Missing initData' }, 400);

  const user = await verifyTelegramData(initData, env.BOT_TOKEN);
  if (!user) return jsonResponse({ error: 'Invalid initData' }, 403);

  const userId = String(user.id);
  const existing = await env.CHALLENGES.get(`challenges:${userId}`, 'json') || {
    unlockedSkins: ['default'],
    weeklyProgress: {},
  };

  return jsonResponse(existing);
}

// ---- Sync Profile (рекорд + челленджи + скины одним запросом) ----

async function handleSyncProfile(request, env) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { initData, clientData } = body;
  if (!initData) return jsonResponse({ error: 'Missing initData' }, 400);

  const user = await verifyTelegramData(initData, env.BOT_TOKEN);
  if (!user) return jsonResponse({ error: 'Invalid initData' }, 403);

  const userId = String(user.id);

  // Параллельно читаем рекорд, челленджи и профиль
  const [scoreData, challengeData, profileData] = await Promise.all([
    env.SCORES ? env.SCORES.get(`user:${userId}`, 'json') : null,
    env.CHALLENGES ? env.CHALLENGES.get(`challenges:${userId}`, 'json') : null,
    env.SCORES ? env.SCORES.get(`profile:${userId}`, 'json') : null,
  ]);

  // Если клиент прислал данные — мержим на сервер (первая синхронизация)
  if (clientData && env.SCORES) {
    const currentProfile = profileData || {};
    let changed = false;
    if (clientData.moonReached && !currentProfile.moonReached) {
      currentProfile.moonReached = true;
      changed = true;
    }
    if (clientData.activeSkin && clientData.activeSkin !== 'default') {
      currentProfile.activeSkin = clientData.activeSkin;
      changed = true;
    }
    if (changed) {
      await env.SCORES.put(`profile:${userId}`, JSON.stringify(currentProfile));
    }
  }

  const serverProfile = profileData || {};

  return jsonResponse({
    bestScore: scoreData?.score || 0,
    unlockedSkins: challengeData?.unlockedSkins || ['default'],
    activeSkin: challengeData?.activeSkin || serverProfile.activeSkin || 'default',
    weeklyProgress: challengeData?.weeklyProgress || {},
    moonReached: serverProfile.moonReached || false,
    lang: serverProfile.lang || null,
    embers: serverProfile.embers || 0,
    upgrades: serverProfile.upgrades || {},
  });
}

// ---- Save Active Skin ----

async function handleSaveActiveSkin(request, env) {
  if (!env.SCORES) return jsonResponse({ error: 'KV not configured' }, 500);

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { initData, skinId } = body;
  if (!initData || !skinId) return jsonResponse({ error: 'Missing fields' }, 400);

  const user = await verifyTelegramData(initData, env.BOT_TOKEN);
  if (!user) return jsonResponse({ error: 'Invalid initData' }, 403);

  const userId = String(user.id);
  const profile = (await env.SCORES.get(`profile:${userId}`, 'json')) || {};
  profile.activeSkin = skinId;
  await env.SCORES.put(`profile:${userId}`, JSON.stringify(profile));

  return jsonResponse({ ok: true });
}

// ---- Save Moon ----

async function handleSaveMoon(request, env) {
  if (!env.SCORES) return jsonResponse({ error: 'KV not configured' }, 500);

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { initData } = body;
  if (!initData) return jsonResponse({ error: 'Missing initData' }, 400);

  const user = await verifyTelegramData(initData, env.BOT_TOKEN);
  if (!user) return jsonResponse({ error: 'Invalid initData' }, 403);

  const userId = String(user.id);
  const profile = (await env.SCORES.get(`profile:${userId}`, 'json')) || {};
  profile.moonReached = true;
  await env.SCORES.put(`profile:${userId}`, JSON.stringify(profile));

  return jsonResponse({ ok: true });
}

// ---- Save Lang ----

async function handleSaveLang(request, env) {
  if (!env.SCORES) return jsonResponse({ error: 'KV not configured' }, 500);

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { initData, lang } = body;
  if (!initData || !lang) return jsonResponse({ error: 'Missing fields' }, 400);

  const user = await verifyTelegramData(initData, env.BOT_TOKEN);
  if (!user) return jsonResponse({ error: 'Invalid initData' }, 403);

  const userId = String(user.id);
  const profile = (await env.SCORES.get(`profile:${userId}`, 'json')) || {};
  profile.lang = lang;
  await env.SCORES.put(`profile:${userId}`, JSON.stringify(profile));

  return jsonResponse({ ok: true });
}

// ---- Embers: начисление серверное (клиент не задаёт баланс напрямую) ----

// Рассчитать эмберы по высоте (серверная формула — источник правды)
const EMBER_MILESTONES_SERVER = [
  { height: 100, bonus: 15 },
  { height: 500, bonus: 40 },
  { height: 1000, bonus: 80 },
  { height: 2000, bonus: 150 },
  { height: 3000, bonus: 300 },
];

function calcEmbers(height, magnetLevel) {
  const multiplier = 1 + (magnetLevel || 0) * 0.10;
  let embers = Math.floor(height * 0.05 * multiplier); // 1 ember за 20м
  for (const ms of EMBER_MILESTONES_SERVER) {
    if (height >= ms.height) {
      embers += Math.floor(ms.bonus * multiplier);
    }
  }
  return embers;
}

// Заглушка — клиент вызывает, но сервер игнорирует клиентское значение
// Эмберы начисляются только через handleSaveChallenge
async function handleSaveEmbers(request, env) {
  return jsonResponse({ ok: true });
}

// ---- Upgrades: покупка апгрейда ----

const VALID_UPGRADES = ['hook_range', 'swing_power', 'iron_heart', 'quick_hook', 'bug_armor', 'ember_magnet'];
const UPGRADE_MAX = { hook_range: 6, swing_power: 10, iron_heart: 3, quick_hook: 3, bug_armor: 5, ember_magnet: 5 };

// Серверный расчёт стоимости (зеркало клиентского UpgradeApplicator)
const UPGRADE_COSTS = {
  hook_range:   { baseCost: 80,  costScale: 1.60 },
  swing_power:  { baseCost: 80,  costScale: 1.60 },
  iron_heart:   { costs: [300, 800, 1800] },
  quick_hook:   { baseCost: 150, costScale: 1.65 },
  bug_armor:    { baseCost: 150, costScale: 1.65 },
  ember_magnet: { baseCost: 250, costScale: 1.65 },
};

function calcUpgradeCost(upgradeId, currentLevel) {
  const def = UPGRADE_COSTS[upgradeId];
  if (def.costs) return def.costs[currentLevel] || Infinity;
  return Math.floor(def.baseCost * Math.pow(def.costScale, currentLevel));
}

async function handleSaveUpgrade(request, env) {
  if (!env.SCORES) return jsonResponse({ error: 'KV not configured' }, 500);

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { initData, upgradeId } = body;
  if (!initData || !upgradeId) {
    return jsonResponse({ error: 'Missing fields' }, 400);
  }

  if (!VALID_UPGRADES.includes(upgradeId)) {
    return jsonResponse({ error: 'Invalid upgrade' }, 400);
  }

  const user = await verifyTelegramData(initData, env.BOT_TOKEN);
  if (!user) return jsonResponse({ error: 'Invalid initData' }, 403);

  const userId = String(user.id);
  const profile = (await env.SCORES.get(`profile:${userId}`, 'json')) || {};

  if (!profile.upgrades) profile.upgrades = {};
  const currentLevel = profile.upgrades[upgradeId] || 0;

  if (currentLevel >= UPGRADE_MAX[upgradeId]) {
    return jsonResponse({ error: 'Max level reached' }, 400);
  }

  // Сервер сам считает стоимость — клиент не может повлиять
  const cost = calcUpgradeCost(upgradeId, currentLevel);
  const balance = profile.embers || 0;

  if (balance < cost) {
    return jsonResponse({ error: 'Insufficient embers', embers: balance }, 400);
  }

  profile.upgrades[upgradeId] = currentLevel + 1;
  profile.embers = balance - cost;

  await env.SCORES.put(`profile:${userId}`, JSON.stringify(profile));

  return jsonResponse({ ok: true, embers: profile.embers, upgrades: profile.upgrades });
}

// ---- Analytics: трекинг событий монетизации ----

// События: death, ad_shown, ad_completed, ad_skipped, stars_attempt, stars_success, stars_fail
// KV ключ: analytics:YYYY-MM-DD — агрегация по дням
async function handleTrackEvent(request, env) {
  if (!env.SCORES) return jsonResponse({ ok: true }); // без KV — молча пропускаем

  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const { event, height, gameTime } = body;
  const validEvents = ['death', 'ad_shown', 'ad_completed', 'ad_skipped', 'stars_attempt', 'stars_success', 'stars_fail'];
  if (!event || !validEvents.includes(event)) {
    return jsonResponse({ error: 'Invalid event' }, 400);
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const key = `analytics:${today}`;

  const existing = await env.SCORES.get(key, 'json') || {
    date: today,
    deaths: 0,
    avgDeathHeight: 0,
    totalDeathHeight: 0,
    ad_shown: 0,
    ad_completed: 0,
    ad_skipped: 0,
    stars_attempt: 0,
    stars_success: 0,
    stars_fail: 0,
  };

  if (event === 'death') {
    existing.deaths += 1;
    existing.totalDeathHeight += (height || 0);
    existing.avgDeathHeight = Math.round(existing.totalDeathHeight / existing.deaths);
  } else {
    existing[event] = (existing[event] || 0) + 1;
  }

  // TTL 90 дней — автоочистка старых данных
  await env.SCORES.put(key, JSON.stringify(existing), { expirationTtl: 90 * 86400 });

  return jsonResponse({ ok: true });
}

// GET /analytics?days=7 — сводка по дням
async function handleAnalytics(url, env) {
  if (!env.SCORES) return jsonResponse({ error: 'KV not configured' }, 500);

  const days = Math.min(parseInt(url.searchParams.get('days') || '7', 10), 90);
  const results = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const data = await env.SCORES.get(`analytics:${d}`, 'json');
    if (data) results.push(data);
  }

  // Суммарные метрики
  const totals = results.reduce((acc, d) => {
    acc.deaths += d.deaths;
    acc.totalHeight += d.totalDeathHeight;
    acc.ad_shown += d.ad_shown;
    acc.ad_completed += d.ad_completed;
    acc.ad_skipped += d.ad_skipped;
    acc.stars_attempt += d.stars_attempt;
    acc.stars_success += d.stars_success;
    acc.stars_fail += d.stars_fail;
    return acc;
  }, { deaths: 0, totalHeight: 0, ad_shown: 0, ad_completed: 0, ad_skipped: 0, stars_attempt: 0, stars_success: 0, stars_fail: 0 });

  totals.avgDeathHeight = totals.deaths > 0 ? Math.round(totals.totalHeight / totals.deaths) : 0;
  totals.adCompletionRate = totals.ad_shown > 0 ? Math.round(totals.ad_completed / totals.ad_shown * 100) : 0;
  totals.starsConversionRate = totals.stars_attempt > 0 ? Math.round(totals.stars_success / totals.stars_attempt * 100) : 0;
  totals.adPerDeath = totals.deaths > 0 ? Math.round(totals.ad_shown / totals.deaths * 100) : 0;
  totals.starsPerDeath = totals.deaths > 0 ? Math.round(totals.stars_attempt / totals.deaths * 100) : 0;

  return jsonResponse({ period: `${days} days`, totals, daily: results });
}

// ---- Admin: Reset Leaderboard ----

async function handleResetLeaderboard(url, env) {
  // Защита: ключ должен совпадать с ADMIN_KEY из env
  const key = url.searchParams.get('key');
  if (!key || key !== env.ADMIN_KEY) {
    return jsonResponse({ error: 'Unauthorized' }, 403);
  }

  if (!env.SCORES) return jsonResponse({ error: 'KV not configured' }, 500);

  // Очищаем лидерборд
  await env.SCORES.put('leaderboard', JSON.stringify([]));

  // Очищаем все user:* ключи (рекорды игроков)
  let cursor = null;
  let deletedCount = 0;
  do {
    const list = await env.SCORES.list({ prefix: 'user:', cursor, limit: 100 });
    for (const key of list.keys) {
      await env.SCORES.delete(key.name);
      deletedCount++;
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  // Очищаем все challenges:* ключи
  cursor = null;
  let challengesDeleted = 0;
  do {
    const list = env.CHALLENGES ? await env.CHALLENGES.list({ prefix: 'challenges:', cursor, limit: 100 }) : { keys: [], list_complete: true };
    for (const key of list.keys) {
      await env.CHALLENGES.delete(key.name);
      challengesDeleted++;
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  // Очищаем все profile:* ключи
  cursor = null;
  let profilesDeleted = 0;
  do {
    const list = await env.SCORES.list({ prefix: 'profile:', cursor, limit: 100 });
    for (const key of list.keys) {
      await env.SCORES.delete(key.name);
      profilesDeleted++;
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  return jsonResponse({
    ok: true,
    deleted: {
      scores: deletedCount,
      challenges: challengesDeleted,
      profiles: profilesDeleted,
    },
  });
}

// Admin: сброс апгрейдов игрока (POST /admin/reset-upgrades?key=SECRET&user=ID)
async function handleResetUpgrades(url, env) {
  const key = url.searchParams.get('key');
  if (!key || key !== env.ADMIN_KEY) {
    return jsonResponse({ error: 'Unauthorized' }, 403);
  }

  if (!env.SCORES) return jsonResponse({ error: 'KV not configured' }, 500);

  const userId = url.searchParams.get('user');
  if (!userId) return jsonResponse({ error: 'Missing user param' }, 400);

  const profile = (await env.SCORES.get(`profile:${userId}`, 'json')) || {};

  // Возвращаем потраченные эмберы
  let refunded = 0;
  if (profile.upgrades) {
    for (const [id, level] of Object.entries(profile.upgrades)) {
      const def = UPGRADE_COSTS[id];
      if (!def) continue;
      for (let i = 0; i < level; i++) {
        refunded += def.costs ? (def.costs[i] || 0) : Math.floor(def.baseCost * Math.pow(def.costScale, i));
      }
    }
  }

  profile.upgrades = {};
  profile.embers = (profile.embers || 0) + refunded;

  await env.SCORES.put(`profile:${userId}`, JSON.stringify(profile));

  return jsonResponse({ ok: true, refunded, embers: profile.embers });
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
