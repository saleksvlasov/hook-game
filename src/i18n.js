const LANG_KEY = 'thehook_lang';

export const LANGS = {
  en: {
    title_sub: 'How high can you go?',
    play: 'CLIMB',
    depth: 'HEIGHT',
    record: 'RECORD',
    click_hook: 'Tap to hook!',
    click_release: 'Tap to release!',
    you_died: 'YOU FELL',
    depth_label: 'Height',
    record_label: 'Record',
    new_record: 'NEW RECORD!',
    continue_ad: 'RESURRECT (AD)',
    continue_star: 'RESURRECT ⭐6',
    restart: 'RESTART',
    menu: 'MENU',
    bounty: 'BOUNTY CLAIMED!',
    moonwalker: 'MOONWALKER',
    butcher: 'THE BUTCHER\nAPPROVES',
    tap_to_hunt: 'Tap to start climbing',
    moon_reached: 'Moon: reached',
    unit_m: 'm',
    leaderboard: 'TOP',
    lb_empty: 'No records yet',
    lb_you: 'YOU',
    // Еженедельные испытания
    challenge_title: 'WEEKLY CHALLENGE',
    challenge_reach: 'Reach {0}m in one game',
    challenge_total: 'Climb {0}m total this week',
    challenge_no_hit: 'Reach {0}m without hitting bugs',
    challenge_games: 'Play {0} games this week',
    challenge_streak: 'Reach {0}m {1} times in a row',
    challenge_progress: '{0}/{1}',
    challenge_completed: 'COMPLETED!',
    challenge_claim: 'CLAIM SKIN',
    challenge_claimed: 'CLAIMED ✓',
    challenge_new_week: 'New challenge available!',
    skin_unlocked: 'Skin unlocked: {0}',
    skins_title: 'SKINS',
    top_button: 'TOP 100',
    skin_locked: 'Locked',
    skin_equipped: 'Equipped',
    skin_equip: 'Equip',
  },
  ru: {
    title_sub: 'Как высоко заберёшься?',
    play: 'ВВЕРХ',
    depth: 'ВЫСОТА',
    record: 'РЕКОРД',
    click_hook: 'Нажми чтобы зацепиться!',
    click_release: 'Нажми чтобы отпустить!',
    you_died: 'ТЫ УПАЛ',
    depth_label: 'Высота',
    record_label: 'Рекорд',
    new_record: 'НОВЫЙ РЕКОРД!',
    continue_ad: 'ВОСКРЕСНУТЬ (РЕКЛАМА)',
    continue_star: 'ВОСКРЕСНУТЬ ⭐6',
    restart: 'ЗАНОВО',
    menu: 'МЕНЮ',
    bounty: 'ДОБЫЧА ПОЛУЧЕНА!',
    moonwalker: 'ЛУННЫЙ ХОДОК',
    butcher: 'МЯСНИК\nОДОБРЯЕТ',
    tap_to_hunt: 'Нажми чтобы начать подъём',
    moon_reached: 'Луна: достигнута',
    unit_m: 'м',
    leaderboard: 'ТОП',
    lb_empty: 'Пока нет рекордов',
    lb_you: 'ТЫ',
    // Еженедельные испытания
    challenge_title: 'ИСПЫТАНИЕ НЕДЕЛИ',
    challenge_reach: 'Набери {0}м за одну игру',
    challenge_total: 'Набери {0}м суммарно за неделю',
    challenge_no_hit: 'Набери {0}м без столкновений с жуками',
    challenge_games: 'Сыграй {0} игр за неделю',
    challenge_streak: 'Набери {0}м {1} раз подряд',
    challenge_progress: '{0}/{1}',
    challenge_completed: 'ВЫПОЛНЕНО!',
    challenge_claim: 'ЗАБРАТЬ СКИН',
    challenge_claimed: 'ПОЛУЧЕНО ✓',
    challenge_new_week: 'Новое испытание доступно!',
    skin_unlocked: 'Скин разблокирован: {0}',
    skins_title: 'СКИНЫ',
    top_button: 'ТОП 100',
    skin_locked: 'Закрыт',
    skin_equipped: 'Надет',
    skin_equip: 'Надеть',
  },
};

function detectLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved && LANGS[saved]) return saved;
  return navigator.language.startsWith('ru') ? 'ru' : 'en';
}

let currentLang = detectLang();

export function getLang() {
  return currentLang;
}

export function setLang(code) {
  currentLang = code;
  try { localStorage.setItem(LANG_KEY, code); } catch(e) { /* quota exceeded */ }
}

export function t(key) {
  return (LANGS[currentLang] && LANGS[currentLang][key]) || key;
}

// Подстановка {0}, {1} в строку
export function tf(key, ...args) {
  let str = t(key);
  args.forEach((val, i) => {
    str = str.replace(`{${i}}`, val);
  });
  return str;
}
