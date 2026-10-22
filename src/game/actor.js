// TARIEL CAULSLEIGH - a person in the world: a body (built by tools/build_people.mjs from Rhys's Quaternius
// packs), its clips by name, and walking to places along the ground.

import { groundAt } from '../sim/walker.js';

const ASSETS = {};
const FILLED = new Set();
// a person's body: assets/characters/<name>.glb (the stand-in if theirs will not load)
export function loadBody(pc, app, name) {
  const url = 'assets/characters/' + (name || 'Standin') + '.glb';
  let a = ASSETS[url];
  if (a) return a.loaded ? Promise.resolve(a) : new Promise((ok, no) => { a.once('load', ok); a.once('error', no); });
  a = ASSETS[url] = new pc.Asset(name || 'standin', 'container', { url });
  app.assets.add(a);
  return new Promise((ok, no) => { a.once('load', () => ok(a)); a.once('error', no); app.assets.load(a); })
    .catch(() => (name ? loadBody(pc, app, null) : Promise.reject(new Error('no body'))));
}

// which clip for which gait
const GAIT = { idle: 'Idle_Loop', walk: 'Walk_Loop', jog: 'Jog_Fwd_Loop', sprint: 'Sprint_Loop', air: 'Jump_Loop', talk: 'Idle_Talking_Loop', arms: 'Idle_FoldArms_Loop', sit: 'Sitting_Idle_Loop', yes: 'Yes', no: 'Idle_No_Loop' };
// a horse's (the Quaternius animal rig)
export const HORSE = { idle: 'Idle', walk: 'Walk', jog: 'Gallop', sprint: 'Gallop' };

export class Actor {
  constructor(pc, app, asset, opts) {
    this.pc = pc; this.name = opts.name || 'someone';
    this.root = new pc.Entity(this.name);
    app.root.addChild(this.root);
    const e = asset.resource.instantiateRenderEntity({ castShadows: true });
    this.root.addChild(e);
    this.body = e;
    // clothes tinted (a copy of each material; skin left alone)
    if (opts.tint) {
      const made = new Map();
      for (const rc of e.findComponents('render')) for (const mi of rc.meshInstances) {
        if (!/Ranger|Outfit/.test(mi.material.name || '')) continue;
        let m = made.get(mi.material);
        if (!m) { m = mi.material.clone(); m.diffuse = new pc.Color(...opts.tint.map((v) => Math.min(1, v * 1.8))); m.update(); made.set(mi.material, m); }
        mi.material = m;
      }
    }
    // a little fill light on people, so they never stand as black cut-outs against the sky
    for (const rc of e.findComponents('render')) for (const mi of rc.meshInstances) {
      if (FILLED.has(mi.material)) continue;
      FILLED.add(mi.material); mi.material.ambient = new pc.Color(1.6, 1.6, 1.6); mi.material.update();
    }
    e.forEach((node) => { if (/^(pistol|gun|rifle|weapon)/i.test(node.name || '')) node.enabled = false; });
    // to a height
    let hi = -Infinity, lo = Infinity;
    for (const r of e.findComponents('render')) for (const mi of r.meshInstances) { const b = mi.aabb; hi = Math.max(hi, b.center.y + b.halfExtents.y); lo = Math.min(lo, b.center.y - b.halfExtents.y); }
    const s = hi - lo > 0.1 ? (opts.height || 1.75) / (hi - lo) : 1;
    e.setLocalScale(s, s, s); e.setLocalPosition(0, -lo * s, 0);
    e.addComponent('anim', { activate: true });
    this.clips = new Set();
    for (const track of asset.resource.animations || []) {
      const t = track.resource || track, name = (t && t.name) || '';
      if (!name) continue;
      try { e.anim.assignAnimation(name, t, undefined, 1, true); this.clips.add(name); } catch (err) { /* skip */ }
    }
    this.cur = null; this.pos = [0, 0, 0]; this.yaw = 0; this.path = null; this.speed = 0; this.pose = 'idle';
    this.gaits = opts.clips || GAIT; this.paces = opts.paces || { walk: 1.6, jog: 4.6 };
    this.mount = null; this.saddle = 0;
  }
  play(gait, rate) {
    const clip = this.gaits[gait] || GAIT[gait] || gait;
    if (!this.clips.has(clip)) return;
    if (clip !== this.cur) { try { this.body.anim.baseLayer.transition(clip, 0.22); } catch (e) { /* keep going */ } this.cur = clip; }
    this.body.anim.speed = rate || 1;
  }
  place(x, z, yaw) { this.pos = [x, groundAt(x, z), z]; if (yaw !== undefined) this.yaw = yaw; this.sync(); }
  face(x, z) { this.yaw = Math.atan2(-(x - this.pos[0]), -(z - this.pos[2])); }
  // walk a list of [x, z] points at a pace (m/s); done() when there
  go(points, pace, done) { this.path = points.slice(); this.speed = pace || 1.9; this.onArrive = done || null; }
  update(dt) {
    if (this.mount) {
      // riding: where the horse goes, sitting
      this.pos = [this.mount.pos[0], this.mount.pos[1] + this.saddle, this.mount.pos[2]]; this.yaw = this.mount.yaw;
      this.play('sit'); this.sync(); return;
    }
    if (this.path && this.path.length) {
      const [tx, tz] = this.path[0], dx = tx - this.pos[0], dz = tz - this.pos[2], d = Math.hypot(dx, dz);
      if (d < 0.4) { this.path.shift(); if (!this.path.length) { this.path = null; if (this.onArrive) this.onArrive(); } }
      else {
        const step = Math.min(d, this.speed * dt);
        this.pos[0] += (dx / d) * step; this.pos[2] += (dz / d) * step; this.pos[1] = groundAt(this.pos[0], this.pos[2]);
        const want = Math.atan2(-dx, -dz); let a = want - this.yaw;
        while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2;
        this.yaw += a * Math.min(1, dt * 8);
      }
      this.play(this.speed > 3.5 ? 'jog' : 'walk', this.speed > 3.5 ? this.speed / this.paces.jog : this.speed / this.paces.walk);
    } else this.play(this.pose);
    this.sync();
  }
  sync() {
    this.root.setPosition(this.pos[0], this.pos[1], this.pos[2]);
    // yaw 0 faces -z (north)
    this.root.setEulerAngles(0, this.yaw * 57.29578 + 180, 0);   // the body model faces +z
  }
  set visible(v) { this.root.enabled = v; }
  get visible() { return this.root.enabled; }
}
