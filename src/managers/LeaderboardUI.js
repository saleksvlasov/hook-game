import { t } from '../i18n.js';
import { Z } from '../constants.js';
import { profile } from '../data/index.js';
import { getTelegramUserId } from '../telegram.js';

// ===== NEON WESTERN ПАЛИТРА =====
const NEON_CYAN = '#00F5D4';
const NEON_AMBER = '#FFB800';
const NEON_STEEL = '#4A5580';
const NEON_FONT = "'Inter', 'Helvetica Neue', sans-serif";

// Панель лидерборда — HTML overlay, neon western glassmorphism
// Пересоздаётся каждый раз при show() для надёжности на мобиле
export class LeaderboardUI {
  constructor() {
    this.div = null;
  }

  // Показать лидерборд — создать панель, загрузить данные
  async show() {
    // Удаляем старую панель если есть
    this.destroy();

    const div = document.createElement('div');
    div.id = 'leaderboard-panel';
    div.style.cssText = `
      display: flex; position: fixed; top: 0; left: 0;
      width: 100%; height: 100%; z-index: ${Z.HTML_BUTTONS + 10};
      background: rgba(5, 8, 16, 0.96);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      flex-direction: column; align-items: center;
      padding: 40px 16px 20px;
      overflow-y: auto;
    `;
    this.div = div;

    // Кнопка закрытия
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.style.cssText = `
      position: absolute; top: 12px; right: 16px;
      background: none; border: none; color: ${NEON_STEEL};
      font-size: 26px; cursor: pointer; pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
    `;
    closeBtn.addEventListener('click', () => this.hide());
    closeBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.hide(); });
    div.appendChild(closeBtn);

    // Заголовок
    const title = document.createElement('div');
    title.textContent = `\uD83C\uDFC6 ${t('leaderboard')}`;
    title.style.cssText = `
      font-family: ${NEON_FONT}; font-size: 26px; font-weight: bold;
      color: ${NEON_AMBER}; margin-bottom: 24px; letter-spacing: 3px;
      text-transform: uppercase;
    `;
    div.appendChild(title);

    // Список — сначала загрузка
    const list = document.createElement('div');
    list.style.cssText = 'width: 100%; max-width: 360px;';
    list.innerHTML = `<div style="color:${NEON_STEEL};font-family:${NEON_FONT};text-align:center;padding:40px 0;font-size:16px">⏳ ${t('loading')}</div>`;
    div.appendChild(list);

    document.body.appendChild(div);

    // Загружаем данные
    const lb = await profile.fetchLeaderboard();
    // Проверяем что панель не была закрыта пока грузились
    if (!this.div) return;

    const myId = getTelegramUserId();
    list.innerHTML = '';

    if (lb.length === 0) {
      list.innerHTML = `<div style="color:${NEON_STEEL};font-family:${NEON_FONT};text-align:center;padding:40px 0;font-size:16px">${t('lb_empty')}</div>`;
    } else {
      lb.forEach((entry, i) => {
        const isMe = myId && entry.userId === myId;
        const row = document.createElement('div');
        row.style.cssText = `
          display: flex; align-items: center; padding: 12px 14px;
          margin-bottom: 6px; border-radius: 10px;
          background: ${isMe ? 'rgba(0, 245, 212, 0.08)' : 'rgba(10, 14, 26, 0.70)'};
          border: 1px solid ${isMe ? 'rgba(0, 245, 212, 0.30)' : 'rgba(42, 48, 80, 0.40)'};
          font-family: ${NEON_FONT};
        `;

        const medal = i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : '';
        const rank = medal || `${i + 1}`;

        row.innerHTML = `
          <span style="width:36px;text-align:center;font-size:${medal ? '20px' : '15px'};color:${NEON_STEEL}">${rank}</span>
          <span style="flex:1;color:${isMe ? NEON_CYAN : '#E0F0FF'};font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
            ${entry.name}${isMe ? ` <span style="font-size:12px;color:${NEON_CYAN}">${t('lb_you')}</span>` : ''}
          </span>
          <span style="color:${NEON_AMBER};font-size:16px;font-weight:bold">${entry.score}${t('unit_m')}</span>
        `;
        list.appendChild(row);
      });
    }
  }

  // Скрыть — просто удаляем из DOM
  hide() {
    this.destroy();
  }

  // Удалить DOM-элемент
  destroy() {
    if (this.div) {
      this.div.remove();
      this.div = null;
    }
    // Fallback: убрать по id если ссылка потерялась
    const stale = document.getElementById('leaderboard-panel');
    if (stale) stale.remove();
  }
}
