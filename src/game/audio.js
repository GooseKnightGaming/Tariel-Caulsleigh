// TARIEL CAULSLEIGH - sound, made in code like everything else: wind, the murmur of the tavern, a harper's tune, a
// footstep. No files. It starts on the first key or click (browsers insist), M mutes. Nothing here can break the game:
// if there is no AudioContext, everything is a no-op.
const SCALE = [0, 2, 3, 5, 7, 8, 10];                       // a dark, old mode (natural minor), in semitones
export function makeAudio() {
  const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
  const A = { ok: false, muted: false, notes: 0 };
  if (!AC) return Object.assign(A, { start() {}, update() {}, toggle() { return true; }, step() {} });
  let ctx = null, master, windG, murG, windF;
  const noise = (c, len = 2) => { const b = c.createBuffer(1, c.sampleRate * len, c.sampleRate), d = b.getChannelData(0); let last = 0; for (let i = 0; i < d.length; i++) { last = last * 0.96 + (Math.random() * 2 - 1) * 0.2; d[i] = last; } return b; };
  A.start = () => {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new AC(); master = ctx.createGain(); master.gain.value = A.muted ? 0 : 0.7; master.connect(ctx.destination);
      const nb = noise(ctx, 3);
      const mk = (type, freq, q) => { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(master); s.start(); return { g, f }; };
      const w = mk('lowpass', 500, 0.7); windG = w.g; windF = w.f;
      const m = mk('bandpass', 420, 0.8); murG = m.g;       // a room full of low voices
      A.ok = true;
    } catch (e) { A.ok = false; }
  };
  const pluck = (freq, when, vol) => {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = freq; o2.frequency.value = freq * 2;
    f.type = 'lowpass'; f.frequency.setValueAtTime(2600, when); f.frequency.exponentialRampToValueAtTime(500, when + 0.9);
    g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(vol, when + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, when + 1.4);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(master); o.start(when); o2.start(when); o.stop(when + 1.5); o2.stop(when + 1.5);
  };
  let nextNote = 0, degree = 2;
  // inTavern, night 0-1, wind 0-1, harper: is the harper playing, hush: the room has gone quiet
  A.update = (dt, st) => {
    if (!A.ok) return;
    const t = ctx.currentTime, k = 1 - Math.exp(-dt * 2);
    const windT = (st.inside ? 0.05 : 0.14 + 0.1 * st.night) * (st.hush ? 1.6 : 1), murT = st.inside ? (st.hush ? 0.0 : 0.16) : 0;
    windG.gain.value += (windT - windG.gain.value) * k; murG.gain.value += (murT - murG.gain.value) * k;
    windF.frequency.value = 380 + 220 * Math.sin(t * 0.37) + 120 * Math.sin(t * 1.3);
    if (st.inside && st.harper && !st.hush && t >= nextNote) {              // a slow wandering tune, never the same twice
      degree = Math.max(0, Math.min(13, degree + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
      const semis = SCALE[degree % 7] + 12 * Math.floor(degree / 7);
      pluck(196 * Math.pow(2, semis / 12), t, 0.16); A.notes++;
      nextNote = t + [0.45, 0.45, 0.9, 0.9, 1.4][Math.floor(Math.random() * 5)];
    }
  };
  A.step = () => { if (!A.ok) return; const t = ctx.currentTime, s = ctx.createBufferSource(); s.buffer = noise(ctx, 0.12); const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 300 + Math.random() * 120; const g = ctx.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1); s.connect(f); f.connect(g); g.connect(master); s.start(t); };
  A.toggle = () => { A.muted = !A.muted; if (master) master.gain.value = A.muted ? 0 : 0.7; return A.muted; };
  return A;
}
