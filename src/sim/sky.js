// TARIEL CAULSLEIGH - the day and the night: the clock, the sun and moon, the sky's colours, the mist.
// Pure (tested in node). A day passes in DAY_MINUTES real minutes.

export const DAY_MINUTES = 24;                  // one in-game hour to a real minute
export const START = { day: 1, hour: 7.0 };     // the opening: early morning, mist on the river

export class Clock {
  constructor(hour, day) { this.hour = hour === undefined ? START.hour : hour; this.day = day || START.day; this.scale = 1; }
  step(dt) {
    this.hour += (dt * this.scale * 24) / (DAY_MINUTES * 60);
    while (this.hour >= 24) { this.hour -= 24; this.day++; }
  }
  // "Morning of the first day, half past six"
  text() {
    const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60);
    const part = this.hour < 5 ? 'Night' : this.hour < 12 ? 'Morning' : this.hour < 17 ? 'Afternoon' : this.hour < 21 ? 'Evening' : 'Night';
    const ord = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'][this.day - 1] || this.day + 'th';
    return { part, day: ord, time: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') };
  }
}

const lerp = (a, b, t) => a + (b - a) * t;
const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// the sun: rises in the east at 6, highest (52 degrees) at 12, sets in the west at 18; the moon opposite
export function sunDir(hour) {
  const a = ((hour - 6) / 12) * Math.PI;            // 0 at sunrise, pi at sunset (and on round under the world)
  const tilt = 52 * Math.PI / 180;                  // the noon sun's height, in the southern sky
  const v = [Math.cos(a), Math.sin(a) * Math.sin(tilt), Math.sin(a) * Math.cos(tilt)];   // east, up, south
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}
// how light it is: 0 night, 1 full day
export function daylight(hour) {
  return ss(4.8, 7.2, hour) * (1 - ss(17.2, 19.8, hour));
}
// the sky at the zenith and at the horizon, the sun's light, the ambient, the fog
export function skyAt(hour) {
  const d = daylight(hour);
  const dusk = Math.max(ss(4.8, 6.4, hour) * (1 - ss(6.4, 8.2, hour)), ss(16.8, 18.4, hour) * (1 - ss(18.4, 20.2, hour)));
  const zenithDay = [0.30, 0.52, 0.86], zenithNight = [0.02, 0.03, 0.07];
  const horizonDay = [0.70, 0.80, 0.90], horizonNight = [0.05, 0.06, 0.11], horizonDusk = [0.95, 0.58, 0.36];
  const zenith = mixc(zenithNight, zenithDay, d);
  const horizon = mixc(mixc(horizonNight, horizonDay, d), horizonDusk, dusk * 0.85);
  const sunCol = mixc([1, 0.62, 0.38], [1, 0.97, 0.9], ss(0.15, 0.6, d));
  const sun = sunDir(hour);
  const sunI = Math.max(0, sun[1]) > 0 ? 0.25 + 1.0 * d : 0;
  const moonI = (1 - d) * 0.28;
  const ambient = mixc([0.10, 0.12, 0.20], [0.42, 0.44, 0.48], d);
  // mist: thick at dawn on the river, thin by day, back a little at dusk and night
  const mist = 0.35 * (ss(4, 6.5, hour) * (1 - ss(6.5, 10, hour))) + 0.08 * (1 - d) + 0.04;
  return { d, dusk, zenith, horizon, sun, sunCol, sunI, moon: [-sun[0], -sun[1], -sun[2]], moonI, ambient, mist, stars: 1 - ss(0.0, 0.35, d) };
}
