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

// Low thud + descending tone
export function playDeath() {
  try {
    const c = getCtx();

    // Thud — noise-like via detuned square
    const o1 = c.createOscillator();
    const g1 = c.createGain();
    o1.type = 'square';
    o1.frequency.setValueAtTime(50, c.currentTime);
    o1.frequency.exponentialRampToValueAtTime(20, c.currentTime + 0.3);
    g1.gain.setValueAtTime(0.3, c.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.3);
    o1.connect(g1).connect(c.destination);
    o1.start();
    o1.stop(c.currentTime + 0.3);

    // Descending tone
    osc('sine', 400, 0.3, 0.15, 80);
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

export function destroyAudio() {
  if (ctx && ctx.state !== 'closed') {
    ctx.close().catch(() => {});
    ctx = null;
  }
}
