// TARIEL CAULSLEIGH - touch controls for a phone: a thumb stick on the left, drag the right of the screen to look,
// and a few round buttons. It turns touches into the same key events the keyboard makes, so the game has one input path.
// Shown only on a touch screen.
export function initTouch(look, tapped) {
  const coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
  if (!coarse) return false;
  const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true }));
  const css = document.createElement('style');
  css.textContent = `
  #touch { position: fixed; inset: 0; z-index: 4; pointer-events: none; touch-action: none; user-select: none; -webkit-user-select: none; }
  #touch .zone { position: absolute; pointer-events: auto; touch-action: none; }
  #tstick { left: 0; bottom: 0; width: 45%; height: 55%; }
  #tlook { right: 0; top: 12%; width: 55%; height: 50%; }
  #tknob { position: absolute; width: 96px; height: 96px; margin: -48px 0 0 -48px; border-radius: 50%; border: 2px solid #f2e4c088; background: #00000044; display: none; }
  #tknob i { position: absolute; left: 50%; top: 50%; width: 44px; height: 44px; margin: -22px; border-radius: 50%; background: #f2e4c0aa; }
  #touch button { position: absolute; pointer-events: auto; width: 58px; height: 58px; border-radius: 50%; border: 2px solid #f2e4c0aa; background: #0000007a; color: #f2e4c0; font: 700 18px Georgia, serif; touch-action: none; padding: 0; }
  #touch button:active { background: #6b2020cc; }
  body.busy #tstick, body.busy #tlook { display: none; }
  #touch .row { position: absolute; top: 110px; left: 8px; display: flex; flex-direction: column; gap: 6px; pointer-events: none; }
  #touch .row button { position: static; width: 44px; height: 44px; font-size: 15px; }`;
  document.head.append(css);
  const root = document.createElement('div'); root.id = 'touch';
  root.innerHTML = '<div id="tstick" class="zone"><div id="tknob"><i></i></div></div><div id="tlook" class="zone"></div>' +
    '<button id="tb-e" style="right:20px;bottom:90px">E</button><button id="tb-j" style="right:90px;bottom:30px">Jump</button>' +
    '<button id="tb-r" style="right:90px;bottom:100px;width:48px;height:48px;font-size:14px">Run</button>' +
    '<button id="tb-q" style="right:20px;bottom:20px">Q</button>' +
    '<div class="row"><button id="tb-f">F</button><button id="tb-jn">J</button><button id="tb-i">I</button><button id="tb-m">Map</button><button id="tb-p">❚❚</button></div>';
  document.body.append(root);
  const $ = (id) => document.getElementById(id);
  const hold = (id, code) => { const b = $(id); b.addEventListener('touchstart', (e) => { e.preventDefault(); key('keydown', code); }, { passive: false }); const up = (e) => { e.preventDefault(); key('keyup', code); }; b.addEventListener('touchend', up, { passive: false }); b.addEventListener('touchcancel', up, { passive: false }); };
  const tap = (id, code) => { $(id).addEventListener('touchstart', (e) => { e.preventDefault(); key('keydown', code); key('keyup', code); }, { passive: false }); };
  tap('tb-e', 'KeyE'); tap('tb-q', 'KeyQ'); tap('tb-f', 'KeyF'); tap('tb-jn', 'KeyJ'); tap('tb-i', 'KeyI'); tap('tb-m', 'KeyM'); tap('tb-p', 'Escape');
  hold('tb-j', 'Space'); hold('tb-r', 'ShiftLeft');
  // the stick: where the thumb lands is the centre; pushing past it holds W/A/S/D, far out also runs
  const stick = $('tstick'), knob = $('tknob'); let sid = null, cx = 0, cy = 0; const on = new Set();
  const set = (code, v) => { if (v && !on.has(code)) { on.add(code); key('keydown', code); } else if (!v && on.has(code)) { on.delete(code); key('keyup', code); } };
  const clear = () => { for (const c of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft']) set(c, false); knob.style.display = 'none'; sid = null; };
  stick.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.changedTouches[0]; sid = t.identifier; cx = t.clientX; cy = t.clientY; const r = stick.getBoundingClientRect(); knob.style.left = (cx - r.left) + 'px'; knob.style.top = (cy - r.top) + 'px'; knob.style.display = 'block'; knob.firstElementChild.style.transform = ''; }, { passive: false });
  stick.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) if (t.identifier === sid) {
      const dx = t.clientX - cx, dy = t.clientY - cy, d = Math.hypot(dx, dy), m = d > 0 ? Math.min(d, 48) / d : 0;
      knob.firstElementChild.style.transform = `translate(${dx * m}px,${dy * m}px)`;
      set('KeyD', dx > 16); set('KeyA', dx < -16); set('KeyS', dy > 16); set('KeyW', dy < -16); set('ShiftLeft', d > 80);
    }
  }, { passive: false });
  for (const ev of ['touchend', 'touchcancel']) stick.addEventListener(ev, (e) => { for (const t of e.changedTouches) if (t.identifier === sid) clear(); }, { passive: false });
  // looking: drag anywhere on the right
  const lk = $('tlook'); let lid = null, lx = 0, ly = 0;
  let moved = 0;
  lk.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; ly = t.clientY; moved = 0; }, { passive: false });
  lk.addEventListener('touchmove', (e) => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === lid) { moved += Math.abs(t.clientX - lx) + Math.abs(t.clientY - ly); look(t.clientX - lx, t.clientY - ly); lx = t.clientX; ly = t.clientY; } }, { passive: false });
  for (const ev of ['touchend', 'touchcancel']) lk.addEventListener(ev, () => { if (ev === 'touchend' && moved < 8 && tapped) tapped(); lid = null; }, { passive: false });
  // pinch on the look pad is left out on purpose; zoom stays on the mouse wheel / pad
  return true;
}
