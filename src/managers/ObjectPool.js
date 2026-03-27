// Переиспользуемый пул объектов — избавляет от push/splice в горячих циклах
export class ObjectPool {
  // Приватные поля
  #factory;
  #reset;
  #pool = [];

  constructor(factory, reset) {
    this.#factory = factory; // () => новый объект
    this.#reset = reset;     // (obj) => сброс свойств перед переиспользованием
  }

  // Взять объект из пула или создать новый
  acquire() {
    if (this.#pool.length > 0) {
      const obj = this.#pool.pop();
      this.#reset(obj);
      return obj;
    }
    return this.#factory();
  }

  // Вернуть объект в пул
  release(obj) {
    this.#pool.push(obj);
  }

  // Очистить пул
  clear() {
    this.#pool.length = 0;
  }
}
