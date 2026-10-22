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

Controls: **WASD** move · **mouse** look · **wheel** zoom · **Shift** run · **C** walk/jog · **Space**
jump · **M** map · hold **T** to hurry time · **H** help. A gamepad works too.

Building: `npm install`, `npm test`, `node build.mjs` (writes `index.html` and `game.js` here, from `src/`).
