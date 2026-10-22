// TARIEL CAULSLEIGH - what you cannot walk (or see) through: walls, posts, the well, tree trunks, ceilings;
// and the floors you stand on inside houses. Pure (tested in node).
// A solid is an upright box turned yaw about y: centre (x, z), half-sizes (hx, hz), from y0 to y1.

import { buildings, wallCells, trees, STOREY, PLACES, TAVERN_ROOM } from './world.js';

const CELL = 16;
let INDEX = null, FLOORS = null;

function addBox(list, b, lx, lz, hx, hz, y0, y1) {
  const c = Math.cos(b.yaw), s = Math.sin(b.yaw);
  list.push({ x: b.x + lx * c + lz * s, z: b.z - lx * s + lz * c, yaw: b.yaw, c, s, hx, hz, y0: b.y + y0, y1: b.y + y1 });
}
export function solidList() {
  const out = [];
  for (const b of buildings()) {
    if (b.kind === 'well') { out.push({ x: b.x, z: b.z, yaw: 0, c: 1, s: 0, hx: 1.15, hz: 1.15, y0: b.y - 1, y1: b.y + 2.7 }); continue; }
    const H = b.storeys * STOREY, W = b.w * 2, D = b.d * 2, T = 0.22;
    for (const cell of wallCells(b)) {
      const along = cell.side === 'front' || cell.side === 'back';
      if (cell.door) {
        // the doorway: wall either side of a 1.1 m opening, and over it
        for (const k of [-1, 1]) addBox(out, b, cell.lx + k * 0.8, cell.lz, 0.2, T, -1, H);
        addBox(out, b, cell.lx, cell.lz, 1, T, 2.3, H);
      } else if (along) addBox(out, b, cell.lx, cell.lz, 1, T, -1, H);
      else addBox(out, b, cell.lx, cell.lz, T, 1, -1, H);
    }
    // the ceiling of the ground floor (and the roof above it): the camera stays inside, under it
    addBox(out, b, 0, 0, W / 2, D / 2, STOREY - 0.15, H + 6);
    // the tavern's furniture
    if (b.kind === 'tavern') for (const f of TAVERN_ROOM) if (f.solid) {
      const c = Math.cos(f.rot), s = Math.sin(f.rot);
      // a turned piece: its half-sizes swap when it is turned a quarter
      const q = Math.abs(s) > 0.7;
      addBox(out, b, f.lx, f.lz, q ? f.solid[1] : f.solid[0], q ? f.solid[0] : f.solid[1], 0, f.solid[2]);
    }
  }
  // tree trunks
  for (const t of trees()) out.push({ x: t.x, z: t.z, yaw: 0, c: 1, s: 0, hx: 0.3 * t.size, hz: 0.3 * t.size, y0: t.y - 1, y1: t.y + 4 });
  return out;
}
// the floors of houses: you stand on them, not on the ground under them
export function floorList() {
  if (FLOORS) return FLOORS;
  FLOORS = buildings().filter((b) => b.kind !== 'well').map((b) => ({ x: b.x, z: b.z, c: Math.cos(b.yaw), s: Math.sin(b.yaw), hx: b.w, hz: b.d, y: b.y }));
  return FLOORS;
}
function index() {
  if (INDEX) return INDEX;
  INDEX = new Map();
  for (const sd of solidList()) {
    const r = Math.hypot(sd.hx, sd.hz);
    for (let i = Math.floor((sd.x - r) / CELL); i <= Math.floor((sd.x + r) / CELL); i++)
      for (let j = Math.floor((sd.z - r) / CELL); j <= Math.floor((sd.z + r) / CELL); j++) {
        const k = i + ',' + j; if (!INDEX.has(k)) INDEX.set(k, []); INDEX.get(k).push(sd);
      }
  }
  return INDEX;
}
// is (x, z) within radius of a solid between heights y0 and y1?
export function blocked(x, z, rad, y0, y1) {
  const list = index().get(Math.floor(x / CELL) + ',' + Math.floor(z / CELL));
  if (!list) return null;
  for (const sd of list) {
    if (y1 <= sd.y0 || y0 >= sd.y1) continue;
    const dx = x - sd.x, dz = z - sd.z;
    const lx = dx * sd.c - dz * sd.s, lz = dx * sd.s + dz * sd.c;
    if (Math.abs(lx) < sd.hx + rad && Math.abs(lz) < sd.hz + rad) return sd;
  }
  return null;
}
// the floor under (x, z), if inside a house
export function floorAt(x, z) {
  for (const f of floorList()) {
    const dx = x - f.x, dz = z - f.z;
    if (Math.abs(dx) > 12 || Math.abs(dz) > 12) continue;
    const lx = dx * f.c - dz * f.s, lz = dx * f.s + dz * f.c;
    if (Math.abs(lx) < f.hx && Math.abs(lz) < f.hz) return f.y;
  }
  return null;
}
// the camera: how far along from (a) towards (b) it can go before something is in the way (0..1)
export function clearTo(a, b, rad) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(1, Math.ceil(d / 0.2));
  for (let k = 1; k <= n; k++) {
    const t = k / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t, z = a[2] + (b[2] - a[2]) * t;
    if (blocked(x, z, rad, y - rad, y + rad)) return Math.max(0, (k - 1) / n - 0.02);
  }
  return 1;
}
export { PLACES };
