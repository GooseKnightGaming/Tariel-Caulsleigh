// TARIEL CAULSLEIGH - oil wrestling: a tavern bet (DRAFT, Rhys's brief). Hand-to-hand and foot-to-foot, no clothes, no
// weapons; stay upright longer than your opponent. It is meant to be two against two, but Thiah goes alone against a team
// of two men. Each round she picks Grip, Brace or Slip; each man still standing picks too. Grip beats Slip (you catch the
// slipping man), Slip beats Brace (you slide off his hold), Brace beats Grip (you hold firm). The loser of a pairing
// loses balance. Everybody has a tell: Wits lets her read what a man is about to do. Pure (tested in node).
export const MOVES = ['grip', 'brace', 'slip'];
const BEATS = { grip: 'slip', slip: 'brace', brace: 'grip' };
export const TEAMS = [
  { name: 'Garr and Bodo', men: [{ n: 'Garr', bal: 5, lean: 'grip' }, { n: 'Bodo', bal: 5, lean: 'brace' }] },
  { name: 'Wat Crane and Jory Pike', men: [{ n: 'Wat', bal: 6, lean: 'slip' }, { n: 'Jory', bal: 6, lean: 'grip' }] },
  { name: 'the Dunmow brothers, Tam and Rudd', men: [{ n: 'Tam', bal: 7, lean: 'brace' }, { n: 'Rudd', bal: 7, lean: 'slip' }] },
];
export const STAKE = 3;
export class Bout {
  constructor(traits, rng, team) {
    this.t = { strength: 1, agility: 1, endurance: 1, wits: 1, ...traits }; this.rng = rng; this.team = team;
    const bal = 8 + Math.ceil(this.t.endurance / 2);
    this.you = { bal, max: bal };
    this.opps = team.men.map((m) => ({ ...m, max: m.bal }));
    this.over = null; this.log = team.name + ' step in, grinning. The oil is warm.'; this.round = 0; this.plan();
  }
  tellChance() { return Math.min(0.8, 0.1 + 0.12 * this.t.wits); }
  // each man still standing chooses; some tells show
  plan() {
    for (const o of this.opps) {
      if (o.bal <= 0) { o.pick = null; o.tell = null; continue; }
      o.pick = this.rng() < 0.6 + 0.05 * TEAMS.indexOf(this.team) ? o.lean : MOVES[Math.floor(this.rng() * 3)];
      o.tell = this.rng() < this.tellChance() ? o.pick : null;
    }
  }
  step(move) {
    if (this.over) return this.over;
    const dealt = 1 + (this.t.strength >= 4 ? 1 : 0), notes = [];
    for (const o of this.opps) {
      if (o.bal <= 0) continue;
      if (BEATS[move] === o.pick) { o.bal -= dealt; notes.push(o.n + ' loses his footing' + (o.bal <= 0 ? ' and goes down' : '')); }
      else if (BEATS[o.pick] === move) { this.you.bal -= 1; notes.push(o.n + ' gets a hold on you'); }
    }
    this.round++; this.log = notes.length ? notes.join('; ') + '.' : 'Slippery stalemate. Nobody gets a hold.';
    if (this.you.bal <= 0) this.over = 'lost'; else if (this.opps.every((o) => o.bal <= 0)) this.over = 'won';
    else this.plan();
    return this.over;
  }
  get standing() { return this.opps.filter((o) => o.bal > 0); }
}
// the board: three teams in order; she may take on the next one only
export const nextTeam = (state) => (state.wrestleWon || 0) < TEAMS.length ? TEAMS[state.wrestleWon || 0] : null;
