import Phaser from 'phaser';
import { playHook, playAttach, playRelease, playDeath, playRecord, playBounty, playMoonwalker } from '../audio.js';
import { getBest, saveBest, getMoon, saveMoon } from '../storage.js';
import { trackGameEnd, shouldShowInterstitial, showInterstitial, showRewarded } from '../ads.js';
import { t } from '../i18n.js';

const GRAVITY = 900;
const HOOK_RANGE = 500;
const WORLD_HEIGHT = 8000;
const ANCHOR_SPACING_Y = 280;
const GROUND_Y = WORLD_HEIGHT - 10;
const SPAWN_Y = WORLD_HEIGHT - 80;
const TRAIL_SPEED_THRESHOLD = 150;

const GOLD = '#C8A96E';
const GOLD_HEX = 0xC8A96E;
const DARK_RED = '#6B0F0F';
const DARK_RED_HEX = 0x6B0F0F;
const RUST = 0x7A4A1E;
const BG_DARK = '#1a0e06';
const FONT = 'Georgia, serif';
const BOUNTY_HEIGHT = 100;
const MOON_HEIGHT = 300;
const HUNTER_BODY = 0x5a3518;
const HUNTER_FACE = 0xF0DDB0;
const TRAIL_COLOR = 0xFF6B00;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    // Динамические размеры экрана
    const WORLD_WIDTH = this.scale.width;
    this.W = WORLD_WIDTH;
    this.H = this.scale.height;

    // Мир бесконечный по горизонтали, ограничен только снизу
    this.physics.world.setBounds(0, -999999, this.W, 999999 + this.H);

    this.isHooked = false;
    this.currentAnchor = null;
    this.ropeLength = 0;
    this.swingAngle = 0;
    this.swingSpeed = 0;
    this.maxHeight = 0;
    this.sessionBest = getBest();
    this.isDead = false;
    this.continueUsed = false;
    this.bountyShown = false;
    this.moonReached = false;

    this.createBackground();

    // --- PLAYER (hunter) ---
    this.playerContainer = this.add.container(this.W / 2, SPAWN_Y).setDepth(5);
    this.drawHunter();
    this.physics.add.existing(this.playerContainer);
    this.playerContainer.body.setSize(20, 28);
    this.playerContainer.body.setOffset(-10, -14);
    // Ограничение горизонтальной скорости чтобы не улетал за экран
    this.playerContainer.body.setMaxVelocity(500, 1200);
    this.player = this.playerContainer;

    // Coat animation state
    this.coatTime = 0;

    // Trail (embers)
    this.trailGraphics = this.add.graphics().setDepth(3);
    this.trailPoints = [];

    // Rope
    this.hookLine = this.add.graphics().setDepth(4);

    // Anchors
    this.anchors = [];
    this.anchorContainers = [];
    this.createAnchors();

    // Swamp death zone
    this.createSwamp();

    // Swamp bubbles
    this.swampBubbles = [];
    this.swampBubbleGfx = this.add.graphics().setDepth(2);

    // Камера — ручное управление по обеим осям в update()
    this.cameras.main.scrollX = this.player.x - this.cameras.main.width / 2;
    this.cameras.main.scrollY = this.player.y - this.cameras.main.height / 2;

    // Input
    this.input.on('pointerdown', (pointer) => this.handlePointerDown(pointer));

    this.createHUD();
    this.createGameOverUI();

    this.cameras.main.fadeIn(400, 13, 8, 0);
  }

  // ===================== BACKGROUND =====================

  createBackground() {
    if (this.textures.exists('bg-grad')) this.textures.remove('bg-grad');
    const gradTex = this.textures.createCanvas('bg-grad', 1, WORLD_HEIGHT);
    const gCtx = gradTex.getContext();
    const grad = gCtx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    grad.addColorStop(0, '#15100a');
    grad.addColorStop(0.2, '#1e150c');
    grad.addColorStop(0.6, '#2a1c0e');
    grad.addColorStop(0.85, '#3d2812');
    grad.addColorStop(1, '#2a1c0e');
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, 1, WORLD_HEIGHT);
    gradTex.refresh();
    // Фон шире экрана x5 — камера может двигаться по X без видимых краёв
    this.add.image(this.W / 2, WORLD_HEIGHT / 2, 'bg-grad')
      .setDisplaySize(this.W * 5, WORLD_HEIGHT).setDepth(-10);

    // Moon (high up in the world)
    const moonGfx = this.add.graphics().setDepth(-9);
    const moonY = 300;
    moonGfx.fillStyle(0x444433, 0.12);
    moonGfx.fillCircle(this.W * 0.72, moonY, 70);
    moonGfx.fillStyle(0x555544, 0.08);
    moonGfx.fillCircle(this.W * 0.72 - 10, moonY - 5, 62);
    moonGfx.fillStyle(0x333322, 0.06);
    moonGfx.fillCircle(this.W * 0.72 + 18, moonY - 15, 14);
    moonGfx.fillCircle(this.W * 0.72 - 22, moonY + 15, 9);

    // Parallax ash/ember layers
    this.ashLayers = [];
    const layerConfigs = [
      { count: 60, scrollFactor: 0.2, maxR: 1.0, alpha: 0.12, color: 0x886644 },
      { count: 40, scrollFactor: 0.4, maxR: 1.5, alpha: 0.18, color: 0xC8A96E },
      { count: 25, scrollFactor: 0.65, maxR: 2.0, alpha: 0.22, color: 0xAA8855 },
    ];
    for (const cfg of layerConfigs) {
      const g = this.add.graphics().setDepth(-5);
      g.setScrollFactor(cfg.scrollFactor);
      for (let i = 0; i < cfg.count; i++) {
        const x = Phaser.Math.Between(0, this.W / cfg.scrollFactor);
        const y = Phaser.Math.Between(0, WORLD_HEIGHT / cfg.scrollFactor);
        const r = 0.3 + Math.random() * cfg.maxR;
        const a = cfg.alpha * (0.3 + Math.random() * 0.7);
        g.fillStyle(cfg.color, a);
        g.fillCircle(x, y, r);
      }
      this.ashLayers.push(g);
    }

    // Tree silhouettes (parallax)
    const treeFar = this.add.graphics().setDepth(-7).setScrollFactor(0.3);
    this.drawTrees(treeFar, 0, WORLD_HEIGHT * 0.8, this.W * 3, 0.08);
    const treeNear = this.add.graphics().setDepth(-6).setScrollFactor(0.5);
    this.drawTrees(treeNear, 0, WORLD_HEIGHT * 0.6, this.W * 2, 0.12);

    // Fog layers
    const fog = this.add.graphics().setDepth(-4).setScrollFactor(0.7);
    for (let y = WORLD_HEIGHT * 0.4; y < WORLD_HEIGHT; y += 300) {
      fog.fillStyle(0x281405, 0.05);
      fog.fillRect(-this.W * 2, y, this.W * 5, 80);
    }
  }

  drawTrees(gfx, startX, baseY, width, alpha) {
    gfx.fillStyle(0x0a0500, alpha);
    for (let x = startX; x < width; x += 30 + Math.random() * 50) {
      const h = 60 + Math.random() * 200;
      const w = 4 + Math.random() * 6;
      gfx.fillRect(x - w / 2, baseY - h, w, h + 20);
      // Branches
      for (let b = 0; b < 2 + Math.floor(Math.random() * 3); b++) {
        const by = baseY - h * (0.25 + Math.random() * 0.55);
        const bLen = 10 + Math.random() * 25;
        const dir = Math.random() > 0.5 ? 1 : -1;
        gfx.fillRect(x, by, bLen * dir, 2);
      }
    }
  }

  // ===================== HUNTER =====================

  drawHunter() {
    this.hunterGfx = this.add.graphics();

    this.drawHunterPose(this.hunterGfx, 0);
    this.playerContainer.add(this.hunterGfx);
  }

  drawHunterPose(g, coatAngle) {
    g.clear();

    // Яркий золотой outline для видимости на тёмном фоне
    g.lineStyle(2, GOLD_HEX, 0.6);
    g.strokeRoundedRect(-10, -24, 20, 50, 3);

    // Пальто полы (анимация ветра)
    g.fillStyle(HUNTER_BODY);
    const coatSway = Math.sin(coatAngle) * 4;
    g.fillTriangle(-9, 10, -14 + coatSway, 26, -3, 24);
    g.fillTriangle(9, 10, 14 + coatSway, 26, 3, 24);

    // Тело
    g.fillStyle(HUNTER_BODY);
    g.fillRoundedRect(-8, -2, 16, 18, 2);

    // Пояс + пряжка
    g.fillStyle(0x7A4A1E);
    g.fillRect(-8, 8, 16, 2);
    g.fillStyle(GOLD_HEX, 0.7);
    g.fillRect(-2, 7, 4, 4);

    // Шляпа — золотая, сразу видна
    g.fillStyle(GOLD_HEX, 0.8);
    g.fillEllipse(0, -12, 28, 7);
    // Тулья
    g.fillStyle(HUNTER_BODY);
    g.fillRoundedRect(-7, -22, 14, 12, 2);
    // Лента
    g.fillStyle(GOLD_HEX);
    g.fillRect(-7, -13, 14, 2);

    // Лицо — светло-бежевое
    g.fillStyle(HUNTER_FACE);
    g.fillRect(-4, -10, 8, 5);
    // Глаза
    g.fillStyle(0x1a0e06);
    g.fillCircle(-2, -8, 1);
    g.fillCircle(2, -8, 1);

    // Руки
    g.fillStyle(HUNTER_BODY);
    g.fillRect(-12, 0, 4, 11);
    g.fillRect(8, 0, 4, 11);
    // Кисти
    g.fillStyle(HUNTER_FACE, 0.6);
    g.fillRect(-12, 10, 4, 3);
    g.fillRect(8, 10, 4, 3);

    // Ноги
    g.fillStyle(0x2a1a0a);
    g.fillRect(-6, 16, 5, 8);
    g.fillRect(1, 16, 5, 8);

    // Сапоги
    g.fillStyle(0x3d2510);
    g.fillRect(-7, 22, 6, 4);
    g.fillRect(1, 22, 6, 4);
  }

  // ===================== ANCHORS (butcher hooks) =====================

  createAnchors() {
    this.addAnchor(this.W / 2 + 60, SPAWN_Y - 180);

    for (let y = SPAWN_Y - 180 - ANCHOR_SPACING_Y; y > 100; y -= ANCHOR_SPACING_Y) {
      const side = ((SPAWN_Y - y) / ANCHOR_SPACING_Y) % 2 === 0;
      const baseX = side ? this.W * 0.3 : this.W * 0.7;
      const x = Phaser.Math.Clamp(baseX + Phaser.Math.Between(-80, 80), 50, this.W - 50);
      this.addAnchor(x, y);
    }
  }

  addAnchor(x, y) {
    const c = this.add.container(x, y).setDepth(2);
    const g = this.add.graphics();
    this.drawButcherHook(g, false);
    c.add(g);
    this.anchorContainers.push(c);

    const dot = this.add.circle(x, y, 12, 0xffffff, 0).setDepth(2);
    dot._container = c;
    this.anchors.push(dot);
  }

  drawButcherHook(g, active) {
    g.clear();

    // Стержень крепления
    g.fillStyle(active ? GOLD_HEX : 0x7A4A1E);
    g.fillRect(-2, -22, 4, 12);

    // S-образный крюк — золотой для видимости
    const hookColor = active ? 0xFFB84D : GOLD_HEX;
    g.lineStyle(3.5, hookColor, active ? 1 : 0.7);
    g.beginPath();
    g.arc(6, -10, 7, Math.PI, 0, true);
    g.strokePath();
    g.beginPath();
    g.arc(-4, 3, 8, 0, Math.PI, true);
    g.strokePath();
    g.lineStyle(3, hookColor, active ? 1 : 0.7);
    g.lineBetween(6, -3, -4, 3);

    // Остриё
    g.fillStyle(active ? 0xFFB84D : GOLD_HEX, 0.8);
    g.fillTriangle(-12, 3, -11, 10, -7, 4);

    // Ржавые пятна
    g.fillStyle(0x7A4A1E, 0.25);
    g.fillCircle(4, -6, 2);
    g.fillCircle(-6, 5, 1.5);

    if (active) {
      // Тёплое свечение #FFB84D
      g.fillStyle(0xFFB84D, 0.15);
      g.fillCircle(0, 0, 15);
      g.fillStyle(0xFFB84D, 0.06);
      g.fillCircle(0, 0, 25);
    }
  }

  highlightAnchor(anchor, active) {
    const c = anchor._container;
    if (!c) return;
    c.setScale(active ? 1.2 : 1);
    this.drawButcherHook(c.list[0], active);
  }

  // ===================== SWAMP (death zone) =====================

  createSwamp() {
    const gfx = this.add.graphics().setDepth(1);
    // Болото шире экрана чтобы камера не показывала края
    const sx = -this.W * 2;
    const sw = this.W * 5;
    gfx.fillStyle(0x0a0500);
    gfx.fillRect(sx, GROUND_Y - 10, sw, 30);
    gfx.fillStyle(0x1a0f00, 0.9);
    gfx.fillRect(sx, GROUND_Y - 16, sw, 6);
    gfx.fillStyle(0x1a2a00, 0.3);
    gfx.fillRect(sx, GROUND_Y - 14, sw, 4);
    for (let x = sx; x < sx + sw; x += 8) {
      const h = 1 + Math.random() * 3;
      gfx.fillStyle(0x2a3a00, 0.15 + Math.random() * 0.15);
      gfx.fillRect(x, GROUND_Y - 16 - h, 6, h);
    }
  }

  // ===================== HUD =====================

  createHUD() {
    this.heightText = this.add.text(this.W / 2, 16, `0${t('unit_m')}`, {
      fontSize: '32px',
      color: GOLD,
      fontFamily: FONT,
      fontStyle: 'bold',
      stroke: BG_DARK,
      strokeThickness: 5,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20);

    this.heightArrow = this.add.text(this.W / 2 - 60, 20, '\u2191', {
      fontSize: '22px',
      color: GOLD,
      fontFamily: FONT,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20);

    this.maxHeightText = this.add.text(this.W / 2, 52, `${t('record')}: 0${t('unit_m')}`, {
      fontSize: '14px',
      color: '#6B5030',
      fontFamily: FONT,
      stroke: BG_DARK,
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20);

    // Label
    this.add.text(this.W / 2, 2, t('depth'), {
      fontSize: '10px',
      color: '#5B4020',
      fontFamily: FONT,
      letterSpacing: 4,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20);

    this.hintText = this.add.text(this.W / 2, 76, t('click_hook'), {
      fontSize: '12px',
      color: '#4B3A20',
      fontFamily: FONT,
      fontStyle: 'italic',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20);
  }

  // ===================== GAME OVER =====================

  createGameOverUI() {
    // Phaser-элементы для текстов (scrollFactor 0)
    this.gameOverElements = [];
    const makeUI = (obj) => {
      obj.setScrollFactor(0).setDepth(30).setVisible(false);
      this.gameOverElements.push(obj);
      return obj;
    };

    // Затемнение
    makeUI(this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x2d0000, 0.65));

    // Заголовок
    makeUI(this.add.text(this.W / 2, this.H * 0.28, t('you_died'), {
      fontSize: '42px', color: DARK_RED, fontFamily: FONT, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5));

    // Высота
    this.gameOverScore = makeUI(this.add.text(this.W / 2, this.H * 0.36, '', {
      fontSize: '18px', color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5));

    // Рекорд
    this.gameOverBest = makeUI(this.add.text(this.W / 2, this.H * 0.40, '', {
      fontSize: '26px', color: '#6B5030', fontFamily: FONT, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5));

    // НОВЫЙ РЕКОРД
    this.newBestText = makeUI(this.add.text(this.W / 2, this.H * 0.45, t('new_record'), {
      fontSize: '20px', color: GOLD, fontFamily: FONT, fontStyle: 'bold italic',
      stroke: '#3B1A00', strokeThickness: 4,
    }).setOrigin(0.5));

    // --- HTML DOM кнопки (надёжный клик поверх canvas) ---
    const btnStyle = `
      font-family: Georgia, serif; cursor: pointer;
      border: none; outline: none; letter-spacing: 1px;
      transition: background 0.15s;
    `;

    // CONTINUE (AD)
    this.continueDom = this.add.dom(this.W / 2, this.H * 0.53).createFromHTML(`
      <button id="btn-continue" style="
        ${btnStyle} background: #3B1A00; color: #C8A96E;
        border: 2px solid #7A4A1E; font-size: 15px; font-weight: bold;
        padding: 10px 32px;
      ">${t('continue_ad')}</button>
    `).setScrollFactor(0).setDepth(31).setVisible(false);
    this.continueDom.node.querySelector('#btn-continue').addEventListener('click', () => {
      this.continueWithAd();
    });
    this.gameOverElements.push(this.continueDom);

    // RESTART — нативный DOM click для надёжности
    this.restartDom = this.add.dom(this.W / 2, this.H * 0.59).createFromHTML(`
      <button id="btn-restart" style="
        ${btnStyle} background: #6B0F0F; color: #C8A96E;
        border: 2px solid #C8A96E; font-size: 20px; font-weight: bold;
        padding: 12px 44px;
      ">${t('restart')}</button>
    `).setScrollFactor(0).setDepth(31).setVisible(false);
    this.restartDom.node.querySelector('#btn-restart').addEventListener('click', () => {
      this.handleRestart();
    });
    this.gameOverElements.push(this.restartDom);

    // MENU — нативный DOM click
    this.menuDom = this.add.dom(this.W / 2, this.H * 0.65).createFromHTML(`
      <button id="btn-menu" style="
        ${btnStyle} background: #1a0f00; color: #5B4020;
        border: 1px solid #3B2A10; font-size: 14px;
        padding: 8px 36px;
      ">${t('menu')}</button>
    `).setScrollFactor(0).setDepth(31).setVisible(false);
    this.menuDom.node.querySelector('#btn-menu').addEventListener('click', () => {
      trackGameEnd();
      this.scene.stop('GameScene');
      this.scene.start('MenuScene');
    });
    this.gameOverElements.push(this.menuDom);
  }

  // ===================== INPUT =====================

  handlePointerDown() {
    if (this.isDead) return;
    if (this.isHooked) {
      this.releaseHook();
    } else {
      this.shootHook();
    }
  }

  // ===================== HOOK MECHANICS =====================

  shootHook() {
    const px = this.player.x;
    const py = this.player.y;

    let nearest = null;
    let minDist = Infinity;

    // Цепляемся за ближайший якорь — и выше, и ниже (при падении)
    const isFalling = this.player.body.velocity.y > 50;

    for (const anchor of this.anchors) {
      // При падении — цепляемся за любой якорь в радиусе
      // При подъёме — только за якоря выше
      if (!isFalling && anchor.y >= py - 20) continue;
      const dist = Phaser.Math.Distance.Between(px, py, anchor.x, anchor.y);
      // Якоря выше — полный радиус, якоря ниже — уменьшенный
      const range = anchor.y < py ? HOOK_RANGE : HOOK_RANGE * 0.6;
      if (dist < minDist && dist < range) {
        minDist = dist;
        nearest = anchor;
      }
    }

    if (!nearest) return;

    const vx = this.player.body.velocity.x;
    const vy = this.player.body.velocity.y;

    this.isHooked = true;
    this.currentAnchor = nearest;
    this.ropeLength = minDist;

    this.player.body.allowGravity = false;
    this.player.body.setVelocity(0, 0);

    const dx = px - nearest.x;
    const dy = py - nearest.y;
    this.swingAngle = Math.atan2(dy, dx);

    const tangent = -vx * Math.sin(this.swingAngle) + vy * Math.cos(this.swingAngle);
    this.swingSpeed = tangent / this.ropeLength;

    if (Math.abs(this.swingSpeed) < 0.8) {
      this.swingSpeed = px < nearest.x ? -1.5 : 1.5;
    }

    this.highlightAnchor(nearest, true);

    playHook();
    this.time.delayedCall(80, () => playAttach());

    this.hintText.setText(t('click_release'));
  }

  releaseHook() {
    if (!this.isHooked) return;

    this.isHooked = false;
    this.player.body.allowGravity = true;

    // Скорость при отпускании — касательная к дуге
    const speed = this.swingSpeed * this.ropeLength;
    const vx = -speed * Math.sin(this.swingAngle);
    const vy = speed * Math.cos(this.swingAngle);
    this.player.body.setVelocity(vx, vy);

    if (this.currentAnchor) {
      this.highlightAnchor(this.currentAnchor, false);
      this.currentAnchor = null;
    }

    this.hookLine.clear();
    this.hintText.setText(t('click_hook'));
    playRelease();
  }

  // ===================== DEATH / RESPAWN =====================

  die() {
    this.isDead = true;
    if (this.isHooked) this.releaseHook();
    this.player.body.setVelocity(0, 0);
    this.player.body.allowGravity = false;

    this.cameras.main.shake(400, 0.02);
    // Яркий красный flash для контраста на тёмном фоне
    this.cameras.main.flash(400, 140, 20, 10);

    this.tweens.add({
      targets: this.playerContainer,
      alpha: 0.2,
      duration: 400,
    });

    const isNewBest = saveBest(this.maxHeight);
    this.sessionBest = getBest();

    const lastHeight = Math.max(0, Math.floor((GROUND_Y - this.player.y) / 10));
    this.gameOverScore.setText(`${t('depth_label')}: ${lastHeight}${t('unit_m')}`);
    this.gameOverBest.setText(`${t('record_label')}: ${this.sessionBest}${t('unit_m')}`);

    if (isNewBest && this.maxHeight > 0) {
      this.gameOverBest.setColor(GOLD);
    } else {
      this.newBestText.setVisible(false);
      this.gameOverBest.setColor('#6B5030');
    }

    this.time.delayedCall(500, () => {
      // DOM кнопки позиционируются в мировых координатах —
      // нужно переместить их на текущую позицию камеры
      const camX = this.cameras.main.scrollX + this.W / 2;
      const camY = this.cameras.main.scrollY;
      this.continueDom.setPosition(camX, camY + this.H * 0.53);
      this.restartDom.setPosition(camX, camY + this.H * 0.59);
      this.menuDom.setPosition(camX, camY + this.H * 0.65);

      for (const el of this.gameOverElements) el.setVisible(true);
      if (this.continueUsed) {
        this.continueDom.setVisible(false);
      }
      if (!isNewBest || this.maxHeight === 0) {
        this.newBestText.setVisible(false);
      } else {
        this.newBestText.setVisible(true);
        this.newBestText.setScale(0.3).setAlpha(0);
        this.tweens.add({
          targets: this.newBestText,
          scale: 1.15,
          alpha: 1,
          duration: 500,
          delay: 200,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.tweens.add({
              targets: this.newBestText,
              scale: 1.0,
              duration: 700,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut',
            });
          },
        });
      }
    });

    playDeath();
  }

  async continueWithAd() {
    for (const el of this.gameOverElements) el.setVisible(false);
    const rewarded = await showRewarded();
    // Защита: если за время показа рекламы игрок уже респавнился
    if (!this.isDead) return;
    if (rewarded) {
      this.isDead = false;
      this.continueUsed = true;
      this.player.body.allowGravity = true;
      this.player.body.setVelocity(0, -400);
      this.playerContainer.setAlpha(1);
      this.hintText.setText(t('click_hook'));
    } else {
      for (const el of this.gameOverElements) el.setVisible(true);
      if (this.continueUsed) {
        this.continueDom.setVisible(false);
      }
    }
  }

  async handleRestart() {
    trackGameEnd();
    if (shouldShowInterstitial()) {
      for (const el of this.gameOverElements) el.setVisible(false);
      await showInterstitial();
    }
    // Остановка + запуск — гарантированный чистый рестарт
    this.scene.stop('GameScene');
    this.scene.start('GameScene');
  }

  respawn() {
    this.isDead = false;
    for (const el of this.gameOverElements) el.setVisible(false);
    this.maxHeight = 0;
    this.continueUsed = false;
    this.bountyShown = false;
    this.moonReached = false;
    this.player.setPosition(this.W / 2, SPAWN_Y);
    this.player.body.reset(this.W / 2, SPAWN_Y);
    this.player.body.allowGravity = true;
    this.playerContainer.setAlpha(1);
    this.playerContainer.setRotation(0);
    this.trailPoints = [];
    this.hintText.setText(t('click_hook'));
  }

  // ===================== UPDATE =====================

  update(time, delta) {
    // Камера следит по обеим осям, X зажат чтобы не показывать пустоту
    const targetX = Phaser.Math.Clamp(
      this.player.x - this.W / 2,
      -this.W * 0.5,  // макс сдвиг влево
      this.W * 0.5    // макс сдвиг вправо
    );
    const targetY = this.player.y - this.H * 0.55;
    this.cameras.main.scrollX = Phaser.Math.Linear(
      this.cameras.main.scrollX, targetX, 0.1
    );
    this.cameras.main.scrollY = Phaser.Math.Linear(
      this.cameras.main.scrollY, targetY, 0.15
    );

    if (this.isDead) {
      this.updateSwampBubbles(delta);
      return;
    }

    // Маятник с ограничением раскачки
    if (this.isHooked && this.currentAnchor) {
      const dt = delta / 1000;
      const angularAccel = (GRAVITY / this.ropeLength) * Math.cos(this.swingAngle);
      this.swingSpeed += angularAccel * dt;
      this.swingSpeed *= 0.999;

      // Ограничение скорости и угла маятника (±60° от вертикали)
      this.swingSpeed = Phaser.Math.Clamp(this.swingSpeed, -2.5, 2.5);
      this.swingAngle += this.swingSpeed * dt;
      // PI/2 = вниз, допуск ±60° = PI/2 ± PI/3 = ~0.52 .. ~2.62
      this.swingAngle = Phaser.Math.Clamp(this.swingAngle, 0.52, 2.62);

      const newX = this.currentAnchor.x + Math.cos(this.swingAngle) * this.ropeLength;
      const newY = this.currentAnchor.y + Math.sin(this.swingAngle) * this.ropeLength;

      this.player.setPosition(newX, newY);
      this.player.body.reset(newX, newY);

      this.drawRope(this.currentAnchor.x, this.currentAnchor.y, newX, newY);
    } else {
      this.hookLine.clear();

      // Мягкие стенки — плавно возвращают к центру, сила растёт с удалением
      const dt2 = delta / 1000;
      if (this.player.x < 0) {
        this.player.body.velocity.x += 400 * dt2 * (1 + Math.abs(this.player.x) / this.W);
      } else if (this.player.x > this.W) {
        this.player.body.velocity.x -= 400 * dt2 * (1 + (this.player.x - this.W) / this.W);
      }
    }

    // Проверка смерти
    const deathY = GROUND_Y - 6;
    const playerBottom = this.player.y + 14;
    if (playerBottom >= deathY) {
      this.die();
      return;
    }

    // HUD
    const currentHeight = Math.max(0, Math.floor((GROUND_Y - this.player.y) / 10));
    if (currentHeight > this.maxHeight) {
      const prevMax = this.maxHeight;
      this.maxHeight = currentHeight;
      if (Math.floor(currentHeight / 10) > Math.floor(prevMax / 10) && currentHeight >= 10) {
        playRecord();
      }
    }
    this.heightText.setText(`${currentHeight}${t('unit_m')}`);
    this.maxHeightText.setText(`${t('record')}: ${Math.max(this.maxHeight, this.sessionBest)}${t('unit_m')}`);
    this.heightArrow.setX(this.heightText.x - this.heightText.width / 2 - 22);

    // --- Пасхалка: BOUNTY CLAIMED при 100m ---
    if (currentHeight >= BOUNTY_HEIGHT && !this.bountyShown) {
      this.bountyShown = true;
      this.showBountyBanner();
    }

    // --- Пасхалка: MOONWALKER при 300m+ ---
    if (currentHeight >= MOON_HEIGHT && !this.moonReached) {
      this.moonReached = true;
      this.showMoonwalker();
    }

    // Hunter rotation + coat animation
    this.coatTime += delta * 0.005;
    const vx = this.player.body.velocity.x;
    if (!this.isHooked) {
      const targetRot = Phaser.Math.Clamp(vx / 600, -0.4, 0.4);
      this.playerContainer.rotation += (targetRot - this.playerContainer.rotation) * 0.1;
    } else {
      const targetRot = (this.swingAngle - Math.PI / 2) * 0.3;
      this.playerContainer.rotation += (targetRot - this.playerContainer.rotation) * 0.15;
    }
    // Animate coat in wind
    const speed = Math.sqrt(vx * vx + (this.player.body.velocity.y || 0) ** 2);
    const swingContrib = this.isHooked ? Math.abs(this.swingSpeed) * 3 : 0;
    const coatIntensity = Math.min(1, (speed + swingContrib * 100) / 400);
    this.drawHunterPose(this.hunterGfx, this.coatTime * (1 + coatIntensity * 2));

    this.updateTrail(delta);
    this.updateSwampBubbles(delta);
  }

  // ===================== ROPE =====================

  drawRope(ax, ay, px, py) {
    this.hookLine.clear();

    const midX = (ax + px) / 2;
    const midY = (ay + py) / 2;
    const sagX = (py - ay) * 0.08;
    const sagY = this.ropeLength * 0.08;
    const cpX = midX + sagX;
    const cpY = midY + sagY;

    // Shadow
    this.hookLine.lineStyle(4, 0x000000, 0.15);
    this.drawBezier(this.hookLine, ax + 1, ay + 2, cpX + 1, cpY + 2, px + 1, py + 2);

    // Main rope (rusty)
    this.hookLine.lineStyle(2.5, RUST, 0.8);
    this.drawBezier(this.hookLine, ax, ay, cpX, cpY, px, py);

    // Highlight
    this.hookLine.lineStyle(1, 0xAA8855, 0.3);
    this.drawBezier(this.hookLine, ax, ay - 1, cpX, cpY - 1, px, py - 1);
  }

  drawBezier(gfx, x1, y1, cx, cy, x2, y2) {
    const steps = 20;
    gfx.beginPath();
    gfx.moveTo(x1, y1);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const it = 1 - t;
      gfx.lineTo(it * it * x1 + 2 * it * t * cx + t * t * x2,
                  it * it * y1 + 2 * it * t * cy + t * t * y2);
    }
    gfx.strokePath();
  }

  // ===================== TRAIL (embers) =====================

  updateTrail(delta) {
    const vx = this.player.body.velocity.x;
    const vy = this.player.body.velocity.y;
    const speed = Math.sqrt(vx * vx + vy * vy);
    const effectiveSpeed = this.isHooked
      ? Math.abs(this.swingSpeed) * this.ropeLength
      : speed;

    if (effectiveSpeed > TRAIL_SPEED_THRESHOLD) {
      this.trailPoints.push({
        x: this.player.x + (Math.random() - 0.5) * 6,
        y: this.player.y + (Math.random() - 0.5) * 6,
        life: 400,
        maxLife: 400,
        size: Math.min(5, 1.5 + effectiveSpeed / 250),
      });
    }

    this.trailGraphics.clear();
    for (let i = this.trailPoints.length - 1; i >= 0; i--) {
      const p = this.trailPoints[i];
      p.life -= delta;
      p.y -= delta * 0.01; // embers float up
      if (p.life <= 0) {
        this.trailPoints.splice(i, 1);
        continue;
      }
      const frac = p.life / p.maxLife;
      const alpha = frac * 0.6;
      const size = p.size * frac;
      // Ember: bright orange #FF6B00 → dark red → fade
      const r = Math.floor(255 * frac);
      const g = Math.floor(107 * frac * frac);
      const b = Math.floor(20 * frac * frac * frac);
      const hex = Phaser.Display.Color.GetColor(r, g, b);
      this.trailGraphics.fillStyle(hex, alpha);
      this.trailGraphics.fillCircle(p.x, p.y, size);
    }

    if (this.trailPoints.length > 80) {
      this.trailPoints.splice(0, this.trailPoints.length - 80);
    }
  }

  // ===================== SWAMP BUBBLES =====================

  updateSwampBubbles(delta) {
    // Spawn new bubbles near death zone
    if (Math.random() < 0.03) {
      this.swampBubbles.push({
        x: Phaser.Math.Between(20, this.W - 20),
        y: GROUND_Y - 10,
        size: 1.5 + Math.random() * 3,
        life: 800 + Math.random() * 1200,
        maxLife: 800 + Math.random() * 1200,
        speed: 5 + Math.random() * 12,
      });
    }

    this.swampBubbleGfx.clear();
    for (let i = this.swampBubbles.length - 1; i >= 0; i--) {
      const b = this.swampBubbles[i];
      b.life -= delta;
      b.y -= b.speed * delta / 1000;
      b.x += Math.sin(b.life * 0.005) * 0.3;
      if (b.life <= 0) {
        this.swampBubbles.splice(i, 1);
        continue;
      }
      const frac = b.life / b.maxLife;
      const alpha = frac * 0.25;
      this.swampBubbleGfx.lineStyle(1, 0x2a4a00, alpha);
      this.swampBubbleGfx.strokeCircle(b.x, b.y, b.size * frac);
    }

    if (this.swampBubbles.length > 20) {
      this.swampBubbles.splice(0, this.swampBubbles.length - 20);
    }
  }

  // ===================== ПАСХАЛКИ =====================

  // Баннер "BOUNTY CLAIMED!" при достижении 100m
  showBountyBanner() {
    playBounty();

    const banner = this.add.text(this.W / 2, -40, t('bounty'), {
      fontSize: '26px',
      fontFamily: FONT,
      fontStyle: 'bold',
      color: GOLD,
      stroke: '#3B1A00',
      strokeThickness: 5,
      backgroundColor: '#1a0f00cc',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(25);

    // Влетает сверху
    this.tweens.add({
      targets: banner,
      y: 130,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Остаётся 2 секунды, затем улетает вверх
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: banner,
            y: -60,
            alpha: 0,
            duration: 400,
            ease: 'Cubic.easeIn',
            onComplete: () => banner.destroy(),
          });
        });
      },
    });
  }

  // Секрет луны при 300m+ — луна светлеет, надпись "MOONWALKER"
  showMoonwalker() {
    playMoonwalker();
    saveMoon();

    // Яркая вспышка луны (добавляем свечение через graphics на HUD-слое)
    const moonGlow = this.add.graphics().setScrollFactor(0).setDepth(24);
    moonGlow.fillStyle(0x888866, 0.0);
    moonGlow.fillCircle(this.W * 0.72, 80, 50);

    // Анимация свечения луны
    let glowAlpha = 0;
    const glowTween = this.tweens.addCounter({
      from: 0,
      to: 40,
      duration: 1500,
      yoyo: true,
      onUpdate: (t) => {
        glowAlpha = t.getValue() / 100;
        moonGlow.clear();
        moonGlow.fillStyle(0xCCCCAA, glowAlpha);
        moonGlow.fillCircle(this.W * 0.72, 80, 55);
        moonGlow.fillStyle(0xEEEECC, glowAlpha * 0.5);
        moonGlow.fillCircle(this.W * 0.72, 80, 35);
      },
      onComplete: () => {
        this.time.delayedCall(3000, () => {
          this.tweens.add({
            targets: moonGlow,
            alpha: 0,
            duration: 2000,
            onComplete: () => moonGlow.destroy(),
          });
        });
      },
    });

    // Надпись "MOONWALKER"
    const txt = this.add.text(this.W / 2, 180, t('moonwalker'), {
      fontSize: '20px',
      fontFamily: FONT,
      fontStyle: 'italic',
      color: '#AAAAAA',
      stroke: '#0d0800',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(25).setAlpha(0);

    this.tweens.add({
      targets: txt,
      alpha: 0.8,
      duration: 1000,
      hold: 2500,
      yoyo: true,
      onComplete: () => txt.destroy(),
    });
  }
}
