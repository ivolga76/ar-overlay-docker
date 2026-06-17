let ctx = null;

function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return ctx;
}

function beep(freq, duration, type = 'sine', volume = 0.15) {
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime);
    gain.gain.setValueAtTime(volume, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + duration);
  } catch {}
}

export function playRoundChange() {
  beep(520, 0.12, 'triangle', 0.12);
  setTimeout(() => beep(680, 0.18, 'triangle', 0.12), 100);
}

export function playParticipantSwitch() {
  beep(440, 0.08, 'sine', 0.08);
  setTimeout(() => beep(550, 0.06, 'sine', 0.08), 60);
}

export function playTimerEnd() {
  beep(880, 0.3, 'square', 0.2);
  setTimeout(() => beep(660, 0.3, 'square', 0.2), 300);
  setTimeout(() => beep(880, 0.3, 'square', 0.2), 600);
}
