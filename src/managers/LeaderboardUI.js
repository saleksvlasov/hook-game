import { t } from '../i18n.js';
import { profile } from '../data/index.js';
import { getTelegramUserId } from '../telegram.js';

// Панель лидерборда — HTML overlay в #game-ui
// Создаётся один раз в конструкторе, show/hide через CSS класс overlay--visible
export class LeaderboardUI {
  // Приватные поля
  #panel = null;
  #list = null;
  #built = false;
  #fetchTimeout = null;

  // Построить DOM один раз, вставить в #game-ui
  #build() {
    if (this.#built) return;
    this.#built = true;

    const panel = document.createElement('div');
    panel.classList.add('overlay', 'overlay--dark', 'leaderboard');
    this.#panel = panel;

    // Кнопка закрытия
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" style="width:16px;height:16px"><line x1="4" y1="4" x2="16" y2="16" stroke="#7A8AB0" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="4" x2="4" y2="16" stroke="#7A8AB0" stroke-width="2" stroke-linecap="round"/></svg>';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.classList.add('leaderboard__close');
    closeBtn.addEventListener('click', () => this.hide());
    panel.appendChild(closeBtn);

    // Заголовок
    const title = document.createElement('div');
    title.textContent = t('leaderboard');
    title.classList.add('leaderboard__title');
    panel.appendChild(title);

    // Контейнер списка
    this.#list = document.createElement('div');
    this.#list.classList.add('leaderboard__list');
    panel.appendChild(this.#list);

    // Вставляем в корневой UI контейнер
    const root = document.getElementById('game-ui');
    if (root) {
      root.appendChild(panel);
    } else {
      document.body.appendChild(panel);
    }
  }

  // Показать лидерборд — добавить класс видимости, загрузить данные
  async show() {
    this.#build();
    this.#showLoading();
    this.#panel.classList.add('overlay--visible');
    await this.#fetchAndRender();
  }

  #showLoading() {
    this.#list.innerHTML = `<div class="leaderboard__row" style="justify-content:center;font-size:24px;color:#4A5580;padding:40px 0">
      <span style="display:inline-block;animation:spin 1s linear infinite;font-size:16px">\u25CE</span>
      <span style="margin-left:8px;font-size:16px">${t('loading')}</span>
    </div>`;
    // Добавляем CSS анимацию если ещё нет
    if (!document.getElementById('lb-spin-style')) {
      const style = document.createElement('style');
      style.id = 'lb-spin-style';
      style.textContent = '@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';
      document.head.appendChild(style);
    }
  }

  async #fetchAndRender() {
    // Загружаем данные с timeout 5с
    let lb = [];
    let fetchError = false;
    try {
      const fetchPromise = profile.fetchLeaderboard();
      const timeoutPromise = new Promise((_, reject) => {
        this.#fetchTimeout = window.setTimeout(() => reject(new Error('timeout')), 5000);
      });
      lb = await Promise.race([fetchPromise, timeoutPromise]);
      window.clearTimeout(this.#fetchTimeout);
    } catch {
      window.clearTimeout(this.#fetchTimeout);
      fetchError = true;
    }

    // Проверяем что панель не была закрыта пока грузились
    if (!this.#panel || !this.#panel.classList.contains('overlay--visible')) return;

    const myId = getTelegramUserId();
    this.#list.innerHTML = '';

    if (fetchError) {
      // Ошибка — показываем текст + кнопку retry
      const errorDiv = document.createElement('div');
      errorDiv.classList.add('leaderboard__row');
      errorDiv.style.cssText = 'justify-content:center;flex-direction:column;align-items:center;font-size:16px;color:#4A5580;padding:30px 0;gap:16px';
      errorDiv.textContent = t('lb_error');
      const retryBtn = document.createElement('button');
      retryBtn.classList.add('btn-neon', 'btn-neon--small');
      retryBtn.textContent = t('lb_retry');
      retryBtn.addEventListener('click', () => {
        this.#showLoading();
        this.#fetchAndRender();
      });
      errorDiv.appendChild(retryBtn);
      this.#list.appendChild(errorDiv);
    } else if (lb.length === 0) {
      this.#list.innerHTML = `<div class="leaderboard__row" style="justify-content:center;font-size:16px;color:#4A5580;padding:40px 0">${t('lb_empty')}</div>`;
    } else {
      lb.forEach((entry, i) => {
        const isMe = myId && entry.userId === myId;
        const row = document.createElement('div');
        row.classList.add('leaderboard__row');
        if (isMe) row.classList.add('leaderboard__row--me');

        const medalColor = i === 0 ? '#FFB800' : i === 1 ? '#7A8AB0' : i === 2 ? '#FF6B35' : '';
        const rank = `${i + 1}`;

        // Ранг
        const rankEl = document.createElement('span');
        rankEl.style.cssText = `width:36px;text-align:center;font-size:15px;font-weight:700;color:${medalColor || '#4A5580'}`;
        rankEl.textContent = rank;
        row.appendChild(rankEl);

        // Имя — textContent для защиты от XSS
        const nameEl = document.createElement('span');
        nameEl.style.cssText = `flex:1;color:${isMe ? '#00F5D4' : '#E0F0FF'};font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap`;
        nameEl.textContent = entry.name;
        if (isMe) {
          const youTag = document.createElement('span');
          youTag.style.cssText = 'font-size:12px;color:#00F5D4;margin-left:4px';
          youTag.textContent = t('lb_you');
          nameEl.appendChild(youTag);
        }
        row.appendChild(nameEl);

        // Счёт
        const scoreEl = document.createElement('span');
        scoreEl.style.cssText = 'color:#FFB800;font-size:16px;font-weight:bold';
        scoreEl.textContent = `${entry.score}${t('unit_m')}`;
        row.appendChild(scoreEl);

        this.#list.appendChild(row);
      });
    }
  }

  // Скрыть — убрать класс видимости (CSS transition сделает fade)
  hide() {
    if (this.#panel) {
      this.#panel.classList.remove('overlay--visible');
    }
  }

  // Удалить DOM-элемент полностью
  destroy() {
    if (this.#panel) {
      this.#panel.remove();
      this.#panel = null;
      this.#list = null;
      this.#built = false;
    }
  }
}
