import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';

const W = window.innerWidth;
const H = window.innerHeight;

const config = {
  type: Phaser.AUTO,
  width: W,
  height: H,
  backgroundColor: '#1a0e06',
  parent: document.body,
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 800 },
      debug: false,
    },
  },
  dom: { createContainer: true },
  scene: [MenuScene, GameScene],
};

new Phaser.Game(config);
