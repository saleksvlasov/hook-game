/**
 * PerkIcons — кастомные inline SVG иконки для перков.
 * viewBox 0 0 20 20, все цвета захардкожены (не зависят от CSS currentColor).
 * Используются в PerkGuideUI через badge.innerHTML.
 */

export const PERK_ICONS = {

  // ── РАУНДОВЫЕ ПЕРКИ ─────────────────────────────────────────────────────────

  /** Якорь с пунктирным кругом дальности */
  hook_range: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="4.5" r="1.8" stroke="#00F5D4" stroke-width="1.4"/>
    <line x1="10" y1="6.3" x2="10" y2="13.5" stroke="#00F5D4" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="6" y1="9" x2="14" y2="9" stroke="#00F5D4" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M6 9 Q4.5 13 7.5 14.8" stroke="#00F5D4" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M14 9 Q15.5 13 12.5 14.8" stroke="#00F5D4" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="10" cy="10" r="8.5" stroke="#00F5D4" stroke-width="0.8" stroke-dasharray="2 2.5" opacity="0.4"/>
  </svg>`,

  /** Молния — filled polygon */
  swing_power: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
    <path d="M13 2 L5.5 11.5 L10 11.5 L7 18 L14.5 8.5 L10 8.5 Z" fill="#FF2E63"/>
  </svg>`,

  /** Крюк + 3 линии скорости */
  quick_hook: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
    <path d="M5 3 L5 12 Q5 16.5 9 16.5 Q13 16.5 13 12"
      stroke="#FFB800" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="14" y1="4.5"  x2="18.5" y2="4.5"  stroke="#FFB800" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="14.5" y1="8"  x2="18.5" y2="8"    stroke="#FFB800" stroke-width="1.4" stroke-linecap="round" opacity="0.6"/>
    <line x1="15"   y1="11.5" x2="18.5" y2="11.5" stroke="#FFB800" stroke-width="1.4" stroke-linecap="round" opacity="0.3"/>
  </svg>`,

  /** Подкова-магнит: красный N-полюс, cyan S-полюс, оранжевые искры */
  ember_magnet: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
    <line x1="5"  y1="5"  x2="5"  y2="10" stroke="#FF6B35" stroke-width="2"/>
    <line x1="15" y1="5"  x2="15" y2="10" stroke="#FF6B35" stroke-width="2"/>
    <path d="M5 10 Q5 16 10 16 Q15 16 15 10" stroke="#FF6B35" stroke-width="2" stroke-linecap="butt"/>
    <rect x="3"  y="2" width="4" height="5" rx="1" fill="#FF2E63"/>
    <rect x="13" y="2" width="4" height="5" rx="1" fill="#00F5D4"/>
    <circle cx="10" cy="12.5" r="1.2" fill="#FF6B35"/>
    <circle cx="8"  cy="9.5"  r="0.8" fill="#FF6B35" opacity="0.55"/>
    <circle cx="12" cy="9.5"  r="0.8" fill="#FF6B35" opacity="0.55"/>
  </svg>`,

  // ── КУЗНИЦА (постоянные) ────────────────────────────────────────────────────

  /** Сердце + горизонтальные пластины брони */
  iron_heart: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
    <path d="M10 16.5 L3 9.5 Q2 5.5 5.5 4 Q8 3 10 6.5 Q12 3 14.5 4 Q18 5.5 17 9.5 Z"
      fill="#FF2E63" opacity="0.85"/>
    <line x1="6.5" y1="8.5"  x2="13.5" y2="8.5"  stroke="#0A0E1A" stroke-width="1"   opacity="0.65"/>
    <line x1="5.5" y1="11"   x2="14.5" y2="11"   stroke="#0A0E1A" stroke-width="1"   opacity="0.5"/>
    <line x1="6.5" y1="13.5" x2="13.5" y2="13.5" stroke="#0A0E1A" stroke-width="1"   opacity="0.35"/>
  </svg>`,

  /** Щит с крестом внутри */
  shield: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
    <path d="M10 2 L17.5 5 L17.5 11 Q17.5 17 10 19 Q2.5 17 2.5 11 L2.5 5 Z"
      fill="#1A2040" stroke="#7A8AB0" stroke-width="1.3"/>
    <path d="M10 5.5 L14.5 7.5 L14.5 11.5 Q14.5 15 10 16.5 Q5.5 15 5.5 11.5 L5.5 7.5 Z"
      stroke="#4A5580" stroke-width="0.8" fill="none"/>
    <line x1="10" y1="8"  x2="10" y2="15" stroke="#7A8AB0" stroke-width="0.9" opacity="0.55"/>
    <line x1="7"  y1="11" x2="13" y2="11" stroke="#7A8AB0" stroke-width="0.9" opacity="0.55"/>
  </svg>`,

  /**
   * Круглая пила: 16-угольная звезда (8 зубьев), диск, втулка.
   * Точки звезды чередуют внешний r=8.5 и внутренний r=5.5.
   */
  saw: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none">
    <polygon
      points="18.5,10 15.1,12.1 16,16 12.1,15.1 10,18.5 7.9,15.1 4,16 4.9,12.1 1.5,10 4.9,7.9 4,4 7.9,4.9 10,1.5 12.1,4.9 16,4 15.1,7.9"
      fill="#4A5580" stroke="#7A8AB0" stroke-width="0.5" stroke-linejoin="round"/>
    <circle cx="10" cy="10" r="5"   fill="#1A2040" stroke="#7A8AB0" stroke-width="1"/>
    <circle cx="10" cy="10" r="2.5" fill="#2A3050" stroke="#7A8AB0" stroke-width="0.7"/>
    <circle cx="10" cy="10" r="1"   fill="#7A8AB0"/>
  </svg>`,

};
