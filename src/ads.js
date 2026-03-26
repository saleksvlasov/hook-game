// Adsgram SDK — реклама в Telegram Mini Apps
// Rewarded: UnitID 25943 (воскрешение)
// Interstitial: UnitID 25944 (между играми)
// Fallback на заглушку если SDK не загружен (вне Telegram)

import { profile } from './data/index.js';

const INTERSTITIAL_EVERY = 5;

const REWARDED_BLOCK_ID = '25943';
const INTERSTITIAL_BLOCK_ID = 'int-25944';

// Adsgram контроллеры — инициализируем лениво
let rewardedController = null;
let interstitialController = null;

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

export function showInterstitial() {
  const ctrl = getInterstitialController();
  if (ctrl) {
    // Adsgram SDK — реальная реклама, при ошибке тихо пропускаем
    return ctrl.show().catch(() => {});
  }
  // Fallback — заглушка вне Telegram
  return showInterstitialStub();
}

// ---- Rewarded (воскрешение) ----

export function showRewarded() {
  const ctrl = getRewardedController();
  if (ctrl) {
    // Adsgram SDK — rewarded видео
    // При ошибке (блок не активен, нет рекламы) → fallback на заглушку
    return ctrl.show()
      .then(() => true)
      .catch(() => showRewardedStub());
  }
  // Fallback — заглушка вне Telegram
  return showRewardedStub();
}

// ---- Fallback заглушки (для браузера без Adsgram) ----

function createOverlay() {
  const div = document.createElement('div');
  div.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.85);z-index:9999;
    display:flex;align-items:center;justify-content:center;
  `;
  return div;
}

function showInterstitialStub() {
  return new Promise((resolve) => {
    const overlay = createOverlay();
    overlay.innerHTML = `
      <div style="text-align:center;color:#aaa;font-family:monospace">
        <div style="font-size:14px;margin-bottom:20px;color:#666">AD</div>
        <div style="font-size:18px;color:#fff;margin-bottom:8px">Interstitial Ad</div>
        <div style="font-size:12px;color:#888">This is a stub. Real ad will appear here.</div>
        <div id="ad-timer" style="font-size:24px;color:#4488ff;margin-top:20px">2</div>
      </div>
    `;
    document.body.appendChild(overlay);

    let sec = 2;
    const timer = setInterval(() => {
      sec--;
      const el = document.getElementById('ad-timer');
      if (el) el.textContent = String(sec);
      if (sec <= 0) {
        clearInterval(timer);
        overlay.remove();
        resolve();
      }
    }, 1000);
  });
}

function showRewardedStub() {
  return new Promise((resolve) => {
    const overlay = createOverlay();
    overlay.innerHTML = `
      <div style="text-align:center;color:#aaa;font-family:monospace">
        <div style="font-size:14px;margin-bottom:20px;color:#666">REWARDED AD</div>
        <div style="font-size:16px;color:#fff;margin-bottom:6px">Watch ad to continue</div>
        <div style="font-size:12px;color:#888;margin-bottom:24px">This is a stub. Real video ad will play here.</div>
        <div id="ad-reward-timer" style="font-size:28px;color:#ffcc00;margin-bottom:24px">3</div>
        <button id="ad-skip" style="
          background:none;border:1px solid #555;color:#888;
          padding:8px 24px;font-family:monospace;font-size:13px;cursor:pointer;
        ">Skip</button>
      </div>
    `;
    document.body.appendChild(overlay);

    let sec = 3;
    let done = false;

    const finish = (rewarded) => {
      if (done) return;
      done = true;
      clearInterval(timer);
      overlay.remove();
      resolve(rewarded);
    };

    document.getElementById('ad-skip').onclick = () => finish(false);

    const timer = setInterval(() => {
      sec--;
      const el = document.getElementById('ad-reward-timer');
      if (el) el.textContent = String(sec);
      if (sec <= 0) finish(true);
    }, 1000);
  });
}
