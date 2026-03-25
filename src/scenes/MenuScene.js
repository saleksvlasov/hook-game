import Phaser from 'phaser';
import { getBest, getMoon, getActiveSkin, setActiveSkin, isSkinUnlocked } from '../storage.js';
import { SKINS, drawSkinPose } from '../managers/SkinRenderer.js';
import { playOminous } from '../audio.js';
import { t, getLang, setLang } from '../i18n.js';
import {
  drawGlassButton, drawChip,
  createTypewriterText, createEmberBurst,
} from '../managers/UIFactory.js';
// FONT из constants.js больше не используется — вся типографика через NEON_FONT

// ===== NEON WESTERN ПАЛИТРА =====
const NEON_CYAN = 0x00F5D4;
const NEON_PINK = 0xFF2E63;
const NEON_AMBER = 0xFFB800;
const NEON_CYAN_STR = '#00F5D4';
const NEON_PINK_STR = '#FF2E63';
const NEON_AMBER_STR = '#FFB800';
const BG_DARK_NEON = 0x0A0E1A;
const BG_DARK_NEON_STR = '#0A0E1A';
const STEEL_NEON = 0x4A5580;
const NEON_FONT = "'Inter', 'Helvetica Neue', sans-serif";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    this.W = W;
    this.H = H;

    // Все UI элементы для stagger-анимации
    this._uiElements = [];

    // Селектор скинов
    this.skinSelectorOpen = false;
    this.skinSelectorElements = [];
    this._tooltipElements = [];

    // --- Фон: глубокий navy-black градиент (neon western) ---
    if (this.textures.exists('menu-bg')) this.textures.remove('menu-bg');
    const gradTex = this.textures.createCanvas('menu-bg', 1, H);
    const ctx = gradTex.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#050810');    // почти чёрный (верх)
    grad.addColorStop(0.3, '#0A0E1A');  // основной тёмный
    grad.addColorStop(0.6, '#10152A');  // чуть светлее navy
    grad.addColorStop(1, '#0A0E1A');    // обратно к основному
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1, H);
    gradTex.refresh();
    this.add.image(W / 2, H / 2, 'menu-bg').setDisplaySize(W, H).setDepth(-10);

    // Луна — неоновый cyan оттенок
    const moon = this.add.graphics().setDepth(-8);
    // Внешнее свечение — cyan
    moon.fillStyle(NEON_CYAN, 0.04);
    moon.fillCircle(W * 0.75, H * 0.12, 80);
    // Основной диск — steel
    moon.fillStyle(STEEL_NEON, 0.30);
    moon.fillCircle(W * 0.75, H * 0.12, 60);
    // Светлая часть
    moon.fillStyle(STEEL_NEON, 0.20);
    moon.fillCircle(W * 0.75 - 8, H * 0.12 - 5, 55);
    // Кратеры
    moon.fillStyle(0x2A3050, 0.12);
    moon.fillCircle(W * 0.75 + 15, H * 0.12 - 15, 12);
    moon.fillCircle(W * 0.75 - 20, H * 0.12 + 10, 8);

    // Неоновые искры — 50% cyan, 50% amber, яркие!
    this.ashParticles = [];
    for (let i = 0; i < 50; i++) {
      const isCyan = Math.random() < 0.5;
      this.ashParticles.push({
        x: Phaser.Math.Between(0, W),
        y: Phaser.Math.Between(0, H),
        size: 1 + Math.random() * 2,        // 1–3px
        speed: isCyan ? -(8 + Math.random() * 15) : (8 + Math.random() * 15),
        drift: (Math.random() - 0.5) * 10,
        alpha: 0.4 + Math.random() * 0.3,   // 0.4–0.7 (яркие!)
        color: isCyan ? NEON_CYAN : NEON_AMBER,
      });
    }
    this.ashGfx = this.add.graphics().setDepth(-4);

    // Деревья — очень тёмные силуэты
    const trees = this.add.graphics().setDepth(-6);
    this.drawTreeSilhouettes(trees, H - 100, 0.4, W);

    // Туман — тёмный navy
    const fog = this.add.graphics().setDepth(-3);
    fog.fillStyle(BG_DARK_NEON, 0.30);
    fog.fillRect(0, H - 150, W, 150);
    fog.fillStyle(0x10152A, 0.18);
    fog.fillRect(0, H - 250, W, 100);

    // Охотник на крюке
    this.createSwingingHunter();

    // --- Заголовок — КРУПНЫЙ, BOLD, neon amber + тройное свечение ---
    const titleY = H * 0.19;
    // Glow stack — тройной неон: amber, cyan, pink
    const glowColors = [NEON_AMBER, NEON_CYAN, NEON_PINK];
    for (let i = glowColors.length - 1; i >= 0; i--) {
      const glow = this.add.text(W / 2, titleY, 'THE HOOK', {
        fontSize: '60px', fontFamily: NEON_FONT, fontStyle: 'bold',
        color: '#' + glowColors[i].toString(16).padStart(6, '0'),
        stroke: '#' + glowColors[i].toString(16).padStart(6, '0'),
        strokeThickness: 16 + i * 8,
      }).setOrigin(0.5).setAlpha(0).setDepth(10);
      this.tweens.add({
        targets: glow, alpha: 0.18 + i * 0.06,
        duration: 1800 + i * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: 400,
      });
    }

    const title = this.add.text(W / 2, titleY + 20, 'THE HOOK', {
      fontSize: '60px', fontFamily: NEON_FONT, fontStyle: 'bold',
      color: NEON_AMBER_STR, stroke: BG_DARK_NEON_STR, strokeThickness: 7,
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    this.tweens.add({
      targets: title, y: titleY - 5, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      delay: 500,
    });

    // Stagger: заголовок 0ms
    this._addStaggerEntry(title, titleY, 0);

    // --- Трещина под заголовком — neon cyan ---
    const crackGfx = this.add.graphics().setDepth(11).setAlpha(0);
    crackGfx.lineStyle(1.5, NEON_CYAN, 0.5);
    crackGfx.beginPath();
    const crackLeft = W * 0.25;
    const crackRight = W * 0.75;
    const crackY = titleY + 35;
    crackGfx.moveTo(crackLeft, crackY);
    const crackSegments = 20;
    for (let i = 1; i <= crackSegments; i++) {
      const sx = crackLeft + (crackRight - crackLeft) * (i / crackSegments);
      const sy = crackY + (Math.random() - 0.5) * 4;
      crackGfx.lineTo(sx, sy);
    }
    crackGfx.strokePath();
    this._addStaggerFade(crackGfx, 0);

    // --- Подзаголовок — typewriter, neon cyan ---
    const subtitleY = titleY + 54;

    const subtitleText = createTypewriterText(this, W / 2, subtitleY, t('title_sub'), {
      fontSize: '16px', fontFamily: NEON_FONT, fontStyle: 'italic', color: NEON_CYAN_STR,
    }, 50);
    subtitleText.setDepth(11).setAlpha(0);
    this._addStaggerEntry(subtitleText, subtitleY, 200);

    // Stagger: охотник 300ms (контейнер menuHunter)
    if (this.menuHunter) {
      this.menuHunter.setAlpha(0);
      this._addStaggerEntry(this.menuHunter, this.menuHunter.y, 300);
    }

    // --- Кнопка CLIMB — neon cyan свечение ---
    const btnY = H * 0.66;
    const btnW = 250;
    const btnH = 64;

    // Glow пульсация — neon cyan
    const btnGlow = this.add.rectangle(W / 2, btnY, btnW + 20, btnH + 20, NEON_CYAN, 0.12).setDepth(12);
    this.tweens.add({
      targets: btnGlow, alpha: 0.24, scaleX: 1.05, scaleY: 1.05,
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Graphics для glass кнопки
    const btnGfx = this.add.graphics().setDepth(13);
    drawGlassButton(btnGfx, W / 2, btnY, btnW, btnH);

    // Текст кнопки — amber на тёмном фоне
    const btnText = this.add.text(W / 2, btnY, t('play'), {
      fontSize: '32px', fontFamily: NEON_FONT, fontStyle: 'bold',
      color: NEON_AMBER_STR, stroke: BG_DARK_NEON_STR, strokeThickness: 4,
    }).setOrigin(0.5).setDepth(14).setAlpha(0);

    // Невидимая зона для интерактива
    const btnZone = this.add.zone(W / 2, btnY, btnW, btnH).setInteractive({ useHandCursor: true }).setDepth(15);

    btnZone.on('pointerover', () => {
      drawGlassButton(btnGfx, W / 2, btnY, btnW, btnH, { hover: true });
      btnText.setScale(1.05);
    });

    btnZone.on('pointerout', () => {
      drawGlassButton(btnGfx, W / 2, btnY, btnW, btnH);
      btnText.setScale(1);
    });

    btnZone.on('pointerdown', () => {
      drawGlassButton(btnGfx, W / 2, btnY, btnW, btnH, { pressed: true });
      btnText.setY(btnY + 1);
      createEmberBurst(this, W / 2, btnY, 6);
    });

    btnZone.on('pointerup', () => {
      drawGlassButton(btnGfx, W / 2, btnY, btnW, btnH);
      btnText.setY(btnY);
      // Запуск игры — fadeOut в neon dark
      createEmberBurst(this, W / 2, btnY, 20);
      this.cameras.main.fadeOut(400, 10, 14, 26); // RGB #0A0E1A
      this.time.delayedCall(400, () => this.scene.start('GameScene'));
    });

    // Stagger: кнопка 500ms
    btnGlow.setAlpha(0);
    btnGfx.setAlpha(0);
    this._addStaggerFade(btnGlow, 500);
    this._addStaggerFade(btnGfx, 500);
    this._addStaggerEntry(btnText, btnY, 500);

    // --- Рекорд ---
    const best = getBest();
    const recordY = H * 0.75;
    if (best > 0) {
      // MUI Chip — cyan рамка, amber текст
      const chipGfx = this.add.graphics().setDepth(10).setAlpha(0);
      drawChip(chipGfx, W / 2, recordY, 200, 36);

      const recordText = this.add.text(W / 2, recordY, `${t('record')}: ${best}${t('unit_m')}`, {
        fontSize: '16px', fontFamily: NEON_FONT, fontStyle: 'bold', color: NEON_AMBER_STR,
      }).setOrigin(0.5).setDepth(11).setAlpha(0);

      // Stagger: рекорд 700ms
      this._addStaggerFade(chipGfx, 700);
      this._addStaggerEntry(recordText, recordY, 700);
    }

    if (getMoon()) {
      const moonText = this.add.text(W / 2, H * 0.78, t('moon_reached'), {
        fontSize: '12px', fontFamily: NEON_FONT, fontStyle: 'italic', color: '#4A5580',
      }).setOrigin(0.5).setDepth(11).setAlpha(0);
      this._addStaggerEntry(moonText, H * 0.78, 700);
    }

    // --- Кнопка SKINS ---
    const skinsY = H * 0.82;
    const skinsGfx = this.add.graphics().setDepth(15);
    drawGlassButton(skinsGfx, W / 2, skinsY, 120, 32);

    const skinsText = this.add.text(W / 2, skinsY, t('skins_title'), {
      fontSize: '14px', fontFamily: NEON_FONT, fontStyle: 'bold',
      color: NEON_CYAN_STR,
    }).setOrigin(0.5).setDepth(16).setAlpha(0);

    const skinsZone = this.add.zone(W / 2, skinsY, 120, 32)
      .setInteractive({ useHandCursor: true }).setDepth(17);

    skinsZone.on('pointerdown', () => this._toggleSkinSelector());

    this._addStaggerFade(skinsGfx, 750);
    this._addStaggerEntry(skinsText, skinsY, 750);

    // --- Подсказка внизу — neon cyan, пульсация ---
    const hintText = this.add.text(W / 2, H - 24, t('tap_to_hunt'), {
      fontSize: '15px', fontFamily: NEON_FONT, fontStyle: 'italic', color: NEON_CYAN_STR,
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    // Пульсация подсказки 0.4 → 0.9
    this.tweens.add({
      targets: hintText, alpha: { from: 0.4, to: 0.9 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      delay: 800,
    });
    this._addStaggerEntry(hintText, H - 20, 800);

    // --- Переключатель языка (cyan рамка, amber текст) ---
    const langX = W - 44;
    // Safe area для iPhone Dynamic Island / notch
    const envTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0', 10);
    const langY = Math.max(envTop, 10) + 16;
    const langGfx = this.add.graphics().setDepth(15);
    drawGlassButton(langGfx, langX, langY, 46, 26);

    const langText = this.add.text(langX, langY, getLang() === 'ru' ? 'EN' : 'RU', {
      fontSize: '16px', fontFamily: NEON_FONT, fontStyle: 'bold', color: NEON_AMBER_STR,
    }).setOrigin(0.5).setDepth(16);

    const langZone = this.add.zone(langX, langY, 46, 26).setInteractive({ useHandCursor: true }).setDepth(17);

    langZone.on('pointerover', () => {
      drawGlassButton(langGfx, langX, langY, 46, 26, { hover: true });
    });
    langZone.on('pointerout', () => {
      drawGlassButton(langGfx, langX, langY, 46, 26);
    });
    langZone.on('pointerdown', () => {
      createEmberBurst(this, langX, langY, 4);
      setLang(getLang() === 'ru' ? 'en' : 'ru');
      this.scene.restart();
    });

    // Konami Code
    this.konamiSequence = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right'];
    this.konamiIndex = 0;
    this.konamiTriggered = false;
    this._konamiHandler = (event) => this.checkKonami(event);
    this.input.keyboard.on('keydown', this._konamiHandler);

    // --- Stagger entry анимация ---
    this._playStaggerEntries();
  }

  // Регистрация элемента для stagger-анимации (с Y-движением)
  _addStaggerEntry(target, finalY, delay) {
    this._uiElements.push({ target, finalY, delay, fadeOnly: false });
  }

  // Только fade (для Graphics с абсолютными координатами)
  _addStaggerFade(target, delay) {
    this._uiElements.push({ target, finalY: null, delay, fadeOnly: true });
  }

  // Запуск всех stagger-анимаций
  _playStaggerEntries() {
    for (const { target, finalY, delay, fadeOnly } of this._uiElements) {
      if (target.setAlpha) target.setAlpha(0);

      if (fadeOnly) {
        this.tweens.add({
          targets: target, alpha: 1, duration: 400, delay, ease: 'Cubic.easeOut',
        });
      } else {
        if (target.setY) target.setY(finalY + 20);
        this.tweens.add({
          targets: target, alpha: 1, y: finalY, duration: 400, delay, ease: 'Cubic.easeOut',
        });
      }
    }
  }

  // Открыть/закрыть горизонтальный селектор скинов
  _toggleSkinSelector() {
    if (this.skinSelectorOpen) {
      // Закрыть
      for (const el of this.skinSelectorElements) {
        if (el && el.destroy) el.destroy();
      }
      this.skinSelectorElements = [];
      this.skinSelectorOpen = false;
      return;
    }

    this.skinSelectorOpen = true;
    const W = this.W;
    const H = this.H;
    const y = H * 0.90;
    const cellW = 56;
    const activeSkin = getActiveSkin();

    // Активный скин — центрируем на нём
    const activeIdx = SKINS.findIndex(s => s.id === activeSkin);
    const totalW = SKINS.length * cellW;

    // Скролл-контейнер — видимая область = экран, содержимое шире
    // Начальный offset — центрируем на активном скине
    const centerOffset = W / 2 - (activeIdx >= 0 ? activeIdx : 0) * cellW - cellW / 2;
    this._skinScrollX = Phaser.Math.Clamp(centerOffset, W - totalW - 10, 10);

    // Фон полоса
    const bgStrip = this.add.graphics().setDepth(18);
    bgStrip.fillStyle(BG_DARK_NEON, 0.90);
    bgStrip.fillRect(0, y - 35, W, 70);
    bgStrip.lineStyle(1, NEON_CYAN, 0.15);
    bgStrip.lineBetween(0, y - 35, W, y - 35);
    this.skinSelectorElements.push(bgStrip);

    // Свайп-зона для drag-скролла
    if (totalW > W) {
      const dragZone = this.add.zone(W / 2, y, W, 70)
        .setInteractive({ draggable: true }).setDepth(17);
      this._isDragging = false;
      this._dragStartX = 0;

      // Phaser требует scene-level drag listener
      this.input.on('dragstart', () => {});

      dragZone.on('dragstart', (pointer) => {
        this._isDragging = false;
        this._dragStartX = pointer.x;
        // Остановить инерционный tween если есть
        if (this._inertiaTween) {
          this._inertiaTween.stop();
          this._inertiaTween = null;
        }
      });

      dragZone.on('drag', (pointer) => {
        const dx = pointer.x - this._dragStartX;
        if (Math.abs(dx) > 10) this._isDragging = true;

        this._skinScrollX = Phaser.Math.Clamp(
          this._skinScrollX + (pointer.x - this._dragStartX) * 0.5,
          W - totalW - 10,
          10
        );
        this._dragStartX = pointer.x;
        this._repositionSkins();
      });

      dragZone.on('dragend', (pointer) => {
        // Инерция свайпа
        const vx = pointer.velocity ? pointer.velocity.x : 0;
        if (Math.abs(vx) > 50 && this._isDragging) {
          const target = Phaser.Math.Clamp(
            this._skinScrollX + vx * 0.3,
            W - totalW - 10,
            10
          );
          this._inertiaTween = this.tweens.add({
            targets: { val: this._skinScrollX },
            val: target,
            duration: 300,
            ease: 'Cubic.easeOut',
            onUpdate: (_tween, obj) => {
              this._skinScrollX = obj.val;
              this._repositionSkins();
            },
          });
        }
      });

      this.skinSelectorElements.push(dragZone);
    }

    // Массив скин-элементов для скролла
    this._skinItems = [];

    for (let i = 0; i < SKINS.length; i++) {
      const skin = SKINS[i];
      const x = this._skinScrollX + i * cellW + cellW / 2;
      const unlocked = isSkinUnlocked(skin.id);
      const isActive = skin.id === activeSkin;

      // Миниатюра скина
      const container = this.add.container(x, y).setDepth(19);
      const gfx = this.add.graphics();
      drawSkinPose(gfx, i, 0);
      container.add(gfx);
      container.setScale(0.65);

      if (!unlocked) {
        container.setAlpha(0.2);
      }

      // Рамка активного
      let frame = null;
      if (isActive) {
        frame = this.add.graphics().setDepth(18);
        frame.lineStyle(1.5, NEON_CYAN, 0.6);
        frame.strokeRoundedRect(x - 20, y - 26, 40, 52, 6);
        this.skinSelectorElements.push(frame);
      }

      // Зона клика — тултип только если не было свайпа
      const zone = this.add.zone(x, y, 40, 52).setInteractive().setDepth(20);
      zone.on('pointerup', () => {
        if (!this._isDragging) {
          this._showSkinTooltip(i, x, y);
        }
      });

      this._skinItems.push({ container, zone, frame, index: i });
      this.skinSelectorElements.push(container, zone);
    }

    // Подсказка — свайп для навигации
    const hint = this.add.text(W / 2, y + 30, '← swipe to browse →', {
      fontSize: '10px', fontFamily: "'Inter', sans-serif",
      color: '#4A5580',
    }).setOrigin(0.5).setDepth(18);
    this.skinSelectorElements.push(hint);
  }

  // Перепозиционировать скины при скролле
  _repositionSkins() {
    if (!this._skinItems) return;
    const cellW = 56;
    const y = this.H * 0.90;
    for (const item of this._skinItems) {
      const x = this._skinScrollX + item.index * cellW + cellW / 2;
      item.container.setX(x);
      item.zone.setX(x);
      if (item.frame) {
        item.frame.clear();
        item.frame.lineStyle(1.5, 0x00F5D4, 0.6);
        item.frame.strokeRoundedRect(x - 20, y - 26, 40, 52, 6);
      }
    }
  }

  // Показать тултип-карточку скина по центру экрана
  _showSkinTooltip(skinIndex, x, y) {
    // Убрать предыдущий тултип
    this._hideSkinTooltip();

    const skin = SKINS[skinIndex];
    if (!skin) return;

    const W = this.W;
    const H = this.H;
    const lang = getLang();

    this._tooltipElements = [];

    // Затемнение фона
    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x0A0E1A, 0.7)
      .setDepth(30).setInteractive();
    overlay.on('pointerdown', () => this._hideSkinTooltip());
    this._tooltipElements.push(overlay);

    // Карточка тултипа — по центру экрана
    const cardW = 260;
    const cardH = 220;
    const cx = W / 2;
    const cy = H / 2;

    const card = this.add.graphics().setDepth(31);
    // Фон карточки — тёмное стекло
    card.fillStyle(0x0E1225, 0.95);
    card.fillRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
    // Рамка — цвет скина
    card.lineStyle(1.5, skin.outline, 0.5);
    card.strokeRoundedRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH, 12);
    this._tooltipElements.push(card);

    // Скин крупно по центру
    const skinContainer = this.add.container(cx, cy - 40).setDepth(32).setScale(2);
    const skinGfx = this.add.graphics();
    drawSkinPose(skinGfx, skinIndex, 0);
    skinContainer.add(skinGfx);
    this._tooltipElements.push(skinContainer);

    // Имя скина
    const name = skin.name[lang] || skin.name.en;
    const nameText = this.add.text(cx, cy + 30, name, {
      fontSize: '18px', fontFamily: NEON_FONT, fontStyle: 'bold',
      color: '#' + skin.outline.toString(16).padStart(6, '0'),
    }).setOrigin(0.5).setDepth(32);
    this._tooltipElements.push(nameText);

    // Условие получения
    const unlocked = isSkinUnlocked(skin.id);
    let conditionText;
    if (unlocked) {
      conditionText = t('skin_equipped');
    } else if (skin.week === 0) {
      conditionText = 'FREE';
    } else {
      conditionText = `Week ${skin.week} ${t('challenge_title')}`;
    }

    const condText = this.add.text(cx, cy + 55, conditionText, {
      fontSize: '12px', fontFamily: NEON_FONT,
      color: unlocked ? NEON_CYAN_STR : '#4A5580',
    }).setOrigin(0.5).setDepth(32);
    this._tooltipElements.push(condText);

    // Кнопка EQUIP или LOCKED
    if (unlocked && skin.id !== getActiveSkin()) {
      const equipText = this.add.text(cx, cy + 85, t('skin_equip'), {
        fontSize: '14px', fontFamily: NEON_FONT, fontStyle: 'bold',
        color: NEON_AMBER_STR, backgroundColor: 'rgba(255,184,0,0.1)',
        padding: { x: 20, y: 8 },
      }).setOrigin(0.5).setDepth(32).setInteractive({ useHandCursor: true });

      equipText.on('pointerdown', () => {
        setActiveSkin(skin.id);
        // Обновить охотника в меню
        if (this.menuHunter) {
          const gfx = this.menuHunter.list[0];
          if (gfx) { gfx.clear(); drawSkinPose(gfx, skinIndex, 0); }
        }
        this._hideSkinTooltip();
        // Пересоздать селектор для обновления рамки
        if (this.skinSelectorOpen) {
          this._toggleSkinSelector();
          this._toggleSkinSelector();
        }
      });
      this._tooltipElements.push(equipText);
    } else if (!unlocked) {
      const lockText = this.add.text(cx, cy + 85, `🔒 ${t('skin_locked')}`, {
        fontSize: '14px', fontFamily: NEON_FONT,
        color: NEON_PINK_STR,
      }).setOrigin(0.5).setDepth(32);
      this._tooltipElements.push(lockText);
    }
  }

  // Скрыть тултип скина
  _hideSkinTooltip() {
    if (this._tooltipElements) {
      for (const el of this._tooltipElements) {
        if (el && el.destroy) el.destroy();
      }
      this._tooltipElements = [];
    }
  }

  shutdown() {
    // Очистка тултипа скинов
    this._hideSkinTooltip();
    // Очистка селектора скинов
    for (const el of this.skinSelectorElements || []) {
      if (el && el.destroy) el.destroy();
    }
    // Остановить инерционный tween свайпа
    if (this._inertiaTween) {
      this._inertiaTween.stop();
      this._inertiaTween = null;
    }
    if (this._konamiHandler) {
      this.input.keyboard.off('keydown', this._konamiHandler);
    }
  }

  checkKonami(event) {
    if (this.konamiTriggered) return;
    const keyMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    const key = keyMap[event.key];
    if (!key) { this.konamiIndex = 0; return; }
    if (key === this.konamiSequence[this.konamiIndex]) {
      this.konamiIndex++;
      if (this.konamiIndex >= this.konamiSequence.length) {
        this.konamiTriggered = true;
        this.triggerKonami();
      }
    } else {
      this.konamiIndex = key === this.konamiSequence[0] ? 1 : 0;
    }
  }

  triggerKonami() {
    playOminous();
    // Konami текст — neon pink
    const txt = this.add.text(this.W / 2, this.H / 2, t('butcher'), {
      fontSize: '28px', fontFamily: NEON_FONT, fontStyle: 'bold',
      color: NEON_PINK_STR, stroke: BG_DARK_NEON_STR, strokeThickness: 5, align: 'center',
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    this.tweens.add({
      targets: txt, alpha: 1, scale: { from: 0.5, to: 1.1 },
      duration: 600, ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(2000, () => {
          this.tweens.add({ targets: txt, alpha: 0, duration: 500 });
        });
      },
    });

    if (this.menuHunter) {
      let flashes = 0;
      this.time.addEvent({
        delay: 300, repeat: 5,
        callback: () => { flashes++; this.menuHunter.setAlpha(flashes % 2 === 0 ? 1 : 0.3); },
      });
    }
    this.cameras.main.shake(200, 0.01);
  }

  drawTreeSilhouettes(gfx, baseY, alpha, width) {
    // Очень тёмные силуэты деревьев
    gfx.fillStyle(0x0E1225, alpha);
    for (let tx = 20; tx < width; tx += 50 + Math.random() * 30) {
      const h = 80 + Math.random() * 160;
      const w = 6 + Math.random() * 8;
      gfx.fillRect(tx - w / 2, baseY - h, w, h);
      for (let b = 0; b < 2 + Math.floor(Math.random() * 3); b++) {
        const by = baseY - h * (0.3 + Math.random() * 0.5);
        const bLen = 15 + Math.random() * 30;
        const dir = Math.random() > 0.5 ? 1 : -1;
        gfx.fillRect(tx, by, bLen * dir, 2);
      }
    }
  }

  createSwingingHunter() {
    const anchorX = this.W / 2;
    const anchorY = this.H * 0.35;
    const ropeLen = 120;

    this.menuHookGfx = this.add.graphics().setDepth(5);
    this.menuHunter = this.add.container(anchorX, anchorY + ropeLen).setDepth(6);
    const g = this.add.graphics();
    this.drawHunterGraphics(g);
    this.menuHunter.add(g);
    this.menuRope = this.add.graphics().setDepth(4);
    this.menuSwing = { angle: Math.PI / 2, speed: 0.8, anchorX, anchorY, ropeLen };
  }

  drawHunterGraphics(g) {
    // Рисуем активный скин из SkinRenderer
    const skinIdx = SKINS.findIndex(s => s.id === getActiveSkin());
    drawSkinPose(g, skinIdx >= 0 ? skinIdx : 0, 0);
  }

  drawMenuHook(x, y) {
    this.menuHookGfx.clear();
    const g = this.menuHookGfx;
    // Крюк — neon cyan
    g.lineStyle(3, NEON_CYAN, 0.6);
    g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x, y - 4); g.strokePath();
    g.lineStyle(3, NEON_CYAN, 0.5);
    g.beginPath(); g.arc(x + 6, y - 4, 6, Math.PI, 0, true); g.strokePath();
    g.beginPath(); g.arc(x - 4, y + 8, 5, 0, Math.PI, true); g.strokePath();
    g.fillStyle(NEON_CYAN, 0.7);
    g.fillTriangle(x - 9, y + 8, x - 8, y + 14, x - 5, y + 8);
  }

  update(time, delta) {
    if (!this.menuSwing) return;
    const W = this.W;
    const H = this.H;
    const s = this.menuSwing;
    const dt = delta / 1000;

    const angularAccel = (400 / s.ropeLen) * Math.cos(s.angle);
    s.speed += angularAccel * dt;
    s.speed *= 0.998;
    s.angle += s.speed * dt;

    const px = s.anchorX + Math.cos(s.angle) * s.ropeLen;
    const py = s.anchorY + Math.sin(s.angle) * s.ropeLen;

    this.menuHunter.setPosition(px, py);
    this.menuHunter.setRotation((s.angle - Math.PI / 2) * 0.35);
    this.drawMenuHook(s.anchorX, s.anchorY);

    // Верёвка — neon cyan
    this.menuRope.clear();
    const midX = (s.anchorX + px) / 2;
    const midY = (s.anchorY + py) / 2;
    const cpX = midX + (py - s.anchorY) * 0.06;
    const cpY = midY + s.ropeLen * 0.06;
    this.menuRope.lineStyle(2.5, NEON_CYAN, 0.5);
    this.menuRope.beginPath();
    this.menuRope.moveTo(s.anchorX, s.anchorY);
    for (let i = 1; i <= 16; i++) {
      const tt = i / 16; const it = 1 - tt;
      this.menuRope.lineTo(
        it * it * s.anchorX + 2 * it * tt * cpX + tt * tt * px,
        it * it * s.anchorY + 2 * it * tt * cpY + tt * tt * py
      );
    }
    this.menuRope.strokePath();

    // Неоновые искры — яркие
    this.ashGfx.clear();
    for (const p of this.ashParticles) {
      p.y += p.speed * dt;
      p.x += p.drift * dt;
      // Вверх или вниз в зависимости от направления
      if (p.speed > 0 && p.y > H + 5) { p.y = -5; p.x = Phaser.Math.Between(0, W); }
      if (p.speed < 0 && p.y < -5) { p.y = H + 5; p.x = Phaser.Math.Between(0, W); }
      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;
      this.ashGfx.fillStyle(p.color, p.alpha);
      this.ashGfx.fillCircle(p.x, p.y, p.size);
    }
  }
}
