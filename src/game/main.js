// TARIEL CAULSLEIGH - Chapter One: the Trenite at Stanlech.
// T0.1: the hill above Stanlech and the Yolo valley; Tariel on foot; day and night; the opening; the map.

import * as pc from 'playcanvas';
import * as W from '../world/world.js';
import { Walker, groundAt } from '../sim/walker.js';
import { Clock, skyAt } from '../sim/sky.js';
import { buildGround, buildRiver, buildTrees, buildTowns, buildSky, buildLamps } from './scene.js';
import { loadBody, Actor, HORSE } from './actor.js';
import { CAST, SCRIPT, OBJECTIVE, LANG } from './opening.js';
import { RegionMap } from './map.js';
import { buildVillage, DOORS, updateDoors } from './village.js';
import { OPEN, doors, blocked, clearTo } from '../world/solids.js';
import * as CH from '../sim/character.js';
import { Town } from './townsfolk.js';
import { roleLabel, inTavern, walkable } from '../sim/townsfolk.js';
import { Convo, newStory, addNote } from '../sim/dialogue.js';
import { scriptFor } from '../sim/story.js';
import { Figure, THIAH, TARIEL } from './figure.js';

const VERSION = 'T0.2';
const TEST = /[?&]test/.test(location.search);
const $ = (id) => document.getElementById(id);

// ── the engine ────────────────────────────────────────────────────────────
const canvas = $('app');
const app = new pc.Application(canvas, {
  mouse: new pc.Mouse(document.body), keyboard: new pc.Keyboard(window),
  graphicsDeviceOptions: { antialias: true, powerPreference: 'high-performance' },
});
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.graphicsDevice.maxPixelRatio = TEST ? 0.5 : Math.min(window.devicePixelRatio || 1, 1.5);
window.addEventListener('resize', () => app.resizeCanvas());
app.scene.fog.type = pc.FOG_EXP2;
app.start();

const camera = new pc.Entity('camera');
camera.addComponent('camera', { clearColor: new pc.Color(0.6, 0.7, 0.8), nearClip: 0.15, farClip: 2600, fov: 60, gammaCorrection: pc.GAMMA_SRGB, toneMapping: pc.TONEMAP_ACES });
app.root.addChild(camera);

const light = new pc.Entity('sun');
light.addComponent('light', {
  type: 'directional', castShadows: !TEST, shadowDistance: 70, shadowResolution: 2048, shadowBias: 0.3, normalOffsetBias: 0.06,
  numCascades: 2, cascadeDistribution: 0.6, shadowType: pc.SHADOW_PCF3_32F,
});
app.root.addChild(light);

// ── the state of play ─────────────────────────────────────────────────────
const clock = new Clock();
const map = new RegionMap();
const cam = { yaw: 0, pitch: 0.18, dist: 5.2, want: 5.2 };
let walker = null, tariel = null, sky = null, river = null, town = null;
let tavernLight = null, lampsRig = null;
const selves = { tariel: null, thiah: null };     // Tariel, and Thiah Kirdotr: the one you are now is `tariel`
let who = 'tariel', horse = null, nights = 0, paused = false;
const cast = {};
let mode = 'title';
const opening = { from: null, look: null };          // title -> opening -> free
let step = -1, waiting = false, arrived = false;
const keys = new Set();

// ── the world ─────────────────────────────────────────────────────────────
function say(text) { $('loadmsg').textContent = text; }
async function makeWorld() {
  const t0 = performance.now();
  say('Raising the hills…'); await frame();
  W.grid();
  say('Painting the valley…'); await frame();
  buildGround(pc, app);
  river = buildRiver(pc, app);
  say('Planting the woods…'); await frame();
  buildTrees(pc, app, W.trees());
  say('Building Stanlech…'); await frame();
  buildTowns(pc, app, W.buildings());
  lampsRig = buildLamps(pc, app);
  await buildVillage(pc, app).catch((e) => console.error('[village]', e));
  // the tavern's candles: a warm light inside, lit as the day goes
  {
    const t = W.tavern(), [x, z] = W.toWorld(t, 0, 0);
    tavernLight = new pc.Entity('tavern light');
    tavernLight.addComponent('light', { type: 'omni', color: new pc.Color(1, 0.72, 0.42), range: 10, intensity: 0, castShadows: false });
    tavernLight.setPosition(x, t.y + 2.3, z);
    app.root.addChild(tavernLight);
  }
  sky = buildSky(pc, app);
  say('Waking the people…'); await frame();
  const WHO = ['caulsleigh', 'siofel', 'rider'];
  const bodies = await Promise.all(WHO.map((k) => loadBody(pc, app, CAST[k].model).catch(() => null)));
  const HEIGHT = { tariel: 1.70, thiah: 1.70, caulsleigh: 1.84, siofel: 1.80, rider: 1.76 };
  WHO.forEach((k, i) => {
    if (!bodies[i]) return;
    const a = new Actor(pc, app, bodies[i], { name: CAST[k].name, height: HEIGHT[k] });
    cast[k] = a;
  });
  // Tariel and Thiah: the same woman, drawn entirely in code (see game/anatomy.js)
  selves.tariel = new Figure(pc, app, TARIEL); selves.thiah = new Figure(pc, app, THIAH);
  for (const k of ['tariel', 'thiah']) { selves[k].snapFace = true; selves[k].pose = 'idle'; }
  tariel = selves.tariel;
  if (selves.thiah) selves.thiah.visible = false;
  const hb = await loadBody(pc, app, 'Horse').catch(() => null);
  if (hb) { horse = new Actor(pc, app, hb, { name: 'horse', height: 2.35, clips: HORSE, paces: { walk: 1.8, jog: 8 } }); horse.visible = false; }
  // the people of Stanlech, drawn in code, living their days by the clock
  town = new Town(pc, app);
  const tf = performance.now();
  await town.build(frame, say, clock.hour);
  console.log('[tariel] the people ready in', Math.round(performance.now() - tf), 'ms');
  map.draw();
  console.log('[tariel] world ready in', Math.round(performance.now() - t0), 'ms');
}
const frame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

// ── the opening on the hill ───────────────────────────────────────────────
function setUpOpening() {
  const top = W.PLACES.hill, br = W.PLACES.bridge;
  const dx = br[0] - top[0], dz = br[1] - top[1], d = Math.hypot(dx, dz), fx = dx / d, fz = dz / d, rx = -fz, rz = fx;
  const yaw = Math.atan2(-dx, -dz);
  const at = (f, r) => [top[0] + fx * f + rx * r, top[1] + fz * f + rz * r];
  walker = new Walker(...at(52, 0), yaw);
  applyTraits();
  opening.from = at(46, 2.2); opening.look = [top[0] + dx * 0.6, top[1] + dz * 0.6];
  if (tariel) tariel.place(walker.pos[0], walker.pos[2], yaw);
  if (cast.caulsleigh) { cast.caulsleigh.place(...at(52.6, -1.6), yaw); cast.caulsleigh.pose = 'arms'; }
  if (cast.siofel) cast.siofel.place(...at(51.4, 1.7), yaw);
  opening.front = at(57, 0);                                // where the rider pulls up, between them and the town
  if (cast.rider) { cast.rider.place(...W.fromRiver(-45, -295)); cast.rider.visible = false; }
  if (horse) horse.place(...W.fromRiver(-45, -295), 0);
  cam.yaw = yaw; cam.pitch = 0.12; cam.dist = cam.want = 6.5;
  map.see(walker.pos[0], walker.pos[2], 420);          // from the hilltop you take in the valley
}
function startOpening() {
  mode = 'opening'; step = -1;
  $('title').classList.add('gone');
  $('hud').classList.remove('gone');
  setTimeout(next, 1800);
}
function next() {
  if (mode !== 'opening' || waiting) return;
  step++;
  const s = SCRIPT[step];
  if (!s) return endOpening();
  if (s.do === 'rider') return riderComes();
  if (s.do === 'leave') return endOpening();
  for (const k in cast) if (cast[k].visible && !cast[k].path) cast[k].pose = k === 'caulsleigh' && s.who !== k ? 'arms' : 'idle';
  if (tariel) tariel.pose = s.who === 'tariel' ? 'talk' : 'idle';
  if (cast[s.who]) cast[s.who].pose = 'talk';
  // the others turn to the one speaking
  const who = s.who === 'tariel' ? tariel : cast[s.who];
  if (who) for (const a of [tariel, cast.caulsleigh, cast.siofel, cast.rider]) if (a && a !== who && a.visible && !a.path && step > 1) a.face(who.pos[0], who.pos[2]);
  if (s.who === 'tariel' && tariel) walker.yaw = tariel.yaw;
  showLine(CAST[s.who].name, s.line, s.lang || LANG);
}
function showLine(name, line, lang) {
  $('talk').classList.remove('gone');
  $('talkname').textContent = name;
  $('talklang').textContent = lang ? '[' + lang + ']' : '';
  $('talkline').textContent = line;
}
function riderComes() {
  const r = cast.rider;
  $('talk').classList.add('gone');
  if (!r) { next(); return; }
  r.visible = true; waiting = true;
  const mover = horse || r;
  if (horse) { horse.visible = true; r.mount = horse; r.saddle = 1.0; }
  // up the hill path from the road, then straight up to the three of them
  mover.go([W.fromRiver(-70, -325), opening.front], horse ? 7.5 : 4.6, () => {
    waiting = false; mover.pose = 'idle'; mover.face(cast.caulsleigh.pos[0], cast.caulsleigh.pos[2]);
    for (const a of [cast.caulsleigh, cast.siofel, tariel]) if (a) a.face(mover.pos[0], mover.pos[2]);
    if (tariel) walker.yaw = tariel.yaw;
    next();
  });
  // they turn at the sound of hooves
  setTimeout(() => { for (const a of [cast.caulsleigh, cast.siofel, tariel]) if (a) a.face(mover.pos[0], mover.pos[2]); if (tariel) walker.yaw = tariel.yaw; }, 1500);
}
function endOpening() {
  $('talk').classList.add('gone');
  mode = 'free';
  // Caulsleigh, Síofel and the rider go down the hill path and away west, on the Mahlterngen road
  const away = [W.fromRiver(-100, -360), W.fromRiver(-50, -300), W.fromRiver(0, -245), [-380, W.fromRiver(0, -230)[1] + 40], [-700, W.fromRiver(0, -230)[1]]];
  // the rider gallops back the way he came, ahead of them
  if (horse && cast.rider && cast.rider.mount) horse.go(away.slice(), 8, () => { horse.visible = false; cast.rider.visible = false; });
  let lag = 600;
  for (const k of ['caulsleigh', 'siofel', 'rider']) {
    const a = cast[k]; if (!a || a.mount) continue;
    a.pose = 'idle';
    setTimeout(() => a.go(away.map(([x, z]) => [x + (Math.random() - 0.5) * 1.5, z + (Math.random() - 0.5) * 1.5]), 3.2, () => { a.visible = false; }), lag);
    lag += 900;
  }
  if (tariel) tariel.pose = 'idle';
  setObjective(OBJECTIVE);
  $('help').classList.remove('gone'); setTimeout(() => $('help').classList.add('gone'), 20000);
  hint('WASD to move · mouse to look · Shift to run · Space to jump · M for the map', 9000);
  setTimeout(() => { if (who === 'tariel') hint('Press Q to become Thiah Kirðotr - and Q again to be Tariel', 9000); }, 10000);
}
function setObjective(text) {
  $('objective').textContent = text;
  $('objective').classList.remove('gone');
}
let hintTimer = 0;
function hint(text, ms) {
  $('hint').textContent = text; $('hint').classList.remove('gone');
  clearTimeout(hintTimer); hintTimer = setTimeout(() => $('hint').classList.add('gone'), ms || 5000);
}
function banner(big, small) {
  $('bannerbig').textContent = big; $('bannersmall').textContent = small || '';
  const b = $('banner'); b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}

// ── where you are ─────────────────────────────────────────────────────────
function placeName(x, z) {
  const { s, n } = W.riverCoords(x, z), a = Math.abs(n);
  if (W.townWeight(s, a) > 0.15) return 'Stanlech';
  if (Math.hypot(x - W.PLACES.shappel[0], z - W.PLACES.shappel[1]) < 130) return "Shappel-ont'-Laik";
  if (Math.hypot(x - W.PLACES.hill[0], z - W.PLACES.hill[1]) < 190) return 'The hill above Stanlech';
  if (a < 40) return 'The banks of the Yolo';
  return 'The Yolo valley';
}

// ── input ─────────────────────────────────────────────────────────────────
const locked = () => document.pointerLockElement === canvas;
canvas.addEventListener('click', () => {
  if (mode === 'title' || paused) return;
  if (!locked() && $('map').classList.contains('gone')) canvas.requestPointerLock && canvas.requestPointerLock();
  if (mode === 'opening' && !waiting) next();
});
window.addEventListener('mousemove', (e) => {
  if (!locked()) return;
  if (paused) return;
  cam.yaw -= e.movementX * 0.0032 * SETTINGS.sens;
  cam.pitch = Math.max(-0.5, Math.min(1.25, cam.pitch + e.movementY * 0.0028 * SETTINGS.sens * (SETTINGS.invert ? -1 : 1)));
});
window.addEventListener('wheel', (e) => { cam.want = Math.max(2.2, Math.min(14, cam.want * (e.deltaY > 0 ? 1.12 : 0.9))); }, { passive: true });
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (!$('map').classList.contains('gone')) { toggleMap(); return; }
    if (mode !== 'title' && performance.now() - pausedAt > 400) pause(!paused);
    return;
  }
  if (paused) return;
  if (convo) {
    if (/^(Digit|Numpad)[1-9]$/.test(e.code)) talkKey(Number(e.code.slice(-1)) - 1);
    else if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); if (!convo.choices().length) talkKey('next'); }
    return;
  }
  if (e.code === 'KeyJ' && mode !== 'title') { pause(true); drawJournal(); $('pausepage').dataset.page = 'journal'; }
  if (e.code === 'KeyQ' && mode === 'free') become(who === 'tariel' ? 'thiah' : 'tariel');
  if ((e.code === 'KeyI' || e.code === 'Tab') && mode !== 'title') { e.preventDefault(); pause(true); drawGear(); $('pausepage').dataset.page = 'gear'; }
  if (e.code === 'KeyK' && mode !== 'title') { pause(true); drawCharacter(); $('pausepage').dataset.page = 'character'; }
  if (e.code === 'F3' || e.code === 'Backquote') { e.preventDefault(); SETTINGS.debug = !SETTINGS.debug; saveSettings(); applySettings(); }
  if (e.code === 'KeyE' && mode === 'free') act();
  if (e.code === 'KeyM' && mode !== 'title') toggleMap();
  if ((e.code === 'Enter' || e.code === 'KeyE' || e.code === 'Space') && mode === 'opening' && !waiting) { e.preventDefault(); next(); }
  if (e.code === 'KeyC') { walkToggle = !walkToggle; hint(walkToggle ? 'Walking' : 'Jogging', 1200); }
  if (e.code === 'KeyH' && mode !== 'title') $('help').classList.toggle('gone');
  if (e.code === 'Space') e.preventDefault();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());
let walkToggle = false;
function toggleMap() {
  const m = $('map');
  if (m.classList.contains('gone')) {
    m.classList.remove('gone');
    map.render($('mapcanvas'), walker.pos, walker.yaw);
    $('mapnote').textContent = 'Explored: ' + Math.round(map.fraction * 100) + '% of this ground. A Revealer could show you the rest.';
    if (locked()) { quietUnlock = true; document.exitPointerLock(); }
  } else { m.classList.add('gone'); if (canvas.requestPointerLock) canvas.requestPointerLock(); }
}
function readInput() {
  const k = (c) => keys.has(c);
  let mx = (k('KeyD') || k('ArrowRight') ? 1 : 0) - (k('KeyA') || k('ArrowLeft') ? 1 : 0);
  let mz = (k('KeyW') || k('ArrowUp') ? 1 : 0) - (k('KeyS') || k('ArrowDown') ? 1 : 0);
  // a gamepad, if there is one
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let sprint = k('ShiftLeft') || k('ShiftRight'), jump = k('Space');
  for (const p of pads) {
    if (!p) continue;
    const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
    mx += dz(p.axes[0]); mz -= dz(p.axes[1]);
    cam.yaw -= dz(p.axes[2] || 0) * 0.05; cam.pitch = Math.max(-0.5, Math.min(1.25, cam.pitch + dz(p.axes[3] || 0) * 0.04));
    if (p.buttons[0] && p.buttons[0].pressed) jump = true;
    if (p.buttons[10] && p.buttons[10].pressed) sprint = true;
    break;
  }
  return { moveX: mx, moveZ: mz, sprint, jump, walk: walkToggle || k('ControlLeft') };
}

// ── Tariel and Thiah ──────────────────────────────────────────────────────
function become(next) {
  if (!selves[next] || next === who || sleeping) return;
  const from = selves[who], to = selves[next];
  fade(0.35, () => {
    to.pos = walker.pos.slice(); to.yaw = walker.yaw; to.sync();
    from.visible = false; to.visible = true;
    tariel = to; who = next;
    $('who').textContent = who === 'thiah' ? 'as Thiah Kirðotr' : 'as Tariel Caulsleigh';
  });
  hint(next === 'thiah' ? 'Thiah Kirðotr: barefoot, in posh rags, a Kernish peasant. Nobody here knows Tariel.' : 'Tariel Caulsleigh, in uniform. Careful who sees her.', 4000);
}
let fadeT = 0;
function fade(hold, mid) {
  const f = $('fade'); f.classList.add('on');
  clearTimeout(fadeT);
  fadeT = setTimeout(() => { if (mid) mid(); setTimeout(() => f.classList.remove('on'), hold * 1000); }, 350);
}

// ── things to do where you stand: the tavern's bed ───────────────────────
let sleeping = false, offer = null;
function bedSpot() {
  const t = W.tavern(), bed = W.TAVERN_ROOM.find((f) => f.bed);
  const [x, z] = W.toWorld(t, bed.lx, bed.lz);
  return { x, z, y: t.y };
}
let offerDoor = null;
function nearby() {
  const b = bedSpot();
  const near = Math.hypot(walker.pos[0] - b.x, walker.pos[2] - b.z) < 2.3 && Math.abs(walker.pos[1] - b.y) < 1;
  offer = near ? 'sleep' : null;
  // the nearest door within reach, either side of it
  offerDoor = null;
  if (!offer) {
    let best = 1.9;
    for (const d of doors()) {
      const dist = Math.hypot(walker.pos[0] - d.x, walker.pos[2] - d.z);
      if (dist < best && Math.abs(walker.pos[1] - d.y) < 1.2) { best = dist; offerDoor = d; }
    }
    if (offerDoor) offer = 'door';
  }
  offerPerson = null;
  if (!offer && town) { offerPerson = town.nearest(walker.pos[0], walker.pos[2], 2.3); if (offerPerson) offer = 'talk'; }
  if (chat && (!chat.s.fig.visible || Math.hypot(chat.s.fig.pos[0] - walker.pos[0], chat.s.fig.pos[2] - walker.pos[2]) > 4)) endChat();
  $('prompt').classList.toggle('gone', !offer || paused);
  if (offer === 'sleep') $('prompt').innerHTML = '<kbd>E</kbd> Sleep until morning';
  else if (offer === 'talk') $('prompt').innerHTML = '<kbd>E</kbd> Talk to ' + offerPerson.p.who + ' (' + roleLabel(offerPerson.p) + ')';
  else if (offer === 'door') $('prompt').innerHTML = '<kbd>E</kbd> ' + (OPEN.has(offerDoor.id) ? 'Close' : 'Open') + ' the door' + (offerDoor.b.kind === 'tavern' ? ' (the tavern)' : '');
}
// ── events: things that happen on their own, whether or not she is there ───────────────────────────────────────
let brawl = null;
function events(dt) {
  if (!town || paused || sleeping || mode === 'title') return;
  const h = clock.hour;
  if (!brawl && clock.day === 1 && h >= 21.3 && h < 21.9 && !STORY.flags.brawl_done) {
    // the first night: two friends at the tavern fall on each other for no reason either can give
    const pair = town.inside(inTavern).filter((s) => s.p.role === 'villager' || s.p.role === 'stall');
    if (pair.length >= 2) {
      const [a, b] = pair; brawl = { a, b, t: 0 }; STORY.flags.brawl_done = true;
      const mx = (a.fig.pos[0] + b.fig.pos[0]) / 2, mz = (a.fig.pos[2] + b.fig.pos[2]) / 2, dx = b.fig.pos[0] - a.fig.pos[0], dz = b.fig.pos[2] - a.fig.pos[2], d = Math.hypot(dx, dz) || 1;
      const pa = [mx - (dx / d) * 0.45, mz - (dz / d) * 0.45], pb = [mx + (dx / d) * 0.45, mz + (dz / d) * 0.45];
      if (walkable(pa[0], pa[1]) && walkable(pb[0], pb[1])) { a.fig.place(pa[0], pa[1]); b.fig.place(pb[0], pb[1]); }
      town.hold(a, 'brawl', b.fig.pos); town.hold(b, 'brawl', a.fig.pos);
      if (inTavern(walker.pos[0], walker.pos[2])) { addNote(STORY, 'brawl_seen', 'I saw it start: two men who had been laughing together, and then nothing between the laughing and the fists.', clock.day); hint('Two men at the bar go for each other - a stool goes over, the harper stops mid-note.', 6000); }
      else hint('A shout and a crash from the tavern.', 4000);
    }
  } else if (brawl) {
    brawl.t += dt;
    if (brawl.t > 30 || h >= 21.95 || h < 21.2) {
      town.release(brawl.a); town.release(brawl.b); brawl = null;
      if (inTavern(walker.pos[0], walker.pos[2])) hint('It stops as quickly as it started. Neither man can say why.', 5000);
    } else { town.face(brawl.a, brawl.b.fig.pos); town.face(brawl.b, brawl.a.fig.pos); }
  }
}
// Elar, lodging at the tavern, speaks first the first time each of her faces comes near him
function elarNoticesHer() {
  if (!town || sleeping || paused) return;
  const flag = who === 'thiah' ? 'elar_thiah' : 'elar_tariel';
  if (STORY.flags[flag]) return;
  const s = town.people.find((q) => q.p.role === 'elar');
  if (s && s.fig.visible && Math.hypot(s.fig.pos[0] - walker.pos[0], s.fig.pos[2] - walker.pos[2]) < 3.0) startTalk(s);
}
function useDoor(d) {
  const open = !OPEN.has(d.id);
  if (!open) {
    // not shut on her: she must be clear of the doorway
    OPEN.delete(d.id);
    if (blocked(walker.pos[0], walker.pos[2], 0.3, walker.pos[1] + 0.3, walker.pos[1] + 1.7)) { OPEN.add(d.id); hint('Step out of the doorway first.', 2500); return; }
  } else OPEN.add(d.id);
  const v = DOORS.get(d.id); if (v) v.want = open ? 1 : 0;
}
const NIGHT = ['one', 'two', 'three'];
// ── conversation: what the story remembers, and talking (sim/dialogue.js, sim/story.js) ──
let STORY = newStory();
try { const raw = JSON.parse(localStorage.getItem('tariel.story.v1') || 'null'); if (raw && raw.flags && raw.notes) STORY = raw; } catch (e) { /* a fresh story */ }
function saveStory() { try { localStorage.setItem('tariel.story.v1', JSON.stringify(STORY)); } catch (e) { /* fine */ } }
let offerPerson = null, convo = null, chat = null;
function startTalk(s) {
  const ctx = { face: who, nights, day: clock.day, hour: clock.hour };
  const script = scriptFor(s.p, ctx, STORY);
  convo = new Convo(script, ctx, STORY, 'start'); chat = { s };
  town.face(s, walker.pos); keys.clear();
  for (const a of [s.fig]) if (!a.path) a.pose = 'talk';
  tariel.pose = 'idle';
  drawConvo();
}
function drawConvo() {
  if (!convo || convo.done || !convo.node) return endTalk();
  const v = convo.view(), who2 = v.who === chat.s.p.who || v.who === 'Elar' ? v.who : v.who;
  $('talk').classList.remove('gone');
  $('talkname').textContent = who2 + ' (' + roleLabel(chat.s.p) + ')';
  $('talklang').textContent = v.lang ? '[' + v.lang + ']' : '';
  $('talkline').textContent = v.line;
  const box = $('talkchoices'); box.innerHTML = '';
  v.choices.forEach((t, i) => { const d = document.createElement('div'); d.innerHTML = '<b>' + (i + 1) + '</b>'; d.append(t); d.onclick = () => talkKey(i); box.append(d); });
  $('talkmore').textContent = v.choices.length ? 'press 1-' + v.choices.length : 'E to go on';
}
function talkKey(i) {
  if (!convo) return;
  if (i === 'next') convo.next(); else if (!convo.pick(i)) return;
  if (convo.done) endTalk(); else drawConvo();
}
function endTalk() {
  if (chat && !chat.s.fig.path) chat.s.fig.pose = chat.s.p.pose || 'idle';
  convo = null; chat = null; $('talk').classList.add('gone'); $('talkchoices').innerHTML = ''; saveStory();
}
function endChat() { endTalk(); }
function act() {
  if (convo) return;
  if (offer === 'talk' && offerPerson) { startTalk(offerPerson); return; }
  if (offer === 'door' && offerDoor) { useDoor(offerDoor); return; }
  if (offer !== 'sleep' || sleeping) return;
  if (who === 'tariel') { hint("Tariel Caulsleigh can't be seen taking a bed here. Become Thiah first (Q).", 5000); return; }
  const h = clock.hour;
  if (h >= 6 && h < 18) { hint('The tavern lets its beds by the night. Come back in the evening.', 4500); return; }
  sleeping = true;
  $('fade').classList.add('on', 'long');
  setTimeout(() => {
    if (clock.hour >= 18) clock.day++;
    clock.hour = 7;
    if (town) town.snap(clock.hour, Math.min(2, nights));
    nights++;
    setTimeout(() => {
      $('fade').classList.remove('on'); setTimeout(() => $('fade').classList.remove('long'), 1500);
      sleeping = false;
      if (nights >= 3) {
        banner('The Trenite is done', 'Three nights in Stanlech');
        setObjective('The Trenite is complete. (Chapter One goes on in later builds.)');
      } else {
        banner('Morning', 'Night ' + NIGHT[nights - 1] + ' of the Trenite is behind you');
        setObjective('Day ' + NIGHT[nights] + ' of the Trenite: Stanlech is yours to learn. Sleep at the tavern again tonight.');
      }
    }, 1400);
  }, 1300);
}

// ── her traits and her bag ────────────────────────────────────────────────
let character = CH.newCharacter();
try { character = CH.load(localStorage.getItem('tariel.character')); } catch (e) { /* a fresh one */ }
function drawJournal() {
  const j = $('journal'); j.innerHTML = '';
  if (!STORY.notes.length) { j.innerHTML = '<div class="note">Nothing yet. Talk to people; what matters is written here.</div>'; return; }
  for (const n of STORY.notes) { const d = document.createElement('div'); d.className = 'note'; d.textContent = 'Day ' + n.day + ' - ' + n.text; j.append(d); }
}
function applyTraits() {
  if (walker) walker.mods = CH.effects(character);
  try { localStorage.setItem('tariel.character', CH.save(character)); } catch (e) { /* fine */ }
}
function drawCharacter() {
  $('pts').textContent = character.points;
  $('traits').innerHTML = CH.TRAITS.map((t) => `<div class="trait"><div><b>${t.name}</b> <span class="pips">${'●'.repeat(character.traits[t.id])}${'○'.repeat(CH.TRAIT_MAX - character.traits[t.id])}</span><div class="about">${t.about}</div></div>` +
    `<div><button data-t="${t.id}" data-a="-1">−</button><button data-t="${t.id}" data-a="1">+</button></div></div>`).join('');
  for (const b of $('traits').querySelectorAll('button')) b.onclick = () => { if (CH.spend(character, b.dataset.t, +b.dataset.a)) { applyTraits(); drawCharacter(); } };
}
function drawGear() {
  const worn = character.worn[who];
  $('gearwho').textContent = who === 'thiah' ? 'Thiah Kirðotr wears' : 'Tariel Caulsleigh wears';
  $('slots').innerHTML = Object.entries(worn).map(([slot, item]) => `<tr><td>${slot}</td><td>${item || '<span class="empty">-</span>'}</td></tr>`).join('');
  $('bag').innerHTML = character.bag.map((it) => `<tr><td>${it.name}${it.qty > 1 ? ' × ' + it.qty : ''}</td><td class="about">${it.about}</td></tr>`).join('');
}

// ── the pause menu (Esc) ──────────────────────────────────────────────────
const SETTINGS = { sens: 1, invert: false, shadows: true, res: 'normal', debug: true };
try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem('tariel.settings') || '{}')); } catch (e) { /* none saved */ }
function saveSettings() { try { localStorage.setItem('tariel.settings', JSON.stringify(SETTINGS)); } catch (e) { /* fine */ } }
function applySettings() {
  light.light.castShadows = SETTINGS.shadows && !TEST;
  app.graphicsDevice.maxPixelRatio = TEST ? 0.5 : { low: 0.75, normal: Math.min(window.devicePixelRatio || 1, 1.25), high: Math.min(window.devicePixelRatio || 1, 2) }[SETTINGS.res] || 1;
  app.resizeCanvas();
  $('set-sens').value = SETTINGS.sens; $('set-invert').checked = SETTINGS.invert; $('set-shadows').checked = SETTINGS.shadows; $('set-res').value = SETTINGS.res; $('set-debug').checked = SETTINGS.debug;
}
let quietUnlock = false;     // pointer let go on purpose (the map), not a pause
function pause(on) {
  if (mode === 'title') return;
  paused = on;
  $('pause').classList.toggle('gone', !on);
  if (on) { $('pausepage').dataset.page = 'main'; if (locked()) { quietUnlock = true; document.exitPointerLock(); } }
  else if (canvas.requestPointerLock) canvas.requestPointerLock();
}
document.addEventListener('pointerlockchange', () => {
  if (locked()) return;
  if (quietUnlock) { quietUnlock = false; return; }
  if (mode !== 'title' && $('map').classList.contains('gone') && !paused) { pause(true); pausedAt = performance.now(); }
});
let pausedAt = 0;
function pauseWiring() {
  $('p-resume').onclick = () => pause(false);
  $('p-journal').onclick = () => { drawJournal(); $('pausepage').dataset.page = 'journal'; };
  $('p-controls').onclick = () => { $('pausepage').dataset.page = 'controls'; };
  $('p-gear').onclick = () => { drawGear(); $('pausepage').dataset.page = 'gear'; };
  $('p-character').onclick = () => { drawCharacter(); $('pausepage').dataset.page = 'character'; };
  $('set-debug').onchange = (e) => { SETTINGS.debug = e.target.checked; saveSettings(); };
  $('p-settings').onclick = () => { $('pausepage').dataset.page = 'settings'; };
  for (const b of document.querySelectorAll('.p-back')) b.onclick = () => { $('pausepage').dataset.page = 'main'; };
  $('p-restart').onclick = () => location.reload();
  $('set-sens').oninput = (e) => { SETTINGS.sens = +e.target.value; saveSettings(); };
  $('set-invert').onchange = (e) => { SETTINGS.invert = e.target.checked; saveSettings(); };
  $('set-shadows').onchange = (e) => { SETTINGS.shadows = e.target.checked; saveSettings(); applySettings(); };
  $('set-res').onchange = (e) => { SETTINGS.res = e.target.value; saveSettings(); applySettings(); };
}

// ── the debug line (F3 or the backquote key; also in Settings) ───────────────
let dbgT = 0, dbgFrames = 0, dbgMs = 0;
const dbgClock = { last: performance.now() };
function debugLine(dt) {
  const el = $('debug');
  if (!SETTINGS.debug || mode === 'title') { el.classList.add('gone'); return; }
  const now = performance.now(); dbgMs += now - dbgClock.last; dbgClock.last = now; dbgFrames++;
  dbgT -= dt; if (dbgT > 0 && !paused) return; dbgT = 0.5;
  const fps = dbgFrames / Math.max(0.001, dbgMs / 1000); dbgFrames = 0; dbgMs = 0;
  const p = walker.pos, rc = W.riverCoords(p[0], p[2]), st = app.stats;
  el.classList.remove('gone');
  el.textContent = `${VERSION} | ${fps.toFixed(0)} fps | ${st.drawCalls ? st.drawCalls.total : '?'} draws | pos ${p[0].toFixed(1)}, ${p[1].toFixed(1)}, ${p[2].toFixed(1)} | river s ${rc.s.toFixed(0)} n ${rc.n.toFixed(0)} | ${walker.side()} | ${who} | ${walker.gait} ${walker.speed.toFixed(1)} m/s | stamina ${Math.round(walker.stamina)}/${Math.round(walker.staminaMax)} | day ${clock.day} ${clock.hour.toFixed(2)} h | nights ${nights} | folk ${town ? town.summary() : '-'} | ${mode}${paused ? ' (paused)' : ''}`;
}

// ── every frame ───────────────────────────────────────────────────────────
let seenT = 0, lastPlace = '', hudT = 0;
const v3 = new pc.Vec3();
app.on('update', (dt) => {
  if (!walker) return;
  dt = Math.min(dt, 0.05);
  if (paused) dt = 0;                                   // the world holds still behind the pause menu
  // time: hold T to hurry the day along
  clock.scale = keys.has('KeyT') ? 60 : 1;
  if (mode !== 'title' && !sleeping) clock.step(dt);
  // Tariel
  if (mode === 'free' && !paused && !sleeping && !convo && $('map').classList.contains('gone')) {
    walker.step(dt, readInput(), cam.yaw);
    walker.events.length = 0;
  }
  if (tariel) {
    tariel.pos = walker.pos.slice(); tariel.yaw = walker.yaw;
    if (mode === 'free') {
      const g = walker.gait, sp = walker.speed;
      if (g === 'air') tariel.play('air');
      else if (g === 'idle') tariel.play('idle');
      else if (g === 'walk') tariel.play('walk', Math.max(0.6, sp / 1.6));
      else if (g === 'jog') tariel.play('jog', Math.max(0.7, sp / 4.6));
      else tariel.play('sprint', sp / 7);
      tariel.animate(dt);
    } else tariel.update(dt);
  }
  if (horse && horse.visible) horse.update(dt);
  for (const k in cast) if (cast[k].visible) cast[k].update(dt);
  if (town) { if (clock.scale > 1) town.snap(clock.hour, Math.min(2, nights)); else town.update(dt, clock.hour, Math.min(2, nights)); }   // hurried time: they keep up by jumping
  events(dt);
  if (mode === 'free' && !convo) { nearby(); elarNoticesHer(); }
  updateDoors(dt);
  debugLine(dt);
  // the camera, behind and above her; never under the ground
  cam.dist += (cam.want - cam.dist) * Math.min(1, dt * 6);
  const tx = walker.pos[0], ty = walker.pos[1] + 1.55, tz = walker.pos[2];
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  let cx = tx + Math.sin(cam.yaw) * cp * cam.dist, cy = ty + sp * cam.dist, cz = tz + Math.cos(cam.yaw) * cp * cam.dist;
  // walls, ceilings and trunks: the camera comes in front of them rather than through (at once in, gently out)
  const free = clearTo([tx, ty, tz], [cx, cy, cz], 0.22);
  cam.reach = free < (cam.reach === undefined ? 1 : cam.reach) ? free : Math.min(free, (cam.reach === undefined ? 1 : cam.reach) + dt * 1.5);
  cx = tx + (cx - tx) * cam.reach; cy = ty + (cy - ty) * cam.reach; cz = tz + (cz - tz) * cam.reach;
  // squeezed right up to her (a small room, a corner): look from her eyes, and don't draw her head from inside
  const close = mode === 'free' && cam.reach * cam.dist < 0.95;
  if (tariel && tariel.body.enabled === close) tariel.body.enabled = !close;
  const floor = groundAt(cx, cz) + 0.45;
  if (cy < floor) cy = floor;
  if (mode !== 'free' && opening.from) {
    // the opening: over their shoulders, looking down on Stanlech
    const [fx, fz] = opening.from, [lx, lz] = opening.look;
    camera.setPosition(fx, groundAt(fx, fz) + 3.4, fz);
    camera.lookAt(v3.set(lx, W.heightAt(lx, lz) + 4, lz));
  } else {
    camera.setPosition(cx, cy, cz);
    camera.lookAt(v3.set(tx, ty, tz));
  }
  // the sky, the light, the mist
  const s = skyAt(clock.hour);
  sky.update(s, camera.getPosition());
  const sunUp = s.sun[1] > -0.02, dir = sunUp ? s.sun : s.moon;
  light.lookAt(v3.set(-dir[0], -dir[1], -dir[2]));
  light.light.color = sunUp ? new pc.Color(s.sunCol[0], s.sunCol[1], s.sunCol[2]) : new pc.Color(0.55, 0.62, 0.8);
  light.light.intensity = sunUp ? s.sunI * Math.min(1, s.sun[1] * 6 + 0.15) : s.moonI * 1.6;
  app.scene.ambientLight = new pc.Color(s.ambient[0], s.ambient[1], s.ambient[2]);
  if (lampsRig) lampsRig.update(1 - Math.min(1, s.d * 2.2));
  if (tavernLight) tavernLight.light.intensity = 0.6 + 2.2 * (1 - s.d);
  const fc = [s.horizon[0] * 0.6 + s.zenith[0] * 0.15 + 0.25 * s.d, s.horizon[1] * 0.6 + s.zenith[1] * 0.15 + 0.25 * s.d, s.horizon[2] * 0.6 + s.zenith[2] * 0.15 + 0.26 * s.d];
  app.scene.fog.color = new pc.Color(fc[0], fc[1], fc[2]);
  app.scene.fog.density = 0.00045 + s.mist * 0.0042;
  camera.camera.clearColor = new pc.Color(s.horizon[0], s.horizon[1], s.horizon[2]);
  // the map fills in as she walks; the place, the side, the time
  seenT -= dt;
  if (seenT <= 0) { seenT = 0.4; map.see(walker.pos[0], walker.pos[2]); if (!$('map').classList.contains('gone')) map.render($('mapcanvas'), walker.pos, walker.yaw); }
  hudT -= dt;
  if (hudT <= 0) {
    hudT = 0.25;
    const place = placeName(walker.pos[0], walker.pos[2]);
    if (place !== lastPlace && mode === 'free') {
      if (lastPlace) banner(place, place === 'Stanlech' ? 'A town on two banks of the Yolo' : '');
      lastPlace = place;
    }
    if (!lastPlace) lastPlace = place;
    $('place').textContent = place;
    $('side').textContent = walker.side();
    $('side').className = walker.side() === 'Cawel' ? 'cawel' : 'szetter';
    const t = clock.text();
    $('clock').textContent = t.part + ' of the ' + t.day + ' day · ' + t.time;
    $('stamina').style.width = (100 * walker.stamina / walker.staminaMax) + '%';
    $('staminabox').classList.toggle('gone', walker.stamina > walker.staminaMax - 0.5);
    if (!arrived && mode === 'free' && place === 'Stanlech') {
      arrived = true;
      setObjective('Night one of the Trenite: find somewhere to sleep in Stanlech');
      hint('You have reached Stanlech. The tavern stands by the bridge, on the Cawel side; it lets a bed by the night.', 9000);
    }
  }
});

// ── the start ─────────────────────────────────────────────────────────────
$('ver').textContent = VERSION;
pauseWiring(); applySettings();
(async () => {
  await makeWorld();
  setUpOpening();
  $('loading').classList.add('gone');
  $('begin').disabled = false;
  $('begin').textContent = 'Begin';
  $('begin').addEventListener('click', () => {
    if (canvas.requestPointerLock) canvas.requestPointerLock();
    startOpening();
  });
  $('skip').addEventListener('click', () => { startOpening(); step = SCRIPT.length - 2; waiting = false; next(); });
})();

// for testing, and for curiosity
window.TARIEL = { get horse() { return horse; }, get paused() { return paused; }, selves, camera, opening, skip: () => { startOpening(); step = SCRIPT.length - 2; waiting = false; next(); }, app, pc, W, get walker() { return walker; }, clock, map, cam, cast, get tariel() { return tariel; }, get mode() { return mode; }, get town() { return town; }, get convo() { return convo; }, get STORY() { return STORY; }, Figure, THIAH, TARIEL, next, VERSION };
