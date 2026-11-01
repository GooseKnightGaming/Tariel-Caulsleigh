// TARIEL CAULSLEIGH - what the people of Stanlech say, by who they are, who is speaking to them (Thiah the barefoot
// peasant, or Tariel the officer), and how far the three nights of the Trenite have gone. Pure (tested in node).
//
// DRAFT (T0.3): written by Claude from Rhys's notes, in the voices the notes suggest. Names, lines and the order of
// rumours are all Rhys's to change. Punk's crimes are only ever implied: people report what they heard or saw, nothing
// is shown. Languages: English throughout, with a label where another language is spoken ([Merkhscowes], [Kernac]).
//
// ctx: { face: 'thiah' | 'tariel', nights: 0..3 (Trenite nights slept), day, hour }.

const STAGE = (ctx) => Math.min(2, ctx.nights);
// an entry is one line, or a line per stage, or a line per face (or a line per stage per face)
function say(entry, ctx) {
  let e = entry;
  for (let k = 0; k < 4 && e && typeof e === 'object'; k++) e = Array.isArray(e) ? e[STAGE(ctx)] : e[ctx.face];
  return e === undefined ? null : e;
}

const NOTE = {
  greycoat: ['greycoat', 'A tall man in a grey coat has been seen watching the bridge and the tavern door at dusk. He speaks to no one, and nobody knows his name.'],
  brawl: ['brawl', 'Two men fought at the tavern over nothing the first night. The keeper thinks someone had been whispering in their ears.'],
  edda: ['edda', 'News from Shappel-ont\'-Laik: Edda Wyke, who sold eggs at Stanlech market, was found dead on the Shappel road.'],
  cob: ['cob', 'Cob Harker, Nell\'s brother, has not been home since the second night.'],
  alone: ['alone', 'People are warning each other not to travel alone, and bolting their doors at dusk.'],
  elar: ['elar', 'Elar, who is lodging at the tavern, said I remind him of someone. He could not place who.'],
  elar2: ['elar2', 'Elar paid a month ahead, keeps to himself, and asks a good many questions for a man who says he is only waiting on a letter.'],
};

// ── the answers: [stage 0, 1, 2], each a line or { thiah, tariel } ─────────────────────────────────────────────
const GREET = {
  keeper: { thiah: ['Mind the step, lass. Ale, a bed or the news - I\'ve a little of each.', 'Rough night, that. Sit where you can see the door, lass.', 'We bar the door at dusk now. House rule, till this blows over.'],
    tariel: ['My lady. The house is yours - anything you need.', 'My lady. Forgive the noise last night. It will not happen again.', 'My lady. I have doubled the bar on the door. These are strange days.'] },
  guard: { thiah: ['Barefoot? Move along, girl, nothing to see.', 'Keep to the street after dark, girl.', 'Don\'t cross the fields alone. Orders.'],
    tariel: ['Unterofficer! Nothing to report.', 'Unterofficer. A quiet bridge, mostly.', 'Unterofficer. I would double the watch if I had the men.'] },
  stall: { thiah: ['Fresh this morning, lass. Look all you like.', 'Fewer folk about today. Odd.', 'Packing up early. Nobody\'s buying; everybody\'s looking over their shoulder.'],
    tariel: ['My lady! Take a look, no charge for looking.', 'My lady. Trade is slow today.', 'My lady. I shall be closing early, if you will forgive it.'] },
  villager: { thiah: ['Morning. You\'re not from Stanlech.', 'Did you hear the noise last night?', 'It isn\'t safe, you know. Not safe at all.'],
    tariel: ['My lady.', 'My lady... we do not often see the Baron\'s people here.', 'My lady. Is it true the soldiers are coming?'] },
};
const TOPICS = {
  keeper: {
    town: ['Two banks, one bridge, one tavern worth the name - this one. Saes on this side, Sźetter on the far; we all drink the same ale.', 'Busy as ever, but the mood has turned. Last night\'s brawl will be the talk till Sunday.', 'People drink early and leave early. I have never known the room so quiet.'],
    strangers: ['Elar\'s the only long stayer. Paid a month ahead, keeps to himself. A quiet gentleman.', 'A man in a grey coat stood across the street last night, watching my door. Never came in.', 'He has not been back, the grey coat. That is what frightens me. I would rather see him.'],
    strange: [null, 'Two men near killed each other over a spilled cup. Friends at supper, enemies by closing. I have kept this room nine years; someone had been whispering in their ears. I don\'t know who.', 'They say Edda Wyke is dead on the Shappel road. She sold eggs at the market. God rest her.'],
    road: [null, 'The Shappel road is the old drovers\' way. I would not walk it at dusk.', 'Stay off the Shappel road. Nobody walks alone now - that is the word.'],
    notes: { strangers: [null, 'greycoat', 'greycoat'], strange: [null, 'brawl', 'edda'] },
  },
  guard: {
    town: ['Quiet posting. Toll on the bridge, a few drunks, some smuggled cheese.', 'Not so quiet lately.', 'Not quiet at all.'],
    strangers: { thiah: ['Not for the likes of you to know, girl.', 'Not for the likes of you to know, girl.', 'Not for the likes of you to know, girl.'], tariel: ['We log everyone who crosses. A harper, a wool trader, a gentleman named Elar lodging at the tavern. Nothing to worry about.', 'A tall man in a grey coat stood on the bridge at dusk and watched us log the crossers. Did not cross. Did not speak. When we went to ask, he was gone.', 'The grey coat again, they say. Two sightings, no name, no face worth describing. I do not like it, Unterofficer.'] },
    strange: { thiah: [null, 'Brawls. Drink. Nothing a barefoot girl needs fret over.', 'Stay off the roads, girl. That\'s all I\'ll say.'], tariel: [null, 'A brawl at the tavern last night - two men nearly killed each other and neither could say why. I saw soldiers like that once, before a mutiny.', 'A Stanlech woman, Edda Wyke, found dead on the Shappel road. The Shappel reeve sent word at noon. Nobody says murder aloud, but nobody says anything else.'] },
    road: { thiah: [null, 'Keep off the Shappel road.', 'Keep off the Shappel road. I mean it.'], tariel: [null, 'The Shappel road is quiet by day. By night, I would send two riders, not one.', 'I have sent a rider to Shappel for the reeve\'s account. Until it returns, nobody leaves Stanlech alone.'] },
    notes: { strangers: { thiah: [null, null, null], tariel: [null, 'greycoat', 'greycoat'] }, strange: { thiah: [null, null, null], tariel: [null, 'brawl', 'edda'] } },
  },
  stall: {
    town: ['Trade is steady. Border folk buy everything twice - once here, once on the far bank.', 'Fewer buyers than yesterday. Folk are keeping their coin close.', 'I will be gone by noon. There is no trade in fear.'],
    strangers: ['Plenty of faces. A wool trader, a harper... you can\'t tell who\'s who on a border.', { thiah: 'There was a tall one in a grey coat, stood by my stall yesterday dusk. Bought nothing. Looked at everything.', tariel: 'Nobody out of the ordinary, my lady.' }, { thiah: 'The grey coat again. I won\'t say where, but I can\'t stop seeing him.', tariel: 'Nobody I could name, my lady.' }],
    strange: [null, { thiah: 'The brawl at the tavern. My husband says it was over nothing. My husband\'s a fool, but he\'s right about that.', tariel: 'A brawl, my lady. The tavern is the tavern.' }, { thiah: 'Edda Wyke, dead on the Shappel road. We bought eggs from her every market day. I keep thinking she\'ll walk up with her basket.', tariel: 'Terrible news from Shappel, my lady. Terrible.' }],
    road: [null, 'I came in on the Shappel road this morning, and I\'d not come again today.', 'Nobody I know will go by the Shappel road now.'],
    notes: { strangers: [null, { thiah: 'greycoat', tariel: null }, { thiah: 'greycoat', tariel: null }], strange: [null, { thiah: 'brawl', tariel: null }, 'edda'] },
  },
  villager: {
    town: ['Stanlech? Two banks and one bridge. We were one village once, till the border cut it in half.', 'Stanlech\'s... louder than it was.', 'Stanlech is shutting its doors.'],
    strangers: ['Plenty, this time of year. Travellers, traders. You, for one.', { thiah: 'A tall man in a grey coat. I saw him on the bridge two dusks running. Never drinks, never talks, only watches.', tariel: 'Nobody, my lady.' }, { thiah: 'The grey coat. They say he\'s gone. I\'m not sure I believe it.', tariel: 'Nobody, my lady. Nobody I would tell you about.' }],
    strange: [null, { thiah: 'Folk have been odd. Two friends of mine fought last night and swore they\'d wanted to do it for years. They hadn\'t. I knew them.', tariel: 'I would not know, my lady.' }, { thiah: 'Edda Wyke, found dead on the Shappel road. Edda! She\'d not hurt a hen.', tariel: 'There is news from Shappel, my lady. Bad news.' }],
    road: [null, 'The roads are fine in daylight.', 'Nobody I know will travel alone.'],
    notes: { strangers: [null, { thiah: 'greycoat', tariel: null }, { thiah: 'greycoat', tariel: null }], strange: [null, { thiah: 'brawl', tariel: null }, 'edda'] },
  },
};
// a few people have a worry of their own, once the nights have turned
const PERSONAL = {
  'Nell Harker': { from: 2, text: { thiah: 'It\'s my brother, Cob. He went to bring in the goats the night before last and he hasn\'t come home. He\'s never done that. The guards say wait. I can\'t wait.', tariel: 'My lady... it is my brother, Cob. He has not come home since the night before last. The guards say to wait.' }, note: 'cob', ask: 'You look worried.' },
  'Osric Venn': { from: 1, text: { thiah: 'I\'ll tell you who watches this town. A man in a grey coat, tall, who doesn\'t sit and doesn\'t drink. He stands where the lamp doesn\'t reach. I saw him at the bridge, then outside the tavern. Same man.', tariel: 'I would not trouble you, my lady.' }, note: 'greycoat', ask: 'You seem to notice things.' },
  'Bertha Lisle': { from: 2, text: { thiah: 'Edda was my cousin\'s neighbour. They found her on the Shappel road, a day\'s walk from home. Nobody says how. Nobody has to say how.', tariel: 'There is a death on the Shappel road, my lady. A Stanlech woman. I knew her a little.' }, note: 'edda', ask: 'You\'ve been crying.' },
  'Aldous Fenn': { from: 1, text: { thiah: 'I trade in cloth and I hear everything. This week the border folk are all saying the same thing: don\'t be the last on the road at dusk.', tariel: 'Cloth, my lady. And little else of interest.' }, note: 'alone', ask: 'What do you hear, trading cloth?' },
  'Wenna Carr': { from: 1, text: { thiah: 'Girl, I\'ve told you.', tariel: 'Unterofficer, I am not easy with how the crossers are looking over their shoulders. People are afraid and no one has told them to be.' }, note: null, ask: 'How are the crossers?' },
};

function folkScript(p, ctx) {
  const st = STAGE(ctx), role = TOPICS[p.role] ? p.role : 'villager', T = TOPICS[role], G = GREET[role];
  const who = p.who;
  const line = (entry) => say(entry, ctx);
  const menu = [], script = {};
  const add = (key, text, entry, noteEntry) => {
    const lineText = say(entry, ctx);
    if (lineText === null) return;
    const nk = noteEntry === undefined ? null : say(noteEntry, ctx);
    menu.push({ text, go: key });
    script[key] = { who, line: lineText, note: nk ? NOTE[nk] : undefined, choices: menu };
  };
  const N = T.notes || {};
  add('t_town', 'What is Stanlech like?', T.town);
  add('t_strangers', 'Seen any strangers?', T.strangers, N.strangers);
  add('t_strange', 'Anything strange happening?', T.strange, N.strange);
  add('t_road', 'Is the Shappel road safe?', T.road);
  const per = PERSONAL[who];
  if (per && ctx.nights >= per.from) {
    menu.push({ text: per.ask, go: 't_personal' });
    script.t_personal = { who, line: per.text[ctx.face], note: per.note ? NOTE[per.note] : undefined, choices: menu };
  }
  menu.push({ text: 'Goodbye.' });
  script.start = { who, line: G[ctx.face][st], choices: menu };
  return script;
}

// ── Elar: staying at the tavern, "already", as Rhys's notes have it ──────────────────────────────────────────────
function elarScript(p, ctx, state) {
  const who = 'Elar', st = STAGE(ctx), thiah = ctx.face === 'thiah', S = {};
  const menu = [
    { text: 'Where are you from?', go: 'where' },
    { text: 'What brings you to Stanlech?', go: 'why' },
    { text: 'Have you noticed anything odd here?', go: 'odd', if: (c) => c.nights >= 1 },
    { text: 'Goodbye.' },
  ];
  S.where = { who, line: 'North, mostly. East, when the roads allow. A man gets used to being from the road.', choices: menu };
  S.why = { who, line: st === 0 ? 'A letter. It is late, and I am patient, and the keeper brews a fair ale.' : 'Still waiting on a letter. I am beginning to think it is waiting on me.', choices: menu, note: NOTE.elar2 };
  S.odd = { who, line: st === 1 ? 'The brawl. I saw the first blow. It was not anger - I have seen anger. It was... obedience.' : 'I walk the room at night, and this town has gone quiet in a way I do not like. Do not walk alone, ' + (thiah ? 'Thiah' : 'my lady') + '. I mean that kindly.', choices: menu };
  if (thiah) {
    if (!state.flags.elar_thiah) {
      // the first meeting: from Rhys's notes
      S.start = { who, line: 'Forgive me... you remind me of someone.', set: { elar_thiah: true }, choices: [
        { text: 'Do I?', go: 'do' },
        { text: 'I\'m sure I don\'t.', go: 'sure' },
        { text: '(Say nothing.)', go: 'silent' },
      ] };
      S.do = { who, line: 'I cannot quite place who.', go: 'drop' };
      S.sure = { who, line: 'No. No, I\'m sure you don\'t. I cannot quite place who.', go: 'drop' };
      S.silent = { who, line: 'I cannot quite place who. Forgive me; it will come to me.', go: 'drop' };
      S.drop = { who, line: '(He turns his cup a quarter-turn on the table. Neither of you pushes it.) Sit, if you like. The keeper brews a fair ale.', note: NOTE.elar, choices: menu };
    } else S.start = { who, line: st === 0 ? 'Thiah. Sit, if you like.' : 'Thiah. You are about early.', choices: menu };
  } else {
    if (!state.flags.elar_tariel) S.start = { who, line: 'An officer\'s colours, this far from the Baron\'s road. Is the shire safe, my lady?', set: { elar_tariel: true }, choices: [
      { text: 'Quiet enough.', go: 'quiet' }, { text: 'Ask me again tomorrow.', go: 'tomorrow' } ] };
    else S.start = { who, line: 'My lady.', choices: menu };
    S.quiet = { who, line: 'Then I shall sleep easily. Forgive me - I do not often meet the Baron\'s people.', choices: menu };
    S.tomorrow = { who, line: 'A cautious answer. I shall ask again.', choices: menu };
  }
  return S;
}

// ── the rest of the new faces ────────────────────────────────────────────────────────────────────────────────────
function harperScript(p, ctx) {
  const who = p.who, st = STAGE(ctx), S = {}, menu = [
    { text: 'What are you playing?', go: 'song' }, { text: 'You must hear everything, playing here.', go: 'hear' }, { text: 'Goodbye.' }];
  S.song = { who, line: 'An old drovers\' tune, "The Heron at the Ford." It has forty verses. The tavern prefers six.', choices: menu };
  S.hear = { who, line: st === 0 ? 'Everything and nothing. Drunk men tell harpers their troubles. I tell them nothing back.' : st === 1 ? 'Last night the tune went wrong in my hands. Two men who had been laughing began to fight, and I played on, because I did not know what else to do.' : 'The room is half empty. I play to the ones who stay. I dare not say it is bad for my purse, with Edda Wyke dead.', choices: menu, note: st === 1 ? NOTE.brawl : st === 2 ? NOTE.edda : undefined };
  S.start = { who, line: 'A song, or just a seat by the fire?', choices: menu };
  return S;
}
function traderScript(p, ctx) {
  const who = p.who, thiah = ctx.face === 'thiah', S = {}, lang = 'Merkhscowes';
  const menu = [{ text: 'What do you sell?', go: 'sell' }, { text: 'The roads - safe?', go: 'road' }, { text: 'Goodbye.' }];
  S.start = { who, lang, line: thiah ? '...evening... stranger... wool, yes?  (You catch one word in three.)' : 'Good evening, my lady. Wool, miss - Mittland fleece, none finer between here and the sea.', choices: menu };
  S.sell = { who, lang, line: thiah ? '...Mittland... fleece... best... sea.  (Wool, you gather. You\'d need a Merkhscowes speaker to haggle.)' : 'Wool from the Mittland downs, and dyed cloth from Merkhscowes looms. I sell by the bale and by the fortnight.', choices: menu };
  S.road = { who, lang, line: thiah ? '...road... no. Not... night. Not... alone.  (You catch enough.)' : 'I came by the north road. Quiet. But the border folk talk, and what they say I do not like to repeat in a tavern.', choices: menu, note: ctx.nights >= 1 ? NOTE.alone : undefined };
  return S;
}
function changerScript(p, ctx) {
  const who = p.who, S = {}, menu = [
    { text: 'What do you change?', go: 'what' }, { text: 'How do the coins stand?', go: 'rate' }, { text: 'Goodbye.' }];
  S.start = { who, line: ctx.face === 'tariel' ? 'Unterofficer. Saes librar, I presume. A fair cut for a fair bridge.' : 'Coin? I change any honest coin, barefoot or booted.', choices: menu };
  S.what = { who, line: 'Saes and Gwalas librar, Kern kregyn, Mittland avér, Janhar mark, Lunesir skast. I weigh them all.', choices: menu };
  S.rate = { who, line: 'A librar is worth twenty dinar, and a dinar twelve assar. Everything else, I\'ll tell you the day you want it.', choices: menu };
  return S;
}

// everything a person might say to her now: a script for the engine (sim/dialogue.js)
export function scriptFor(p, ctx, state) {
  if (p.role === 'elar') return elarScript(p, ctx, state);
  if (p.role === 'harper') return harperScript(p, ctx);
  if (p.role === 'trader') return traderScript(p, ctx);
  if (p.role === 'changer') return changerScript(p, ctx);
  return folkScript(p, ctx);
}
export function roleName(p) {
  return { keeper: 'innkeeper', guard: 'guard', stall: 'stallholder', villager: 'villager', elar: 'lodger', harper: 'harper', trader: 'wool trader', changer: 'money-changer' }[p.role] || 'villager';
}
