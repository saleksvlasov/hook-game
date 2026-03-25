import { Z, FONT_MONO } from '../constants.js';
import { t } from '../i18n.js';
import { tf } from '../i18n.js';
import { createEmberBurst, drawChip } from '../managers/UIFactory.js';

// ===== NEON WESTERN ПАЛИТРА =====
const NEON_CYAN = '#00F5D4';
const NEON_CYAN_HEX = 0x00F5D4;
const NEON_AMBER = '#FFB800';
const NEON_BG = '#0A0E1A';
const NEON_BG_HEX = 0x0A0E1A;
const NEON_STEEL = '#4A5580';
const NEON_FONT = "'Inter', 'Helvetica Neue', sans-serif";

// Менеджер HUD — счёт, рекорд, подсказка (neon western glassmorphism)
export class HUDManager {
  constructor(scene) {
    this.scene = scene;
    this.heightText = null;
    this.maxHeightText = null;
    this.hintText = null;
    this.bgPanel = null;
    this.lastMilestone = 0;
    this.challengeText = null;
    this.challengeBg = null;
  }

  create(challengeMgr) {
    this._challengeMgr = challengeMgr || null;
    const W = this.scene.W;

    // Отступ для safe area (Dynamic Island, notch, статусбар)
    const envTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sat') || '0', 10);
    const safeTop = Math.max(envTop, 10);

    // Neon glass панель — тёмная с тонким cyan-бордером, pill-shape
    this.bgPanel = this.scene.add.graphics();
    this.bgPanel.fillStyle(NEON_BG_HEX, 0.7);
    this.bgPanel.fillRoundedRect(W / 2 - 76, safeTop + 10, 152, 52, 26);
    this.bgPanel.lineStyle(1, NEON_CYAN_HEX, 0.15);
    this.bgPanel.strokeRoundedRect(W / 2 - 76, safeTop + 10, 152, 52, 26);
    // Scanline текстура — горизонтальные линии через 3px, alpha 0.03
    const panelX = W / 2 - 76;
    const panelY = safeTop + 10;
    const panelW = 152;
    const panelH = 52;
    for (let sy = panelY; sy < panelY + panelH; sy += 3) {
      this.bgPanel.fillStyle(0xFFFFFF, 0.03);
      this.bgPanel.fillRect(panelX, sy, panelW, 1);
    }
    this.bgPanel.setScrollFactor(0).setDepth(Z.HUD);

    // Высота — neon amber, крупный, моноширинный + cyan glow
    this.heightText = this.scene.add.text(W / 2, safeTop + 18, `0${t('unit_m')}`, {
      fontSize: '36px',
      color: NEON_AMBER,
      fontFamily: FONT_MONO,
      fontStyle: 'bold',
      stroke: NEON_BG,
      strokeThickness: 5,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(Z.HUD);
    this.heightText.setShadow(0, 0, '#00F5D4', 4, true, true);

    // Рекорд — neon cyan, моноширинный + cyan glow
    this.maxHeightText = this.scene.add.text(W / 2, safeTop + 56, `${t('record')}: 0${t('unit_m')}`, {
      fontSize: '14px',
      color: NEON_CYAN,
      fontFamily: FONT_MONO,
      fontStyle: 'bold',
      stroke: NEON_BG,
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(Z.HUD);
    this.maxHeightText.setShadow(0, 0, '#00F5D4', 4, true, true);

    // Label — метка "ГЛУБИНА" — steel, letterSpacing 4, моноширинный
    this.depthLabel = this.scene.add.text(W / 2, safeTop + 4, t('depth'), {
      fontSize: '11px',
      color: NEON_STEEL,
      fontFamily: FONT_MONO,
      letterSpacing: 4,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(Z.HUD);

    // Подсказка — neon cyan, пульсация 0.5-1.0
    this.hintText = this.scene.add.text(W / 2, safeTop + 78, t('click_hook'), {
      fontSize: '16px',
      color: NEON_CYAN,
      fontFamily: NEON_FONT,
      fontStyle: 'bold italic',
      stroke: NEON_BG,
      strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(Z.HUD);

    // Пульсация подсказки — 0.5 → 1.0
    this.scene.tweens.add({
      targets: this.hintText,
      alpha: { from: 0.5, to: 1.0 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
    });

    // Виджет еженедельного испытания — под hint текстом, MUI Chip стиль
    const ch = this._challengeMgr ? this._challengeMgr.getCurrentChallenge() : null;
    if (ch && !ch.completed) {
      const labelMap = {
        reach: 'challenge_reach',
        total: 'challenge_total',
        no_hit: 'challenge_no_hit',
        games: 'challenge_games',
        streak: 'challenge_streak',
      };
      const label = tf(labelMap[ch.type] || 'challenge_reach', ch.target, ch.count || 3);
      const weekNum = challengeMgr.week;
      const chipY = safeTop + 102;

      // Текст челленджа — amber, увеличенный шрифт
      const challengeStr = `WEEK ${weekNum}: ${label} — ${ch.progress}/${ch.target}`;
      this.challengeText = this.scene.add.text(W / 2, chipY, challengeStr, {
        fontSize: '13px',
        fontFamily: NEON_FONT,
        color: NEON_AMBER,
        stroke: NEON_BG,
        strokeThickness: 2,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(Z.HUD).setAlpha(0.85);

      // Chip-фон — тёмное стекло + тонкая cyan рамка (pill)
      const tw = this.challengeText.width + 24;
      const th = this.challengeText.height + 10;
      this.challengeBg = this.scene.add.graphics();
      drawChip(this.challengeBg, W / 2, chipY, tw, th);
      this.challengeBg.setScrollFactor(0).setDepth(Z.HUD - 1).setAlpha(0.85);
    }
  }

  updateHeight(currentHeight, maxHeight, sessionBest) {
    this.heightText.setText(`\u2191 ${currentHeight}${t('unit_m')}`);
    this.maxHeightText.setText(
      `${t('record')}: ${Math.max(maxHeight, sessionBest)}${t('unit_m')}`
    );

    // Milestone каждые 50м — pop + искры
    const milestone = Math.floor(currentHeight / 50) * 50;
    if (milestone > 0 && milestone > this.lastMilestone) {
      this.lastMilestone = milestone;

      // Scale pop на тексте высоты
      this.scene.tweens.add({
        targets: this.heightText,
        scaleX: { from: 1.0, to: 1.12 },
        scaleY: { from: 1.0, to: 1.12 },
        duration: 100,
        yoyo: true,
      });

      // Искры вокруг текста
      const textX = this.heightText.x;
      const textY = this.heightText.y + this.heightText.height / 2;
      createEmberBurst(this.scene, textX, textY, 3);
    }
  }

  setHint(key) {
    this.hintText.setText(t(key));

    // Scale pop при смене подсказки
    this.scene.tweens.add({
      targets: this.hintText,
      scaleX: { from: 1.0, to: 1.15 },
      scaleY: { from: 1.0, to: 1.15 },
      duration: 100,
      yoyo: true,
    });
  }

  // Обновить прогресс челленджа в виджете
  updateChallenge(progress, target) {
    if (!this.challengeText) return;
    const challengeMgr = new ChallengeManager();
    const ch = challengeMgr.getCurrentChallenge();
    if (!ch) return;

    const labelMap = {
      reach: 'challenge_reach',
      total: 'challenge_total',
      no_hit: 'challenge_no_hit',
      games: 'challenge_games',
      streak: 'challenge_streak',
    };
    const label = tf(labelMap[ch.type] || 'challenge_reach', ch.target, ch.count || 3);
    const weekNum = challengeMgr.week;
    this.challengeText.setText(`WEEK ${weekNum}: ${label} — ${progress}/${target}`);

    // Перерисовать chip-фон под новый размер текста
    if (this.challengeBg) {
      this.challengeBg.clear();
      const tw = this.challengeText.width + 24;
      const th = this.challengeText.height + 10;
      drawChip(this.challengeBg, this.challengeText.x, this.challengeText.y, tw, th);
    }
  }

  destroy() {
    // Phaser уничтожает объекты сцены автоматически при stop
  }
}
