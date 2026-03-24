import Phaser from 'phaser';
import { getBest, getMoon } from '../storage.js';
import { playOminous } from '../audio.js';
import { t, getLang, setLang } from '../i18n.js';
import {
  drawOrnamentalButton, drawRopeDecoration, drawWantedPosterFrame,
  createTypewriterText, createEmberBurst,
} from '../managers/UIFactory.js';
import {
  LEATHER_DARK, LEATHER_LIGHT, BRASS_HEX,
  GOLD, GOLD_HEX, FONT,
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

    // --- Фон ---
    if (this.textures.exists('menu-bg')) this.textures.remove('menu-bg');
    const gradTex = this.textures.createCanvas('menu-bg', 1, H);
    const ctx = gradTex.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#0f0a04');
    grad.addColorStop(0.4, '#1a0e06');
    grad.addColorStop(0.8, '#2d1a0a');
    grad.addColorStop(1, '#1a0e06');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1, H);
    gradTex.refresh();
    this.add.image(W / 2, H / 2, 'menu-bg').setDisplaySize(W, H).setDepth(-10);

    // Луна
    const moon = this.add.graphics().setDepth(-8);
    moon.fillStyle(0x555544, 0.18);
    moon.fillCircle(W * 0.75, H * 0.12, 60);
    moon.fillStyle(0x666655, 0.12);
    moon.fillCircle(W * 0.75 - 8, H * 0.12 - 5, 55);
    moon.fillStyle(0x444433, 0.08);
    moon.fillCircle(W * 0.75 + 15, H * 0.12 - 15, 12);
    moon.fillCircle(W * 0.75 - 20, H * 0.12 + 10, 8);

    // Пепел
    this.ashParticles = [];
    for (let i = 0; i < 50; i++) {
      this.ashParticles.push({
        x: Phaser.Math.Between(0, W),
        y: Phaser.Math.Between(0, H),
        size: 0.5 + Math.random() * 1.5,
        speed: 8 + Math.random() * 15,
        drift: (Math.random() - 0.5) * 10,
        alpha: 0.15 + Math.random() * 0.35,
      });
    }
    this.ashGfx = this.add.graphics().setDepth(-4);

    // Деревья
    const trees = this.add.graphics().setDepth(-6);
    this.drawTreeSilhouettes(trees, H - 100, 0.2, W);

    // Туман
    const fog = this.add.graphics().setDepth(-3);
    fog.fillStyle(0x281405, 0.25);
    fog.fillRect(0, H - 150, W, 150);
    fog.fillStyle(0x281405, 0.12);
    fog.fillRect(0, H - 250, W, 100);

    // Охотник на крюке
    this.createSwingingHunter();

    // --- Заголовок ---
    const titleY = H * 0.19;
    const glowColors = [0x8B4513, 0x6B3410, 0x4B2408];
    for (let i = glowColors.length - 1; i >= 0; i--) {
      const glow = this.add.text(W / 2, titleY, 'THE HOOK', {
        fontSize: '52px', fontFamily: FONT, fontStyle: 'bold',
        color: '#' + glowColors[i].toString(16).padStart(6, '0'),
        stroke: '#' + glowColors[i].toString(16).padStart(6, '0'),
        strokeThickness: 14 + i * 6,
      }).setOrigin(0.5).setAlpha(0).setDepth(10);
      this.tweens.add({
        targets: glow, alpha: 0.12 + i * 0.06,
        duration: 1800 + i * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        delay: 400,
      });
    }

    const title = this.add.text(W / 2, titleY + 20, 'THE HOOK', {
      fontSize: '52px', fontFamily: FONT, fontStyle: 'bold',
      color: GOLD, stroke: '#1a0e06', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    this.tweens.add({
      targets: title, y: titleY - 5, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      delay: 500,
    });

    // Stagger: заголовок 0ms
    this._addStaggerEntry(title, titleY, 0);

    // --- Трещина под заголовком ---
    const crackGfx = this.add.graphics().setDepth(11).setAlpha(0);
    crackGfx.lineStyle(1.5, GOLD_HEX, 0.3);
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

    // --- Верёвочные украшения у подзаголовка ---
    const subtitleY = titleY + 48;
    const ropeGfx = this.add.graphics().setDepth(11).setAlpha(0);
    drawRopeDecoration(ropeGfx, W * 0.2, subtitleY, W * 0.38, subtitleY);
    drawRopeDecoration(ropeGfx, W * 0.62, subtitleY, W * 0.8, subtitleY);
    this._addStaggerFade(ropeGfx, 200);

    // --- Подзаголовок — typewriter ---
    const subtitleText = createTypewriterText(this, W / 2, subtitleY, t('title_sub'), {
      fontSize: '14px', fontFamily: FONT, fontStyle: 'italic', color: '#7B6040',
    }, 50);
    subtitleText.setDepth(11).setAlpha(0);
    this._addStaggerEntry(subtitleText, subtitleY, 200);

    // Stagger: охотник 300ms (контейнер menuHunter)
    if (this.menuHunter) {
      this.menuHunter.setAlpha(0);
      this._addStaggerEntry(this.menuHunter, this.menuHunter.y, 300);
    }

    // --- Кнопка CLIMB (ornamental) ---
    const btnY = H * 0.66;
    const btnW = 220;
    const btnH = 60;

    // Glow пульсация вокруг кнопки
    const btnGlow = this.add.rectangle(W / 2, btnY, btnW + 16, btnH + 16, 0x8B4513, 0.1).setDepth(12);
    this.tweens.add({
      targets: btnGlow, alpha: 0.2, scaleX: 1.04, scaleY: 1.04,
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Graphics для ornamental кнопки
    const btnGfx = this.add.graphics().setDepth(13);
    drawOrnamentalButton(btnGfx, W / 2, btnY, btnW, btnH);

    // Текст кнопки
    const btnText = this.add.text(W / 2, btnY, t('play'), {
      fontSize: '28px', fontFamily: FONT, fontStyle: 'bold',
      color: GOLD, stroke: '#1a0e06', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(14).setAlpha(0);

    // Невидимая зона для интерактива
    const btnZone = this.add.zone(W / 2, btnY, btnW, btnH).setInteractive({ useHandCursor: true }).setDepth(15);

    btnZone.on('pointerover', () => {
      drawOrnamentalButton(btnGfx, W / 2, btnY, btnW, btnH, {
        fillTop: 0x3D2010, fillBot: 0x5B2A00,
      });
      btnText.setScale(1.05);
    });

    btnZone.on('pointerout', () => {
      drawOrnamentalButton(btnGfx, W / 2, btnY, btnW, btnH);
      btnText.setScale(1);
    });

    btnZone.on('pointerdown', () => {
      drawOrnamentalButton(btnGfx, W / 2, btnY, btnW, btnH, {
        pressed: true, fillTop: 0x1a0a00, fillBot: 0x2A1508,
      });
      btnText.setY(btnY + 2);
      createEmberBurst(this, W / 2, btnY, 6);
    });

    btnZone.on('pointerup', () => {
      drawOrnamentalButton(btnGfx, W / 2, btnY, btnW, btnH);
      btnText.setY(btnY);
      // Запуск игры
      createEmberBurst(this, W / 2, btnY, 20);
      this.cameras.main.fadeOut(400, 26, 14, 6);
      this.time.delayedCall(400, () => this.scene.start('GameScene'));
    });

    // Stagger: кнопка 500ms (Graphics не двигаем по Y — рисунок в абсолютных координатах)
    btnGlow.setAlpha(0);
    btnGfx.setAlpha(0);
    this._addStaggerFade(btnGlow, 500);
    this._addStaggerFade(btnGfx, 500);
    this._addStaggerEntry(btnText, btnY, 500);

    // --- Рекорд ---
    const best = getBest();
    const recordY = H * 0.75;
    if (best > 0) {
      // Wanted poster рамка
      const posterGfx = this.add.graphics().setDepth(10).setAlpha(0);
      drawWantedPosterFrame(posterGfx, W / 2, recordY, 200, 50);

      // Верёвки сверху и снизу постера
      const ropeRecordGfx = this.add.graphics().setDepth(10).setAlpha(0);
      drawRopeDecoration(ropeRecordGfx, W / 2 - 100, recordY - 28, W / 2 + 100, recordY - 28);
      drawRopeDecoration(ropeRecordGfx, W / 2 - 100, recordY + 28, W / 2 + 100, recordY + 28);

      const recordText = this.add.text(W / 2, recordY, `${t('record')}: ${best}${t('unit_m')}`, {
        fontSize: '18px', fontFamily: FONT, color: GOLD,
        stroke: '#1a0e06', strokeThickness: 2,
      }).setOrigin(0.5).setDepth(11).setAlpha(0);

      // Stagger: рекорд 700ms
      this._addStaggerFade(posterGfx, 700);
      this._addStaggerFade(ropeRecordGfx, 700);
      this._addStaggerEntry(recordText, recordY, 700);
    }

    if (getMoon()) {
      const moonText = this.add.text(W / 2, H * 0.78, t('moon_reached'), {
        fontSize: '12px', fontFamily: FONT, fontStyle: 'italic', color: '#666655',
      }).setOrigin(0.5).setDepth(11).setAlpha(0);
      this._addStaggerEntry(moonText, H * 0.78, 700);
    }

    // --- Подсказка внизу ---
    const hintText = this.add.text(W / 2, H - 20, t('tap_to_hunt'), {
      fontSize: '14px', fontFamily: FONT, fontStyle: 'italic', color: '#7B6040',
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    // Пульсация подсказки
    this.tweens.add({
      targets: hintText, alpha: { from: 0.4, to: 0.8 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      delay: 800,
    });
    this._addStaggerEntry(hintText, H - 20, 800);

    // --- Переключатель языка (ornamental button) ---
    const langX = W - 44;
    // Safe area для iPhone Dynamic Island / notch
    const envTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0', 10);
    const langY = Math.max(envTop, 10) + 16;
    const langGfx = this.add.graphics().setDepth(15);
    drawOrnamentalButton(langGfx, langX, langY, 50, 28);

    const langText = this.add.text(langX, langY, getLang() === 'ru' ? 'EN' : 'RU', {
      fontSize: '16px', fontFamily: FONT, fontStyle: 'bold', color: GOLD,
    }).setOrigin(0.5).setDepth(16);

    const langZone = this.add.zone(langX, langY, 50, 28).setInteractive({ useHandCursor: true }).setDepth(17);

    langZone.on('pointerover', () => {
      drawOrnamentalButton(langGfx, langX, langY, 50, 28, {
        fillTop: 0x3D2010, fillBot: 0x5B2A00,
      });
    });
    langZone.on('pointerout', () => {
      drawOrnamentalButton(langGfx, langX, langY, 50, 28);
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
    this.input.keyboard.on('keydown', (event) => this.checkKonami(event));

    // --- Stagger entry анимация (вместо fadeIn) ---
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
        // Только alpha — для Graphics с абсолютными координатами
        this.tweens.add({
          targets: target, alpha: 1, duration: 400, delay, ease: 'Cubic.easeOut',
        });
      } else {
        // Alpha + Y-движение
        if (target.setY) target.setY(finalY + 20);
        this.tweens.add({
          targets: target, alpha: 1, y: finalY, duration: 400, delay, ease: 'Cubic.easeOut',
        });
      }
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
      color: GOLD, stroke: '#3B1A00', strokeThickness: 5, align: 'center',
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
    gfx.fillStyle(0x150e05, alpha);
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
    g.lineStyle(1.5, GOLD_HEX, 0.4);
    g.strokeRoundedRect(-9, -21, 18, 46, 3);
    g.fillStyle(0x3d2010);
    g.fillTriangle(-10, 10, -14, 24, -4, 24);
    g.fillTriangle(10, 10, 14, 24, 4, 24);
    g.fillStyle(0x3d2010);
    g.fillRoundedRect(-8, -2, 16, 18, 2);
    g.fillStyle(0x7A4A1E);
    g.fillRect(-8, 8, 16, 2);
    g.fillStyle(GOLD_HEX, 0.7);
    g.fillRect(-2, 7, 4, 4);
    g.fillStyle(GOLD_HEX, 0.8);
    g.fillEllipse(0, -12, 28, 7);
    g.fillStyle(0x3d2010);
    g.fillRoundedRect(-7, -21, 14, 11, 2);
    g.fillStyle(GOLD_HEX);
    g.fillRect(-7, -13, 14, 2);
    g.fillStyle(0xF0DDB0);
    g.fillRect(-4, -10, 8, 5);
    g.fillStyle(0x1a0e06);
    g.fillCircle(-2, -8, 1);
    g.fillCircle(2, -8, 1);
    g.fillStyle(0x3d2010);
    g.fillRect(-12, 0, 4, 11);
    g.fillRect(8, 0, 4, 11);
    g.fillStyle(0x2a1a0a);
    g.fillRect(-6, 16, 5, 8);
    g.fillRect(1, 16, 5, 8);
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

    this.ashGfx.clear();
    for (const p of this.ashParticles) {
      p.y += p.speed * dt;
      p.x += p.drift * dt;
      if (p.y > H + 5) { p.y = -5; p.x = Phaser.Math.Between(0, W); }
      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;
      this.ashGfx.fillStyle(GOLD_HEX, p.alpha * 0.5);
      this.ashGfx.fillCircle(p.x, p.y, p.size);
    }
  }
}
