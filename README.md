# Tariel Caulsleigh

A 3D open-world RPG in the browser, set in Rhys's Saeslands: play as Lady Tariel Caulsleigh — and as
Thiah Kirðotr, the barefoot peasant princess from Kern.

**Play (in development):** https://gooseknightgaming.github.io/Tariel-Caulsleigh/

Design: [DESIGN.md](DESIGN.md) — Chapter One, the Trenite at Stanlech.

© GooseKnight. All rights reserved.

## Builds

**T0.1** — the hill above Stanlech and the Yolo valley (2.4 km square): Stanlech on both banks and its
bridge, Shappel-ont'-Laik upriver, the woods; Tariel on foot (walk, jog, sprint, jump, stamina); the
camera; a 24-minute day with dawn mist, dusk and stars; the opening on the hill (draft lines); the map
(**M**), which fills in as you explore. Tariel, Lord Caulsleigh, First Sergeant Síofel and the rider are built by `tools/build_people.mjs` from the Quaternius packs (Universal Base Characters, Modular Character Outfits – Fantasy, Universal Animation Library 1 and 2; CC0); outfit colours are placeholders until the Saes colours are settled.

**T0.1.1** — proper buildings: every house in Stanlech and Shappel-ont'-Laik is built from the Medieval
Village MegaKit (Saes plaster and timber on the Cawel bank, rough brick on the Sźetter bank), solid, with an
open door and a floor to walk in on; the tavern furnished from the Fantasy Props MegaKit, with a bed it lets
by the night (**E**, as Thiah, in the evening: three nights make the Trenite). **Q** switches between Tariel
and Thiah Kirðotr (barefoot, posh rags, hair loose). **Esc** pauses (controls, settings). The rider comes up
the hill on horseback. Walls, the well and tree trunks are solid; the camera stays in front of walls; the
bridge can be walked.

**T0.1.2** — Rhys's second playtest: a debug line (**F3**); doors shut by default, **E** opens and closes them
(the tavern's stands open); a Character page (**K**: traits to put points into - Strength, Agility, Endurance,
Wits, Presence; a first draft) and a Gear & bag page (**I**); Thiah's lower legs, and the Mark of Kern on her left
foot (Rhys's design, tools/art); the rider astride his horse; no invisible wall under the tavern's chandelier;
the guard posts' barriers laid straight along the road.

Controls: **WASD** move · **mouse** look · **wheel** zoom · **Shift** run · **C** walk/jog · **Space**
jump · **Q** Tariel / Thiah · **E** use · **I** gear · **K** character · **M** map · hold **T** to hurry time · **Esc** pause · **F3** debug line · **H** help. A gamepad works too.

Building: `npm install`, `npm test`, `node build.mjs` (writes `index.html` and `game.js` here, from `src/`).
