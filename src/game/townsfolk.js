// TARIEL CAULSLEIGH - the people of Stanlech in the game: each one a drawn Figure living a day by the clock (the
// routines and routes are in sim/townsfolk.js). They walk to where the hour wants them, go indoors at home (and are
// not seen again until they come out), and stand about as they do in each place.

import { Figure } from './figure.js';
import { makeFolk, plan, route, dayMoves, greeting, roleLabel } from '../sim/townsfolk.js';

export class Town {
  constructor(pc, app) { this.pc = pc; this.app = app; this.people = []; this.queue = []; }

  // make the people, and learn their day's routes now (loading is the time for it), a person at a time
  async build(frame, say, hour) {
    for (const p of makeFolk()) {
      const fig = new Figure(this.pc, this.app, p);
      fig.visible = false;
      this.people.push({ p, fig, key: null, target: null, queued: false });
    }
    for (const s of this.people) {
      say('Teaching the people their days (' + (s.p.id + 1) + ' of ' + this.people.length + ')...');
      for (const [a, b] of dayMoves(s.p)) route(a, b);
      await frame();
    }
    this.snap(hour);
  }

  // put everyone where the hour wants them, with no walking (the start, a night's sleep, hurried time)
  snap(hour) {
    for (const s of this.people) {
      const pl = plan(s.p, hour);
      if (s.key === pl.key && !s.fig.path) continue;
      s.key = pl.key; s.target = pl; s.queued = false;
      this.arrive(s, pl, true);
    }
    this.queue.length = 0;
  }

  // every frame: anyone whose hour has turned sets off; one route is started a frame, so none of them hitches
  update(dt, hour) {
    for (const s of this.people) {
      const pl = plan(s.p, hour);
      if (pl.key !== s.key) { s.key = pl.key; s.target = pl; if (!s.queued) { s.queued = true; this.queue.push(s); } }
    }
    const s = this.queue.shift();
    if (s) { s.queued = false; this.start(s); }
    for (const q of this.people) if (q.fig.visible) q.fig.update(dt);
  }

  start(s) {
    const tg = s.target, f = s.fig;
    if (!f.visible) {                                                   // they were indoors: out of the door
      if (tg.where === 'home') return;
      f.place(s.p.mouth[0], s.p.mouth[1]); f.visible = true;
    }
    const r = route([f.pos[0], f.pos[2]], tg.spot);
    if (!r) { this.arrive(s, tg, true); return; }                       // no way there: put them there
    f.pose = 'idle';
    f.go(r, s.p.pace, () => this.arrive(s, tg, false));
  }

  arrive(s, tg, instant) {
    const f = s.fig;
    if (tg.where === 'home') { f.visible = false; f.path = null; return; }
    if (instant) { f.place(tg.spot[0], tg.spot[1]); f.visible = true; }
    if (tg.face) { f.face(tg.face[0], tg.face[1]); if (instant) f.yaw = f.wantYaw; }
    f.pose = tg.pose;
  }

  // the person out and about nearest to (x, z) within r metres, or null
  nearest(x, z, r) {
    let best = null, bd = r;
    for (const s of this.people) { if (!s.fig.visible) continue; const d = Math.hypot(s.fig.pos[0] - x, s.fig.pos[2] - z); if (d < bd) { bd = d; best = s; } }
    return best;
  }
  // they turn to her
  face(s, to) { s.fig.face(to[0], to[2]); }
  // (old) she speaks to them: they turn to her and answer
  talk(s, to, hour, n) {
    s.fig.face(to[0], to[2]);
    if (!s.fig.path) s.fig.pose = 'talk';
    return { name: s.p.who, role: roleLabel(s.p), line: greeting(s.p, hour, n) };
  }
  // for the debug line: how many are out and about, and how many are walking
  summary() {
    let out = 0, walking = 0;
    for (const s of this.people) { if (s.fig.visible) out++; if (s.fig.path) walking++; }
    return out + '/' + this.people.length + ' out, ' + walking + ' walking';
  }
}
