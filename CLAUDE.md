# THE HOOK — Agent System

## ГЛАВНОЕ ПРАВИЛО
После каждого [CODE] изменения → автоматически [TEST].
Никакого деплоя без "✅ READY TO DEPLOY" от TEST агента.

---

## [CODE] — Инженер
Когда задача начинается с [CODE]:

ПРИНЦИПЫ:
- Итерируй маленькими шагами — один механизм за раз
- Не трогай то что уже работает
- Комментарии на русском
- После изменений пиши что именно поменял и почему
- Всегда запускай [TEST] после своей работы

ЗАПРЕЩЕНО:
- Менять WORLD_WIDTH/HEIGHT без обновления всех зависимостей
- Менять Scale режим Phaser без полного тестирования
- Добавлять hard clamp на физику — только мягкие стенки и демпинг

ФОРМАТ ОТЧЁТА:
```
✏️ Изменил: [что]
📁 Файлы: [какие]
🧪 Передаю тесту: [что проверить]
```

---

## [DESIGN] — Арт директор
Когда задача начинается с [DESIGN]:

ПРИНЦИПЫ:
- Стиль: Hunt Showdown — тёмный готический вестерн
- Mobile-first: всё должно читаться на экране 4"
- Контраст: персонаж всегда виден на фоне
- Итерируй визуально: сначала опиши что меняешь, потом меняй

ПАЛИТРА (не менять без причины):
```
Фон:        #1a0e06 → #2a1c0e
Золото:     #C8A96E
Красный:    #6B0F0F
Ржавчина:   #7A4A1E
Охотник:    #5a3518 + outline #C8A96E
Шрифт:      Georgia, serif
```

ЗАПРЕЩЕНО:
- Менять game feel ради красоты
- Добавлять эффекты которые снижают FPS ниже 60

ФОРМАТ ОТЧЁТА:
```
🎨 Изменил: [что визуально]
📱 Проверено на мобиле: [да/нет]
🧪 Передаю тесту: [что проверить]
```

---

## [TEST] — QA инженер
Когда задача начинается с [TEST]:

ПРИНЦИПЫ:
- Тестируй edge cases: нет якорей, смерть на крюке, быстрые тапы, потеря фокуса
- Проверяй на реальных размерах мобиле (375px, 390px, 414px)
- Фиксируй баги с точными шагами воспроизведения
- Проверяй производительность: ищи splice/push в update()

ОБЯЗАТЕЛЬНЫЙ ЧЕКЛИСТ:
- [ ] Консоль без ошибок
- [ ] RESTART работает
- [ ] Камера следит по X и Y
- [ ] Игрок не уходит за край видимой области
- [ ] Смерть в любом состоянии (hooked/free)
- [ ] RU/EN локализация
- [ ] localStorage рекорд сохраняется
- [ ] npm run build без ошибок
- [ ] Мобильный экран без полей

ФОРМАТ ОТЧЁТА:
```
✅ РАБОТАЕТ: [список]
❌ БАГ: [описание + строка кода]
⚠️ РИСК: [потенциальная проблема]
→ ИТОГ: ✅ READY TO DEPLOY | ❌ DEPLOY BLOCKED: [причина]
```

---

## [RESEARCH] — Аналитик
Когда задача начинается с [RESEARCH]:

ПРИНЦИПЫ:
- Анализируй код перед тем как предлагать решение
- Сравнивай с hyper-casual best practices
- Предлагай решения от простого к сложному
- Учитывай мобильную производительность

ФОРМАТ ОТЧЁТА:
```
🔍 Проблема: [описание]
📊 Анализ: [что нашёл в коде]
💡 Решение 1 (быстрое): [описание]
💡 Решение 2 (правильное): [описание]
→ Рекомендую: [что выбрать и почему]
```

---

## ЦИКЛ РАЗРАБОТКИ
```
[RESEARCH если непонятна причина]
    ↓
[CODE] → изменение
    ↓
[TEST] → проверка
    ↓
❌ баг → [CODE] снова
✅ OK → git commit → npm run build → npm run deploy
```

---

# THE HOOK — Project Reference

## ОПИСАНИЕ
**THE HOOK** — hyper-casual вертикальная аркада с механикой крюка-маятника.
Стек: Vite 5 + vanilla JS + Phaser 3 + Web Audio API. Без внешних ассетов.
Локализация EN/RU. Заглушки Yandex Ads SDK.

## СТРУКТУРА
```
src/
  main.js          — Phaser конфиг (динамический размер, Scale.NONE, DOM enabled)
  i18n.js          — EN/RU локализация, автодетект, localStorage
  storage.js       — localStorage: рекорд, луна
  audio.js         — 8 процедурных звуков через Web Audio API
  ads.js           — Заглушки рекламы (interstitial каждые 5 игр, rewarded)
  telegram.js      — Telegram Mini App SDK, Stars оплата, leaderboard API
  scenes/
    MenuScene.js   — Меню: заголовок, охотник на маятнике, кнопка CLIMB, Konami code
    GameScene.js   — Игра: маятник, крюки, смерть, Game Over (HTML кнопки), пасхалки
worker/
  worker-bundle.js — Cloudflare Worker: invoice (Stars) + leaderboard (KV)
```

## КОНСТАНТЫ
```
GRAVITY = 980, HOOK_RANGE = 380, WORLD_HEIGHT = 100000
ANCHOR_SPACING_Y = 240, GROUND_Y = WORLD_HEIGHT-10, SPAWN_Y = WORLD_HEIGHT-400
MAX_ROPE_LENGTH = 220, MIN_ROPE = 50
SWING_FRICTION = 0.9996, RELEASE_BOOST = 1.4
WORLD_WIDTH = this.scale.width (динамический)
arcade.gravity.y = 550
```

## localStorage
```
thehook_best, thehook_moon, thehook_games, thehook_lang
```

## ПРАВИЛА — НЕ МЕНЯТЬ
- Две сцены: MenuScene → GameScene
- Динамический размер + Scale.NONE
- Game Over кнопки — чистый HTML (position:fixed, z-index:100)
- Маятник: swingAngle/swingSpeed, только защита от переворота
- Toggle click: тап — зацепиться, тап — отпустить
- Камера: X фиксирована (scrollX=0), Y lerp(0.15) — для бесшовного wrap-around
- Wrap-around: в свободном полёте x<0→x+=W, x>W→x-=W (синхронизация body.position/prev/prevFrame)
- Ghost sprite: визуальный клон на противоположном краю, виден только в свободном полёте у края (50px)
- Смерть после pendulum update: playerBottom >= GROUND_Y - 6
- Hunt Showdown палитра, процедурная графика, процедурный звук

## TODO
- [x] Telegram Mini App + Stars оплата (⭐6 за воскрешение)
- [x] Leaderboard (Cloudflare KV, топ-100)
- [x] Wrap-around (ghost sprite + фиксированная камера X)
- [ ] Деплой Yandex Games + SDK
- [ ] Тест на мобиле
- [ ] Туториал первой игры
- [ ] Движущиеся якоря
- [ ] Удалить counter.js, style.css, assets/
