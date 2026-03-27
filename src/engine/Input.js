// Input система — pointer/touch events на canvas
// Замена Phaser.Input

export class Input {
  // Приватные поля
  #canvas;
  #listeners;
  #scrollX;
  #scrollY;
  #onDown;
  #onUp;
  #onMove;

  constructor(canvas) {
    this.#canvas = canvas;
    this.#listeners = { pointerdown: [], pointerup: [], pointermove: [] };
    this.#scrollX = 0;
    this.#scrollY = 0;

    // Состояние активного pointer'а
    this.activePointer = { x: 0, y: 0, isDown: false };

    // Привязываем обработчики к canvas
    this.#onDown = (e) => this.#handle('pointerdown', e);
    this.#onUp = (e) => this.#handle('pointerup', e);
    this.#onMove = (e) => this.#handle('pointermove', e);

    canvas.addEventListener('pointerdown', this.#onDown);
    canvas.addEventListener('pointerup', this.#onUp);
    canvas.addEventListener('pointermove', this.#onMove);

    // Предотвращаем контекстное меню и выделение
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none';
    canvas.style.webkitUserSelect = 'none';
    canvas.style.webkitTapHighlightColor = 'transparent';
  }

  // Обновить позицию камеры для пересчёта координат
  setCameraScroll(scrollX, scrollY) {
    this.#scrollX = scrollX;
    this.#scrollY = scrollY;
  }

  // Подписка на событие
  on(event, callback) {
    if (this.#listeners[event]) {
      this.#listeners[event].push(callback);
    }
  }

  // Отписка от события
  off(event, callback) {
    if (this.#listeners[event]) {
      this.#listeners[event] = this.#listeners[event].filter(cb => cb !== callback);
    }
  }

  // Очистить все подписки
  removeAllListeners() {
    for (const key of Object.keys(this.#listeners)) {
      this.#listeners[key].length = 0;
    }
  }

  // Полная очистка (при уничтожении)
  destroy() {
    this.removeAllListeners();
    this.#canvas.removeEventListener('pointerdown', this.#onDown);
    this.#canvas.removeEventListener('pointerup', this.#onUp);
    this.#canvas.removeEventListener('pointermove', this.#onMove);
  }

  // Приватный обработчик — пересчёт координат + вызов listeners
  #handle(event, e) {
    e.preventDefault(); // Предотвращаем двойное срабатывание (touch→mouse emulation)
    const rect = this.#canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Мировые координаты (с учётом камеры)
    const worldX = x + this.#scrollX;
    const worldY = y + this.#scrollY;

    this.activePointer.x = worldX;
    this.activePointer.y = worldY;

    if (event === 'pointerdown') this.activePointer.isDown = true;
    if (event === 'pointerup') this.activePointer.isDown = false;

    for (const cb of this.#listeners[event]) {
      cb({ x, y, worldX, worldY, originalEvent: e });
    }
  }
}
