import { Scene } from '../engine/Scene.js';
import { between } from '../engine/math.js';
import { profile } from '../data/index.js';
import { playOminous } from '../audio.js';
import { t, getLang } from '../i18n.js';
import { drawGlassButton, drawChip } from '../managers/UIFactory.js';
import { FONT_MONO } from '../constants.js';
import { SkinCarousel } from '../managers/SkinCarousel.js';
import { MenuHunter } from '../managers/MenuHunter.js';
import { LeaderboardUI } from '../managers/LeaderboardUI.js';

// ===== NEON WESTERN ПАЛИТРА =====
const NEON_CYAN_STR = '#00F5D4';
const NEON_PINK_STR = '#FF2E63';
const NEON_AMBER_STR = '#FFB800';
const BG_DARK_STR = '#0A0E1A';
const NEON_FONT = "'Inter', 'Helvetica Neue', sans-serif";

export class MenuScene extends Scene {
  constructor(engine) {
    super(engine);
  }

  create() {
    const W = this.W;
    const H = this.H;

    // Фоновый градиент — offscreen canvas
    this._bgCanvas = document.createElement('canvas');
    this._bgCanvas.width = 1;
    this._bgCanvas.height = H;
    const bgCtx = this._bgCanvas.getContext('2d');
    const grad = bgCtx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#050810');
    grad.addColorStop(0.3, '#0A0E1A');
    grad.addColorStop(0.6, '#10152A');
    grad.addColorStop(1, '#0A0E1A');
    bgCtx.fillStyle = grad;
    bgCtx.fillRect(0, 0, 1, H);

    // Предгенерируем деревья
    this._trees = [];
    for (let tx = 20; tx < W; tx += 50 + Math.random() * 30) {
      const h = 80 + Math.random() * 160;
      const w = 6 + Math.random() * 8;
      const branches = [];
      for (let b = 0; b < 2 + Math.floor(Math.random() * 3); b++) {
        branches.push({
          y: (H - 100) - h * (0.3 + Math.random() * 0.5),
          len: 15 + Math.random() * 30,
          dir: Math.random() > 0.5 ? 1 : -1,
        });
      }
      this._trees.push({ x: tx, y: H - 100, h, w, branches });
    }

    // Неоновые искры
    this._particles = [];
    for (let i = 0; i < 50; i++) {
      const isCyan = Math.random() < 0.5;
      this._particles.push({
        x: between(0, W), y: between(0, H),
        size: 1 + Math.random() * 2,
        speed: isCyan ? -(8 + Math.random() * 15) : (8 + Math.random() * 15),
        drift: (Math.random() - 0.5) * 10,
        alpha: 0.4 + Math.random() * 0.3,
        color: isCyan ? NEON_CYAN_STR : NEON_AMBER_STR,
      });
    }

    // Scanlines — предгенерируем offscreen
    this._scanlinesCanvas = document.createElement('canvas');
    this._scanlinesCanvas.width = W;
    this._scanlinesCanvas.height = H;
    const slCtx = this._scanlinesCanvas.getContext('2d');
    slCtx.strokeStyle = 'rgba(255,255,255,0.03)';
    slCtx.lineWidth = 1;
    for (let y = 0; y < H; y += 4) {
      slCtx.beginPath();
      slCtx.moveTo(0, y);
      slCtx.lineTo(W, y);
      slCtx.stroke();
    }

    // --- Охотник ---
    this.menuHunterObj = new MenuHunter(this);
    this.menuHunterObj.create();

    // --- Skin Carousel ---
    this._skinCarousel = new SkinCarousel(this);

    // --- Leaderboard ---
    this._leaderboardUI = new LeaderboardUI();

    // --- UI элементы как state ---
    const titleY = H * 0.19;
    const btnY = H * 0.66;
    const recordY = H * 0.75;
    const skinsY = H * 0.82;
    const topY = skinsY + 40;
    const best = profile.bestScore;

    this._ui = {
      titleY,
      btnY,
      recordY,
      skinsY,
      topY,
      best,
      // Анимации через tweens
      titleAlpha: 0,
      titleFloatY: titleY + 20,
      subtitleAlpha: 0,
      subtitleY: titleY + 54 + 20,
      hunterAlpha: 0,
      btnGlowAlpha: 0,
      btnGfxAlpha: 0,
      btnTextAlpha: 0,
      btnTextY: btnY + 20,
      recordChipAlpha: 0,
      recordTextAlpha: 0,
      recordTextY: recordY + 20,
      skinsGfxAlpha: 0,
      skinsTextAlpha: 0,
      skinsTextY: skinsY + 20,
      topGfxAlpha: 0,
      topTextAlpha: 0,
      topTextY: topY + 20,
      hintAlpha: 0,
      hintY: H - 24 + 20,
      moonTextAlpha: 0,
      moonTextY: H * 0.78 + 20,
      // Пульсация
      btnGlowPulse: { alpha: 0.12, scaleX: 1, scaleY: 1 },
      hintPulse: { alpha: 0.5 },
    };

    // --- Stagger tweens ---
    // Заголовок
    this.tweens.add({ targets: this._ui, titleAlpha: 1, titleFloatY: titleY, duration: 250, delay: 0, ease: 'Cubic.easeOut' });
    // Подзаголовок
    this.tweens.add({ targets: this._ui, subtitleAlpha: 1, subtitleY: titleY + 54, duration: 250, delay: 200, ease: 'Cubic.easeOut' });
    // Охотник
    this.tweens.add({ targets: this._ui, hunterAlpha: 1, duration: 250, delay: 300, ease: 'Cubic.easeOut' });
    // Кнопка CLIMB
    this.tweens.add({ targets: this._ui, btnGlowAlpha: 1, btnGfxAlpha: 1, duration: 250, delay: 500, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: this._ui, btnTextAlpha: 1, btnTextY: btnY, duration: 250, delay: 500, ease: 'Cubic.easeOut' });
    // Рекорд
    if (best > 0) {
      this.tweens.add({ targets: this._ui, recordChipAlpha: 1, duration: 250, delay: 700, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: this._ui, recordTextAlpha: 1, recordTextY: recordY, duration: 250, delay: 700, ease: 'Cubic.easeOut' });
    }
    // Moon
    if (profile.moonReached) {
      this.tweens.add({ targets: this._ui, moonTextAlpha: 1, moonTextY: H * 0.78, duration: 250, delay: 700, ease: 'Cubic.easeOut' });
    }
    // Skins
    this.tweens.add({ targets: this._ui, skinsGfxAlpha: 1, duration: 250, delay: 750, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: this._ui, skinsTextAlpha: 1, skinsTextY: skinsY, duration: 250, delay: 750, ease: 'Cubic.easeOut' });
    // Top
    this.tweens.add({ targets: this._ui, topGfxAlpha: 1, duration: 250, delay: 800, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: this._ui, topTextAlpha: 1, topTextY: topY, duration: 250, delay: 800, ease: 'Cubic.easeOut' });
    // Hint
    this.tweens.add({ targets: this._ui, hintAlpha: 1, hintY: H - 24, duration: 250, delay: 800, ease: 'Cubic.easeOut' });

    // Пульсация кнопки CLIMB — плавный масштаб + свечение
    this.tweens.add({
      targets: this._ui.btnGlowPulse, alpha: 0.35, scaleX: 1.04, scaleY: 1.04,
      duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
    // Пульсация hint
    this.tweens.add({
      targets: this._ui.hintPulse, alpha: { from: 0.5, to: 1.0 },
      duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Title float tween
    this._titleFloat = { y: titleY };
    this.tweens.add({
      targets: this._titleFloat, y: titleY - 5,
      duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Typewriter подзаголовок
    this._subtitleText = t('title_sub');
    this._subtitleChars = 0;
    this._subtitleDelay = 0;

    // Подписка на серверную синхронизацию — обновить рекорд если сервер вернул больше
    this._profileUnsub = profile.onUpdated((data) => {
      if (data.bestScore > this._ui.best) {
        this._ui.best = data.bestScore;
        // Показать chip рекорда если он был скрыт (рекорд был 0 локально)
        if (this._ui.recordChipAlpha < 0.01) {
          this.tweens.add({ targets: this._ui, recordChipAlpha: 1, duration: 250, ease: 'Cubic.easeOut' });
          this.tweens.add({ targets: this._ui, recordTextAlpha: 1, recordTextY: this._ui.recordY, duration: 250, ease: 'Cubic.easeOut' });
        }
      }
    });

    // Konami
    this.konamiSequence = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right'];
    this.konamiIndex = 0;
    this.konamiTriggered = false;
    this._konamiHandler = (event) => this._checkKonami(event);
    document.addEventListener('keydown', this._konamiHandler);

    // Transition state
    this._transitioning = false;
    this._transitionAlpha = 0;

    // Glow colors для заголовка
    this._glowPhases = [
      { color: NEON_AMBER_STR, alpha: 0, phase: 0 },
      { color: NEON_CYAN_STR, alpha: 0, phase: 0 },
      { color: NEON_PINK_STR, alpha: 0, phase: 0 },
    ];

    // Konami визуал
    this._konamiText = null;
    this._konamiTextAlpha = 0;

    // Input
    this._onPointerDown = (e) => this._handlePointerDown(e);
    this.input.on('pointerdown', this._onPointerDown);

    this.camera.fadeIn(400);
  }

  _handlePointerDown(e) {
    if (this._transitioning) return;

    const x = e.x;
    const y = e.y;
    const W = this.W;
    const ui = this._ui;

    // Tooltip check first
    if (this._skinCarousel._tooltipVisible) {
      this._skinCarousel.handleTooltipTap(x, y);
      return;
    }

    // Когда карусель скинов открыта — блокируем остальные кнопки
    if (this._skinCarousel.isOpen) {
      this._skinCarousel.handleTap(x, y);
      return;
    }

    // Кнопка CLIMB
    const btnW = 250, btnH = 64;
    if (x >= W / 2 - btnW / 2 && x <= W / 2 + btnW / 2 &&
        y >= ui.btnY - btnH / 2 && y <= ui.btnY + btnH / 2) {
      this._startTransition();
      return;
    }

    // Кнопка SKINS
    if (x >= W / 2 - 80 && x <= W / 2 + 80 && y >= ui.skinsY - 22 && y <= ui.skinsY + 22) {
      this._skinCarousel.toggle();
      return;
    }

    // Кнопка TOP
    if (x >= W / 2 - 80 && x <= W / 2 + 80 && y >= ui.topY - 22 && y <= ui.topY + 22) {
      this._leaderboardUI.show();
      return;
    }

    // Кнопка языка
    const langX = W - 44;
    const envTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0', 10);
    const langY = Math.max(envTop, 10) + 16;
    if (x >= langX - 23 && x <= langX + 23 && y >= langY - 13 && y <= langY + 13) {
      const newLang = getLang() === 'ru' ? 'en' : 'ru';
      profile.setLang(newLang);
      this.startScene('MenuScene');
      return;
    }
  }

  _startTransition() {
    this._transitioning = true;
    this._transitionAlpha = 0;
    // Fade to black, then switch scene
    this.tweens.add({
      targets: this,
      _transitionAlpha: 1,
      duration: 400,
      ease: 'Linear',
      onComplete: () => this.startScene('GameScene'),
    });
  }

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
    this._konamiText = t('butcher');
    this._konamiTextAlpha = 0;
    this.tweens.add({
      targets: this, _konamiTextAlpha: 1,
      duration: 600, ease: 'Back.easeOut',
    });
    this.camera.shake(200, 0.01);
  }

  update(time, delta) {
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;
    const ui = this._ui;

    // === Фон ===
    ctx.drawImage(this._bgCanvas, 0, 0, W, H);

    // === Луна ===
    ctx.fillStyle = '#00F5D4';
    ctx.globalAlpha = 0.04;
    ctx.beginPath(); ctx.arc(W * 0.75, H * 0.12, 80, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4A5580';
    ctx.globalAlpha = 0.30;
    ctx.beginPath(); ctx.arc(W * 0.75, H * 0.12, 60, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.20;
    ctx.beginPath(); ctx.arc(W * 0.75 - 8, H * 0.12 - 5, 55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2A3050';
    ctx.globalAlpha = 0.12;
    ctx.beginPath(); ctx.arc(W * 0.75 + 15, H * 0.12 - 15, 12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.75 - 20, H * 0.12 + 10, 8, 0, Math.PI * 2); ctx.fill();

    // === Деревья ===
    ctx.fillStyle = '#0E1225';
    ctx.globalAlpha = 0.4;
    for (const tree of this._trees) {
      ctx.fillRect(tree.x - tree.w / 2, tree.y - tree.h, tree.w, tree.h);
      for (const b of tree.branches) {
        ctx.fillRect(tree.x, b.y, b.len * b.dir, 2);
      }
    }

    // === Туман ===
    ctx.fillStyle = BG_DARK_STR;
    ctx.globalAlpha = 0.30;
    ctx.fillRect(0, H - 150, W, 150);
    ctx.fillStyle = '#10152A';
    ctx.globalAlpha = 0.18;
    ctx.fillRect(0, H - 250, W, 100);

    // === Неоновые искры ===
    for (const p of this._particles) {
      p.y += p.speed * (delta / 1000);
      p.x += p.drift * (delta / 1000);
      if (p.speed > 0 && p.y > H + 5) { p.y = -5; p.x = between(0, W); }
      if (p.speed < 0 && p.y < -5) { p.y = H + 5; p.x = between(0, W); }
      if (p.x < -5) p.x = W + 5;
      if (p.x > W + 5) p.x = -5;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
    }

    // === Охотник ===
    if (this.menuHunterObj) {
      this.menuHunterObj.setAlpha(ui.hunterAlpha);
      this.menuHunterObj.update(time, delta);
      this.menuHunterObj.draw(ctx);
    }

    // === Glow titles ===
    const titleY = this._titleFloat.y;

    // Glow layers (пульсирующие)
    for (let i = 0; i < this._glowPhases.length; i++) {
      const g = this._glowPhases[i];
      g.phase += delta * 0.001;
      const a = (0.18 + i * 0.06) * (0.5 + 0.5 * Math.sin(g.phase * (0.5 + i * 0.2)));
      ctx.globalAlpha = a * ui.titleAlpha;
      ctx.font = `bold 60px ${NEON_FONT}`;
      ctx.fillStyle = g.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('THE HOOK', W / 2, titleY);
    }

    // Основной заголовок
    ctx.globalAlpha = ui.titleAlpha;
    ctx.font = `bold 60px ${NEON_FONT}`;
    ctx.fillStyle = NEON_AMBER_STR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = BG_DARK_STR;
    ctx.lineWidth = 7;
    ctx.shadowColor = '#00F5D4';
    ctx.shadowBlur = 3;
    ctx.strokeText('THE HOOK', W / 2, titleY);
    ctx.fillText('THE HOOK', W / 2, titleY);
    ctx.shadowBlur = 0;

    // Трещина под заголовком
    ctx.globalAlpha = ui.titleAlpha * 0.5;
    ctx.strokeStyle = NEON_CYAN_STR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const crackY = titleY + 35;
    const crackLeft = W * 0.25;
    const crackRight = W * 0.75;
    ctx.moveTo(crackLeft, crackY);
    // Используем стабильные значения (не рандомные каждый кадр)
    if (!this._crackPoints) {
      this._crackPoints = [];
      for (let i = 1; i <= 20; i++) {
        this._crackPoints.push({ x: crackLeft + (crackRight - crackLeft) * (i / 20), y: crackY + (Math.random() - 0.5) * 4 });
      }
    }
    for (const p of this._crackPoints) {
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();

    // Подзаголовок (typewriter)
    this._subtitleDelay += delta;
    if (this._subtitleChars < this._subtitleText.length && this._subtitleDelay > 50) {
      this._subtitleDelay = 0;
      this._subtitleChars++;
    }
    ctx.globalAlpha = ui.subtitleAlpha;
    ctx.font = `italic 16px ${NEON_FONT}`;
    ctx.fillStyle = NEON_CYAN_STR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this._subtitleText.substring(0, this._subtitleChars), W / 2, ui.subtitleY);

    // === Кнопка CLIMB — пульсация самой кнопки ===
    const btnW = 250, btnH = 64;
    const pulse = ui.btnGlowPulse;
    const btnScale = pulse.scaleX; // 1.0 → 1.04

    ctx.save();
    ctx.translate(W / 2, ui.btnY);
    ctx.scale(btnScale, btnScale);

    // Мягкий ореол под кнопкой (cyan glow, пульсирует вместе)
    if (ui.btnGlowAlpha > 0.01) {
      ctx.globalAlpha = ui.btnGlowAlpha * pulse.alpha * 0.5;
      ctx.shadowColor = NEON_CYAN_STR;
      ctx.shadowBlur = 15 + pulse.alpha * 10;
      ctx.fillStyle = NEON_CYAN_STR;
      const r = 12;
      ctx.beginPath();
      ctx.roundRect(-btnW / 2, -btnH / 2, btnW, btnH, r);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Кнопка
    if (ui.btnGfxAlpha > 0.01) {
      ctx.globalAlpha = ui.btnGfxAlpha;
      drawGlassButton(ctx, 0, 0, btnW, btnH);
    }

    // Текст
    ctx.globalAlpha = ui.btnTextAlpha;
    ctx.font = `bold 32px ${NEON_FONT}`;
    ctx.fillStyle = NEON_AMBER_STR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = BG_DARK_STR;
    ctx.lineWidth = 4;
    ctx.shadowColor = '#FFB800';
    ctx.shadowBlur = 2 + pulse.alpha * 3;
    const textOffsetY = ui.btnTextY - ui.btnY; // учитываем анимацию появления
    ctx.strokeText(t('play'), 0, textOffsetY);
    ctx.fillText(t('play'), 0, textOffsetY);
    ctx.shadowBlur = 0;

    ctx.restore();

    // === Рекорд ===
    if (ui.best > 0) {
      if (ui.recordChipAlpha > 0.01) {
        ctx.globalAlpha = ui.recordChipAlpha;
        drawChip(ctx, W / 2, ui.recordY, 200, 36);
      }
      ctx.globalAlpha = ui.recordTextAlpha;
      ctx.font = `bold 16px ${FONT_MONO}`;
      ctx.fillStyle = NEON_AMBER_STR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#00F5D4';
      ctx.shadowBlur = 1;
      ctx.fillText(`${t('record')}: ${ui.best}${t('unit_m')}`, W / 2, ui.recordTextY);
      ctx.shadowBlur = 0;
    }

    // Moon
    if (profile.moonReached && ui.moonTextAlpha > 0.01) {
      ctx.globalAlpha = ui.moonTextAlpha;
      ctx.font = `italic 12px ${NEON_FONT}`;
      ctx.fillStyle = '#4A5580';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t('moon_reached'), W / 2, ui.moonTextY);
    }

    // === Кнопка SKINS ===
    if (ui.skinsGfxAlpha > 0.01) {
      ctx.globalAlpha = ui.skinsGfxAlpha;
      drawGlassButton(ctx, W / 2, ui.skinsY, 120, 32);
    }
    ctx.globalAlpha = ui.skinsTextAlpha;
    ctx.font = `bold 14px ${NEON_FONT}`;
    ctx.fillStyle = NEON_CYAN_STR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t('skins_title'), W / 2, ui.skinsTextY);

    // === Кнопка TOP ===
    if (ui.topGfxAlpha > 0.01) {
      ctx.globalAlpha = ui.topGfxAlpha;
      drawGlassButton(ctx, W / 2, ui.topY, 120, 32);
    }
    ctx.globalAlpha = ui.topTextAlpha;
    ctx.font = `bold 14px ${NEON_FONT}`;
    ctx.fillStyle = NEON_CYAN_STR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t('top_button'), W / 2, ui.topTextY);

    // === Skin Carousel ===
    this._skinCarousel.draw(ctx);

    // === Подсказка ===
    ctx.globalAlpha = ui.hintAlpha * ui.hintPulse.alpha;
    ctx.font = `italic 15px ${NEON_FONT}`;
    ctx.fillStyle = NEON_CYAN_STR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00F5D4';
    ctx.shadowBlur = 1;
    ctx.fillText(t('tap_to_hunt'), W / 2, ui.hintY);
    ctx.shadowBlur = 0;

    // === Языковая кнопка ===
    const langX = W - 44;
    const envTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0', 10);
    const langY = Math.max(envTop, 10) + 16;
    ctx.globalAlpha = 1;
    drawGlassButton(ctx, langX, langY, 46, 26);
    ctx.font = `bold 16px ${NEON_FONT}`;
    ctx.fillStyle = NEON_AMBER_STR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(getLang() === 'ru' ? 'EN' : 'RU', langX, langY);

    // === Scanlines ===
    ctx.globalAlpha = 1;
    ctx.drawImage(this._scanlinesCanvas, 0, 0);

    // === Konami ===
    if (this._konamiText && this._konamiTextAlpha > 0.01) {
      ctx.globalAlpha = this._konamiTextAlpha;
      ctx.font = `bold 28px ${NEON_FONT}`;
      ctx.fillStyle = NEON_PINK_STR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = BG_DARK_STR;
      ctx.lineWidth = 5;
      ctx.strokeText(this._konamiText, W / 2, H / 2);
      ctx.fillText(this._konamiText, W / 2, H / 2);
    }

    // === Transition overlay ===
    if (this._transitioning) {
      ctx.globalAlpha = this._transitionAlpha;
      ctx.fillStyle = '#0A0E1A';
      ctx.fillRect(0, 0, W, H);
    }

    ctx.globalAlpha = 1;
  }

  shutdown() {
    if (this._onPointerDown) this.input.off('pointerdown', this._onPointerDown);
    if (this._konamiHandler) document.removeEventListener('keydown', this._konamiHandler);
    if (this._profileUnsub) this._profileUnsub();
    if (this._skinCarousel) this._skinCarousel.destroy();
    if (this._leaderboardUI) { this._leaderboardUI.destroy(); this._leaderboardUI = null; }
    if (this.menuHunterObj) this.menuHunterObj.destroy();
  }
}
