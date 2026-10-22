// TARIEL CAULSLEIGH - building meshes out of simple shapes, coloured by vertex (the low-poly, painted look).
// A Geo gathers triangles (positions, normals, colours) under a transform stack, then becomes one pc.Mesh.

export class Geo {
  constructor() { this.p = []; this.n = []; this.c = []; this.i = []; this.m = [1, 0, 0, 0, 1, 0, 0, 0, 1]; this.t = [0, 0, 0]; }
  // place what follows: at (x, y, z), turned yaw about y (radians)
  at(x, y, z, yaw) { const c = Math.cos(yaw || 0), s = Math.sin(yaw || 0); this.m = [c, 0, -s, 0, 1, 0, s, 0, c]; this.t = [x, y, z]; return this; }
  tf(v) { const m = this.m; return [m[0] * v[0] + m[3] * v[1] + m[6] * v[2] + this.t[0], m[1] * v[0] + m[4] * v[1] + m[7] * v[2] + this.t[1], m[2] * v[0] + m[5] * v[1] + m[8] * v[2] + this.t[2]]; }
  tn(v) { const m = this.m; return [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]]; }
  // a flat-shaded triangle (local coordinates)
  tri(a, b, c, col) {
    const A = this.tf(a), B = this.tf(b), Cc = this.tf(c);
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = Cc[0] - A[0], vy = Cc[1] - A[1], vz = Cc[2] - A[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const k = this.p.length / 3;
    this.p.push(...A, ...B, ...Cc); this.n.push(nx, ny, nz, nx, ny, nz, nx, ny, nz);
    for (let q = 0; q < 3; q++) this.c.push(col[0], col[1], col[2], 1);
    this.i.push(k, k + 1, k + 2);
  }
  quad(a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); }
  // an axis-aligned box from (x0,y0,z0) to (x1,y1,z1); cols: one colour, or { top, side }
  box(x0, y0, z0, x1, y1, z1, col) {
    const top = col.top || col, side = col.side || col, bot = col.bottom || side;
    const v = (x, y, z) => [x, y, z];
    this.quad(v(x0, y1, z0), v(x0, y1, z1), v(x1, y1, z1), v(x1, y1, z0), top);
    this.quad(v(x0, y0, z1), v(x0, y0, z0), v(x1, y0, z0), v(x1, y0, z1), bot);
    this.quad(v(x0, y0, z1), v(x1, y0, z1), v(x1, y1, z1), v(x0, y1, z1), side);
    this.quad(v(x1, y0, z0), v(x0, y0, z0), v(x0, y1, z0), v(x1, y1, z0), side);
    this.quad(v(x1, y0, z1), v(x1, y0, z0), v(x1, y1, z0), v(x1, y1, z1), side);
    this.quad(v(x0, y0, z0), v(x0, y0, z1), v(x0, y1, z1), v(x0, y1, z0), side);
  }
  // a pitched roof over a w x d footprint at height y, ridge along x, rising h; overhang o
  roof(w, d, y, h, o, col, gable) {
    const x0 = -w / 2 - o, x1 = w / 2 + o, z0 = -d / 2 - o, z1 = d / 2 + o;
    this.quad([x0, y, z1], [x1, y, z1], [x1, y + h, 0], [x0, y + h, 0], col);
    this.quad([x1, y, z0], [x0, y, z0], [x0, y + h, 0], [x1, y + h, 0], col);
    const g = gable || col;
    this.tri([-w / 2, y, d / 2], [-w / 2, y + h * (d / 2) / (d / 2 + o), 0], [-w / 2, y, -d / 2], g);
    this.tri([w / 2, y, -d / 2], [w / 2, y + h * (d / 2) / (d / 2 + o), 0], [w / 2, y, d / 2], g);
  }
  // an n-sided upright prism (a trunk, a post): radius r0 at y0 to r1 at y1
  cyl(r0, r1, y0, y1, sides, col, cap) {
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2, b = ((k + 1) / sides) * Math.PI * 2;
      const p = (r, y, t) => [Math.cos(t) * r, y, Math.sin(t) * r];
      this.quad(p(r0, y0, b), p(r0, y0, a), p(r1, y1, a), p(r1, y1, b), col);
      if (cap && r1 > 0.001) this.tri(p(r1, y1, b), p(r1, y1, a), [0, y1, 0], cap);
    }
  }
  // a rough ball (a tree's crown): an octahedron subdivided once, pushed out a little by `lumps`
  ball(cx, cy, cz, rx, ry, rz, col, lumps, seed) {
    const base = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const faces = [[2, 4, 0], [2, 0, 5], [2, 5, 1], [2, 1, 4], [3, 0, 4], [3, 5, 0], [3, 1, 5], [3, 4, 1]];
    const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
    const bump = (v) => { const h = Math.sin(v[0] * 7.1 + seed) * Math.cos(v[2] * 6.3 + seed * 1.7) * (lumps || 0); return [cx + v[0] * rx * (1 + h), cy + v[1] * ry * (1 + h), cz + v[2] * rz * (1 + h)]; };
    for (const [a, b, c] of faces) {
      const A = base[a], B = base[b], C = base[c];
      const ab = norm([A[0] + B[0], A[1] + B[1], A[2] + B[2]]), bc = norm([B[0] + C[0], B[1] + C[1], B[2] + C[2]]), ca = norm([C[0] + A[0], C[1] + A[1], C[2] + A[2]]);
      const shade = (v, k) => [col[0] * k, col[1] * k, col[2] * k];
      const sh = (v) => 0.82 + 0.18 * v[1];
      for (const [p, q, r] of [[A, ab, ca], [ab, B, bc], [ca, bc, C], [ab, bc, ca]]) this.tri(bump(p), bump(q), bump(r), shade(0, sh(norm([p[0] + q[0] + r[0], p[1] + q[1] + r[1], p[2] + q[2] + r[2]]))));
    }
  }
  get count() { return this.i.length / 3; }
  // into a mesh for the device
  mesh(pc, device) {
    const m = new pc.Mesh(device);
    m.setPositions(new Float32Array(this.p));
    m.setNormals(new Float32Array(this.n));
    m.setColors(toLinear(new Float32Array(this.c)));
    m.setIndices(new Uint32Array(this.i));
    m.update(pc.PRIMITIVE_TRIANGLES);
    return m;
  }
}

// colours are written as painters' (sRGB) values; the engine lights in linear
export function toLinear(c) {
  for (let k = 0; k < c.length; k++) if ((k & 3) !== 3) c[k] = Math.pow(c[k], 2.2);
  return c;
}
// a material that takes its colour from the vertices
export function vcMaterial(pc, opts) {
  const m = new pc.StandardMaterial();
  m.diffuse = new pc.Color(1, 1, 1);
  m.diffuseVertexColor = true;
  m.useMetalness = true; m.metalness = 0; m.gloss = (opts && opts.gloss) || 0.18;
  if (opts && opts.cull === false) m.cull = pc.CULLFACE_NONE;
  m.update();
  return m;
}
