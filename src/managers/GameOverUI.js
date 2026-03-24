import { GOLD, DARK_RED, FONT, Z } from '../constants.js';
import { t } from '../i18n.js';

// Менеджер Game Over экрана — Phaser тексты + HTML кнопки
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

    // Затемнение
    makeUI(this.scene.add.rectangle(W / 2, H / 2, W, H, 0x2d0000, 0.65));

    // Заголовок
    makeUI(this.scene.add.text(W / 2, H * 0.28, t('you_died'), {
      fontSize: '42px', color: DARK_RED, fontFamily: FONT, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 8,
    }).setOrigin(0.5));

    // Высота
    this.scoreText = makeUI(this.scene.add.text(W / 2, H * 0.36, '', {
      fontSize: '18px', color: GOLD, fontFamily: FONT,
    }).setOrigin(0.5));

    // Рекорд
    this.bestText = makeUI(this.scene.add.text(W / 2, H * 0.40, '', {
      fontSize: '26px', color: '#6B5030', fontFamily: FONT, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5));

    // НОВЫЙ РЕКОРД
    this.newBestText = makeUI(this.scene.add.text(W / 2, H * 0.45, t('new_record'), {
      fontSize: '20px', color: GOLD, fontFamily: FONT, fontStyle: 'bold italic',
      stroke: '#3B1A00', strokeThickness: 4,
    }).setOrigin(0.5));

    // --- Чистые HTML кнопки поверх canvas ---
    this.buttonsDiv = document.createElement('div');
    this.buttonsDiv.id = 'game-over-buttons';
    this.buttonsDiv.style.cssText = `
      display: none; position: fixed; top: 0; left: 0;
      width: 100%; height: 100%; z-index: ${Z.HTML_BUTTONS};
      pointer-events: none;
      flex-direction: column; align-items: center; justify-content: center;
      gap: 12px; padding-top: 15%;
    `;

    const btnStyle = `
      font-family: Georgia, serif; cursor: pointer;
      border: none; outline: none; letter-spacing: 1px;
      pointer-events: auto;
    `;

    // CONTINUE (AD)
    this.continueBtn = document.createElement('button');
    this.continueBtn.textContent = t('continue_ad');
    this.continueBtn.style.cssText = `${btnStyle}
      background: #3B1A00; color: #C8A96E;
      border: 2px solid #7A4A1E; font-size: 15px; font-weight: bold;
      padding: 10px 32px;`;
    this.continueBtn.addEventListener('click', () => this.onContinue?.());
    this.buttonsDiv.appendChild(this.continueBtn);

    // RESTART
    this.restartBtn = document.createElement('button');
    this.restartBtn.textContent = t('restart');
    this.restartBtn.style.cssText = `${btnStyle}
      background: #6B0F0F; color: #C8A96E;
      border: 2px solid #C8A96E; font-size: 20px; font-weight: bold;
      padding: 12px 44px;`;
    this.restartBtn.addEventListener('click', () => this.onRestart?.());
    this.buttonsDiv.appendChild(this.restartBtn);

    // MENU
    this.menuBtn = document.createElement('button');
    this.menuBtn.textContent = t('menu');
    this.menuBtn.style.cssText = `${btnStyle}
      background: #1a0f00; color: #5B4020;
      border: 1px solid #3B2A10; font-size: 14px;
      padding: 8px 36px;`;
    this.menuBtn.addEventListener('click', () => this.onMenu?.());
    this.buttonsDiv.appendChild(this.menuBtn);

    document.body.appendChild(this.buttonsDiv);
  }

  show(score, best, isNewBest, continueUsed) {
    this.scoreText.setText(`${t('depth_label')}: ${score}${t('unit_m')}`);
    this.bestText.setText(`${t('record_label')}: ${best}${t('unit_m')}`);

    if (isNewBest) {
      this.bestText.setColor(GOLD);
    } else {
      this.newBestText.setVisible(false);
      this.bestText.setColor('#6B5030');
    }

    this.scene.time.delayedCall(500, () => {
      for (const el of this.elements) el.setVisible(true);
      this.buttonsDiv.style.display = 'flex';
      this.continueBtn.style.display = continueUsed ? 'none' : 'block';

      if (!isNewBest) {
        this.newBestText.setVisible(false);
      } else {
        this.newBestText.setVisible(true);
        this.newBestText.setScale(0.3).setAlpha(0);
        this.scene.tweens.add({
          targets: this.newBestText,
          scale: 1.15,
          alpha: 1,
          duration: 500,
          delay: 200,
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
      }
    });
  }

  hide() {
    for (const el of this.elements) el.setVisible(false);
    this.buttonsDiv.style.display = 'none';
  }

  showContinueBtn(visible) {
    this.continueBtn.style.display = visible ? 'block' : 'none';
  }

  destroy() {
    const el = document.getElementById('game-over-buttons');
    if (el) el.remove();
  }
}
