// TARIEL CAULSLEIGH - the people of Stanlech: who they are, where each should be at each hour of the day,
// and the routes between those places (round walls, trees and the river, over the bridge).
// Pure (tested in node): the engine side is game/townsfolk.js, and the drawn bodies are game/figure.js.
//
// PLACEHOLDERS (T0.2): ten unnamed people with routines Rhys has not yet seen. Names, faces, clothes and who
// does what are for him to set; the machinery is what is being tried.

import * as W from '../world/world.js';
import { blocked, doors } from '../world/solids.js';
import { groundAt, tooDeep, bridgeAt } from './walker.js';
import { rng } from '../world/noise.js';

export const CELL = 0.5;        // the routes' grid, in metres
export const RADIUS = 0.28;     // a person's width, against walls
const PLAN = 0.34;              // routes are planned with a little to spare, so a corner clipped between grid points still clears

// can a person stand here: not in deep water, not inside a wall, tree or piece of furniture
export function walkable(x, z, rad = RADIUS) {
  if (tooDeep(x, z)) return false;
  const g = groundAt(x, z);
  return !blocked(x, z, rad, g + 0.25, g + 1.6);
}
// standable with room to spare: where people are put, and what routes are planned through
export const standable = (x, z) => walkable(x, z, PLAN);

// the nearest standable place to (x, z), within `reach` metres (or null)
export function nearestFree(x, z, reach = 3) {
  if (standable(x, z)) return [x, z];
  for (let r = 0.25; r <= reach; r += 0.25) {
    const n = Math.max(8, Math.round(r * 16));
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      if (standable(px, pz)) return [px, pz];
    }
  }
  return null;
}
// a straight walk from a to b with nothing in the way
function clearLine(a, b) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(d / 0.1));
  for (let k = 1; k <= n; k++) if (!standable(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n)) return false;
  return true;
}

// a small binary heap of [priority, value]
class Heap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(p, v) {
    const a = this.a; a.push([p, v]); let i = a.length - 1;
    while (i > 0) { const j = (i - 1) >> 1; if (a[j][0] <= a[i][0]) break; [a[i], a[j]] = [a[j], a[i]]; i = j; }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
}

// A route from a to b, as a list of [x, z] to walk to (the start not included), or null if there is none.
// A* over a half-metre grid. Streets and the bridge are cheaper than open ground, and wading is dear, so people keep
// to the roads and cross by the bridge; the result is pulled straight wherever nothing is in the way.
const COST = [0, 1, 0, 1.3, 4];          // by cell kind: 1 street or bridge, 3 open ground, 4 shallow water
export function findPath(a, b, margin = 30, maxNodes = 150000) {
  const fa = nearestFree(a[0], a[1]), fb = nearestFree(b[0], b[1]);
  if (!fa || !fb) return null;
  // the grid is laid so that its cells' centres include the start exactly
  const x0 = fa[0] - Math.ceil(margin / CELL + Math.max(0, fa[0] - fb[0]) / CELL) * CELL;
  const z0 = fa[1] - Math.ceil(margin / CELL + Math.max(0, fa[1] - fb[1]) / CELL) * CELL;
  const nx = Math.ceil((Math.max(fa[0], fb[0]) + margin - x0) / CELL) + 1, nz = Math.ceil((Math.max(fa[1], fb[1]) + margin - z0) / CELL) + 1;
  const cx = (i) => x0 + i * CELL, cz = (j) => z0 + j * CELL;
  const state = new Uint8Array(nx * nz);                 // 0 not yet looked at, 2 blocked, else the cell kind (COST)
  const free = (i, j) => {
    if (i < 0 || j < 0 || i >= nx || j >= nz) return false;
    const k = j * nx + i;
    if (!state[k]) {
      const x = cx(i), z = cz(j);
      state[k] = !standable(x, z) ? 2 : (bridgeAt(x, z) !== null || W.roadDist(x, z) < 1.5) ? 1 : W.waterAt(x, z) !== null ? 4 : 3;
    }
    return state[k] !== 2;
  };
  const si = Math.round((fa[0] - x0) / CELL), sj = Math.round((fa[1] - z0) / CELL);
  const gi = Math.round((fb[0] - x0) / CELL), gj = Math.round((fb[1] - z0) / CELL);
  const g = new Float32Array(nx * nz).fill(Infinity), from = new Int32Array(nx * nz).fill(-1), done = new Uint8Array(nx * nz);
  // weighted: a little short of the best route, much quicker to find
  const heur = (i, j) => { const dx = Math.abs(i - gi), dz = Math.abs(j - gj); return (dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz)) * CELL * 1.6; };
  const open = new Heap(), s = sj * nx + si, goal = gj * nx + gi;
  g[s] = 0; open.push(heur(si, sj), s);
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let seen = 0, found = false;
  while (open.size && seen < maxNodes) {
    const [, k] = open.pop();
    if (done[k]) continue;
    done[k] = 1; seen++;
    if (k === goal) { found = true; break; }
    const i = k % nx, j = (k - i) / nx;
    for (const [di, dj] of DIRS) {
      const ni = i + di, nj = j + dj;
      if (!free(ni, nj)) continue;
      if (di && dj && !(free(i + di, j) && free(i, j + dj))) continue;        // no cutting corners
      const nk = nj * nx + ni;
      if (done[nk]) continue;
      const cost = g[k] + (di && dj ? Math.SQRT2 : 1) * CELL * COST[state[nk]];
      if (cost < g[nk]) { g[nk] = cost; from[nk] = k; open.push(cost + heur(ni, nj), nk); }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let k = goal; k !== -1; k = from[k]) { const i = k % nx, j = (k - i) / nx; cells.push([cx(i), cz(j)]); }
  cells.reverse();
  // pull it straight: from each point, on to the furthest one in clear sight
  const out = []; let at = 0;
  while (at < cells.length - 1) {
    let to = at + 1;
    for (let t = cells.length - 1; t > at + 1; t--) if (clearLine(cells[at], cells[t])) { to = t; break; }
    out.push(cells[to]); at = to;
  }
  if (!out.length) out.push(cells[cells.length - 1]);
  // end exactly where asked, if that is in clear sight of the last point
  const last = out[out.length - 1];
  if ((last[0] !== fb[0] || last[1] !== fb[1]) && clearLine(last, fb)) out.push(fb);
  return out;
}

// -- the tavern's door ----------------------------------------------------------------------------------
// a spot just outside it, and one just inside, to cross between in a straight line
export function tavernGate() {
  if (tavernGate.cache) return tavernGate.cache;
  const t = W.tavern(), d = doors().find((q) => q.b === t);
  const out = nearestFree(...W.toWorld(t, d.cell.lx, d.cell.lz + 1.7)), inn = nearestFree(...W.toWorld(t, d.cell.lx, d.cell.lz - 1.5), 1);
  return (tavernGate.cache = { out, in: inn });
}
export function inTavern(x, z) {
  const t = W.tavern(), dx = x - t.x, dz = z - t.z, c = Math.cos(t.yaw), s = Math.sin(t.yaw);
  return Math.abs(dx * c - dz * s) < t.w - 0.1 && Math.abs(dx * s + dz * c) < t.d - 0.1;
}
// A whole route from a to b, through the tavern's door if one of them is inside it. Cached, since people repeat
// their days (and the engine warms the cache while it loads).
const ROUTES = new Map();
export function route(a, b) {
  const key = a[0].toFixed(1) + ',' + a[1].toFixed(1) + '>' + b[0].toFixed(1) + ',' + b[1].toFixed(1);
  if (ROUTES.has(key)) return ROUTES.get(key);
  const ia = inTavern(a[0], a[1]), ib = inTavern(b[0], b[1]), gate = tavernGate();
  let r;
  if (ia === ib) r = findPath(a, b, ia ? 4 : 30);
  else if (ib) { const p1 = findPath(a, gate.out), p2 = findPath(gate.in, b, 4); r = p1 && p2 ? [...p1, gate.in, ...p2] : null; }
  else { const p1 = findPath(a, gate.in, 4), p2 = findPath(gate.out, b); r = p1 && p2 ? [...p1, gate.out, ...p2] : null; }
  ROUTES.set(key, r);
  return r;
}
export function clearRoutes() { ROUTES.clear(); }

// -- the places and the people ---------------------------------------------------------------------------

const HOUR = (h) => ((h % 24) + 24) % 24;
// just outside a building's door
export function doorMouth(id) {
  const d = doors().find((q) => q.id === id);
  const [x, z] = W.toWorld(d.b, d.cell.lx, d.cell.lz + 1.7);
  return nearestFree(x, z) || [x, z];
}
// standing places in the tavern (local: x across, z out of the front); the first, in front of the bar's middle, is the keeper's
const TAVERN_SPOTS = [[0.2, -1.8], [-2.4, -1.8], [-1.2, -1.8], [1.4, -1.8], [2.6, -1.8], [0.0, 0.3], [-0.6, 1.5], [0.4, 3.2], [-2.0, 3.4], [2.9, 0.0]];
function tavernSpots() {
  const t = W.tavern(), out = [];
  for (const [lx, lz] of TAVERN_SPOTS) { const [x, z] = W.toWorld(t, lx, lz), f = nearestFree(x, z, 1.5); if (f) out.push(f); }
  return out;
}
export function tavernId() { return W.buildings().indexOf(W.tavern()); }

const TINTS = [[0.55, 0.42, 0.30], [0.35, 0.45, 0.32], [0.50, 0.30, 0.28], [0.30, 0.35, 0.50], [0.55, 0.50, 0.35], [0.40, 0.33, 0.42]];
export const ROLES = ['keeper', 'guard', 'guard', 'stall', 'stall', 'stall', 'villager', 'villager', 'villager', 'villager'];
const riverBank = (pt) => (W.riverCoords(pt[0], pt[1]).n >= 0 ? 'szetter' : 'cawel');
// the day of someone who does not drink at the tavern, and of someone who does
const soc = (work, leave, sociable, bed) => (sociable ? [[0, 'home'], [work, 'work'], [leave, 'tavern'], [bed, 'home']] : [[0, 'home'], [work, 'work'], [leave, 'home']]);

// Ten people of Stanlech (placeholders). Each: { id, role, name, home (building id), mouth, bank, work: [{ spot, face }],
// blocks: [[from hour, 'home' | 'work' | 'tavern'], ...], tavernSpot, tavernFace, pose, pace, height, tint, seed }.
// blocks say where they are from that hour until the next.
// placeholder names and greetings (Rhys's to replace): who they are, and what they say when spoken to
const NAMES = ['Hobb Marlow', 'Wenna Carr', 'Dunstan Pell', 'Maud Ashby', 'Garrick Toll', 'Tilda Brook', 'Osric Venn', 'Nell Harker', 'Aldous Fenn', 'Bertha Lisle'];
const LINES = {
  keeper: ['Mind the step. Ale, bed or news - I\'ve a little of each.', 'Quiet, for a market day. Sit where you like.', 'We\'re shut to trouble here. Drink up, and keep your knives sheathed.'],
  guard: ['Move along, miss, nothing to see.', 'Bridge is open to travellers by day. Nights, we like to know who\'s about.', 'Stay out of trouble and we\'ll get along.'],
  stall: ['Fresh in this morning. Take a look, no charge for looking.', 'Prices are what they are, miss. Times are hard.', 'Barley, cheese, a bit of cloth. What\'ll it be?'],
  villager: ['Morning. You\'re not from Stanlech, are you?', 'Mind the river, it\'s running high this month.', 'Evening. Is it true folk have gone missing up the valley?'],
};
// what person p says to someone who speaks to them at this hour; n picks which of their lines
export function greeting(p, hour, n) {
  const set = LINES[p.role] || LINES.villager;
  return set[Math.abs((n || 0) + p.id) % set.length];
}
export function roleLabel(p) { return { keeper: 'innkeeper', guard: 'guard', stall: 'stallholder', villager: 'villager' }[p.role] || 'villager'; }

export function makeFolk() {
  const bs = W.buildings(), bridge = W.PLACES.bridge;
  const houses = bs.map((b, id) => ({ b, id })).filter(({ b }) => b.kind === 'house' && Math.hypot(b.x - bridge[0], b.z - bridge[1]) < 320);
  const well = bs.find((b) => b.kind === 'well'), posts = bs.map((b, id) => ({ b, id })).filter(({ b }) => b.kind === 'post');
  const tav = tavernSpots(), tid = tavernId(), taken = new Set(), face = W.toWorld(W.tavern(), 0.2, -4);
  const people = [];
  ROLES.forEach((role, i) => {
    const r = rng(W.SEED + 700 + i * 31), rr = (a, b) => a + (b - a) * r();
    const p = { id: i, role, seed: r(), offset: r(), pace: rr(1.3, 1.7), height: rr(1.55, 1.85), tint: TINTS[i % TINTS.length], work: [], blocks: [] };
    if (role === 'keeper') p.home = tid; else p.home = houses[Math.floor(i * houses.length / ROLES.length)].id;
    p.mouth = doorMouth(p.home);
    p.bank = riverBank(p.mouth);
    p.who = NAMES[i % NAMES.length];
    const sociable = r() < 0.75;
    if (role === 'keeper') {
      p.name = 'Innkeeper'; p.pose = 'arms';
      p.work = [{ spot: tav[0] || p.mouth, face }];
      p.blocks = [[0, 'work'], [1, 'home'], [10, 'work']];
    } else if (role === 'guard') {
      const post = posts[(i - 1) % posts.length]; p.name = 'Guard'; p.pose = 'idle';
      p.tint = post.b.style === 'szetter' ? [0.34, 0.38, 0.46] : [0.26, 0.40, 0.28];
      const m = doorMouth(post.id), spot = nearestFree(m[0] + 1.6, m[1], 3) || m;
      p.work = [{ spot, face: bridge }];
      p.blocks = [[0, 'home'], [rr(5.6, 6.2), 'work'], [rr(17.6, 18.4), 'home']];
    } else if (role === 'stall') {
      p.name = 'Stallholder'; p.pose = 'arms';
      let spot = null;
      for (let k = 0; k < 24 && !spot; k++) {
        const a = r() * Math.PI * 2, d = rr(3.0, 5.0), x = well.x + Math.cos(a) * d, z = well.z + Math.sin(a) * d;
        if (standable(x, z)) spot = [x, z];
      }
      p.work = [{ spot: spot || p.mouth, face: [well.x, well.z] }];
      p.blocks = soc(rr(6.8, 7.6), rr(16.8, 17.6), sociable, rr(21.2, 22.8));
    } else {
      p.name = 'Villager'; p.pose = i % 2 ? 'talk' : 'arms';
      // three places beside their own bank's street, where they pass the day
      for (let k = 0; k < 3; k++) {
        let spot = null;
        for (let t = 0; t < 30 && !spot; t++) {
          const n = p.bank === 'cawel' ? -rr(55, 190) : rr(40, 110), s = (r() < 0.5 ? -1 : 1) * rr(3.5, 7), [x, z] = W.fromRiver(s, n);
          if (standable(x, z)) spot = [x, z];
        }
        if (spot) p.work.push({ spot, face: W.fromRiver(0, p.bank === 'cawel' ? -120 : 80) });
      }
      if (!p.work.length) p.work.push({ spot: p.mouth, face: null });
      p.blocks = soc(rr(6.5, 8.0), rr(17.4, 18.6), sociable, rr(21.4, 23.0));
    }
    if (role === 'keeper') p.tavernSpot = p.work[0].spot;
    else {
      // a place of their own in the tavern: the keeper has the first, the rest take the others in turn
      let k = 1 + (i % Math.max(1, tav.length - 1));
      while (taken.has(k) && taken.size < tav.length - 1) k = 1 + (k % (tav.length - 1));
      taken.add(k); p.tavernSpot = tav[k] || tav[0];
    }
    p.tavernFace = face;
    people.push(p);
  });
  return people;
}

// Where a person should be at an hour: { where, key, spot, face, pose }. `key` changes when they should move.
export function plan(p, hour) {
  const h = HOUR(hour);
  let cur = p.blocks[p.blocks.length - 1];                    // before the first block: the last one, from yesterday
  for (const b of p.blocks) if (b[0] <= h) cur = b;
  const where = cur[1];
  if (where === 'home') return { where, key: 'home', spot: p.mouth, face: null, pose: 'idle' };
  if (where === 'tavern') return { where, key: 'tavern', spot: p.tavernSpot, face: p.tavernFace, pose: p.seed < 0.5 ? 'talk' : 'arms' };
  const k = p.work.length > 1 ? Math.floor(h + p.offset * 3) % p.work.length : 0;
  return { where, key: 'work' + k, spot: p.work[k].spot, face: p.work[k].face, pose: p.pose };
}

// every move a person makes in a day, as [from spot, to spot] (so the routes can be worked out in advance)
export function dayMoves(p) {
  const out = []; let prev = plan(p, 0);
  for (let h = 0.25; h <= 24.01; h += 0.25) {
    const now = plan(p, h);
    if (now.key !== prev.key) { out.push([prev.spot, now.spot]); prev = now; }
  }
  return out;
}
