import { FONT_MONO } from '../constants.js';
import { t } from '../i18n.js';
import { SKINS } from './SkinRenderer.js';
import { profile } from '../data/index.js';
import { drawBloodSplatter, drawSteelFrame, drawChainDecoration } from '../managers/UIFactory.js';
import { LeaderboardUI } from './LeaderboardUI.js';

// ===== NEON WESTERN ПАЛИТРА =====
const NEON_CYAN = '#00F5D4';
const NEON_PINK = '#FF2E63';
const NEON_AMBER = '#FFB800';
const NEON_BG = '#0A0E1A';
const NEON_STEEL = '#4A5580';
const NEON_FONT = "'Inter', 'Helvetica Neue', sans-serif";

// Менеджер Game Over экрана — neon western glassmorphism
// Canvas 2D для графики + HTML для кнопок
export class GameOverUI {
  // Приватные поля — состояние
  #visible = false;
  #score = 0;
  #best = 0;
  #isNewBest = false;
  #scoreStr = '';
  #bestStr = '';
  #isDesktop = false;
  #challengeMgr = null;

  // Приватные поля — анимация
  #showTime = 0;
  #overlayAlpha = 0;
  #titleScale = 2.2;
  #titleAlpha = 0;
  #scoreAlpha = 0;
  #scoreY = 0;
  #bestAlpha = 0;
  #bestY = 0;
  #newBestScale = 0.3;
  #newBestAlpha = 0;
  #newBestPulseTime = 0;
  #posterAlpha = 0;
  #bloodAlpha = 0;
  #bloodSeed = Math.random();
  #buttonsShown = false;

  constructor(scene) {
    this.scene = scene;
    this.buttonsDiv = null;
    this.continueAdBtn = null;
    this.continueStarBtn = null;
    this.restartBtn = null;
    this.menuBtn = null;

    // Лидерборд
    this.leaderboardUI = new LeaderboardUI();

    // Callbacks
    this.onContinueAd = null;
    this.onContinueStars = null;
    this.onRestart = null;
    this.onMenu = null;
  }

  create({ onContinueAd, onContinueStars, onRestart, onMenu, challengeMgr }) {
    this.#challengeMgr = challengeMgr || null;
    this.onContinueAd = onContinueAd;
    this.onContinueStars = onContinueStars;
    this.onRestart = onRestart;
    this.onMenu = onMenu;

    // --- HTML кнопки поверх canvas — neon glass, в #game-ui ---
    this.buttonsDiv = document.createElement('div');
    this.buttonsDiv.classList.add('gameover-buttons');

    // Десктоп: реклама недоступна — показываем только Stars
    const platform = window.Telegram?.WebApp?.platform || '';
    const isDesktop = platform === 'tdesktop' || platform === 'web' || platform === 'macos';
    this.#isDesktop = isDesktop;

    // CONTINUE AD (только мобайл — на десктопе рекламы нет)
    if (!isDesktop) {
      this.continueAdBtn = this.#createButton(t('continue_ad'), 'continue_ad');
      this.buttonsDiv.appendChild(this.continueAdBtn);
    }

    // CONTINUE STARS
    if (profile.isAuthorized) {
      this.continueStarBtn = this.#createButton(t('continue_star'), 'continue_star');
      this.buttonsDiv.appendChild(this.continueStarBtn);
    }

    // RESTART
    this.restartBtn = this.#createButton(t('restart'), 'restart');
    this.buttonsDiv.appendChild(this.restartBtn);

    // LEADERBOARD
    this.leaderboardBtn = this.#createButton(t('leaderboard'), 'leaderboard');
    this.buttonsDiv.appendChild(this.leaderboardBtn);

    // MENU
    this.menuBtn = this.#createButton(t('menu'), 'menu');
    this.buttonsDiv.appendChild(this.menuBtn);

    const root = document.getElementById('game-ui');
    if (root) {
      root.appendChild(this.buttonsDiv);
    } else {
      document.body.appendChild(this.buttonsDiv);
    }
  }

  #createButton(label, type) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.classList.add('btn-neon');

    const isSmall = type === 'menu' || type === 'leaderboard';
    const isContinue = type === 'continue_ad' || type === 'continue_star';
    if (isSmall) btn.classList.add('btn-neon--small');
    else if (isContinue) btn.classList.add('btn-neon--medium');

    const isMenu = type === 'menu';
    if (isContinue) btn.classList.add('btn-neon--amber');
    else if (isMenu) btn.classList.add('btn-neon--steel');

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
    const H = this.scene.H;
    this.#visible = true;
    this.#score = score;
    this.#best = best;
    this.#isNewBest = isNewBest;
    this.#scoreStr = `${t('depth_label')}: ${score}${t('unit_m')}`;
    this.#bestStr = `${t('record_label')}: ${best}${t('unit_m')}`;

    // Сброс анимации
    this.#showTime = 0;
    this.#overlayAlpha = 0;
    this.#titleScale = 2.2;
    this.#titleAlpha = 0;
    this.#scoreAlpha = 0;
    this.#scoreY = H * 0.35 + 30;
    this.#bestAlpha = 0;
    this.#bestY = H * 0.39 + 30;
    this.#newBestScale = 0.3;
    this.#newBestAlpha = 0;
    this.#newBestPulseTime = 0;
    this.#posterAlpha = 0;
    this.#bloodAlpha = 0;

    // Continue кнопки
    if (this.continueAdBtn) this.continueAdBtn.style.display = 'block';
    if (this.continueStarBtn) this.continueStarBtn.style.display = 'block';

    // Кнопки с задержкой 700ms — управляется в draw()
    this.#buttonsShown = false;

    // === Кнопка CLAIM SKIN — только если испытание выполнено И скин ещё не получен ===
    const challengeMgr = this.#challengeMgr;
    const ch = challengeMgr ? challengeMgr.getCurrentChallenge() : null;
    const skinAlreadyUnlocked = ch ? profile.isSkinUnlocked(ch.rewardSkin) : true;
    if (ch && ch.completed && !ch.claimed && !skinAlreadyUnlocked) {
      this.claimBtn = this.#createButton(t('challenge_claim'), 'claim');
      this.claimBtn.classList.add('btn-neon--amber');
      this.claimBtn.addEventListener('click', () => {
        const skinId = challengeMgr.claimReward();
        if (skinId) {
          this.claimBtn.textContent = t('challenge_claimed');
          this.claimBtn.classList.add('btn-neon--disabled');
        }
      });
      this.buttonsDiv.insertBefore(this.claimBtn, this.menuBtn);
    }
  }

  hide() {
    this.#visible = false;
    this.buttonsDiv.classList.remove('gameover-buttons--visible');

    if (this.claimBtn) {
      this.claimBtn.remove();
      this.claimBtn = null;
    }
  }

  // Отрисовка Game Over — в экранных координатах
  draw(ctx, delta) {
    if (!this.#visible) return;

    const W = this.scene.W;
    const H = this.scene.H;
    this.#showTime += delta;

    // === Анимация по времени ===

    // 0ms: overlay 0→0.85 (400ms)
    if (this.#showTime < 400) {
      this.#overlayAlpha = Math.min(0.85, (this.#showTime / 400) * 0.85);
    } else {
      this.#overlayAlpha = 0.85;
    }

    // 0ms: кровь 0→0.6 (300ms)
    if (this.#showTime < 300) {
      this.#bloodAlpha = (this.#showTime / 300) * 0.6;
    } else {
      this.#bloodAlpha = 0.6;
    }

    // 300ms: title scale 2.2→1, alpha 0→1 (500ms, Back.easeOut)
    if (this.#showTime > 300 && this.#showTime < 800) {
      const t = (this.#showTime - 300) / 500;
      const s = 1.70158;
      const t1 = t - 1;
      const eased = 1 + (s + 1) * t1 * t1 * t1 + s * t1 * t1;
      this.#titleScale = 2.2 + (1 - 2.2) * eased;
      this.#titleAlpha = eased;
    } else if (this.#showTime >= 800) {
      this.#titleScale = 1;
      this.#titleAlpha = 1;
    }

    // 500ms: poster+score/record fade in (400ms, Cubic.easeOut)
    if (this.#showTime > 500 && this.#showTime < 900) {
      const t = (this.#showTime - 500) / 400;
      const eased = 1 - Math.pow(1 - t, 3);
      this.#posterAlpha = eased;
      this.#scoreAlpha = eased;
      this.#scoreY = H * 0.35 + 30 * (1 - eased);
      this.#bestAlpha = eased;
      this.#bestY = H * 0.39 + 30 * (1 - eased);
    } else if (this.#showTime >= 900) {
      this.#posterAlpha = 1;
      this.#scoreAlpha = 1;
      this.#scoreY = H * 0.35;
      this.#bestAlpha = 1;
      this.#bestY = H * 0.39;
    }

    // 500ms: new best scale+alpha (500ms, Back.easeOut)
    if (this.#isNewBest && this.#showTime > 500 && this.#showTime < 1000) {
      const t = (this.#showTime - 500) / 500;
      const s = 1.70158;
      const t1 = t - 1;
      const eased = 1 + (s + 1) * t1 * t1 * t1 + s * t1 * t1;
      this.#newBestScale = 0.3 + (1.15 - 0.3) * eased;
      this.#newBestAlpha = eased;
    } else if (this.#isNewBest && this.#showTime >= 1000) {
      this.#newBestPulseTime += delta;
      this.#newBestScale = 1 + 0.15 * Math.sin(this.#newBestPulseTime * 0.009);
      this.#newBestAlpha = 1;
    }

    // 700ms: показать кнопки
    if (!this.#buttonsShown && this.#showTime > 700) {
      this.#buttonsShown = true;
      this.buttonsDiv.classList.add('gameover-buttons--visible');
    }

    // === РИСОВАНИЕ ===

    // Затемнение
    ctx.globalAlpha = this.#overlayAlpha;
    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, W, H);

    // Scanlines
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.03;
    for (let y = 0; y < H; y += 4) {
      ctx.fillRect(0, y, W, 2);
    }

    // Кровь
    if (this.#bloodAlpha > 0.01) {
      ctx.globalAlpha = this.#bloodAlpha;
      // Используем сохранённый seed чтобы рисунок не прыгал
      const savedRandom = Math.random;
      let _seed = this.#bloodSeed;
      // eslint-disable-next-line no-global-assign
      Math.random = () => { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; };
      drawBloodSplatter(ctx, W / 2, H * 0.5, 120, 0.8);
      Math.random = savedRandom;
    }

    // Poster рамка
    if (this.#posterAlpha > 0.01) {
      ctx.globalAlpha = this.#posterAlpha;
      drawSteelFrame(ctx, W / 2, H * 0.37, 220, 90);
      drawChainDecoration(ctx, W / 2 - 110, H * 0.37 - 50, W / 2 + 110, H * 0.37 - 50);
      drawChainDecoration(ctx, W / 2 - 110, H * 0.37 + 50, W / 2 + 110, H * 0.37 + 50);
    }

    // "YOU FELL"
    if (this.#titleAlpha > 0.01) {
      ctx.save();
      ctx.translate(W / 2, H * 0.26);
      ctx.scale(this.#titleScale, this.#titleScale);
      ctx.globalAlpha = this.#titleAlpha;
      ctx.font = `bold 48px ${NEON_FONT}`;
      ctx.fillStyle = NEON_PINK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = NEON_BG;
      ctx.lineWidth = 6;
      ctx.shadowColor = '#FF2E63';
      ctx.shadowBlur = 4;
      ctx.strokeText(t('you_died'), 0, 0);
      ctx.fillText(t('you_died'), 0, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Score
    if (this.#scoreAlpha > 0.01) {
      ctx.globalAlpha = this.#scoreAlpha;
      ctx.font = `bold 20px ${FONT_MONO}`;
      ctx.fillStyle = NEON_AMBER;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#FFB800';
      ctx.shadowBlur = 2;
      ctx.strokeStyle = NEON_BG;
      ctx.lineWidth = 2;
      ctx.strokeText(this.#scoreStr, W / 2, this.#scoreY);
      ctx.fillText(this.#scoreStr, W / 2, this.#scoreY);
      ctx.shadowBlur = 0;
    }

    // Best
    if (this.#bestAlpha > 0.01) {
      ctx.globalAlpha = this.#bestAlpha;
      ctx.font = `bold 30px ${FONT_MONO}`;
      const bestColor = this.#isNewBest ? NEON_AMBER : NEON_CYAN;
      ctx.fillStyle = bestColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = bestColor;
      ctx.shadowBlur = 2;
      ctx.strokeStyle = NEON_BG;
      ctx.lineWidth = 5;
      ctx.strokeText(this.#bestStr, W / 2, this.#bestY);
      ctx.fillText(this.#bestStr, W / 2, this.#bestY);
      ctx.shadowBlur = 0;
    }

    // New best
    if (this.#isNewBest && this.#newBestAlpha > 0.01) {
      ctx.save();
      ctx.translate(W / 2, H * 0.44);
      ctx.scale(this.#newBestScale, this.#newBestScale);
      ctx.globalAlpha = this.#newBestAlpha;
      ctx.font = `bold italic 22px ${NEON_FONT}`;
      ctx.fillStyle = NEON_AMBER;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = NEON_BG;
      ctx.lineWidth = 4;
      ctx.strokeText(t('new_record'), 0, 0);
      ctx.fillText(t('new_record'), 0, 0);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  }

  destroy() {
    if (this.buttonsDiv) { this.buttonsDiv.remove(); this.buttonsDiv = null; }
    this.leaderboardUI.destroy();
  }
}
