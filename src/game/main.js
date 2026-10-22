// TARIEL CAULSLEIGH - Chapter One: the Trenite at Stanlech.
// T0.1: the hill above Stanlech and the Yolo valley; Tariel on foot; day and night; the opening; the map.

import * as pc from 'playcanvas';
import * as W from '../world/world.js';
import { Walker, groundAt } from '../sim/walker.js';
import { Clock, skyAt } from '../sim/sky.js';
import { buildGround, buildRiver, buildTrees, buildTowns, buildSky } from './scene.js';
import { loadBody, Actor } from './actor.js';
import { CAST, SCRIPT, OBJECTIVE, LANG } from './opening.js';
import { RegionMap } from './map.js';

const VERSION = 'T0.1';
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
let walker = null, tariel = null, sky = null, river = null;
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
  sky = buildSky(pc, app);
  say('Waking the people…'); await frame();
  const bodies = await Promise.all(['tariel', 'caulsleigh', 'siofel', 'rider'].map((k) => loadBody(pc, app, CAST[k].model).catch(() => null)));
  const HEIGHT = { tariel: 1.70, caulsleigh: 1.84, siofel: 1.80, rider: 1.76 };
  ['tariel', 'caulsleigh', 'siofel', 'rider'].forEach((k, i) => {
    if (!bodies[i]) return;
    const a = new Actor(pc, app, bodies[i], { name: CAST[k].name, height: HEIGHT[k] });
    if (k === 'tariel') tariel = a; else cast[k] = a;
  });
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
  opening.from = at(46, 2.2); opening.look = [top[0] + dx * 0.6, top[1] + dz * 0.6];
  if (tariel) tariel.place(walker.pos[0], walker.pos[2], yaw);
  if (cast.caulsleigh) { cast.caulsleigh.place(...at(52.6, -1.6), yaw); cast.caulsleigh.pose = 'arms'; }
  if (cast.siofel) cast.siofel.place(...at(51.4, 1.7), yaw);
  if (cast.rider) { cast.rider.place(...W.fromRiver(-70, -330)); cast.rider.visible = false; }
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
  const meet = [(cast.caulsleigh.pos[0] + walker.pos[0]) / 2, (cast.caulsleigh.pos[2] + walker.pos[2]) / 2];
  const dx = r.pos[0] - meet[0], dz = r.pos[2] - meet[1], d = Math.hypot(dx, dz);
  r.go([W.fromRiver(-95, -390), [meet[0] + dx / d * 3.2, meet[1] + dz / d * 3.2]], 4.6, () => {
    waiting = false; r.pose = 'idle'; r.face(cast.caulsleigh.pos[0], cast.caulsleigh.pos[2]);
    for (const a of [cast.caulsleigh, cast.siofel, tariel]) if (a) a.face(r.pos[0], r.pos[2]);
    next();
  });
  // everyone turns at the sound of the horse... of the running feet (no horses in T0.1)
  setTimeout(() => { for (const a of [cast.caulsleigh, cast.siofel, tariel]) if (a) a.face(r.pos[0], r.pos[2]); if (tariel) walker.yaw = tariel.yaw; }, 1200);
}
function endOpening() {
  $('talk').classList.add('gone');
  mode = 'free';
  // Caulsleigh, Síofel and the rider go down the hill path and away west, on the Mahlterngen road
  const away = [W.fromRiver(-100, -360), W.fromRiver(-50, -300), W.fromRiver(0, -245), [-380, W.fromRiver(0, -230)[1] + 40], [-700, W.fromRiver(0, -230)[1]]];
  let lag = 0;
  for (const k of ['rider', 'caulsleigh', 'siofel']) {
    const a = cast[k]; if (!a) continue;
    a.pose = 'idle';
    setTimeout(() => a.go(away.map(([x, z]) => [x + (Math.random() - 0.5) * 1.5, z + (Math.random() - 0.5) * 1.5]), 3.2, () => { a.visible = false; }), lag);
    lag += 900;
  }
  if (tariel) tariel.pose = 'idle';
  setObjective(OBJECTIVE);
  $('help').classList.remove('gone'); setTimeout(() => $('help').classList.add('gone'), 20000);
  hint('WASD to move · mouse to look · Shift to run · Space to jump · M for the map', 9000);
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
  if (mode === 'title') return;
  if (!locked() && $('map').classList.contains('gone')) canvas.requestPointerLock && canvas.requestPointerLock();
  if (mode === 'opening' && !waiting) next();
});
window.addEventListener('mousemove', (e) => {
  if (!locked()) return;
  cam.yaw -= e.movementX * 0.0032;
  cam.pitch = Math.max(-0.5, Math.min(1.25, cam.pitch + e.movementY * 0.0028));
});
window.addEventListener('wheel', (e) => { cam.want = Math.max(2.2, Math.min(14, cam.want * (e.deltaY > 0 ? 1.12 : 0.9))); }, { passive: true });
window.addEventListener('keydown', (e) => {
  keys.add(e.code);
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
    if (locked()) document.exitPointerLock();
  } else m.classList.add('gone');
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

// ── every frame ───────────────────────────────────────────────────────────
let seenT = 0, lastPlace = '', hudT = 0;
const v3 = new pc.Vec3();
app.on('update', (dt) => {
  if (!walker) return;
  dt = Math.min(dt, 0.05);
  // time: hold T to hurry the day along
  clock.scale = keys.has('KeyT') ? 60 : 1;
  if (mode !== 'title') clock.step(dt);
  // Tariel
  if (mode === 'free' && $('map').classList.contains('gone')) {
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
      tariel.sync();
    } else tariel.update(dt);
  }
  for (const k in cast) if (cast[k].visible) cast[k].update(dt);
  // the camera, behind and above her; never under the ground
  cam.dist += (cam.want - cam.dist) * Math.min(1, dt * 6);
  const tx = walker.pos[0], ty = walker.pos[1] + 1.55, tz = walker.pos[2];
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  let cx = tx + Math.sin(cam.yaw) * cp * cam.dist, cy = ty + sp * cam.dist, cz = tz + Math.cos(cam.yaw) * cp * cam.dist;
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
    $('stamina').style.width = walker.stamina + '%';
    $('staminabox').classList.toggle('gone', walker.stamina > 99.5);
    if (!arrived && mode === 'free' && place === 'Stanlech') {
      arrived = true;
      setObjective('Night one of the Trenite: find somewhere to sleep in Stanlech');
      hint('You have reached Stanlech. In T0.2 the town comes to life: people, the tavern, the market.', 9000);
    }
  }
});

// ── the start ─────────────────────────────────────────────────────────────
$('ver').textContent = VERSION;
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
window.TARIEL = { camera, opening, skip: () => { startOpening(); step = SCRIPT.length - 2; waiting = false; next(); }, app, pc, W, get walker() { return walker; }, clock, map, cam, cast, get tariel() { return tariel; }, get mode() { return mode; }, next, VERSION };
