import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { syncProfile } from './telegram.js';

// Telegram Mini App — раскрываем на весь экран + синхронизация профиля
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();

  // Подтягиваем рекорд и скины с сервера → localStorage (fire-and-forget)
  syncProfile();
}

// Safe area: set CSS variable from env() for JS access
const sat = getComputedStyle(document.documentElement).getPropertyValue('--sat');
if (!sat || sat === '0px') {
  // Fallback: check if we're on iPhone with notch (screen height >= 812)
  const isNotched = /iPhone/.test(navigator.userAgent) && screen.height >= 812;
  document.documentElement.style.setProperty('--sat', isNotched ? '47px' : '0px');
}

const W = document.documentElement.clientWidth;
const H = document.documentElement.clientHeight;

const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  backgroundColor: '#141820',
  parent: document.body,
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 550 },
      debug: false,
    },
  },
  dom: { createContainer: true },
  scene: [MenuScene, GameScene],
};

new Phaser.Game(config);
