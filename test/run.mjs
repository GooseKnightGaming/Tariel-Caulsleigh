// TARIEL CAULSLEIGH - node tests for the pure parts: the land, walking, the sky.
import * as W from '../src/world/world.js';
import { Walker, groundAt, tooDeep, bridgeAt } from '../src/sim/walker.js';
import { Clock, sunDir, skyAt, daylight } from '../src/sim/sky.js';
import { makeFolk, plan, route, dayMoves, walkable, inTavern, tavernGate, ROLES, greeting } from '../src/sim/townsfolk.js';
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
  c.bag.push({ id: 'x', name: 'X', qty: 2, kind: 'gear', about: '' });
  const back = CH.load(CH.save(c)); ok(back.bag.some((b) => b.id === 'x' && b.qty === 2), 'the bag survives a save');
  ok(back.traits.agility === 2 && back.points === c.points, 'traits are kept');
}

// the people of Stanlech
const folk = makeFolk();
ok(folk.length === ROLES.length && folk.every((p, i) => p.id === i), 'everyone in order');
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
// people have names and something to say
{ const folk = makeFolk(), names = new Set(folk.map((p) => p.who));
  ok(names.size === folk.length && folk.every((p) => typeof p.who === 'string' && p.who.length > 2), 'everyone has a name of their own');
  ok(folk.every((p) => [0, 1, 2, 3].every((n) => typeof greeting(p, 12, n) === 'string' && greeting(p, 12, n).length > 5)), 'everyone has something to say'); }
// fear changes the day: more people at home in the evening, guards on watch later
{ const folk = makeFolk(); let calm = 0, scared = 0;
  for (const p of folk) { if (plan(p, 20, 0).where !== 'home') calm++; if (plan(p, 20, 2).where !== 'home') scared++; }
  ok(scared < calm, 'afraid, fewer people are out at eight in the evening (' + calm + ' calm, ' + scared + ' afraid)'); }
// Threot, the rune-dice game
{
  const { rank, compare, aiKeep, Table } = await import('../src/sim/threot.js');
  ok(rank([4, 4, 4]).rank === 3 && rank([4, 5, 6]).rank === 2 && rank([2, 2, 5]).rank === 1 && rank([1, 3, 6]).rank === 0, 'Threot hands rank: three alike, run, pair, nothing');
  ok(compare([6, 6, 6], [5, 5, 5]) === 1 && compare([1, 2, 3], [2, 2, 6]) === 1 && compare([3, 3, 1], [3, 3, 2]) === -1 && compare([2, 4, 6], [6, 4, 2]) === 0, 'Threot hands compare, with ties to the higher runes');
  ok(aiKeep([5, 5, 2]).filter(Boolean).length === 2 && aiKeep([3, 4, 6]).filter(Boolean).length >= 2, 'the other player keeps pairs and near-runs');
  let seed = 7; const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  let wins = 0, losses = 0, money = 100;
  for (let g = 0; g < 400; g++) {
    const t = new Table(rng, 2, money);
    t.hold(0); t.roll(); t.stand();
    if (t.phase !== 'done' || t.dice.some((v) => v < 1 || v > 6) || t.opp.some((v) => v < 1 || v > 6)) { ok(false, 'a game runs to its end'); break; }
    money = t.purse; if (t.result > 0) wins++; else if (t.result < 0) losses++;
  }
  ok(wins > 80 && losses > 80 && money !== 100, 'Threot is a real game: wins ' + wins + ', losses ' + losses);
  const t2 = new Table(rng, 3, 10); t2.stand(); ok(t2.purse === 10 + t2.result * 3, 'the purse follows the result');
}
// fists: strong and quick beats weak, and the numbers behave
{
  const { fighter, fight, blow, breakUp } = await import('../src/sim/combat.js');
  let seed = 7; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let strongWins = 0, N = 300;
  for (let i = 0; i < N; i++) { const a = fighter('a', { strength: 4, agility: 3, endurance: 3 }), b = fighter('b'); if (fight(a, b, rng).winner === 'a') strongWins++; }
  ok(strongWins > N * 0.8, 'a trained fighter beats a novice most of the time (' + strongWins + '/' + N + ')');
  const x = fighter('x'), y = fighter('y'); const r = fight(x, y, rng); ok(r.rounds >= 1 && r.rounds <= 20, 'a scrap ends');
  ok(blow(fighter('a'), fighter('b'), () => 0.99) === 0, 'a high roll misses');
  const lo = breakUp({ strength: 1, presence: 1 }, () => 0.5).chance, hi = breakUp({ strength: 4, presence: 4 }, () => 0.5).chance;
  ok(hi > lo && lo >= 0.25 && hi <= 0.9, 'strength and presence help stepping in');
  ok(breakUp({}, () => 0).ok && !breakUp({}, () => 0.99).ok && breakUp({}, () => 0.99).cost > breakUp({}, () => 0).cost, 'failing costs more wind');
}
// props stand about, and you cannot walk through them
{
  const { props } = await import('../src/world/world.js'), SO = await import('../src/world/solids.js');
  const ps = props(); ok(ps.length >= 10 && ps.some((q) => q.kind === 'cart') && ps.some((q) => q.kind === 'barrel'), 'props exist (' + ps.length + ')');
  const q = ps.find((x) => x.kind === 'barrel');
  ok(SO.solidList().some((s) => Math.abs(s.x - q.x) < 0.01 && Math.abs(s.z - q.z) < 0.01), 'a barrel is solid');
}
// the goat pen sits clear of buildings and open ground
{
  const p = W.pen(); ok(Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.y - W.heightAt(p.x, p.z)) < 0.01, 'the pen stands on the ground');
  const SO = await import('../src/world/solids.js'); const near = SO.solidList().filter((s) => Math.hypot(s.x - p.x, s.z - p.z) < 6 && s.y1 > p.y + 1.5);
  ok(near.length === 0, 'no wall or tree inside the pen (' + near.length + ')');
}
// journal threads
{
  const { threads, THREADS } = await import('../src/sim/story.js');
  const { newStory, addNote } = await import('../src/sim/dialogue.js');
  const st = newStory(); ok(threads(st).threads.length === 0, 'no clues, no threads');
  for (const id of ['greycoat', 'cob', 'edda', 'brawl']) addNote(st, id, 'x ' + id, 1);
  const r = threads(st); ok(r.threads.length === 4 && r.note, 'four threads make the pattern note');
  ok(r.threads.find((t) => t.title === 'Edda Wyke').got.length === 1, 'a thread counts its clues');
  const all = new Set(THREADS.flatMap((t) => t.ids)); ok(all.size === THREADS.reduce((a, t) => a + t.ids.length, 0), 'no clue is in two threads');
}
// Toasts (draft drinking game)
{
  const { Toasts, GOAL } = await import('../src/sim/toast.js');
  let seed = 3; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let ended = 0, wins = 0; for (let g = 0; g < 200; g++) { const t = new Toasts({ endurance: 3, wits: 3 }, rng); let n = 0; while (!t.over && n++ < 50) t.step(['sip', 'bluff', 'sip'][n % 3]); if (t.over) ended++; if (t.won) wins++; }
  ok(ended === 200, 'every game ends'); ok(wins > 40 && wins < 190, 'a sensible player wins some, not all (' + wins + '/200)');
  const t = new Toasts({}, () => 0.99); t.me.drunk = 5; t.step('gulp'); ok(t.over === 'lost-drunk', 'too drunk loses');
  const hi = new Toasts({ endurance: 5 }, rng), lo = new Toasts({}, rng); ok(hi.me.limit > lo.me.limit, 'endurance raises the limit');
  ok(new Toasts({ wits: 5 }, rng).catchChance() < new Toasts({}, rng).catchChance(), 'wits make a bluff safer'); ok(GOAL === 8); { const u = new Toasts({}, () => 0.99); u.step('gulp'); ok(/^You gulp;/.test(u.log), 'the log reads right: ' + u.log); }
}
// the sword drill
{
  const { Drill, CALLS, canEarn } = await import('../src/sim/drill.js');
  let seed = 5; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const d = new Drill(rng); ok(d.call.length === 3 && d.phase === 'show', 'a drill starts with a three-call');
  d.begin(); for (let i = 0; i < 2; i++) ok(d.answer(d.call[i]) === 'ok', 'a right answer goes on');
  ok(d.answer(d.call[2]) === 'round' && d.call.length === 4 && d.phase === 'show', 'a clean round lengthens the call');
  d.begin(); ok(d.answer((d.call[0] + 1) % CALLS.length) === 'miss' && d.phase === 'miss', 'a wrong answer misses');
  ok(d.retry() && d.phase === 'show', 'a miss can be tried again');
  const w = new Drill(rng); let res; for (let r = 0; r < 3; r++) { w.begin(); for (const c of w.call.slice()) res = w.answer(c); }
  ok(res === 'won' && w.won, 'three clean rounds win');
  const m = new Drill(rng); for (let k = 0; k < 3; k++) { m.begin(); m.answer((m.call[0] + 1) % 4); m.retry(); }
  ok(m.phase === 'done' && !m.won, 'three misses end the drill');
  ok(canEarn({}, 2) && !canEarn({ drillDay: 2 }, 2) && canEarn({ drillDay: 2 }, 3), 'one trait point a day');
}
// a fistfight in rounds
{
  const { fighter, round, aiMove, MOVES } = await import('../src/sim/combat.js');
  let seed = 11; const rng = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const A = fighter('a', { strength: 3, agility: 3 }), B = fighter('b');
  ok(MOVES.length === 3 && MOVES.includes(aiMove(rng)), 'three moves');
  let hitsB = 0; for (let i = 0; i < 60; i++) hitsB += round(A, B, 'strike', 'feint', rng).b; let hitsA = 0; for (let i = 0; i < 60; i++) hitsA += round(A, B, 'feint', 'strike', rng).a;
  ok(hitsB > 20 && hitsA > 10, 'the winning move lands (strike over feint ' + hitsB + ', strike over feint for him ' + hitsA + ')');
  ok(round(A, B, 'guard', 'guard', rng).a === 0 && round(A, B, 'feint', 'feint', rng).b === 0, 'a stand-off hurts nobody');
  let n = 0, wins = 0; for (let g = 0; g < 100; g++) { const x = fighter('x', { strength: 3, agility: 3, endurance: 2 }), y = fighter('y'); while (x.hp > 0 && y.hp > 0 && n++ < 99999) { const r = round(x, y, aiMove(rng), aiMove(rng), rng); y.hp -= r.b; x.hp -= r.a; } if (y.hp <= 0) wins++; }
  ok(wins > 60, 'the trained one wins most scraps (' + wins + '/100)');
}
// the money-changer
{
  const { change, purseText } = await import('../src/sim/trade.js');
  const m = { dinar: 25, librar: 0 };
  ok(change(m, 'up').ok && m.dinar === 5 && m.librar === 1, '20 dinar make a librar');
  ok(!change(m, 'up').ok && m.dinar === 5, 'not enough dinar to change up');
  ok(change(m, 'down').ok && m.dinar === 25 && m.librar === 0 && !change(m, 'down').ok, 'a librar becomes 20 dinar, once');
  ok(purseText({ dinar: 4, librar: 2 }) === '2 librar, 4 dinar', 'the purse reads plainly');
}
// archery
{
  const A = await import('../src/sim/archery.js');
  ok(A.score(0, 0).pts === 10 && A.score(0.2, 0).pts === 8 && A.score(0.4, 0.4).pts === 4 && A.score(1.2, 0).pts === 0, 'rings score by distance');
  const steady = A.aim(1, { endurance: 5, wits: 5 }), shaky = A.aim(1, {}), n = (p) => Math.hypot(p.x, p.y);
  let hi = 0, lo = 0; for (let t = 0; t < 30; t += 0.1) { hi = Math.max(hi, n(A.aim(t, { endurance: 5 }))); lo = Math.max(lo, n(A.aim(t, {}))); }
  ok(hi < lo, 'endurance steadies the hold'); ok(steady && shaky, 'aim gives a point');
  const r = new A.Round({}); r.step(0.5); r.loose(); r.loose(); ok(!r.done); r.loose(); ok(r.done && r.loose() === null, 'three arrows, then done');
  ok(A.prize(30) > A.prize(20) && A.prize(20) > A.prize(14) && A.prize(5) === 0, 'prizes grow with the score');
}
// eating
{
  const CH = await import('../src/sim/character.js');
  const c = CH.newCharacter(), n0 = c.bag.find((b) => b.id === 'bread').qty;
  const r = CH.eat(c, 'bread'); ok(r.ok && r.gain === 25 && c.bag.find((b) => b.id === 'bread').qty === n0 - 1, 'bread is eaten');
  CH.eat(c, 'bread'); ok(!c.bag.some((b) => b.id === 'bread'), 'an empty stack leaves the bag');
  ok(!CH.eat(c, 'knife').ok, 'a knife is not food');
}
// trade: stalls and the keeper sell, purses empty, bags fill
{
  const { GOODS, waresFor, buy } = await import('../src/sim/trade.js');
  const { newStory, Convo, check } = await import('../src/sim/dialogue.js');
  const { scriptFor } = await import('../src/sim/story.js');
  const folk = makeFolk(), sellers = folk.filter((p) => waresFor(p).length);
  ok(sellers.length >= 4, 'the keeper and the stallholders sell');
  ok(folk.every((p) => waresFor(p).every((id) => GOODS[id])), 'every ware is a known good');
  const bag = []; let pu = 5;
  let r = buy(pu, bag, 'bread'); pu = r.purse; r = buy(pu, bag, 'bread'); pu = r.purse;
  ok(pu === 3 && bag.length === 1 && bag[0].qty === 2, 'two loaves: 2 dinar, one stack');
  ok(!buy(2, bag, 'cloth').ok && buy(2, bag, 'cloth').purse === 2, 'cannot buy what you cannot afford');
  const st = newStory(), seller = sellers[0], sc = scriptFor(seller, { face: 'thiah', nights: 0, day: 1, hour: 12 }, st);
  ok(check(sc, 'start').bad.length === 0, 'a seller\'s talk is whole');
  const c = new Convo(sc, { face: 'thiah', nights: 0, day: 1, hour: 12 }, st);
  const ask = c.choices().findIndex((x) => /selling|can I have/.test(x.text)); c.pick(ask); c.pick(0);
  ok(c.act && c.act[0] === 'buy' && GOODS[c.act[1]], 'picking a ware asks for a purchase');
}
// the mornings after: each night brings its news, and it all lands in the journal
{
  const { morning } = await import('../src/sim/story.js');
  const { newStory, addNote } = await import('../src/sim/dialogue.js');
  const st = newStory();
  for (const n of [1, 2, 3]) { const m = morning(n, st); for (const x of m.notes) addNote(st, x.id, x.text, n + 1); ok(m.title && m.sub && m.objective && m.line && m.notes.length, 'morning ' + n + ' is complete'); }
  ok(st.notes.length === 5 && new Set(st.notes.map((n) => n.id)).size === 5, 'five morning notes, none repeated');
  ok(/poor/.test(st.notes.find((n) => n.id === 'm3b').text) && /woman|women/.test(st.notes.find((n) => n.id === 'm3b').text), 'the last morning names who is being chosen');
  ok(/Trenite is done/.test(morning(3, st).title), 'the third morning ends the Trenite');
}
// conversation: every script is whole, and a talk runs from start to end
{
  const { newStory, Convo, check } = await import('../src/sim/dialogue.js');
  const { scriptFor } = await import('../src/sim/story.js');
  let scripts = 0, broken = [];
  for (const p of makeFolk()) for (const face of ['thiah', 'tariel']) for (let nights = 0; nights <= 3; nights++) {
    const st = newStory(), sc = scriptFor(p, { face, nights, day: nights + 1, hour: 12 }, st), r = check(sc, 'start'); scripts++;
    if (r.bad.length) broken.push(p.role + '/' + face + '/' + nights + ': ' + r.bad.join(', '));
    // walk the whole talk, always taking the first choice, then the last, and make sure it ends
    for (const pickLast of [false, true]) {
      const c = new Convo(sc, { face, nights, day: nights + 1, hour: 12 }, st, 'start'); let guard = 0;
      while (!c.done && guard++ < 60) { const n = c.choices().length; if (n) c.pick(pickLast || guard > 6 ? n - 1 : 0); else c.next(); }
      if (!c.done) broken.push(p.role + ' talk never ends');
    }
  }
  ok(broken.length === 0, 'all ' + scripts + ' conversation scripts are whole' + (broken.length ? ': ' + broken.slice(0, 3).join('; ') : ''));
  // Elar speaks first to Thiah, as Rhys's notes have it, and only once
  const elar = makeFolk().find((p) => p.role === 'elar'), st2 = newStory();
  const first = new Convo(scriptFor(elar, { face: 'thiah', nights: 0, day: 1, hour: 12 }, st2), { face: 'thiah', nights: 0, day: 1, hour: 12 }, st2, 'start');
  ok(/remind me of someone/.test(first.view().line) && st2.flags.elar_thiah, 'Elar: "you remind me of someone"');
  first.pick(0); ok(/place who/.test(first.view().line), 'Elar: "I cannot quite place who"');
  const again = scriptFor(elar, { face: 'thiah', nights: 0, day: 1, hour: 12 }, st2);
  ok(!/remind me of someone/.test(again.start.line), 'Elar does not say it twice');
  // what she learns goes in the journal, once
  const keeper = makeFolk()[0], st3 = newStory(), c3 = new Convo(scriptFor(keeper, { face: 'thiah', nights: 2, day: 3, hour: 12 }, st3), { face: 'thiah', nights: 2, day: 3, hour: 12 }, st3, 'start');
  const idx = c3.view().choices.indexOf('Anything strange happening?'); c3.pick(idx); c3.pick(c3.choices().findIndex((c) => c.go === 't_strange'));
  ok(st3.notes.some((n) => n.id === 'edda') && st3.notes.filter((n) => n.id === 'edda').length === 1, 'the news from Shappel goes in her journal, once');
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
