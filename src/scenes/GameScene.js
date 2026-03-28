import { Scene } from '../engine/Scene.js';
import { clamp, lerp } from '../engine/math.js';
import { playHook, playAttach, playRelease, playDeath, playRecord, playBugHit, playHeartPickup, playCountdownTick, playCountdownGo, playTierUp } from '../audio.js';
import { profile } from '../data/index.js';
import { trackGameEnd, shouldShowInterstitial, showInterstitial, showRewarded } from '../ads.js';
import { isTelegram, purchaseContinue, trackEvent } from '../telegram.js';
import { t } from '../i18n.js';
import { GROUND_Y, SPAWN_Y, HEARTS_MAX, HEARTS_MAX_BONUS, HEART_BONUS_DURATION, EMBER_MILESTONES, EMBER_RATE } from '../constants.js';
import { getEffectiveConstants } from '../managers/UpgradeApplicator.js';

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
import { PowerArcManager } from '../managers/PowerArcManager.js';

export class GameScene extends Scene {
  // Приватные поля
  #heartsDisabled = false;
  #ghostVisible = false;
  #ghostX = 0;
  #ghostY = 0;
  #onPointerDown;
  #onPointerUp;
  #blinkActive = false;
  #blinkTime = 0;
  #blinkDuration = 0;
  #invulnTime = 0;
  #delayedCalls = [];
  #countdownActive = false;
  #countdown = 0;
  #countdownTime = 0;
  #lastPowerTier = -1;
  // Quick Retry
  #quickRetryActive = false;
  #quickRetryTime = 0;
  #swipeStartY = -1;
  #pendingInterstitial = false;
  #isNewBest = false;
  #pendingQuickTap = false;
  // Embers
  #embersEarned = 0;
  #lastEmberHeight = 0;
  #emberFrac = 0;
  #milestonesClaimed = new Set();
  #effectiveConsts = null;

  constructor(engine) {
    super(engine);
  }

  shutdown() {
    this.input.off('pointerdown', this.#onPointerDown);
    this.input.off('pointerup', this.#onPointerUp);
    this.gameOverUI.destroy();
    this.biome.destroy();
    this.obstacles.destroy();
    this.trail.destroy();
    this.rope.destroy();
    this.swamp.destroy();
    this.hunter.destroy();
    this.anchorMgr.destroy();
    this.powerArc.destroy();
    if (this.challengeMgr) this.challengeMgr.destroy();
    this.challengeMgr = null;
  }

  create() {
    // Динамические размеры
    const WORLD_WIDTH = this.W;

    // Состояние игрока — ручная физика вместо Phaser arcade
    this.player = {
      x: WORLD_WIDTH / 2,
      y: SPAWN_Y,
      vx: 0,
      vy: 0,
      allowGravity: true,
      alpha: 1,
      rotation: 0,
    };

    // Состояние физики маятника
    this.isHooked = false;
    this.currentAnchor = null;
    this.ropeLength = 0;
    this.swingAngle = 0;
    this.swingSpeed = 0;
    this.maxHeight = 0;
    this.sessionBest = profile.bestScore;
    this.isDead = false;
    this.lastReleaseTime = 0;
    this.bugHitCooldown = 0;

    // Апгрейды — вычисляем эффективные константы
    this.#effectiveConsts = getEffectiveConstants();

    // Hearts / Lives (с учётом Iron Heart)
    this.hearts = this.#effectiveConsts.startHearts;
    this.maxHearts = this.#effectiveConsts.startHearts;
    this.heartBonusTimer = 0;
    this.#heartsDisabled = false;    // true = 0 сердец, падение без хука

    // Физика маятника — чистые расчёты
    this.physics_ = new SwingPhysics();

    this.biome = new BiomeManager(this);
    this.biome.create();

    // Hunter renderer
    this.hunter = new HunterRenderer(this);
    this.hunter.create();

    // Ghost — данные для wrap-around клона
    this.#ghostVisible = false;
    this.#ghostX = 0;
    this.#ghostY = 0;

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

    // Еженедельные испытания
    this.challengeMgr = new ChallengeManager();
    this.hitCount = 0;
    this.gameStartTime = Date.now();

    this.hud = new HUDManager(this);
    this.hud.create(this.challengeMgr);
    this.hud.setPerkLevels(this.#effectiveConsts.perkLevels);

    this.gameOverUI = new GameOverUI(this);
    this.gameOverUI.create({
      onContinueAd: () => this.continueWithAd(),
      onContinueStars: () => this.continueWithStars(),
      onRestart: () => this.handleRestart(),
      onMenu: () => {
        trackGameEnd();
        this.gameOverUI.hide();
        this.gameOverUI.destroy();
        this.startScene('MenuScene');
      },
      challengeMgr: this.challengeMgr,
    });

    // Power Arc — визуальная прогрессия по высоте
    this.powerArc = new PowerArcManager();
    this.#lastPowerTier = -1;

    this.eggs = new EasterEggs(this);
    this.eggs.onHeartBonus = () => {
      if (this.hearts < HEARTS_MAX) {
        // Восстановить все сердца
        this.hearts = HEARTS_MAX;
        this.maxHearts = HEARTS_MAX;
      } else {
        // Бонусное 4-е сердце на 40 секунд
        this.maxHearts = HEARTS_MAX_BONUS;
        this.hearts = HEARTS_MAX_BONUS;
        this.heartBonusTimer = HEART_BONUS_DURATION;
      }
      this.hud.updateHearts(this.hearts, this.maxHearts, this.heartBonusTimer);
    };

    // HUD hearts
    this.hud.updateHearts(this.hearts, this.maxHearts, this.heartBonusTimer);

    // Камера
    this.camera.scrollX = 0;
    this.camera.scrollY = this.player.y - this.H / 2;

    // Input
    this.#onPointerDown = (e) => this.handlePointerDown(e);
    this.#onPointerUp = (e) => this.handlePointerUp(e);
    this.input.on('pointerdown', this.#onPointerDown);
    this.input.on('pointerup', this.#onPointerUp);

    this.camera.fadeIn(400, 13, 15, 18);

    // Анимация мигания при ударе жуком
    this.#blinkActive = false;
    this.#blinkTime = 0;
    this.#blinkDuration = 0;
    this.#invulnTime = 0;

    // Delayed calls (замена this.time.delayedCall)
    this.#delayedCalls = [];

    // Обратный отсчёт при воскрешении
    this.#countdownActive = false;
    this.#countdown = 0;
    this.#countdownTime = 0;

    // Embers tracking
    this.#embersEarned = 0;
    this.#lastEmberHeight = 0;
    this.#emberFrac = 0;
    this.#milestonesClaimed = new Set();
  }

  // ===================== INPUT =====================

  handlePointerDown(pointer) {
    // Quick retry: тап = instant restart, свайп вверх = full GameOver
    if (this.#quickRetryActive) {
      this.#swipeStartY = pointer?.y ?? -1;
      if (this.#quickRetryTime > 200) {
        // Не свайп — тап для restart (проверяем свайп в pointerup)
        this.#pendingQuickTap = true;
      }
      return;
    }
    if (this.isDead || this.#heartsDisabled) return;
    if (this.isHooked) {
      this.releaseHook();
    } else {
      this.shootHook();
    }
  }

  handlePointerUp(pointer) {
    if (!this.#quickRetryActive || !this.#pendingQuickTap) return;
    this.#pendingQuickTap = false;
    const endY = pointer?.y ?? -1;
    // Свайп вверх → полный GameOverUI
    if (this.#swipeStartY >= 0 && endY >= 0 && this.#swipeStartY - endY > 60) {
      this.#showFullGameOver();
      return;
    }
    // Обычный тап → inline restart
    this.#handleQuickRetryTap();
  }

  // ===================== HOOK MECHANICS =====================

  shootHook() {
    const px = this.player.x;
    const py = this.player.y;
    const vx = this.player.vx;
    const vy = this.player.vy;

    const result = this.physics_.tryHook(
      px, py, vx, vy,
      this.anchorMgr.anchors, this.time.now, this.lastReleaseTime, this.W,
      this.#effectiveConsts
    );

    if (!result) return;

    this.isHooked = true;
    this.currentAnchor = result.anchor;
    this.ropeLength = result.ropeLength;
    this.swingAngle = result.swingAngle;
    this.swingSpeed = result.swingSpeed;

    this.player.allowGravity = false;
    this.player.vx = 0;
    this.player.vy = 0;

    // Сразу ставим игрока на конец верёвки — без "телепортации" через кадр
    this.player.x = result.anchor.x + Math.cos(result.swingAngle) * result.ropeLength;
    this.player.y = result.anchor.y + Math.sin(result.swingAngle) * result.ropeLength;

    this.anchorMgr.highlightAnchor(result.anchor, true);

    navigator.vibrate?.(15);
    playHook();
    this.#delayedCall(80, () => playAttach());

    this.hud.setHint('click_release');
  }

  releaseHook() {
    if (!this.isHooked) return;

    this.isHooked = false;
    this.player.allowGravity = true;
    this.lastReleaseTime = this.time.now;

    const vel = this.physics_.calcRelease(this.swingAngle, this.swingSpeed, this.ropeLength, this.#effectiveConsts);
    this.player.vx = vel.vx;
    this.player.vy = vel.vy;

    if (this.currentAnchor) {
      this.anchorMgr.highlightAnchor(this.currentAnchor, false);
      this.currentAnchor = null;
    }

    this.rope.clear();
    this.hud.setHint('click_hook');

    navigator.vibrate?.(10);
    playRelease();
  }

  // ===================== DEATH / RESPAWN =====================

  die() {
    this.isDead = true;
    if (this.isHooked) this.releaseHook();
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.allowGravity = false;

    navigator.vibrate?.([50, 30, 80]);

    this.camera.shake(400, 0.02);
    this.camera.flash(400, 140, 20, 10);

    // Fade player alpha
    this.tweens.add({
      targets: this.player,
      alpha: 0.2,
      duration: 400,
    });

    this.#isNewBest = profile.saveBest(this.maxHeight);
    this.sessionBest = profile.bestScore;

    this.challengeMgr.updateProgress({
      height: this.maxHeight,
      hitCount: this.hitCount,
      gamesPlayed: 1,
    });

    const gameTime = (Date.now() - this.gameStartTime) / 1000;
    profile.saveChallenge(this.maxHeight, this.hitCount, gameTime);

    // Сохраняем заработанные эмберы
    if (this.#embersEarned > 0) {
      profile.addEmbers(this.#embersEarned);
    }

    // Quick retry window вместо немедленного GameOver
    this.#quickRetryActive = true;
    this.#quickRetryTime = 0;
    this.#swipeStartY = -1;

    trackEvent('death', { height: this.maxHeight, gameTime });
    playDeath();
  }

  async continueWithAd() {
    trackEvent('ad_shown', { height: this.maxHeight });
    const rewarded = await showRewarded();
    if (!this.isDead) return;
    if (rewarded) {
      trackEvent('ad_completed', { height: this.maxHeight });
      this.#respawnPlayer();
    } else {
      trackEvent('ad_skipped', { height: this.maxHeight });
    }
  }

  async continueWithStars() {
    trackEvent('stars_attempt', { height: this.maxHeight });
    const paid = await purchaseContinue();
    if (!this.isDead) return;
    if (paid) {
      trackEvent('stars_success', { height: this.maxHeight });
      this.#respawnPlayer();
    } else {
      trackEvent('stars_fail', { height: this.maxHeight });
    }
  }

  #respawnPlayer() {
    this.gameOverUI.hide();

    // Восстановить пол сердца (1 половинку) — не все три
    this.hearts = 1;
    this.maxHearts = HEARTS_MAX;
    this.heartBonusTimer = 0;
    this.#heartsDisabled = false;
    this.hud.updateHearts(this.hearts, this.maxHearts, 0);

    const targetHeight = this.maxHeight > 0 ? this.maxHeight : 20;
    const targetY = GROUND_Y - targetHeight * 10;

    this.anchorMgr.generateAnchorsUpTo(targetY - 1500);
    this.obstacles.generateUpTo(targetY - 1500, this.anchorMgr.anchors);

    this.player.x = this.W / 2;
    this.player.y = targetY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.allowGravity = false; // Замораживаем до конца счётчика
    this.player.alpha = 1;

    this.camera.scrollY = targetY - this.H * 0.55;

    // Обратный отсчёт 3-2-1
    this.#countdown = 3;
    this.#countdownTime = 0;
    this.#countdownActive = true;
    this.isDead = true; // Блокируем input до конца отсчёта
    playCountdownTick(); // Звук для "3"
  }

  #finishCountdown() {
    this.#countdownActive = false;
    this.#countdown = 0;
    this.isDead = false;
    this.player.vy = -300;
    this.player.allowGravity = true;
    this.hud.setHint('click_hook');
  }

  async handleRestart() {
    trackGameEnd();
    this.gameOverUI.hide();
    if (!isTelegram() && shouldShowInterstitial()) {
      await showInterstitial();
    }
    this.startScene('GameScene');
  }

  // ===================== QUICK RETRY =====================

  #handleQuickRetryTap() {
    this.#quickRetryActive = false;
    trackGameEnd();

    // Реклама: ставим флаг, покажем после рестарта
    if (!isTelegram() && shouldShowInterstitial()) {
      this.#pendingInterstitial = true;
    }

    this.#inlineRestart();
  }

  #showFullGameOver() {
    this.#quickRetryActive = false;
    this.gameOverUI.show(this.maxHeight, this.sessionBest, this.#isNewBest && this.maxHeight > 0, this.#embersEarned);
  }

  #inlineRestart() {
    this.gameOverUI.hide();

    // Сброс игрока
    const p = this.player;
    p.x = this.W / 2;
    p.y = SPAWN_Y;
    p.vx = 0;
    p.vy = 0;
    p.allowGravity = true;
    p.alpha = 1;
    p.rotation = 0;

    // Сброс состояния
    this.isHooked = false;
    this.currentAnchor = null;
    this.ropeLength = 0;
    this.swingAngle = 0;
    this.swingSpeed = 0;
    this.maxHeight = 0;
    this.isDead = false;
    this.lastReleaseTime = 0;
    this.bugHitCooldown = 0;
    this.hitCount = 0;
    this.gameStartTime = Date.now();
    this.#heartsDisabled = false;
    this.#isNewBest = false;
    this.hearts = this.#effectiveConsts.startHearts;
    this.maxHearts = this.#effectiveConsts.startHearts;
    this.heartBonusTimer = 0;
    this.#blinkActive = false;
    this.#blinkTime = 0;
    this.#invulnTime = 0;
    this.#delayedCalls.length = 0;
    this.#countdownActive = false;
    this.#pendingQuickTap = false;

    // Ember reset
    this.#embersEarned = 0;
    this.#lastEmberHeight = 0;
    this.#emberFrac = 0;
    this.#milestonesClaimed.clear();
    this.#effectiveConsts = getEffectiveConstants();

    // Сброс менеджеров (soft reset — переиспользуем)
    this.anchorMgr.reset();
    this.obstacles.reset();
    this.trail.reset();
    this.rope.clear();
    this.swamp.reset();
    this.eggs.reset();
    this.powerArc.reset();
    this.#lastPowerTier = -1;
    // Сброс визуалов на Novice tier
    const noviceTier = this.powerArc.tierData;
    this.rope.setTierParams(noviceTier);
    this.trail.setTierParams(noviceTier);
    this.hunter.setTierParams(noviceTier);
    // Биом сбрасываем на начальную позицию
    this.biome.update(p.y);

    // Еженедельные испытания — обновить для нового рана
    if (this.challengeMgr) this.challengeMgr.destroy();
    this.challengeMgr = new ChallengeManager();
    this.hud.create(this.challengeMgr);
    this.hud.setPerkLevels(this.#effectiveConsts.perkLevels);

    // Камера
    this.camera.scrollX = 0;
    this.camera.scrollY = p.y - this.H / 2;
    this.camera.fadeIn(200, 13, 15, 18);

    // HUD
    this.hud.updateHearts(this.hearts, this.maxHearts, 0);
    this.hud.updateHeight(0, 0, this.sessionBest);
    this.hud.updateEmbers(0);
    this.hud.setHint('click_hook');

    // Показать interstitial если накопился
    if (this.#pendingInterstitial) {
      this.#pendingInterstitial = false;
      showInterstitial().catch(() => {});
    }
  }

  // Утилита: отложенный вызов
  #delayedCall(ms, fn) {
    this.#delayedCalls.push({ remaining: ms, fn });
  }

  #updateDelayedCalls(delta) {
    let w = 0;
    for (let i = 0; i < this.#delayedCalls.length; i++) {
      const dc = this.#delayedCalls[i];
      dc.remaining -= delta;
      if (dc.remaining <= 0) {
        dc.fn();
      } else {
        this.#delayedCalls[w++] = dc;
      }
    }
    this.#delayedCalls.length = w;
  }

  // ===================== UPDATE =====================

  update(time, delta) {
    const ctx = this.ctx;
    const dt = delta / 1000;
    const p = this.player;

    // Обновляем delayed calls
    this.#updateDelayedCalls(delta);

    // ===== 1. Физика: гравитация для свободного полёта =====
    if (!this.isDead && p.allowGravity) {
      p.vy += this.engine.gravity * dt;
      p.vy = clamp(p.vy, -1200, 1200);
      p.vx = clamp(p.vx, -900, 900);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    // ===== 2. Wrap-around (только в свободном полёте) =====
    if (!this.isDead && !this.isHooked) {
      const offset = this.physics_.wrapX(p.x, this.W);
      if (offset !== 0) {
        p.x += offset;
      }
    }

    // ===== 3. Ghost sprite — только в свободном полёте у края =====
    const edgeZone = 50;
    this.#ghostVisible = !this.isDead && !this.isHooked
      && (p.x < edgeZone || p.x > this.W - edgeZone);

    if (this.#ghostVisible) {
      this.#ghostX = p.x < this.W / 2 ? p.x + this.W : p.x - this.W;
      this.#ghostY = p.y;
    }

    // ===== 4. Камера — X следит при hooked, Y всегда =====
    if (this.isHooked) {
      const targetX = clamp(p.x - this.W / 2, -this.W * 0.3, this.W * 0.3);
      this.camera.scrollX = lerp(this.camera.scrollX, targetX, 0.08);
    } else {
      this.camera.scrollX = lerp(this.camera.scrollX, 0, 0.1);
    }
    const targetY = p.y - this.H * 0.55;
    this.camera.scrollY = lerp(this.camera.scrollY, targetY, 0.15);

    this.biome.update(p.y);

    // ===== 5. Отрисовка — порядок важен! =====

    // 5.1 Фон + параллакс (ДО camera transform)
    this.biome.draw(ctx);

    // 5.2 Camera transform
    this.camera.applyTransform(ctx);

    // 5.3 Болото
    this.swamp.draw(ctx);

    // 5.4 Крюки
    this.anchorMgr.draw(ctx);

    // 5.5 Trail частицы
    this.trail.draw(ctx);

    // 5.6 Верёвка
    this.rope.draw(ctx);

    // 5.7 Физика маятника (обновление позиции)
    if (!this.isDead) {
      if (this.isHooked && this.currentAnchor) {
        const result = this.physics_.updatePendulum(dt, this.currentAnchor, {
          angle: this.swingAngle,
          speed: this.swingSpeed,
          ropeLen: this.ropeLength,
        });

        this.swingAngle = result.angle;
        this.swingSpeed = result.speed;
        this.ropeLength = result.ropeLen; // Плавное подтягивание верёвки

        p.x = result.x;
        p.y = result.y;
        p.vx = 0;
        p.vy = 0;

        this.rope.setPoints(this.currentAnchor.x, this.currentAnchor.y, result.x, result.y, this.ropeLength);
      } else {
        this.rope.clear();
      }
    }

    // 5.8 Охотник + ghost
    if (!this.isDead) {
      // Мигание при неуязвимости
      if (this.#blinkActive) {
        this.#blinkTime += delta;
        const blinkPhase = Math.floor(this.#blinkTime / 100) % 2;
        p.alpha = blinkPhase === 0 ? 0.3 : 0.6;
        if (this.#blinkTime > this.#blinkDuration) {
          this.#blinkActive = false;
          // Плавно возвращаем яркость
          this.tweens.add({ targets: p, alpha: 1, duration: 400 });
        }
      }
    }

    this.hunter.updateAnimation(
      delta, p.x, p.y, p.vx, p.vy,
      this.swingSpeed, this.swingAngle, this.isHooked
    );

    ctx.globalAlpha = p.alpha;
    this.hunter.draw(ctx, p.x, p.y);

    if (this.#ghostVisible) {
      this.hunter.drawGhost(ctx, this.#ghostX, this.#ghostY);
    }
    ctx.globalAlpha = 1;

    // 5.9 Жуки
    this.obstacles.draw(ctx, this.#effectiveConsts.obstacleHitRadius);

    // 5.10 Camera reset
    this.camera.resetTransform(ctx);

    // Обратный отсчёт при воскрешении (3-2-1)
    if (this.#countdownActive) {
      this.#countdownTime += delta;
      if (this.#countdownTime >= 1000) {
        this.#countdownTime -= 1000;
        this.#countdown--;
        if (this.#countdown <= 0) {
          playCountdownGo();
          this.#finishCountdown();
        } else {
          playCountdownTick(); // Звук для "2" и "1"
        }
      }
      // Рисуем счётчик по центру экрана
      const num = this.#countdown;
      if (num > 0) {
        ctx.globalAlpha = 0.9;
        ctx.font = `bold 120px 'Inter', sans-serif`;
        ctx.fillStyle = '#00F5D4';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#00F5D4';
        ctx.shadowBlur = 8;
        ctx.fillText(String(num), this.W / 2, this.H * 0.4);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      this.hud.draw(ctx, delta);
      return;
    }

    // Quick Retry overlay
    if (this.#quickRetryActive) {
      this.#quickRetryTime += delta;
      this.swamp.update(delta);

      // Тёмный overlay
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#050810';
      ctx.fillRect(0, 0, this.W, this.H);

      // "TAP TO RETRY" пульсирующий текст с dark stroke
      const pulse = 0.6 + 0.4 * Math.sin(this.#quickRetryTime * 0.008);
      ctx.globalAlpha = this.#quickRetryTime > 200 ? pulse : 0;
      ctx.font = `bold 28px 'Inter', sans-serif`;
      ctx.fillStyle = '#00F5D4';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#050810';
      ctx.lineWidth = 4;
      ctx.strokeText(t('tap_retry'), this.W / 2, this.H * 0.45);
      ctx.fillText(t('tap_retry'), this.W / 2, this.H * 0.45);

      // Хинт "↑ свайп для меню" с dark stroke
      ctx.globalAlpha = 0.5;
      ctx.font = `14px 'Inter', sans-serif`;
      ctx.fillStyle = '#8090B0';
      ctx.lineWidth = 3;
      ctx.strokeText(t('swipe_for_menu'), this.W / 2, this.H * 0.55);
      ctx.fillText(t('swipe_for_menu'), this.W / 2, this.H * 0.55);
      ctx.globalAlpha = 1;

      // Автопереход в полный GameOver после 1.5s
      if (this.#quickRetryTime > 1500) {
        this.#showFullGameOver();
      }

      this.hud.draw(ctx, delta);
      return;
    }

    // Если мёртв — обновляем болото и Game Over, выходим
    if (this.isDead) {
      this.swamp.update(delta);
      this.gameOverUI.draw(ctx, delta);
      return;
    }

    // ===== 6. Смерть: упал ниже нижнего якоря + 1.5 экрана =====
    const lowestAnchorY = this.anchorMgr.getLowestY();
    const deathY = Math.min(GROUND_Y - 6, lowestAnchorY + this.H * 1.5);
    if (p.y > deathY) {
      this.die();
      return;
    }

    // ===== 7. HUD =====
    const currentHeight = Math.max(0, Math.floor((GROUND_Y - p.y) / 10));
    if (currentHeight > this.maxHeight) {
      const prevMax = this.maxHeight;
      this.maxHeight = currentHeight;
      if (Math.floor(currentHeight / 10) > Math.floor(prevMax / 10) && currentHeight >= 10) {
        playRecord();
      }
    }
    this.hud.updateHeight(currentHeight, this.maxHeight, this.sessionBest);

    // ===== 7.5. Power Arc — обновление тира визуальной прогрессии =====
    if (this.powerArc.update(currentHeight) && this.powerArc.tier !== this.#lastPowerTier) {
      const td = this.powerArc.tierData;
      this.rope.setTierParams(td);
      this.trail.setTierParams(td);
      this.hunter.setTierParams(td);
      if (this.#lastPowerTier >= 0) playTierUp(); // Не играть при старте
      this.#lastPowerTier = this.powerArc.tier;
    }

    // ===== 7.6. Ember tracking (дробный аккумулятор для ember_magnet) =====
    if (currentHeight > this.#lastEmberHeight) {
      const delta_ = currentHeight - this.#lastEmberHeight;
      this.#emberFrac += delta_ * EMBER_RATE * this.#effectiveConsts.emberMultiplier;
      const whole = Math.floor(this.#emberFrac);
      this.#embersEarned += whole;
      this.#emberFrac -= whole;
      this.#lastEmberHeight = currentHeight;
    }
    for (const ms of EMBER_MILESTONES) {
      if (currentHeight >= ms.height && !this.#milestonesClaimed.has(ms.height)) {
        this.#milestonesClaimed.add(ms.height);
        this.#embersEarned += Math.floor(ms.bonus * this.#effectiveConsts.emberMultiplier);
      }
    }
    this.hud.updateEmbers(this.#embersEarned);

    // ===== 8. Процедурная генерация =====
    this.anchorMgr.generateAnchorsUpTo(p.y - 2000);
    this.anchorMgr.cleanup(p.y);

    this.obstacles.generateUpTo(p.y - 2000, this.anchorMgr.anchors);
    this.obstacles.update(delta, p.y, p.x);

    // ===== 9. Коллизия с жуками =====
    if (!this.isDead && !this.#heartsDisabled && this.bugHitCooldown <= 0
        && this.obstacles.checkCollision(p.x, p.y, this.#effectiveConsts.obstacleHitRadius)) {
      this.hitCount++;
      this.hearts = Math.max(0, this.hearts - 1); // -0.5 сердца
      this.hud.updateHearts(this.hearts, this.maxHearts, this.heartBonusTimer);

      if (this.isHooked) this.releaseHook();
      // Откидывание вниз и в сторону
      const knockX = (Math.random() - 0.5) * 300;
      p.vx = knockX;
      p.vy = 400;
      this.bugHitCooldown = 2000;

      navigator.vibrate?.([30, 20, 30]);
      playBugHit();

      this.camera.shake(250, 0.012);
      this.camera.flash(150, 255, 80, 30);

      // Мигание
      p.alpha = 0.4;
      this.#blinkActive = true;
      this.#blinkTime = 0;
      this.#blinkDuration = 600;
      this.#invulnTime = 1500;

      // 0 сердец → неизбежная смерть (падение без возможности зацепиться)
      if (this.hearts <= 0) {
        this.#heartsDisabled = true;
      }
    }

    // ===== 9.5 Подбор сердца =====
    if (!this.isDead && !this.#heartsDisabled
        && this.obstacles.checkHeartPickup(p.x, p.y)) {
      const baseMax = this.#effectiveConsts.startHearts;
      if (this.hearts >= baseMax && this.heartBonusTimer <= 0) {
        // Все сердца полны → бонусное 4-е сердце на 40 секунд
        this.maxHearts = baseMax + 2; // +1 полное бонусное сердце
        this.hearts = this.maxHearts;
        this.heartBonusTimer = HEART_BONUS_DURATION;
        this.hud.updateHearts(this.hearts, this.maxHearts, this.heartBonusTimer);
        playHeartPickup();
        navigator.vibrate?.(10);
      } else if (this.hearts < this.maxHearts) {
        // Восполняем потерю — +1 полное сердце (2 половинки)
        this.hearts = Math.min(this.hearts + 2, this.maxHearts);
        this.hud.updateHearts(this.hearts, this.maxHearts, this.heartBonusTimer);
        playHeartPickup();
        navigator.vibrate?.(10);
      }
    }
    if (this.bugHitCooldown > 0) this.bugHitCooldown -= delta;

    // Heart bonus timer — бонусное сердце временное
    const baseMax = this.#effectiveConsts.startHearts;
    if (this.maxHearts > baseMax && this.heartBonusTimer > 0) {
      this.heartBonusTimer -= delta;
      this.hud.updateBonusTimer(this.heartBonusTimer);
      if (this.heartBonusTimer <= 0) {
        this.maxHearts = baseMax;
        this.hearts = Math.min(this.hearts, baseMax);
        this.hud.updateHearts(this.hearts, this.maxHearts, 0);
      }
    }

    // ===== 10. Пасхалки =====
    this.eggs.check(currentHeight);

    // ===== 11. Trail =====
    const effectiveSpeed = this.isHooked
      ? Math.abs(this.swingSpeed) * this.ropeLength
      : Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    this.trail.update(delta, p.x, p.y, effectiveSpeed);

    // ===== 12. Swamp bubbles =====
    this.swamp.update(delta);

    // ===== 13. HUD (экранные координаты) =====
    this.hud.draw(ctx, delta);

    // ===== 14. Easter eggs (экранные координаты) =====
    this.eggs.draw(ctx, delta);
  }
}
