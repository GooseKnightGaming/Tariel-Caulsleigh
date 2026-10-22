// TARIEL CAULSLEIGH - who she is in numbers: traits you put points into (D&D-minimal, to be fleshed out later),
// what she carries, and what each of her two selves wears. Pure (tested in node).

// the traits: names and effects are a first draft for Rhys to rename and rebalance
export const TRAITS = [
  { id: 'strength', name: 'Strength', about: 'Carrying, climbing, and (in T0.4) hitting hard.' },
  { id: 'agility', name: 'Agility', about: 'Speed on her feet: +3% to running for each point over 1.' },
  { id: 'endurance', name: 'Endurance', about: 'Wind: +12% stamina for each point over 1.' },
  { id: 'wits', name: 'Wits', about: 'Noticing things, and seeing through people (with conversation, T0.3).' },
  { id: 'presence', name: 'Presence', about: 'How people take to her - as Tariel or as Thiah (T0.3).' },
];
export const START_POINTS = 4, TRAIT_MAX = 5;

export function newCharacter() {
  const traits = {}; for (const t of TRAITS) traits[t.id] = 1;
  return {
    traits, points: START_POINTS, level: 1,
    // the bag: shared by both of her selves (placeholders until Rhys sets out what she carries)
    bag: [
      { id: 'coin', name: 'Librar', qty: 25, kind: 'coin', about: 'Saes coin, in a plain purse. (The amount is a placeholder.)' },
      { id: 'bread', name: 'Bread', qty: 2, kind: 'food', about: 'A heel of bread and a hard crust.' },
      { id: 'water', name: 'Waterskin', qty: 1, kind: 'gear', about: 'Full, for now.' },
      { id: 'knife', name: 'Small knife', qty: 1, kind: 'tool', about: 'For bread, rope and letters.' },
    ],
    // what each self wears, slot by slot
    worn: {
      tariel: { Head: null, Body: 'Saes uniform (green Ranger)', Hands: 'Bracers', Feet: 'Riding boots', 'Main hand': null, 'Off hand': null },
      thiah: { Head: null, Body: 'Posh rags', Hands: 'Fingerless gloves', Feet: 'Bare - the Mark of Kern on her left foot', 'Main hand': null, 'Off hand': null },
    },
  };
}
// spend a point (or take one back: amount -1); returns true if it changed
export function spend(ch, id, amount) {
  const v = ch.traits[id];
  if (v === undefined) return false;
  if (amount > 0 && (ch.points < 1 || v >= TRAIT_MAX)) return false;
  if (amount < 0 && v <= 1) return false;
  ch.traits[id] += amount; ch.points -= amount;
  return true;
}
// what the traits do to her body: multipliers for the walker
export function effects(ch) {
  return {
    speed: 1 + 0.03 * (ch.traits.agility - 1),
    stamina: 1 + 0.12 * (ch.traits.endurance - 1),
  };
}
export function load(json) {
  const ch = newCharacter();
  try { const o = JSON.parse(json); if (o && o.traits) { Object.assign(ch.traits, o.traits); ch.points = o.points; } } catch (e) { /* a fresh one */ }
  return ch;
}
export const save = (ch) => JSON.stringify({ traits: ch.traits, points: ch.points });
