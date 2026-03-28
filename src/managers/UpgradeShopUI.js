import { t } from '../i18n.js';
import { profile } from '../data/index.js';
import { UPGRADES, SHIELD_COST, SAW_COST } from '../constants.js';
import { getUpgradeCost } from './UpgradeApplicator.js';

// Магазин апгрейдов "КУЗНИЦА" — HTML overlay в #game-ui
// CSS классы в ui.css (.forge-shop, .forge-card, .forge-card__btn)
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
    title.classList.add('forge-shop__title');
    title.textContent = t('forge');
    panel.appendChild(title);

    // Баланс эмберов
    this.#balanceEl = document.createElement('div');
    this.#balanceEl.classList.add('forge-shop__balance');
    panel.appendChild(this.#balanceEl);

    // Контейнер карточек
    this.#cardsContainer = document.createElement('div');
    this.#cardsContainer.classList.add('forge-shop__cards');
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
    // Карточка Shield — одноразовый предмет, не апгрейд
    this.#cardsContainer.appendChild(this.#createShieldCard());
    // Карточка Saw — одноразовый предмет
    this.#cardsContainer.appendChild(this.#createSawCard());
  }

  #createCard(upgradeId) {
    const def = UPGRADES[upgradeId];
    const level = profile.getUpgradeLevel(upgradeId);
    const cost = getUpgradeCost(upgradeId);
    const isMax = level >= def.maxLevel;
    const canAfford = profile.embers >= cost;

    const card = document.createElement('div');
    card.classList.add('forge-card');

    // Левая часть: название + эффект
    const info = document.createElement('div');
    info.classList.add('forge-card__info');

    const name = document.createElement('div');
    name.classList.add('forge-card__name');
    name.textContent = t(`upgrade_${upgradeId}`);
    info.appendChild(name);

    const desc = document.createElement('div');
    desc.classList.add('forge-card__desc');
    desc.textContent = t(`upgrade_${upgradeId}_desc`);
    info.appendChild(desc);

    const lvlEl = document.createElement('div');
    lvlEl.classList.add('forge-card__level');
    lvlEl.textContent = `${t('level')} ${level}/${def.maxLevel}`;
    info.appendChild(lvlEl);

    card.appendChild(info);

    // Правая часть: кнопка покупки
    const btn = document.createElement('button');
    btn.classList.add('forge-card__btn');

    if (isMax) {
      btn.textContent = t('upgrade_max');
      btn.classList.add('forge-card__btn--max');
      btn.disabled = true;
    } else if (!canAfford) {
      btn.textContent = `${cost}`;
      btn.classList.add('forge-card__btn--locked');
      btn.disabled = true;
    } else {
      btn.textContent = `${cost}`;
      btn.classList.add('forge-card__btn--buy');
      const handleBuy = async (e) => {
        e.preventDefault();
        if (btn.disabled) return;
        btn.disabled = true;
        btn.style.opacity = '0.5';
        await profile.purchaseUpgrade(upgradeId, cost);
        this.#refresh();
      };
      btn.addEventListener('click', handleBuy);
    }

    card.appendChild(btn);
    return card;
  }

  #createShieldCard() {
    const owned = profile.hasShield;
    const canAfford = profile.embers >= SHIELD_COST;

    const card = document.createElement('div');
    card.classList.add('forge-card');

    // Левая часть: название + описание
    const info = document.createElement('div');
    info.classList.add('forge-card__info');

    const name = document.createElement('div');
    name.classList.add('forge-card__name');
    name.textContent = t('shield_name');
    info.appendChild(name);

    const desc = document.createElement('div');
    desc.classList.add('forge-card__desc');
    desc.textContent = t('shield_desc');
    info.appendChild(desc);

    card.appendChild(info);

    // Правая часть: кнопка
    const btn = document.createElement('button');
    btn.classList.add('forge-card__btn');

    if (owned) {
      btn.textContent = t('shield_owned');
      btn.classList.add('forge-card__btn--max');
      btn.disabled = true;
    } else if (!canAfford) {
      btn.textContent = `${SHIELD_COST}`;
      btn.classList.add('forge-card__btn--locked');
      btn.disabled = true;
    } else {
      btn.textContent = `${SHIELD_COST}`;
      btn.classList.add('forge-card__btn--buy');
      const handleBuy = async (e) => {
        e.preventDefault();
        if (btn.disabled) return;
        btn.disabled = true;
        btn.style.opacity = '0.5';
        await profile.purchaseShield();
        this.#refresh();
      };
      btn.addEventListener('click', handleBuy);
    }

    card.appendChild(btn);
    return card;
  }

  #createSawCard() {
    const owned = profile.hasSaw;
    const canAfford = profile.embers >= SAW_COST;

    const card = document.createElement('div');
    card.classList.add('forge-card');

    const info = document.createElement('div');
    info.classList.add('forge-card__info');

    const name = document.createElement('div');
    name.classList.add('forge-card__name');
    name.textContent = t('saw_name');
    info.appendChild(name);

    const desc = document.createElement('div');
    desc.classList.add('forge-card__desc');
    desc.textContent = t('saw_desc');
    info.appendChild(desc);

    card.appendChild(info);

    const btn = document.createElement('button');
    btn.classList.add('forge-card__btn');

    if (owned) {
      btn.textContent = t('saw_owned');
      btn.classList.add('forge-card__btn--max');
      btn.disabled = true;
    } else if (!canAfford) {
      btn.textContent = `${SAW_COST}`;
      btn.classList.add('forge-card__btn--locked');
      btn.disabled = true;
    } else {
      btn.textContent = `${SAW_COST}`;
      btn.classList.add('forge-card__btn--buy');
      const handleBuy = async (e) => {
        e.preventDefault();
        if (btn.disabled) return;
        btn.disabled = true;
        btn.style.opacity = '0.5';
        await profile.purchaseSaw();
        this.#refresh();
      };
      btn.addEventListener('click', handleBuy);
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
