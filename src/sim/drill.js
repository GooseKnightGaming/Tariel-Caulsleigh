// TARIEL CAULSLEIGH - the sword drill: a guard calls cuts and guards, she repeats them. Pure (tested in node).
// Three rounds, calls getting longer (3, 4, 5); a clean round needs the whole call repeated in order.
export const CALLS = ['High cut', 'Low cut', 'Left parry', 'Right parry'];
export class Drill {
  constructor(rng, rounds = 3) { this.rng = rng; this.rounds = rounds; this.round = 0; this.clean = 0; this.pos = 0; this.call = this.newCall(); this.phase = 'show'; this.misses = 0; }
  newCall() { const n = 3 + this.round, out = []; for (let i = 0; i < n; i++) out.push(Math.floor(this.rng() * CALLS.length)); return out; }
  // after the call has been shown, the player starts answering
  begin() { this.phase = 'answer'; this.pos = 0; }
  // she answers with move i (0-3). returns 'ok' | 'round' (a clean round, more to come) | 'won' | 'miss'
  answer(i) {
    if (this.phase !== 'answer') return 'wait';
    if (i !== this.call[this.pos]) { this.misses++; this.phase = 'miss'; return 'miss'; }
    this.pos++;
    if (this.pos < this.call.length) return 'ok';
    this.clean++; this.round++;
    if (this.round >= this.rounds) { this.phase = 'done'; return 'won'; }
    this.call = this.newCall(); this.phase = 'show'; return 'round';
  }
  // a missed round is tried again (the same call), up to three misses in all, then the drill is over
  retry() { if (this.misses >= 3) { this.phase = 'done'; return false; } this.phase = 'show'; return true; }
  get won() { return this.phase === 'done' && this.clean >= this.rounds; }
}
// she earns a trait point from a won drill once a day
export const canEarn = (state, day) => state.drillDay !== day;
