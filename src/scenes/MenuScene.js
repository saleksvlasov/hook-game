import Phaser from 'phaser';
import { getBest, getMoon } from '../storage.js';
import { playOminous } from '../audio.js';
import { t, getLang, setLang } from '../i18n.js';
import {
  drawGlassButton, drawChip,
  createTypewriterText, createEmberBurst,
} from '../managers/UIFactory.js';
import {
  GOLD, GOLD_HEX, FONT, AMBER_GLOW, EMBER_HEX,
  BG_DARK, BG_DARK_HEX, STEEL_LIGHT,
} from '../constants.js';

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

    // --- Фон: PREMIUM navy-slate градиент (тёплый, глубокий) ---
    if (this.textures.exists('menu-bg')) this.textures.remove('menu-bg');
    const gradTex = this.textures.createCanvas('menu-bg', 1, H);
    const ctx = gradTex.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#141822');    // глубокий navy (верх)
    grad.addColorStop(0.3, '#1A2030');  // navy-slate
    grad.addColorStop(0.6, '#222A3A');  // slate mid
    grad.addColorStop(0.85, '#2A3245'); // светлее к низу
    grad.addColorStop(1, '#1E2638');    // обратно к navy
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1, H);
    gradTex.refresh();
    this.add.image(W / 2, H / 2, 'menu-bg').setDisplaySize(W, H).setDepth(-10);

    // Луна — premium glow, заметная на navy фоне
    const moon = this.add.graphics().setDepth(-8);
    // Внешнее свечение
    moon.fillStyle(0x8899AA, 0.10);
    moon.fillCircle(W * 0.75, H * 0.12, 80);
    // Основной диск
    moon.fillStyle(0x7A8DA0, 0.30);
    moon.fillCircle(W * 0.75, H * 0.12, 60);
    // Светлая часть
    moon.fillStyle(0x8EA0B5, 0.20);
    moon.fillCircle(W * 0.75 - 8, H * 0.12 - 5, 55);
    // Кратеры
    moon.fillStyle(0x5A6A7A, 0.12);
    moon.fillCircle(W * 0.75 + 15, H * 0.12 - 15, 12);
    moon.fillCircle(W * 0.75 - 20, H * 0.12 + 10, 8);

    // Пепел + тлеющие угольки — ЯРКИЕ
    this.ashParticles = [];
    for (let i = 0; i < 50; i++) {
      const isEmber = Math.random() < 0.5; // 50% amber, 50% ember
      this.ashParticles.push({
        x: Phaser.Math.Between(0, W),
        y: Phaser.Math.Between(0, H),
        size: 1 + Math.random() * 1.5,     // 1–2.5px
        speed: isEmber ? -(8 + Math.random() * 15) : (8 + Math.random() * 15),
        drift: (Math.random() - 0.5) * 10,
        alpha: 0.3 + Math.random() * 0.3,  // 0.3–0.6 (ярче!)
        color: isEmber ? AMBER_GLOW : EMBER_HEX,
      });
    }
    this.ashGfx = this.add.graphics().setDepth(-4);

    // Деревья — сине-серые, заметнее
    const trees = this.add.graphics().setDepth(-6);
    this.drawTreeSilhouettes(trees, H - 100, 0.35, W);

    // Туман — тёплый navy с лёгким amber оттенком
    const fog = this.add.graphics().setDepth(-3);
    fog.fillStyle(0x1E2638, 0.30);
    fog.fillRect(0, H - 150, W, 150);
    fog.fillStyle(0x222A3A, 0.18);
    fog.fillRect(0, H - 250, W, 100);

    // Охотник на крюке
    this.createSwingingHunter();

    // --- Заголовок — КРУПНЫЙ, BOLD, premium amber ---
    const titleY = H * 0.19;
    // Glow stack — тёплый amber, 3 слоя свечения
    const glowColors = [0xF5B842, 0xD49828, 0xA07018];
    for (let i = glowColors.length - 1; i >= 0; i--) {
      const glow = this.add.text(W / 2, titleY, 'THE HOOK', {
        fontSize: '60px', fontFamily: FONT, fontStyle: 'bold',
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
      fontSize: '60px', fontFamily: FONT, fontStyle: 'bold',
      color: GOLD, stroke: '#101520', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    this.tweens.add({
      targets: title, y: titleY - 5, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      delay: 500,
    });

    // Stagger: заголовок 0ms
    this._addStaggerEntry(title, titleY, 0);

    // --- Трещина под заголовком — тёплый amber ---
    const crackGfx = this.add.graphics().setDepth(11).setAlpha(0);
    crackGfx.lineStyle(1.5, AMBER_GLOW, 0.45);
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

    // --- Подзаголовок ---
    const subtitleY = titleY + 54;

    // --- Подзаголовок — typewriter, крупнее ---
    const subtitleText = createTypewriterText(this, W / 2, subtitleY, t('title_sub'), {
      fontSize: '16px', fontFamily: FONT, fontStyle: 'italic', color: '#B8A070',
    }, 50);
    subtitleText.setDepth(11).setAlpha(0);
    this._addStaggerEntry(subtitleText, subtitleY, 200);

    // Stagger: охотник 300ms (контейнер menuHunter)
    if (this.menuHunter) {
      this.menuHunter.setAlpha(0);
      this._addStaggerEntry(this.menuHunter, this.menuHunter.y, 300);
    }

    // --- Кнопка CLIMB — крупная premium glassmorphism ---
    const btnY = H * 0.66;
    const btnW = 250;
    const btnH = 64;

    // Glow пульсация вокруг кнопки — тёплый amber
    const btnGlow = this.add.rectangle(W / 2, btnY, btnW + 20, btnH + 20, AMBER_GLOW, 0.12).setDepth(12);
    this.tweens.add({
      targets: btnGlow, alpha: 0.24, scaleX: 1.05, scaleY: 1.05,
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Graphics для glass кнопки
    const btnGfx = this.add.graphics().setDepth(13);
    drawGlassButton(btnGfx, W / 2, btnY, btnW, btnH);

    // Текст кнопки — крупный, яркий
    const btnText = this.add.text(W / 2, btnY, t('play'), {
      fontSize: '32px', fontFamily: FONT, fontStyle: 'bold',
      color: GOLD, stroke: '#101520', strokeThickness: 4,
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
      // Запуск игры — fadeOut в navy
      createEmberBurst(this, W / 2, btnY, 20);
      this.cameras.main.fadeOut(400, 20, 24, 34);
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
      // MUI steel frame рамка
      // MUI Chip для рекорда
      const chipGfx = this.add.graphics().setDepth(10).setAlpha(0);
      drawChip(chipGfx, W / 2, recordY, 200, 36);

      const recordText = this.add.text(W / 2, recordY, `${t('record')}: ${best}${t('unit_m')}`, {
        fontSize: '16px', fontFamily: FONT, fontStyle: 'bold', color: GOLD,
      }).setOrigin(0.5).setDepth(11).setAlpha(0);

      // Stagger: рекорд 700ms
      this._addStaggerFade(chipGfx, 700);
      this._addStaggerEntry(recordText, recordY, 700);
    }

    if (getMoon()) {
      const moonText = this.add.text(W / 2, H * 0.78, t('moon_reached'), {
        fontSize: '12px', fontFamily: FONT, fontStyle: 'italic', color: '#556677',
      }).setOrigin(0.5).setDepth(11).setAlpha(0);
      this._addStaggerEntry(moonText, H * 0.78, 700);
    }

    // --- Подсказка внизу — ярче, крупнее ---
    const hintText = this.add.text(W / 2, H - 24, t('tap_to_hunt'), {
      fontSize: '15px', fontFamily: FONT, fontStyle: 'italic', color: '#B8A070',
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    // Пульсация подсказки 0.45 → 0.85
    this.tweens.add({
      targets: hintText, alpha: { from: 0.45, to: 0.85 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      delay: 800,
    });
    this._addStaggerEntry(hintText, H - 20, 800);

    // --- Переключатель языка (MUI glass button) ---
    const langX = W - 44;
    // Safe area для iPhone Dynamic Island / notch
    const envTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0', 10);
    const langY = Math.max(envTop, 10) + 16;
    const langGfx = this.add.graphics().setDepth(15);
    drawGlassButton(langGfx, langX, langY, 46, 26);

    const langText = this.add.text(langX, langY, getLang() === 'ru' ? 'EN' : 'RU', {
      fontSize: '16px', fontFamily: FONT, fontStyle: 'bold', color: GOLD,
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

  shutdown() {
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
    const txt = this.add.text(this.W / 2, this.H / 2, t('butcher'), {
      fontSize: '28px', fontFamily: FONT, fontStyle: 'bold',
      color: GOLD, stroke: '#101520', strokeThickness: 5, align: 'center',
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
    // Navy-slate деревья — силуэты на тёмном фоне
    gfx.fillStyle(0x1A2030, alpha);
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
    // Контур — amber
    g.lineStyle(1.5, GOLD_HEX, 0.4);
    g.strokeRoundedRect(-9, -21, 18, 46, 3);
    // Ноги
    g.fillStyle(0x4A3525);
    g.fillTriangle(-10, 10, -14, 24, -4, 24);
    g.fillTriangle(10, 10, 14, 24, 4, 24);
    // Тело
    g.fillStyle(0x4A3525);
    g.fillRoundedRect(-8, -2, 16, 18, 2);
    // Пояс
    g.fillStyle(0x8B5E3C);
    g.fillRect(-8, 8, 16, 2);
    // Пряжка
    g.fillStyle(GOLD_HEX, 0.7);
    g.fillRect(-2, 7, 4, 4);
    // Шляпа — поля
    g.fillStyle(GOLD_HEX, 0.8);
    g.fillEllipse(0, -12, 28, 7);
    // Голова
    g.fillStyle(0x4A3525);
    g.fillRoundedRect(-7, -21, 14, 11, 2);
    // Полоса шляпы
    g.fillStyle(GOLD_HEX);
    g.fillRect(-7, -13, 14, 2);
    // Лицо
    g.fillStyle(0xF0DDB0);
    g.fillRect(-4, -10, 8, 5);
    // Глаза — тёмная сталь
    g.fillStyle(0x0d0f12);
    g.fillCircle(-2, -8, 1);
    g.fillCircle(2, -8, 1);
    // Руки
    g.fillStyle(0x4A3525);
    g.fillRect(-12, 0, 4, 11);
    g.fillRect(8, 0, 4, 11);
    // Штаны
    g.fillStyle(0x2a1a0a);
    g.fillRect(-6, 16, 5, 8);
    g.fillRect(1, 16, 5, 8);
    // Ботинки
    g.fillStyle(0x3d2510);
    g.fillRect(-7, 22, 6, 4);
    g.fillRect(1, 22, 6, 4);
  }

  drawMenuHook(x, y) {
    this.menuHookGfx.clear();
    const g = this.menuHookGfx;
    g.lineStyle(3, GOLD_HEX, 0.6);
    g.beginPath(); g.moveTo(x, y - 14); g.lineTo(x, y - 4); g.strokePath();
    g.lineStyle(3, GOLD_HEX, 0.5);
    g.beginPath(); g.arc(x + 6, y - 4, 6, Math.PI, 0, true); g.strokePath();
    g.beginPath(); g.arc(x - 4, y + 8, 5, 0, Math.PI, true); g.strokePath();
    g.fillStyle(GOLD_HEX, 0.7);
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

    // Верёвка — GOLD с альфой 0.5
    this.menuRope.clear();
    const midX = (s.anchorX + px) / 2;
    const midY = (s.anchorY + py) / 2;
    const cpX = midX + (py - s.anchorY) * 0.06;
    const cpY = midY + s.ropeLen * 0.06;
    this.menuRope.lineStyle(2.5, GOLD_HEX, 0.5);
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

    // Пепел + угольки — яркие
    this.ashGfx.clear();
    for (const p of this.ashParticles) {
      p.y += p.speed * dt;
      p.x += p.drift * dt;
      // Пепел (speed > 0) уходит вниз, угольки (speed < 0) — вверх
      if (p.speed > 0 && p.y > H + 5) { p.y = -5; p.x = Phaser.Math.Between(0, W); }
      if (p.speed < 0 && p.y < -5) { p.y = H + 5; p.x = Phaser.Math.Between(0, W); }
      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;
      this.ashGfx.fillStyle(p.color, p.alpha);
      this.ashGfx.fillCircle(p.x, p.y, p.size);
    }
  }
}
