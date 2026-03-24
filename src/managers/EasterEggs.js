import { GOLD, FONT, BOUNTY_HEIGHT, MOON_HEIGHT, Z } from '../constants.js';
import { playBounty, playMoonwalker } from '../audio.js';
import { saveMoon } from '../storage.js';
import { t } from '../i18n.js';

// Пасхалки: Bounty Claimed (100m) и Moonwalker (300m)
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

    const banner = this.scene.add.text(W / 2, -40, t('bounty'), {
      fontSize: '26px',
      fontFamily: FONT,
      fontStyle: 'bold',
      color: GOLD,
      stroke: '#3B1A00',
      strokeThickness: 5,
      backgroundColor: '#1a0f00cc',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(Z.EASTER_TEXT);

    // Влетает сверху
    this.scene.tweens.add({
      targets: banner,
      y: 130,
      duration: 500,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(2000, () => {
          this.scene.tweens.add({
            targets: banner,
            y: -60,
            alpha: 0,
            duration: 400,
            ease: 'Cubic.easeIn',
            onComplete: () => banner.destroy(),
          });
        });
      },
    });
  }

  _showMoonwalker() {
    playMoonwalker();
    saveMoon();
    const W = this.scene.W;

    // Свечение луны
    const moonGlow = this.scene.add.graphics().setScrollFactor(0).setDepth(Z.EASTER);
    moonGlow.fillStyle(0x888866, 0.0);
    moonGlow.fillCircle(W * 0.72, 80, 50);

    this.scene.tweens.addCounter({
      from: 0,
      to: 40,
      duration: 1500,
      yoyo: true,
      onUpdate: (tw) => {
        const glowAlpha = tw.getValue() / 100;
        moonGlow.clear();
        moonGlow.fillStyle(0xCCCCAA, glowAlpha);
        moonGlow.fillCircle(W * 0.72, 80, 55);
        moonGlow.fillStyle(0xEEEECC, glowAlpha * 0.5);
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

    // Надпись "MOONWALKER"
    const txt = this.scene.add.text(W / 2, 180, t('moonwalker'), {
      fontSize: '20px',
      fontFamily: FONT,
      fontStyle: 'italic',
      color: '#AAAAAA',
      stroke: '#0d0800',
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
