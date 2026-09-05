// Unsere Spielgrafiken als Kacheln fuer Schlossgespensts AI-Toolkit.
//
// Sein Burg-Editor laedt je Gegenstand eine Datei assets/aiv/skins/<nr>.png
// und zieht sie beim Zeichnen auf die Grundflaeche - ein 4x4-Bau bekommt ein
// Bild von 128x128 Punkten, ein Feld sind 32. Genau dieses Mass haben auch
// die Kacheln in den .gm1-Dateien des Spiels. Damit lassen sich seine
// beschrifteten Farbquadrate durch die echten Gebaeude ersetzen, ohne dass
// eine Zeile Quelltext zwischen den Werkzeugen wandert.
//
// Die Bilder sind schraeg gezeichnet und darum meist hoeher als breit. Weil
// sein Editor das Bild auf ein Quadrat zieht, wird hier proportional
// eingepasst: volle Breite, was uebrig bleibt oben durchsichtig, das
// Gebaeude steht unten auf seiner Grundflaeche.
//
// Aufruf:
//   node _exportiere_skins.js <zielordner>            schreibt <nr>.png
//   node _exportiere_skins.js <zielordner> --probe    nur zeigen, was kaeme

const fs = require('fs');
const path = require('path');
const { leseGm1, ganzesGebaeude, pngRgba } = require('./lib/gm1');
const { bilderIndex } = require('./lib/webbilder');

const SPIEL = 'C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme';
const GM = path.join(SPIEL, 'gm');
const FELD = 32;                       // Punkte je Feld, wie in item-skins.json

const ziel = process.argv[2];
const nurProbe = process.argv.includes('--probe');
if (!ziel) {
  console.error('Aufruf: node _exportiere_skins.js <zielordner> [--probe]');
  process.exit(1);
}

const gebaeude = JSON.parse(fs.readFileSync(path.join(__dirname, 'lib', 'gebaeude.json'), 'utf8')).gebaeude;
const bilder = bilderIndex();

// Eine .gm1 nur einmal lesen
const geoeffnet = new Map();
function datei(name) {
  if (!geoeffnet.has(name)) geoeffnet.set(name, leseGm1(fs.readFileSync(path.join(GM, name + '.gm1'))));
  return geoeffnet.get(name);
}

// Ein Bild proportional in ein Quadrat einpassen, unten ausgerichtet.
// Naechster Nachbar statt Mittelwert: die Kanten der Pixelgrafik sollen
// scharf bleiben, so wie sie im Spiel aussehen.
function einpassen(quelle, qb, qh, kante) {
  const aus = Buffer.alloc(kante * kante * 4, 0);
  const k = Math.min(kante / qb, kante / qh);
  const nb = Math.max(1, Math.round(qb * k));
  const nh = Math.max(1, Math.round(qh * k));
  const x0 = Math.floor((kante - nb) / 2);
  const y0 = kante - nh;                       // unten aufsetzen
  for (let y = 0; y < nh; y++) {
    const sy = Math.min(qh - 1, Math.floor(y / k));
    for (let x = 0; x < nb; x++) {
      const sx = Math.min(qb - 1, Math.floor(x / k));
      const s = (sy * qb + sx) * 4;
      if (!quelle[s + 3]) continue;
      const d = ((y0 + y) * kante + (x0 + x)) * 4;
      aus[d] = quelle[s]; aus[d + 1] = quelle[s + 1];
      aus[d + 2] = quelle[s + 2]; aus[d + 3] = 255;
    }
  }
  return aus;
}

if (!nurProbe) fs.mkdirSync(ziel, { recursive: true });

let geschrieben = 0, ohneBild = [], ohneMapper = [];
const zeilen = [];

for (const [id, g] of Object.entries(gebaeude)) {
  if (!g.mapper) { ohneMapper.push(id + ' ' + g.name); continue; }
  const e = bilder[id];
  if (!e || !e.bild) { ohneBild.push(g.mapper + ' ' + g.name); continue; }

  const [name, nr] = e.bild.split('#');
  let bild;
  try { bild = ganzesGebaeude(datei(name), Number(nr)); } catch { bild = null; }
  if (!bild) { ohneBild.push(g.mapper + ' ' + g.name + ' (Bild nicht lesbar)'); continue; }

  const kante = e.kacheln * FELD;
  zeilen.push({ mapper: g.mapper, name: g.name, quelle: e.bild,
                von: bild.breite + 'x' + bild.hoehe, nach: kante + 'x' + kante });
  if (nurProbe) continue;

  const rgba = einpassen(bild.rgba, bild.breite, bild.hoehe, kante);
  fs.writeFileSync(path.join(ziel, g.mapper + '.png'), pngRgba(kante, kante, rgba));
  geschrieben++;
}

zeilen.sort((a, b) => Number(a.mapper) - Number(b.mapper));
for (const z of zeilen)
  console.log(String(z.mapper).padStart(4) + '  ' + z.name.padEnd(24) +
              z.quelle.padEnd(22) + z.von.padStart(9) + '  ->  ' + z.nach);

console.log('\n' + zeilen.length + ' Kacheln' + (nurProbe ? ' waeren zu schreiben' : ' geschrieben nach ' + ziel));
if (ohneBild.length) console.log('ohne zugeordnetes Bild (' + ohneBild.length + '): ' + ohneBild.join(', '));
if (ohneMapper.length) console.log('ohne Mapper-Nummer (' + ohneMapper.length + '): ' + ohneMapper.join(', '));
