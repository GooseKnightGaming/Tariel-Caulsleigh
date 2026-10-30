// TARIEL CAULSLEIGH - how a drawn person moves: joint angles (degrees) for a walk, and for standing about with
// folded arms or in talk. Pure (tested in node); game/figure.js turns the angles into limbs.
//
// Conventions: a figure faces -z, so a positive x angle swings a hanging limb FORWARD. Arms hang from the shoulders:
// a positive z angle swings the LEFT arm inward across the chest (the right arm takes the negative).

export const POSES = ['idle', 'arms', 'talk'];
// metres of ground to one radian of the walk cycle: a full cycle (two steps) is about 1.4 m
export const STRIDE = 1.4 / (Math.PI * 2);

// speed: m/s across the ground (0 = standing); phase: the walk cycle (radians); t: seconds, for the idle sway
export function gaitAngles(pose, phase, speed, t) {
  const o = { legL: 0, legR: 0, armLx: 0, armLz: 0, armRx: 0, armRz: 0, bob: 0, lean: 0, sway: 0 };
  const walk = Math.min(1, speed / 0.5);                              // 0 standing, 1 walking properly
  const breath = Math.sin(t * 1.4);
  // standing: arms by the pose
  let aLx = 3 * breath, aLz = 2, aRx = -3 * breath, aRz = -2;
  if (pose === 'arms') { aLx = 58 + 2 * breath; aLz = 30; aRx = 62 + 2 * breath; aRz = -30; }
  else if (pose === 'talk') { aLx = 18 + 6 * Math.sin(t * 1.9); aLz = 6; aRx = 38 + 24 * Math.sin(t * 2.6); aRz = -12; o.sway = 4 * Math.sin(t * 0.9); }
  // walking: legs and arms swing against each other, faster strides swing wider
  const amp = Math.min(34, 10 + speed * 9), s = Math.sin(phase);
  o.legL = amp * s * walk; o.legR = -amp * s * walk;
  const wLx = -amp * 0.75 * s, wRx = amp * 0.75 * s;
  o.armLx = aLx * (1 - walk) + wLx * walk; o.armRx = aRx * (1 - walk) + wRx * walk;
  o.armLz = aLz * (1 - walk) + 4 * walk; o.armRz = aRz * (1 - walk) - 4 * walk;
  o.bob = 0.03 * Math.abs(Math.cos(phase)) * walk + 0.004 * breath * (1 - walk);
  o.lean = (2 + speed * 1.2) * walk;
  return o;
}
