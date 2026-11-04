// TARIEL CAULSLEIGH - "Toasts": a DRAFT tavern drinking game (Rhys has not described the real one; name and rules are mine,
// to be replaced). Two drinkers race to 8 points; sip (+1 point, +1 drunk), gulp (+2, +2), or bluff (pretend to drink:
// +1 if the table does not catch you, -1 if it does). Whoever goes past their limit drunk falls off the bench and loses.
// Endurance raises the limit; wits make a bluff safer. Pure (tested in node).
export const GOAL = 8;
export const MOVES = ['sip', 'gulp', 'bluff'];
export class Toasts {
  constructor(traits, rng, oppLimit = 7) {
    const t = { endurance: 1, wits: 1, ...traits };
    this.rng = rng; this.t = t;
    this.me = { pts: 0, drunk: 0, limit: 5 + 2 * (t.endurance - 1) };
    this.opp = { pts: 0, drunk: 0, limit: oppLimit };
    this.over = null; this.log = 'The first toast is called.';
  }
  catchChance() { return Math.max(0.12, 0.5 - 0.1 * (this.t.wits - 1)); }
  oppMove() {
    const room = this.opp.limit - this.opp.drunk, r = this.rng();
    if (room <= 1) return r < 0.7 ? 'bluff' : 'sip';
    if (room >= 3) return r < 0.5 ? 'gulp' : r < 0.85 ? 'sip' : 'bluff';
    return r < 0.55 ? 'sip' : r < 0.8 ? 'bluff' : 'gulp';
  }
  apply(side, move, caughtP) {
    if (move === 'sip') { side.pts += 1; side.drunk += 1; return ' sips'; }
    if (move === 'gulp') { side.pts += 2; side.drunk += 2; return ' gulps'; }
    if (this.rng() < caughtP) { side.pts = Math.max(0, side.pts - 1); return ' is caught bluffing'; }
    side.pts += 1; return ' bluffs it';
  }
  step(move) {
    if (this.over) return this.over;
    const om = this.oppMove();
    const a = this.apply(this.me, move, this.catchChance()), b = this.apply(this.opp, om, 0.35);
    this.log = 'You' + a.replace(' is caught', ' are caught').replace(/^ (sip|gulp|bluff)s/, ' $1') + '; he' + b + '.';
    const meOut = this.me.drunk > this.me.limit, oppOut = this.opp.drunk > this.opp.limit;
    if (meOut && !oppOut) this.over = 'lost-drunk'; else if (oppOut && !meOut) this.over = 'won-drunk';
    else if (meOut && oppOut) this.over = this.me.pts >= this.opp.pts ? 'won-drunk' : 'lost-drunk';
    else if (this.me.pts >= GOAL || this.opp.pts >= GOAL) this.over = this.me.pts >= this.opp.pts ? 'won' : 'lost';
    return this.over;
  }
  get won() { return !!this.over && this.over.startsWith('won'); }
}
