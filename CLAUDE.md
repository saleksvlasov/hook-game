# THE HOOK — Project Agents

## DESIGN AGENT
When task starts with [DESIGN]:
- Focus only on visuals: colors, fonts, graphics, animations
- Style: Hunt Showdown — dark gothic western
- Palette: #1a0a00 (background), #8B4513 (brown), #C8A96E (gold), #2d0000 (dark red)
- Never touch game logic

## CODE AGENT
When task starts with [CODE]:
- Focus only on mechanics and game logic
- Never touch visuals or styles
- Always add comments in Russian
- After each change, describe what exactly was changed

## RESEARCH AGENT
When task starts with [RESEARCH]:
- Analyze code and find problems
- Suggest improvements with justification
- Compare with hyper-casual game best practices

## TEST AGENT
When task starts with [TEST]:
- Check edge cases: what if no anchors nearby? what if player is off screen?
- Write a list of found bugs with reproduction steps
- Check performance (fps, memory leaks)

---

# THE HOOK — Project Skill Guide

## 1. ОПИСАНИЕ ПРОЕКТА

**THE HOOK** — hyper-casual вертикальная аркада с механикой крюка-маятника.
Игрок цепляется крюком за якоря над собой, раскачивается и летит вверх по инерции.
Цель — набрать максимальную высоту. Визуальный стиль — Hunt: Showdown (тёмный готический вестерн, болота, ржавые крюки).

**Стек:** Vite 5 + vanilla JS + Phaser 3 (arcade physics) + Web Audio API.
**Без внешних ассетов** — вся графика через Phaser Graphics, все звуки через OscillatorNode.
**Локализация:** EN / RU с автодетектом.
**Монетизация:** заглушки для Yandex Ads SDK (interstitial + rewarded).

---

## 2. СТРУКТУРА ФАЙЛОВ

```
hook-game/
  index.html              — HTML shell, CSS центрирование, Yandex SDK placeholder
  package.json            — Vite 5 + Phaser 3
  CLAUDE.md               — Этот файл: агенты + полная документация проекта
  src/
    main.js               — Phaser конфиг (480x800, Scale.FIT, arcade physics, DOM enabled)
    i18n.js               — Локализация EN/RU, автодетект языка, localStorage сохранение
    storage.js            — localStorage: рекорд (thehook_best), луна (thehook_moon)
    audio.js              — Web Audio API: 8 звуков (hook, attach, release, death, record, ominous, bounty, moonwalker)
    ads.js                — Заглушки рекламы: interstitial (каждые 5 игр), rewarded (continue)
    scenes/
      MenuScene.js        — Главное меню: заголовок с glow, охотник на маятнике, кнопка CLIMB, переключатель языка, Konami code
      GameScene.js        — Основная игра: маятник, крюки, смерть, Game Over с DOM-кнопками, пасхалки
    assets/               — Неиспользуемые файлы от Vite template (hero.png, javascript.svg, vite.svg)
    counter.js            — Неиспользуемый файл от Vite template
    style.css             — Неиспользуемый файл от Vite template
```

### Ключевые модули

| Файл | Экспорты | Назначение |
|------|----------|------------|
| `main.js` | — | Точка входа, создаёт `new Phaser.Game(config)` |
| `MenuScene.js` | `MenuScene` | Phaser.Scene — меню с анимацией |
| `GameScene.js` | `GameScene` | Phaser.Scene — вся игровая логика |
| `audio.js` | `playHook, playAttach, playRelease, playDeath, playRecord, playOminous, playBounty, playMoonwalker` | Процедурные звуки |
| `storage.js` | `getBest, saveBest, getMoon, saveMoon` | Персистентность |
| `i18n.js` | `t, getLang, setLang, LANGS` | Локализация |
| `ads.js` | `trackGameEnd, shouldShowInterstitial, showInterstitial, showRewarded` | Рекламные заглушки |

---

## 3. АГЕНТЫ (подробно)

### [DESIGN] — Визуал
- Только цвета, шрифты, графика, анимации
- Стиль: Hunt Showdown — тёмный готический вестерн
- Никогда не трогает игровую логику (физику маятника, death check, input handling)
- Персонаж рисуется в `drawHunterPose()`, вызывается каждый кадр для анимации пальто

### [CODE] — Логика
- Только механики: маятник, крюки, смерть, респаун, камера
- Комментарии на русском
- Никогда не трогает визуал
- После изменений — описание что именно изменено

### [TEST] — Тестирование
- Edge cases: нет якорей, игрок за экраном, рекорд = 0
- Баги с шагами воспроизведения
- Производительность: FPS, утечки памяти, размер массивов

### [RESEARCH] — Анализ
- Проблемы в коде с обоснованием
- Сравнение с лучшими практиками hyper-casual
- Предложения по оптимизации

---

## 4. ПАЛИТРА (Hunt Showdown)

| Назначение | HEX | Переменная |
|------------|-----|------------|
| Фон (градиент) | `#15100a` → `#2a1c0e` → `#3d2812` | Gradient в `createBackground()` |
| Фон (base) | `#1a0e06` | `BG_DARK`, backgroundColor в конфиге |
| Золото (акцент) | `#C8A96E` | `GOLD` / `GOLD_HEX = 0xC8A96E` |
| Тёмно-красный | `#6B0F0F` | `DARK_RED` / `DARK_RED_HEX` |
| Ржавчина (крюки, верёвка) | `#7A4A1E` | `RUST = 0x7A4A1E` |
| Тело охотника | `#5a3518` | `HUNTER_BODY` |
| Лицо охотника | `#F0DDB0` | `HUNTER_FACE` |
| Trail (угольки) | `#FF6B00` | `TRAIL_COLOR` |
| Свечение крюка (active) | `#FFB84D` | Hardcoded в `drawButcherHook()` |
| Шрифт | Georgia, serif | `FONT` |

---

## 5. КОНСТАНТЫ

### Мир и физика (GameScene.js)
```
GRAVITY = 900           — сила тяжести маятника (не Phaser arcade gravity!)
HOOK_RANGE = 500        — макс дистанция до якоря для зацепки
WORLD_WIDTH = 480       — ширина игрового мира (= ширина canvas)
WORLD_HEIGHT = 8000     — высота мира
ANCHOR_SPACING_Y = 280  — расстояние между якорями по вертикали
GROUND_Y = 7990         — Y-координата зоны смерти (WORLD_HEIGHT - 10)
SPAWN_Y = 7920          — Y-координата спавна (WORLD_HEIGHT - 80)
TRAIL_SPEED_THRESHOLD = 150 — мин. скорость для появления trail-частиц
```

### Пасхалки
```
BOUNTY_HEIGHT = 100     — высота для "BOUNTY CLAIMED!"
MOON_HEIGHT = 300       — высота для "MOONWALKER"
```

### Phaser конфиг (main.js)
```
width: 480, height: 800
Scale.FIT + CENTER_BOTH
arcade.gravity.y: 800   — глобальная гравитация Phaser (для свободного полёта)
dom.createContainer: true — для HTML DOM кнопок
```

### Реклама (ads.js)
```
INTERSTITIAL_EVERY = 5  — interstitial каждые N игр
```

### localStorage ключи (storage.js, ads.js, i18n.js)
```
thehook_best            — рекорд высоты (число)
thehook_moon            — достигнута ли луна ('yes')
thehook_games           — счётчик завершённых игр (число)
thehook_lang            — выбранный язык ('en' | 'ru')
```

---

## 6. ИЗВЕСТНЫЕ БАГИ

### Решённые
- Маятник не качался — `setVelocity(0,0)` обнуляло скорость до считывания
- Кнопки Game Over не кликались — `setScrollFactor(0)` в контейнере ломал hit testing
- Смерть не срабатывала на крюке — death check был до pendulum update
- Боковые "стенки" — `checkCollision.left/right` и `setCollideWorldBounds`
- Canvas смещался — неправильный CSS (width:100% вместо 100vh)
- RESTART вёл в меню — `scene.restart()` не очищал DOM элементы
- Phaser.Scale.RESIZE ломал рендер — откат на Scale.FIT

### Потенциальные / Нерешённые
- `drawHunterPose()` вызывается каждый кадр (~30 draw calls) — ок для мобиля, но при масштабировании стоит кэшировать в текстуру
- `splice(i, 1)` в обратном цикле для trail/bubbles — O(n), при увеличении лимитов лучше swap-and-pop
- DOM кнопки могут не удаляться при `scene.stop()` — Phaser должен чистить, но не протестировано при быстрых переключениях
- Race condition: `continueWithAd()` async — добавлена проверка `!this.isDead`, но полный mutex отсутствует

---

## 7. ПРАВИЛА — НЕ МЕНЯТЬ

### Архитектура
- **Две сцены:** MenuScene → GameScene. Не добавлять промежуточных сцен
- **Фиксированный размер:** 480x800 + Scale.FIT. Не переключать на RESIZE
- **DOM кнопки:** Game Over использует `this.add.dom().createFromHTML()` с нативным `addEventListener('click')`. Не заменять на Phaser rectangles
- **Маятник вручную:** Физика маятника считается через `swingAngle/swingSpeed`, не через Phaser joints или constraints

### Геймплей
- **Toggle click:** один тап — зацепиться, второй — отпустить. Не hold/release
- **Гравитация:** arcade gravity = 800 (свободный полёт), manual gravity = 900 (маятник)
- **Камера:** ручной lerp по X (0.08) и Y (0.15) в update(). Не использовать startFollow
- **Смерть:** проверяется ПОСЛЕ обновления позиции маятника, по `playerBottom >= GROUND_Y - 6`

### Стиль
- **Hunt Showdown палитра** — не менять на другие стили
- **Процедурная графика** — нет внешних спрайтов, всё через Phaser Graphics
- **Процедурный звук** — нет аудиофайлов, всё через Web Audio API OscillatorNode

---

## 8. TODO

### Критическое
- [ ] Деплой на Yandex Games (подключить SDK, заменить ad-заглушки)
- [ ] Тест на реальном мобильном устройстве (touch events, performance)
- [ ] Проверить что DOM кнопки корректно масштабируются при Scale.FIT

### Монетизация
- [ ] Подключить `YaGames.init()` в ads.js
- [ ] Заменить `showInterstitial()` → `yaSDK.adv.showFullscreenAdv()`
- [ ] Заменить `showRewarded()` → `yaSDK.adv.showRewardedVideo()`
- [ ] Настроить частоту interstitial для прохождения модерации

### Геймплей
- [ ] Туториал для первой игры (анимированная стрелка "нажми сюда")
- [ ] Больше типов якорей (движущиеся, исчезающие)
- [ ] Увеличение сложности с высотой (реже якоря, уже проходы)
- [ ] Leaderboard через Yandex Games API

### Визуал
- [ ] Кэшировать охотника в RenderTexture вместо перерисовки каждый кадр
- [ ] Добавить фоновые элементы (вороны, летучие мыши на высоте)
- [ ] Анимация зацепления крюка (лёгкий zoom + slow-mo на 100ms)

### Дистрибуция
- [ ] APK через Capacitor или PWA wrapper
- [ ] Telegram Mini App
- [ ] Open Graph meta-теги для шеринга
- [ ] Favicon и иконки для PWA manifest

### Технический долг
- [ ] Удалить неиспользуемые файлы (counter.js, style.css, assets/)
- [ ] Добавить ESLint конфиг
- [ ] Оптимизировать бандл (Phaser tree-shaking или отдельный chunk)
