# Tariel Caulsleigh — Design Document (Chapter One: The Trenite at Stanlech)

*Draft 2, 22 October 2026 (Rhys's answers folded in). For Rhys to approve or change. Everything here is built on Rhys's notes
(Tariel Caulsleigh – Some Notes, The Saeslands Novel, The Saeslands World Compendium, the Azgaar map
"Tariel's World"); where those notes and the map disagree, **the notes win**. Places on the map that the
notes don't mention still exist.*

Items marked **[ASK]** need Rhys's answer before they are built. Items marked **[PROPOSED]** are my
suggestions, not canon, until he says yes.

---

## 1. The game in one paragraph

A 3D open-world RPG in the browser. You play **Lady Tariel Caulsleigh**, unterofficer of the Saes and
daughter of the Baron of Cawel — and, more often than not, **Thiah Kirðotr**, the barefoot "peasant
princess" from Kern. Explore, talk, fight, and change the places you pass through. The setting is the
early-Saxon-flavoured continent of the Baronreich of Saes, Gy̌mraečland, Kern, Sźettereich, Mittland and
beyond. The tone (from Rhys's novel notes): grounded but mythic, character-driven, political intrigue mixed
with mystery, slow-burn, rich in culture, language and everyday life; the world learned through the
characters, never through exposition dumps.

## 2. Structure of the world

- **Vast Regions**, in the manner of Breath of the Wild / Tears of the Kingdom. Each region can be mapped
  by exploring it — your map fills in where you have been — and each has a **Revealer** that gives you its
  fuller map in one go. **Revealers are people** (Rhys): cartographers and explorers, each with the
  map of their region to share.
- **Region size** (Rhys): roughly one Saes shire; several Mittland counties; about a third of
  Nóttenlanter.
- **Scale.** The Azgaar map is about 1,500 × 780 pixels, roughly 1.5 miles a pixel — a true-scale
  continent is impossible in a browser. The terrain is built *from* the map's own heights, biomes and
  rivers, but compressed: a region is a few kilometres across, its towns real places you walk through.
- **Chapter One covers one corner of one region**: the Cawel side of the Cawel–Sźettereich border.

### Where Stanlech is

Stanlech isn't on the Azgaar map (Rhys: "I somehow completely neglected it"). It goes where the
**Yolo River** forms the border between **Cawel Shire** and Sźettereich's **Ausserreich Province**, at map
position ≈ (303, 478) — between the map's Mahlterngen and Fluor. The town sits on both banks: the Saes
side and the Sźetter side, joined by its bridge. **Shappel-ont'-Laik** is upriver, on the Cawel side
(Rhys).

## 3. Chapter One — the Trenite at Stanlech

From Rhys's notes; the plot is new, the world and characters canon.

1. **The hill above Stanlech.** Morning mist. Lord Caulsleigh, First Sergeant Síofel and Tariel look down
   on the town. The mission: enter as Thiah Kirðotr, stay a **Trenite** (three consecutive nights),
   quietly investigate the town, its people, and anything unusual. *(Tutorial: movement, the look of
   the world, switching to Thiah.)*
2. **The summons.** A rider: rebellion elsewhere in Cawel. Caulsleigh and Síofel leave with the soldiers.
   Tariel is alone — no Baron's daughter to fall back on, only Thiah.
3. **Stanlech, alive.** The tavern is its social heart: music, games, travellers, merchants, border
   guards, languages mixing. People keep their own daily routines across the three days and nights. The
   player should *enjoy* the town before things begin to fall apart.
4. **Elar.** Already staying at the tavern. He looks at Thiah a moment too long: *"Forgive me… you remind
   me of someone." — "Do I?" — "I cannot quite place who."* Neither pushes it. (Much later: *"It was
   your eyes."*)
5. **Punk's shadow.** Nobody knows he has come. Bar fights, manipulation, fear spreading; frightened
   conversations, warnings not to travel alone, people missing; the news from **Shappel-ont'-Laik** — a
   Stanlech woman murdered — arriving in the town. His crimes are implied, never shown (Rhys's notes).
   The player pieces it together through talk and exploration before he is revealed.
6. **The order of things** (Rhys): the establishment of Stanlech; the games in the tavern; meeting Elar;
   encountering Punk briefly; later, heading north. The exact ending of Chapter One is still open —
   Punk must survive it (he reaches the Saes courts later); Tariel is *always* better than him.

Not in Chapter One (per Rhys's notes): **Galvan, Crow of Fourdooms** (introduced much later, in Kern, with
Gwethyl), the corrupt trial, Ranthor.

## 4. Systems

### Two identities

- **Thiah Kirðotr**: barefoot, posh rags, Kernish manner, the **Mark of Kern** on her left foot. Common
  folk talk freely to her; guards and lords don't. Thiah can **invest** in a town she likes.
- **Lady Tariel Caulsleigh**: the Baron's daughter in her officer's dress. Doors open, soldiers obey —
  and townsfolk go quiet.
- **Cover.** Behaving out of character (giving orders as Thiah, fighting like a trained Saes soldier in
  public) risks someone noticing. Exposure matters and isn't simply game over. **[PROPOSED]**
- **Galvan** (from later chapters) will help Thiah and refuse to trust Tariel, never realising they are the
  same person.

### Conversation

Branching dialogue with character-driven choices, no morality meter. People remember what you said and
which of your faces you said it with. **Languages** (Rhys): written in English, with a label saying
which language is being spoken — *[Kernac]*, *[Merkhscowes]* — and Thiah and Tariel understand some
and not others.

### Combat

Sword, bow and hand-to-hand, all of which Tariel is expert in (Rhys's notes). Third-person, readable,
weighty — built on Frontline's character and combat code. Thiah fighting in public with a soldier's
technique is a cover risk.

### Time — the Trenite clock

Days and nights pass. People keep schedules (the market by day, the tavern by night). Chapter One runs
on a three-night clock: events happen on particular days and nights whether or not Tariel is there to
see them.

### Money

Each people its own coinage (Rhys's notes): the **Saes & Gwalas Librar** (assar, dinar, librar — the
Latin-sounding names come through Gwalas, an alt-historical France, and so the "Latin world"), the
Mittland **Avér**, the Janhar **Mark**, the Lunesir **Skast**, the Kern & Kernivan **Kregyn**. Prices are
quoted in the local coin; money-changers exist on borders — Stanlech has one.

### Changing a town

Thiah spending her coin on a place visibly changes it (a mended roof, a stall restocked, a well dug) and
changes how its people treat her. Political effects, but no ruling.

### Tavern games

From Rhys's Game Ideas (names and meanings his; the rules made up as we go):

- **Board games** (chess / tafl-like): **Cynwig** ("King's War": a two-player or two-team battle game,
  like chess); **Hiltavel** ("Battle Game"); **Wulfund** ("Wolf and…": asymmetrical); **Feondfang**
  ("Enemy-Trap").
- **Card games**: **Swic / Sweek** ("Deception": poker-like); **Hlotpleg / Sjlot** ("lot-play").
- **Rune games**: **Wedh / Weð** ("I pledge"); **Threot** ("The Three": Yahtzee-like).
- **Dexterity**: **Stanflit** ("stone-flight": flick stones or discs toward a central circle).
- **Social deduction**: **Bana** ("death / killers": Mafia / Werewolf for the Saes — roles drawn as runes;
  in the night phase the Bana agree on a victim and put a rune in their hand: white, they live; black,
  they "die").
- Also mentioned by Rhys: a **drinking game** and **oil wrestling** (no details yet; the wrestling would be
  presented as the sport it is).
- **Not in the game**: *Fetcwena* (Claude declined to build it).

### Dark material

Torture and abuse scenes: Rhys will specify them when the story reaches them. They will be staged
seriously — framing, sound, aftermath — and never gratuitously; sexual violence stays implied, as Rhys's
notes already require.

## 5. Technology

- **PlayCanvas, in the browser**, like Frontline — runs on a Chromebook; no install.
- **Terrain from the Azgaar export**: heights, biomes, rivers and settlements read from Rhys's map file
  and turned into 3D ground, forest, water and roads.
- **GitHub Pages**: https://gooseknightgaming.github.io/Tariel-Caulsleigh/ — every playable build is
  pushed there, with a version number (T0.1, T0.2, …) for Rhys to playtest against.

## 6. Build order for Chapter One [PROPOSED]

1. **T0.1** (built) — the hill above Stanlech and the valley below it as terrain from the map; Tariel walking,
   running, the camera; day and night; the opening on the hill; the map that fills in as you explore.
   **T0.1.1** (built) — Rhys's first playtest: houses built from the Medieval Village kit, solid and enterable;
   the tavern furnished, its bed let by the night (sleep as Thiah, three nights = the Trenite); Tariel ⇄ Thiah
   (Q); a pause menu; the rider on horseback; the bridge walkable.
2. **T0.2** — Stanlech: the bridge, the river, the tavern, the market, houses; townsfolk on routines.
3. **T0.3** — conversation; Elar; the Thiah / Tariel switch.
4. **T0.4** — combat (fists, sword, bow); the bar fight.
5. **T0.5** — the Trenite clock and the Punk mystery; the third night.
6. **T0.6** — coin, trade and investing in Stanlech; the tavern games (once Rhys has described them).
7. **T1.0** — Chapter One complete, start to finish.

## 7. Open questions for Rhys

Answered on 22 October: Revealers, region size, the order of Chapter One, the tavern games' names,
English with language labels, the Yolo River's name, Shappel-ont'-Laik. Still open:

1. The exact **ending of Chapter One**.
2. The **drinking game** and **oil wrestling**: names and any details.
