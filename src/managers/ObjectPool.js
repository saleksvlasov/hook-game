// Переиспользуемый пул объектов — избавляет от push/splice в горячих циклах
export class ObjectPool {
  constructor(factory, reset) {
    this._factory = factory; // () => новый объект
    this._reset = reset;     // (obj) => сброс свойств перед переиспользованием
    this._pool = [];
  }

  // Взять объект из пула или создать новый
  acquire() {
    if (this._pool.length > 0) {
      const obj = this._pool.pop();
      this._reset(obj);
      return obj;
    }
    return this._factory();
  }

  // Вернуть объект в пул
  release(obj) {
    this._pool.push(obj);
  }

  // Очистить пул
  clear() {
    this._pool.length = 0;
  }
}
