# THE HOOK — Agent System

## ГЛАВНОЕ ПРАВИЛО
После каждого [CODE] изменения → автоматически [TEST].
Никакого деплоя без "✅ READY TO DEPLOY" от TEST агента.

## ПРИНЦИПЫ АРХИТЕКТУРЫ
- **SOLID** — Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- После кода — всегда тест, проверка на утечки памяти, оптимизация, скорость алгоритмов
- Никаких костылей: setTimeout для UI, кнопки вне DOM-дерева, дублирование состояния
- Серверный источник правды: данные пользователя хранятся на сервере (Cloudflare KV), localStorage НЕ используется
- Деплой только с согласия владельца

## РОЛИ АГЕНТОВ (skills)
Каждая роль вынесена в `.claude/skills/` и загружается по требованию:
- **[CODE]** → `.claude/skills/code.md` — Senior Software Engineer
- **[TEST]** → `.claude/skills/test.md` — Senior QA Engineer
- **[DESIGN]** → `.claude/skills/design.md` — Senior Art Director
- **[MATH]** → `.claude/skills/math.md` — Senior Physicist / Game Balance
- **[ECONOMICS]** → `.claude/skills/economics.md` — Game Economy Designer
- **[RESEARCH]** → `.claude/skills/research.md` — Senior Technical Analyst

## ЦИКЛ РАЗРАБОТКИ
```
[RESEARCH если непонятна причина]
    ↓
[MATH если нужны расчёты физики/баланса]
    ↓
[CODE] → изменение
    ↓
[TEST] → проверка
    ↓
❌ баг → [MATH если физика] или [CODE снова]
✅ OK → git commit → npm run build → npm run deploy
```

КОГДА ВЫЗЫВАТЬ [MATH]:
- Любое изменение GRAVITY, SWING_FRICTION, RELEASE_BOOST, MAX_ROPE_LENGTH
- Изменение ANCHOR_SPACING_Y или HOOK_RANGE
- Жалоба "слишком легко/сложно/не долетает/телепортирует"
- Новый тип движения (движущиеся якоря, ветер, ускорители)

---

# THE HOOK — Project Reference

## ОПИСАНИЕ
**THE HOOK** — hyper-casual вертикальная аркада с механикой крюка-маятника.
Стек: Vite 5 + vanilla JS + Phaser 3 + Web Audio API. Без внешних ассетов.
Локализация EN/RU. Заглушки Yandex Ads SDK.

## СТРУКТУРА
```
src/
  main.js          — Загрузочный экран, ожидание SDK + сервера, экран ошибки, запуск Engine
  i18n.js          — EN/RU локализация, автодетект через navigator.language / сервер
  audio.js         — 9 процедурных звуков через Web Audio API (+ playBugHit, destroyAudio)
  ads.js           — Adsgram реклама (interstitial каждые 8 смертей, rewarded)
  telegram.js      — Telegram Mini App SDK, Stars оплата, leaderboard API
  scenes/
    MenuScene.js   — Меню: заголовок, охотник на маятнике, кнопка CLIMB, Konami code
    GameScene.js   — Игра: маятник, крюки, жуки, смерть, Game Over, биомы
  managers/
    AnchorManager.js   — Процедурная генерация крюков, cleanup
    ObstacleManager.js — 4 типа жуков-препятствий (beetle, spider, scorpion, firefly)
    BiomeManager.js    — 5 биомов с градиентами + 3 слоя мерцающих искр-костра
    HUDManager.js      — Счёт высоты, рекорд, сердца + бонусный таймер, подсказки
    GameOverUI.js      — HTML кнопки (flat minimal), кровь, анимации
    UIFactory.js       — drawGlassButton, drawChip, drawSteelFrame, createEmberBurst
    HunterRenderer.js  — Процедурный охотник + анимация пальто
    RopeRenderer.js    — Bézier верёвка с тенью
    TrailManager.js    — Ember trail частицы (ObjectPool)
    SwampManager.js    — Болото + пузыри (ObjectPool)
    EasterEggs.js      — Bounty (1000м), Moonwalker (3000м)
    ObjectPool.js      — Переиспользуемый пул объектов
  data/
    UserProfile.js     — Singleton профиля, геттеры/сеттеры, серверная синхронизация
    TelegramProvider.js — Сервер = единственный источник правды, без localStorage
    index.js           — Экспорт profile + getCurrentWeek
worker/
  worker-bundle.js — Cloudflare Worker: invoice, leaderboard, profile, challenges, lang (KV)
```

## КОНСТАНТЫ
```
GRAVITY = 980 (маятник), arcade.gravity.y = 550 (свободное падение)
HOOK_RANGE = 300, MAX_ROPE_LENGTH = 220, MIN_ROPE = 50
SWING_FRICTION = 0.9992, RELEASE_BOOST = 1.25, MIN_SWING_SPEED = 1.5
HOOK_COOLDOWN = 180ms, FALL_SPEED_PENALTY_START/MAX = 200/1000
ANCHOR_SPACING_Y = 240, GROUND_Y = WORLD_HEIGHT-10, SPAWN_Y = WORLD_HEIGHT-400
OBSTACLE_START_HEIGHT = 50м, OBSTACLE_CHANCE = 0.4, OBSTACLE_HIT_RADIUS = 22
HEARTS_MAX = 6 (3 полных), HEARTS_MAX_BONUS = 8 (4-е бонусное на 40с)
HEART_BONUS_DURATION = 40000ms, HEART_PICKUP_CHANCE = 0.08
WORLD_WIDTH = this.scale.width (динамический), WORLD_HEIGHT = 100000
5 биомов: foundry(0-1500) → ironworks(1500-3000) → furnace(3000-5000) → storm(5000-7000) → cosmos(7000+)
```

## ХРАНЕНИЕ ДАННЫХ
- **localStorage НЕ ИСПОЛЬЗУЕТСЯ** — полностью убран
- Сервер (Cloudflare KV) = единственный источник правды
- Загрузочный экран ждёт ответ сервера перед стартом
- Сервер недоступен → экран ошибки + Retry
- `lang` хранится на сервере (`/save-lang` эндпоинт)
- `gamesCount` — per-session (в памяти, для частоты рекламы)

## ПРАВИЛА — НЕ МЕНЯТЬ
- Две сцены: MenuScene → GameScene
- Динамический размер + Scale.NONE
- Game Over кнопки — чистый HTML (position:fixed, z-index:100, flat minimal)
- Маятник: swingAngle/swingSpeed, полные 360°
- Toggle click: тап — зацепиться, тап — отпустить
- Камера: X lerp при hooked (0.08, ±30%), X→0 при free (0.1); Y lerp(0.15)
- Wrap-around: в свободном полёте x<0→x+=W, x>W→x-=W (синхронизация body.position/prev/prevFrame)
- Ghost sprite: визуальный клон на противоположном краю, виден только в свободном полёте у края (50px)
- Смерть после pendulum update: playerBottom >= GROUND_Y - 6
- Штраф за падение: HOOK_RANGE уменьшается с ростом скорости падения (FALL_SPEED_PENALTY)
- Кулдаун хука: 180ms после release — нельзя спам-тапать
- Жуки-препятствия: от 50м, при касании — knockback + 2s invulnerability + звук
- shutdown() чистит ВСЕ менеджеры + input listener
- Neon Western палитра, процедурная графика, процедурный звук

## TODO
- [x] Telegram Mini App + Stars оплата (⭐50 за воскрешение)
- [x] Leaderboard (Cloudflare KV, топ-100)
- [x] Wrap-around (ghost sprite + камера X lerp)
- [x] Жуки-препятствия (4 типа, от 50м)
- [x] 5 биомов с мерцающими искрами-костра
- [x] Flat minimal UI + MUI Chip дизайн
- [x] Физика v3: fall penalty, hook cooldown, balanced constants
- [x] Удалить counter.js, style.css
- [x] Убран localStorage полностью — сервер единственный источник
- [x] Загрузочный экран + экран ошибки сервера
- [x] 4-е бонусное сердце на 40с с таймером
- [x] Уменьшено свечение текста (shadowBlur) для читаемости
- [ ] Деплой Yandex Games + SDK
- [ ] Тест на мобиле (375/390/414px)
- [ ] Туториал первой игры
- [ ] Движущиеся якоря
- [ ] A/B тест сложности (ECONOMICS)
