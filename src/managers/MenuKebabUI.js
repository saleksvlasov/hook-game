/**
 * MenuKebabUI — кнопка ≡ (top-left) + bottom sheet с вторичными пунктами меню.
 * HTML overlay поверх canvas, styled в ui.css (.menu-kebab__* / .menu-sheet__*)
 */
import { t } from '../i18n.js';
import { profile } from '../data/index.js';

// ── SVG иконки для пунктов меню ─────────────────────────────────────────────

const ICON_SKINS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M12 2C10.3 2 9 3.3 9 5H6C4.9 5 4 5.9 4 7V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V7C20 5.9 19.1 5 18 5H15C15 3.3 13.7 2 12 2Z"
    stroke="#00F5D4" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="12" cy="5" r="1.2" fill="#00F5D4"/>
  <line x1="8" y1="12" x2="16" y2="12" stroke="#00F5D4" stroke-width="1.4" stroke-linecap="round" opacity="0.5"/>
  <line x1="8" y1="15.5" x2="14" y2="15.5" stroke="#00F5D4" stroke-width="1.4" stroke-linecap="round" opacity="0.3"/>
</svg>`;

const ICON_FORGE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M15 4L20 9L11 18H4V11L15 4Z" stroke="#FF6B35" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="13" y1="6" x2="18" y2="11" stroke="#FF6B35" stroke-width="1.4" stroke-linecap="round"/>
  <circle cx="5.5" cy="18.5" r="1.5" fill="#FF6B35" opacity="0.7"/>
</svg>`;

const ICON_TOP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="M6 9H3L6 4H18L21 9H18C18 12.3 15.3 15 12 15C8.7 15 6 12.3 6 9Z"
    stroke="#FFB800" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="12" y1="15" x2="12" y2="19" stroke="#FFB800" stroke-width="1.6" stroke-linecap="round"/>
  <line x1="8" y1="19" x2="16" y2="19" stroke="#FFB800" stroke-width="1.6" stroke-linecap="round"/>
  <line x1="9" y1="9" x2="9" y2="12" stroke="#FFB800" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
  <line x1="12" y1="9" x2="12" y2="13" stroke="#FFB800" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
  <line x1="15" y1="9" x2="15" y2="11" stroke="#FFB800" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
</svg>`;

const ICON_GUIDE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="9" stroke="#FF2E63" stroke-width="1.6"/>
  <path d="M9.5 9C9.5 7.6 10.6 6.5 12 6.5C13.4 6.5 14.5 7.6 14.5 9C14.5 10.4 13.4 11 12 12V13.5"
    stroke="#FF2E63" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="12" cy="16.5" r="1" fill="#FF2E63"/>
</svg>`;

// SVG для кнопки-триггера (три горизонтальные линии)
const ICON_HAMBURGER = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <line x1="4" y1="7"  x2="20" y2="7"  stroke="#7A8AB0" stroke-width="2" stroke-linecap="round"/>
  <line x1="4" y1="12" x2="20" y2="12" stroke="#7A8AB0" stroke-width="2" stroke-linecap="round"/>
  <line x1="4" y1="17" x2="20" y2="17" stroke="#7A8AB0" stroke-width="2" stroke-linecap="round"/>
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
            <span class="menu-sheet__sub" id="menu-forge-embers">🔥 ${emberCount}</span>
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
    if (el) el.textContent = `🔥 ${profile.embers ?? 0}`;
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
