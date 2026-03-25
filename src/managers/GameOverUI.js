import { GOLD, DARK_RED, FONT, Z } from '../constants.js';
import { t } from '../i18n.js';
import { isTelegram, fetchLeaderboard, getTelegramUserId } from '../telegram.js';
import {
  drawBloodSplatter, drawWantedPosterFrame,
  drawRopeDecoration, createEmberBurst,
} from '../managers/UIFactory.js';

// Менеджер Game Over экрана — premium glassmorphism
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

    this.leaderboardDiv = null;

    // Callbacks
    this.onContinue = null;
    this.onRestart = null;
    this.onMenu = null;
  }

  create({ onContinue, onRestart, onMenu }) {
    this.onContinue = onContinue;
    this.onRestart = onRestart;
    this.onMenu = onMenu;

    const W = this.scene.W;
    const H = this.scene.H;
    const makeUI = (obj) => {
      obj.setScrollFactor(0).setDepth(Z.GAME_OVER).setVisible(false);
      this.elements.push(obj);
      return obj;
    };

    // Затемнение — глубокий navy
    this.overlayRect = makeUI(
      this.scene.add.rectangle(W / 2, H / 2, W, H, 0x0C1018, 0.80)
    );

    // Заголовок "YOU FELL" — крупный, драматичный
    this.titleText = makeUI(this.scene.add.text(W / 2, H * 0.26, t('you_died'), {
      fontSize: '48px', color: DARK_RED, fontFamily: FONT, fontStyle: 'bold',
      stroke: '#080C12', strokeThickness: 7,
    }).setOrigin(0.5));

    // Высота (score) — крупнее, ярче
    this.scoreText = makeUI(this.scene.add.text(W / 2, H * 0.35, '', {
      fontSize: '20px', color: GOLD, fontFamily: FONT, fontStyle: 'bold',
      stroke: '#101520', strokeThickness: 2,
    }).setOrigin(0.5));

    // Рекорд (best) — крупный, при рекорде станет GOLD
    this.bestText = makeUI(this.scene.add.text(W / 2, H * 0.39, '', {
      fontSize: '30px', color: '#A09060', fontFamily: FONT, fontStyle: 'bold',
      stroke: '#101520', strokeThickness: 5,
    }).setOrigin(0.5));

    // НОВЫЙ РЕКОРД — крупный, яркий
    this.newBestText = makeUI(this.scene.add.text(W / 2, H * 0.44, t('new_record'), {
      fontSize: '22px', color: GOLD, fontFamily: FONT, fontStyle: 'bold italic',
      stroke: '#101520', strokeThickness: 4,
    }).setOrigin(0.5));

    // --- HTML кнопки поверх canvas — premium glassmorphism ---
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

    // CONTINUE — Stars в Telegram, AD вне Telegram
    const continueLabel = isTelegram() ? t('continue_star') : t('continue_ad');
    this.continueBtn = this._createButton(continueLabel, 'continue');
    this.buttonsDiv.appendChild(this.continueBtn);

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
    this._createLeaderboardPanel();
  }

  // Единый плоский стиль кнопок — flat minimal 2025
  _createButton(label, type) {
    const btn = document.createElement('button');
    btn.textContent = label;

    // Единый базовый стиль для ВСЕХ кнопок
    const isSmall = type === 'menu' || type === 'leaderboard';
    const fontSize = isSmall ? '14px' : type === 'continue' ? '16px' : '20px';
    const padding = isSmall ? '10px 32px' : type === 'continue' ? '12px 40px' : '14px 52px';

    btn.style.cssText = `
      font-family: Georgia, serif; cursor: pointer;
      outline: none; pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
      text-transform: uppercase;
      letter-spacing: 2px;
      background: rgba(255, 255, 255, 0.06);
      color: #F5B842;
      border: 1px solid rgba(245, 184, 66, 0.25);
      font-size: ${fontSize}; font-weight: bold;
      padding: ${padding};
      border-radius: 12px;
      transition: all 0.12s ease;
    `;

    // Единые hover/press для всех
    const onEnter = () => {
      btn.style.background = 'rgba(255, 255, 255, 0.10)';
      btn.style.borderColor = 'rgba(245, 184, 66, 0.45)';
    };
    const onLeave = () => {
      btn.style.background = 'rgba(255, 255, 255, 0.06)';
      btn.style.borderColor = 'rgba(245, 184, 66, 0.25)';
    };
    const onDown = () => {
      btn.style.transform = 'scale(0.97)';
      btn.style.background = 'rgba(245, 184, 66, 0.12)';
    };
    const onUp = () => {
      btn.style.transform = '';
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
      continue: () => this.onContinue?.(),
      menu: () => this.onMenu?.(),
      leaderboard: () => this._showLeaderboard(),
    };
    btn.addEventListener('click', () => handlers[type]?.());

    return btn;
  }

  _createLeaderboardPanel() {
    this.leaderboardDiv = document.createElement('div');
    this.leaderboardDiv.id = 'leaderboard-panel';
    this.leaderboardDiv.style.cssText = `
      display: none; position: fixed; top: 0; left: 0;
      width: 100%; height: 100%; z-index: ${Z.HTML_BUTTONS + 10};
      background: rgba(12, 16, 24, 0.96);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      flex-direction: column; align-items: center;
      padding: 40px 16px 20px;
      overflow-y: auto;
      opacity: 0; transition: opacity 0.3s ease;
    `;

    // Кнопка закрытия
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = `
      position: absolute; top: 12px; right: 16px;
      background: none; border: none; color: #7A8098;
      font-size: 26px; cursor: pointer; pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
    `;
    closeBtn.addEventListener('click', () => this._hideLeaderboard());
    this.leaderboardDiv.appendChild(closeBtn);

    // Заголовок
    const title = document.createElement('div');
    title.textContent = `🏆 ${t('leaderboard')}`;
    title.style.cssText = `
      font-family: Georgia, serif; font-size: 26px; font-weight: bold;
      color: #F5B842; margin-bottom: 24px; letter-spacing: 3px;
      text-transform: uppercase;
    `;
    this.leaderboardDiv.appendChild(title);

    // Контейнер для списка
    this.lbList = document.createElement('div');
    this.lbList.style.cssText = `
      width: 100%; max-width: 360px;
    `;
    this.leaderboardDiv.appendChild(this.lbList);

    document.body.appendChild(this.leaderboardDiv);
  }

  async _showLeaderboard() {
    const lb = await fetchLeaderboard();
    const myId = getTelegramUserId();

    this.lbList.innerHTML = '';

    if (lb.length === 0) {
      this.lbList.innerHTML = `<div style="color:#7A8098;font-family:Georgia,serif;text-align:center;padding:40px 0;font-size:16px">${t('lb_empty')}</div>`;
    } else {
      lb.forEach((entry, i) => {
        const isMe = myId && entry.userId === myId;
        const row = document.createElement('div');
        row.style.cssText = `
          display: flex; align-items: center; padding: 12px 14px;
          margin-bottom: 6px; border-radius: 10px;
          background: ${isMe ? 'rgba(245, 184, 66, 0.12)' : 'rgba(26, 32, 48, 0.70)'};
          border: 1px solid ${isMe ? 'rgba(245, 184, 66, 0.30)' : 'rgba(110, 117, 136, 0.15)'};
          font-family: Georgia, serif;
        `;

        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        const rank = medal || `${i + 1}`;

        row.innerHTML = `
          <span style="width:36px;text-align:center;font-size:${medal ? '20px' : '15px'};color:#7A8098">${rank}</span>
          <span style="flex:1;color:${isMe ? '#F5B842' : '#c4c8d4'};font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${entry.name}${isMe ? ` <span style="font-size:12px;color:#F5B842">${t('lb_you')}</span>` : ''}
          </span>
          <span style="color:#F5B842;font-size:16px;font-weight:bold">${entry.score}${t('unit_m')}</span>
        `;
        this.lbList.appendChild(row);
      });
    }

    this.leaderboardDiv.style.display = 'flex';
    requestAnimationFrame(() => {
      this.leaderboardDiv.style.opacity = '1';
    });
  }

  _hideLeaderboard() {
    this.leaderboardDiv.style.opacity = '0';
    setTimeout(() => {
      this.leaderboardDiv.style.display = 'none';
    }, 300);
  }

  show(score, best, isNewBest, continueUsed) {
    const W = this.scene.W;
    const H = this.scene.H;

    this.scoreText.setText(`${t('depth_label')}: ${score}${t('unit_m')}`);
    this.bestText.setText(`${t('record_label')}: ${best}${t('unit_m')}`);

    if (isNewBest) {
      this.bestText.setColor(GOLD);
    } else {
      this.newBestText.setVisible(false);
      this.bestText.setColor('#9A8A60');
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

    // 0ms: кровь alpha 0 → 0.6
    this.scene.tweens.add({
      targets: this.bloodGfx,
      alpha: 0.6,
      duration: 300,
      ease: 'Linear',
    });

    // 0ms: overlay alpha 0 → 0.75 (400ms)
    this.overlayRect.setVisible(true).setAlpha(0);
    this.scene.tweens.add({
      targets: this.overlayRect,
      alpha: 0.75,
      duration: 400,
      ease: 'Linear',
    });

    // 300ms: "YOU FELL" — dramatic scale 2.2 → 1, alpha 0 → 1
    this.titleText.setVisible(true).setScale(2.2).setAlpha(0);
    this.scene.tweens.add({
      targets: this.titleText,
      scale: 1.0,
      alpha: 1,
      duration: 500,
      delay: 300,
      ease: 'Back.easeOut',
    });

    // 500ms: poster + score/record fade in (y +30 → 0, alpha 0 → 1)
    this.posterGfx.setAlpha(0);
    this.scoreText.setVisible(true).setAlpha(0).setY(H * 0.35 + 30);
    this.bestText.setVisible(true).setAlpha(0).setY(H * 0.39 + 30);

    this.scene.tweens.add({
      targets: this.posterGfx,
      alpha: 1,
      duration: 400,
      delay: 500,
      ease: 'Cubic.easeOut',
    });
    this.scene.tweens.add({
      targets: [this.scoreText, this.bestText],
      alpha: 1,
      y: (target) => target === this.scoreText ? H * 0.35 : H * 0.39,
      duration: 400,
      delay: 500,
      ease: 'Cubic.easeOut',
    });

    // 700ms: HTML кнопки opacity 0 → 1
    this.buttonsDiv.style.display = 'flex';
    this.buttonsDiv.style.opacity = '0';
    this.continueBtn.style.display = continueUsed ? 'none' : 'block';

    this.scene.time.delayedCall(700, () => {
      this.buttonsDiv.style.opacity = '1';
    });

    // Новый рекорд: пульсация + искры
    if (isNewBest) {
      this.newBestText.setVisible(true).setScale(0.3).setAlpha(0);
      this.scene.tweens.add({
        targets: this.newBestText,
        scale: 1.15,
        alpha: 1,
        duration: 500,
        delay: 500,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this.newBestText,
            scale: 1.0,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        },
      });
      // 600ms: искры вокруг рекорда
      this.scene.time.delayedCall(600, () => {
        createEmberBurst(this.scene, W / 2, H * 0.39, 15);
      });
    }
  }

  hide() {
    // Анимированное скрытие Phaser-элементов
    const allTargets = this.elements.filter(el => el && el.active);
    if (allTargets.length > 0) {
      this.scene.tweens.add({
        targets: allTargets,
        alpha: 0,
        duration: 200,
        ease: 'Linear',
      });
    }

    // Poster и blood — тоже fade out
    if (this.posterGfx) {
      this.scene.tweens.add({
        targets: this.posterGfx,
        alpha: 0,
        duration: 200,
        onComplete: () => { this.posterGfx.destroy(); this.posterGfx = null; },
      });
    }

    if (this.bloodGfx) {
      this.scene.tweens.add({
        targets: this.bloodGfx,
        alpha: 0,
        duration: 200,
        onComplete: () => { this.bloodGfx.destroy(); this.bloodGfx = null; },
      });
    }

    // HTML кнопки — fade out, потом hide
    this.buttonsDiv.style.opacity = '0';
    setTimeout(() => {
      this.buttonsDiv.style.display = 'none';
      // Сбрасываем видимость Phaser-элементов после fade
      for (const el of this.elements) {
        if (el && el.active) el.setVisible(false).setAlpha(1);
      }
    }, 200);
  }

  showContinueBtn(visible) {
    this.continueBtn.style.display = visible ? 'block' : 'none';
  }

  destroy() {
    if (this.bloodGfx) { this.bloodGfx.destroy(); this.bloodGfx = null; }
    if (this.posterGfx) { this.posterGfx.destroy(); this.posterGfx = null; }
    const el = document.getElementById('game-over-buttons');
    if (el) el.remove();
    const lb = document.getElementById('leaderboard-panel');
    if (lb) lb.remove();
  }
}
