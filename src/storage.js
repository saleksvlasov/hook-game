const KEY = 'thehook_best';
const MOON_KEY = 'thehook_moon';

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
