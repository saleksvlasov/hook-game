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

// Загрузочный экран — показывается пока ждём сервер
function showLoadingScreen() {
  const root = document.createElement('div');
  root.id = 'loading-screen';
  root.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: #0A0E1A;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Inter', 'Helvetica Neue', sans-serif;
    color: #E0E0E0; text-align: center;
  `;

  // Заголовок
  const title = document.createElement('div');
  title.textContent = 'THE HOOK';
  title.style.cssText = `
    font-size: 42px; font-weight: 700; color: #FFB800;
    letter-spacing: 3px; margin-bottom: 32px;
  `;

  // Индикатор загрузки — пульсирующий крюк
  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 24px; height: 24px;
    border: 3px solid rgba(0, 245, 212, 0.2);
    border-top-color: #00F5D4;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  `;

  // CSS анимация
  const style = document.createElement('style');
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);

  root.appendChild(title);
  root.appendChild(spinner);
  document.body.appendChild(root);

  return root;
}

// Убрать загрузочный экран
function removeLoadingScreen() {
  const el = document.getElementById('loading-screen');
  if (el) el.remove();
}

// Экран ошибки — блокирует запуск, предлагает перезапуск
function showErrorScreen(titleKey, msgKey) {
  removeLoadingScreen();
  document.body.innerHTML = '';

  const root = document.createElement('div');
  root.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: #0A0E1A;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    font-family: 'Share Tech Mono', 'Inter', monospace;
    color: #E0E0E0; padding: 32px; text-align: center;
  `;

  const titleEl = document.createElement('div');
  titleEl.textContent = t(titleKey);
  titleEl.style.cssText = `
    font-size: 22px; font-weight: 700; color: #FF2E63;
    margin-bottom: 16px; letter-spacing: 1px;
  `;

  const msg = document.createElement('div');
  msg.style.cssText = `
    font-size: 15px; line-height: 1.6; color: #8892A4;
    margin-bottom: 32px; white-space: pre-line;
  `;
  msg.textContent = t(msgKey);

  const btn = document.createElement('button');
  btn.textContent = t('sdk_error_retry');
  btn.style.cssText = `
    background: transparent; border: 2px solid #00F5D4; color: #00F5D4;
    font-family: inherit; font-size: 16px; font-weight: 700;
    padding: 14px 48px; border-radius: 8px; cursor: pointer;
    letter-spacing: 1px;
  `;
  btn.addEventListener('click', () => location.reload());

  root.appendChild(titleEl);
  root.appendChild(msg);
  root.appendChild(btn);
  document.body.appendChild(root);
}

// Инициализация
(async () => {
  // Показываем загрузочный экран сразу
  showLoadingScreen();

  // Параллельное ожидание всех SDK
  const [tgLoaded, adsLoaded] = await Promise.all([
    isTgEnv ? waitForGlobal('Telegram', 3000) : Promise.resolve(true),
    waitForGlobal('Adsgram', 4000, 50),
  ]);

  const tgOk = !isTgEnv || (tgLoaded && window.Telegram?.WebApp);

  if (!tgOk || !adsLoaded) {
    console.error('[BOOT] SDK load failed — Telegram:', tgOk, 'Adsgram:', adsLoaded);
    showErrorScreen('sdk_error_title', 'sdk_error_msg');
    return;
  }

  // Telegram Mini App — раскрываем на весь экран
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
  }

  // Инициализация профиля — ждём серверные данные
  // Если сервер недоступен — показываем экран ошибки
  try {
    await profile.init();
  } catch (e) {
    console.error('[BOOT] Server unavailable:', e);
    showErrorScreen('server_error_title', 'server_error_msg');
    return;
  }

  // Убираем загрузочный экран
  removeLoadingScreen();

  // Safe area
  const sat = getComputedStyle(document.documentElement).getPropertyValue('--sat');
  if (!sat || sat === '0px') {
    const isNotched = /iPhone/.test(navigator.userAgent) && screen.height >= 812;
    document.documentElement.style.setProperty('--sat', isNotched ? '47px' : '0px');
  }

  // Размеры после expand()
  const W = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  const H = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

  // Корневой контейнер для UI overlay
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
