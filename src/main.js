import { Engine } from './engine/index.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { profile } from './data/index.js';
import './ui.css';

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
  // Fallback: check if we're on iPhone with notch (screen height >= 812)
  const isNotched = /iPhone/.test(navigator.userAgent) && screen.height >= 812;
  document.documentElement.style.setProperty('--sat', isNotched ? '47px' : '0px');
}

const W = document.documentElement.clientWidth;
const H = document.documentElement.clientHeight;

// Корневой контейнер для всех UI overlay — единая точка монтирования
const gameUI = document.createElement('div');
gameUI.id = 'game-ui';
document.body.appendChild(gameUI);

const engine = new Engine({
  width: W,
  height: H,
  backgroundColor: '#141820',
  parent: document.body,
  gravity: 550, // arcade gravity (маятник использует GRAVITY=980 из constants)
  scenes: {
    MenuScene,
    GameScene,
  },
});

engine.start('MenuScene');
