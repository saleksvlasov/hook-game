// Input система — pointer/touch events на canvas
// Замена Phaser.Input

export class Input {
  constructor(canvas) {
    this._canvas = canvas;
    this._listeners = { pointerdown: [], pointerup: [], pointermove: [] };
    this._scrollX = 0;
    this._scrollY = 0;

    // Состояние активного pointer'а
    this.activePointer = { x: 0, y: 0, isDown: false };

    // Привязываем обработчики к canvas
    this._onDown = (e) => this._handle('pointerdown', e);
    this._onUp = (e) => this._handle('pointerup', e);
    this._onMove = (e) => this._handle('pointermove', e);

    canvas.addEventListener('pointerdown', this._onDown);
    canvas.addEventListener('pointerup', this._onUp);
    canvas.addEventListener('pointermove', this._onMove);

    // Предотвращаем контекстное меню и выделение
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.style.touchAction = 'none';
    canvas.style.userSelect = 'none';
    canvas.style.webkitUserSelect = 'none';
  }

  // Обновить позицию камеры для пересчёта координат
  setCameraScroll(scrollX, scrollY) {
    this._scrollX = scrollX;
    this._scrollY = scrollY;
  }

  // Подписка на событие
  on(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event].push(callback);
    }
  }

  // Отписка от события
  off(event, callback) {
    if (this._listeners[event]) {
      this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
    }
  }

  // Очистить все подписки
  removeAllListeners() {
    for (const key of Object.keys(this._listeners)) {
      this._listeners[key].length = 0;
    }
  }

  // Полная очистка (при уничтожении)
  destroy() {
    this.removeAllListeners();
    this._canvas.removeEventListener('pointerdown', this._onDown);
    this._canvas.removeEventListener('pointerup', this._onUp);
    this._canvas.removeEventListener('pointermove', this._onMove);
  }

  // Приватный обработчик — пересчёт координат + вызов listeners
  _handle(event, e) {
    const rect = this._canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Мировые координаты (с учётом камеры)
    const worldX = x + this._scrollX;
    const worldY = y + this._scrollY;

    this.activePointer.x = worldX;
    this.activePointer.y = worldY;

    if (event === 'pointerdown') this.activePointer.isDown = true;
    if (event === 'pointerup') this.activePointer.isDown = false;

    for (const cb of this._listeners[event]) {
      cb({ x, y, worldX, worldY, originalEvent: e });
    }
  }
}
