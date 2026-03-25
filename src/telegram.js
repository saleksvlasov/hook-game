// Telegram Mini App — Stars оплата + leaderboard
import { saveBest, getChallenges, saveChallenges, setActiveSkin } from './storage.js';

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

// Сохранить результат игры + прогресс челленджа на сервере
export async function saveChallengeOnline(height, hitCount, gameTime) {
  if (!isTelegram()) return null;
  try {
    const resp = await fetch(`${WORKER_URL}/save-challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData: window.Telegram.WebApp.initData,
        height, hitCount, gameTime,
      }),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (err) {
    console.error('Save challenge error:', err);
    return null;
  }
}

// Забрать скин на сервере
export async function claimSkinOnline() {
  if (!isTelegram()) return null;
  try {
    const resp = await fetch(`${WORKER_URL}/claim-skin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData: window.Telegram.WebApp.initData,
      }),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (err) {
    console.error('Claim skin error:', err);
    return null;
  }
}

// Синхронизировать челленджи с сервером
export async function syncChallengesOnline() {
  if (!isTelegram()) return null;
  try {
    const resp = await fetch(`${WORKER_URL}/sync-challenges`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData: window.Telegram.WebApp.initData,
      }),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (err) {
    console.error('Sync challenges error:', err);
    return null;
  }
}

// Синхронизация профиля при загрузке — рекорд + скины с сервера → localStorage
export async function syncProfile() {
  if (!isTelegram()) return null;
  try {
    const resp = await fetch(`${WORKER_URL}/sync-profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData: window.Telegram.WebApp.initData,
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();

    // Обновляем localStorage из серверных данных
    if (data.bestScore > 0) {
      saveBest(data.bestScore);
    }
    if (data.unlockedSkins) {
      const local = getChallenges();
      // Мержим скины: сервер + локальные
      const merged = [...new Set([...local.unlockedSkins, ...data.unlockedSkins])];
      local.unlockedSkins = merged;
      saveChallenges(local);
    }
    if (data.activeSkin && data.activeSkin !== 'default') {
      setActiveSkin(data.activeSkin);
    }

    return data;
  } catch (err) {
    console.error('Sync profile error:', err);
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
