// TARIEL CAULSLEIGH - a person drawn entirely in code: smooth, rounded, painted forms (anatomy.js) on nine joints - body, two
// arms with elbows, two legs with knees - swung by sim/gait.js. No asset packs: this is Rhys's own.
// A figure faces -z at yaw 0 (north), like the walker. The shapes are in anatomy.js.

import { vcMaterial } from './geo.js';
import { buildParts, HIP, ARM_X, SHOULDER, UPPER_ARM, THIGH } from './anatomy.js';
import { groundAt } from '../sim/walker.js';
import { gaitAngles, STRIDE } from '../sim/gait.js';

const SKIN = [[0.93, 0.78, 0.64], [0.86, 0.66, 0.50], [0.72, 0.52, 0.38], [0.55, 0.38, 0.27], [0.96, 0.82, 0.70]];
const HAIR = [[0.14, 0.10, 0.07], [0.30, 0.20, 0.12], [0.50, 0.34, 0.18], [0.72, 0.58, 0.30], [0.62, 0.62, 0.60], [0.40, 0.18, 0.10]];
const TROUSERS = [[0.34, 0.27, 0.20], [0.28, 0.28, 0.30], [0.25, 0.30, 0.24], [0.40, 0.33, 0.25]];
const EYES = [[0.30, 0.50, 0.30], [0.35, 0.25, 0.14], [0.30, 0.42, 0.60], [0.40, 0.32, 0.18]];
const dark = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const frac = (x) => x - Math.floor(x);

// Thiah, drawn from Rhys's HeroForge reference: a short young woman, golden hair in a side-swept fringe and a long plait,
// green eyes, a laced red bodice with puffed off-the-shoulder sleeves, a draped overskirt, bare feet
export const THIAH = { id: 90, role: 'thiah', name: 'Thiah', height: 1.52, tint: [0.50, 0.13, 0.11], seed: 0.9 };

// Tariel, drawn from Rhys's HeroForge reference: a laurel wreath, shoulder-length golden waves, a quilted shoulder mantle,
// a long olive coat trimmed in red, crossed straps, a lime sash with a tassel, a pleated kilt, tall boots, studded gloves
export const TARIEL = { id: 91, role: 'tariel', name: 'Tariel', height: 1.62, tint: [0.19, 0.26, 0.16], seed: 0.3 };

// what someone looks like, from who they are (deterministic: the same person is always the same person)
export function lookOf(p) {
  const h = (n) => frac(Math.sin((p.id + 1) * 12.9898 + n * 78.233) * 43758.5453);
  const pick = (a, n) => a[Math.floor(h(n) * a.length)];
  const female = p.role === 'thiah' ? true : p.role === 'tariel' ? false : p.role === 'keeper' ? false : p.role === 'guard' ? p.id % 2 === 0 : h(6) < 0.55;
  const L = {
    skin: pick(SKIN, 1), hair: pick(HAIR, 2), eyes: pick(EYES, 7), style: female ? (h(3) < 0.5 ? 'braid' : 'long') : (h(3) < 0.5 ? 'short' : 'cap'),
    tunic: p.tint, trousers: pick(TROUSERS, 4), bootCol: [0.20, 0.14, 0.10], extra: null, height: p.height, female, dress: female,
    belt: [0.22, 0.17, 0.13], lips: [0.80, 0.46, 0.44], laces: female, puff: female, longSleeve: !female, boots: false, barefoot: false,
  };
  L.cap = dark(L.tunic, 0.9); L.sleeve = L.tunic; L.skirt = dark(L.tunic, 0.92); L.over = female && h(8) < 0.6 ? dark(L.tunic, 1.12) : null;
  L.width = female ? 0.96 + 0.06 * h(5) : 1.0 + 0.1 * h(5);
  if (p.role === 'thiah') {
    Object.assign(L, { skin: [0.97, 0.80, 0.70], hair: [0.92, 0.82, 0.30], eyes: [0.30, 0.62, 0.34], style: 'braid', tunic: [0.50, 0.13, 0.11],
      skirt: [0.42, 0.10, 0.09], over: [0.53, 0.14, 0.11], sleeve: [0.52, 0.14, 0.11], belt: [0.27, 0.22, 0.19], barefoot: true, laces: true, puff: true, width: 1.0 });
  }
  if (p.role === 'tariel') {
    Object.assign(L, { skin: [0.97, 0.80, 0.70], hair: [0.94, 0.86, 0.30], eyes: [0.28, 0.62, 0.40], style: 'wavy', wreath: true, kit: 'tariel', m: 0.97, width: 0.96,
      tunic: [0.17, 0.23, 0.15], sleeve: [0.19, 0.26, 0.16], skirt: [0.17, 0.15, 0.13], coat: [0.50, 0.53, 0.20], glove: [0.26, 0.19, 0.15], trousers: [0.14, 0.15, 0.12],
      bootCol: [0.16, 0.21, 0.15], shoe: [0.60, 0.66, 0.20], tall: true, belt: [0.24, 0.22, 0.20], dress: false, puff: false, laces: false, longSleeve: true, boots: true, over: null });
  }
  if (p.role === 'guard') { L.extra = 'guard'; L.style = 'helmet'; L.tunic = [0.40, 0.14, 0.12]; L.sleeve = L.tunic; L.skirt = L.tunic; L.dress = false; L.puff = false; L.laces = false; L.longSleeve = true; L.boots = true; L.over = null; }
  else if (p.role === 'keeper') { L.extra = 'apron'; L.style = 'bald'; L.hair = [0.62, 0.62, 0.60]; L.width = 1.12; L.dress = false; L.puff = false; L.laces = false; L.longSleeve = true; L.boots = true; }
  else if (p.role === 'stall') { L.extra = 'hat'; }
  if (!L.dress) { L.skirt = L.tunic; L.boots = true; L.longSleeve = !L.puff; }
  if (L.female && p.role !== 'thiah' && p.role !== 'guard') { L.boots = false; L.barefoot = h(9) < 0.5; }
  return L;
}

let MATERIAL = null;
const material = (pc) => {
  if (MATERIAL) return MATERIAL;
  MATERIAL = vcMaterial(pc, { cull: false, gloss: 0.1 });
  MATERIAL.ambient = new pc.Color(1.5, 1.5, 1.5);       // a little fill, so people are never black cut-outs against the sky
  MATERIAL.update();
  return MATERIAL;
};

export class Figure {
  // p: a person from sim/townsfolk.js
  constructor(pc, app, p) {
    this.pc = pc; this.name = p.name + ' ' + p.id;
    const L = lookOf(p), parts = buildParts(pc, app.graphicsDevice, L), mat = material(pc);
    const part = (name, mesh, parent) => {
      const e = new pc.Entity(name);
      e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)], castShadows: true, receiveShadows: true });
      parent.addChild(e); return e;
    };
    const joint = (name, x, y, parent) => { const e = new pc.Entity(name); e.setLocalPosition(x, y, 0); parent.addChild(e); return e; };
    this.root = new pc.Entity(this.name);
    app.root.addChild(this.root);
    // the figure is built 1.75 m tall; scaled to this person's height and build
    const s = L.height / 1.75;
    this.root.setLocalScale(s * L.width, s, s * L.width);
    this.upper = joint('upper', 0, HIP, this.root);
    part('body', parts.body, this.upper);
    this.armL = joint('armL', -ARM_X, SHOULDER - HIP, this.upper); part('arm', parts.armL, this.armL);
    this.armR = joint('armR', ARM_X, SHOULDER - HIP, this.upper); part('arm', parts.armR, this.armR);
    this.foreL = joint('foreL', 0, -UPPER_ARM, this.armL); part('fore', parts.foreL, this.foreL);
    this.foreR = joint('foreR', 0, -UPPER_ARM, this.armR); part('fore', parts.foreR, this.foreR);
    this.legL = joint('legL', -0.095, HIP, this.root); part('leg', parts.legL, this.legL);
    this.legR = joint('legR', 0.095, HIP, this.root); part('leg', parts.legR, this.legR);
    this.shinL = joint('shinL', 0, -THIGH, this.legL); part('shin', parts.shinL, this.shinL);
    this.shinR = joint('shinR', 0, -THIGH, this.legR); part('shin', parts.shinR, this.shinR);
    this.stride = L.dress ? 0.55 : L.kit ? 0.75 : 1;                                   // a long skirt keeps the steps short
    this.pos = [0, 0, 0]; this.yaw = 0; this.wantYaw = 0; this.path = null; this.speed = 0; this.pose = 'idle';
    this.phase = p.seed * 6; this.t = p.seed * 50; this.onArrive = null; this.moving = 0;
    this.ang = gaitAngles('idle', 0, 0, 0);
    this.spear = L.extra === 'guard';
  }
  place(x, z, yaw) { this.pos = [x, groundAt(x, z), z]; this.path = null; this.moving = 0; if (yaw !== undefined) this.yaw = this.wantYaw = yaw; this.sync(); }
  face(x, z) { this.wantYaw = Math.atan2(-(x - this.pos[0]), -(z - this.pos[2])); }
  // walk a list of [x, z] points at a pace (m/s); done() when there
  go(points, pace, done) { this.path = points.slice(); this.speed = pace || 1.5; this.onArrive = done || null; }
  update(dt) {
    this.t += dt;
    let v = 0;
    if (this.path && this.path.length) {
      const [tx, tz] = this.path[0], dx = tx - this.pos[0], dz = tz - this.pos[2], d = Math.hypot(dx, dz);
      if (d < 0.3) { this.path.shift(); if (!this.path.length) { this.path = null; const f = this.onArrive; this.onArrive = null; if (f) f(); } }
      else {
        const step = Math.min(d, this.speed * dt);
        this.pos[0] += (dx / d) * step; this.pos[2] += (dz / d) * step; this.pos[1] = groundAt(this.pos[0], this.pos[2]);
        this.wantYaw = Math.atan2(-dx, -dz);
        v = this.speed;
      }
    }
    // turn towards where they face or go
    let a = this.wantYaw - this.yaw;
    while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2;
    this.yaw += a * Math.min(1, dt * (v ? 9 : 5));
    this.moving += (v - this.moving) * Math.min(1, dt * 8);
    this.phase += dt * this.moving / STRIDE;
    this.pose2(gaitAngles(this.pose, this.phase, this.moving, this.t), dt);
    this.sync();
  }
  // ease the limbs towards their angles, then set them
  pose2(g, dt) {
    const k = Math.min(1, dt * 12), c = this.ang;
    for (const key in g) c[key] += (g[key] - c[key]) * k;
    const keep = this.spear ? 0.25 : 1, st = this.stride;                 // a guard keeps hold of his spear
    this.legL.setLocalEulerAngles(c.legL * st, 0, 0);
    this.legR.setLocalEulerAngles(c.legR * st, 0, 0);
    this.shinL.setLocalEulerAngles(c.shinL * st, 0, 0);
    this.shinR.setLocalEulerAngles(c.shinR * st, 0, 0);
    this.armL.setLocalEulerAngles(c.armLx, 0, c.armLz);
    this.armR.setLocalEulerAngles(c.armRx * keep, 0, c.armRz * keep);
    this.foreL.setLocalEulerAngles(c.foreL, 0, 0);
    this.foreR.setLocalEulerAngles(c.foreR * keep, 0, 0);
    this.upper.setLocalPosition(0, HIP + c.bob, 0);
    this.upper.setLocalEulerAngles(c.lean, c.sway, 0);
  }
  sync() {
    this.root.setPosition(this.pos[0], this.pos[1], this.pos[2]);
    this.root.setEulerAngles(0, this.yaw * 57.29578, 0);                  // the body faces -z at yaw 0
  }
  set visible(v) { this.root.enabled = v; }
  get visible() { return this.root.enabled; }
}
