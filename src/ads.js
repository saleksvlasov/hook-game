// Ads stub — replace with real Yandex Ads SDK calls when ready.
// All functions return Promises so call sites stay async-ready.

const INTERSTITIAL_EVERY = 5;
const GAMES_KEY = 'thehook_games';

function getGameCount() {
  return parseInt(localStorage.getItem(GAMES_KEY) || '0', 10);
}

function incrementGameCount() {
  const n = getGameCount() + 1;
  localStorage.setItem(GAMES_KEY, String(n));
  return n;
}

// ---- Interstitial (fullscreen between games) ----

export function shouldShowInterstitial() {
  return getGameCount() > 0 && getGameCount() % INTERSTITIAL_EVERY === 0;
}

export function trackGameEnd() {
  return incrementGameCount();
}

/**
 * Show interstitial ad.
 * Returns a Promise that resolves when ad is closed.
 * Stub: shows a simple overlay for 2 seconds.
 */
export function showInterstitial() {
  // TODO: Replace with real Yandex Ads SDK interstitial
  // window.yaSDK.adv.showFullscreenAdv({ callbacks: { ... } })
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

// ---- Rewarded ad (continue after death) ----

/**
 * Show rewarded video ad.
 * Returns a Promise that resolves with true if reward granted, false if skipped/error.
 * Stub: shows overlay with a "Watch" button, auto-completes after 3s.
 */
export function showRewarded() {
  // TODO: Replace with real Yandex Ads SDK rewarded
  // window.yaSDK.adv.showRewardedVideo({ callbacks: { ... } })
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

// ---- Helpers ----

function createOverlay() {
  const div = document.createElement('div');
  div.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.85);z-index:9999;
    display:flex;align-items:center;justify-content:center;
  `;
  return div;
}
