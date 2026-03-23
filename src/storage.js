const KEY = 'thehook_best';
const MOON_KEY = 'thehook_moon';

export function getBest() {
  return parseInt(localStorage.getItem(KEY) || '0', 10);
}

export function saveBest(value) {
  const current = getBest();
  if (value > current) {
    localStorage.setItem(KEY, String(value));
    return true;
  }
  return false;
}

export function getMoon() {
  return localStorage.getItem(MOON_KEY) === 'yes';
}

export function saveMoon() {
  localStorage.setItem(MOON_KEY, 'yes');
}
