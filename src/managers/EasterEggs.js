import { BOUNTY_HEIGHT, MOON_HEIGHT, Z } from '../constants.js';

const NEON_FONT = "'Inter', 'Helvetica Neue', sans-serif";
import { playBounty, playMoonwalker } from '../audio.js';
import { saveMoon } from '../storage.js';
import { t } from '../i18n.js';
import { drawWantedPosterFrame, createEmberBurst } from '../managers/UIFactory.js';

// Пасхалки: Bounty Claimed (100m) и Moonwalker (300m) — Neon Western цвета
export class EasterEggs {
  constructor(scene) {
    this.scene = scene;
    this.bountyShown = false;
    this.moonReached = false;
  }

  reset() {
    this.bountyShown = false;
    this.moonReached = false;
  }

  // Вызывать каждый кадр из update
  check(currentHeight) {
    if (currentHeight >= BOUNTY_HEIGHT && !this.bountyShown) {
      this.bountyShown = true;
      this._showBountyBanner();
    }
    if (currentHeight >= MOON_HEIGHT && !this.moonReached) {
      this.moonReached = true;
      this._showMoonwalker();
    }
  }

  _showBountyBanner() {
    playBounty();
    const W = this.scene.W;

    // Рамка розыскного плаката как фон
    const posterFrame = this.scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(Z.EASTER_TEXT - 1);
    drawWantedPosterFrame(posterFrame, W / 2, -40, 240, 60);

    // Текст — neon amber с тёмной обводкой
    const banner = this.scene.add.text(W / 2, -40, t('bounty'), {
      fontSize: '26px',
      fontFamily: NEON_FONT,
      fontStyle: 'bold',
      color: '#FFB800',
      stroke: '#0A0E1A',
      strokeThickness: 5,
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(Z.EASTER_TEXT);

    // Влетает сверху — рамка
    this.scene.tweens.add({
      targets: posterFrame,
      y: 170,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Влетает сверху — текст
    this.scene.tweens.add({
      targets: banner,
      y: 130,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Искры при появлении
        createEmberBurst(this.scene, W / 2, 130, 8, Z.EASTER_TEXT);

        this.scene.time.delayedCall(2000, () => {
          this.scene.tweens.add({
            targets: [banner, posterFrame],
            y: '-=190',
            alpha: 0,
            duration: 400,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              banner.destroy();
              posterFrame.destroy();
            },
          });
        });
      },
    });
  }

  _showMoonwalker() {
    playMoonwalker();
    saveMoon();
    const W = this.scene.W;

    // Свечение луны — neon cyan
    const moonGlow = this.scene.add.graphics().setScrollFactor(0).setDepth(Z.EASTER);
    moonGlow.fillStyle(0x00F5D4, 0.0);
    moonGlow.fillCircle(W * 0.72, 80, 50);

    this.scene.tweens.addCounter({
      from: 0,
      to: 40,
      duration: 1500,
      yoyo: true,
      onUpdate: (tw) => {
        const glowAlpha = tw.getValue() / 100;
        moonGlow.clear();
        // Cyan лунное свечение
        moonGlow.fillStyle(0x00F5D4, glowAlpha);
        moonGlow.fillCircle(W * 0.72, 80, 70);
        moonGlow.fillStyle(0x00F5D4, glowAlpha * 0.5);
        moonGlow.fillCircle(W * 0.72, 80, 35);
      },
      onComplete: () => {
        this.scene.time.delayedCall(3000, () => {
          this.scene.tweens.add({
            targets: moonGlow,
            alpha: 0,
            duration: 2000,
            onComplete: () => moonGlow.destroy(),
          });
        });
      },
    });

    // Надпись "MOONWALKER" — neon cyan
    const txt = this.scene.add.text(W / 2, 180, t('moonwalker'), {
      fontSize: '22px',
      fontFamily: NEON_FONT,
      fontStyle: 'italic',
      color: '#00F5D4',
      stroke: '#0A0E1A',
      strokeThickness: 4,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(Z.EASTER_TEXT).setAlpha(0);

    this.scene.tweens.add({
      targets: txt,
      alpha: 0.8,
      duration: 1000,
      hold: 2500,
      yoyo: true,
      onComplete: () => txt.destroy(),
    });
  }

  destroy() {
    // Tweens чистятся при остановке сцены
  }
}
