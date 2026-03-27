// Ядро движка — game loop, scene management, canvas
// Замена Phaser.Game

import { Camera } from './Camera.js';
import { Input } from './Input.js';
import { TweenManager } from './Tween.js';

export class Engine {
  // Приватные поля
  #scenes;
  #currentScene;
  #currentSceneName;
  #running;
  #lastTime;
  #raf;

  constructor(config) {
    // Canvas
    this.width = config.width;
    this.height = config.height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.zIndex = '1'; // Выше фона, ниже UI overlay
    this.ctx = this.canvas.getContext('2d');

    // Вставляем canvas в parent
    const parent = config.parent || document.body;
    parent.appendChild(this.canvas);

    // Подсистемы
    this.camera = new Camera(this.width, this.height);
    this.input = new Input(this.canvas);
    this.tweens = new TweenManager();
    this.time = { now: 0 };

    // Сцены
    this.#scenes = {};
    this.#currentScene = null;
    this.#currentSceneName = null;

    // Регистрируем сцены из конфига
    if (config.scenes) {
      for (const [name, SceneClass] of Object.entries(config.scenes)) {
        this.#scenes[name] = SceneClass;
      }
    }

    // Arcade физика — глобальная гравитация
    this.gravity = config.gravity || 550;

    // Game loop
    this.#running = false;
    this.#lastTime = 0;
    this.#raf = null;

    // Фоновый цвет
    this.bgColor = config.backgroundColor || '#141820';
  }

  // Запустить движок и первую сцену
  start(sceneName) {
    this.#running = true;
    this.switchScene(sceneName);
    // Запускаем loop через rAF (не синхронно — чтобы первый delta был корректный)
    this.#lastTime = performance.now();
    this.#raf = requestAnimationFrame((t) => this.#loop(t));
  }

  // Переключить сцену
  switchScene(name) {
    // Остановить текущую
    if (this.#currentScene) {
      this.#currentScene.shutdown();
      this.tweens.clear();
      this.input.removeAllListeners();
    }

    // Создать новую
    const SceneClass = this.#scenes[name];
    if (!SceneClass) throw new Error(`Scene "${name}" not found`);

    this.#currentScene = new SceneClass(this);
    this.#currentSceneName = name;
    this.#currentScene.create();
  }

  // Остановить движок
  stop() {
    this.#running = false;
    if (this.#raf) cancelAnimationFrame(this.#raf);
  }

  // Основной game loop
  #loop(timestamp) {
    if (!this.#running) return;

    const delta = Math.min(timestamp - this.#lastTime, 33.33); // Cap ~30fps min
    this.#lastTime = timestamp;
    this.time.now = timestamp;

    try {
      // Обновляем подсистемы ДО рендера
      this.tweens.update(delta);
      this.camera.update(delta);
      this.input.setCameraScroll(this.camera.scrollX, this.camera.scrollY);

      // Clear canvas — сброс состояний ctx
      this.ctx.globalAlpha = 1;
      this.ctx.shadowBlur = 0;
      this.ctx.fillStyle = this.bgColor;
      this.ctx.fillRect(0, 0, this.width, this.height);

      // Рендер сцены
      if (this.#currentScene) {
        this.#currentScene.update(timestamp, delta);
      }

      // Camera эффекты поверх всего (flash, fadeIn)
      this.camera.drawEffects(this.ctx);
    } catch (err) {
      console.error('Engine loop error:', err);
    }

    this.#raf = requestAnimationFrame((t) => this.#loop(t));
  }
}
