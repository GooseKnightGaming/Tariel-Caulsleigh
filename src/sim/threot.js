// TARIEL CAULSLEIGH - Threot, "The Three": the Saes tavern game of three rune dice (Rhys's game idea: Yahtzee-like).
// DRAFT RULES (made up for T0.3, Rhys's to change): each player rolls three rune dice and may roll again twice, keeping any
// they like. The best hand wins: three alike, then a run of three, then a pair, then nothing; ties go to the higher runes.
// Pure (tested in node); the table is drawn in game/main.js.

export const RUNES = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ'];   // fehu, uruz, thurisaz, ansuz, raido, kaunan
export const RUNE_NAMES = ['Fe', 'Ur', 'Thorn', 'Os', 'Rad', 'Ken'];
const HANDS = ['Nothing', 'A pair', 'A run', 'Three alike'];

// the hand's rank (0..3) and a number that breaks ties (higher is better)
export function rank(dice) {
  const d = dice.slice().sort((a, b) => b - a), [a, b, c] = d;
  if (a === b && b === c) return { rank: 3, tie: a, name: HANDS[3] };
  if (a - 1 === b && b - 1 === c) return { rank: 2, tie: a, name: HANDS[2] };
  if (a === b || b === c) { const pair = a === b ? a : b, kick = a === b ? c : a; return { rank: 1, tie: pair * 10 + kick, name: HANDS[1] }; }
  return { rank: 0, tie: a * 100 + b * 10 + c, name: HANDS[0] };
}
// 1 if x beats y, -1 if y beats x, 0 for a draw
export function compare(x, y) {
  const a = rank(x), b = rank(y);
  if (a.rank !== b.rank) return a.rank > b.rank ? 1 : -1;
  if (a.tie !== b.tie) return a.tie > b.tie ? 1 : -1;
  return 0;
}
// which dice an opponent keeps before a roll: pairs, runs and triples stay; otherwise high runes
export function aiKeep(dice) {
  const r = rank(dice);
  if (r.rank >= 2) return [true, true, true];
  if (r.rank === 1) return dice.map((v, i) => dice.filter((w, j) => j !== i && w === v).length > 0);
  const best = Math.max(...dice);
  const near = dice.map((v, i) => dice.some((w, j) => j !== i && Math.abs(w - v) === 1));
  if (near.filter(Boolean).length >= 2) return near;
  return dice.map((v) => v === best && v >= 4);
}

export class Table {
  // rng: () => 0..1; stake: coins each side puts in; purse: what she has
  constructor(rng, stake, purse) {
    this.rng = rng; this.stake = stake; this.purse = purse; this.phase = 'player'; this.result = null;
    this.dice = [0, 0, 0]; this.held = [false, false, false]; this.rollsLeft = 3; this.opp = null;
    this.roll();
  }
  die() { return 1 + Math.floor(this.rng() * 6); }
  roll() {
    if (this.phase !== 'player' || this.rollsLeft <= 0) return false;
    this.dice = this.dice.map((v, i) => (this.held[i] && v ? v : this.die())); this.rollsLeft--;
    if (this.rollsLeft === 0) this.stand();
    return true;
  }
  hold(i) { if (this.phase !== 'player' || this.rollsLeft === 3 || this.rollsLeft === 0) return false; this.held[i] = !this.held[i]; return true; }
  // she keeps her dice; the other player plays out their three rolls, and the coin changes hands
  stand() {
    if (this.phase !== 'player') return false;
    let o = [this.die(), this.die(), this.die()];
    for (let k = 0; k < 2; k++) { const keep = aiKeep(o); o = o.map((v, i) => (keep[i] ? v : this.die())); }
    this.opp = o; this.phase = 'done';
    const c = compare(this.dice, o);
    this.result = c; this.purse += c * this.stake;
    return true;
  }
  get summary() {
    if (this.phase !== 'done') return null;
    const me = rank(this.dice), them = rank(this.opp);
    return (this.result > 0 ? 'You win ' : this.result < 0 ? 'You lose ' : 'A draw - ') + (this.result === 0 ? 'stakes returned.' : this.stake + ' dinar. ') + (this.result === 0 ? '' : '(' + me.name + ' against ' + them.name.toLowerCase() + ')');
  }
}
