import { Scene } from '../engine/Scene.js';
import { clamp, lerp } from '../engine/math.js';
import { playHook, playAttach, playRelease, playDeath, playRecord, playBugHit, playHeartPickup, playCountdownTick, playCountdownGo } from '../audio.js';
import { profile } from '../data/index.js';
import { trackGameEnd, shouldShowInterstitial, showInterstitial, showRewarded } from '../ads.js';
import { isTelegram, purchaseContinue, trackEvent } from '../telegram.js';
import { t } from '../i18n.js';
import { GROUND_Y, SPAWN_Y, HEARTS_MAX, HEARTS_MAX_BONUS, HEART_BONUS_DURATION } from '../constants.js';

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

export class GameScene extends Scene {
  constructor(engine) {
    super(engine);
  }

  shutdown() {
    this.input.off('pointerdown', this._onPointerDown);
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

    // Hearts / Lives
    this.hearts = HEARTS_MAX;        // 6 половинок = 3 сердца
    this.maxHearts = HEARTS_MAX;
    this.heartBonusTimer = 0;
    this._heartsDisabled = false;    // true = 0 сердец, падение без хука

    // Физика маятника — чистые расчёты
    this.physics_ = new SwingPhysics();

    this.biome = new BiomeManager(this);
    this.biome.create();

    // Hunter renderer
    this.hunter = new HunterRenderer(this);
    this.hunter.create();

    // Ghost — данные для wrap-around клона
    this._ghostVisible = false;
    this._ghostX = 0;
    this._ghostY = 0;

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

    this.eggs = new EasterEggs(this);
    this.eggs.onHeartBonus = () => {
      if (this.hearts < HEARTS_MAX) {
        // Восстановить все сердца
        this.hearts = HEARTS_MAX;
        this.maxHearts = HEARTS_MAX;
      } else {
        // Бонусное 4-е сердце на 30 секунд
        this.maxHearts = HEARTS_MAX_BONUS;
        this.hearts = HEARTS_MAX_BONUS;
        this.heartBonusTimer = HEART_BONUS_DURATION;
      }
      this.hud.updateHearts(this.hearts, this.maxHearts);
    };

    // HUD hearts
    this.hud.updateHearts(this.hearts, this.maxHearts);

    // Камера
    this.camera.scrollX = 0;
    this.camera.scrollY = this.player.y - this.H / 2;

    // Input
    this._onPointerDown = () => this.handlePointerDown();
    this.input.on('pointerdown', this._onPointerDown);

    this.camera.fadeIn(400, 13, 15, 18);

    // Анимация мигания при ударе жуком
    this._blinkActive = false;
    this._blinkTime = 0;
    this._blinkDuration = 0;
    this._invulnTime = 0;

    // Delayed calls (замена this.time.delayedCall)
    this._delayedCalls = [];

    // Обратный отсчёт при воскрешении
    this._countdownActive = false;
    this._countdown = 0;
    this._countdownTime = 0;
  }

  // ===================== INPUT =====================

  handlePointerDown() {
    if (this.isDead || this._heartsDisabled) return;
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
    const vx = this.player.vx;
    const vy = this.player.vy;

    const result = this.physics_.tryHook(
      px, py, vx, vy,
      this.anchorMgr.anchors, this.time.now, this.lastReleaseTime, this.W
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
    this._delayedCall(80, () => playAttach());

    this.hud.setHint('click_release');
  }

  releaseHook() {
    if (!this.isHooked) return;

    this.isHooked = false;
    this.player.allowGravity = true;
    this.lastReleaseTime = this.time.now;

    const vel = this.physics_.calcRelease(this.swingAngle, this.swingSpeed, this.ropeLength);
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

    const isNewBest = profile.saveBest(this.maxHeight);
    this.sessionBest = profile.bestScore;

    this.challengeMgr.updateProgress({
      height: this.maxHeight,
      hitCount: this.hitCount,
      gamesPlayed: 1,
    });

    const gameTime = (Date.now() - this.gameStartTime) / 1000;
    profile.saveChallenge(this.maxHeight, this.hitCount, gameTime);

    this.gameOverUI.show(this.maxHeight, this.sessionBest, isNewBest && this.maxHeight > 0);

    trackEvent('death', { height: this.maxHeight, gameTime });
    playDeath();
  }

  async continueWithAd() {
    trackEvent('ad_shown', { height: this.maxHeight });
    const rewarded = await showRewarded();
    if (!this.isDead) return;
    if (rewarded) {
      trackEvent('ad_completed', { height: this.maxHeight });
      this._respawnPlayer();
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
      this._respawnPlayer();
    } else {
      trackEvent('stars_fail', { height: this.maxHeight });
    }
  }

  _respawnPlayer() {
    this.gameOverUI.hide();

    // Восстановить пол сердца (1 половинку) — не все три
    this.hearts = 1;
    this.maxHearts = HEARTS_MAX;
    this.heartBonusTimer = 0;
    this._heartsDisabled = false;
    this.hud.updateHearts(this.hearts, this.maxHearts);

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
    this._countdown = 3;
    this._countdownTime = 0;
    this._countdownActive = true;
    this.isDead = true; // Блокируем input до конца отсчёта
    playCountdownTick(); // Звук для "3"
  }

  _finishCountdown() {
    this._countdownActive = false;
    this._countdown = 0;
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

  // Утилита: отложенный вызов
  _delayedCall(ms, fn) {
    this._delayedCalls.push({ remaining: ms, fn });
  }

  _updateDelayedCalls(delta) {
    let w = 0;
    for (let i = 0; i < this._delayedCalls.length; i++) {
      const dc = this._delayedCalls[i];
      dc.remaining -= delta;
      if (dc.remaining <= 0) {
        dc.fn();
      } else {
        this._delayedCalls[w++] = dc;
      }
    }
    this._delayedCalls.length = w;
  }

  // ===================== UPDATE =====================

  update(time, delta) {
    const ctx = this.ctx;
    const dt = delta / 1000;
    const p = this.player;

    // Обновляем delayed calls
    this._updateDelayedCalls(delta);

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
    this._ghostVisible = !this.isDead && !this.isHooked
      && (p.x < edgeZone || p.x > this.W - edgeZone);

    if (this._ghostVisible) {
      this._ghostX = p.x < this.W / 2 ? p.x + this.W : p.x - this.W;
      this._ghostY = p.y;
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
      if (this._blinkActive) {
        this._blinkTime += delta;
        const blinkPhase = Math.floor(this._blinkTime / 100) % 2;
        p.alpha = blinkPhase === 0 ? 0.3 : 0.6;
        if (this._blinkTime > this._blinkDuration) {
          this._blinkActive = false;
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

    if (this._ghostVisible) {
      this.hunter.drawGhost(ctx, this._ghostX, this._ghostY);
    }
    ctx.globalAlpha = 1;

    // 5.9 Жуки
    this.obstacles.draw(ctx);

    // 5.10 Camera reset
    this.camera.resetTransform(ctx);

    // Обратный отсчёт при воскрешении (3-2-1)
    if (this._countdownActive) {
      this._countdownTime += delta;
      if (this._countdownTime >= 1000) {
        this._countdownTime -= 1000;
        this._countdown--;
        if (this._countdown <= 0) {
          playCountdownGo();
          this._finishCountdown();
        } else {
          playCountdownTick(); // Звук для "2" и "1"
        }
      }
      // Рисуем счётчик по центру экрана
      const num = this._countdown;
      if (num > 0) {
        ctx.globalAlpha = 0.9;
        ctx.font = `bold 120px 'Inter', sans-serif`;
        ctx.fillStyle = '#00F5D4';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#00F5D4';
        ctx.shadowBlur = 20;
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

    // ===== 8. Процедурная генерация =====
    this.anchorMgr.generateAnchorsUpTo(p.y - 2000);
    this.anchorMgr.cleanup(p.y);

    this.obstacles.generateUpTo(p.y - 2000, this.anchorMgr.anchors);
    this.obstacles.update(delta, p.y);

    // ===== 9. Коллизия с жуками =====
    if (!this.isDead && !this._heartsDisabled && this.bugHitCooldown <= 0
        && this.obstacles.checkCollision(p.x, p.y)) {
      this.hitCount++;
      this.hearts = Math.max(0, this.hearts - 1); // -0.5 сердца
      this.hud.updateHearts(this.hearts, this.maxHearts);

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
      this._blinkActive = true;
      this._blinkTime = 0;
      this._blinkDuration = 600;
      this._invulnTime = 1500;

      // 0 сердец → неизбежная смерть (падение без возможности зацепиться)
      if (this.hearts <= 0) {
        this._heartsDisabled = true;
      }
    }

    // ===== 9.5 Подбор сердца =====
    if (!this.isDead && !this._heartsDisabled
        && this.obstacles.checkHeartPickup(p.x, p.y)) {
      if (this.hearts < this.maxHearts) {
        this.hearts = Math.min(this.hearts + 2, this.maxHearts); // +1 полное сердце
        this.hud.updateHearts(this.hearts, this.maxHearts);
        playHeartPickup();
        navigator.vibrate?.(10);
      }
    }
    if (this.bugHitCooldown > 0) this.bugHitCooldown -= delta;

    // Heart bonus timer — 4-е сердце временное
    if (this.maxHearts > HEARTS_MAX && this.heartBonusTimer > 0) {
      this.heartBonusTimer -= delta;
      if (this.heartBonusTimer <= 0) {
        this.maxHearts = HEARTS_MAX;
        this.hearts = Math.min(this.hearts, HEARTS_MAX);
        this.hud.updateHearts(this.hearts, this.maxHearts);
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
