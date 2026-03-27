import { t } from '../i18n.js';
import { profile } from '../data/index.js';
import { UPGRADES } from '../constants.js';
import { getUpgradeCost } from './UpgradeApplicator.js';

// Магазин апгрейдов "КУЗНИЦА" — HTML overlay в #game-ui
// Паттерн как LeaderboardUI: один раз строим DOM, show/hide через CSS класс
export class UpgradeShopUI {
  #panel = null;
  #balanceEl = null;
  #cardsContainer = null;
  #built = false;
  #onClose = null;

  constructor(onClose) {
    this.#onClose = onClose;
  }

  #build() {
    if (this.#built) return;
    this.#built = true;

    const panel = document.createElement('div');
    panel.classList.add('overlay', 'overlay--dark', 'forge-shop');
    this.#panel = panel;

    // Кнопка закрытия
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.classList.add('leaderboard__close');
    closeBtn.addEventListener('click', () => this.hide());
    closeBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.hide(); });
    panel.appendChild(closeBtn);

    // Заголовок
    const title = document.createElement('div');
    title.classList.add('leaderboard__title');
    title.style.cssText = 'color:#FFB800;font-size:22px;margin-bottom:4px';
    title.textContent = t('forge');
    panel.appendChild(title);

    // Баланс эмберов
    this.#balanceEl = document.createElement('div');
    this.#balanceEl.style.cssText = 'color:#FF6B35;font-size:16px;text-align:center;margin-bottom:12px;font-family:"Share Tech Mono",monospace';
    panel.appendChild(this.#balanceEl);

    // Контейнер карточек
    this.#cardsContainer = document.createElement('div');
    this.#cardsContainer.style.cssText = 'overflow-y:auto;max-height:calc(100vh - 140px);padding:0 8px';
    panel.appendChild(this.#cardsContainer);

    const root = document.getElementById('game-ui');
    if (root) root.appendChild(panel);
    else document.body.appendChild(panel);
  }

  show() {
    this.#build();
    this.#refresh();
    this.#panel.classList.add('overlay--visible');
  }

  hide() {
    if (this.#panel) this.#panel.classList.remove('overlay--visible');
    if (this.#onClose) this.#onClose();
  }

  #refresh() {
    this.#balanceEl.textContent = `${t('embers')}: ${profile.embers}`;
    this.#cardsContainer.innerHTML = '';

    const upgradeIds = Object.keys(UPGRADES);
    for (const id of upgradeIds) {
      this.#cardsContainer.appendChild(this.#createCard(id));
    }
  }

  #createCard(upgradeId) {
    const def = UPGRADES[upgradeId];
    const level = profile.getUpgradeLevel(upgradeId);
    const cost = getUpgradeCost(upgradeId);
    const isMax = level >= def.maxLevel;
    const canAfford = profile.embers >= cost;

    const card = document.createElement('div');
    card.style.cssText = `
      background:rgba(42,48,80,0.5);border:1px solid rgba(0,245,212,0.2);
      border-radius:8px;padding:10px 12px;margin-bottom:8px;
      display:flex;align-items:center;justify-content:space-between;
      font-family:'Inter','Helvetica Neue',sans-serif;
    `;

    // Левая часть: название + эффект
    const info = document.createElement('div');
    info.style.cssText = 'flex:1;min-width:0';

    const name = document.createElement('div');
    name.style.cssText = 'color:#E0F0FF;font-size:13px;font-weight:600';
    name.textContent = t(`upgrade_${upgradeId}`);
    info.appendChild(name);

    const desc = document.createElement('div');
    desc.style.cssText = 'color:#4A5580;font-size:11px;margin-top:2px';
    desc.textContent = t(`upgrade_${upgradeId}_desc`);
    info.appendChild(desc);

    const lvlEl = document.createElement('div');
    lvlEl.style.cssText = 'color:#00F5D4;font-size:11px;margin-top:2px;font-family:"Share Tech Mono",monospace';
    lvlEl.textContent = `${t('level')} ${level}/${def.maxLevel}`;
    info.appendChild(lvlEl);

    card.appendChild(info);

    // Правая часть: кнопка покупки
    const btn = document.createElement('button');
    btn.style.cssText = `
      border:none;border-radius:6px;padding:6px 12px;
      font-size:12px;font-weight:600;cursor:pointer;
      font-family:'Share Tech Mono',monospace;
      min-width:70px;text-align:center;
      transition:opacity 0.2s;
    `;

    if (isMax) {
      btn.textContent = t('upgrade_max');
      btn.style.background = '#2A3050';
      btn.style.color = '#4A5580';
      btn.disabled = true;
    } else if (!canAfford) {
      btn.textContent = `${cost}`;
      btn.style.background = '#2A3050';
      btn.style.color = '#FF6B35';
      btn.style.opacity = '0.5';
      btn.disabled = true;
    } else {
      btn.textContent = `${cost}`;
      btn.style.background = 'linear-gradient(135deg, #FF6B35, #FFB800)';
      btn.style.color = '#0A0E1A';
      const handleBuy = async (e) => {
        e.preventDefault();
        if (btn.disabled) return; // защита от двойного клика
        btn.disabled = true;
        btn.style.opacity = '0.5';
        const ok = await profile.purchaseUpgrade(upgradeId, cost);
        this.#refresh();
      };
      btn.addEventListener('click', handleBuy);
      btn.addEventListener('touchend', handleBuy);
    }

    card.appendChild(btn);
    return card;
  }

  destroy() {
    if (this.#panel) {
      this.#panel.remove();
      this.#panel = null;
    }
    this.#built = false;
  }
}
