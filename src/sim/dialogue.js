// TARIEL CAULSLEIGH - conversation: a small engine for branching talk. Pure (tested in node); the screen side is in
// game/main.js, and what people actually say is in sim/story.js.
//
// A script is a table of nodes:
//   { who: 'Name', lang: 'Kernac', line: 'text' | (ctx, state) => 'text',
//     choices: [{ text, go, if(ctx, state), set: {flag: value}, note: [id, text] }],
//     go: 'next node'      // if there are no choices: what "continue" leads to (none = the talk ends)
//     set: {...}, note: [id, text] }   // what this node does as it is shown
// ctx is who is speaking to whom and when ({ face, nights, hour, day }); state is what the story remembers.

export function newStory() { return { flags: {}, notes: [], told: {} }; }

export function addNote(state, id, text, day) {
  if (state.notes.some((n) => n.id === id)) return false;
  state.notes.push({ id, text, day: day || 1 });
  return true;
}
export const has = (state, flag) => !!state.flags[flag];

export class Convo {
  constructor(script, ctx, state, start) {
    this.script = script; this.ctx = ctx; this.state = state; this.id = null; this.node = null; this.done = false; this.turns = 0;
    this.go(start || 'start');
  }
  go(id) {
    const n = this.script[id];
    if (!n) { this.done = true; this.node = null; return; }
    if (++this.turns > 200) { this.done = true; this.node = null; return; }      // a runaway loop in a script
    this.id = id; this.node = n;
    if (n.set) Object.assign(this.state.flags, n.set);
    if (n.note) addNote(this.state, n.note[0], n.note[1], this.ctx.day);
  }
  // what is on screen now: who speaks, in which language, what they say, and what she may answer
  view() {
    const n = this.node; if (!n) return null;
    const line = typeof n.line === 'function' ? n.line(this.ctx, this.state) : n.line;
    return { who: n.who, lang: n.lang || null, line, choices: this.choices().map((c) => c.text) };
  }
  choices() { return (this.node && this.node.choices ? this.node.choices : []).filter((c) => !c.if || c.if(this.ctx, this.state)); }
  // she answers with choice i
  pick(i) {
    const c = this.choices()[i]; if (!c) return false;
    if (c.set) Object.assign(this.state.flags, c.set);
    if (c.note) addNote(this.state, c.note[0], c.note[1], this.ctx.day);
    if (c.go) this.go(c.go); else { this.done = true; this.node = null; }
    return true;
  }
  // she lets them finish (when there is nothing to answer)
  next() {
    if (!this.node || this.choices().length) return false;
    if (this.node.go) this.go(this.node.go); else { this.done = true; this.node = null; }
    return true;
  }
}

// every node a script can reach: used by the tests to make sure no talk leads nowhere or loops for ever
export function check(script, start) {
  const bad = [], seen = new Set(), todo = [start || 'start'];
  while (todo.length) {
    const id = todo.pop(); if (seen.has(id)) continue; seen.add(id);
    const n = script[id]; if (!n) { bad.push('missing node ' + id); continue; }
    if (n.line === undefined) bad.push(id + ' has no line');
    if (n.go) todo.push(n.go);
    for (const c of n.choices || []) { if (!c.text) bad.push(id + ' has a choice with no text'); if (c.go) todo.push(c.go); }
  }
  return { bad, reached: seen.size };
}
