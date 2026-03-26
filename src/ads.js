// Adsgram SDK — реклама в Telegram Mini Apps
// Rewarded: UnitID 25943 (воскрешение)
// Interstitial: UnitID 25944 (между играми)
// Fallback на заглушку если SDK не загружен (вне Telegram)

import { profile } from './data/index.js';

const INTERSTITIAL_EVERY = 8;

const REWARDED_BLOCK_ID = '25943';
const INTERSTITIAL_BLOCK_ID = 'int-25944';

// Adsgram контроллеры — инициализируем лениво
let rewardedController = null;
let interstitialController = null;

// Ожидание загрузки Adsgram SDK (до 3с)
let _adsgramReady = null;
function waitForAdsgram() {
  if (_adsgramReady) return _adsgramReady;
  if (window.Adsgram) return Promise.resolve(window.Adsgram);
  _adsgramReady = new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (window.Adsgram) { resolve(window.Adsgram); return; }
      if (Date.now() - start > 3000) { resolve(null); return; }
      setTimeout(check, 50);
    };
    check();
  });
  return _adsgramReady;
}

function getAdsgram() {
  return window.Adsgram || null;
}

function getRewardedController() {
  if (rewardedController) return rewardedController;
  const sdk = getAdsgram();
  if (!sdk) return null;
  try {
    rewardedController = sdk.init({ blockId: REWARDED_BLOCK_ID, debug: false });
    return rewardedController;
  } catch (e) {
    console.warn('Adsgram rewarded init error:', e);
    return null;
  }
}

function getInterstitialController() {
  if (interstitialController) return interstitialController;
  const sdk = getAdsgram();
  if (!sdk) return null;
  try {
    interstitialController = sdk.init({ blockId: INTERSTITIAL_BLOCK_ID, debug: false });
    return interstitialController;
  } catch (e) {
    console.warn('Adsgram interstitial init error:', e);
    return null;
  }
}

export function shouldShowInterstitial() {
  return profile.gamesCount > 0 && profile.gamesCount % INTERSTITIAL_EVERY === 0;
}

export function trackGameEnd() {
  return profile.incrementGames();
}

// ---- Interstitial (между играми, каждые 5) ----

export async function showInterstitial() {
  await waitForAdsgram();
  const ctrl = getInterstitialController();
  if (ctrl) {
    return ctrl.show().catch(() => {});
  }
  return showInterstitialStub();
}

// ---- Rewarded (воскрешение) ----

export async function showRewarded() {
  await waitForAdsgram();
  const ctrl = getRewardedController();
  if (ctrl) {
    return ctrl.show()
      .then(() => true)
      .catch(() => showRewardedStub());
  }
  return showRewardedStub();
}

// ---- Fallback заглушки (для браузера без Adsgram) ----

// Создать overlay в #game-ui с CSS классами
function createOverlay() {
  const div = document.createElement('div');
  div.classList.add('overlay', 'overlay--visible', 'ad-overlay');
  const root = document.getElementById('game-ui');
  if (root) {
    root.appendChild(div);
  } else {
    document.body.appendChild(div);
  }
  return div;
}

function showInterstitialStub() {
  return new Promise((resolve) => {
    const overlay = createOverlay();

    // Контент заглушки
    const content = document.createElement('div');
    content.classList.add('ad-overlay__content');
    content.innerHTML = `
      <div style="font-size:14px;margin-bottom:20px;color:#666">AD</div>
      <div style="font-size:18px;color:#fff;margin-bottom:8px">Interstitial Ad</div>
      <div style="font-size:12px;color:#888">This is a stub. Real ad will appear here.</div>
    `;
    overlay.appendChild(content);

    // Таймер — элемент внутри content
    const timerEl = document.createElement('div');
    timerEl.style.cssText = 'font-size:24px;color:#4488ff;margin-top:20px';
    timerEl.textContent = '2';
    content.appendChild(timerEl);

    // Обратный отсчёт через requestAnimationFrame
    let remaining = 2;
    let lastTick = performance.now();

    const tick = (now) => {
      const elapsed = now - lastTick;
      if (elapsed >= 1000) {
        lastTick = now;
        remaining--;
        timerEl.textContent = String(remaining);
        if (remaining <= 0) {
          overlay.remove();
          resolve();
          return;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function showRewardedStub() {
  return new Promise((resolve) => {
    const overlay = createOverlay();

    // Контент заглушки
    const content = document.createElement('div');
    content.classList.add('ad-overlay__content');
    content.innerHTML = `
      <div style="font-size:14px;margin-bottom:20px;color:#666">REWARDED AD</div>
      <div style="font-size:16px;color:#fff;margin-bottom:6px">Watch ad to continue</div>
      <div style="font-size:12px;color:#888;margin-bottom:24px">This is a stub. Real video ad will play here.</div>
    `;
    overlay.appendChild(content);

    // Таймер
    const timerEl = document.createElement('div');
    timerEl.style.cssText = 'font-size:28px;color:#ffcc00;margin-bottom:24px';
    timerEl.textContent = '3';
    content.appendChild(timerEl);

    // Кнопка Skip — прямая ссылка вместо getElementById
    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'Skip';
    skipBtn.style.cssText = `
      background:none;border:1px solid #555;color:#888;
      padding:8px 24px;font-family:monospace;font-size:13px;cursor:pointer;
    `;
    content.appendChild(skipBtn);

    let done = false;
    let rafId = null;

    const finish = (rewarded) => {
      if (done) return;
      done = true;
      if (rafId) cancelAnimationFrame(rafId);
      overlay.remove();
      resolve(rewarded);
    };

    skipBtn.addEventListener('click', () => finish(false));

    // Обратный отсчёт через requestAnimationFrame
    let remaining = 3;
    let lastTick = performance.now();

    const tick = (now) => {
      const elapsed = now - lastTick;
      if (elapsed >= 1000) {
        lastTick = now;
        remaining--;
        timerEl.textContent = String(remaining);
        if (remaining <= 0) {
          finish(true);
          return;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  });
}
