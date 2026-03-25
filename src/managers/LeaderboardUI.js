import { t } from '../i18n.js';
import { Z } from '../constants.js';
import { fetchLeaderboard, getTelegramUserId } from '../telegram.js';

// ===== NEON WESTERN ПАЛИТРА =====
const NEON_CYAN = '#00F5D4';
const NEON_AMBER = '#FFB800';
const NEON_STEEL = '#4A5580';
const NEON_FONT = "'Inter', 'Helvetica Neue', sans-serif";

// Панель лидерборда — HTML overlay, neon western glassmorphism
export class LeaderboardUI {
  constructor() {
    this.div = null;
    this.list = null;
  }

  // Создаёт DOM-панель лидерборда (скрыта по умолчанию)
  create() {
    this.div = document.createElement('div');
    this.div.id = 'leaderboard-panel';
    this.div.style.cssText = `
      display: none; position: fixed; top: 0; left: 0;
      width: 100%; height: 100%; z-index: ${Z.HTML_BUTTONS + 10};
      background: rgba(5, 8, 16, 0.96);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      flex-direction: column; align-items: center;
      padding: 40px 16px 20px;
      overflow-y: auto;
      opacity: 0; transition: opacity 0.3s ease;
    `;

    // Кнопка закрытия — neon cyan
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u2715';
    closeBtn.style.cssText = `
      position: absolute; top: 12px; right: 16px;
      background: none; border: none; color: ${NEON_STEEL};
      font-size: 26px; cursor: pointer; pointer-events: auto;
      -webkit-tap-highlight-color: transparent;
      transition: color 0.15s ease;
    `;
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = NEON_CYAN; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = NEON_STEEL; });
    closeBtn.addEventListener('click', () => this.hide());
    this.div.appendChild(closeBtn);

    // Заголовок — neon amber
    const title = document.createElement('div');
    title.textContent = `\uD83C\uDFC6 ${t('leaderboard')}`;
    title.style.cssText = `
      font-family: ${NEON_FONT}; font-size: 26px; font-weight: bold;
      color: ${NEON_AMBER}; margin-bottom: 24px; letter-spacing: 3px;
      text-transform: uppercase;
    `;
    this.div.appendChild(title);

    // Контейнер для списка
    this.list = document.createElement('div');
    this.list.style.cssText = `
      width: 100%; max-width: 360px;
    `;
    this.div.appendChild(this.list);

    document.body.appendChild(this.div);
  }

  // Показать лидерборд — загрузить данные и анимировать появление
  async show() {
    const lb = await fetchLeaderboard();
    const myId = getTelegramUserId();

    this.list.innerHTML = '';

    if (lb.length === 0) {
      this.list.innerHTML = `<div style="color:${NEON_STEEL};font-family:${NEON_FONT};text-align:center;padding:40px 0;font-size:16px">${t('lb_empty')}</div>`;
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
        this.list.appendChild(row);
      });
    }

    this.div.style.display = 'flex';
    requestAnimationFrame(() => {
      this.div.style.opacity = '1';
    });
  }

  // Скрыть лидерборд с анимацией fade out
  hide() {
    this.div.style.opacity = '0';
    setTimeout(() => {
      this.div.style.display = 'none';
    }, 300);
  }

  // Удалить DOM-элемент
  destroy() {
    const lb = document.getElementById('leaderboard-panel');
    if (lb) lb.remove();
    this.div = null;
    this.list = null;
  }
}
