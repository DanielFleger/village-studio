// Kontaktbogen: eine Reihe Bilder aus einer .gm1 nebeneinander, unten
// ausgerichtet, auf dunklem Grund. Zum Suchen von Grafiken, die noch keine
// Nummer haben - hinschauen ist bei Bildern schneller als jede Heuristik.
//
// Aufruf:  node _bogen.js <datei ohne .gm1> <von> <bis> <ziel.png> [zoom]
// Beispiel: node _bogen.js tile_castle 1545 1575 bogen.png 3

const { leseGm1, pngRgba, bildVon } = require('./lib/gm1');
const fs = require('fs'), path = require('path');

const GM = 'C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme/gm';
const [datei, vonS, bisS, ziel, zoomS] = process.argv.slice(2);
if (!datei || !ziel) {
  console.error('Aufruf: node _bogen.js <datei> <von> <bis> <ziel.png> [zoom]');
  process.exit(1);
}
const ZOOM = Math.max(1, Number(zoomS) || 1);
const von = Number(vonS), bis = Number(bisS);

const g = leseGm1(fs.readFileSync(path.join(GM, datei + '.gm1')));
const teil = [];
for (let i = von; i <= bis && i < g.bilder.length; i++) teil.push({ i, b: g.bilder[i] });
if (!teil.length) { console.error('keine Bilder in dem Bereich'); process.exit(1); }

const ABSTAND = 4;
const breite = (teil.reduce((s, t) => s + t.b.breite + ABSTAND, ABSTAND)) * ZOOM;
const hoehe = (Math.max(...teil.map(t => t.b.hoehe)) + 2 * ABSTAND) * ZOOM;
const rgba = Buffer.alloc(breite * hoehe * 4);
for (let p = 0; p < breite * hoehe; p++) {
  rgba[p * 4] = 46; rgba[p * 4 + 1] = 52; rgba[p * 4 + 2] = 60; rgba[p * 4 + 3] = 255;
}

let x = ABSTAND;
for (const t of teil) {
  const q = t.b;
  const src = bildVon(g, t.i).rgba;
  for (let yy = 0; yy < q.hoehe; yy++) for (let xx = 0; xx < q.breite; xx++) {
    const si = (yy * q.breite + xx) * 4;
    if (src[si + 3] === 0) continue;
    const zy0 = (hoehe / ZOOM - ABSTAND - q.hoehe + yy) * ZOOM, zx0 = (x + xx) * ZOOM;
    for (let dy = 0; dy < ZOOM; dy++) for (let dx = 0; dx < ZOOM; dx++) {
      const zi = ((zy0 + dy) * breite + zx0 + dx) * 4;
      rgba[zi] = src[si]; rgba[zi + 1] = src[si + 1]; rgba[zi + 2] = src[si + 2]; rgba[zi + 3] = 255;
    }
  }
  x += q.breite + ABSTAND;
}

fs.writeFileSync(ziel, pngRgba(breite, hoehe, rgba));
console.log(teil.map(t => '#' + t.i + '(' + t.b.breite + 'x' + t.b.hoehe + ')').join(' '));
console.log('-> ' + ziel + '  ' + breite + 'x' + hoehe);
