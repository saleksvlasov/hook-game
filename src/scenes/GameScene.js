import Phaser from 'phaser';
import { playHook, playAttach, playRelease, playDeath, playRecord, playBugHit } from '../audio.js';
import { getBest, saveBest } from '../storage.js';
import { trackGameEnd, shouldShowInterstitial, showInterstitial, showRewarded } from '../ads.js';
import { isTelegram, purchaseContinue, saveScoreOnline, saveChallengeOnline, trackEvent } from '../telegram.js';
import { t } from '../i18n.js';
import { GROUND_Y, SPAWN_Y, Z } from '../constants.js';

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
import { SwingPhysics } from '../managers/SwingPhysics.js';

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
    this.lastReleaseTime = 0;    // Кулдаун хука
    this.bugHitCooldown = 0;     // Защита от повторных ударов жуков

    // Физика маятника — чистые расчёты
    this.physics_ = new SwingPhysics();

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

    // Еженедельные испытания — создаём ДО HUD и GameOverUI (единый экземпляр)
    this.challengeMgr = new ChallengeManager();
    this.hitCount = 0;
    this.gameStartTime = Date.now();

    this.hud = new HUDManager(this);
    this.hud.create(this.challengeMgr);

    this.gameOverUI = new GameOverUI(this);
    this.gameOverUI.create({
      onContinueAd: () => this.continueWithAd(),
      onContinueStars: () => this.continueWithStars(),
      onRestart: () => this.handleRestart(),
      onMenu: () => {
        trackGameEnd();
        this.gameOverUI.hide();
        this.gameOverUI.destroy();
        this.scene.stop('GameScene');
        this.scene.start('MenuScene');
      },
      challengeMgr: this.challengeMgr,
    });

    this.eggs = new EasterEggs(this);

    // Камера — X фиксирована, Y следит за игроком
    this.cameras.main.scrollX = 0;
    this.cameras.main.scrollY = this.player.y - this.cameras.main.height / 2;

    // Input
    this.input.on('pointerdown', () => this.handlePointerDown());

    this.cameras.main.fadeIn(400, 13, 15, 18);

    // Регистрация cleanup при остановке сцены
    this.events.once('shutdown', () => this.shutdown());
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
    const vx = this.player.body.velocity.x;
    const vy = this.player.body.velocity.y;

    const result = this.physics_.tryHook(
      px, py, vx, vy,
      this.anchorMgr.anchors, this.time.now, this.lastReleaseTime, this.W
    );

    // Промах — нет якорей в радиусе или кулдаун
    if (!result) return;

    this.isHooked = true;
    this.currentAnchor = result.anchor;
    this.ropeLength = result.ropeLength;
    this.swingAngle = result.swingAngle;
    this.swingSpeed = result.swingSpeed;

    this.player.body.allowGravity = false;
    this.player.body.setVelocity(0, 0);

    this.anchorMgr.highlightAnchor(result.anchor, true);

    // Haptic — короткий тик при зацепе
    navigator.vibrate?.(15);

    playHook();
    this.time.delayedCall(80, () => playAttach());

    this.hud.setHint('click_release');
  }

  releaseHook() {
    if (!this.isHooked) return;

    this.isHooked = false;
    this.player.body.allowGravity = true;
    this.lastReleaseTime = this.time.now; // Старт кулдауна

    // Скорость при отпускании — касательная к дуге + boost
    const vel = this.physics_.calcRelease(this.swingAngle, this.swingSpeed, this.ropeLength);
    this.player.body.setVelocity(vel.vx, vel.vy);

    if (this.currentAnchor) {
      this.anchorMgr.highlightAnchor(this.currentAnchor, false);
      this.currentAnchor = null;
    }

    this.rope.clear();
    this.hud.setHint('click_hook');

    // Haptic — лёгкий тик при отпускании
    navigator.vibrate?.(10);

    playRelease();
  }

  // ===================== DEATH / RESPAWN =====================

  die() {
    this.isDead = true;
    if (this.isHooked) this.releaseHook();
    this.player.body.setVelocity(0, 0);
    this.player.body.allowGravity = false;

    // Haptic — тяжёлый паттерн при смерти
    navigator.vibrate?.([50, 30, 80]);

    this.cameras.main.shake(400, 0.02);
    this.cameras.main.flash(400, 140, 20, 10);

    this.tweens.add({
      targets: this.playerContainer,
      alpha: 0.2,
      duration: 400,
    });

    const isNewBest = saveBest(this.maxHeight);
    this.sessionBest = getBest();

    // Сохраняем рекорд онлайн ВСЕГДА — сервер сам решает обновлять ли
    if (this.maxHeight > 0) {
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

    this.gameOverUI.show(this.maxHeight, this.sessionBest, isNewBest && this.maxHeight > 0);

    // Аналитика смерти
    trackEvent('death', { height: this.maxHeight, gameTime });

    playDeath();
  }

  // Воскрешение через rewarded ad (бесплатно, без лимита)
  async continueWithAd() {
    trackEvent('ad_shown', { height: this.maxHeight });
    const rewarded = await showRewarded();
    if (!this.isDead || !this.scene.isActive()) return;
    if (rewarded) {
      trackEvent('ad_completed', { height: this.maxHeight });
      this._respawnPlayer();
    } else {
      trackEvent('ad_skipped', { height: this.maxHeight });
    }
  }

  // Воскрешение через Stars (платно, без лимита)
  async continueWithStars() {
    trackEvent('stars_attempt', { height: this.maxHeight });
    const paid = await purchaseContinue();
    if (!this.isDead || !this.scene.isActive()) return;
    if (paid) {
      trackEvent('stars_success', { height: this.maxHeight });
      this._respawnPlayer();
    } else {
      trackEvent('stars_fail', { height: this.maxHeight });
    }
  }

  // Общий респавн после любого типа воскрешения
  _respawnPlayer() {
    this.gameOverUI.hide();
    this.isDead = false;

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

  async handleRestart() {
    trackGameEnd();
    this.gameOverUI.hide();
    if (!isTelegram() && shouldShowInterstitial()) {
      await showInterstitial();
    }
    this.scene.stop('GameScene');
    this.scene.start('GameScene');
  }

  // ===================== UPDATE =====================

  update(time, delta) {
    // ===== 1. Wrap-around (только в свободном полёте) =====
    if (!this.isDead && !this.isHooked) {
      const offset = this.physics_.wrapX(this.player.x, this.W);
      if (offset !== 0) {
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
      const result = this.physics_.updatePendulum(dt, this.currentAnchor, {
        angle: this.swingAngle,
        speed: this.swingSpeed,
        ropeLen: this.ropeLength,
      });

      this.swingAngle = result.angle;
      this.swingSpeed = result.speed;

      this.player.setPosition(result.x, result.y);
      this.player.body.reset(result.x, result.y);

      this.rope.draw(this.currentAnchor.x, this.currentAnchor.y, result.x, result.y, this.ropeLength);
    } else {
      this.rope.clear();
    }

    // Смерть: упал ниже самого нижнего якоря + 1.5 экрана = проиграл
    const lowestAnchorY = this.anchorMgr.getLowestY();
    const deathY = Math.min(GROUND_Y - 6, lowestAnchorY + this.H * 1.5);
    if (this.player.y > deathY) {
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

      // Haptic — паттерн удара при столкновении с жуком
      navigator.vibrate?.([30, 20, 30]);

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
