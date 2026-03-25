import Phaser from 'phaser';
import { playHook, playAttach, playRelease, playDeath, playRecord, playBugHit } from '../audio.js';
import { getBest, saveBest } from '../storage.js';
import { trackGameEnd, shouldShowInterstitial, showInterstitial, showRewarded } from '../ads.js';
import { isTelegram, purchaseContinue, saveScoreOnline, saveChallengeOnline } from '../telegram.js';
import { t } from '../i18n.js';
import {
  GRAVITY, HOOK_RANGE, MAX_ROPE_LENGTH, WORLD_HEIGHT, GROUND_Y, SPAWN_Y,
  MIN_ROPE, SWING_FRICTION, RELEASE_BOOST, HOOK_COOLDOWN,
  FALL_SPEED_PENALTY_START, FALL_SPEED_PENALTY_MAX, HOOK_RANGE_FALLING_MIN, MIN_SWING_SPEED, Z,
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
import { ObstacleManager } from '../managers/ObstacleManager.js';
import { ChallengeManager } from '../managers/ChallengeManager.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  // Полная очистка при остановке сцены
  shutdown() {
    this.input.off('pointerdown');
    this.gameOverUI.destroy();
    this.biome.destroy();
    this.obstacles.destroy();
    this.trail.destroy();
    this.rope.destroy();
    this.swamp.destroy();
    this.hunter.destroy();
    this.anchorMgr.destroy();
    this.challengeMgr = null;
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
    this.lastReleaseTime = 0;    // Кулдаун хука
    this.bugHitCooldown = 0;     // Защита от повторных ударов жуков

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

    // Ghost — визуальный клон для wrap-around
    this.ghostContainer = this.add.container(-9999, -9999).setDepth(Z.PLAYER);
    this.ghostGfx = this.add.graphics();
    this.ghostContainer.add(this.ghostGfx);
    this.ghostContainer.setVisible(false);

    // Менеджеры подсистем
    this.trail = new TrailManager(this);
    this.trail.create();

    this.rope = new RopeRenderer(this);
    this.rope.create();

    this.anchorMgr = new AnchorManager(this);
    this.anchorMgr.create();

    this.obstacles = new ObstacleManager(this);
    this.obstacles.create();

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
        this.gameOverUI.hide();
        this.gameOverUI.destroy();
        this.scene.stop('GameScene');
        this.scene.start('MenuScene');
      },
    });

    this.eggs = new EasterEggs(this);

    // Еженедельные испытания
    this.challengeMgr = new ChallengeManager();
    this.hitCount = 0; // счётчик столкновений с жуками за игру
    this.gameStartTime = Date.now(); // время старта для анти-чита

    // Камера — X фиксирована, Y следит за игроком
    this.cameras.main.scrollX = 0;
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
    // Кулдаун — нельзя мгновенно перецепиться
    if (this.time.now - this.lastReleaseTime < HOOK_COOLDOWN) return;

    const px = this.player.x;
    const py = this.player.y;
    const vy = this.player.body.velocity.y;

    // Штраф за падение: чем быстрее падаешь, тем меньше радиус зацепа
    const fallSpeed = Math.max(0, vy);
    const penalty = Phaser.Math.Clamp(
      (fallSpeed - FALL_SPEED_PENALTY_START) / (FALL_SPEED_PENALTY_MAX - FALL_SPEED_PENALTY_START),
      0, 1
    );
    const effectiveRange = HOOK_RANGE * (1 - penalty * (1 - HOOK_RANGE_FALLING_MIN));

    let nearest = null;
    let minDist = Infinity;

    for (const anchor of this.anchorMgr.anchors) {
      // Якоря выше — полный радиус, якоря ниже — уменьшенный (но не запрещены)
      const isBelow = anchor.y > py + 50;
      const range = isBelow ? effectiveRange * 0.5 : effectiveRange;
      const dist = Phaser.Math.Distance.Between(px, py, anchor.x, anchor.y);
      if (dist < minDist && dist < range) {
        minDist = dist;
        nearest = anchor;
      }
    }

    // Промах — нет якорей в радиусе
    if (!nearest) return;

    const vx = this.player.body.velocity.x;

    this.isHooked = true;
    this.currentAnchor = nearest;
    this.ropeLength = Phaser.Math.Clamp(minDist, MIN_ROPE, MAX_ROPE_LENGTH);

    this.player.body.allowGravity = false;
    this.player.body.setVelocity(0, 0);

    const dx = px - nearest.x;
    const dy = py - nearest.y;
    this.swingAngle = Math.atan2(dy, dx);

    // Конвертируем инерцию полёта в угловую скорость маятника
    const tangent = -vx * Math.sin(this.swingAngle) + vy * Math.cos(this.swingAngle);
    this.swingSpeed = tangent / this.ropeLength;

    // Начальный толчок — достаточный для раскачки, но не для перелёта
    if (Math.abs(this.swingSpeed) < MIN_SWING_SPEED) {
      const dir = Math.sign(this.swingSpeed) || (px < nearest.x ? -1 : 1);
      this.swingSpeed = dir * MIN_SWING_SPEED;
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
    this.lastReleaseTime = this.time.now; // Старт кулдауна

    // Скорость при отпускании — касательная к дуге + boost для game feel
    const speed = this.swingSpeed * this.ropeLength * RELEASE_BOOST;
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

    // Сохраняем рекорд онлайн (fire-and-forget)
    if (isNewBest && this.maxHeight > 0) {
      saveScoreOnline(this.maxHeight);
    }

    // Обновляем прогресс еженедельного испытания ПЕРЕД show() —
    // чтобы кнопка CLAIM SKIN появилась сразу при завершении челленджа
    this.challengeMgr.updateProgress({
      height: this.maxHeight,
      hitCount: this.hitCount,
      gamesPlayed: 1,
    });

    // Серверная верификация (fire-and-forget, не блокирует UI)
    const gameTime = (Date.now() - this.gameStartTime) / 1000;
    saveChallengeOnline(this.maxHeight, this.hitCount, gameTime);

    this.gameOverUI.show(this.maxHeight, this.sessionBest, isNewBest && this.maxHeight > 0, this.continueUsed);

    playDeath();
  }

  async continueWithAd() {
    // НЕ скрываем UI до результата — просто ждём ответ
    const rewarded = isTelegram()
      ? await purchaseContinue()
      : await showRewarded();
    if (!this.isDead) return;
    if (!this.scene.isActive()) return;

    if (rewarded) {
      // Успех — скрываем UI и респавним
      this.gameOverUI.hide();
      this.isDead = false;
      this.continueUsed = true;

      const targetHeight = this.maxHeight > 0 ? this.maxHeight : 20;
      const targetY = GROUND_Y - targetHeight * 10;

      this.anchorMgr.generateAnchorsUpTo(targetY - 1500);
      this.obstacles.generateUpTo(targetY - 1500, this.anchorMgr.anchors);

      this.player.setPosition(this.W / 2, targetY);
      this.player.body.reset(this.W / 2, targetY);
      this.player.body.allowGravity = true;
      this.player.body.setVelocity(0, -300);
      this.playerContainer.setAlpha(1);

      this.cameras.main.scrollY = targetY - this.H * 0.55;
      this.hud.setHint('click_hook');
    }
    // Отмена — ничего не делаем, кнопки уже видны
  }

  async handleRestart() {
    trackGameEnd();
    this.gameOverUI.hide();
    if (!isTelegram() && shouldShowInterstitial()) {
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
    this.hitCount = 0;
    this.gameStartTime = Date.now(); // сброс таймера при респавне
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
    // ===== 1. Wrap-around (только в свободном полёте) =====
    if (!this.isDead && !this.isHooked) {
      if (this.player.x < 0 || this.player.x > this.W) {
        const offset = this.player.x < 0 ? this.W : -this.W;
        const body = this.player.body;
        this.player.x += offset;
        body.position.x += offset;
        body.prev.x += offset;
        body.prevFrame.x += offset;
      }
    }

    // ===== 2. Ghost sprite — только в свободном полёте у края =====
    const edgeZone = 50;
    const showGhost = !this.isDead && !this.isHooked
      && (this.player.x < edgeZone || this.player.x > this.W - edgeZone);

    if (showGhost) {
      const ghostX = this.player.x < this.W / 2
        ? this.player.x + this.W
        : this.player.x - this.W;
      this.ghostContainer.setPosition(ghostX, this.player.y);
      this.ghostContainer.setRotation(this.playerContainer.rotation);
      this.ghostContainer.setAlpha(this.playerContainer.alpha);
      this.ghostContainer.setVisible(true);
      this.hunter.drawPose(this.ghostGfx, this.hunter.coatTime);
    } else {
      this.ghostContainer.setVisible(false);
    }

    // ===== 3. Камера — X следит при hooked, Y всегда =====
    if (this.isHooked) {
      // На маятнике камера плавно следит по X чтобы игрок не исчезал за краем
      const targetX = Phaser.Math.Clamp(
        this.player.x - this.W / 2,
        -this.W * 0.3,
        this.W * 0.3
      );
      this.cameras.main.scrollX = Phaser.Math.Linear(
        this.cameras.main.scrollX, targetX, 0.08
      );
    } else {
      // В свободном полёте — плавно возвращаем камеру к центру
      this.cameras.main.scrollX = Phaser.Math.Linear(
        this.cameras.main.scrollX, 0, 0.1
      );
    }
    const targetY = this.player.y - this.H * 0.55;
    this.cameras.main.scrollY = Phaser.Math.Linear(
      this.cameras.main.scrollY, targetY, 0.15
    );

    this.biome.update(this.player.y);

    if (this.isDead) {
      this.swamp.update(delta);
      return;
    }

    // ===== 4. Физика маятника =====
    if (this.isHooked && this.currentAnchor) {
      const dt = delta / 1000;
      const angularAccel = (GRAVITY / this.ropeLength) * Math.cos(this.swingAngle);
      this.swingSpeed += angularAccel * dt;
      this.swingSpeed *= SWING_FRICTION;

      this.swingAngle += this.swingSpeed * dt;

      const newX = this.currentAnchor.x + Math.cos(this.swingAngle) * this.ropeLength;
      const newY = this.currentAnchor.y + Math.sin(this.swingAngle) * this.ropeLength;

      this.player.setPosition(newX, newY);
      this.player.body.reset(newX, newY);

      this.rope.draw(this.currentAnchor.x, this.currentAnchor.y, newX, newY, this.ropeLength);
    } else {
      this.rope.clear();
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

    // Генерация и cleanup жуков
    this.obstacles.generateUpTo(this.player.y - 2000, this.anchorMgr.anchors);
    this.obstacles.update(delta, this.player.y);

    // Коллизия с жуками — сброс с крюка + визуальный фидбек
    if (!this.isDead && this.bugHitCooldown <= 0
        && this.obstacles.checkCollision(this.player.x, this.player.y)) {
      this.hitCount++;
      if (this.isHooked) this.releaseHook();
      // Откидывание вниз и в сторону
      const knockX = (Math.random() - 0.5) * 300;
      this.player.body.setVelocity(knockX, 400);
      this.bugHitCooldown = 2000; // 2s неуязвимости (совпадает с визуалом)

      // Звук удара
      playBugHit();

      // Визуал: shake + flash
      this.cameras.main.shake(250, 0.012);
      this.cameras.main.flash(150, 255, 80, 30, true);

      // Мигание игрока (alpha pulse) → возврат к нормальному через 2 сек
      this.playerContainer.setAlpha(0.4);
      this.tweens.add({
        targets: this.playerContainer,
        alpha: { from: 0.3, to: 0.6 },
        duration: 100,
        repeat: 5,
        yoyo: true,
        onComplete: () => {
          // Через 2 сек плавно возвращаем полную яркость
          this.time.delayedCall(1500, () => {
            if (this.playerContainer && !this.isDead) {
              this.tweens.add({
                targets: this.playerContainer,
                alpha: 1,
                duration: 400,
              });
            }
          });
        },
      });
    }
    // Обновление кулдауна
    if (this.bugHitCooldown > 0) this.bugHitCooldown -= delta;

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
