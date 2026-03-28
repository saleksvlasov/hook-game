import { Scene } from '../engine/Scene.js';
import { clamp, lerp } from '../engine/math.js';
import { playHook, playAttach, playRelease, playDeath, playRecord, playBugHit, playHeartPickup, playCountdownTick, playCountdownGo, playTierUp, playDeflect, playSawActivate, playSawKill } from '../audio.js';
import { profile } from '../data/index.js';
import { trackGameEnd, shouldShowInterstitial, showInterstitial, showRewarded } from '../ads.js';
import { isTelegram, purchaseContinue, trackEvent } from '../telegram.js';
import { GROUND_Y, SPAWN_Y, HEARTS_MAX, HEARTS_MAX_BONUS, HEART_BONUS_DURATION, EMBER_MILESTONES, EMBER_RATE, OBSTACLE_HIT_RADIUS, SHIELD_DURATION, SHIELD_RADIUS, SAW_DURATION, SAW_RADIUS, PERK_PICKUPS } from '../constants.js';
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
import { PerkPickupManager } from '../managers/PerkPickupManager.js';

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
  #delayedCalls = [];
  #countdownActive = false;
  #countdown = 0;
  #countdownTime = 0;
  #lastPowerTier = -1;
  #pendingInterstitial = false;
  #isNewBest = false;
  // Embers
  #embersEarned = 0;
  #lastEmberHeight = 0;
  #emberFrac = 0;
  #milestonesClaimed = new Set();
  #effectiveConsts = null;
  // Roguelite перки — сбрасываются в create() при новой игре, НЕ при воскрешении
  #roundPerkLevels = {};
  // Shield
  #shieldActive = false;
  #shieldTimer = 0;
  #shieldFlash = 0; // alpha flash при deflect
  #shieldBtn = null;
  // Saw
  #sawActive = false;
  #sawTimer = 0;
  #sawRotation = 0;
  #sawBtn = null;
  // Float texts — краткие всплывающие надписи в мировых координатах
  #floatTexts = [];

  constructor(engine) {
    super(engine);
  }

  shutdown() {
    this.input.off('pointerdown', this.#onPointerDown);
    this.input.off('pointerup', this.#onPointerUp);
    this.gameOverUI.destroy();
    this.biome.destroy();
    this.obstacles.destroy();
    if (this.perkPickups) this.perkPickups.destroy();
    this.trail.destroy();
    this.rope.destroy();
    this.swamp.destroy();
    this.hunter.destroy();
    this.anchorMgr.destroy();
    this.powerArc.destroy();
    if (this.challengeMgr) this.challengeMgr.destroy();
    this.challengeMgr = null;
    this.#destroyShieldButton();
    this.#destroySawButton();
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

    // Апгрейды — вычисляем эффективные константы (раундовые перки начинаются пустыми)
    this.#roundPerkLevels = {};
    this.#effectiveConsts = getEffectiveConstants(this.#roundPerkLevels);

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

    this.perkPickups = new PerkPickupManager(this);
    this.perkPickups.create();

    this.swamp = new SwampManager(this);
    this.swamp.create();

    // Еженедельные испытания
    this.challengeMgr = new ChallengeManager();
    this.hitCount = 0;
    this.gameStartTime = Date.now();

    this.hud = new HUDManager(this);
    this.hud.create(this.challengeMgr);
    this.hud.setPerkLevels(this.#effectiveConsts.perkLevels);

    // Shield кнопка (HTML)
    this.#createShieldButton();
    // Saw кнопка (HTML)
    this.#createSawButton();

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
      const baseMax = this.#effectiveConsts.startHearts;
      if (this.hearts < baseMax) {
        // Восстановить все сердца (с учётом Iron Heart)
        this.hearts = baseMax;
        this.maxHearts = baseMax;
      } else {
        // Бонусное сердце на 40 секунд
        this.maxHearts = baseMax + 2;
        this.hearts = baseMax + 2;
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
    if (this.isDead || this.#heartsDisabled) return;
    if (this.isHooked) {
      this.releaseHook();
    } else {
      this.shootHook();
    }
  }

  handlePointerUp(pointer) {
    // No-op: quick retry removed
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

    // Saw/Shield НЕ сбрасываем — при воскрешении состояние сохраняется.
    // Таймеры паузятся через !this.isDead guard в update().
    // Сброс происходит в create() при новой игре.

    // Roguelite: НЕ сбрасываем #roundPerkLevels здесь —
    // при воскрешении (реклама/звёзды) перки сохраняются.
    // Сброс происходит в create() при новой игре.
    this.#floatTexts.length = 0;

    this.#delayedCall(600, () => { if (this.isDead) this.#showFullGameOver(); });

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
    // Восстановить HUD-плашки перков (они были скрыты вместе с Game Over UI)
    this.hud.setPerkLevels(this.#effectiveConsts.perkLevels);

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
    // Восстановить видимость кнопок (зависят от !this.isDead)
    this.#updateShieldButton();
    this.#updateSawButton();
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

  #showFullGameOver() {
    this.gameOverUI.show(this.maxHeight, this.sessionBest, this.#isNewBest && this.maxHeight > 0, this.#embersEarned);
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

    // 5.4b Perk pickup предметы
    this.perkPickups.draw(ctx);

    // 5.4c Float texts (конвертация MAX перка, blood splatter) — мировые координаты
    if (this.#floatTexts.length > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = this.#floatTexts.length - 1; i >= 0; i--) {
        const ft = this.#floatTexts[i];
        ft.life -= delta;
        const dt = delta / 1000;
        ft.y += ft.vy * dt;
        if (ft.vx) ft.x += ft.vx * dt;
        if (ft.life <= 0) { this.#floatTexts.splice(i, 1); continue; }
        const a = Math.max(0, ft.life / ft.maxLife);
        ctx.globalAlpha = a;
        ctx.font = `bold ${ft.fontSize || 15}px Inter, sans-serif`;
        ctx.fillStyle = ft.color || '#FF6B35';
        if (!ft.fontSize || ft.fontSize >= 10) {
          // Обводка только для больших текстов (не для splatter частиц)
          ctx.strokeStyle = '#0A0E1A';
          ctx.lineWidth = 3;
          ctx.strokeText(ft.text, ft.x, ft.y);
        }
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.restore();
    }

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

    // 5.8b Визуальные эффекты перков
    this.hunter.drawPerkEffects(
      ctx, p.x, p.y, this.#effectiveConsts.perkLevels,
      this.isHooked, this.swingSpeed
    );

    ctx.globalAlpha = p.alpha;
    this.hunter.draw(ctx, p.x, p.y);

    if (this.#ghostVisible) {
      this.hunter.drawGhost(ctx, this.#ghostX, this.#ghostY);
    }
    ctx.globalAlpha = 1;

    // 5.9 Shield аура (перед жуками, за игроком)
    if (this.#shieldActive) {
      this.hunter.drawShield(ctx, p.x, p.y, SHIELD_RADIUS, Math.max(0.15, this.#shieldFlash), this.#shieldTimer);
    }

    // 5.9b Saw аура
    if (this.#sawActive) {
      this.#sawRotation += delta * 0.004;
      this.hunter.drawSaw(ctx, p.x, p.y, 1.0, this.#sawTimer, this.#sawRotation);
    }

    // 5.10 Жуки
    this.obstacles.draw(ctx);

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

    // Perk pickups
    this.perkPickups.generateUpTo(p.y - 2000, this.anchorMgr.anchors);
    this.perkPickups.update(delta, p.y);

    // ===== 9. Shield deflect + Коллизия с жуками =====

    // Shield timer — паузится при isDead (воскрешение сохраняет состояние)
    if (this.#shieldActive && !this.isDead) {
      this.#shieldTimer -= delta;
      this.hud.updateShieldTimer(this.#shieldTimer);
      if (this.#shieldTimer <= 0) {
        this.#shieldActive = false;
        this.#shieldTimer = 0;
        this.hud.updateShieldTimer(0);
        this.#updateSawButton();
      }
    }

    // Saw timer — паузится при isDead
    if (this.#sawActive && !this.isDead) {
      this.#sawTimer -= delta;
      this.hud.updateSawTimer(this.#sawTimer);
      if (this.#sawTimer <= 0) {
        this.#sawActive = false;
        this.#sawTimer = 0;
        this.hud.updateSawTimer(0);
        this.#updateShieldButton();
      }
    }

    // SAW уничтожение жуков
    if (this.#sawActive && !this.isDead) {
      const sawHits = this.obstacles.checkSaw(p.x, p.y, SAW_RADIUS);
      if (sawHits.length > 0) {
        playSawKill();
        this.camera.shake(40, 0.002);
        // Blood splatter на месте каждого убитого жука
        for (const hit of sawHits) {
          for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 60;
            this.#floatTexts.push({
              text: '\u25CF',  // ● — маленькая кровь-капля
              x: hit.x + (Math.random() - 0.5) * 8,
              y: hit.y + (Math.random() - 0.5) * 8,
              vy: Math.sin(angle) * speed,
              vx: Math.cos(angle) * speed,
              life: 400 + Math.random() * 200,
              maxLife: 600,
              color: Math.random() > 0.3 ? '#FF2E63' : '#FF6B35',
              fontSize: 4 + Math.random() * 4,
            });
          }
        }
      }
    }

    // Shield flash decay
    if (this.#shieldFlash > 0) {
      this.#shieldFlash = Math.max(0, this.#shieldFlash - delta * 0.002); // Плавное затухание ~200ms
    }

    // Deflect жуков щитом (без урона)
    if (this.#shieldActive && !this.isDead) {
      if (this.obstacles.checkDeflect(p.x, p.y, SHIELD_RADIUS)) {
        this.#shieldFlash = 0.4;
        this.camera.shake(80, 0.004);
        this.camera.flash(60, 0, 245, 212, 0.15); // Мягкий cyan flash
        playDeflect();
        navigator.vibrate?.(15);
      }
    }

    // Коллизия с жуками (урон)
    if (!this.isDead && !this.#heartsDisabled && this.bugHitCooldown <= 0
        && this.obstacles.checkCollision(p.x, p.y, OBSTACLE_HIT_RADIUS)) {
      this.hitCount++;
      this.hearts = Math.max(0, this.hearts - 1);

      // Если бонусное сердце потрачено — отменить таймер и убрать слот
      const baseMax = this.#effectiveConsts.startHearts;
      if (this.heartBonusTimer > 0 && this.hearts <= baseMax) {
        this.heartBonusTimer = 0;
        this.maxHearts = baseMax;
        this.hearts = Math.min(this.hearts, baseMax);
      }

      this.hud.updateHearts(this.hearts, this.maxHearts, this.heartBonusTimer);

      if (this.isHooked) this.releaseHook();
      // Усиленное откидывание
      const knockX = (Math.random() - 0.5) * 400;
      p.vx = knockX;
      p.vy = 500;
      this.bugHitCooldown = 2000;

      navigator.vibrate?.([50, 30, 50]);
      playBugHit();

      this.camera.shake(200, 0.012);
      this.camera.flash(80, 255, 46, 99, 0.25); // Мягкий pink flash (короче, прозрачнее)

      // Усиленное мигание
      p.alpha = 0.3;
      this.#blinkActive = true;
      this.#blinkTime = 0;
      this.#blinkDuration = 800;

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

    // ===== 9.6 Подбор перков =====
    if (!this.isDead && !this.#heartsDisabled) {
      const pickedPerkId = this.perkPickups.checkPickup(p.x, p.y);
      if (pickedPerkId) {
        const cfg = PERK_PICKUPS[pickedPerkId];
        const maxLvl = cfg.maxLevel;
        const cur = this.#roundPerkLevels[pickedPerkId] || 0;
        if (cur < maxLvl) {
          // Обычный подбор — повысить уровень перка
          this.#roundPerkLevels[pickedPerkId] = cur + 1;
          this.#effectiveConsts = getEffectiveConstants(this.#roundPerkLevels);
          this.hud.setPerkLevels(this.#effectiveConsts.perkLevels);
          playHeartPickup(); // переиспользуем звук
          navigator.vibrate?.(10);
        } else {
          // MAX перк → конвертация в 20 эмберов
          const bonus = 20;
          this.#embersEarned += bonus;
          this.hud.updateEmbers(this.#embersEarned);
          this.#floatTexts.push({
            text: `+${bonus}`,
            x: p.x,
            y: p.y - 40,
            vy: -55,       // px/s вверх в мировых координатах
            life: 1000,
            maxLife: 1000,
          });
          navigator.vibrate?.(6);
        }
      }
    }

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

  // ===== Shield методы =====

  #createShieldButton() {
    // Удалить старую кнопку если есть
    if (this.#shieldBtn) {
      this.#shieldBtn.remove();
      this.#shieldBtn = null;
    }
    const btn = document.createElement('button');
    btn.className = 'shield-btn';
    btn.textContent = '\u{1F6E1}'; // 🛡
    // Перехватываем pointerdown чтобы не дошёл до canvas (иначе отцепит от крюка)
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.#activateShield();
    });
    document.body.appendChild(btn);
    this.#shieldBtn = btn;
    this.#updateShieldButton();
  }

  #updateShieldButton() {
    if (!this.#shieldBtn) return;
    const show = profile.hasShield && !this.#shieldActive && !this.isDead && !this.#sawActive;
    this.#shieldBtn.classList.toggle('shield-btn--visible', show);
  }

  #activateShield() {
    if (!profile.hasShield || this.#shieldActive || this.isDead || this.#sawActive) return;
    this.#shieldActive = true;
    this.#shieldTimer = SHIELD_DURATION;
    profile.useShield();
    this.#updateShieldButton();
    this.#updateSawButton(); // Скрыть кнопку пилы пока щит активен
    this.camera.flash(100, 0, 245, 212); // Cyan flash
    navigator.vibrate?.([20, 10, 20]);
  }

  #destroyShieldButton() {
    if (this.#shieldBtn) {
      this.#shieldBtn.remove();
      this.#shieldBtn = null;
    }
  }

  #createSawButton() {
    if (this.#sawBtn) { this.#sawBtn.remove(); this.#sawBtn = null; }
    const btn = document.createElement('button');
    btn.className = 'saw-btn';
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" style="width:28px;height:28px"><polygon points="18.5,10 15.1,12.1 16,16 12.1,15.1 10,18.5 7.9,15.1 4,16 4.9,12.1 1.5,10 4.9,7.9 4,4 7.9,4.9 10,1.5 12.1,4.9 16,4 15.1,7.9" fill="#4A5580" stroke="#7A8AB0" stroke-width="0.5" stroke-linejoin="round"/><circle cx="10" cy="10" r="5" fill="#1A2040" stroke="#7A8AB0" stroke-width="1"/><circle cx="10" cy="10" r="2.5" fill="#2A3050" stroke="#7A8AB0" stroke-width="0.7"/><circle cx="10" cy="10" r="1" fill="#7A8AB0"/></svg>';
    btn.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); });
    btn.addEventListener('click', (e) => { e.stopPropagation(); this.#activateSaw(); });
    document.body.appendChild(btn);
    this.#sawBtn = btn;
    this.#updateSawButton();
  }

  #updateSawButton() {
    if (!this.#sawBtn) return;
    const show = profile.hasSaw && !this.#sawActive && !this.isDead && !this.#shieldActive;
    this.#sawBtn.classList.toggle('saw-btn--visible', show);
  }

  #activateSaw() {
    if (!profile.hasSaw || this.#sawActive || this.isDead || this.#shieldActive) return;
    this.#sawActive = true;
    this.#sawTimer = SAW_DURATION;
    profile.useSaw();
    this.#updateSawButton();
    this.#updateShieldButton(); // Скрыть кнопку щита пока пила активна
    playSawActivate();
    this.camera.flash(100, 255, 184, 0);
    navigator.vibrate?.([20, 10, 20]);
  }

  #destroySawButton() {
    if (this.#sawBtn) { this.#sawBtn.remove(); this.#sawBtn = null; }
  }
}
