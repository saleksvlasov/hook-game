import { Engine } from './engine/index.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { profile } from './data/index.js';
import './ui.css';

// Инициализация — ждём Telegram SDK если нужно, потом запускаем игру
(async () => {
  // Ожидание Telegram SDK — динамический скрипт может загрузиться позже module
  // Ждём до 2с только если мы внутри Telegram (по маркерам из index.html)
  const isTgEnv = window.TelegramWebviewProxy || location.hash.includes('tgWebAppData') || navigator.userAgent.includes('Telegram');
  if (isTgEnv && !window.Telegram?.WebApp) {
    await new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (window.Telegram?.WebApp || Date.now() - start > 2000) {
          resolve();
        } else {
          setTimeout(check, 30);
        }
      };
      check();
    });
  }

  // Telegram Mini App — раскрываем на весь экран
  if (window.Telegram?.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();
  }

  // Инициализация профиля — подтягивает данные с сервера (fire-and-forget)
  profile.init();

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
