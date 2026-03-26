import { t } from '../i18n.js';
import { profile } from '../data/index.js';
import { getTelegramUserId } from '../telegram.js';

// Панель лидерборда — HTML overlay в #game-ui
// Создаётся один раз в конструкторе, show/hide через CSS класс overlay--visible
export class LeaderboardUI {
  constructor() {
    this._panel = null;
    this._list = null;
    this._built = false;
  }

  // Построить DOM один раз, вставить в #game-ui
  _build() {
    if (this._built) return;
    this._built = true;

    const panel = document.createElement('div');
    panel.classList.add('overlay', 'overlay--dark', 'leaderboard');
    this._panel = panel;

    // Кнопка закрытия
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.classList.add('leaderboard__close');
    closeBtn.addEventListener('click', () => this.hide());
    closeBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.hide(); });
    panel.appendChild(closeBtn);

    // Заголовок
    const title = document.createElement('div');
    title.textContent = `\uD83C\uDFC6 ${t('leaderboard')}`;
    title.classList.add('leaderboard__title');
    panel.appendChild(title);

    // Контейнер списка
    this._list = document.createElement('div');
    this._list.classList.add('leaderboard__list');
    panel.appendChild(this._list);

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
    this._build();
    this._list.innerHTML = `<div class="leaderboard__row" style="justify-content:center;font-size:16px;color:#4A5580;padding:40px 0">\u23F3 ${t('loading')}</div>`;
    this._panel.classList.add('overlay--visible');

    // Загружаем данные
    const lb = await profile.fetchLeaderboard();
    // Проверяем что панель не была закрыта пока грузились
    if (!this._panel.classList.contains('overlay--visible')) return;

    const myId = getTelegramUserId();
    this._list.innerHTML = '';

    if (lb.length === 0) {
      this._list.innerHTML = `<div class="leaderboard__row" style="justify-content:center;font-size:16px;color:#4A5580;padding:40px 0">${t('lb_empty')}</div>`;
    } else {
      lb.forEach((entry, i) => {
        const isMe = myId && entry.userId === myId;
        const row = document.createElement('div');
        row.classList.add('leaderboard__row');
        if (isMe) row.classList.add('leaderboard__row--me');

        const medal = i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : '';
        const rank = medal || `${i + 1}`;

        // Ранг, имя, счёт — inline стили для мелких элементов внутри строки
        row.innerHTML = `
          <span style="width:36px;text-align:center;font-size:${medal ? '20px' : '15px'};color:#4A5580">${rank}</span>
          <span style="flex:1;color:${isMe ? '#00F5D4' : '#E0F0FF'};font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${entry.name}${isMe ? ` <span style="font-size:12px;color:#00F5D4">${t('lb_you')}</span>` : ''}
          </span>
          <span style="color:#FFB800;font-size:16px;font-weight:bold">${entry.score}${t('unit_m')}</span>
        `;
        this._list.appendChild(row);
      });
    }
  }

  // Скрыть — убрать класс видимости (CSS transition сделает fade)
  hide() {
    if (this._panel) {
      this._panel.classList.remove('overlay--visible');
    }
  }

  // Удалить DOM-элемент полностью
  destroy() {
    if (this._panel) {
      this._panel.remove();
      this._panel = null;
      this._list = null;
      this._built = false;
    }
  }
}
