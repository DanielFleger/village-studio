// Beweisbild: links die Kartenvorschau, rechts dasselbe Stueck mit den echten
// Kacheln des Spiels.
//
//   node _zeige_gelaende.js "<karte.map>" <px0> <py0> <kante> "<ziel.png>"
//
// px0/py0 sind Punkte der 200x200-Vorschau, kante die Zahl der Felder.

const fs = require('fs');
const path = require('path');
const { leseVorschau } = require('./lib/karte.js');
const { zeichneGelaende, pngRgba, KACHEL_B, KACHEL_H } = require('./lib/gelaende.js');

const SPIEL = 'C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme';

const [karte, px0, py0, kante, ziel] = [
  process.argv[2], Number(process.argv[3]), Number(process.argv[4]),
  Number(process.argv[5] || 40), process.argv[6]];

const puffer = fs.readFileSync(karte);
const v = leseVorschau(puffer);
const g = zeichneGelaende(SPIEL, puffer, px0, py0, kante);

console.log(path.basename(karte), `Ausschnitt px${px0} py${py0}, ${kante}x${kante} Felder`);
console.log('gezeichnete Felder', g.gezeichnet, ' ohne Bild', g.ohneBild);
console.log('Dateien:', [...g.jeDatei].sort((a, b) => b[1] - a[1]).map(([n, c]) => `${n}:${c}`).join('  '));

const LUECKE = 8;
const B = g.breite * 2 + LUECKE, H = g.hoehe;
const gross = Buffer.alloc(B * H * 4, 255);
for (let y = 0; y < H; y++) for (let x = 0; x < g.breite; x++) {
  const c = v.tafel[v.punkte[(py0 + ((y / KACHEL_H) | 0)) * 200 + (px0 + ((x / KACHEL_B) | 0))]];
  const i = (y * B + x) * 4;
  gross[i] = c[0]; gross[i + 1] = c[1]; gross[i + 2] = c[2]; gross[i + 3] = 255;
}
for (let y = 0; y < H; y++) for (let x = 0; x < g.breite; x++) {
  const q = (y * g.breite + x) * 4, i = (y * B + g.breite + LUECKE + x) * 4;
  gross[i] = g.rgba[q]; gross[i + 1] = g.rgba[q + 1]; gross[i + 2] = g.rgba[q + 2]; gross[i + 3] = 255;
}
fs.writeFileSync(ziel, pngRgba(B, H, gross));
fs.writeFileSync(ziel.replace(/\.png$/, '_nur_gelaende.png'), pngRgba(g.breite, g.hoehe, g.rgba));
console.log('geschrieben:', ziel);
