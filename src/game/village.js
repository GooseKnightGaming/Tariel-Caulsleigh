// TARIEL CAULSLEIGH - houses built from the Medieval Village MegaKit (Quaternius, CC0), piece by piece on its
// 2 m grid: floors, walls (a door, windows), timber corners, ceilings, the roof and its gables; the tavern's
// room from the Fantasy Props MegaKit. All static, so the engine batches them by material.

import * as W from '../world/world.js';
import { Geo, vcMaterial } from './geo.js';
import { rng } from '../world/noise.js';

function loadKit(pc, app, url) {
  return new Promise((ok, no) => {
    const a = new pc.Asset(url, 'container', { url });
    app.assets.add(a);
    a.once('load', () => ok(a)); a.once('error', no);
    app.assets.load(a);
  });
}

const STYLES = {
  saes: {
    door: ['Wall_Plaster_Door_Flat', 'Wall_Plaster_Door_Round'],
    plain: ['Wall_Plaster_Straight', 'Wall_Plaster_WoodGrid', 'Wall_Plaster_Straight_Base'],
    window: ['Wall_Plaster_Window_Wide_Flat', 'Wall_Plaster_Window_Thin_Round', 'Wall_Plaster_Window_Wide_Round'],
    corner: 'Corner_Exterior_Wood', shutters: true, chimney: 'Prop_Chimney',
  },
  szetter: {
    door: ['Wall_UnevenBrick_Door_Flat', 'Wall_UnevenBrick_Door_Round'],
    plain: ['Wall_UnevenBrick_Straight'],
    window: ['Wall_UnevenBrick_Window_Wide_Flat', 'Wall_UnevenBrick_Window_Thin_Round', 'Wall_UnevenBrick_Window_Wide_Round'],
    corner: 'Corner_Exterior_Wood', shutters: false, chimney: 'Prop_Chimney2',
  },
};
// the glass and frame that go into each kind of window wall
const GLASS = { Window_Wide_Flat: 'Window_Wide_Flat1', Window_Thin_Round: 'Window_Thin_Round1', Window_Wide_Round: 'Window_Wide_Round1' };
const SHUTTER = { Window_Wide_Flat: 'WindowShutters_Wide_Flat_Open', Window_Thin_Round: 'WindowShutters_Thin_Round_Open' };

export async function buildVillage(pc, app) {
  const [village, props] = await Promise.all([loadKit(pc, app, 'assets/kit/Village.glb'), loadKit(pc, app, 'assets/kit/Props.glb')]);
  const tmplV = village.resource.instantiateRenderEntity({ castShadows: true, receiveShadows: true });
  const tmplP = props.resource.instantiateRenderEntity({ castShadows: true, receiveShadows: true });
  const pieces = new Map();
  for (const t of [tmplV, tmplP]) for (const c of t.children) pieces.set(c.name, c);
  const group = app.batcher.addGroup('village', false, 60);
  const root = new pc.Entity('village');
  app.root.addChild(root);
  let count = 0;
  const missing = new Set();
  // a piece, placed in a house's frame: local (lx, ly, lz), turned rot (radians) within the house
  const put = (name, b, lx, ly, lz, rot) => {
    const src = pieces.get(name);
    if (!src) { missing.add(name); return; }
    const e = src.clone();
    const [x, z] = W.toWorld(b, lx, lz);
    e.setPosition(x, b.y + ly, z);
    e.setEulerAngles(0, (b.yaw + (rot || 0)) * 57.29578, 0);
    for (const r of e.findComponents('render')) r.batchGroupId = group.id;
    root.addChild(e); count++;
  };
  const foundations = new Geo();
  for (const b of W.buildings()) {
    if (b.kind === 'well') continue;
    const st = STYLES[b.style] || STYLES.saes, r = rng(b.seed), pick = (list) => list[Math.floor(r() * list.length)];
    const Wd = b.w * 2, D = b.d * 2, H = b.storeys * W.STOREY;
    // the plinth: stone from below the ground up to the floor, so no house floats
    foundations.at(W.toWorld(b, 0, 0)[0], b.y, W.toWorld(b, 0, 0)[1], b.yaw);
    foundations.box(-Wd / 2 - 0.25, -2.5, -D / 2 - 0.25, Wd / 2 + 0.25, 0.02, D / 2 + 0.25, { top: [0.42, 0.40, 0.37], side: [0.48, 0.46, 0.42] });
    // floors, and the ceilings above each storey
    for (let i = 0; i < b.w; i++) for (let j = 0; j < b.d; j++) {
      const lx = -Wd / 2 + 1 + 2 * i, lz = -D / 2 + 1 + 2 * j;
      put(b.kind === 'tavern' ? 'Floor_WoodDark' : 'Floor_WoodLight', b, lx, 0.03, lz, 0);
      for (let k = 1; k <= b.storeys; k++) put('Floor_WoodDark', b, lx, k * W.STOREY, lz, 0);
    }
    // walls, storey by storey
    for (let k = 0; k < b.storeys; k++) {
      for (const cell of W.wallCells(b)) {
        let name;
        if (k === 0 && cell.door) name = pick(st.door);
        else if (k === 0 && cell.side !== 'front' && r() < 0.45) name = pick(st.plain);
        else name = r() < 0.75 ? pick(st.window) : pick(st.plain);
        put(name, b, cell.lx, k * W.STOREY, cell.lz, cell.rot);
        const kind = Object.keys(GLASS).find((g) => name.includes(g));
        if (kind) {
          put(GLASS[kind], b, cell.lx, k * W.STOREY, cell.lz, cell.rot);
          if (st.shutters && SHUTTER[kind] && r() < 0.6) put(SHUTTER[kind], b, cell.lx, k * W.STOREY, cell.lz, cell.rot);
        }
        if (k === 0 && cell.door) put('Door_1_Flat', b, cell.lx - 0.53, 0, cell.lz - 0.12, cell.rot - 1.75);   // open, swung in
      }
      for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) put(st.corner, b, (cx * Wd) / 2, k * W.STOREY, (cz * D) / 2, 0);
    }
    // the roof: the kit's roofs run their ridge front to back, gables at each end
    put(`Roof_RoundTiles_${Wd}x${D}`, b, 0, H, 0, 0);
    put(`Roof_Front_Brick${Wd}`, b, 0, H, D / 2, 0);
    put(`Roof_Front_Brick${Wd}`, b, 0, H, -D / 2, Math.PI);
    if (b.kind === 'tavern' || r() < 0.5) put(st.chimney, b, -Wd / 2 + 1.2, H + 0.6, -D / 4, 0);
    // the tavern's room
    if (b.kind === 'tavern') for (const f of W.TAVERN_ROOM) put(f.piece, b, f.lx, 0.03 + (f.ly || 0), f.lz, f.rot);
    // the guard post and toll house: a barrier on a post beside them, raised
    if (b.kind === 'post') {
      const [px, pz] = W.toWorld(b, Wd / 2 + 1.2, D / 2 + 0.6);
      foundations.at(px, W.heightAt(px, pz), pz, b.yaw);
      const red = b.style === 'saes';
      foundations.box(-0.12, 0, -0.12, 0.12, 1.2, 0.12, [0.30, 0.22, 0.15]);
      // the pole, pointing up at 70 degrees: drawn as a slim box tipped back
      for (let s = 0; s < 6; s++) {
        const t0 = s / 6, len = 5.4 / 6, y = 1.15 + Math.sin(1.22) * len * (s + 0.5), along = Math.cos(1.22) * len * (s + 0.5);
        foundations.box(along - 0.07, y - 0.45, -0.07, along + 0.07, y + 0.45, 0.07, s % 2 === 0 ? (red ? [0.72, 0.16, 0.12] : [0.12, 0.12, 0.12]) : [0.88, 0.86, 0.80]);
      }
    }
  }
  const fe = new pc.Entity('foundations');
  fe.addComponent('render', { meshInstances: [new pc.MeshInstance(foundations.mesh(pc, app.graphicsDevice), vcMaterial(pc, {}))], castShadows: true, receiveShadows: true });
  app.root.addChild(fe);
  if (missing.size) console.warn('[village] missing pieces:', [...missing].join(' '));
  console.log('[village]', count, 'pieces placed');
  return { root, count, missing };
}
