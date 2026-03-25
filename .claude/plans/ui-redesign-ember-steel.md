# UI Redesign: Ember & Steel + Glassmorphism + Biomes

## Палитра Ember & Steel
```
BG:          #0d0f12 → #1a1c20 → #12141a (тёмная сталь)
Gold:        #F0A030 (яркий янтарь, вместо #C8A96E)
Accent:      #FF6B35 (тлеющий уголь)
Red:         #C41E3A (яркий алый, вместо #6B0F0F)
Steel:       #3A3D45 (стальной серый)
Steel Light: #5A5D65 (светлая сталь)
Rust:        #8B5E3C (тёплая ржавчина, вместо #7A4A1E)
Hunter body: #4A3525 (тёмная кожа)
Hunter gold: #F0A030 (outline)
BG_DARK:     #0d0f12 (CSS body)
FONT:        'Georgia, serif' (без изменений)
```

## Файлы для изменения

### 1. `src/constants.js` — обновить палитру
- Все цветовые константы на новые значения
- Добавить STEEL, STEEL_LIGHT, EMBER, AMBER цвета
- Добавить массив BIOMES с настройками каждого биома

### 2. `src/managers/BiomeManager.js` — НОВЫЙ ФАЙЛ
Менеджер биомов по высоте:
```
Biome 0 (0-1500m):    Foundry    — промзона, искры, дым, стальные балки
Biome 1 (1500-3000m): Ironworks  — заброшенный завод, ржавые трубы, пар
Biome 2 (3000-5000m): Furnace    — раскалённые угли, лава-подсветка снизу
Biome 3 (5000-7000m): Storm      — грозовые облака, молнии, ветер
Biome 4 (7000m+):     Cosmos     — звёзды, северное сияние, тишина
```
Каждый биом:
- Свой градиент фона (плавный переход между биомами)
- Свои параллакс-объекты (балки → трубы → угли → облака → звёзды)
- Свой цвет тумана/частиц
- Переход: 200м зона blend между биомами

### 3. `src/scenes/GameScene.js` — фон через BiomeManager
- Заменить статический bg-grad на динамический через BiomeManager
- Убрать старые деревья/туман/луну (биомы берут на себя)
- createBackground() → biomeManager.create()
- update: biomeManager.update(playerHeight)

### 4. `src/managers/UIFactory.js` — glassmorphism утилиты
- Новая функция `drawGlassButton(gfx, x, y, w, h, opts)`:
  - Стальной полупрозрачный фон (rgba)
  - Тонкая светящаяся рамка (amber/ember glow)
  - Скруглённые углы 8px
  - Внутренний highlight сверху (white 5%)
- Обновить drawWantedPosterFrame → стальная рамка
- Обновить drawRopeDecoration → стальная цепь
- Ember burst: оранжевые частицы вместо золотых

### 5. `src/scenes/MenuScene.js` — новый дизайн меню
- Фон: стальной градиент с искрами
- CLIMB кнопка: glassmorphism + amber glow
- Заголовок: amber свечение вместо коричневого
- Record: стальная рамка poster
- Lang toggle: маленькая glass-кнопка

### 6. `src/managers/GameOverUI.js` — glass-кнопки
- HTML кнопки: glassmorphism CSS
  - `backdrop-filter: blur(12px)`
  - `background: rgba(15, 17, 22, 0.7)`
  - `border: 1px solid rgba(240, 160, 48, 0.3)`
  - `box-shadow: 0 0 15px rgba(255, 107, 53, 0.15)`
  - hover: glow intensifies
  - press: scale(0.97) + brighter glow
- Overlay: тёмно-стальной вместо тёмно-красного
- YOU FELL: алый #C41E3A

### 7. `src/managers/HUDManager.js` — стальной HUD
- Backdrop: стальной с blur-эффектом (через Graphics)
- Текст высоты: amber #F0A030
- Record: steel-light text
- Milestone: ember burst с оранжевыми частицами

### 8. `src/managers/HunterRenderer.js` — обновить охотника
- Outline: amber вместо gold
- Hat brim: amber
- Belt buckle: amber

### 9. `src/managers/AnchorManager.js` — стальные крюки
- Крюк: steel + amber glow когда активен
- Active: ember свечение вместо gold

### 10. `src/managers/TrailManager.js` — ember trail
- Цвет: ярче оранжевый #FF6B35 → #FF3300 fade

### 11. `index.html` — CSS body background
- `background: #0d0f12` вместо `#1a0e06`

## Порядок работы (агенты параллельно)

**Agent 1**: constants.js + BiomeManager.js (новый) + GameScene.js интеграция
**Agent 2**: UIFactory.js + MenuScene.js
**Agent 3**: GameOverUI.js + HUDManager.js
**Agent 4**: HunterRenderer.js + AnchorManager.js + TrailManager.js + RopeRenderer.js + SwampManager.js + EasterEggs.js + index.html
