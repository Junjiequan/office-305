// Sound effects (synthesised, no files) and small helpers.
let ctx = null, master = null, muted = false;
const A = () => { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination); } catch (e) { ctx = null; } } if (ctx && ctx.state === 'suspended') ctx.resume(); return ctx; };
function tone(f, d = 0.12, type = 'sine', v = 0.1, slide = 1, delay = 0) {
  const c = A(); if (!c || muted) return; const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + d); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.03);
}
function noise(d = 0.15, v = 0.1, freq = 1200, q = 0.8, type = 'bandpass', delay = 0) {
  const c = A(); if (!c || muted) return; const t = c.currentTime + delay, len = Math.ceil(c.sampleRate * d), b = c.createBuffer(1, len, c.sampleRate), data = b.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0008, t + d); s.connect(f); f.connect(g); g.connect(master); s.start(t);
}
export const sfx = {
  unlock() { A(); },
  step() { noise(0.05, 0.035, 700, 0.7, 'lowpass'); },
  sit() { noise(0.18, 0.05, 500, 0.6, 'lowpass'); tone(180, 0.12, 'sine', 0.04, 0.6); },
  stairs() { for (let i = 0; i < 4; i++) tone(440 + i * 70, 0.12, 'triangle', 0.05, 0.9, i * 0.08); },
  chat() { tone(520, 0.07, 'triangle', 0.05); tone(660, 0.09, 'triangle', 0.04, 1, 0.06); },
  click() { tone(900, 0.05, 'square', 0.025); },
  toggleMute() { muted = !muted; return muted; },
};
// a quiet, slow ambient pad so the dungeon is not silent
let padOn = false;
export function startAmbient() {
  const c = A(); if (!c || padOn) return; padOn = true;
  const g = c.createGain(); g.gain.value = 0.0; g.connect(master); g.gain.linearRampToValueAtTime(0.035, c.currentTime + 4);
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.connect(g);
  for (const [fr, det] of [[55, 0], [82.4, 6], [110, -5], [164.8, 9]]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = det; const og = c.createGain(); og.gain.value = 0.25; o.connect(og); og.connect(f); o.start(); }
  const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 160; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
}
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, TAU = Math.PI * 2;
export const rand = (a, b) => a + Math.random() * (b - a), randInt = (a, b) => Math.floor(rand(a, b + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
export const dirOf = (dx, dy) => { const a = Math.atan2(dy, dx); return ((Math.round((a - Math.PI / 2) / (Math.PI / 4)) % 8) + 8) % 8; };
