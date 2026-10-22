// TARIEL CAULSLEIGH - walking the valley: Tariel on the ground, pure (tested in node).
// input: { moveX, moveZ (-1..1, relative to the camera's heading), run, sprint, jump }, heading: the camera's yaw.

import { heightAt, waterAt, BOUND, riverCoords, BRIDGE, RIVER } from '../world/world.js';
import { blocked, floorAt } from '../world/solids.js';

export const MOVE = {
  walk: 1.9, jog: 4.6, sprint: 7.0,      // m/s
  accel: 14, airAccel: 3,
  jump: 4.4, gravity: 16,
  turn: 10,                               // how fast she turns to face where she goes (rad/s at full)
  wade: 0.9,                              // deeper water than this (to the thigh) is not walked into
  steep: 0.62,                            // ground steeper than this (rise over run) is not climbed
  step: 0.45,                             // a step up this high (a kerb, the bridge's end, a doorstep) is taken in stride
  radius: 0.3,                            // her width, against walls
  stamina: 100, sprintDrain: 18, regen: 14,
};

// the bridge's deck: its height over (x, z), or null off it
export function bridgeAt(x, z) {
  const a = BRIDGE.from, b = BRIDGE.to, vx = b[0] - a[0], vz = b[1] - a[1], l2 = vx * vx + vz * vz;
  const t = ((x - a[0]) * vx + (z - a[1]) * vz) / l2;
  if (t < -0.02 || t > 1.02) return null;
  const px = a[0] + vx * t, pz = a[1] + vz * t;
  if (Math.hypot(x - px, z - pz) > BRIDGE.w / 2) return null;
  const ya = heightAt(a[0], a[1]), yb = heightAt(b[0], b[1]);
  return ya + (yb - ya) * t + 0.35 + Math.sin(Math.PI * Math.max(0, Math.min(1, t))) * 0.6;   // a gentle hump
}
export function groundAt(x, z) {
  const b = bridgeAt(x, z), f = floorAt(x, z), h = heightAt(x, z);
  return Math.max(h, b === null ? -Infinity : b, f === null ? -Infinity : f);
}
// too deep to walk into: water above the thigh, off the bridge
export function tooDeep(x, z) {
  if (bridgeAt(x, z) !== null) return false;
  const w = waterAt(x, z);
  return w !== null && w - heightAt(x, z) > MOVE.wade;
}

export class Walker {
  constructor(x, z, yaw) {
    this.pos = [x, groundAt(x, z), z];
    this.vel = [0, 0, 0];
    this.yaw = yaw || 0;            // the way she faces
    this.onGround = true;
    this.stamina = MOVE.stamina;
    this.speed = 0;                 // across the ground, m/s (the animation reads it)
    this.gait = 'idle';
    this.events = [];
  }
  step(dt, input, heading) {
    const mx = input.moveX || 0, mz = input.moveZ || 0;
    const len = Math.min(1, Math.hypot(mx, mz));
    // where she wants to go, in the world (heading 0 looks towards -z, north)
    const sh = Math.sin(heading), ch = Math.cos(heading);
    let wx = 0, wz = 0;
    if (len > 0.05) {
      const fx = -sh, fz = -ch, rx = ch, rz = -sh;           // forward and right of the camera
      wx = (fx * mz + rx * mx) / Math.max(1, Math.hypot(mx, mz));
      wz = (fz * mz + rz * mx) / Math.max(1, Math.hypot(mx, mz));
    }
    let target = len > 0.05 ? (input.sprint && this.stamina > 1 ? MOVE.sprint : input.walk ? MOVE.walk : MOVE.jog) * len : 0;
    const sprinting = target > MOVE.jog + 0.1;
    this.stamina = Math.max(0, Math.min(MOVE.stamina, this.stamina + (sprinting ? -MOVE.sprintDrain : MOVE.regen) * dt));
    const acc = this.onGround ? MOVE.accel : MOVE.airAccel;
    const tvx = wx * target, tvz = wz * target;
    const k = Math.min(1, acc * dt / Math.max(0.001, Math.hypot(tvx - this.vel[0], tvz - this.vel[2])));
    this.vel[0] += (tvx - this.vel[0]) * Math.min(1, k * 1.0 + (this.onGround ? 0 : 0));
    this.vel[2] += (tvz - this.vel[2]) * Math.min(1, k);
    // turn to face the way she is going
    if (len > 0.05) {
      const want = Math.atan2(-wx, -wz);
      let d = want - this.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      this.yaw += d * Math.min(1, MOVE.turn * dt);
    }
    // jumping
    if (input.jump && this.onGround) { this.vel[1] = MOVE.jump; this.onGround = false; this.events.push({ type: 'jump' }); }
    // move, one axis at a time, refusing deep water, steep ground and the edge of the world
    const here = groundAt(this.pos[0], this.pos[2]);
    for (const ax of [0, 2]) {
      const nx = this.pos[0] + (ax === 0 ? this.vel[0] * dt : 0), nz = this.pos[2] + (ax === 2 ? this.vel[2] * dt : 0);
      if (Math.abs(nx) > BOUND || Math.abs(nz) > BOUND) { this.vel[ax] = 0; continue; }
      if (tooDeep(nx, nz)) { this.vel[ax] = 0; this.events.push({ type: 'water' }); continue; }
      if (blocked(nx, nz, MOVE.radius, this.pos[1] + 0.3, this.pos[1] + 1.7)) { this.vel[ax] = 0; this.events.push({ type: 'bump' }); continue; }
      const there = groundAt(nx, nz), run = Math.abs(ax === 0 ? nx - this.pos[0] : nz - this.pos[2]);
      if (this.onGround && there - this.pos[1] > MOVE.step && run > 1e-4 && (there - here) / run > MOVE.steep) { this.vel[ax] = 0; continue; }
      this.pos[0] = nx; this.pos[2] = nz;
    }
    // up and down
    const g = groundAt(this.pos[0], this.pos[2]);
    if (!this.onGround) {
      this.vel[1] -= MOVE.gravity * dt;
      this.pos[1] += this.vel[1] * dt;
      if (this.pos[1] <= g) { this.pos[1] = g; this.vel[1] = 0; this.onGround = true; this.events.push({ type: 'land' }); }
    } else {
      // follow the ground down slopes and steps; leave it over a drop
      if (g < this.pos[1] - 0.6) { this.onGround = false; this.vel[1] = 0; }
      else this.pos[1] = g;
    }
    this.speed = Math.hypot(this.vel[0], this.vel[2]);
    this.gait = !this.onGround ? 'air' : this.speed < 0.3 ? 'idle' : this.speed < MOVE.walk + 0.4 ? 'walk' : this.speed < MOVE.jog + 0.4 ? 'jog' : 'sprint';
  }
  // which bank of the Yolo she is on
  side() { return riverCoords(this.pos[0], this.pos[2]).n >= 0 ? 'Sźettereich' : 'Cawel'; }
}
export { RIVER };
