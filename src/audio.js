let ctx = null;

function getCtx() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function osc(type, freq, duration, gainValue, freqEnd) {
  try {
    const c = getCtx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (freqEnd !== undefined) {
      o.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + duration);
    }
    g.gain.setValueAtTime(gainValue, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + duration);
  } catch(e) { /* audio context closed or unavailable */ }
}

// Short whoosh sweep up
export function playHook() {
  osc('sawtooth', 200, 0.15, 0.15, 800);
  osc('sine', 150, 0.1, 0.08, 600);
}

// Low clunk
export function playAttach() {
  osc('square', 80, 0.08, 0.2, 40);
  osc('sine', 120, 0.06, 0.15, 60);
}

// Whoosh sweep down
export function playRelease() {
  osc('sawtooth', 600, 0.12, 0.12, 150);
}

// Грустно-забавный "wa-wa-waaaa" (нисходящий тромбон)
export function playDeath() {
  try {
    const c = getCtx();
    const now = c.currentTime;

    // Нота 1: "wa" (высокая)
    const o1 = c.createOscillator();
    const g1 = c.createGain();
    o1.type = 'triangle';
    o1.frequency.setValueAtTime(440, now);
    o1.frequency.setValueAtTime(440, now + 0.15);
    g1.gain.setValueAtTime(0.2, now);
    g1.gain.setValueAtTime(0, now + 0.18);
    o1.connect(g1).connect(c.destination);
    o1.start(now);
    o1.stop(now + 0.2);

    // Нота 2: "wa" (чуть ниже)
    const o2 = c.createOscillator();
    const g2 = c.createGain();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(392, now + 0.2);
    g2.gain.setValueAtTime(0, now + 0.19);
    g2.gain.setValueAtTime(0.2, now + 0.2);
    g2.gain.setValueAtTime(0, now + 0.38);
    o2.connect(g2).connect(c.destination);
    o2.start(now + 0.2);
    o2.stop(now + 0.4);

    // Нота 3: "waaaa" (низкая, длинная, грустная)
    const o3 = c.createOscillator();
    const g3 = c.createGain();
    o3.type = 'triangle';
    o3.frequency.setValueAtTime(330, now + 0.42);
    o3.frequency.exponentialRampToValueAtTime(220, now + 0.9);
    g3.gain.setValueAtTime(0, now + 0.41);
    g3.gain.setValueAtTime(0.2, now + 0.42);
    g3.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
    o3.connect(g3).connect(c.destination);
    o3.start(now + 0.42);
    o3.stop(now + 1.0);
  } catch(e) { /* audio context closed or unavailable */ }
}

// Зловещий низкий тон для пасхалки Konami
export function playOminous() {
  try {
    const c = getCtx();
    // Глубокий гул
    osc('sawtooth', 55, 1.2, 0.15, 30);
    osc('sine', 70, 1.0, 0.1, 40);
    // Дисгармоничный обертон
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(110, c.currentTime);
    o.frequency.linearRampToValueAtTime(55, c.currentTime + 1.5);
    o.detune.setValueAtTime(50, c.currentTime);
    g.gain.setValueAtTime(0.08, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.5);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 1.5);
  } catch(e) { /* audio context closed or unavailable */ }
}

// Фанфары для "BOUNTY CLAIMED"
export function playBounty() {
  try {
    const c = getCtx();
    const notes = [392, 494, 587, 784]; // G4, B4, D5, G5
    const noteLen = 0.15;
    notes.forEach((freq, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'triangle';
      const start = c.currentTime + i * noteLen;
      o.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.2, start + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, start + noteLen * 1.5);
      o.connect(g).connect(c.destination);
      o.start(start);
      o.stop(start + noteLen * 1.5);
    });
  } catch(e) { /* audio context closed or unavailable */ }
}

// Мистический звук луны
export function playMoonwalker() {
  try {
    const c = getCtx();
    // Восходящий мерцающий тон
    osc('sine', 440, 0.8, 0.1, 880);
    osc('sine', 660, 1.0, 0.08, 1320);
    // Тремоло
    const o = c.createOscillator();
    const g = c.createGain();
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(550, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(1100, c.currentTime + 1.2);
    g.gain.setValueAtTime(0.06, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.2);
    lfo.frequency.setValueAtTime(8, c.currentTime);
    lfoGain.gain.setValueAtTime(0.03, c.currentTime);
    lfo.connect(lfoGain).connect(g.gain);
    o.connect(g).connect(c.destination);
    o.start(); lfo.start();
    o.stop(c.currentTime + 1.2);
    lfo.stop(c.currentTime + 1.2);
  } catch(e) { /* audio context closed or unavailable */ }
}

// 3-note ascending melody
export function playRecord() {
  try {
    const c = getCtx();
    const notes = [523, 659, 784]; // C5, E5, G5
    const noteLen = 0.12;

    notes.forEach((freq, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      const start = c.currentTime + i * noteLen;
      o.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.2, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + noteLen);
      o.connect(g).connect(c.destination);
      o.start(start);
      o.stop(start + noteLen);
    });
  } catch(e) { /* audio context closed or unavailable */ }
}

// Удар о жука — резкий хруст + низкий удар
export function playBugHit() {
  try {
    const c = getCtx();
    // Хруст — шумоподобный через расстроенный square
    const o1 = c.createOscillator();
    const g1 = c.createGain();
    o1.type = 'square';
    o1.frequency.setValueAtTime(300, c.currentTime);
    o1.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.12);
    o1.detune.setValueAtTime(100, c.currentTime);
    g1.gain.setValueAtTime(0.25, c.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
    o1.connect(g1).connect(c.destination);
    o1.start();
    o1.stop(c.currentTime + 0.12);
    // Низкий удар
    osc('sine', 100, 0.15, 0.2, 40);
  } catch(e) { /* audio context closed or unavailable */ }
}

// Тик обратного отсчёта 3-2-1 (короткий электронный "бип")
export function playCountdownTick() {
  osc('sine', 880, 0.12, 0.2, 880);
  osc('square', 440, 0.08, 0.05, 440);
}

// Финальный "GO!" — восходящий аккорд
export function playCountdownGo() {
  osc('sine', 523, 0.15, 0.2, 1047);
  osc('triangle', 659, 0.12, 0.15, 1318);
}

// Подбор сердца — восходящий мелодичный тон
export function playHeartPickup() {
  osc('sine', 523, 0.15, 0.15, 784);    // C5 → G5
  osc('triangle', 659, 0.12, 0.1, 1047); // E5 → C6
}

// Переход Power Arc тира — восходящий chime
export function playTierUp() {
  try {
    const c = getCtx();
    const now = c.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      const start = now + i * 0.06;
      o.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.12, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.15);
      o.connect(g).connect(c.destination);
      o.start(start);
      o.stop(start + 0.15);
    });
  } catch(e) { /* audio context closed or unavailable */ }
}

export function destroyAudio() {
  if (ctx && ctx.state !== 'closed') {
    ctx.close().catch(() => {});
    ctx = null;
  }
}
