import { GOLD, DARK_RED, FONT, Z } from '../constants.js';
import { t } from '../i18n.js';
import { isTelegram } from '../telegram.js';
import {
  drawBloodSplatter, drawWantedPosterFrame,
  drawRopeDecoration, createEmberBurst,
} from '../managers/UIFactory.js';

// Менеджер Game Over экрана — MUI-inspired brighter style
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

    // Затемнение — тёмно-синий blue-grey
    this.overlayRect = makeUI(
      this.scene.add.rectangle(W / 2, H / 2, W, H, 0x0e1420, 0.75)
    );

    // Заголовок "YOU FELL"
    this.titleText = makeUI(this.scene.add.text(W / 2, H * 0.28, t('you_died'), {
      fontSize: '42px', color: DARK_RED, fontFamily: FONT, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5));

    // Высота (score)
    this.scoreText = makeUI(this.scene.add.text(W / 2, H * 0.36, '', {
      fontSize: '18px', color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5));

    // Рекорд (best) — обычный серо-золотой, при рекорде станет GOLD
    this.bestText = makeUI(this.scene.add.text(W / 2, H * 0.40, '', {
      fontSize: '26px', color: '#9A8A60', fontFamily: FONT, fontStyle: 'bold',
      stroke: '#0e1420', strokeThickness: 4,
    }).setOrigin(0.5));

    // НОВЫЙ РЕКОРД
    this.newBestText = makeUI(this.scene.add.text(W / 2, H * 0.45, t('new_record'), {
      fontSize: '20px', color: GOLD, fontFamily: FONT, fontStyle: 'bold italic',
      stroke: '#1a2030', strokeThickness: 4,
    }).setOrigin(0.5));

    // --- Чистые HTML кнопки поверх canvas ---
    this.buttonsDiv = document.createElement('div');
    this.buttonsDiv.id = 'game-over-buttons';
    this.buttonsDiv.style.cssText = `
      display: none; position: fixed; top: 0; left: 0;
      width: 100%; height: 100%; z-index: ${Z.HTML_BUTTONS};
      pointer-events: none;
      flex-direction: column; align-items: center; justify-content: center;
      gap: 14px; padding-top: 52%;
      opacity: 0; transition: opacity 0.3s ease;
    `;

    // CONTINUE — Stars в Telegram, AD вне Telegram
    const continueLabel = isTelegram() ? t('continue_star') : t('continue_ad');
    this.continueBtn = this._createButton(continueLabel, 'continue');
    this.buttonsDiv.appendChild(this.continueBtn);

    // RESTART
    this.restartBtn = this._createButton(t('restart'), 'restart');
    this.buttonsDiv.appendChild(this.restartBtn);

    // MENU
    this.menuBtn = this._createButton(t('menu'), 'menu');
    this.buttonsDiv.appendChild(this.menuBtn);

    document.body.appendChild(this.buttonsDiv);
  }

  // Создание кнопки с MUI elevation стилями
  _createButton(label, type) {
    const btn = document.createElement('button');
    btn.textContent = label;

    const base = `font-family: Georgia, serif; cursor: pointer;
      outline: none; letter-spacing: 2px; pointer-events: auto;
      -webkit-tap-highlight-color: transparent;`;

    if (type === 'restart') {
      // PRIMARY — amber gold с elevation
      btn.style.cssText = `${base}
        background: rgba(30, 35, 48, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        color: #F0A030;
        border: 1px solid rgba(240, 160, 48, 0.35);
        font-size: 20px; font-weight: bold;
        padding: 14px 48px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(240,160,48,0.08), inset 0 1px 0 rgba(255,255,255,0.08);
        text-shadow: 0 0 8px rgba(240, 160, 48, 0.2);
        transition: all 0.15s ease;
      `;
      const onEnter = () => {
        btn.style.borderColor = 'rgba(240, 160, 48, 0.55)';
        btn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.45), 0 0 24px rgba(240,160,48,0.12), inset 0 1px 0 rgba(255,255,255,0.08)';
      };
      const onLeave = () => {
        btn.style.borderColor = 'rgba(240, 160, 48, 0.35)';
        btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(240,160,48,0.08), inset 0 1px 0 rgba(255,255,255,0.08)';
      };
      const onDown = () => {
        btn.style.transform = 'scale(0.97)';
        btn.style.borderColor = 'rgba(240, 160, 48, 0.6)';
        btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.5), 0 0 12px rgba(240,160,48,0.06), inset 0 1px 0 rgba(255,255,255,0.08)';
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
      btn.addEventListener('click', () => this.onRestart?.());

    } else if (type === 'continue') {
      // SECONDARY — steel border, меньше размер
      btn.style.cssText = `${base}
        background: rgba(30, 35, 48, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        color: #F0A030;
        border: 1px solid rgba(90, 93, 101, 0.35);
        font-size: 15px; font-weight: bold;
        padding: 10px 36px;
        border-radius: 10px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(240,160,48,0.08), inset 0 1px 0 rgba(255,255,255,0.08);
        text-shadow: 0 0 8px rgba(240, 160, 48, 0.2);
        transition: all 0.15s ease;
      `;
      const onEnter = () => {
        btn.style.borderColor = 'rgba(90, 93, 101, 0.55)';
        btn.style.boxShadow = '0 6px 16px rgba(0,0,0,0.45), 0 0 24px rgba(240,160,48,0.12), inset 0 1px 0 rgba(255,255,255,0.08)';
      };
      const onLeave = () => {
        btn.style.borderColor = 'rgba(90, 93, 101, 0.35)';
        btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4), 0 0 20px rgba(240,160,48,0.08), inset 0 1px 0 rgba(255,255,255,0.08)';
      };
      const onDown = () => {
        btn.style.transform = 'scale(0.97)';
        btn.style.borderColor = 'rgba(90, 93, 101, 0.6)';
        btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.5), 0 0 12px rgba(240,160,48,0.06), inset 0 1px 0 rgba(255,255,255,0.08)';
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
      btn.addEventListener('click', () => this.onContinue?.());

    } else if (type === 'menu') {
      // TERTIARY — прозрачный, только текст + underline on hover
      btn.style.cssText = `${base}
        background: transparent;
        color: #6A7080;
        border: none;
        border-bottom: 1px solid transparent;
        font-size: 14px;
        padding: 8px 36px;
        transition: all 0.15s ease;
      `;
      btn.addEventListener('mouseenter', () => {
        btn.style.color = '#F0A030';
        btn.style.borderBottomColor = 'rgba(240, 160, 48, 0.3)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.color = '#6A7080';
        btn.style.borderBottomColor = 'transparent';
      });
      const onDown = () => { btn.style.transform = 'scale(0.97)'; };
      const onUp = () => { btn.style.transform = ''; };
      btn.addEventListener('touchstart', onDown, { passive: true });
      btn.addEventListener('mousedown', onDown);
      btn.addEventListener('touchend', onUp, { passive: true });
      btn.addEventListener('mouseup', onUp);
      btn.addEventListener('click', () => this.onMenu?.());
    }

    return btn;
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

    // === Стальная рамка за счётом ===
    this.posterGfx = this.scene.add.graphics()
      .setScrollFactor(0).setDepth(Z.GAME_OVER).setAlpha(0);
    drawWantedPosterFrame(this.posterGfx, W / 2, H * 0.38, 200, 80);
    // Цепи сверху и снизу рамки
    drawRopeDecoration(this.posterGfx, W / 2 - 100, H * 0.38 - 44, W / 2 + 100, H * 0.38 - 44);
    drawRopeDecoration(this.posterGfx, W / 2 - 100, H * 0.38 + 44, W / 2 + 100, H * 0.38 + 44);

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

    // 300ms: "YOU FELL" — dramatic scale 2 → 1, alpha 0 → 1
    this.titleText.setVisible(true).setScale(2.0).setAlpha(0);
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
    this.scoreText.setVisible(true).setAlpha(0).setY(H * 0.36 + 30);
    this.bestText.setVisible(true).setAlpha(0).setY(H * 0.40 + 30);

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
      y: (target) => target === this.scoreText ? H * 0.36 : H * 0.40,
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
        createEmberBurst(this.scene, W / 2, H * 0.40, 15);
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
  }
}
