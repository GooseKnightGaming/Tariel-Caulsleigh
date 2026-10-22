// TARIEL CAULSLEIGH - packs chosen pieces of a Quaternius MegaKit (CC0) into one GLB: one top-level node
// per piece, named as the piece, sharing the kit's materials and textures (so the game loads them once).
//   node tools/build_kit.mjs <kit glTF dir> <out.glb> <piece> <piece> ...
import fs from 'fs';
import { NodeIO } from '@gltf-transform/core';
import { mergeDocuments, prune, dedup, unpartition } from '@gltf-transform/functions';

const [DIR, OUT, ...PIECES] = process.argv.slice(2);
const io = new NodeIO();
const doc = new (await import('@gltf-transform/core')).Document();
doc.createBuffer();
const scene = doc.createScene('kit');
for (const name of PIECES) {
  const file = `${DIR}/${name}.gltf`;
  if (!fs.existsSync(file)) { console.log('MISSING', name); continue; }
  const src = await io.read(file);
  const map = mergeDocuments(doc, src);
  const holder = doc.createNode(name);
  for (const sc of src.getRoot().listScenes()) {
    const msc = map.get(sc);
    for (const c of msc.listChildren()) { msc.removeChild(c); holder.addChild(c); }
    msc.dispose();
  }
  scene.addChild(holder);
}
// strip what is not drawn: second UV sets, vertex colours
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) for (const s of ['TEXCOORD_1', 'TEXCOORD_2', 'COLOR_0']) if (p.getAttribute(s)) p.setAttribute(s, null);
await doc.transform(dedup(), unpartition(), prune());
await io.write(OUT, doc);
console.log(OUT, (fs.statSync(OUT).size / 1e6).toFixed(1), 'MB,', PIECES.length, 'pieces, materials:', doc.getRoot().listMaterials().map((m) => m.getName()).join(' '));
