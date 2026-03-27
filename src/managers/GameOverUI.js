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

    // Состояние отображения
    this._visible = false;
    this._score = 0;
    this._best = 0;
    this._isNewBest = false;
    this._scoreStr = '';
    this._bestStr = '';

    // Анимация
    this._showTime = 0;
    this._overlayAlpha = 0;
    this._titleScale = 2.2;
    this._titleAlpha = 0;
    this._scoreAlpha = 0;
    this._scoreY = 0;
    this._bestAlpha = 0;
    this._bestY = 0;
    this._newBestScale = 0.3;
    this._newBestAlpha = 0;
    this._newBestPulseTime = 0;
    this._posterAlpha = 0;
    this._bloodAlpha = 0;

    // Предгенерированные данные крови (сохраняем чтобы не менялись каждый кадр)
    this._bloodSeed = Math.random();
  }

  create({ onContinueAd, onContinueStars, onRestart, onMenu, challengeMgr }) {
    this._challengeMgr = challengeMgr || null;
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
    this._isDesktop = isDesktop;

    // CONTINUE AD (только мобайл — на десктопе рекламы нет)
    if (!isDesktop) {
      this.continueAdBtn = this._createButton(t('continue_ad'), 'continue_ad');
      this.buttonsDiv.appendChild(this.continueAdBtn);
    }

    // CONTINUE STARS
    if (profile.isAuthorized) {
      this.continueStarBtn = this._createButton(t('continue_star'), 'continue_star');
      this.buttonsDiv.appendChild(this.continueStarBtn);
    }

    // RESTART
    this.restartBtn = this._createButton(t('restart'), 'restart');
    this.buttonsDiv.appendChild(this.restartBtn);

    // LEADERBOARD
    this.leaderboardBtn = this._createButton(t('leaderboard'), 'leaderboard');
    this.buttonsDiv.appendChild(this.leaderboardBtn);

    // MENU
    this.menuBtn = this._createButton(t('menu'), 'menu');
    this.buttonsDiv.appendChild(this.menuBtn);

    const root = document.getElementById('game-ui');
    if (root) {
      root.appendChild(this.buttonsDiv);
    } else {
      document.body.appendChild(this.buttonsDiv);
    }
  }

  _createButton(label, type) {
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
    this._visible = true;
    this._score = score;
    this._best = best;
    this._isNewBest = isNewBest;
    this._scoreStr = `${t('depth_label')}: ${score}${t('unit_m')}`;
    this._bestStr = `${t('record_label')}: ${best}${t('unit_m')}`;

    // Сброс анимации
    this._showTime = 0;
    this._overlayAlpha = 0;
    this._titleScale = 2.2;
    this._titleAlpha = 0;
    this._scoreAlpha = 0;
    this._scoreY = H * 0.35 + 30;
    this._bestAlpha = 0;
    this._bestY = H * 0.39 + 30;
    this._newBestScale = 0.3;
    this._newBestAlpha = 0;
    this._newBestPulseTime = 0;
    this._posterAlpha = 0;
    this._bloodAlpha = 0;

    // Continue кнопки
    if (this.continueAdBtn) this.continueAdBtn.style.display = 'block';
    if (this.continueStarBtn) this.continueStarBtn.style.display = 'block';

    // Кнопки с задержкой 700ms — управляется в draw()
    this._buttonsShown = false;

    // === Кнопка CLAIM SKIN — только если испытание выполнено И скин ещё не получен ===
    const challengeMgr = this._challengeMgr;
    const ch = challengeMgr ? challengeMgr.getCurrentChallenge() : null;
    const skinAlreadyUnlocked = ch ? profile.isSkinUnlocked(ch.rewardSkin) : true;
    if (ch && ch.completed && !ch.claimed && !skinAlreadyUnlocked) {
      this.claimBtn = this._createButton(t('challenge_claim'), 'claim');
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
    this._visible = false;
    this.buttonsDiv.classList.remove('gameover-buttons--visible');

    if (this.claimBtn) {
      this.claimBtn.remove();
      this.claimBtn = null;
    }
  }

  // Отрисовка Game Over — в экранных координатах
  draw(ctx, delta) {
    if (!this._visible) return;

    const W = this.scene.W;
    const H = this.scene.H;
    this._showTime += delta;

    // === Анимация по времени ===

    // 0ms: overlay 0→0.85 (400ms)
    if (this._showTime < 400) {
      this._overlayAlpha = Math.min(0.85, (this._showTime / 400) * 0.85);
    } else {
      this._overlayAlpha = 0.85;
    }

    // 0ms: кровь 0→0.6 (300ms)
    if (this._showTime < 300) {
      this._bloodAlpha = (this._showTime / 300) * 0.6;
    } else {
      this._bloodAlpha = 0.6;
    }

    // 300ms: title scale 2.2→1, alpha 0→1 (500ms, Back.easeOut)
    if (this._showTime > 300 && this._showTime < 800) {
      const t = (this._showTime - 300) / 500;
      const s = 1.70158;
      const t1 = t - 1;
      const eased = 1 + (s + 1) * t1 * t1 * t1 + s * t1 * t1;
      this._titleScale = 2.2 + (1 - 2.2) * eased;
      this._titleAlpha = eased;
    } else if (this._showTime >= 800) {
      this._titleScale = 1;
      this._titleAlpha = 1;
    }

    // 500ms: poster+score/record fade in (400ms, Cubic.easeOut)
    if (this._showTime > 500 && this._showTime < 900) {
      const t = (this._showTime - 500) / 400;
      const eased = 1 - Math.pow(1 - t, 3);
      this._posterAlpha = eased;
      this._scoreAlpha = eased;
      this._scoreY = H * 0.35 + 30 * (1 - eased);
      this._bestAlpha = eased;
      this._bestY = H * 0.39 + 30 * (1 - eased);
    } else if (this._showTime >= 900) {
      this._posterAlpha = 1;
      this._scoreAlpha = 1;
      this._scoreY = H * 0.35;
      this._bestAlpha = 1;
      this._bestY = H * 0.39;
    }

    // 500ms: new best scale+alpha (500ms, Back.easeOut)
    if (this._isNewBest && this._showTime > 500 && this._showTime < 1000) {
      const t = (this._showTime - 500) / 500;
      const s = 1.70158;
      const t1 = t - 1;
      const eased = 1 + (s + 1) * t1 * t1 * t1 + s * t1 * t1;
      this._newBestScale = 0.3 + (1.15 - 0.3) * eased;
      this._newBestAlpha = eased;
    } else if (this._isNewBest && this._showTime >= 1000) {
      this._newBestPulseTime += delta;
      this._newBestScale = 1 + 0.15 * Math.sin(this._newBestPulseTime * 0.009);
      this._newBestAlpha = 1;
    }

    // 700ms: показать кнопки
    if (!this._buttonsShown && this._showTime > 700) {
      this._buttonsShown = true;
      this.buttonsDiv.classList.add('gameover-buttons--visible');
    }

    // === РИСОВАНИЕ ===

    // Затемнение
    ctx.globalAlpha = this._overlayAlpha;
    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, W, H);

    // Scanlines
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.03;
    for (let y = 0; y < H; y += 4) {
      ctx.fillRect(0, y, W, 2);
    }

    // Кровь
    if (this._bloodAlpha > 0.01) {
      ctx.globalAlpha = this._bloodAlpha;
      // Используем сохранённый seed чтобы рисунок не прыгал
      const savedRandom = Math.random;
      let _seed = this._bloodSeed;
      // eslint-disable-next-line no-global-assign
      Math.random = () => { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; };
      drawBloodSplatter(ctx, W / 2, H * 0.5, 120, 0.8);
      Math.random = savedRandom;
    }

    // Poster рамка
    if (this._posterAlpha > 0.01) {
      ctx.globalAlpha = this._posterAlpha;
      drawSteelFrame(ctx, W / 2, H * 0.37, 220, 90);
      drawChainDecoration(ctx, W / 2 - 110, H * 0.37 - 50, W / 2 + 110, H * 0.37 - 50);
      drawChainDecoration(ctx, W / 2 - 110, H * 0.37 + 50, W / 2 + 110, H * 0.37 + 50);
    }

    // "YOU FELL"
    if (this._titleAlpha > 0.01) {
      ctx.save();
      ctx.translate(W / 2, H * 0.26);
      ctx.scale(this._titleScale, this._titleScale);
      ctx.globalAlpha = this._titleAlpha;
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
    if (this._scoreAlpha > 0.01) {
      ctx.globalAlpha = this._scoreAlpha;
      ctx.font = `bold 20px ${FONT_MONO}`;
      ctx.fillStyle = NEON_AMBER;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#FFB800';
      ctx.shadowBlur = 2;
      ctx.strokeStyle = NEON_BG;
      ctx.lineWidth = 2;
      ctx.strokeText(this._scoreStr, W / 2, this._scoreY);
      ctx.fillText(this._scoreStr, W / 2, this._scoreY);
      ctx.shadowBlur = 0;
    }

    // Best
    if (this._bestAlpha > 0.01) {
      ctx.globalAlpha = this._bestAlpha;
      ctx.font = `bold 30px ${FONT_MONO}`;
      const bestColor = this._isNewBest ? NEON_AMBER : NEON_CYAN;
      ctx.fillStyle = bestColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = bestColor;
      ctx.shadowBlur = 2;
      ctx.strokeStyle = NEON_BG;
      ctx.lineWidth = 5;
      ctx.strokeText(this._bestStr, W / 2, this._bestY);
      ctx.fillText(this._bestStr, W / 2, this._bestY);
      ctx.shadowBlur = 0;
    }

    // New best
    if (this._isNewBest && this._newBestAlpha > 0.01) {
      ctx.save();
      ctx.translate(W / 2, H * 0.44);
      ctx.scale(this._newBestScale, this._newBestScale);
      ctx.globalAlpha = this._newBestAlpha;
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
