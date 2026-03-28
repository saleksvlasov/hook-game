/**
 * MenuKebabUI — кнопка ≡ (top-left) + bottom sheet с вторичными пунктами меню.
 * HTML overlay поверх canvas, styled в ui.css (.menu-kebab__* / .menu-sheet__*)
 */
import { t } from '../i18n.js';
import { profile } from '../data/index.js';

// ── SVG иконки для пунктов меню ─────────────────────────────────────────────

const ICON_SKINS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
  <path d="M10 1.7C8.6 1.7 7.5 2.8 7.5 4.2H5C4.1 4.2 3.3 4.9 3.3 5.8V16.7C3.3 17.6 4.1 18.3 5 18.3H15C15.9 18.3 16.7 17.6 16.7 16.7V5.8C16.7 4.9 15.9 4.2 15 4.2H12.5C12.5 2.8 11.4 1.7 10 1.7Z"
    stroke="#00F5D4" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="10" cy="4.2" r="1" fill="#00F5D4"/>
  <line x1="6.7" y1="10" x2="13.3" y2="10" stroke="#00F5D4" stroke-width="1.3" stroke-linecap="round" opacity="0.5"/>
  <line x1="6.7" y1="13" x2="11.7" y2="13" stroke="#00F5D4" stroke-width="1.3" stroke-linecap="round" opacity="0.3"/>
</svg>`;

const ICON_FORGE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
  <path d="M12.5 3.3L16.7 7.5L9.2 15H3.3V9.2L12.5 3.3Z" stroke="#FF6B35" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="10.8" y1="5" x2="15" y2="9.2" stroke="#FF6B35" stroke-width="1.3" stroke-linecap="round"/>
  <circle cx="4.6" cy="15.4" r="1.2" fill="#FF6B35" opacity="0.7"/>
</svg>`;

const ICON_TOP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
  <path d="M5 7.5H2.5L5 3.3H15L17.5 7.5H15C15 10.3 12.8 12.5 10 12.5C7.2 12.5 5 10.3 5 7.5Z"
    stroke="#FFB800" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="10" y1="12.5" x2="10" y2="15.8" stroke="#FFB800" stroke-width="1.4" stroke-linecap="round"/>
  <line x1="6.7" y1="15.8" x2="13.3" y2="15.8" stroke="#FFB800" stroke-width="1.4" stroke-linecap="round"/>
</svg>`;

const ICON_GUIDE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
  <circle cx="10" cy="10" r="7.5" stroke="#FF2E63" stroke-width="1.4"/>
  <path d="M7.9 7.5C7.9 6.3 8.8 5.4 10 5.4C11.2 5.4 12.1 6.3 12.1 7.5C12.1 8.7 11.2 9.2 10 10V11.2"
    stroke="#FF2E63" stroke-width="1.4" stroke-linecap="round"/>
  <circle cx="10" cy="13.7" r="0.8" fill="#FF2E63"/>
</svg>`;

// SVG для кнопки-триггера (три горизонтальные линии)
const ICON_HAMBURGER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
  <line x1="3" y1="5.8"  x2="17" y2="5.8"  stroke="#7A8AB0" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="3" y1="10"   x2="17" y2="10"   stroke="#7A8AB0" stroke-width="1.8" stroke-linecap="round"/>
  <line x1="3" y1="14.2" x2="17" y2="14.2" stroke="#7A8AB0" stroke-width="1.8" stroke-linecap="round"/>
</svg>`;

export class MenuKebabUI {
  #btn = null;
  #sheet = null;
  #isOpen = false;

  // Коллбэки для каждого пункта
  #onSkins;
  #onForge;
  #onTop;
  #onGuide;

  constructor({ onSkins, onForge, onTop, onGuide }) {
    this.#onSkins = onSkins;
    this.#onForge = onForge;
    this.#onTop   = onTop;
    this.#onGuide = onGuide;
    this.#build();
  }

  #build() {
    const root = document.getElementById('game-ui') || document.body;

    // ── Trigger button ───────────────────────────────────────────────────────
    const btn = document.createElement('button');
    btn.className = 'menu-kebab__btn';
    btn.setAttribute('aria-label', 'Menu');
    btn.innerHTML = ICON_HAMBURGER;
    btn.addEventListener('click', () => this.toggle());
    btn.addEventListener('touchend', (e) => { e.preventDefault(); this.toggle(); });
    this.#btn = btn;
    root.appendChild(btn);

    // ── Bottom sheet ─────────────────────────────────────────────────────────
    const sheet = document.createElement('div');
    sheet.className = 'menu-sheet';
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('role', 'dialog');

    const emberCount = profile.embers ?? 0;

    sheet.innerHTML = `
      <div class="menu-sheet__backdrop"></div>
      <div class="menu-sheet__panel">
        <div class="menu-sheet__handle" aria-hidden="true"></div>

        <button class="menu-sheet__item" data-action="skins">
          <span class="menu-sheet__icon menu-sheet__icon--cyan">${ICON_SKINS}</span>
          <span class="menu-sheet__text">
            <span class="menu-sheet__label">${t('skins_title')}</span>
          </span>
          <span class="menu-sheet__chevron" aria-hidden="true">›</span>
        </button>

        <button class="menu-sheet__item" data-action="forge">
          <span class="menu-sheet__icon menu-sheet__icon--orange">${ICON_FORGE}</span>
          <span class="menu-sheet__text">
            <span class="menu-sheet__label">${t('forge')}</span>
            <span class="menu-sheet__sub" id="menu-forge-embers"><span style="color:#FF6B35">\u25CF</span> ${emberCount}</span>
          </span>
          <span class="menu-sheet__chevron" aria-hidden="true">›</span>
        </button>

        <button class="menu-sheet__item" data-action="top">
          <span class="menu-sheet__icon menu-sheet__icon--amber">${ICON_TOP}</span>
          <span class="menu-sheet__text">
            <span class="menu-sheet__label">${t('top_button')}</span>
          </span>
          <span class="menu-sheet__chevron" aria-hidden="true">›</span>
        </button>

        <button class="menu-sheet__item menu-sheet__item--last" data-action="guide">
          <span class="menu-sheet__icon menu-sheet__icon--pink">${ICON_GUIDE}</span>
          <span class="menu-sheet__text">
            <span class="menu-sheet__label">${t('guide_button')}</span>
          </span>
          <span class="menu-sheet__chevron" aria-hidden="true">›</span>
        </button>
      </div>
    `;

    // Закрыть по клику на backdrop
    sheet.querySelector('.menu-sheet__backdrop').addEventListener('click', () => this.close());

    // Действия по пунктам
    sheet.querySelectorAll('.menu-sheet__item').forEach(item => {
      const handler = () => {
        this.close();
        // Небольшая задержка чтобы sheet закрылся до открытия модала
        setTimeout(() => {
          const action = item.dataset.action;
          if (action === 'skins')  this.#onSkins?.();
          if (action === 'forge')  this.#onForge?.();
          if (action === 'top')    this.#onTop?.();
          if (action === 'guide')  this.#onGuide?.();
        }, 180);
      };
      item.addEventListener('click', handler);
      item.addEventListener('touchend', (e) => { e.preventDefault(); handler(); });
    });

    this.#sheet = sheet;
    root.appendChild(sheet);
  }

  toggle() {
    this.#isOpen ? this.close() : this.open();
  }

  open() {
    if (this.#isOpen) return;
    this.#isOpen = true;
    // Обновить счётчик эмберов перед показом
    const el = this.#sheet?.querySelector('#menu-forge-embers');
    if (el) el.innerHTML = `<span style="color:#FF6B35">\u25CF</span> ${profile.embers ?? 0}`;
    this.#sheet?.classList.add('menu-sheet--visible');
  }

  close() {
    if (!this.#isOpen) return;
    this.#isOpen = false;
    this.#sheet?.classList.remove('menu-sheet--visible');
  }

  get isOpen() { return this.#isOpen; }

  /** Скрыть кнопку когда сцена уходит */
  hide() {
    if (this.#btn) this.#btn.style.display = 'none';
    this.close();
  }

  destroy() {
    this.#btn?.remove();
    this.#sheet?.remove();
    this.#btn = null;
    this.#sheet = null;
  }
}
