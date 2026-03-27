import { Engine } from './engine/index.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { profile } from './data/index.js';
import { t } from './i18n.js';
import './ui.css';

// Проверка — мы внутри Telegram?
const isTgEnv = window.TelegramWebviewProxy || location.hash.includes('tgWebAppData') || navigator.userAgent.includes('Telegram');

// Ожидание SDK с таймаутом — возвращает true если загрузился
function waitForGlobal(name, timeoutMs, intervalMs = 30) {
  if (window[name]) return Promise.resolve(true);
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (window[name]) { resolve(true); return; }
      if (Date.now() - start > timeoutMs) { resolve(false); return; }
      setTimeout(check, intervalMs);
    };
    check();
  });
}

// Экран ошибки — блокирует запуск, предлагает перезапуск
function showErrorScreen() {
  // Убираем всё что могло появиться
  document.body.innerHTML = '';

  const root = document.createElement('div');
  root.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: #0A0E1A;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Share Tech Mono', 'Inter', monospace;
    color: #E0E0E0; padding: 32px; text-align: center;
  `;

  const title = document.createElement('div');
  title.textContent = t('sdk_error_title');
  title.style.cssText = `
    font-size: 22px; font-weight: 700; color: #FF2E63;
    margin-bottom: 16px; letter-spacing: 1px;
  `;

  const msg = document.createElement('div');
  msg.style.cssText = `
    font-size: 15px; line-height: 1.6; color: #8892A4;
    margin-bottom: 32px; white-space: pre-line;
  `;
  msg.textContent = t('sdk_error_msg');

  const btn = document.createElement('button');
  btn.textContent = t('sdk_error_retry');
  btn.style.cssText = `
    background: transparent; border: 2px solid #00F5D4; color: #00F5D4;
    font-family: inherit; font-size: 16px; font-weight: 700;
    padding: 14px 48px; border-radius: 8px; cursor: pointer;
    letter-spacing: 1px;
  `;
  btn.addEventListener('click', () => location.reload());

  root.appendChild(title);
  root.appendChild(msg);
  root.appendChild(btn);
  document.body.appendChild(root);
}

// Инициализация — ждём все SDK, если хоть один не загрузился — экран ошибки
(async () => {
  // Параллельное ожидание всех SDK
  const [tgLoaded, adsLoaded] = await Promise.all([
    // Telegram SDK — ждём только если мы внутри Telegram
    isTgEnv ? waitForGlobal('Telegram', 3000) : Promise.resolve(true),
    // Adsgram SDK — нужен всегда (загружается безусловно в index.html)
    waitForGlobal('Adsgram', 4000, 50),
  ]);

  // Дополнительная проверка: Telegram SDK загрузился, но WebApp недоступен
  const tgOk = !isTgEnv || (tgLoaded && window.Telegram?.WebApp);

  if (!tgOk || !adsLoaded) {
    console.error('[BOOT] SDK load failed — Telegram:', tgOk, 'Adsgram:', adsLoaded);
    showErrorScreen();
    return;
  }

  // Telegram Mini App — раскрываем на весь экран
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
  }

  // Инициализация профиля — ждём серверные данные перед стартом игры
  await profile.init();

  // Safe area: set CSS variable from env() for JS access
  const sat = getComputedStyle(document.documentElement).getPropertyValue('--sat');
  if (!sat || sat === '0px') {
    const isNotched = /iPhone/.test(navigator.userAgent) && screen.height >= 812;
    document.documentElement.style.setProperty('--sat', isNotched ? '47px' : '0px');
  }

  // Размеры берём после expand() — используем максимальные из доступных
  const W = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const H = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

  // Корневой контейнер для всех UI overlay — единая точка монтирования
  const gameUI = document.createElement('div');
  gameUI.id = 'game-ui';
  document.body.appendChild(gameUI);

  const engine = new Engine({
    width: W,
    height: H,
    backgroundColor: '#141820',
    parent: document.body,
    gravity: 550,
    scenes: {
      MenuScene,
      GameScene,
    },
  });

  engine.start('MenuScene');
})();
