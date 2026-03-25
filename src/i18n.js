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
    continue_star: 'RESURRECT ⭐1',
    restart: 'RESTART',
    menu: 'MENU',
    bounty: 'BOUNTY CLAIMED!',
    moonwalker: 'MOONWALKER',
    butcher: 'THE BUTCHER\nAPPROVES',
    tap_to_hunt: 'Tap to start climbing',
    moon_reached: 'Moon: reached',
    unit_m: 'm',
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
    continue_star: 'ВОСКРЕСНУТЬ ⭐1',
    restart: 'ЗАНОВО',
    menu: 'МЕНЮ',
    bounty: 'ДОБЫЧА ПОЛУЧЕНА!',
    moonwalker: 'ЛУННЫЙ ХОДОК',
    butcher: 'МЯСНИК\nОДОБРЯЕТ',
    tap_to_hunt: 'Нажми чтобы начать подъём',
    moon_reached: 'Луна: достигнута',
    unit_m: 'м',
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
  localStorage.setItem(LANG_KEY, code);
}

export function t(key) {
  return (LANGS[currentLang] && LANGS[currentLang][key]) || key;
}
