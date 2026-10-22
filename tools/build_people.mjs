// TARIEL CAULSLEIGH - builds the people of the opening: assets/characters/<Name>.glb
// From Rhys's Quaternius packs (CC0):
//   Universal Base Characters: the base body (head and neck kept), eyes, eyebrows, hairstyles (rigged to the head)
//   Modular Character Outfits - Fantasy: Ranger and Peasant parts (glTF, Modular Parts)
//   Universal Animation Library 1 and 2: the clips (bone rotations, and the hips scaled to each body)
// All share one 65-bone skeleton; each part is re-pointed at the body's skeleton by bone name.
// Textures come from tools/people_textures.py (sized for a Chromebook, recoloured per person).
//   node tools/build_people.mjs <quaternius-root> <textures-dir> <out-dir>
import fs from 'fs';
import { NodeIO } from '@gltf-transform/core';
import { mergeDocuments, prune, unpartition, dedup, resample } from '@gltf-transform/functions';

const [ROOT, TEX, OUT] = process.argv.slice(2);
const BASE = `${ROOT}/z13/Universal Base Characters[Standard]/Universal Base Characters[Standard]`;
const BODY = `${BASE}/Base Characters/Godot - UE`;
const HAIR = `${BASE}/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)`;
const PARTS = `${ROOT}/z12/Modular Character Outfits - Fantasy[Standard]/Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)/Modular Parts`;
const UAL = [
  `${ROOT}/z13/Universal Animation Library[Standard]/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb`,
  `${ROOT}/z13/Universal Animation Library 2[Standard]/Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb`,
];
const CLIPS = ['Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Jump_Start', 'Jump_Loop', 'Jump_Land',
  'Idle_Talking_Loop', 'Idle_FoldArms_Loop', 'Yes', 'Idle_No_Loop', 'Interact', 'Walk_Formal_Loop',
  'Sitting_Idle_Loop', 'Sitting_Talking_Loop', 'Swim_Idle_Loop', 'Swim_Fwd_Loop'];

// who wears what (colours are placeholders until Rhys gives the Saes colours)
const PEOPLE = {
  Tariel: { sex: 'f', parts: ['Female_Ranger_Body', 'Female_Ranger_Legs', 'Female_Ranger_Arms', 'Female_Ranger_Feet'],
    hair: ['Hair_Buns'], outfit: 'ranger_green', hairTex: 'darkblonde', eyes: 'eye_green' },   // dark blonde, tied up for duty; green eyes
  Caulsleigh: { sex: 'm', parts: ['Male_Ranger_Body', 'Male_Ranger_Legs', 'Male_Ranger_Arms', 'Male_Ranger_Feet_Boots', 'Male_Ranger_Acc_Pauldron'],
    hair: ['Hair_SimpleParted', 'Hair_Beard'], outfit: 'ranger_blue', hairTex: 'greying', eyes: 'eye_brown' },
  Siofel: { sex: 'm', parts: ['Male_Ranger_Body', 'Male_Ranger_Legs', 'Male_Ranger_Arms', 'Male_Ranger_Feet_Boots'],
    hair: ['Hair_Buzzed'], outfit: 'ranger_brown', hairTex: 'dark', eyes: 'eye_brown' },
  // Thiah Kirðotr: Tariel undercover - barefoot (the base body's own feet), posh rags, hair loose (her notes)
  Thiah: { sex: 'f', parts: ['Female_Peasant_Body', 'Female_Peasant_Legs', 'Female_Peasant_Arms'], bareFeet: true,
    hair: ['Hair_Long'], outfit: 'peasant_light', hairTex: 'darkblonde', eyes: 'eye_green' },
  Rider: { sex: 'm', parts: ['Male_Peasant_Body', 'Male_Peasant_Legs', 'Male_Peasant_Arms', 'Male_Peasant_Feet'],
    hair: ['Hair_SimpleParted'], outfit: 'peasant', hairTex: 'dark', eyes: 'eye_brown' },
};

const io = new NodeIO();
const png = (doc, name) => doc.createTexture(name).setImage(fs.readFileSync(`${TEX}/${name}.png`)).setMimeType('image/png');

async function build(name, who) {
  const doc = await io.read(`${BODY}/Superhero_${who.sex === 'f' ? 'Female' : 'Male'}_FullBody.gltf`);
  const root = doc.getRoot(), skin = root.listSkins()[0], scene = root.listScenes()[0];
  const names = skin.listJoints().map((j) => j.getName()), jointIndex = new Map(names.map((n, i) => [n, i]));
  // 1. the base body: only the head and neck (the outfit is the rest)
  for (const node of root.listNodes()) {
    const mesh = node.getMesh(); if (!mesh || !node.getSkin()) continue;
    const prim = mesh.listPrimitives()[0];
    if (!/Superhero/i.test(prim.getMaterial().getName())) continue;
    const J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0'), I = prim.getIndices();
    const dom = [];
    for (let v = 0; v < J.getCount(); v++) {
      const j = J.getElement(v, []), w = W.getElement(v, []); let b = 0;
      for (let k = 1; k < 4; k++) if (w[k] > w[b]) b = k;
      dom.push(names[j[b]]);
    }
    const keepBone = new Set(who.bareFeet ? ['Head', 'neck_01', 'foot_l', 'foot_r', 'ball_l', 'ball_r', 'ball_leaf_l', 'ball_leaf_r'] : ['Head', 'neck_01']), idx = I.getArray(), keep = [];
    for (let t = 0; t < idx.length; t += 3) if ([idx[t], idx[t + 1], idx[t + 2]].some((v) => keepBone.has(dom[v]))) keep.push(idx[t], idx[t + 1], idx[t + 2]);
    I.setArray(idx instanceof Uint16Array ? new Uint16Array(keep) : new Uint32Array(keep));
  }
  // 2. the outfit and the hair, re-pointed at this skeleton
  const files = [...who.parts.map((p) => `${PARTS}/${p}.gltf`), ...who.hair.map((h) => `${HAIR}/${h}.gltf`)];
  for (const file of files) {
    const src = await io.read(file);
    const skinned = src.getRoot().listNodes().filter((n) => n.getMesh() && n.getSkin());
    const map = mergeDocuments(doc, src);
    for (const n of skinned) {
      const remap = n.getSkin().listJoints().map((j) => jointIndex.get(j.getName()));
      if (remap.some((x) => x === undefined)) throw new Error(file + ': a bone the body lacks');
      const m = map.get(n);
      for (const p of m.getMesh().listPrimitives()) {
        const ja = p.getAttribute('JOINTS_0'), arr = ja.getArray().slice();
        for (let i = 0; i < arr.length; i++) arr[i] = remap[arr[i]];
        ja.setArray(arr);
      }
      m.setSkin(skin);
      for (const other of root.listNodes()) if (other.listChildren().includes(m)) other.removeChild(m);
      scene.addChild(m);
      m.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
    }
    for (const sc of src.getRoot().listScenes()) {
      const msc = map.get(sc);
      const kill = (nd) => { for (const c of nd.listChildren()) kill(c); nd.dispose(); };
      for (const c of msc.listChildren()) kill(c);
      msc.dispose();
    }
  }
  // 3. one UV set, no vertex colours; painted textures only (no normal or roughness maps: lighter to draw)
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) for (const s of ['TEXCOORD_1', 'TEXCOORD_2', 'COLOR_0', 'COLOR_1']) if (p.getAttribute(s)) p.setAttribute(s, null);
  const T = {
    skin: png(doc, 'skin_' + who.sex), hands: png(doc, 'hands_' + who.sex), eyes: png(doc, who.eyes), outfit: png(doc, who.outfit),
    hair1: png(doc, 'hair1_' + who.hairTex), hair2: png(doc, 'hair2_' + who.hairTex),
  };
  for (const mat of root.listMaterials()) {
    mat.setNormalTexture(null).setMetallicRoughnessTexture(null).setOcclusionTexture(null).setMetallicFactor(0).setRoughnessFactor(0.8);
    const n = mat.getName();
    if (/Superhero/i.test(n)) mat.setBaseColorTexture(T.skin).setRoughnessFactor(0.65);
    else if (/Regular/i.test(n)) mat.setBaseColorTexture(T.hands).setRoughnessFactor(0.65);
    else if (/Eye/i.test(n)) mat.setBaseColorTexture(T.eyes).setRoughnessFactor(0.3);
    else if (/Hair_1/i.test(n)) mat.setBaseColorTexture(T.hair1);
    else if (/Hair_2/i.test(n)) mat.setBaseColorTexture(T.hair2);
    else if (/Ranger|Peasant/i.test(n)) { mat.setBaseColorTexture(T.outfit).setRoughnessFactor(0.85); mat.setName('MI_Outfit'); }
    else console.log('  (material left as it is)', n);
  }
  // 4. the clips, scaled to this body's hips
  const byName = new Map(root.listNodes().map((n) => [n.getName(), n]));
  const buffer = root.listBuffers()[0], bodyPelvis = byName.get('pelvis').getTranslation();
  for (const file of UAL) {
    const src = await io.read(file);
    const srcPelvis = src.getRoot().listNodes().find((n) => n.getName() === 'pelvis').getTranslation();
    const k = bodyPelvis[2] / srcPelvis[2];
    for (const a of src.getRoot().listAnimations()) {
      if (!CLIPS.includes(a.getName())) continue;
      const out = doc.createAnimation(a.getName()), inputs = new Map();
      for (const ch of a.listChannels()) {
        const node = byName.get(ch.getTargetNode().getName()), path = ch.getTargetPath();
        if (!node || path === 'scale') continue;
        const bone = node.getName();
        if (path === 'translation' && bone !== 'pelvis' && bone !== 'root') continue;
        const s = ch.getSampler();
        let inp = inputs.get(s.getInput());
        if (!inp) { inp = doc.createAccessor().setType('SCALAR').setArray(s.getInput().getArray().slice()).setBuffer(buffer); inputs.set(s.getInput(), inp); }
        const arr = s.getOutput().getArray().slice();
        if (path === 'translation' && bone === 'pelvis') for (let i = 0; i < arr.length; i++) arr[i] *= k;
        const outp = doc.createAccessor().setType(s.getOutput().getType()).setArray(arr).setBuffer(buffer);
        const smp = doc.createAnimationSampler().setInput(inp).setOutput(outp).setInterpolation(s.getInterpolation());
        out.addSampler(smp);
        out.addChannel(doc.createAnimationChannel().setTargetNode(node).setTargetPath(path).setSampler(smp));
      }
    }
  }
  await doc.transform(prune(), unpartition(), resample(), dedup(), prune());
  await io.write(`${OUT}/${name}.glb`, doc);
  const size = fs.statSync(`${OUT}/${name}.glb`).size;
  console.log(name, (size / 1e6).toFixed(2) + ' MB', '| clips', root.listAnimations().length, '| materials', root.listMaterials().map((m) => m.getName()).join(' '));
}

const only = process.argv[5];
for (const [name, who] of Object.entries(PEOPLE)) if (!only || only === name) await build(name, who);
