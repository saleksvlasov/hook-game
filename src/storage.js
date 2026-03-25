const KEY = 'thehook_best';
const MOON_KEY = 'thehook_moon';
const CHALLENGES_KEY = 'thehook_challenges';
const SKIN_KEY = 'thehook_skin';
const LAUNCH_DATE = 1742860800000; // 2025-03-25T00:00:00Z

export function getBest() {
  return parseInt(localStorage.getItem(KEY) || '0', 10);
}

export function saveBest(value) {
  const current = getBest();
  if (value > current) {
    try { localStorage.setItem(KEY, String(value)); } catch(e) { /* quota exceeded */ }
    return true;
  }
  return false;
}

export function getMoon() {
  return localStorage.getItem(MOON_KEY) === 'yes';
}

export function saveMoon() {
  try { localStorage.setItem(MOON_KEY, 'yes'); } catch(e) { /* quota exceeded */ }
}

// --- Еженедельные испытания и скины ---

// Текущая неделя от даты запуска (0-based)
export function getCurrentWeek() {
  return Math.floor((Date.now() - LAUNCH_DATE) / (7 * 24 * 60 * 60 * 1000));
}

// Получить данные о челленджах
export function getChallenges() {
  try {
    return JSON.parse(localStorage.getItem(CHALLENGES_KEY)) || { unlockedSkins: ['default'], weeklyProgress: {} };
  } catch(e) { return { unlockedSkins: ['default'], weeklyProgress: {} }; }
}

// Сохранить данные о челленджах
export function saveChallenges(data) {
  try { localStorage.setItem(CHALLENGES_KEY, JSON.stringify(data)); } catch(e) {}
}

// Получить активный скин (id строка)
export function getActiveSkin() {
  return localStorage.getItem(SKIN_KEY) || 'default';
}

// Установить активный скин
export function setActiveSkin(skinId) {
  try { localStorage.setItem(SKIN_KEY, skinId); } catch(e) {}
}

// Разблокировать скин
export function unlockSkin(skinId) {
  const data = getChallenges();
  if (!data.unlockedSkins.includes(skinId)) {
    data.unlockedSkins.push(skinId);
    saveChallenges(data);
  }
}

// Проверить разблокирован ли скин
export function isSkinUnlocked(skinId) {
  return getChallenges().unlockedSkins.includes(skinId);
}
