// TARIEL CAULSLEIGH - node tests for the pure parts: the land, walking, the sky.
import * as W from '../src/world/world.js';
import { Walker, groundAt, tooDeep, bridgeAt } from '../src/sim/walker.js';
import { Clock, sunDir, skyAt, daylight } from '../src/sim/sky.js';
import { makeFolk, plan, route, dayMoves, walkable, inTavern, tavernGate, ROLES } from '../src/sim/townsfolk.js';
import { gaitAngles, POSES } from '../src/sim/gait.js';

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) pass++; else { fail++; console.log('FAIL', msg); } };
const near = (a, b, e) => Math.abs(a - b) <= e;

// the land
const g = W.grid();
ok(g.length === W.N * W.N, 'grid size');
const h1 = W.rawHeight(123.4, -567.8), h2 = W.rawHeight(123.4, -567.8);
ok(h1 === h2, 'terrain is deterministic');
let hi = -Infinity, lo = Infinity; for (const v of g) { hi = Math.max(hi, v); lo = Math.min(lo, v); }
ok(lo > 10 && hi < 200, 'heights in range ' + lo.toFixed(1) + '..' + hi.toFixed(1));
// the river lies below its banks, and holds water
for (const s of [-1000, -400, 0, 400, 1000]) {
  const [x, z] = W.fromRiver(s, 0), [bx, bz] = W.fromRiver(s, -40), [cx, cz] = W.fromRiver(s, 40);
  ok(W.waterAt(x, z) !== null, 'water mid-river at s=' + s);
  ok(W.heightAt(x, z) < W.heightAt(bx, bz) - 1 && W.heightAt(x, z) < W.heightAt(cx, cz) - 1, 'river below both banks at s=' + s);
  ok(W.waterAt(bx, bz) === null, 'dry bank at s=' + s);
}
// the river flows downstream: the water falls with s
ok(W.waterLevel(500) < W.waterLevel(-500), 'the Yolo runs downhill');
// the sides of the border
ok(W.sideAt(...W.fromRiver(0, -60)) === 'Cawel' && W.sideAt(...W.fromRiver(0, 60)) === 'Sźettereich', 'banks');
ok(W.sideAt(...W.PLACES.shappel) === 'Cawel', "Shappel-ont'-Laik is on the Cawel side");
ok(W.sideAt(...W.PLACES.hill) === 'Cawel', 'the hill is on the Cawel side');
// the hill is the high point near the town, and looks down on it
const top = W.hillTop();
ok(top.y > W.heightAt(...W.PLACES.bridge) + 25, 'hill stands over the town by ' + (top.y - W.heightAt(...W.PLACES.bridge)).toFixed(1) + ' m');
// the town stands on level ground
const tn = [[0, -60], [-40, -100], [30, -150], [0, 60], [20, 100]].map(([s, n]) => W.heightAt(...W.fromRiver(s, n)));
ok(Math.max(...tn) - Math.min(...tn) < 3, 'Stanlech is level: spread ' + (Math.max(...tn) - Math.min(...tn)).toFixed(2));
// buildings stand on dry land
for (const b of W.buildings()) ok(W.waterAt(b.x, b.z) === null, 'building on dry land at ' + b.x.toFixed(0) + ',' + b.z.toFixed(0));
// trees: plenty, none in the river or the town
const trees = W.trees();
ok(trees.length > 3000, 'woods: ' + trees.length + ' trees');
ok(trees.every((t) => W.waterAt(t.x, t.z) === null), 'no tree in the river');
// the bridge spans the river
const mid = W.fromRiver(0, 0);
ok(bridgeAt(mid[0], mid[1]) !== null && bridgeAt(mid[0], mid[1]) > W.waterLevel(0) + 1, 'the bridge stands over the water');
ok(!tooDeep(mid[0], mid[1]), 'the bridge can be walked');

// walking
{
  const w = new Walker(...W.fromRiver(0, -40), 0);
  // walk towards the river (east-north-east, +n) - across the bridge on the high road, she gets over
  const [ax, az] = W.fromRiver(0, -40), [bx, bz] = W.fromRiver(0, 40);
  const heading = Math.atan2(-(bx - ax), -(bz - az));
  for (let k = 0; k < 60 * 30; k++) w.step(1 / 60, { moveZ: 1 }, heading);
  ok(w.side() === 'Sźettereich', 'she crosses the bridge');
  // off the bridge, into the water: she is stopped at the edge
  const w2 = new Walker(...W.fromRiver(60, -40), 0);
  for (let k = 0; k < 60 * 20; k++) w2.step(1 / 60, { moveZ: 1 }, heading);
  ok(w2.side() === 'Cawel' && !tooDeep(w2.pos[0], w2.pos[2]), 'deep water stops her');
  // the edge of the world
  const w3 = new Walker(1100, 0, 0);
  for (let k = 0; k < 60 * 20; k++) w3.step(1 / 60, { moveZ: 1 }, -Math.PI / 2);
  ok(w3.pos[0] <= W.BOUND, 'the bounds hold');
  // she stays on the ground
  ok(near(w.pos[1], groundAt(w.pos[0], w.pos[2]), 0.01), 'on the ground');
  // sprinting tires her; standing still she recovers
  const w4 = new Walker(...W.fromRiver(-300, -200), 0);
  for (let k = 0; k < 60 * 3; k++) w4.step(1 / 60, { moveZ: 1, sprint: true }, 0);
  ok(w4.stamina < 60, 'sprinting tires: ' + w4.stamina.toFixed(0));
  for (let k = 0; k < 60 * 6; k++) w4.step(1 / 60, {}, 0);
  ok(w4.stamina > 99, 'rest restores');
  // a jump goes up and comes down
  const w5 = new Walker(...W.fromRiver(-300, -200), 0); const y0 = w5.pos[1];
  w5.step(1 / 60, { jump: true }, 0); let peak = 0;
  for (let k = 0; k < 60; k++) { w5.step(1 / 60, {}, 0); peak = Math.max(peak, w5.pos[1] - y0); }
  ok(peak > 0.4 && w5.onGround, 'jump: up ' + peak.toFixed(2) + ' m and down');
}

// walls, doors, the bridge, the well
{
  const { blocked, floorAt } = await import('../src/world/solids.js');
  const t = W.tavern(), at = (lx, lz) => W.toWorld(t, lx, lz);
  const face = (b, lx, lz, tx, tz) => { const [ax, az] = W.toWorld(b, lx, lz), [bx, bz] = W.toWorld(b, tx, tz); return Math.atan2(-(bx - ax), -(bz - az)); };
  // into the tavern's front wall, beside the door: stopped outside
  let w = new Walker(...at(-2.5, 7), 0), h = face(t, -2.5, 7, -2.5, 0);
  for (let k = 0; k < 60 * 6; k++) w.step(1 / 60, { moveZ: 1 }, h);
  ok(floorAt(w.pos[0], w.pos[2]) === null, 'the tavern wall stops her');
  // through the door (at x = +1 on the front): in, and standing on its floor
  w = new Walker(...at(1, 7), 0); h = face(t, 1, 7, 1, 0);
  for (let k = 0; k < 60 * 4; k++) w.step(1 / 60, { moveZ: 1 }, h);
  ok(floorAt(w.pos[0], w.pos[2]) !== null && Math.abs(w.pos[1] - t.y) < 0.01, 'in through the tavern door, on its floor');
  // and not out through the back wall
  for (let k = 0; k < 60 * 6; k++) w.step(1 / 60, { moveZ: 1 }, h);
  ok(floorAt(w.pos[0], w.pos[2]) !== null, 'the back wall holds');
  // every house has a way in: just inside its door is open floor
  let shut = 0;
  for (const b of W.buildings()) if (b.kind !== 'well') {
    const [x, z] = W.toWorld(b, W.wallCells(b).find((c) => c.door).lx, b.d - 0.6);
    if (blocked(x, z, 0.3, b.y + 0.3, b.y + 1.7)) shut++;
  }
  ok(shut === 0, 'every doorway is open (' + shut + ' shut)');
  // the well is solid
  const well = W.buildings().find((b) => b.kind === 'well');
  ok(!!blocked(well.x, well.z, 0.3, well.y + 0.3, well.y + 1.7), 'the well is solid');
  // onto the bridge from the road, and over the river
  const [ax, az] = W.fromRiver(0, -30), [bx, bz] = W.fromRiver(0, 30);
  w = new Walker(ax, az, 0); h = Math.atan2(-(bx - ax), -(bz - az));
  let onBridge = false;
  for (let k = 0; k < 60 * 20; k++) { w.step(1 / 60, { moveZ: 1 }, h); if (bridgeAt(w.pos[0], w.pos[2]) !== null && w.pos[1] > W.waterLevel(0) + 1) onBridge = true; }
  ok(onBridge && w.side() === 'Sźettereich', 'up onto the bridge and across');
}

// doors: shut keeps her out, open lets her in
{
  const S = await import('../src/world/solids.js');
  const d = S.doors().find((x) => x.b.kind === 'house');
  const b = d.b, [ox, oz] = W.toWorld(b, d.cell.lx, b.d + 3), h = Math.atan2(-(d.x - ox), -(d.z - oz));
  let w = new Walker(ox, oz, 0);
  for (let k = 0; k < 60 * 5; k++) w.step(1 / 60, { moveZ: 1 }, h);
  ok(S.floorAt(w.pos[0], w.pos[2]) === null, 'a shut door keeps her out');
  S.OPEN.add(d.id);
  w = new Walker(ox, oz, 0);
  for (let k = 0; k < 60 * 5; k++) w.step(1 / 60, { moveZ: 1 }, h);
  ok(S.floorAt(w.pos[0], w.pos[2]) !== null, 'an open door lets her in');
  S.OPEN.delete(d.id);
  ok(S.OPEN.has(S.doors().find((x) => x.b.kind === 'tavern').id), "the tavern's door stands open");
}
// traits
{
  const CH = await import('../src/sim/character.js');
  const c = CH.newCharacter();
  ok(c.points === CH.START_POINTS, 'points to spend');
  ok(CH.spend(c, 'agility', 1) && c.traits.agility === 2 && c.points === CH.START_POINTS - 1, 'a point spent');
  ok(!CH.spend(c, 'wits', -1), 'not below 1');
  ok(CH.effects(c).speed > 1, 'agility quickens her');
  const back = CH.load(CH.save(c));
  ok(back.traits.agility === 2 && back.points === c.points, 'traits are kept');
}

// the people of Stanlech
const folk = makeFolk();
ok(folk.length === ROLES.length && folk.every((p, i) => p.id === i), 'ten people, in order');
ok(JSON.stringify(makeFolk()) === JSON.stringify(folk), 'the same people every time');
ok(folk.every((p) => walkable(p.mouth[0], p.mouth[1], 0.3) && walkable(p.tavernSpot[0], p.tavernSpot[1], 0.3) && p.work.length > 0 && p.work.every((w) => walkable(w.spot[0], w.spot[1], 0.3))), 'everyone\'s door, tavern seat and workplaces are standable');
ok(folk.every((p) => inTavern(p.tavernSpot[0], p.tavernSpot[1])) && !inTavern(...folk[0].mouth), 'tavern seats are inside, doors outside');
ok(folk.some((p) => p.bank === 'cawel') && folk.some((p) => p.bank === 'szetter'), 'people live on both banks');
// where the hour wants them
const keeper = folk[0], guard = folk[1], stall = folk[3];
ok(plan(keeper, 23).where === 'work' && plan(keeper, 4).where === 'home' && plan(keeper, 12).where === 'work', 'the keeper works from ten till one');
ok(plan(guard, 3).where === 'home' && plan(guard, 12).where === 'work' && plan(guard, 22).where === 'home', 'a guard keeps the day watch');
ok(plan(stall, 3).where === 'home' && plan(stall, 12).where === 'work', 'the stalls open by day');
ok(plan(stall, 12).key === plan(stall, 12.5).key, 'a place is held for the hour');
ok(plan(guard, 27).where === plan(guard, 3).where && plan(guard, -2).where === plan(guard, 22).where, 'hours wrap round the day');
ok(folk.some((p) => plan(p, 20).where === 'tavern'), 'someone is at the tavern of an evening');
// every move of a day has a route, clear of walls, and quick enough
let moves = 0, slow = 0, blockedLegs = 0, noRoute = 0;
for (const p of folk) for (const [a, b] of dayMoves(p)) {
  moves++;
  const t0 = Date.now(), r = route(a, b); slow = Math.max(slow, Date.now() - t0);
  if (!r) { noRoute++; continue; }
  let prev = a;
  for (const q of r) {
    const d = Math.hypot(q[0] - prev[0], q[1] - prev[1]), k = Math.max(1, Math.ceil(d / 0.05));
    for (let j = 1; j <= k; j++) if (!walkable(prev[0] + (q[0] - prev[0]) * j / k, prev[1] + (q[1] - prev[1]) * j / k, 0.2)) { blockedLegs++; break; }
    prev = q;
  }
}
ok(moves > 30, 'a day has moves in it (' + moves + ')');
ok(noRoute === 0, 'every move has a route');
ok(blockedLegs === 0, 'no route goes through a wall, a tree or the deep water');
ok(slow < 1500, 'the slowest route took ' + slow + ' ms');
const gate = tavernGate();
ok(gate.out && gate.in && inTavern(...gate.in) && !inTavern(...gate.out), 'the tavern door has an inside and an outside');
// people from the far bank cross by the bridge, not the river
{
  const p = folk.find((q) => q.bank === 'szetter'), r = route(p.mouth, folk[0].mouth);
  ok(r && r.every((q) => !(W.waterAt(q[0], q[1]) !== null && Math.abs(W.riverCoords(q[0], q[1]).s) > 8 && W.riverCoords(q[0], q[1]).n * W.riverCoords(q[0], q[1]).n < 64)), 'the far bank crosses where the bridge is');
}
// how a drawn person moves
for (const pose of POSES) {
  let widest = 0;
  for (let ph = 0; ph < 7; ph += 0.5) for (const v of [0, 1.4, 4.6]) for (const t of [0, 1.7]) {
    const g = gaitAngles(pose, ph, v, t);
    for (const k in g) { ok(Number.isFinite(g[k]), 'gait ' + pose + ' ' + k + ' is a number'); }
    widest = Math.max(widest, Math.abs(g.legL), Math.abs(g.armLx), Math.abs(g.armRx));
  }
  ok(widest < 80, 'gait ' + pose + ' stays inside the body');
}
{ const a = gaitAngles('idle', 1.2, 1.5, 0), b = gaitAngles('idle', 1.2 + Math.PI, 1.5, 0);
  ok(a.legL * b.legL < 0 && a.legL * a.legR < 0, 'legs swing against each other; a half cycle later they swap'); }
ok(gaitAngles('arms', 0, 0, 0).armLx > 40 && gaitAngles('idle', 0, 0, 0).armLx < 10, 'folded arms come forward, idle arms hang');

// the sky
ok(near(sunDir(6)[1], 0, 0.02) && near(sunDir(18)[1], 0, 0.02), 'sunrise and sunset on the horizon');
ok(sunDir(6)[0] > 0.9, 'the sun rises in the east');
ok(sunDir(18)[0] < -0.9, 'and sets in the west');
ok(near(Math.asin(sunDir(12)[1]) * 180 / Math.PI, 52, 1) && sunDir(12)[2] > 0, 'noon: 52 degrees, in the south');
ok(daylight(12) > 0.99 && daylight(0) < 0.01, 'day and night');
ok(skyAt(6.5).mist > skyAt(13).mist * 3, 'mist at dawn');
const c = new Clock(23.9, 1); c.step(60 * 24 / 24 * 0.2 * 60 / 60); // a little past midnight
ok(c.day === 2 && c.hour < 1, 'the clock turns the day');

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
