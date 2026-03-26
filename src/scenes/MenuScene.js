import Phaser from 'phaser';
import { profile } from '../data/index.js';
import { playOminous } from '../audio.js';
import { t, getLang, setLang } from '../i18n.js';
import {
  drawGlassButton, drawChip,
  createTypewriterText, createEmberBurst,
} from '../managers/UIFactory.js';
import { FONT_MONO } from '../constants.js';
import { SkinCarousel } from '../managers/SkinCarousel.js';
import { MenuHunter } from '../managers/MenuHunter.js';
import { LeaderboardUI } from '../managers/LeaderboardUI.js';

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
    this._uiElements = [];

    // --- Фон: глубокий navy-black градиент ---
    if (this.textures.exists('menu-bg')) this.textures.remove('menu-bg');
    const gradTex = this.textures.createCanvas('menu-bg', 1, H);
    const ctx = gradTex.getContext();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#050810');
    grad.addColorStop(0.3, '#0A0E1A');
    grad.addColorStop(0.6, '#10152A');
    grad.addColorStop(1, '#0A0E1A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1, H);
    gradTex.refresh();
    this.add.image(W / 2, H / 2, 'menu-bg').setDisplaySize(W, H).setDepth(-10);

    // Луна
    const moon = this.add.graphics().setDepth(-8);
    moon.fillStyle(NEON_CYAN, 0.04); moon.fillCircle(W * 0.75, H * 0.12, 80);
    moon.fillStyle(STEEL_NEON, 0.30); moon.fillCircle(W * 0.75, H * 0.12, 60);
    moon.fillStyle(STEEL_NEON, 0.20); moon.fillCircle(W * 0.75 - 8, H * 0.12 - 5, 55);
    moon.fillStyle(0x2A3050, 0.12);
    moon.fillCircle(W * 0.75 + 15, H * 0.12 - 15, 12);
    moon.fillCircle(W * 0.75 - 20, H * 0.12 + 10, 8);

    // Неоновые искры
    this.ashParticles = [];
    for (let i = 0; i < 50; i++) {
      const isCyan = Math.random() < 0.5;
      this.ashParticles.push({
        x: Phaser.Math.Between(0, W), y: Phaser.Math.Between(0, H),
        size: 1 + Math.random() * 2,
        speed: isCyan ? -(8 + Math.random() * 15) : (8 + Math.random() * 15),
        drift: (Math.random() - 0.5) * 10,
        alpha: 0.4 + Math.random() * 0.3,
        color: isCyan ? NEON_CYAN : NEON_AMBER,
      });
    }
    this.ashGfx = this.add.graphics().setDepth(-4);

    // Деревья + туман
    const trees = this.add.graphics().setDepth(-6);
    this._drawTreeSilhouettes(trees, H - 100, 0.4, W);
    const fog = this.add.graphics().setDepth(-3);
    fog.fillStyle(BG_DARK_NEON, 0.30); fog.fillRect(0, H - 150, W, 150);
    fog.fillStyle(0x10152A, 0.18); fog.fillRect(0, H - 250, W, 100);

    // --- Охотник на крюке (делегация в MenuHunter) ---
    this.menuHunterObj = new MenuHunter(this);
    this.menuHunterObj.create();

    // --- Заголовок ---
    const titleY = H * 0.19;
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
        duration: 1800 + i * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 400,
      });
    }
    const title = this.add.text(W / 2, titleY + 20, 'THE HOOK', {
      fontSize: '60px', fontFamily: NEON_FONT, fontStyle: 'bold',
      color: NEON_AMBER_STR, stroke: BG_DARK_NEON_STR, strokeThickness: 7,
    }).setOrigin(0.5).setDepth(11).setAlpha(0);
    // Neon glow через setShadow — cyan свечение
    title.setShadow(0, 0, '#00F5D4', 6, true, true);
    this.tweens.add({
      targets: title, y: titleY - 5, duration: 2500, yoyo: true, repeat: -1,
      ease: 'Sine.easeInOut', delay: 500,
    });
    this._addStaggerEntry(title, titleY, 0);

    // Трещина под заголовком
    const crackGfx = this.add.graphics().setDepth(11).setAlpha(0);
    crackGfx.lineStyle(1.5, NEON_CYAN, 0.5);
    crackGfx.beginPath();
    const crackY = titleY + 35;
    const crackLeft = W * 0.25; const crackRight = W * 0.75;
    crackGfx.moveTo(crackLeft, crackY);
    for (let i = 1; i <= 20; i++) {
      crackGfx.lineTo(crackLeft + (crackRight - crackLeft) * (i / 20), crackY + (Math.random() - 0.5) * 4);
    }
    crackGfx.strokePath();
    this._addStaggerFade(crackGfx, 0);

    // Подзаголовок
    const subtitleY = titleY + 54;
    const subtitleText = createTypewriterText(this, W / 2, subtitleY, t('title_sub'), {
      fontSize: '16px', fontFamily: NEON_FONT, fontStyle: 'italic', color: NEON_CYAN_STR,
    }, 50);
    subtitleText.setDepth(11).setAlpha(0);
    this._addStaggerEntry(subtitleText, subtitleY, 200);

    // Stagger: охотник 300ms
    const hunterC = this.menuHunterObj.getContainer();
    if (hunterC) {
      hunterC.setAlpha(0);
      this._addStaggerEntry(hunterC, hunterC.y, 300);
    }

    // --- Кнопка CLIMB ---
    this._createClimbButton(W, H);

    // --- Рекорд ---
    const best = profile.bestScore;
    const recordY = H * 0.75;
    if (best > 0) {
      const chipGfx = this.add.graphics().setDepth(10).setAlpha(0);
      drawChip(chipGfx, W / 2, recordY, 200, 36);
      const recordText = this.add.text(W / 2, recordY, `${t('record')}: ${best}${t('unit_m')}`, {
        fontSize: '16px', fontFamily: FONT_MONO, fontStyle: 'bold', color: NEON_AMBER_STR,
      }).setOrigin(0.5).setDepth(11).setAlpha(0);
      // Cyan glow на числе рекорда
      recordText.setShadow(0, 0, '#00F5D4', 3, true, true);
      this._addStaggerFade(chipGfx, 700);
      this._addStaggerEntry(recordText, recordY, 700);
    }
    if (profile.moonReached) {
      const moonText = this.add.text(W / 2, H * 0.78, t('moon_reached'), {
        fontSize: '12px', fontFamily: NEON_FONT, fontStyle: 'italic', color: '#4A5580',
      }).setOrigin(0.5).setDepth(11).setAlpha(0);
      this._addStaggerEntry(moonText, H * 0.78, 700);
    }

    // --- Кнопка SKINS (делегация в SkinCarousel) ---
    this._skinCarousel = new SkinCarousel(this);
    const skinsY = H * 0.82;
    const skinsGfx = this.add.graphics().setDepth(15);
    drawGlassButton(skinsGfx, W / 2, skinsY, 120, 32);
    const skinsText = this.add.text(W / 2, skinsY, t('skins_title'), {
      fontSize: '14px', fontFamily: NEON_FONT, fontStyle: 'bold', color: NEON_CYAN_STR,
    }).setOrigin(0.5).setDepth(16).setAlpha(0);
    const skinsZone = this.add.zone(W / 2, skinsY, 160, 44)
      .setInteractive({ useHandCursor: true }).setDepth(17);
    skinsZone.on('pointerdown', () => this._skinCarousel.toggle());
    this._addStaggerFade(skinsGfx, 750);
    this._addStaggerEntry(skinsText, skinsY, 750);

    // --- Кнопка ТОП (лидерборд) — Phaser zone поверх glass button ---
    const topY = skinsY + 40;
    const topGfx = this.add.graphics().setDepth(15);
    drawGlassButton(topGfx, W / 2, topY, 120, 32);
    const topText = this.add.text(W / 2, topY, t('top_button'), {
      fontSize: '14px', fontFamily: NEON_FONT, fontStyle: 'bold', color: NEON_CYAN_STR,
    }).setOrigin(0.5).setDepth(16).setAlpha(0);
    const topZone = this.add.zone(W / 2, topY, 160, 44)
      .setInteractive({ useHandCursor: true }).setDepth(17);

    // Лидерборд — создаём один раз, show/hide через CSS
    this._leaderboardUI = new LeaderboardUI();
    topZone.on('pointerdown', () => {
      // Сбрасываем pointer state чтобы не прокидывать тап в GameScene
      this.input.activePointer.isDown = false;
      this._leaderboardUI.show();
    });

    this._addStaggerFade(topGfx, 800);
    this._addStaggerEntry(topText, topY, 800);

    // --- Подсказка ---
    const hintText = this.add.text(W / 2, H - 24, t('tap_to_hunt'), {
      fontSize: '15px', fontFamily: NEON_FONT, fontStyle: 'italic', color: NEON_CYAN_STR,
    }).setOrigin(0.5).setDepth(11).setAlpha(0);
    // Cyan glow + усиленный пульс 0.5→1.0
    hintText.setShadow(0, 0, '#00F5D4', 3, true, true);
    this.tweens.add({
      targets: hintText, alpha: { from: 0.5, to: 1.0 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 800,
    });
    this._addStaggerEntry(hintText, H - 20, 800);

    // --- Переключатель языка ---
    this._createLangToggle(W);

    // Konami Code
    this.konamiSequence = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right'];
    this.konamiIndex = 0;
    this.konamiTriggered = false;
    this._konamiHandler = (event) => this._checkKonami(event);
    this.input.keyboard.on('keydown', this._konamiHandler);

    // Scanline overlay — тонкие горизонтальные линии для cyberpunk feel
    const scanlines = this.add.graphics().setScrollFactor(0).setDepth(18);
    const scanH = this.scale.height;
    scanlines.lineStyle(1, 0xffffff, 0.03);
    for (let y = 0; y < scanH; y += 4) {
      scanlines.moveTo(0, y);
      scanlines.lineTo(this.scale.width, y);
    }
    scanlines.strokePath();

    // Stagger entry анимация
    this._playStaggerEntries();

    // Регистрация cleanup при остановке сцены
    this.events.once('shutdown', () => this.shutdown());
  }

  // --- Вспомогательные create-методы ---

  _createClimbButton(W, H) {
    const btnY = H * 0.66;
    const btnW = 250; const btnH = 64;
    const btnGlow = this.add.rectangle(W / 2, btnY, btnW + 20, btnH + 20, NEON_CYAN, 0.12).setDepth(12);
    this.tweens.add({
      targets: btnGlow, alpha: 0.24, scaleX: 1.05, scaleY: 1.05,
      duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    const btnGfx = this.add.graphics().setDepth(13);
    drawGlassButton(btnGfx, W / 2, btnY, btnW, btnH);
    const btnText = this.add.text(W / 2, btnY, t('play'), {
      fontSize: '32px', fontFamily: NEON_FONT, fontStyle: 'bold',
      color: NEON_AMBER_STR, stroke: BG_DARK_NEON_STR, strokeThickness: 4,
    }).setOrigin(0.5).setDepth(14).setAlpha(0);
    // Neon amber glow на тексте кнопки
    btnText.setShadow(0, 0, '#FFB800', 4);
    const btnZone = this.add.zone(W / 2, btnY, btnW, btnH).setInteractive({ useHandCursor: true }).setDepth(15);
    btnZone.on('pointerover', () => { drawGlassButton(btnGfx, W / 2, btnY, btnW, btnH, { hover: true }); btnText.setScale(1.05); });
    btnZone.on('pointerout', () => { drawGlassButton(btnGfx, W / 2, btnY, btnW, btnH); btnText.setScale(1); });
    btnZone.on('pointerdown', () => { drawGlassButton(btnGfx, W / 2, btnY, btnW, btnH, { pressed: true }); btnText.setY(btnY + 1); createEmberBurst(this, W / 2, btnY, 6); });
    btnZone.on('pointerup', () => {
      drawGlassButton(btnGfx, W / 2, btnY, btnW, btnH); btnText.setY(btnY);
      createEmberBurst(this, W / 2, btnY, 20);
      this.cameras.main.fadeOut(400, 10, 14, 26);
      this.time.delayedCall(400, () => this.scene.start('GameScene'));
    });
    btnGlow.setAlpha(0); btnGfx.setAlpha(0);
    this._addStaggerFade(btnGlow, 500);
    this._addStaggerFade(btnGfx, 500);
    this._addStaggerEntry(btnText, btnY, 500);
  }

  _createLangToggle(W) {
    const langX = W - 44;
    const envTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0', 10);
    const langY = Math.max(envTop, 10) + 16;
    const langGfx = this.add.graphics().setDepth(15);
    drawGlassButton(langGfx, langX, langY, 46, 26);
    const langText = this.add.text(langX, langY, getLang() === 'ru' ? 'EN' : 'RU', {
      fontSize: '16px', fontFamily: NEON_FONT, fontStyle: 'bold', color: NEON_AMBER_STR,
    }).setOrigin(0.5).setDepth(16);
    const langZone = this.add.zone(langX, langY, 46, 26).setInteractive({ useHandCursor: true }).setDepth(17);
    langZone.on('pointerover', () => drawGlassButton(langGfx, langX, langY, 46, 26, { hover: true }));
    langZone.on('pointerout', () => drawGlassButton(langGfx, langX, langY, 46, 26));
    langZone.on('pointerdown', () => {
      createEmberBurst(this, langX, langY, 4);
      const newLang = getLang() === 'ru' ? 'en' : 'ru';
      setLang(newLang);          // i18n — обновляет currentLang + localStorage
      profile.setLang(newLang);  // profile — синхронизирует с сервером
      this.scene.restart();
    });
  }

  // --- Stagger-анимация ---

  _addStaggerEntry(target, finalY, delay) {
    this._uiElements.push({ target, finalY, delay, fadeOnly: false });
  }

  _addStaggerFade(target, delay) {
    this._uiElements.push({ target, finalY: null, delay, fadeOnly: true });
  }

  _playStaggerEntries() {
    for (const { target, finalY, delay, fadeOnly } of this._uiElements) {
      if (target.setAlpha) target.setAlpha(0);
      if (fadeOnly) {
        this.tweens.add({ targets: target, alpha: 1, duration: 250, delay, ease: 'Cubic.easeOut' });
      } else {
        if (target.setY) target.setY(finalY + 20);
        this.tweens.add({ targets: target, alpha: 1, y: finalY, duration: 250, delay, ease: 'Cubic.easeOut' });
      }
    }
  }

  // --- Деревья ---

  _drawTreeSilhouettes(gfx, baseY, alpha, width) {
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

  // --- Konami ---

  _checkKonami(event) {
    if (this.konamiTriggered) return;
    const keyMap = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    const key = keyMap[event.key];
    if (!key) { this.konamiIndex = 0; return; }
    if (key === this.konamiSequence[this.konamiIndex]) {
      this.konamiIndex++;
      if (this.konamiIndex >= this.konamiSequence.length) {
        this.konamiTriggered = true;
        this._triggerKonami();
      }
    } else {
      this.konamiIndex = key === this.konamiSequence[0] ? 1 : 0;
    }
  }

  _triggerKonami() {
    playOminous();
    const txt = this.add.text(this.W / 2, this.H / 2, t('butcher'), {
      fontSize: '28px', fontFamily: NEON_FONT, fontStyle: 'bold',
      color: NEON_PINK_STR, stroke: BG_DARK_NEON_STR, strokeThickness: 5, align: 'center',
    }).setOrigin(0.5).setDepth(50).setAlpha(0);
    this.tweens.add({
      targets: txt, alpha: 1, scale: { from: 0.5, to: 1.1 }, duration: 600, ease: 'Back.easeOut',
      onComplete: () => { this.time.delayedCall(2000, () => { this.tweens.add({ targets: txt, alpha: 0, duration: 500 }); }); },
    });
    const hunterC = this.menuHunterObj ? this.menuHunterObj.getContainer() : null;
    if (hunterC) {
      let flashes = 0;
      this.time.addEvent({
        delay: 300, repeat: 5,
        callback: () => { flashes++; hunterC.setAlpha(flashes % 2 === 0 ? 1 : 0.3); },
      });
    }
    this.cameras.main.shake(200, 0.01);
  }

  // --- Update ---

  update(time, delta) {
    // Делегация маятника в MenuHunter
    if (this.menuHunterObj) this.menuHunterObj.update(time, delta);

    // Неоновые искры
    const W = this.W;
    const H = this.H;
    this.ashGfx.clear();
    for (const p of this.ashParticles) {
      p.y += p.speed * (delta / 1000);
      p.x += p.drift * (delta / 1000);
      if (p.speed > 0 && p.y > H + 5) { p.y = -5; p.x = Phaser.Math.Between(0, W); }
      if (p.speed < 0 && p.y < -5) { p.y = H + 5; p.x = Phaser.Math.Between(0, W); }
      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;
      this.ashGfx.fillStyle(p.color, p.alpha);
      this.ashGfx.fillCircle(p.x, p.y, p.size);
    }
  }

  // --- Shutdown ---

  shutdown() {
    if (this._konamiHandler) this.input.keyboard.off('keydown', this._konamiHandler);
    if (this._skinCarousel) this._skinCarousel.destroy();
    // Лидерборд — destroy DOM-элемент
    if (this._leaderboardUI) { this._leaderboardUI.destroy(); this._leaderboardUI = null; }
    if (this.menuHunterObj) this.menuHunterObj.destroy();
  }
}
