import Phaser from 'phaser';
import { playHook, playAttach, playRelease, playDeath, playRecord } from '../audio.js';
import { getBest, saveBest } from '../storage.js';
import { trackGameEnd, shouldShowInterstitial, showInterstitial, showRewarded } from '../ads.js';
import { t } from '../i18n.js';
import {
  GRAVITY, HOOK_RANGE, MAX_ROPE_LENGTH, WORLD_HEIGHT, GROUND_Y, SPAWN_Y,
  MIN_ROPE, SWING_FRICTION, Z,
} from '../constants.js';

import { AnchorManager } from '../managers/AnchorManager.js';
import { TrailManager } from '../managers/TrailManager.js';
import { HUDManager } from '../managers/HUDManager.js';
import { SwampManager } from '../managers/SwampManager.js';
import { RopeRenderer } from '../managers/RopeRenderer.js';
import { HunterRenderer } from '../managers/HunterRenderer.js';
import { GameOverUI } from '../managers/GameOverUI.js';
import { EasterEggs } from '../managers/EasterEggs.js';
import { BiomeManager } from '../managers/BiomeManager.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // Удалить HTML кнопки при остановке сцены
  shutdown() {
    this.gameOverUI.destroy();
  }

  create() {
    // Динамические размеры экрана
    const WORLD_WIDTH = this.scale.width;
    this.W = WORLD_WIDTH;
    this.H = this.scale.height;

    // Мир бесконечный по горизонтали, ограничен только снизу
    this.physics.world.setBounds(0, -999999, this.W, 999999 + this.H);

    // Состояние физики маятника
    this.isHooked = false;
    this.currentAnchor = null;
    this.ropeLength = 0;
    this.swingAngle = 0;
    this.swingSpeed = 0;
    this.maxHeight = 0;
    this.sessionBest = getBest();
    this.isDead = false;
    this.continueUsed = false;

    this.biome = new BiomeManager(this);
    this.biome.create();

    // --- PLAYER (hunter) ---
    this.playerContainer = this.add.container(this.W / 2, SPAWN_Y).setDepth(Z.PLAYER);
    this.hunter = new HunterRenderer(this);
    this.hunter.create(this.playerContainer);
    this.physics.add.existing(this.playerContainer);
    this.playerContainer.body.setSize(20, 28);
    this.playerContainer.body.setOffset(-10, -14);
    // Ограничение горизонтальной скорости чтобы не улетал за экран
    this.playerContainer.body.setMaxVelocity(900, 1200);
    this.player = this.playerContainer;

    // Менеджеры подсистем
    this.trail = new TrailManager(this);
    this.trail.create();

    this.rope = new RopeRenderer(this);
    this.rope.create();

    this.anchorMgr = new AnchorManager(this);
    this.anchorMgr.create();

    this.swamp = new SwampManager(this);
    this.swamp.create();

    this.hud = new HUDManager(this);
    this.hud.create();

    this.gameOverUI = new GameOverUI(this);
    this.gameOverUI.create({
      onContinue: () => this.continueWithAd(),
      onRestart: () => this.handleRestart(),
      onMenu: () => {
        trackGameEnd();
        this.scene.stop('GameScene');
        this.scene.start('MenuScene');
      },
    });

    this.eggs = new EasterEggs(this);

    // Камера — ручное управление по обеим осям в update()
    this.cameras.main.scrollX = this.player.x - this.cameras.main.width / 2;
    this.cameras.main.scrollY = this.player.y - this.cameras.main.height / 2;

    // Input
    this.input.on('pointerdown', () => this.handlePointerDown());

    this.cameras.main.fadeIn(400, 13, 15, 18);
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

    for (const anchor of this.anchorMgr.anchors) {
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
    // Верёвка: min 40px (стабильность), max 160px (короткие качели, нет халявы)
    this.ropeLength = Phaser.Math.Clamp(minDist, MIN_ROPE, MAX_ROPE_LENGTH);

    this.player.body.allowGravity = false;
    this.player.body.setVelocity(0, 0);

    const dx = px - nearest.x;
    const dy = py - nearest.y;
    this.swingAngle = Math.atan2(dy, dx);

    // Конвертируем инерцию полёта в угловую скорость маятника
    const tangent = -vx * Math.sin(this.swingAngle) + vy * Math.cos(this.swingAngle);
    this.swingSpeed = tangent / this.ropeLength;

    // Начальный импульс слабее — нужна инерция от предыдущего качения
    if (Math.abs(this.swingSpeed) < 0.5) {
      this.swingSpeed = px < nearest.x ? -1.2 : 1.2;
    }

    this.anchorMgr.highlightAnchor(nearest, true);

    playHook();
    this.time.delayedCall(80, () => playAttach());

    this.hud.setHint('click_release');
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
      this.anchorMgr.highlightAnchor(this.currentAnchor, false);
      this.currentAnchor = null;
    }

    this.rope.clear();
    this.hud.setHint('click_hook');
    playRelease();
  }

  // ===================== DEATH / RESPAWN =====================

  die() {
    this.isDead = true;
    if (this.isHooked) this.releaseHook();
    this.player.body.setVelocity(0, 0);
    this.player.body.allowGravity = false;

    this.cameras.main.shake(400, 0.02);
    this.cameras.main.flash(400, 140, 20, 10);

    this.tweens.add({
      targets: this.playerContainer,
      alpha: 0.2,
      duration: 400,
    });

    const isNewBest = saveBest(this.maxHeight);
    this.sessionBest = getBest();

    const lastHeight = Math.max(0, Math.floor((GROUND_Y - this.player.y) / 10));
    this.gameOverUI.show(lastHeight, this.sessionBest, isNewBest && this.maxHeight > 0, this.continueUsed);

    playDeath();
  }

  async continueWithAd() {
    this.gameOverUI.hide();
    const rewarded = await showRewarded();
    if (!this.isDead) return;
    if (rewarded) {
      this.isDead = false;
      this.continueUsed = true;

      // Респавн на высоте текущей попытки (где только что умер)
      const targetHeight = this.maxHeight > 0 ? this.maxHeight : 20;
      const targetY = GROUND_Y - targetHeight * 10;

      // Генерируем якоря до этой высоты чтобы было за что цепляться
      this.anchorMgr.generateAnchorsUpTo(targetY - 1500);

      this.player.setPosition(this.W / 2, targetY);
      this.player.body.reset(this.W / 2, targetY);
      this.player.body.allowGravity = true;
      this.player.body.setVelocity(0, -300);
      this.playerContainer.setAlpha(1);

      // Камера сразу на новую позицию
      this.cameras.main.scrollY = targetY - this.H * 0.55;

      this.hud.setHint('click_hook');
    } else {
      for (const el of this.gameOverUI.elements) el.setVisible(true);
      this.gameOverUI.buttonsDiv.style.display = 'flex';
      this.gameOverUI.continueBtn.style.display = this.continueUsed ? 'none' : 'block';
    }
  }

  async handleRestart() {
    trackGameEnd();
    this.gameOverUI.hide();
    if (shouldShowInterstitial()) {
      await showInterstitial();
    }
    this.scene.stop('GameScene');
    this.scene.start('GameScene');
  }

  respawn() {
    this.isDead = false;
    this.gameOverUI.hide();
    this.maxHeight = 0;
    this.continueUsed = false;
    this.eggs.reset();
    this.player.setPosition(this.W / 2, SPAWN_Y);
    this.player.body.reset(this.W / 2, SPAWN_Y);
    this.player.body.allowGravity = true;
    this.playerContainer.setAlpha(1);
    this.playerContainer.setRotation(0);
    this.trail.reset();
    this.hud.setHint('click_hook');
  }

  // ===================== UPDATE =====================

  update(time, delta) {
    // Камера следит по обеим осям, X зажат чтобы не показывать пустоту
    const targetX = Phaser.Math.Clamp(
      this.player.x - this.W / 2,
      -this.W * 0.5,
      this.W * 0.5
    );
    const targetY = this.player.y - this.H * 0.55;
    this.cameras.main.scrollX = Phaser.Math.Linear(
      this.cameras.main.scrollX, targetX, 0.1
    );
    this.cameras.main.scrollY = Phaser.Math.Linear(
      this.cameras.main.scrollY, targetY, 0.15
    );

    this.biome.update(this.player.y);

    if (this.isDead) {
      this.swamp.update(delta);
      return;
    }

    // Маятник с ограничением раскачки
    if (this.isHooked && this.currentAnchor) {
      const dt = delta / 1000;
      const angularAccel = (GRAVITY / this.ropeLength) * Math.cos(this.swingAngle);
      this.swingSpeed += angularAccel * dt;
      this.swingSpeed *= SWING_FRICTION; // 0.997 — маятник быстрее теряет энергию

      // Полные 360° — без ограничений угла
      this.swingAngle += this.swingSpeed * dt;

      const newX = this.currentAnchor.x + Math.cos(this.swingAngle) * this.ropeLength;
      const newY = this.currentAnchor.y + Math.sin(this.swingAngle) * this.ropeLength;

      this.player.setPosition(newX, newY);
      this.player.body.reset(newX, newY);

      this.rope.draw(this.currentAnchor.x, this.currentAnchor.y, newX, newY, this.ropeLength);
    } else {
      this.rope.clear();

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
    this.hud.updateHeight(currentHeight, this.maxHeight, this.sessionBest);

    // Процедурная генерация и cleanup якорей
    this.anchorMgr.generateAnchorsUpTo(this.player.y - 2000);
    this.anchorMgr.cleanup(this.player.y);

    // Пасхалки
    this.eggs.check(currentHeight);

    // Hunter animation
    const vx = this.player.body.velocity.x;
    const vy = this.player.body.velocity.y;
    this.hunter.updateAnimation(
      delta, this.playerContainer, vx, vy,
      this.swingSpeed, this.swingAngle, this.isHooked
    );

    // Trail
    const effectiveSpeed = this.isHooked
      ? Math.abs(this.swingSpeed) * this.ropeLength
      : Math.sqrt(vx * vx + vy * vy);
    this.trail.update(delta, this.player.x, this.player.y, effectiveSpeed);

    // Swamp bubbles
    this.swamp.update(delta);
  }
}
