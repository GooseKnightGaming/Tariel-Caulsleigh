// TARIEL CAULSLEIGH - the archery butts: a sway-and-loose bow game. Pure (tested in node). The crosshair drifts round the
// target; you loose when it is near the centre. Endurance steadies the hold, wits slow the drift a little.
export const RINGS = [[0.12, 10, 'gold'], [0.28, 8, 'red'], [0.46, 6, 'blue'], [0.7, 4, 'black'], [1.0, 2, 'white']];
// where the crosshair is at time t (target radius = 1): two slow waves, bigger when she is tired or unsteady
export function aim(t, traits = {}, tired = 0) {
  const steady = 1 - 0.09 * ((traits.endurance || 1) - 1) - 0.04 * ((traits.wits || 1) - 1);
  const amp = Math.max(0.35, 1.05 * steady + 0.5 * tired);
  return { x: amp * (0.72 * Math.sin(t * 1.3) + 0.35 * Math.sin(t * 2.9 + 1)), y: amp * (0.72 * Math.sin(t * 1.7 + 2) + 0.35 * Math.sin(t * 3.3)) };
}
export function score(x, y) {
  const d = Math.hypot(x, y);
  for (const [r, pts, name] of RINGS) if (d <= r) return { pts, name };
  return { pts: 0, name: 'miss' };
}
export const FEE = 1;
// three arrows; what the round pays out in dinar
export function prize(total) { return total >= 26 ? 4 : total >= 20 ? 2 : total >= 14 ? 1 : 0; }
export class Round {
  constructor(traits) { this.traits = traits; this.t = 0; this.arrows = []; this.left = 3; }
  step(dt, tired = 0) { this.t += dt; return aim(this.t, this.traits, tired); }
  loose(tired = 0) {
    if (this.left <= 0) return null;
    const p = aim(this.t, this.traits, tired), s = score(p.x, p.y); this.left--; this.arrows.push({ ...p, ...s }); return this.arrows[this.arrows.length - 1];
  }
  get total() { return this.arrows.reduce((a, b) => a + b.pts, 0); }
  get done() { return this.left <= 0; }
}
