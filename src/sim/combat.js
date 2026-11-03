// TARIEL CAULSLEIGH - fists: the first, small piece of combat (T0.4). Pure (tested in node). Numbers are a first draft.
// A scrap is rounds of exchanged blows; strength hits harder, agility slips blows, endurance outlasts, presence makes
// people back off. The player's step into a brawl is one check (breakUp); a proper fight uses fight().
export function fighter(name, t = {}) {
  const s = { strength: 1, agility: 1, endurance: 1, wits: 1, presence: 1, ...t };
  return { name, t: s, hp: 10 + 3 * (s.endurance - 1), max: 10 + 3 * (s.endurance - 1) };
}
// one blow: returns damage (0 = missed or slipped)
export function blow(a, d, rng) {
  const hitChance = Math.min(0.9, Math.max(0.3, 0.6 + 0.07 * (a.t.agility - d.t.agility) + 0.03 * (a.t.wits - d.t.wits)));
  if (rng() > hitChance) return 0;
  return 1 + Math.floor(rng() * 3) + Math.floor((a.t.strength - 1) / 2);
}
// a full scrap, a hits first; ends at zero hp or after `rounds`. Returns { winner, rounds, a, b }
export function fight(a, b, rng, rounds = 20) {
  let r = 0;
  while (r < rounds && a.hp > 0 && b.hp > 0) {
    r++;
    b.hp -= blow(a, b, rng); if (b.hp <= 0) break;
    a.hp -= blow(b, a, rng);
  }
  return { winner: a.hp > b.hp ? a.name : b.hp > a.hp ? b.name : null, rounds: r, a: a.hp, b: b.hp };
}
// stepping between two men who are fighting: chance by strength and presence; a failure costs her a shove
export function breakUp(traits, rng) {
  const chance = Math.min(0.9, Math.max(0.25, 0.4 + 0.1 * ((traits.strength || 1) + (traits.presence || 1) - 2)));
  const ok = rng() < chance;
  return { ok, chance, cost: ok ? 5 : 25 };            // cost: stamina lost
}

// a fistfight in rounds: each side picks Strike, Guard or Feint. Strike beats Feint, Feint beats Guard, Guard beats Strike
// (a read guard turns the blow back a little). Returns { a, b, note } - damage to each side this round.
export const MOVES = ['strike', 'guard', 'feint'];
const BEATS = { strike: 'feint', feint: 'guard', guard: 'strike' };
export function round(A, B, ma, mb, rng) {
  const out = { a: 0, b: 0, note: '' };
  if (ma === mb) {
    if (ma === 'strike') { out.b = blow(A, B, rng); out.a = blow(B, A, rng); out.note = 'You trade blows.'; }
    else out.note = ma === 'guard' ? 'You circle, hands up.' : 'You both dance and feint.';
  } else if (BEATS[ma] === mb) {
    const d = blow(A, B, rng) + (ma === 'strike' ? 1 : 0); out.b = d; out.note = d ? (ma === 'strike' ? 'You catch him mid-feint.' : 'You slip his guard.') : 'He rides it out.';
  } else {
    const d = blow(B, A, rng) + (mb === 'strike' ? 1 : 0); out.a = d; out.note = d ? (mb === 'strike' ? 'He lands one as you feint.' : 'He slips your guard.') : 'You ride it out.';
  }
  if (ma === 'guard' && mb === 'strike') { out.a = Math.max(0, out.a - 1); out.b = Math.max(out.b, rng() < 0.4 ? 1 : 0); out.note = 'You take the blow on your arms' + (out.b ? ' and shove him back.' : '.'); }
  return out;
}
// the other side's pick: mostly random, a little drawn to strike
export const aiMove = (rng) => { const r = rng(); return r < 0.4 ? 'strike' : r < 0.7 ? 'guard' : 'feint'; };
