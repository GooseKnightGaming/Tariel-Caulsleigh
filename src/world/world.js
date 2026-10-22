// TARIEL CAULSLEIGH - the valley of Stanlech, Chapter One's corner of Cawel. Pure: no engine here, so
// the same world is built in the browser and checked in node.
//
// Where it comes from: Rhys's Azgaar map (data/region_cawel.json). At 3 miles to a map pixel the map gives
// the lie of the land, not its detail: the Yolo River runs here from the south-east (its source, upriver,
// in the hills of Cawel) towards the north-west and a lake; it is the border, Cawel Shire (the Baronreich
// of Saes) on its south-west bank, Ausserreich Province (the Sźettereich Conglomerate) on its north-east;
// around Stanlech the map has heath ("cold desert" in Azgaar's biomes) with deciduous woods to the west and
// thick wet woodland to the east and south-east. Mahlterngen lies west of Stanlech, Fluor and Sackingen
// north-east, Ettnauter south. Shappel-ont'-Laik is upriver on the Cawel side (Rhys).
//
// The game's ground: 2.4 km square, Stanlech's bridge at the middle (0, 0). x runs east, z south (as the
// map's y does), heights in metres.

import { fbm, vnoise, smoothstep, clamp, rng } from './noise.js';

export const SEED = 1785668;                     // Rhys's map id, shortened
export const HALF = 1200;                        // the ground runs -HALF..HALF in x and z
export const STEP = 6;                           // a height sample every 6 m
export const N = Math.round((HALF * 2) / STEP) + 1;
export const BOUND = 1150;                       // you may walk this far from the middle

// The river: downstream is north-north-west (the map's Yolo, from (316,490) to (296,461));
// RIGHT, facing downstream, is the Sźetter bank.
const dl = Math.hypot(-20, -29);
export const DOWN = [-20 / dl, -29 / dl];
export const RIGHT = [-DOWN[1], DOWN[0]];
export const RIVER = { half: 9, bank: 5 };       // 18 m of water, then the bank

export const meander = (s) => 42 * Math.sin(s / 260) + 16 * Math.sin(s / 105 + 1.3);
// along-river and across-river coordinates: s grows downstream; n is across, + on the Sźetter bank
export function riverCoords(x, z) {
  const s = x * DOWN[0] + z * DOWN[1];
  const n = x * RIGHT[0] + z * RIGHT[1] - meander(s);
  return { s, n };
}
export function fromRiver(s, n) {
  const m = meander(s) + n;
  return [DOWN[0] * s + RIGHT[0] * m, DOWN[1] * s + RIGHT[1] * m];
}
export const base = (s) => 30 - 0.004 * s;        // the valley floor falls downstream
export const waterLevel = (s) => base(s) - 0.25;

// named places
export const PLACES = {
  bridge: fromRiver(0, 0),
  hill: fromRiver(-120, -430),                   // the hill above Stanlech, on the Cawel side
  shappel: fromRiver(-1000, -150),               // Shappel-ont'-Laik, upriver on the Cawel side
  ridge: fromRiver(260, 640),                    // the wooded ridge across the border
};
const HILL = { r: 230, top: 34, flat: 45 };
const RIDGE = { r: 330, top: 42 };

// Stanlech: the flattened ground the town stands on, both banks
export function townWeight(s, a) {
  return smoothstep(230, 150, Math.abs(s)) * smoothstep(235, 165, a);
}
function villageWeight(x, z) {
  const d = Math.hypot(x - PLACES.shappel[0], z - PLACES.shappel[1]);
  return smoothstep(110, 60, d);
}

// the raw height of the land (before the grid): the valley, the river's channel, the hill, the ridge,
// the rim of hills at the edge of the ground, and noise
export function rawHeight(x, z) {
  const { s, n } = riverCoords(x, z);
  const a = Math.abs(n), b = base(s);
  const ground = b + 1.2;
  // the valley sides
  let h = ground + Math.pow(smoothstep(80, 560, a), 1.15) * 26;
  // texture: broad swells away from the river, smaller folds closer in
  h += fbm(x / 260, z / 260, SEED) * 9 * smoothstep(60, 320, a);
  h += fbm(x / 70, z / 70, SEED + 7) * 1.8 * smoothstep(18, 70, a);
  // the hill above Stanlech: a flat top to stand on
  const dh = Math.hypot(x - PLACES.hill[0], z - PLACES.hill[1]);
  h += HILL.top * smoothstep(HILL.r, HILL.flat, dh);
  // the ridge across the border
  const dr = Math.hypot(x - PLACES.ridge[0], z - PLACES.ridge[1]);
  h += RIDGE.top * Math.exp(-(dr / RIDGE.r) * (dr / RIDGE.r));
  // the rim: hills closing the ground in
  const m = Math.max(Math.abs(x), Math.abs(z));
  h += smoothstep(980, 1190, m) * (55 + 25 * vnoise(x / 150, z / 150, SEED + 3));
  // the town, and the village, stand on level ground
  const tw = townWeight(s, a) * smoothstep(RIVER.half + 3, RIVER.half + 14, a);
  if (tw > 0) h += ((ground + 0.4 + a * 0.01) - h) * tw;
  const vw = villageWeight(x, z);
  if (vw > 0) { const vh = rawLevel(PLACES.shappel); h += (vh - h) * vw; }
  // the river's channel
  if (a < RIVER.half + RIVER.bank) {
    const bed = b - 2.4;
    const t = smoothstep(RIVER.half - 3, RIVER.half + RIVER.bank, a);
    h = bed + (h - bed) * t;
  }
  return h;
}
// the level a place is flattened to (no recursion through the flattening)
function rawLevel(p) {
  const { s, n } = riverCoords(p[0], p[1]);
  const a = Math.abs(n);
  return base(s) + 1.2 + Math.pow(smoothstep(80, 560, a), 1.15) * 26 + fbm(p[0] / 260, p[1] / 260, SEED) * 9 * smoothstep(60, 320, a);
}

// ── the height grid: built once, then the ground everywhere (render and walking agree exactly) ──
let GRID = null;
export function grid() {
  if (GRID) return GRID;
  const h = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) h[j * N + i] = rawHeight(-HALF + i * STEP, -HALF + j * STEP);
  GRID = h;
  return h;
}
// the ground under (x, z): the same two triangles per square the mesh draws
export function heightAt(x, z) {
  const g = grid();
  const fx = clamp((x + HALF) / STEP, 0, N - 1.0001), fz = clamp((z + HALF) / STEP, 0, N - 1.0001);
  const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
  const h00 = g[j * N + i], h10 = g[j * N + i + 1], h01 = g[(j + 1) * N + i], h11 = g[(j + 1) * N + i + 1];
  // triangles split along the 00-11 diagonal
  return u > v ? h00 + (h10 - h00) * u + (h11 - h10) * v : h00 + (h11 - h01) * u + (h01 - h00) * v;
}
export function normalAt(x, z) {
  const e = 1.5, dx = heightAt(x + e, z) - heightAt(x - e, z), dz = heightAt(x, z + e) - heightAt(x, z - e);
  const l = Math.hypot(dx, 2 * e, dz);
  return [-dx / l, (2 * e) / l, -dz / l];
}
// the river's surface over (x, z), or null where there is no river
export function waterAt(x, z) {
  const { s, n } = riverCoords(x, z);
  if (Math.abs(n) > RIVER.half + RIVER.bank) return null;
  const wl = waterLevel(s);
  return heightAt(x, z) < wl ? wl : null;
}
export const sideAt = (x, z) => (riverCoords(x, z).n >= 0 ? 'Sźettereich' : 'Cawel');

// ── roads: polylines on the ground ─────────────────────────────────────────
function line(...pts) { return pts.map((p) => [p[0], p[1]]); }
const W_ROAD = [-HALF, fromRiver(0, -230)[1] + 40];
export const ROADS = [
  // the high road through Stanlech: west towards Mahlterngen, east into Sźettereich towards Sackingen
  { name: 'The Mahlterngen road', w: 4.5, pts: line([-HALF - 10, W_ROAD[1] - 90], [-700, W_ROAD[1] - 40], [-380, W_ROAD[1]], fromRiver(0, -240), fromRiver(0, -RIVER.half - 6)) },
  { name: 'The Sackingen road', w: 4.5, pts: line(fromRiver(0, RIVER.half + 6), fromRiver(0, 240), [520, -220], [880, -330], [HALF + 10, -400]) },
  // upriver on the Cawel bank, to Shappel-ont'-Laik
  { name: 'The river path', w: 3, pts: line(fromRiver(-150, -120), fromRiver(-420, -105), fromRiver(-700, -125), fromRiver(-1000, -150)) },
  // up the hill
  { name: 'The hill path', w: 2.2, pts: line(fromRiver(0, -240), fromRiver(-50, -300), fromRiver(-100, -360), fromRiver(-120, -410)) },
];
// the bridge's span: from bank to bank, on the high road
export const BRIDGE = { from: fromRiver(0, -(RIVER.half + 6)), to: fromRiver(0, RIVER.half + 6), w: 4.2 };
function segDist(px, pz, a, b) {
  const vx = b[0] - a[0], vz = b[1] - a[1], l2 = vx * vx + vz * vz || 1;
  const t = clamp(((px - a[0]) * vx + (pz - a[1]) * vz) / l2, 0, 1);
  return Math.hypot(px - (a[0] + vx * t), pz - (a[1] + vz * t));
}
export function roadDist(x, z) {
  let best = Infinity;
  for (const r of ROADS) for (let k = 0; k < r.pts.length - 1; k++) best = Math.min(best, segDist(x, z, r.pts[k], r.pts[k + 1]) - r.w / 2);
  return best;
}

// ── buildings: Stanlech (both banks) and Shappel-ont'-Laik ────────────────
// Houses are built from the Medieval Village kit on a 2 m grid: w cells across the front (which faces the
// street, local +z), d cells deep, 1 or 2 storeys of 3.12 m. style: 'saes' (plaster and timber) or 'szetter'
// (rough brick). The roof kit comes in widths 4, 6, 8 m, so w is 2-4 and w <= d.
export const STOREY = 3.12;
const ROOF_SIZES = { 2: [2, 3, 4], 3: [3, 4, 5], 4: [4, 5] };   // allowed d for each w
function level(x, z, yaw, w, d) {
  // the floor sits just above the highest ground under the house
  const c = Math.cos(yaw), sn = Math.sin(yaw), hw = w, hd = d; let top = -Infinity;
  for (const [lx, lz] of [[-hw, -hd], [hw, -hd], [-hw, hd], [hw, hd], [0, 0], [0, hd], [0, -hd]]) {
    const wx = x + lx * c + lz * sn, wz = z - lx * sn + lz * c;
    top = Math.max(top, heightAt(wx, wz));
  }
  return top + 0.05;
}
export function buildings() {
  if (buildings.cache) return buildings.cache;
  const r = rng(SEED + 11), out = [];
  const street = Math.atan2(DOWN[0], DOWN[1]);
  const house = (s, n, w, d, storeys, extra, kind, style, name) => {
    const [x, z] = fromRiver(s, n), yaw = street + (extra || 0);
    const allowed = ROOF_SIZES[w]; if (!allowed.includes(d)) d = allowed[Math.min(allowed.length - 1, Math.max(0, d - allowed[0]))];
    out.push({ x, z, yaw, w, d, storeys, kind, style, name: name || null, y: level(x, z, yaw, w, d), seed: Math.floor(r() * 1e6) });
  };
  // Cawel bank (n < 0): the tavern by the bridge, houses along the street, the market square with its well
  house(-20, -40, 4, 5, 2, 0, 'tavern', 'saes', 'The tavern');
  for (const [s, n] of [[22, -38], [-20, -64], [20, -66], [-20, -150], [20, -152], [-22, -178], [22, -180], [-48, -42], [48, -44], [-76, -40], [74, -42], [-104, -42], [100, -44], [-130, -46]])
    house(s, n, 2 + Math.floor(r() * 2), 3 + Math.floor(r() * 2), r() < 0.45 ? 2 : 1, s < 0 ? 0 : Math.PI, 'house', 'saes');
  const wp = fromRiver(0, -105);
  out.push({ kind: 'well', x: wp[0], z: wp[1], y: heightAt(wp[0], wp[1]), yaw: 0, w: 1, d: 1, storeys: 0, style: 'saes' });
  house(14, -22, 2, 2, 1, 0, 'post', 'saes', 'Saes guard post');
  // Sźetter bank (n > 0): taller, brick
  for (const [s, n] of [[-20, 38], [20, 40], [-22, 66], [22, 64], [-20, 94], [22, 96], [-50, 40], [50, 42], [-80, 44], [78, 42], [-24, 124], [24, 126]])
    house(s, n, 2 + Math.floor(r() * 2), 3 + Math.floor(r() * 2), r() < 0.7 ? 2 : 1, s < 0 ? 0 : Math.PI, 'house', 'szetter');
  house(-14, 22, 2, 2, 1, 0, 'post', 'szetter', 'Sźetter toll house');
  // Shappel-ont'-Laik: a handful of houses round a green, facing it
  const sp = PLACES.shappel;
  for (let k = 0; k < 6; k++) {
    const ang = (k / 6) * Math.PI * 2 + 0.4, rr = 32 + r() * 10;
    const x = sp[0] + Math.cos(ang) * rr, z = sp[1] + Math.sin(ang) * rr;
    const yaw = Math.atan2(sp[0] - x, sp[1] - z), w = 2 + Math.floor(r() * 2), d = 3 + Math.floor(r() * 2);
    out.push({ x, z, yaw, w, d: ROOF_SIZES[w].includes(d) ? d : ROOF_SIZES[w][0], storeys: 1, kind: 'house', style: 'saes', name: null, y: level(x, z, yaw, w, d), seed: Math.floor(r() * 1e6) });
  }
  buildings.cache = out;
  return out;
}
// a house's walls, cell by cell: [{ side: 'front'|'back'|'left'|'right', i, lx, lz, rot, door }]
// (local frame: x across the front, z out of the front; rot turns the kit's wall, which faces +z)
export function wallCells(b) {
  const W = b.w * 2, D = b.d * 2, out = [];
  const doorAt = Math.floor(b.w / 2);
  for (let i = 0; i < b.w; i++) {
    out.push({ side: 'front', i, lx: -W / 2 + 1 + 2 * i, lz: D / 2, rot: 0, door: i === doorAt });
    out.push({ side: 'back', i, lx: W / 2 - 1 - 2 * i, lz: -D / 2, rot: Math.PI, door: false });
  }
  for (let i = 0; i < b.d; i++) {
    out.push({ side: 'left', i, lx: -W / 2, lz: -D / 2 + 1 + 2 * i, rot: -Math.PI / 2, door: false });
    out.push({ side: 'right', i, lx: W / 2, lz: D / 2 - 1 - 2 * i, rot: Math.PI / 2, door: false });
  }
  return out;
}

// the tavern's ground floor (local: x across, z out of the front; the door is at x = +1 on the front wall).
// solid: [half-width, half-depth, height] for the things you cannot walk through
export const TAVERN_ROOM = [
  // the bar along the back, the barrels behind it
  { piece: 'Table_Large', lx: -1.6, lz: -2.9, rot: 0, solid: [1.42, 0.55, 1] },
  { piece: 'Table_Large', lx: 1.3, lz: -2.9, rot: 0, solid: [1.42, 0.55, 1] },
  { piece: 'Barrel_Holder', lx: -2.6, lz: -4.45, rot: 0, solid: [0.7, 0.4, 1.3] },
  { piece: 'Barrel_Holder', lx: -0.7, lz: -4.45, rot: 0, solid: [0.7, 0.4, 1.3] },
  { piece: 'Barrel', lx: 0.9, lz: -4.5, rot: 0, solid: [0.35, 0.35, 0.9] },
  { piece: 'Mug', lx: -1.9, lz: -2.8, ly: 0.81, rot: 0.4 }, { piece: 'Mug', lx: -1.2, lz: -3.0, ly: 0.81, rot: 2 },
  { piece: 'Bottle_1', lx: 1.8, lz: -3.1, ly: 0.81, rot: 0 }, { piece: 'CandleStick_Triple', lx: 0.4, lz: -3.0, ly: 0.81, rot: 0 },
  // two tables with benches, one with stools
  { piece: 'Table_Large', lx: -2.3, lz: 0.6, rot: Math.PI / 2, solid: [0.55, 1.42, 1] },
  { piece: 'Bench', lx: -3.15, lz: 0.6, rot: Math.PI / 2, solid: [0.27, 1.39, 0.55] },
  { piece: 'Bench', lx: -1.45, lz: 0.6, rot: Math.PI / 2, solid: [0.27, 1.39, 0.55] },
  { piece: 'Mug', lx: -2.4, lz: 1.1, ly: 0.81, rot: 1 }, { piece: 'Table_Plate', lx: -2.2, lz: 0.1, ly: 0.81, rot: 0 },
  { piece: 'Table_Large', lx: 1.9, lz: 1.8, rot: 0, solid: [1.42, 0.55, 1] },
  { piece: 'Stool', lx: 1.0, lz: 2.6, rot: 0 }, { piece: 'Stool', lx: 2.8, lz: 2.6, rot: 0.6 }, { piece: 'Stool', lx: 2.0, lz: 1.0, rot: 0.3 },
  { piece: 'Mug', lx: 1.6, lz: 1.9, ly: 0.81, rot: 0 }, { piece: 'Candle_1', lx: 2.3, lz: 1.7, ly: 0.81, rot: 0 },
  // the bed the tavern lets, in the back corner, and its nightstand
  { piece: 'Bed_Twin1', lx: 3.0, lz: -3.6, rot: 0, solid: [0.94, 1.21, 0.8], bed: true },
  { piece: 'Nightstand_Shelf', lx: 1.75, lz: -4.55, rot: 0, solid: [0.35, 0.2, 1.2] },
  // light: the chandelier, a lantern by the door
  { piece: 'Chandelier', lx: 0, lz: 0, ly: 3.1, rot: 0 },
  { piece: 'Lantern_Wall', lx: -3.85, lz: 3.0, ly: 0.6, rot: Math.PI / 2 },
  { piece: 'Barrel_Apples', lx: -3.5, lz: -1.6, rot: 0, solid: [0.35, 0.35, 0.9] },
  { piece: 'Crate_Wooden', lx: 3.4, lz: 4.3, rot: 0.2, solid: [0.45, 0.45, 0.9] },
];
// from local (house) coordinates to the world
export function toWorld(b, lx, lz) {
  const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
  return [b.x + lx * c + lz * s, b.z - lx * s + lz * c];
}
export function tavern() { return buildings().find((b) => b.kind === 'tavern'); }

// ── trees and bushes ───────────────────────────────────────────────────────
// woodland: the map's deciduous woods to the west, wet woods east and south-east, pines on the ridge
export function woodland(x, z) {
  let w = fbm(x / 340, z / 340, SEED + 21) * 0.55 + 0.1;
  w += smoothstep(-200, -900, x) * 0.55;                       // west: the deciduous woods
  w += smoothstep(150, 800, x) * smoothstep(-300, 400, z) * 0.6;   // east and south-east: the wet woods
  const dr = Math.hypot(x - PLACES.ridge[0], z - PLACES.ridge[1]);
  w += smoothstep(420, 150, dr) * 0.55;
  const { s, n } = riverCoords(x, z);
  w -= smoothstep(260, 90, Math.abs(n)) * 0.35;               // the open valley floor
  return w;
}
export function trees() {
  const r = rng(SEED + 31), out = [];
  for (let k = 0; k < 26000 && out.length < 5200; k++) {
    const x = (r() * 2 - 1) * (HALF - 20), z = (r() * 2 - 1) * (HALF - 20);
    const w = woodland(x, z);
    if (r() > w * w * 1.25) continue;
    const { s, n } = riverCoords(x, z), a = Math.abs(n);
    if (a < RIVER.half + RIVER.bank + 3) continue;
    if (townWeight(s, a) > 0.05 || villageWeight(x, z) > 0.05) continue;
    if (roadDist(x, z) < 5) continue;
    const dh = Math.hypot(x - PLACES.hill[0], z - PLACES.hill[1]);
    if (dh < HILL.flat + 20) continue;                          // the hilltop stays open: the view
    const dr = Math.hypot(x - PLACES.ridge[0], z - PLACES.ridge[1]);
    const pine = n > 0 && (dr < 380 || r() < 0.25);
    const kind = pine ? 'pine' : r() < 0.2 ? 'birch' : 'oak';
    const size = 0.75 + r() * 0.6;
    out.push({ x, z, y: heightAt(x, z), kind, size, turn: r() * Math.PI * 2 });
  }
  return out;
}

// ── the ground's colour ─────────────────────────────────────────────────────
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const C = {
  grass: [0.34, 0.47, 0.22], grassDry: [0.48, 0.52, 0.27], heath: [0.42, 0.36, 0.30], heather: [0.45, 0.30, 0.38],
  wood: [0.24, 0.33, 0.16], mud: [0.33, 0.27, 0.19], road: [0.52, 0.44, 0.33], rock: [0.45, 0.44, 0.40], town: [0.46, 0.42, 0.34],
  wheat: [0.70, 0.62, 0.34], field: [0.40, 0.50, 0.24],
};
export function colourAt(x, z) {
  const { s, n } = riverCoords(x, z), a = Math.abs(n);
  const nv = fbm(x / 45, z / 45, SEED + 41);
  let c = mix(C.grass, C.grassDry, clamp(0.5 + nv * 0.8, 0, 1));
  // heath: the map's open "cold desert" round Stanlech - heather and bracken on the higher ground
  const heath = smoothstep(0.05, 0.35, fbm(x / 160, z / 160, SEED + 43)) * smoothstep(120, 300, a) * (1 - smoothstep(0.35, 0.8, woodland(x, z)));
  c = mix(c, nv > 0.1 ? C.heather : C.heath, heath * 0.7);
  // under the woods
  c = mix(c, C.wood, smoothstep(0.35, 0.9, woodland(x, z)) * 0.8);
  // fields: strips on the valley floor round the town, end-on to the river
  if (a > 160 && a < 420 && Math.abs(s) < 650 && townWeight(s, a) < 0.2) {
    const strip = Math.floor((s + 2000) / 34);
    const crop = vnoise(strip * 0.77, Math.floor(a / 90), SEED + 47);
    if (crop > 0.45) c = mix(c, crop > 0.72 ? C.wheat : C.field, 0.75);
  }
  // steep ground shows rock
  const nm = normalAt(x, z);
  c = mix(c, C.rock, smoothstep(0.86, 0.7, nm[1]));
  // the town's trodden ground, the river's mud
  c = mix(c, C.town, townWeight(s, a) * 0.75);
  c = mix(c, C.mud, smoothstep(RIVER.half + RIVER.bank + 4, RIVER.half + 1, a));
  // roads
  c = mix(c, C.road, smoothstep(1.2, -0.4, roadDist(x, z)));
  return c;
}

// for the opening: where Tariel, her father and Síofel stand on the hill, looking down at Stanlech
export function hillTop() {
  const [x, z] = PLACES.hill;
  const toward = Math.atan2(0 - x, 0 - z);   // yaw (about y) facing Stanlech
  return { x, z, y: heightAt(x, z), yaw: toward };
}
