// TARIEL CAULSLEIGH - where the top of the left foot sits on the female base body's skin texture:
// prints, for the vertices that follow the left foot and face up, their positions and texture coordinates
// (people_textures.py paints the Mark of Kern there).   node tools/foot_uv.mjs <Superhero_Female_FullBody.gltf>
import { NodeIO } from '@gltf-transform/core';
const io = new NodeIO();
const doc = await io.read(process.argv[2]);
const root = doc.getRoot(), skin = root.listSkins()[0], names = skin.listJoints().map((j) => j.getName());
const out = [];
for (const node of root.listNodes()) {
  const mesh = node.getMesh(); if (!mesh || !node.getSkin()) continue;
  const p = mesh.listPrimitives()[0];
  if (!/Superhero/i.test(p.getMaterial().getName())) continue;
  const P = p.getAttribute('POSITION'), N = p.getAttribute('NORMAL'), T = p.getAttribute('TEXCOORD_0'), J = p.getAttribute('JOINTS_0'), Wt = p.getAttribute('WEIGHTS_0');
  for (let v = 0; v < P.getCount(); v++) {
    const j = J.getElement(v, []), w = Wt.getElement(v, []); let b = 0; for (let k = 1; k < 4; k++) if (w[k] > w[b]) b = k;
    const bone = names[j[b]];
    if (!new RegExp('^(foot_|ball_)' + (process.argv[3] || 'l') + '$').test(bone)) continue;
    out.push({ p: P.getElement(v, []), n: N.getElement(v, []), uv: T.getElement(v, []), bone });
  }
}
console.log(JSON.stringify(out));
