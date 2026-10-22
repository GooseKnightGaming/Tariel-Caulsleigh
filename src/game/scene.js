// TARIEL CAULSLEIGH - the valley made visible: the ground, the river, the woods, Stanlech and
// Shappel-ont'-Laik, the bridge, and the sky.

import * as W from '../world/world.js';
import { bridgeAt } from '../sim/walker.js';
import { Geo, vcMaterial, toLinear } from './geo.js';
import { rng } from '../world/noise.js';

// ── the ground: chunks of the height grid, coloured by vertex ─────────────
export function buildGround(pc, app) {
  const g = W.grid(), N = W.N, CH = 8, per = (N - 1) / CH;
  const mat = vcMaterial(pc, { gloss: 0.12 });
  const root = new pc.Entity('ground');
  // colours once for the whole grid (every vertex), normals from the heights
  const col = new Float32Array(N * N * 3);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const c = W.colourAt(-W.HALF + i * W.STEP, -W.HALF + j * W.STEP), k = (j * N + i) * 3;
    col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2];
  }
  for (let cj = 0; cj < CH; cj++) for (let ci = 0; ci < CH; ci++) {
    const i0 = ci * per, j0 = cj * per, n = per + 1;
    const pos = new Float32Array(n * n * 3), nor = new Float32Array(n * n * 3), cl = new Float32Array(n * n * 4), idx = new Uint32Array(per * per * 6);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const gi = i0 + i, gj = j0 + j, k = j * n + i, x = -W.HALF + gi * W.STEP, z = -W.HALF + gj * W.STEP;
      pos[k * 3] = x; pos[k * 3 + 1] = g[gj * N + gi]; pos[k * 3 + 2] = z;
      const hl = g[gj * N + Math.max(0, gi - 1)], hr = g[gj * N + Math.min(N - 1, gi + 1)], hd = g[Math.max(0, gj - 1) * N + gi], hu = g[Math.min(N - 1, gj + 1) * N + gi];
      let nx = hl - hr, ny = 2 * W.STEP, nz = hd - hu; const l = Math.hypot(nx, ny, nz); nor[k * 3] = nx / l; nor[k * 3 + 1] = ny / l; nor[k * 3 + 2] = nz / l;
      const ck = (gj * N + gi) * 3; cl[k * 4] = col[ck]; cl[k * 4 + 1] = col[ck + 1]; cl[k * 4 + 2] = col[ck + 2]; cl[k * 4 + 3] = 1;
    }
    let q = 0;
    for (let j = 0; j < per; j++) for (let i = 0; i < per; i++) {
      const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
      // split along a-d (the same diagonal heightAt uses), wound to face up
      idx[q++] = a; idx[q++] = d; idx[q++] = b; idx[q++] = a; idx[q++] = c; idx[q++] = d;
    }
    const m = new pc.Mesh(app.graphicsDevice);
    m.setPositions(pos); m.setNormals(nor); m.setColors(toLinear(cl)); m.setIndices(idx); m.update(pc.PRIMITIVE_TRIANGLES);
    const e = new pc.Entity('ground_' + ci + '_' + cj);
    const mi = new pc.MeshInstance(m, mat);
    e.addComponent('render', { meshInstances: [mi], castShadows: false, receiveShadows: true });
    root.addChild(e);
  }
  app.root.addChild(root);
  return root;
}

// ── the river: a ribbon of water along the Yolo's course ──────────────────
export function buildRiver(pc, app) {
  const geo = { p: [], n: [], c: [], i: [] }, half = W.RIVER.half + W.RIVER.bank;
  const STEPS = 260, s0 = -1500, s1 = 1500;
  for (let k = 0; k <= STEPS; k++) {
    const s = s0 + (s1 - s0) * (k / STEPS), y = W.waterLevel(s);
    for (const side of [-1, 1]) {
      const [x, z] = W.fromRiver(s, side * half);
      geo.p.push(x, y, z); geo.n.push(0, 1, 0);
      geo.c.push(0.22, 0.36, 0.38, 1);
    }
    if (k < STEPS) { const a = k * 2; geo.i.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const m = new pc.Mesh(app.graphicsDevice);
  m.setPositions(new Float32Array(geo.p)); m.setNormals(new Float32Array(geo.n)); m.setColors(new Float32Array(geo.c)); m.setIndices(new Uint32Array(geo.i));
  m.update(pc.PRIMITIVE_TRIANGLES);
  const mat = new pc.StandardMaterial();
  mat.diffuse = new pc.Color(0.16, 0.30, 0.33); mat.useMetalness = true; mat.metalness = 0.1; mat.gloss = 0.86;
  mat.opacity = 0.86; mat.blendType = pc.BLEND_NORMAL; mat.depthWrite = false; mat.cull = pc.CULLFACE_NONE;
  mat.update();
  const e = new pc.Entity('river');
  e.addComponent('render', { meshInstances: [new pc.MeshInstance(m, mat)], castShadows: false });
  app.root.addChild(e);
  return { entity: e, material: mat };
}

// ── trees: three kinds, each one instanced mesh ────────────────────────────
function treeGeo(kind) {
  const g = new Geo().at(0, 0, 0, 0);
  if (kind === 'pine') {
    g.cyl(0.22, 0.12, 0, 3, 5, [0.30, 0.22, 0.15]);
    g.cyl(2.6, 0.0, 2.0, 6.5, 7, [0.13, 0.24, 0.14]);
    g.cyl(2.0, 0.0, 4.4, 8.6, 7, [0.15, 0.27, 0.15]);
    g.cyl(1.3, 0.0, 6.6, 10.2, 7, [0.17, 0.30, 0.17]);
  } else if (kind === 'birch') {
    g.cyl(0.14, 0.08, 0, 5, 5, [0.82, 0.80, 0.74]);
    g.ball(0, 6.2, 0, 1.9, 2.6, 1.9, [0.42, 0.56, 0.24], 0.12, 2.1);
  } else {
    g.cyl(0.32, 0.2, 0, 3.4, 6, [0.32, 0.24, 0.16]);
    g.ball(0, 5.4, 0, 3.4, 2.9, 3.4, [0.24, 0.40, 0.17], 0.16, 1.3);
    g.ball(1.2, 6.6, 0.6, 2.0, 1.8, 2.0, [0.27, 0.44, 0.19], 0.14, 3.7);
  }
  return g;
}
export function buildTrees(pc, app, list) {
  const device = app.graphicsDevice, root = new pc.Entity('trees');
  const mat = vcMaterial(pc, { cull: false });
  for (const kind of ['oak', 'birch', 'pine']) {
    const these = list.filter((t) => t.kind === kind);
    if (!these.length) continue;
    const mesh = treeGeo(kind).mesh(pc, device);
    const data = new Float32Array(these.length * 16), m4 = new pc.Mat4(), q = new pc.Quat(), v = new pc.Vec3(), sc = new pc.Vec3();
    these.forEach((t, k) => {
      q.setFromEulerAngles(0, t.turn * 57.3, 0); v.set(t.x, t.y - 0.2, t.z); sc.set(t.size, t.size, t.size);
      m4.setTRS(v, q, sc); data.set(m4.data, k * 16);
    });
    const vb = new pc.VertexBuffer(device, pc.VertexFormat.getDefaultInstancingFormat(device), these.length, { data });
    const mi = new pc.MeshInstance(mesh, mat);
    mi.setInstancing(vb);
    mi.cull = false;
    const e = new pc.Entity('trees_' + kind);
    e.addComponent('render', { meshInstances: [mi], castShadows: true, receiveShadows: true });
    root.addChild(e);
  }
  app.root.addChild(root);
  return root;
}

// ── buildings, the bridge, the well ───────────────────────────────────────
const STYLE = {
  saes: { wall: [0.80, 0.74, 0.62], beam: [0.30, 0.22, 0.15], roof: [0.62, 0.53, 0.33], plinth: [0.46, 0.44, 0.40] },     // limewash, oak, thatch
  szetter: { wall: [0.62, 0.52, 0.40], beam: [0.20, 0.15, 0.11], roof: [0.30, 0.27, 0.27], plinth: [0.40, 0.38, 0.36] },  // ochre, dark timber, shingle
};
function houseInto(g, b) {
  const st = STYLE[b.style] || STYLE.saes, w = b.w, d = b.d, h = b.h;
  g.at(b.x, b.y - 0.6, b.z, b.yaw);
  g.box(-w / 2 - 0.15, 0, -d / 2 - 0.15, w / 2 + 0.15, 0.9, d / 2 + 0.15, st.plinth);
  g.box(-w / 2, 0.9, -d / 2, w / 2, h, d / 2, st.wall);
  // timber framing: corner posts, a rail at the first floor, the door
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) g.box(x - 0.14, 0.9, z - 0.14, x + 0.14, h, z + 0.14, st.beam);
  g.box(-w / 2 - 0.02, h * 0.55, d / 2 - 0.02, w / 2 + 0.02, h * 0.55 + 0.22, d / 2 + 0.06, st.beam);
  g.box(-w / 2 - 0.02, h * 0.55, -d / 2 - 0.06, w / 2 + 0.02, h * 0.55 + 0.22, -d / 2 + 0.02, st.beam);
  g.box(-0.6, 0.9, d / 2 - 0.02, 0.6, 2.9, d / 2 + 0.08, st.beam);                 // the door, on the street side
  for (const x of [-w / 4 - 0.5, w / 4 + 0.5]) g.box(x - 0.45, 1.8, d / 2, x + 0.45, 2.6, d / 2 + 0.06, [0.16, 0.14, 0.12]);   // windows
  const pitch = b.style === 'szetter' ? d * 0.85 : d * 0.62;
  g.roof(w, d, h, pitch, 0.5, st.roof, st.wall);
  if (b.kind === 'tavern') {
    // a sign on a bracket, and a chimney
    g.box(w / 2 - 0.2, h - 1.2, d / 2 + 0.1, w / 2 + 1.6, h - 1.05, d / 2 + 0.25, st.beam);
    g.box(w / 2 + 0.7, h - 2.4, d / 2 + 0.12, w / 2 + 1.5, h - 1.25, d / 2 + 0.22, [0.55, 0.20, 0.14]);
    g.box(-w / 2 + 1, h, -0.6, -w / 2 + 2.2, h + pitch + 1.2, 0.6, st.plinth);
  }
}
function postInto(g, b) {
  const st = STYLE[b.style] || STYLE.saes;
  g.at(b.x, b.y - 0.4, b.z, b.yaw);
  g.box(-b.w / 2, 0, -b.d / 2, b.w / 2, 3.2, b.d / 2, st.wall);
  g.roof(b.w, b.d, 3.2, b.d * 0.7, 0.35, st.roof, st.wall);
  // the barrier pole
  g.box(b.w / 2, 0.9, -0.08, b.w / 2 + 5.5, 1.08, 0.08, b.style === 'saes' ? [0.75, 0.2, 0.14] : [0.12, 0.12, 0.12]);
}
function wellInto(g, b) {
  g.at(b.x, b.y - 0.2, b.z, 0);
  g.cyl(1.1, 1.1, 0, 0.9, 8, [0.50, 0.48, 0.44], [0.05, 0.06, 0.08]);
  g.box(-1.0, 0.9, -0.08, -0.85, 2.6, 0.08, [0.30, 0.22, 0.15]);
  g.box(0.85, 0.9, -0.08, 1.0, 2.6, 0.08, [0.30, 0.22, 0.15]);
  g.box(-1.0, 2.5, -0.1, 1.0, 2.62, 0.1, [0.30, 0.22, 0.15]);
}
function bridgeInto(g) {
  const a = W.BRIDGE.from, b = W.BRIDGE.to, steps = 14, half = W.BRIDGE.w / 2;
  const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]);
  for (let k = 0; k < steps; k++) {
    const t0 = k / steps, t1 = (k + 1) / steps;
    const x0 = a[0] + (b[0] - a[0]) * t0, z0 = a[1] + (b[1] - a[1]) * t0, x1 = a[0] + (b[0] - a[0]) * t1, z1 = a[1] + (b[1] - a[1]) * t1;
    const y0 = bridgeAt(x0, z0), y1 = bridgeAt(x1, z1);
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ym = ((y0 === null ? y1 : y0) + (y1 === null ? y0 : y1)) / 2;
    g.at((x0 + x1) / 2, ym, (z0 + z1) / 2, yaw);
    g.box(-half, -0.35, -len / 2 - 0.05, half, 0, len / 2 + 0.05, { top: [0.42, 0.33, 0.24], side: [0.32, 0.25, 0.18] });
    // rails
    for (const sx of [-half + 0.1, half - 0.1]) g.box(sx - 0.08, 0, -len / 2, sx + 0.08, 1.0, len / 2, [0.30, 0.23, 0.16]);
  }
  // stone piers in the water
  for (const t of [0.3, 0.7]) {
    const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    g.at(x, W.heightAt(x, z) - 0.2, z, yaw);
    g.box(-half - 0.3, 0, -0.9, half + 0.3, (bridgeAt(x, z) || 30) - W.heightAt(x, z) - 0.1, 0.9, [0.48, 0.47, 0.44]);
  }
}
export function buildTowns(pc, app, list) {
  const g = new Geo();
  for (const b of list) {
    if (b.kind === 'house' || b.kind === 'tavern') houseInto(g, b);
    else if (b.kind === 'post') postInto(g, b);
    else if (b.kind === 'well') wellInto(g, b);
  }
  bridgeInto(g);
  const e = new pc.Entity('towns');
  e.addComponent('render', { meshInstances: [new pc.MeshInstance(g.mesh(pc, app.graphicsDevice), vcMaterial(pc, { cull: false }))], castShadows: true, receiveShadows: true });
  app.root.addChild(e);
  return e;
}

// ── the sky: a dome coloured from zenith to horizon, the sun and moon, stars ──
export function buildSky(pc, app) {
  const device = app.graphicsDevice, R = 1800, SEG = 24, RINGS = 12;
  const pos = [], idx = [], el = [];
  for (let r = 0; r <= RINGS; r++) {
    const a = -0.15 + (r / RINGS) * (Math.PI / 2 + 0.15);     // a little below the horizon to the top
    for (let s = 0; s <= SEG; s++) {
      const t = (s / SEG) * Math.PI * 2;
      pos.push(Math.cos(a) * Math.cos(t) * R, Math.sin(a) * R, Math.cos(a) * Math.sin(t) * R); el.push(Math.max(0, Math.sin(a)));
    }
  }
  for (let r = 0; r < RINGS; r++) for (let s = 0; s < SEG; s++) { const a = r * (SEG + 1) + s, b = a + SEG + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const mesh = new pc.Mesh(device);
  const cols = new Float32Array(pos.length / 3 * 4);
  mesh.setPositions(new Float32Array(pos)); mesh.setColors(cols); mesh.setIndices(new Uint32Array(idx)); mesh.update(pc.PRIMITIVE_TRIANGLES);
  const mat = new pc.StandardMaterial();
  mat.useLighting = false; mat.useFog = false; mat.useSkybox = false; mat.emissiveVertexColor = true; mat.emissive = new pc.Color(1, 1, 1);
  mat.diffuse = new pc.Color(0, 0, 0); mat.depthWrite = false; mat.cull = pc.CULLFACE_NONE; mat.update();
  const dome = new pc.Entity('sky');
  const mi = new pc.MeshInstance(mesh, mat); mi.drawOrder = -10;
  dome.addComponent('render', { meshInstances: [mi], castShadows: false, receiveShadows: false });
  app.root.addChild(dome);
  // the sun and moon: bright discs far off
  const disc = (name, col, size) => {
    const m = new pc.StandardMaterial(); m.useLighting = false; m.useFog = false; m.emissive = new pc.Color(...col); m.diffuse = new pc.Color(0, 0, 0);
    m.depthWrite = false; m.blendType = pc.BLEND_ADDITIVE; m.cull = pc.CULLFACE_NONE; m.update();
    const e = new pc.Entity(name); e.addComponent('render', { type: 'sphere', material: m, castShadows: false, receiveShadows: false });
    e.setLocalScale(size, size, size); app.root.addChild(e); return { e, m };
  };
  const sun = disc('sun', [1, 0.95, 0.8], 70), moon = disc('moon', [0.75, 0.78, 0.85], 40);
  // stars: small quads scattered over the upper dome
  const r = rng(77), sp = [], si = [], sc = [];
  for (let k = 0; k < 700; k++) {
    const t = r() * Math.PI * 2, a = Math.asin(0.08 + r() * 0.92), x = Math.cos(a) * Math.cos(t) * R * 0.95, y = Math.sin(a) * R * 0.95, z = Math.cos(a) * Math.sin(t) * R * 0.95;
    const s = 1.2 + r() * 2.2, b = 0.5 + r() * 0.5, base = sp.length / 3;
    sp.push(x - s, y, z, x + s, y, z, x, y + s, z, x, y - s, z);
    for (let q = 0; q < 4; q++) sc.push(b, b, b * 1.05, 1);
    si.push(base, base + 2, base + 1, base, base + 1, base + 3);
  }
  const smesh = new pc.Mesh(device); smesh.setPositions(new Float32Array(sp)); smesh.setColors(new Float32Array(sc)); smesh.setIndices(new Uint32Array(si)); smesh.update(pc.PRIMITIVE_TRIANGLES);
  const smat = new pc.StandardMaterial(); smat.useLighting = false; smat.useFog = false; smat.emissiveVertexColor = true; smat.emissive = new pc.Color(1, 1, 1);
  smat.diffuse = new pc.Color(0, 0, 0); smat.blendType = pc.BLEND_ADDITIVE; smat.depthWrite = false; smat.cull = pc.CULLFACE_NONE; smat.opacity = 1; smat.update();
  const stars = new pc.Entity('stars'); const smi = new pc.MeshInstance(smesh, smat); smi.drawOrder = -9;
  stars.addComponent('render', { meshInstances: [smi], castShadows: false, receiveShadows: false });
  app.root.addChild(stars);
  return {
    dome, stars, sun, moon,
    // colour the dome for this moment, and follow the camera
    update(sky, camPos) {
      for (let k = 0; k < el.length; k++) {
        const t = Math.pow(el[k], 0.6);
        cols[k * 4] = sky.horizon[0] + (sky.zenith[0] - sky.horizon[0]) * t;
        cols[k * 4 + 1] = sky.horizon[1] + (sky.zenith[1] - sky.horizon[1]) * t;
        cols[k * 4 + 2] = sky.horizon[2] + (sky.zenith[2] - sky.horizon[2]) * t;
        cols[k * 4 + 3] = 1;
      }
      for (let k = 0; k < cols.length; k++) if ((k & 3) !== 3) cols[k] = Math.pow(cols[k], 2.2);
      mesh.setColors(cols); mesh.update(pc.PRIMITIVE_TRIANGLES, false);
      dome.setPosition(camPos.x, camPos.y - 40, camPos.z);
      stars.setPosition(camPos.x, camPos.y - 40, camPos.z);
      smat.emissive = new pc.Color(sky.stars, sky.stars, sky.stars); smat.update();
      stars.enabled = sky.stars > 0.02;
      const D = 1500;
      sun.e.setPosition(camPos.x + sky.sun[0] * D, camPos.y + sky.sun[1] * D, camPos.z + sky.sun[2] * D);
      sun.e.enabled = sky.sun[1] > -0.05;
      moon.e.setPosition(camPos.x + sky.moon[0] * D, camPos.y + sky.moon[1] * D, camPos.z + sky.moon[2] * D);
      moon.e.enabled = sky.moon[1] > -0.05;
    },
  };
}
