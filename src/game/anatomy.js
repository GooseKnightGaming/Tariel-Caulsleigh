// TARIEL CAULSLEIGH - the shapes of a drawn person: smooth, rounded lofted forms (shoulders, waist, bent limbs, a proper
// head with a face, hair, braids, puffed sleeves, a laced bodice, a draped skirt), all built in code. No asset packs.
// Everything is modelled at 1.75 m, feet at y = 0, facing -z; figure.js scales it to the person.
//
// Joints: the body hangs from the hips (HIP); an arm hangs from the shoulder and its forearm from the elbow; a leg from
// the hip and its shin from the knee. Each part's mesh is in its own joint's coordinates.

import { Geo, ring } from './geo.js';

export const HIP = 0.84, SHOULDER = 1.365, ARM_X = 0.205, UPPER_ARM = 0.27, THIGH = 0.42, ANKLE = 0.06;

const lerp = (a, b, t) => a + (b - a) * t;
const dark = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const clamp01 = (x) => Math.max(0, Math.min(1, x));
// piecewise-linear lookup: pts = [[y, a, b, ...]] sorted by y
function prof(pts) {
  return (y) => {
    if (y <= pts[0][0]) return pts[0].slice(1);
    for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) {
      const t = (y - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
      return pts[i].slice(1).map((v, k) => lerp(pts[i - 1][k + 1], v, t));
    }
    return pts[pts.length - 1].slice(1);
  };
}
// a tube: rings from y0 to y1 (steps), radius rx/rz and centre from profile(y) -> [rx, rz, cz]
function tube(g, y0, y1, steps, n, P, col, o) {
  const rings = [];
  for (let i = 0; i <= steps; i++) { const y = lerp(y0, y1, i / steps), p = P(y); rings.push(ring(p[3] || 0, y, p[2] === undefined ? 0 : p[2], p[0], p[1] === undefined ? p[0] : p[1], n)); }
  g.loft(rings, col, o);
}

// how the torso is shaped (y, half-width, half-depth, centre z)
function torsoProfile(L) {
  const m = L.female ? 1 : 1.1, b = L.female ? 1 : 0;
  return prof([[0.78, 0.165 * m, 0.115, 0], [0.92, 0.168 * m, 0.116, 0], [1.02, 0.128 * m, 0.094, 0], [1.12, 0.130 * m, 0.096 + 0.004 * (1 - b), 0],
    [1.22, 0.146 * m, 0.100 + 0.010 * (1 - b), -0.006 * (1 - b)], [1.31, 0.160 * m, 0.094, 0], [1.38, 0.178 * m, 0.082, 0], [1.425, 0.100, 0.060, 0]]);
}

// the long skirt of a dress, or the short skirt of a tunic: radius by height
function skirtProfile(L) {
  return L.dress
    ? prof([[0.09, 0.395], [0.30, 0.355], [0.55, 0.295], [0.75, 0.240], [0.90, 0.185], [1.03, 0.138]])
    : prof([[0.60, 0.285], [0.78, 0.225], [0.92, 0.180], [1.03, 0.142]]);
}
const skirtWobble = (th, y, hem) => 1 + 0.045 * Math.sin(th * 7 + y * 4) * clamp01((1.0 - y) / (1.0 - hem));

function buildSkirt(g, L) {
  const R = skirtProfile(L), hem = L.dress ? 0.09 : 0.60, rings = [], S = 14, N = 28;
  for (let i = 0; i <= S; i++) {
    const y = lerp(1.03, hem, i / S), r = R(y)[0], row = [];
    for (let k = 0; k < N; k++) { const th = (k / N) * Math.PI * 2, w = r * skirtWobble(th, y, hem); row.push([Math.sin(th) * w * 1.0, y, -Math.cos(th) * w * 0.93]); }
    rings.push(row);
  }
  const base = L.skirt, hemc = L.hemTrim;
  g.loft(rings, (x, y) => {
    let c = mix(base, dark(base, 0.8), clamp01((1.03 - y) / 0.95));
    if (hemc && y < hem + 0.025) c = hemc;
    return c;
  });
  if (L.dress && L.over) {                                 // the overskirt: caught up at one hip, hem swagged
    const O = [], OS = 9, ON = 28;
    for (let i = 0; i <= OS; i++) {
      const row = [];
      for (let k = 0; k < ON; k++) {
        const th = (k / ON) * Math.PI * 2;
        const hemY = 0.50 + 0.15 * Math.cos(th - 2.3) + 0.05 * Math.sin(th * 3 + 0.7), y = lerp(1.0, hemY, i / OS), r = R(y)[0] * skirtWobble(th, y, 0.09) + 0.012 + 0.03 * (i / OS);
        row.push([Math.sin(th) * r, y, -Math.cos(th) * r * 0.93]);
      }
      O.push(row);
    }
    g.loft(O, (x, y) => mix(L.over, dark(L.over, 0.72), clamp01((1.0 - y) / 0.5) * 0.7));
  }
}

const K = 1.12, HY0 = 1.595;
// a head part: placed and sized relative to the head, then the whole head a little bigger (a stylised, friendlier proportion)
function E(g, x, y, z, rx, ry, rz, col, o) { g.ellipsoid(x * K, HY0 + (y - HY0) * K, z * K, rx * K, ry * K, rz * K, col, o); }

function buildHead(g, L) {
  const sk = L.skin, skd = dark(sk, 0.88), HY = 1.595;
  // neck
  tube(g, 1.40, 1.53, 3, 10, () => [0.047, 0.047, 0.004], dark(sk, 0.93));
  // head: a rounded skull with a narrower jaw
  E(g, 0, HY, -0.004, 0.103, 0.126, 0.113, (x, y) => mix(sk, [0.96, 0.62, 0.55], clamp01((0.045 - Math.hypot(x + 0, 0)) * 0) * 0), { lat: 9, lon: 14, w: (ph) => (ph < 0 ? 1 - 0.20 * Math.pow(-ph / (Math.PI / 2), 1.3) : 1) });
  E(g, -0.103, HY - 0.012, 0.0, 0.014, 0.026, 0.016, skd, { lat: 4, lon: 6 });      // ears
  E(g, 0.103, HY - 0.012, 0.0, 0.014, 0.026, 0.016, skd, { lat: 4, lon: 6 });
  E(g, 0, HY - 0.020, -0.111, 0.014, 0.020, 0.016, dark(sk, 0.96), { lat: 4, lon: 7 });  // nose
  E(g, 0, HY - 0.056, -0.1, 0.022, 0.0075, 0.011, L.lips, { lat: 3, lon: 8 });           // mouth
  E(g, 0, HY - 0.083, -0.088, 0.032, 0.016, 0.02, dark(sk, 0.97), { lat: 3, lon: 8 });   // chin
  for (const sx of [-1, 1]) {
    E(g, sx * 0.040, HY + 0.004, -0.101, 0.0225, 0.0155, 0.01, [0.96, 0.95, 0.93], { lat: 4, lon: 8 });     // eye white
    E(g, sx * 0.040, HY + 0.004, -0.108, 0.0125, 0.0125, 0.006, L.eyes, { lat: 4, lon: 8 });                 // iris
    E(g, sx * 0.040, HY + 0.004, -0.1125, 0.0058, 0.0058, 0.004, [0.05, 0.05, 0.06], { lat: 3, lon: 6 });    // pupil
    E(g, sx * 0.040, HY + 0.026, -0.098, 0.026, 0.0065, 0.008, dark(L.hair, L.hair[0] > 0.8 ? 0.8 : 1), { lat: 3, lon: 8 });  // brow
  }
  buildHair(g, L, HY);
}

function buildHair(g, L, HY) {
  const h = L.hair, hd = dark(h, 0.82), hl = dark(h, 1.0), S = L.style;
  const shade = (x, y, z) => mix(hd, h, clamp01((y - (HY - 0.12)) / 0.22));
  const top = (grow) => E(g, 0, HY + 0.006, 0.008, 0.103 * grow, 0.126 * grow, 0.117 * grow, shade, { lat: 6, lon: 14, phi0: 0.28, phi1: Math.PI / 2 });
  const sides = (grow, p0, t0) => E(g, 0, HY + 0.006, 0.014, 0.103 * grow, 0.126 * grow, 0.117 * grow, shade, { lat: 6, lon: 12, phi0: p0, phi1: 0.55, t0: t0, t1: Math.PI * 2 - t0 });
  if (S === 'bald') {                                      // grey tufts above the ears, and a moustache
    for (const sx of [-1, 1]) E(g, sx * 0.098, HY - 0.012, 0.02, 0.014, 0.05, 0.06, hd, { lat: 5, lon: 6 });
    E(g, 0, HY - 0.040, -0.106, 0.043, 0.0115, 0.019, hd, { lat: 3, lon: 8 });
    return;
  }
  if (S === 'helmet') {
    E(g, 0, HY + 0.012, 0.004, 0.118, 0.12, 0.128, (x, y) => mix([0.42, 0.43, 0.46], [0.66, 0.67, 0.70], clamp01((y - 1.55) / 0.2)), { lat: 6, lon: 14, phi0: -0.05, phi1: Math.PI / 2 });
    g.box(-0.012, HY - 0.07, -0.133, 0.012, HY + 0.07, -0.118, [0.42, 0.43, 0.46]);                   // the nasal bar
    return;
  }
  if (S === 'cap') {
    E(g, 0, HY + 0.012, 0.0, 0.112, 0.092, 0.122, L.cap, { lat: 5, lon: 12, phi0: 0.1, phi1: Math.PI / 2 });
    g.box(-0.07, HY + 0.045, -0.178, 0.07, HY + 0.056, -0.10, dark(L.cap, 0.75));
    sides(1.03, -0.45, 1.25);
    return;
  }
  top(1.05); sides(1.05, -0.55, 1.1);
  if (S === 'short') return;
  if (S === 'long') {
    g.ellipsoid(0, HY - 0.15, 0.095, 0.125, 0.21, 0.056, shade, { lat: 6, lon: 10 });
    return;
  }
  // 'braid': a side-swept fringe, a long lock by one cheek, and a plait down the back
  E(g, 0.01, HY + 0.062, -0.082, 0.098, 0.052, 0.050, h, { lat: 5, lon: 10 });
  E(g, -0.052, HY + 0.040, -0.105, 0.040, 0.030, 0.026, hl, { lat: 4, lon: 8 });
  E(g, -0.100, HY - 0.040, 0.012, 0.018, 0.080, 0.058, h, { lat: 5, lon: 8 });           // the lock at her left cheek
  E(g, 0.100, HY - 0.035, 0.016, 0.018, 0.070, 0.058, h, { lat: 5, lon: 8 });
  const tie = [0.30, 0.22, 0.16];
  for (let k = 0; k < 15; k++) {                                                                   // the plait: fifteen twists, tapering
    const t = k / 14, y = lerp(1.490, 0.960, t), z = lerp(0.128, 0.162, Math.sin(t * 2.4) * 0.8 + 0.15), r = lerp(0.052, 0.030, t);
    g.ellipsoid((k % 2 ? 0.012 : -0.012) * (1 - t * 0.6), y, z, r, 0.031, r * 0.9, k % 2 ? dark(h, 0.84) : h, { lat: 4, lon: 8 });
  }
  g.ellipsoid(0, 0.945, 0.165, 0.034, 0.016, 0.034, tie, { lat: 3, lon: 8 });
  g.ellipsoid(0, 0.915, 0.168, 0.026, 0.034, 0.024, h, { lat: 4, lon: 8 });
}

// the torso: skin at the neckline, bodice or tunic, belt, skirt, and the head on top of it all
export function buildBody(L) {
  const g = new Geo().at(0, -HIP, 0, 0), sk = L.skin, T = torsoProfile(L), tun = L.tunic;
  const leather = [0.17, 0.13, 0.10];
  tube(g, 0.80, 1.43, 44, 32, T, (x, y, z) => {
    if (L.female) {
      const neck = z < 0 ? 1.385 - 0.075 * Math.max(0, 1 - (x / 0.115) * (x / 0.115)) : 1.385;
      if (y > neck) return sk;
      if (z < 0 && Math.abs(x) < 0.031 && y > 1.06 && y < 1.335 && L.laces) return leather;
      return mix(dark(tun, 0.88), tun, clamp01((y - 1.0) / 0.3));
    }
    if (y > 1.395) return sk;
    return tun;
  });
  buildSkirt(g, L);
  // the belt, with a buckle at the front
  const bz = T(1.02)[1], bx = T(1.02)[0];
  g.loft([0.985, 0.995, 1.045, 1.055].map((y, i) => ring(0, y, 0, bx + (i % 3 ? 0.014 : 0.008), bz + (i % 3 ? 0.014 : 0.008), 32)), L.belt);
  g.box(-0.028, 0.987, -bz - 0.030, 0.028, 1.053, -bz - 0.012, [0.74, 0.74, 0.76]);
  g.box(-0.016, 0.998, -bz - 0.033, 0.016, 1.042, -bz - 0.026, dark(L.belt, 0.9));
  if (L.female && L.laces) {                                                                       // criss-cross lacing down the bodice
    const cream = [0.90, 0.87, 0.74];
    for (let j = 0; j < 6; j++) {
      const y0 = 1.085 + j * 0.042, y1 = y0 + 0.042, z0 = -T(y0)[1] - 0.004, z1 = -T(y1)[1] - 0.004;
      for (const s of [1, -1]) g.quad([-0.028 * s, y0, z0], [-0.028 * s + 0.011, y0, z0], [0.028 * s + 0.011, y1, z1], [0.028 * s, y1, z1], cream);
    }
  }
  if (L.extra === 'apron') g.box(-0.125, 0.60, -T(1.0)[1] - 0.045, 0.125, 1.28, -T(1.0)[1] - 0.022, [0.88, 0.86, 0.78]);
  if (L.extra === 'guard') {                                                                       // a tabard badge on the chest
    g.box(-0.052, 1.12, -T(1.2)[1] - 0.020, 0.052, 1.32, -T(1.2)[1] - 0.008, [0.82, 0.72, 0.34]);
    g.box(-0.012, 1.14, -T(1.2)[1] - 0.024, 0.012, 1.30, -T(1.2)[1] - 0.018, [0.55, 0.12, 0.10]);
  }
  buildHead(g, L);
  if (L.extra === 'hat') {                                                                         // a stallholder's wide straw hat
    const brim = [[1.722, 0.20], [1.734, 0.19], [1.738, 0.13]].map(([y, r]) => ring(0, y, 0, r, r, 18));
    g.loft(brim, [0.66, 0.54, 0.32]);
    g.ellipsoid(0, 1.738, 0, 0.118, 0.07, 0.122, [0.60, 0.48, 0.28], { lat: 4, lon: 14, phi0: 0, phi1: Math.PI / 2 });
  }
  return g;
}

// an arm, hanging from the shoulder (y = 0 there): skin arm under a sleeve; the sleeve is puffed and striped on a dress
export function buildArm(L, right) {
  const g = new Geo().at(0, 0, 0, 0), sk = L.skin, tun = L.sleeve;
  tube(g, 0.02, -UPPER_ARM, 4, 10, (y) => { const t = clamp01(-y / UPPER_ARM); return [lerp(0.055, 0.043, t)]; }, sk);
  const SL = L.puff
    ? [[0.052, 0.030], [0.040, 0.060], [0.012, 0.074], [-0.030, 0.082], [-0.075, 0.075], [-0.105, 0.050], [-0.122, 0.056], [-0.140, 0.057]]
    : [[0.030, 0.058], [-0.04, 0.054], [-0.15, 0.050], [-0.24, 0.046], [-0.27, 0.046]];
  const rings = SL.map(([y, r]) => ring(0, y, 0, r, r, 16));
  if (L.puff) g.loft(rings, (x, y, z) => {
    const stripe = Math.sin(Math.atan2(x, z) * 6) > 0.1 && y < 0.03 && y > -0.1;
    return y < -0.118 ? dark(tun, 1.12) : stripe ? dark(tun, 0.68) : tun;
  });
  else g.loft(rings, tun);
  if (right && L.extra === 'guard') {}                                                              // (the spear is on the forearm)
  return g;
}
// the forearm, hanging from the elbow, with the hand
export function buildFore(L, right) {
  const g = new Geo().at(0, 0, 0, 0), sk = L.skin;
  tube(g, 0.005, -0.235, 4, 10, (y) => [lerp(0.043, 0.031, clamp01(-y / 0.235))], (x, y) => (!L.puff && L.longSleeve && y > -0.17) ? L.sleeve : sk);
  g.ellipsoid(0, -0.285, -0.004, 0.027, 0.050, 0.020, dark(sk, 1.0), { lat: 5, lon: 8 });             // the hand
  g.ellipsoid(-0.018 * (right ? -1 : 1), -0.268, -0.014, 0.008, 0.022, 0.009, sk, { lat: 3, lon: 6 });  // the thumb
  if (right && L.extra === 'guard') {                                                                 // a spear, held upright beside her
    g.cyl(0.016, 0.016, -0.62, 1.28, 6, [0.46, 0.34, 0.20]);
    g.ellipsoid(0, 1.36, 0, 0.026, 0.09, 0.012, [0.74, 0.75, 0.78], { lat: 4, lon: 6 });
  }
  return g;
}
// the thigh, hanging from the hip; the shin from the knee, with the foot
export function buildThigh(L) {
  const g = new Geo().at(0, 0, 0, 0);
  tube(g, 0.02, -THIGH, 4, 10, (y) => [lerp(0.080, 0.058, clamp01(-y / THIGH))], L.dress ? L.skin : L.trousers);
  return g;
}
export function buildShin(L) {
  const g = new Geo().at(0, 0, 0, 0), len = HIP - THIGH - ANKLE;
  const boots = !L.barefoot && !(L.dress && !L.boots);
  tube(g, 0.012, -len, 6, 10, (y) => { const t = clamp01(-y / len); return [boots && y < -0.14 ? lerp(0.060, 0.050, t) : lerp(0.058, 0.036, t)]; },
    (x, y) => (boots && y < -0.12) ? L.bootCol : (L.dress ? L.skin : L.trousers));
  const foot = boots ? L.bootCol : L.skin;
  g.ellipsoid(0, -len - 0.024, -0.050, 0.044, 0.032, 0.105, foot, { lat: 4, lon: 10 });
  if (!boots) g.ellipsoid(0, -len - 0.030, -0.130, 0.036, 0.016, 0.030, dark(L.skin, 0.96), { lat: 3, lon: 8 });   // the toes
  return g;
}

export function buildParts(pc, device, L) {
  const m = (g) => g.mesh(pc, device);
  return {
    body: m(buildBody(L)), armL: m(buildArm(L, false)), armR: m(buildArm(L, true)), foreL: m(buildFore(L, false)), foreR: m(buildFore(L, true)),
    legL: m(buildThigh(L)), legR: m(buildThigh(L)), shinL: m(buildShin(L)), shinR: m(buildShin(L)),
  };
}
