import { t } from '../i18n.js';
import { PERK_ICONS } from './PerkIcons.js';

export class PerkGuideUI {
  #panel = null;
  #built = false;

  #build() {
    if (this.#built) return;
    this.#built = true;

    const panel = document.createElement('div');
    panel.classList.add('overlay', 'overlay--dark', 'perk-guide');
    this.#panel = panel;

    // Кнопка закрытия (используем существующий класс leaderboard__close)
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.classList.add('leaderboard__close');
    closeBtn.addEventListener('click', () => this.hide());
    closeBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.hide(); });
    panel.appendChild(closeBtn);

    // Заголовок
    const title = document.createElement('div');
    title.classList.add('perk-guide__title');
    title.textContent = t('guide_title');
    panel.appendChild(title);

    // Скролл-контейнер
    const scroll = document.createElement('div');
    scroll.classList.add('perk-guide__scroll');
    panel.appendChild(scroll);

    // === Секция ПЕРКИ РАУНДА ===
    scroll.appendChild(this.#makeSection(t('guide_section_round'), t('guide_hint_round')));

    const roundCards = document.createElement('div');
    roundCards.classList.add('perk-guide__cards');
    const roundPerks = [
      { id: 'hook_range',   color: 'cyan',   label: PERK_ICONS.hook_range,   nameKey: 'perk_hook_range',   descKey: 'perk_hook_range_desc',   maxLvl: 6  },
      { id: 'swing_power',  color: 'pink',   label: PERK_ICONS.swing_power,  nameKey: 'perk_swing_power',  descKey: 'perk_swing_power_desc',  maxLvl: 10 },
      { id: 'quick_hook',   color: 'amber',  label: PERK_ICONS.quick_hook,   nameKey: 'perk_quick_hook',   descKey: 'perk_quick_hook_desc',   maxLvl: 3  },
      { id: 'ember_magnet', color: 'orange', label: PERK_ICONS.ember_magnet, nameKey: 'perk_ember_magnet', descKey: 'perk_ember_magnet_desc', maxLvl: 5  },
    ];
    for (const p of roundPerks) {
      roundCards.appendChild(this.#makeCard(p.label, p.color, t(p.nameKey), t(p.descKey), `${t('perk_max_level')} ${p.maxLvl}`));
    }
    scroll.appendChild(roundCards);

    // Разделитель
    const divider = document.createElement('div');
    divider.classList.add('perk-guide__divider');
    scroll.appendChild(divider);

    // === Секция КУЗНИЦА ===
    scroll.appendChild(this.#makeSection(t('guide_section_forge'), t('guide_hint_forge')));

    const forgeCards = document.createElement('div');
    forgeCards.classList.add('perk-guide__cards');
    const forgeItems = [
      { label: PERK_ICONS.iron_heart, color: 'steel', nameKey: 'upgrade_iron_heart', descKey: 'upgrade_iron_heart_desc' },
      { label: PERK_ICONS.shield,     color: 'steel', nameKey: 'shield_name',        descKey: 'shield_desc'             },
      { label: PERK_ICONS.saw,        color: 'steel', nameKey: 'saw_name',           descKey: 'saw_desc'               },
    ];
    for (const item of forgeItems) {
      forgeCards.appendChild(this.#makeCard(item.label, item.color, t(item.nameKey), t(item.descKey), null));
    }
    scroll.appendChild(forgeCards);

    const root = document.getElementById('game-ui');
    if (root) root.appendChild(panel);
    else document.body.appendChild(panel);
  }

  #makeSection(labelText, hintText) {
    const wrap = document.createElement('div');
    const label = document.createElement('div');
    label.classList.add('perk-guide__section-label');
    label.textContent = labelText;
    wrap.appendChild(label);
    const hint = document.createElement('div');
    hint.classList.add('perk-guide__hint');
    hint.textContent = hintText;
    wrap.appendChild(hint);
    return wrap;
  }

  #makeCard(iconSvg, colorKey, name, desc, maxText) {
    const card = document.createElement('div');
    card.classList.add('perk-guide__card');
    card.dataset.color = colorKey;

    const badge = document.createElement('div');
    badge.classList.add('perk-guide__badge');
    badge.dataset.color = colorKey;
    badge.innerHTML = iconSvg || '';
    card.appendChild(badge);

    const info = document.createElement('div');
    info.classList.add('perk-guide__info');

    const nameEl = document.createElement('div');
    nameEl.classList.add('perk-guide__name');
    nameEl.textContent = name;
    info.appendChild(nameEl);

    const descEl = document.createElement('div');
    descEl.classList.add('perk-guide__desc');
    descEl.textContent = desc;
    info.appendChild(descEl);

    if (maxText) {
      const maxEl = document.createElement('div');
      maxEl.classList.add('perk-guide__max');
      maxEl.textContent = maxText;
      info.appendChild(maxEl);
    }

    card.appendChild(info);
    return card;
  }

  show() {
    this.#build();
    this.#panel.classList.add('overlay--visible');
  }

  hide() {
    if (this.#panel) this.#panel.classList.remove('overlay--visible');
  }

  destroy() {
    if (this.#panel) { this.#panel.remove(); this.#panel = null; }
    this.#built = false;
  }
}
