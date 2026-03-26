// Базовый класс сцены — замена Phaser.Scene
// Наследники реализуют create(), update(time, delta), shutdown()

export class Scene {
  constructor(engine) {
    this.engine = engine;
  }

  // Ширина и высота canvas
  get W() { return this.engine.width; }
  get H() { return this.engine.height; }

  // Canvas 2D context
  get ctx() { return this.engine.ctx; }

  // Подсистемы
  get camera() { return this.engine.camera; }
  get input() { return this.engine.input; }
  get tweens() { return this.engine.tweens; }
  get time() { return this.engine.time; }

  // Переключение на другую сцену
  startScene(name) {
    this.engine.switchScene(name);
  }

  // Lifecycle — переопределяются в наследниках
  create() {}
  update(_time, _delta) {}
  shutdown() {}
}
