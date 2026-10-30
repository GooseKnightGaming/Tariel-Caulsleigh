// TARIEL CAULSLEIGH - a person drawn entirely in code: a painted low-poly body (the same Geo shapes and vertex colours
// as the houses), five parts - body, two arms, two legs - swung by sim/gait.js. No asset packs: this is Rhys's own.
// A figure faces -z at yaw 0 (north), like the walker.

import { Geo, vcMaterial } from './geo.js';
import { groundAt } from '../sim/walker.js';
import { gaitAngles, STRIDE } from '../sim/gait.js';

const SKIN = [[0.93, 0.78, 0.64], [0.86, 0.66, 0.50], [0.72, 0.52, 0.38], [0.55, 0.38, 0.27], [0.96, 0.82, 0.70]];
const HAIR = [[0.14, 0.10, 0.07], [0.30, 0.20, 0.12], [0.50, 0.34, 0.18], [0.72, 0.58, 0.30], [0.62, 0.62, 0.60], [0.40, 0.18, 0.10]];
const TROUSERS = [[0.34, 0.27, 0.20], [0.28, 0.28, 0.30], [0.25, 0.30, 0.24], [0.40, 0.33, 0.25]];
const STYLES = ['short', 'long', 'short', 'cap'];
const HIP = 0.88;                                   // the hips' height above the feet
const dark = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const frac = (x) => x - Math.floor(x);

// what someone looks like, from who they are (deterministic: the same person is always the same person)
export function lookOf(p) {
  const h = (n) => frac(Math.sin((p.id + 1) * 12.9898 + n * 78.233) * 43758.5453);
  const pick = (a, n) => a[Math.floor(h(n) * a.length)];
  const L = {
    skin: pick(SKIN, 1), hair: pick(HAIR, 2), style: pick(STYLES, 3), tunic: p.tint, trousers: pick(TROUSERS, 4),
    boots: [0.20, 0.14, 0.10], extra: null, seed: p.id * 7.3, height: p.height, width: 0.94 + 0.12 * h(5),
  };
  if (p.role === 'guard') { L.extra = 'guard'; L.style = 'helmet'; }
  else if (p.role === 'keeper') { L.extra = 'apron'; L.style = 'bald'; L.hair = [0.62, 0.62, 0.60]; L.width = 1.12; }
  else if (p.role === 'stall') { L.extra = 'hat'; }
  return L;
}

// the painted parts, in local metres (feet at y = 0; the body's geometry is hung from the hips)
function buildParts(pc, device, L) {
  const sk = L.skin, skd = dark(L.skin, 0.82), tun = L.tunic, tund = dark(L.tunic, 0.78), trs = L.trousers;
  // body: skirt of the tunic, torso, belt, neck, head, hair, and the extras
  const b = new Geo().at(0, -HIP, 0, 0);
  b.cyl(0.215, 0.175, 0.62, 0.90, 8, tund);
  b.cyl(0.175, 0.205, 0.88, 1.42, 8, tun);
  b.cyl(0.182, 0.182, 0.90, 0.96, 8, [0.22, 0.15, 0.10]);
  b.box(-0.03, 0.89, -0.20, 0.03, 0.97, -0.17, [0.72, 0.62, 0.30]);                  // the buckle
  b.cyl(0.05, 0.05, 1.42, 1.51, 6, skd);
  b.ball(0, 1.61, 0, 0.095, 0.115, 0.105, sk, 0.02, L.seed);
  b.box(-0.016, 1.585, -0.118, 0.016, 1.635, -0.09, skd);                              // nose
  b.box(-0.052, 1.63, -0.103, -0.028, 1.646, -0.094, [0.08, 0.07, 0.07]);              // eyes
  b.box(0.028, 1.63, -0.103, 0.052, 1.646, -0.094, [0.08, 0.07, 0.07]);
  if (L.style === 'short' || L.style === 'long') b.ball(0, 1.645, 0.02, 0.105, 0.10, 0.11, L.hair, 0.04, L.seed + 1);
  if (L.style === 'long') b.box(-0.09, 1.31, 0.07, 0.09, 1.60, 0.15, L.hair);
  if (L.style === 'cap') { b.ball(0, 1.665, 0.005, 0.108, 0.075, 0.112, dark(tun, 0.9), 0.02, L.seed + 2); b.box(-0.07, 1.64, -0.17, 0.07, 1.655, -0.10, dark(tun, 0.7)); }
  if (L.style === 'helmet') { b.ball(0, 1.665, 0, 0.115, 0.10, 0.12, [0.52, 0.53, 0.56], 0.01, L.seed + 3); b.cyl(0.12, 0.12, 1.595, 1.625, 8, [0.45, 0.46, 0.49]); }
  if (L.extra === 'apron') { b.box(-0.13, 0.62, -0.215, 0.13, 1.20, -0.195, [0.86, 0.84, 0.76]); }
  if (L.extra === 'hat') { b.cyl(0.19, 0.19, 1.68, 1.70, 10, [0.62, 0.50, 0.30]); b.cyl(0.10, 0.09, 1.70, 1.80, 8, [0.58, 0.46, 0.27]); }
  if (L.extra === 'guard') { b.box(-0.05, 1.10, -0.215, 0.05, 1.32, -0.19, [0.82, 0.72, 0.34]); }   // a badge on the chest
  // an arm hangs from the shoulder (y = 0 there): sleeve, bare forearm, hand
  const arm = (right) => {
    const g = new Geo().at(0, 0, 0, 0);
    g.cyl(0.058, 0.064, -0.31, 0.0, 6, tun);
    g.cyl(0.046, 0.058, -0.57, -0.30, 6, sk);
    g.ball(0, -0.61, 0, 0.046, 0.052, 0.046, sk, 0, L.seed + (right ? 5 : 6));
    if (right && L.extra === 'guard') {                                                // a spear, held upright beside her
      g.at(0, 0, -0.07, 0);
      g.cyl(0.016, 0.016, -0.75, 1.15, 5, [0.46, 0.34, 0.20]);
      g.cyl(0.04, 0.0, 1.15, 1.40, 5, [0.70, 0.71, 0.74]);
    }
    return g;
  };
  // a leg hangs from the hip: trousers, then a boot
  const leg = () => {
    const g = new Geo().at(0, 0, 0, 0);
    g.cyl(0.056, 0.082, -0.78, 0.0, 6, trs);
    g.box(-0.068, -0.88, -0.15, 0.068, -0.76, 0.07, L.boots);
    return g;
  };
  const mesh = (g) => g.mesh(pc, device);
  return { body: mesh(b), armL: mesh(arm(false)), armR: mesh(arm(true)), legL: mesh(leg()), legR: mesh(leg()) };
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
    this.root = new pc.Entity(this.name);
    app.root.addChild(this.root);
    // the figure is built 1.75 m tall; scaled to this person's height and build
    const s = L.height / 1.75;
    this.root.setLocalScale(s * L.width, s, s * L.width);
    this.upper = new pc.Entity('upper'); this.upper.setLocalPosition(0, HIP, 0); this.root.addChild(this.upper);
    part('body', parts.body, this.upper);
    this.armL = new pc.Entity('armL'); this.armL.setLocalPosition(-0.235, 1.38 - HIP, 0); this.upper.addChild(this.armL); part('arm', parts.armL, this.armL);
    this.armR = new pc.Entity('armR'); this.armR.setLocalPosition(0.235, 1.38 - HIP, 0); this.upper.addChild(this.armR); part('arm', parts.armR, this.armR);
    this.legL = new pc.Entity('legL'); this.legL.setLocalPosition(-0.105, HIP, 0); this.root.addChild(this.legL); part('leg', parts.legL, this.legL);
    this.legR = new pc.Entity('legR'); this.legR.setLocalPosition(0.105, HIP, 0); this.root.addChild(this.legR); part('leg', parts.legR, this.legR);
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
    const keep = this.spear ? 0.25 : 1;                                   // a guard keeps hold of his spear
    this.legL.setLocalEulerAngles(c.legL, 0, 0);
    this.legR.setLocalEulerAngles(c.legR, 0, 0);
    this.armL.setLocalEulerAngles(c.armLx, 0, c.armLz);
    this.armR.setLocalEulerAngles(c.armRx * keep, 0, c.armRz * keep);
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
