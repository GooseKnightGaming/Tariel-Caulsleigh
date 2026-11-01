// TARIEL CAULSLEIGH - coin and trade: what a stall or the tavern sells, at what price, in dinar (1 librar = 20 dinar,
// 1 dinar = 12 assar). Pure (tested in node). Prices and wares are a first draft for Rhys to rebalance.
export const GOODS = {
  bread:  { name: 'Bread', price: 1, kind: 'food', about: 'A fresh round loaf.' },
  apple:  { name: 'Apples', price: 1, kind: 'food', about: 'Two hard autumn apples.' },
  cheese: { name: 'Cheese', price: 3, kind: 'food', about: 'A wedge of white cheese in cloth.' },
  fish:   { name: 'Smoked fish', price: 3, kind: 'food', about: 'River fish, smoked, wrapped in leaves.' },
  rope:   { name: 'Rope', price: 5, kind: 'gear', about: 'Ten feet of good hemp rope.' },
  oil:    { name: 'Lamp oil', price: 4, kind: 'gear', about: 'A flask, for a lantern.' },
  cloth:  { name: 'Dyed cloth', price: 8, kind: 'gear', about: 'A fold of blue Merkhscowes cloth.' },
  ale:    { name: 'Ale', price: 2, kind: 'food', about: 'A jug of the tavern\'s brown ale.' },
  stew:   { name: 'Hot stew', price: 3, kind: 'food', about: 'A bowl, bread on the side.' },
};
const STALL_WARES = [['bread', 'apple', 'cheese'], ['fish', 'cheese', 'oil'], ['cloth', 'rope', 'apple']];
// what a person sells: the keeper the tavern's table, stallholders one of three baskets by name
export function waresFor(p) {
  if (p.role === 'keeper') return ['ale', 'stew', 'bread'];
  if (p.role !== 'stall') return [];
  let h = 0; for (const c of p.who || '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return STALL_WARES[h % STALL_WARES.length];
}
// buy one thing: takes the dinar from the purse and puts it in the bag. Returns { ok, msg, purse }
export function buy(purse, bag, id) {
  const g = GOODS[id]; if (!g) return { ok: false, msg: 'They have none of that.', purse };
  if (purse < g.price) return { ok: false, msg: 'You cannot cover ' + g.price + ' dinar.', purse };
  const have = bag.find((b) => b.id === id);
  if (have) have.qty++; else bag.push({ id, name: g.name, qty: 1, kind: g.kind, about: g.about });
  return { ok: true, msg: g.name + ' for ' + g.price + ' dinar.', purse: purse - g.price };
}
