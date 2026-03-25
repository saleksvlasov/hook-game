import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';

// Telegram Mini App — раскрываем на весь экран
if (window.Telegram?.WebApp) {
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();
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
