import { Z, FONT_MONO } from '../constants.js';
import { t } from '../i18n.js';
import { SKINS } from './SkinRenderer.js';
import { isTelegram } from '../telegram.js';
import {
  drawBloodSplatter, drawWantedPosterFrame,
  drawRopeDecoration, createEmberBurst,
} from '../managers/UIFactory.js';
import { LeaderboardUI } from './LeaderboardUI.js';

// ===== NEON WESTERN ПАЛИТРА =====
const NEON_CYAN = '#00F5D4';
const NEON_PINK = '#FF2E63';
const NEON_AMBER = '#FFB800';
const NEON_BG = '#0A0E1A';
const NEON_STEEL = '#4A5580';
const NEON_FONT = "'Inter', 'Helvetica Neue', sans-serif";

// Менеджер Game Over экрана — neon western glassmorphism
export class GameOverUI {
  constructor(scene) {
    this.scene = scene;
    this.elements = [];
    this.buttonsDiv = null;
    this.continueBtn = null;
    this.restartBtn = null;
    this.menuBtn = null;
    this.scoreText = null;
    this.bestText = null;
    this.newBestText = null;

    // Доп. графические слои
    this.bloodGfx = null;
    this.posterGfx = null;
    this.overlayRect = null;

    // Лидерборд — отдельный модуль
    this.leaderboardUI = new LeaderboardUI();

    // Callbacks
    this.onContinueAd = null;
    this.onContinueStars = null;
    this.onRestart = null;
    this.onMenu = null;
  }

  create({ onContinueAd, onContinueStars, onRestart, onMenu, challengeMgr }) {
    this._challengeMgr = challengeMgr || null;
    this.onContinueAd = onContinueAd;
    this.onContinueStars = onContinueStars;
    this.onRestart = onRestart;
    this.onMenu = onMenu;

    const W = this.scene.W;
    const H = this.scene.H;
    const makeUI = (obj) => {
      obj.setScrollFactor(0).setDepth(Z.GAME_OVER).setVisible(false);
      this.elements.push(obj);
      return obj;
    };

    // Затемнение — почти чёрный neon-фон
    this.overlayRect = makeUI(
      this.scene.add.rectangle(W / 2, H / 2, W, H, 0x050810, 0.85)
    );

    // Scanlines поверх overlay — горизонтальные линии через 4px, alpha 0.03
    this.scanlines = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(Z.GAME_OVER).setVisible(false);
    this.scanlines.fillStyle(0x000000, 0.03);
    for (let y = 0; y < H; y += 4) {
      this.scanlines.fillRect(0, y, W, 2);
    }
    this.elements.push(this.scanlines);

    // Заголовок "YOU FELL" — neon pink, драматичный glow
    this.titleText = makeUI(this.scene.add.text(W / 2, H * 0.26, t('you_died'), {
      fontSize: '48px', color: NEON_PINK, fontFamily: NEON_FONT, fontStyle: 'bold',
      stroke: NEON_BG, strokeThickness: 6,
    }).setOrigin(0.5).setShadow(0, 0, '#FF2E63', 8, true, true));

    // Высота (score) — neon amber, моноширинный + glow
    this.scoreText = makeUI(this.scene.add.text(W / 2, H * 0.35, '', {
      fontSize: '20px', color: NEON_AMBER, fontFamily: FONT_MONO, fontStyle: 'bold',
      stroke: NEON_BG, strokeThickness: 2,
    }).setOrigin(0.5).setShadow(0, 0, '#FFB800', 5, true, true));

    // Рекорд (best) — cyan по умолчанию, amber при новом рекорде + glow
    this.bestText = makeUI(this.scene.add.text(W / 2, H * 0.39, '', {
      fontSize: '30px', color: NEON_CYAN, fontFamily: FONT_MONO, fontStyle: 'bold',
      stroke: NEON_BG, strokeThickness: 5,
    }).setOrigin(0.5).setShadow(0, 0, '#00F5D4', 5, true, true));

    // НОВЫЙ РЕКОРД — neon amber
    this.newBestText = makeUI(this.scene.add.text(W / 2, H * 0.44, t('new_record'), {
      fontSize: '22px', color: NEON_AMBER, fontFamily: NEON_FONT, fontStyle: 'bold italic',
      stroke: NEON_BG, strokeThickness: 4,
    }).setOrigin(0.5));

    // --- HTML кнопки поверх canvas — neon glass ---
    this.buttonsDiv = document.createElement('div');
    this.buttonsDiv.id = 'game-over-buttons';
    this.buttonsDiv.style.cssText = `
      display: none; position: fixed; top: 0; left: 0;
      width: 100%; height: 100%; z-index: ${Z.HTML_BUTTONS};
      pointer-events: none;
      flex-direction: column; align-items: center; justify-content: center;
      gap: 16px; padding-top: 50%;
      opacity: 0; transition: opacity 0.3s ease;
    `;

    // CONTINUE AD — бесплатное воскрешение через рекламу (1 раз за игру)
    this.continueAdBtn = this._createButton(t('continue_ad'), 'continue_ad');
    this.buttonsDiv.appendChild(this.continueAdBtn);

    // CONTINUE STARS — платное воскрешение через Stars (только Telegram, без лимита)
    if (isTelegram()) {
      this.continueStarBtn = this._createButton(t('continue_star'), 'continue_star');
      this.buttonsDiv.appendChild(this.continueStarBtn);
    }

    // RESTART
    this.restartBtn = this._createButton(t('restart'), 'restart');
    this.buttonsDiv.appendChild(this.restartBtn);

    // LEADERBOARD (только в Telegram)
    if (isTelegram()) {
      this.leaderboardBtn = this._createButton(t('leaderboard'), 'leaderboard');
      this.buttonsDiv.appendChild(this.leaderboardBtn);
    }

    // MENU
    this.menuBtn = this._createButton(t('menu'), 'menu');
    this.buttonsDiv.appendChild(this.menuBtn);

    document.body.appendChild(this.buttonsDiv);

    // Панель лидерборда (HTML overlay)
    this.leaderboardUI.create();
  }

  // Neon glass стиль кнопок — все кнопки одинаковая база, цвет зависит от типа
  _createButton(label, type) {
    const btn = document.createElement('button');
    btn.textContent = label;

    const isSmall = type === 'menu' || type === 'leaderboard';
    const isContinue = type === 'continue_ad' || type === 'continue_star';
    const fontSize = isSmall ? '14px' : isContinue ? '16px' : '20px';
    const padding = isSmall ? '10px 32px' : isContinue ? '12px 40px' : '14px 52px';

    // Цвета зависят от типа кнопки
    const isMenu = type === 'menu';

    // Базовый цвет текста и бордера
    const textColor = isContinue ? NEON_AMBER : isMenu ? NEON_STEEL : NEON_CYAN;
    const borderBase = isContinue
      ? 'rgba(255, 184, 0, 0.3)'
      : isMenu
        ? 'rgba(74, 85, 128, 0.3)'
        : 'rgba(0, 245, 212, 0.3)';

    // Neon text-shadow — amber для continue, cyan для restart/leaderboard, без для menu
    const textShadow = isContinue
      ? 'text-shadow: 0 0 4px rgba(255, 184, 0, 0.6);'
      : isMenu
        ? ''
        : 'text-shadow: 0 0 4px rgba(0, 245, 212, 0.6);';

    btn.style.cssText = `
      font-family: ${NEON_FONT}; cursor: pointer;
      outline: none; pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
      text-transform: uppercase;
      letter-spacing: 3px;
      background: rgba(10, 14, 26, 0.8);
      color: ${textColor};
      border: 1px solid ${borderBase};
      font-size: ${fontSize}; font-weight: bold;
      padding: ${padding};
      border-radius: 12px;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: all 0.12s ease;
      ${textShadow}
    `;

    // Hover/press — цвета зависят от типа
    const hoverBorder = isContinue
      ? 'rgba(255, 184, 0, 0.5)'
      : isMenu
        ? 'rgba(0, 245, 212, 0.3)'
        : 'rgba(0, 245, 212, 0.5)';
    const hoverShadowColor = isContinue
      ? 'rgba(255, 184, 0, 0.3)'
      : 'rgba(0, 245, 212, 0.3)';
    const hoverTextColor = isMenu ? NEON_CYAN : textColor;

    const onEnter = () => {
      btn.style.borderColor = hoverBorder;
      btn.style.textShadow = `0 0 5px ${hoverShadowColor}`;
      if (isMenu) btn.style.color = hoverTextColor;
    };
    const onLeave = () => {
      btn.style.borderColor = borderBase;
      btn.style.textShadow = 'none';
      if (isMenu) btn.style.color = textColor;
    };
    const onDown = () => {
      btn.style.transform = 'scale(0.97)';
      btn.style.background = 'rgba(10, 14, 26, 0.9)';
    };
    const onUp = () => {
      btn.style.transform = '';
      btn.style.background = 'rgba(10, 14, 26, 0.8)';
      onLeave();
    };

    btn.addEventListener('mouseenter', onEnter);
    btn.addEventListener('mouseleave', onLeave);
    btn.addEventListener('touchstart', onDown, { passive: true });
    btn.addEventListener('mousedown', onDown);
    btn.addEventListener('touchend', onUp, { passive: true });
    btn.addEventListener('mouseup', onUp);

    // Click handler по типу
    const handlers = {
      restart: () => this.onRestart?.(),
      continue_ad: () => this.onContinueAd?.(),
      continue_star: () => this.onContinueStars?.(),
      menu: () => this.onMenu?.(),
      leaderboard: () => this.leaderboardUI.show(),
    };
    btn.addEventListener('click', () => handlers[type]?.());

    return btn;
  }

  show(score, best, isNewBest) {
    const W = this.scene.W;
    const H = this.scene.H;

    this.scoreText.setText(`${t('depth_label')}: ${score}${t('unit_m')}`);
    this.bestText.setText(`${t('record_label')}: ${best}${t('unit_m')}`);

    if (isNewBest) {
      this.bestText.setColor(NEON_AMBER);
    } else {
      this.newBestText.setVisible(false);
      this.bestText.setColor(NEON_CYAN);
    }

    // === Кровавые брызги на фоне (depth Z.BLOOD) ===
    this.bloodGfx = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(Z.BLOOD).setAlpha(0);
    drawBloodSplatter(this.bloodGfx, W / 2, H * 0.5, 120, 0.8);

    // === Premium рамка за счётом ===
    this.posterGfx = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(Z.GAME_OVER).setAlpha(0);
    drawWantedPosterFrame(this.posterGfx, W / 2, H * 0.37, 220, 90);
    // Пунктирные линии сверху и снизу рамки
    drawRopeDecoration(this.posterGfx, W / 2 - 110, H * 0.37 - 50, W / 2 + 110, H * 0.37 - 50);
    drawRopeDecoration(this.posterGfx, W / 2 - 110, H * 0.37 + 50, W / 2 + 110, H * 0.37 + 50);

    // --- Stagger анимации ---

    // 0ms: кровь alpha 0 -> 0.6
    this.scene.tweens.add({
      targets: this.bloodGfx, alpha: 0.6, duration: 300, ease: 'Linear',
    });

    // 0ms: overlay alpha 0 -> 0.85 (400ms)
    this.overlayRect.setVisible(true).setAlpha(0);
    this.scene.tweens.add({
      targets: this.overlayRect, alpha: 0.85, duration: 400, ease: 'Linear',
    });

    // 300ms: "YOU FELL" — dramatic scale 2.2 -> 1, alpha 0 -> 1
    this.titleText.setVisible(true).setScale(2.2).setAlpha(0);
    this.scene.tweens.add({
      targets: this.titleText, scale: 1.0, alpha: 1,
      duration: 500, delay: 300, ease: 'Back.easeOut',
    });

    // 500ms: poster + score/record fade in (y +30 -> 0, alpha 0 -> 1)
    this.posterGfx.setAlpha(0);
    this.scoreText.setVisible(true).setAlpha(0).setY(H * 0.35 + 30);
    this.bestText.setVisible(true).setAlpha(0).setY(H * 0.39 + 30);

    this.scene.tweens.add({
      targets: this.posterGfx, alpha: 1, duration: 400, delay: 500, ease: 'Cubic.easeOut',
    });
    this.scene.tweens.add({
      targets: [this.scoreText, this.bestText],
      alpha: 1,
      y: (target) => target === this.scoreText ? H * 0.35 : H * 0.39,
      duration: 400, delay: 500, ease: 'Cubic.easeOut',
    });

    // 700ms: HTML кнопки opacity 0 -> 1
    this.buttonsDiv.style.display = 'flex';
    this.buttonsDiv.style.opacity = '0';
    // AD кнопка — всегда видна (больше просмотров рекламы = больше доход)
    this.continueAdBtn.style.display = 'block';
    // Stars кнопка — всегда видна в Telegram (без лимита)
    if (this.continueStarBtn) this.continueStarBtn.style.display = 'block';

    this.scene.time.delayedCall(700, () => {
      this.buttonsDiv.style.opacity = '1';
    });

    // Новый рекорд: пульсация + искры
    if (isNewBest) {
      this.newBestText.setVisible(true).setScale(0.3).setAlpha(0);
      this.scene.tweens.add({
        targets: this.newBestText, scale: 1.15, alpha: 1,
        duration: 500, delay: 500, ease: 'Back.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this.newBestText, scale: 1.0,
            duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
          });
        },
      });
      // 600ms: искры вокруг рекорда
      this.scene.time.delayedCall(600, () => {
        createEmberBurst(this.scene, W / 2, H * 0.39, 15);
      });
    }

    // === Кнопка CLAIM SKIN — если челлендж выполнен но не claimed ===
    const challengeMgr = this._challengeMgr;
    const ch = challengeMgr ? challengeMgr.getCurrentChallenge() : null;
    if (ch && ch.completed && !ch.claimed) {
      const claimBtn = this._createButton(t('challenge_claim'), 'claim');
      // Переопределяем стиль — amber цвет и amber border
      claimBtn.style.color = NEON_AMBER;
      claimBtn.style.borderColor = 'rgba(255, 184, 0, 0.5)';

      // Удаляем старый click listener и добавляем свой
      const newClaimBtn = claimBtn.cloneNode(true);
      newClaimBtn.addEventListener('click', () => {
        const skinId = challengeMgr.claimReward();
        if (skinId) {
          newClaimBtn.textContent = t('challenge_claimed');
          newClaimBtn.disabled = true;
          newClaimBtn.style.opacity = '0.5';
          newClaimBtn.style.pointerEvents = 'none';
        }
      });

      // Вставляем перед кнопкой MENU (последняя кнопка)
      this.buttonsDiv.insertBefore(newClaimBtn, this.menuBtn);
      // Сохраняем ссылку для очистки
      this.claimBtn = newClaimBtn;
    }
  }

  hide() {
    // Анимированное скрытие Phaser-элементов
    const allTargets = this.elements.filter(el => el && el.active);
    if (allTargets.length > 0) {
      this.scene.tweens.add({
        targets: allTargets, alpha: 0, duration: 200, ease: 'Linear',
      });
    }

    // Poster и blood — тоже fade out
    if (this.posterGfx) {
      this.scene.tweens.add({
        targets: this.posterGfx, alpha: 0, duration: 200,
        onComplete: () => { this.posterGfx.destroy(); this.posterGfx = null; },
      });
    }

    if (this.bloodGfx) {
      this.scene.tweens.add({
        targets: this.bloodGfx, alpha: 0, duration: 200,
        onComplete: () => { this.bloodGfx.destroy(); this.bloodGfx = null; },
      });
    }

    // HTML кнопки — fade out, потом hide
    this.buttonsDiv.style.opacity = '0';
    setTimeout(() => {
      this.buttonsDiv.style.display = 'none';
      // Удаляем кнопку claim если была
      if (this.claimBtn) {
        this.claimBtn.remove();
        this.claimBtn = null;
      }
      // Сбрасываем видимость Phaser-элементов после fade
      for (const el of this.elements) {
        if (el && el.active) el.setVisible(false).setAlpha(1);
      }
    }, 200);
  }

  destroy() {
    if (this.bloodGfx) { this.bloodGfx.destroy(); this.bloodGfx = null; }
    if (this.posterGfx) { this.posterGfx.destroy(); this.posterGfx = null; }
    if (this.scanlines) { this.scanlines.destroy(); this.scanlines = null; }
    const el = document.getElementById('game-over-buttons');
    if (el) el.remove();
    this.leaderboardUI.destroy();
  }
}
