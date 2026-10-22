// TARIEL CAULSLEIGH - the map: the region drawn as you walk it. Only the ground you have seen is shown
// (a Revealer will one day give the whole of it at once).

import * as W from '../world/world.js';

const RES = 320;                  // the map image, pixels a side
const CELL = 24;                  // the explored mask: one cell per 24 m
const CELLS = Math.ceil((W.HALF * 2) / CELL);
const SEE = 140;                  // you take in the ground this far around you

export const NAMES = [
  { name: 'Stanlech', at: W.PLACES.bridge },
  { name: "Shappel-ont'-Laik", at: W.PLACES.shappel },
  { name: 'The hill', at: W.PLACES.hill },
];

export class RegionMap {
  constructor() {
    this.seen = new Uint8Array(CELLS * CELLS);
    this.relief = null;
  }
  // the land, shaded from the north-west, in muted map colours
  draw() {
    if (this.relief) return this.relief;
    const c = document.createElement('canvas'); c.width = c.height = RES;
    const g = c.getContext('2d'), img = g.createImageData(RES, RES), k = (W.HALF * 2) / RES;
    for (let py = 0; py < RES; py++) for (let px = 0; px < RES; px++) {
      const x = -W.HALF + (px + 0.5) * k, z = -W.HALF + (py + 0.5) * k;
      const h = W.heightAt(x, z), hx = W.heightAt(x + k, z), hz = W.heightAt(x, z + k);
      const shade = Math.max(0.55, Math.min(1.25, 1 + ((h - hx) + (h - hz)) * 0.09));
      let col;
      if (W.waterAt(x, z) !== null) col = [92, 128, 140];
      else if (W.roadDist(x, z) < 1.5) col = [150, 120, 86];
      else {
        const cc = W.colourAt(x, z), t = Math.min(1, (h - 20) / 120);
        col = [(cc[0] * 0.6 + 0.35) * 200 * (1 - t * 0.15), (cc[1] * 0.6 + 0.33) * 200 * (1 - t * 0.1), (cc[2] * 0.6 + 0.25) * 190];
      }
      const o = (py * RES + px) * 4;
      img.data[o] = col[0] * shade; img.data[o + 1] = col[1] * shade; img.data[o + 2] = col[2] * shade; img.data[o + 3] = 255;
    }
    // buildings: dark specks
    for (const b of W.buildings()) {
      const px = Math.round((b.x + W.HALF) / k), py = Math.round((b.z + W.HALF) / k);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const o = ((py + dy) * RES + px + dx) * 4; if (o >= 0 && o < img.data.length) { img.data[o] = 70; img.data[o + 1] = 52; img.data[o + 2] = 40; } }
    }
    g.putImageData(img, 0, 0);
    this.relief = c;
    return c;
  }
  // the ground around (x, z) becomes known; returns true if anything new was seen
  see(x, z, far) {
    const r = far || SEE, ci = Math.floor((x + W.HALF) / CELL), cj = Math.floor((z + W.HALF) / CELL), cr = Math.ceil(r / CELL);
    let fresh = false;
    for (let j = cj - cr; j <= cj + cr; j++) for (let i = ci - cr; i <= ci + cr; i++) {
      if (i < 0 || j < 0 || i >= CELLS || j >= CELLS) continue;
      const cx = -W.HALF + (i + 0.5) * CELL, cz = -W.HALF + (j + 0.5) * CELL;
      if (Math.hypot(cx - x, cz - z) > r) continue;
      const o = j * CELLS + i; if (!this.seen[o]) { this.seen[o] = 1; fresh = true; }
    }
    return fresh;
  }
  known(x, z) {
    const i = Math.floor((x + W.HALF) / CELL), j = Math.floor((z + W.HALF) / CELL);
    return i >= 0 && j >= 0 && i < CELLS && j < CELLS && this.seen[j * CELLS + i] === 1;
  }
  get fraction() { let n = 0; for (const v of this.seen) n += v; return n / this.seen.length; }
  // paint the map into a canvas: parchment where unknown, the land where known, Tariel's arrow
  render(canvas, player, yaw) {
    const g = canvas.getContext('2d'), S = canvas.width, relief = this.draw();
    g.fillStyle = '#d9c9a3'; g.fillRect(0, 0, S, S);
    // the known ground, through a mask of explored cells (soft-edged)
    const holes = this.holeCanvas || (this.holeCanvas = document.createElement('canvas'));
    holes.width = holes.height = S;
    const hg = holes.getContext('2d'), cs = S / CELLS;
    hg.clearRect(0, 0, S, S);
    hg.filter = 'blur(' + Math.round(cs * 0.8) + 'px)';
    hg.fillStyle = '#000';
    hg.beginPath();
    for (let j = 0; j < CELLS; j++) for (let i = 0; i < CELLS; i++) if (this.seen[j * CELLS + i]) hg.rect(i * cs - cs * 0.3, j * cs - cs * 0.3, cs * 1.6, cs * 1.6);
    hg.fill();
    hg.filter = 'none';
    const mask = this.maskCanvas || (this.maskCanvas = document.createElement('canvas'));
    mask.width = mask.height = S;
    const mg = mask.getContext('2d');
    mg.clearRect(0, 0, S, S);
    mg.drawImage(relief, 0, 0, S, S);
    mg.globalCompositeOperation = 'destination-in';
    mg.drawImage(holes, 0, 0);
    mg.globalCompositeOperation = 'source-over';
    g.drawImage(mask, 0, 0);
    const toPx = (x, z) => [((x + W.HALF) / (W.HALF * 2)) * S, ((z + W.HALF) / (W.HALF * 2)) * S];
    // names of places you have seen
    g.font = 'italic 600 ' + Math.round(S / 34) + 'px Georgia, serif'; g.textAlign = 'center';
    for (const p of NAMES) {
      if (!this.known(p.at[0], p.at[1])) continue;
      const [px, py] = toPx(p.at[0], p.at[1]);
      g.fillStyle = 'rgba(245,235,210,0.85)'; g.fillText(p.name, px + 1, py - 9);
      g.fillStyle = '#3a2a1a'; g.fillText(p.name, px, py - 10);
    }
    // the two sides of the border
    g.font = Math.round(S / 46) + 'px Georgia, serif';
    g.fillStyle = '#5a4630';
    g.fillText('CAWEL', S * 0.16, S * 0.95); g.fillText('SŹETTEREICH', S * 0.80, S * 0.07);
    // Tariel
    const [tx, ty] = toPx(player[0], player[2]);
    g.save(); g.translate(tx, ty); g.rotate(-yaw);
    g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(0, 3); g.lineTo(-6, 7); g.closePath();
    g.fillStyle = '#a3241a'; g.fill(); g.strokeStyle = '#fff4dc'; g.lineWidth = 1.5; g.stroke();
    g.restore();
    // north
    g.fillStyle = '#3a2a1a'; g.font = 'bold ' + Math.round(S / 36) + 'px Georgia, serif'; g.fillText('N', S - 22, 28);
    g.beginPath(); g.moveTo(S - 22, 32); g.lineTo(S - 26, 44); g.lineTo(S - 18, 44); g.closePath(); g.fill();
  }
}
