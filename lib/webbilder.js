// Die Gebaeudebilder fuer die Oberflaeche - aus den Spieldateien, nach der
// Zuordnung in gebaeude_bilder.json.
//
// Es werden keine PNG-Dateien ins Repo gelegt: Der Server rendert auf Anfrage
// aus den gm1-Dateien und haelt das Ergebnis im Speicher. So bleibt die
// Anzeige immer auf dem Stand der Zuordnung, und die Spielgrafiken liegen
// nur dort, wo das Spiel installiert ist.

const fs = require('fs');
const path = require('path');
const { pngRgba } = require('./gm1');
const { sammle, zerlege } = require('./bildvorrat');

const ZUORDNUNG = path.join(__dirname, 'gebaeude_bilder.json');

let vorrat = null;            // { n: [ { datei, nr, bild, pos } ] }, einmal je Serverlauf
let nachSchluessel = null;    // "tile_castle#135" -> Eintrag
const pngCache = new Map();   // id -> Buffer

function ladeVorrat() {
  if (vorrat) return;
  vorrat = sammle();
  nachSchluessel = new Map();
  for (const pool of Object.values(vorrat)) for (const p of pool) nachSchluessel.set(p.datei + '#' + p.nr, p);
}

// Zuordnung lesen: sicher vor vermutet, jede Nummer einmal
function zuordnung() {
  let j; try { j = JSON.parse(fs.readFileSync(ZUORDNUNG, 'utf8')); } catch { return {}; }
  const aus = {};
  for (const stand of ['vermutet', 'sicher'])
    for (const [id, e] of Object.entries(j[stand] || {}))
      if (e && e.bild) aus[id] = { bild: e.bild, name: e.name, stand };
  return aus;
}

// Was die Oberflaeche wissen muss, um ein Bild an die richtige Stelle zu legen
function bilderIndex() {
  ladeVorrat();
  const aus = {};
  for (const [id, e] of Object.entries(zuordnung())) {
    const p = nachSchluessel.get(e.bild);
    if (!p) continue;
    aus[id] = { bild: e.bild, stand: e.stand, breite: p.bild.breite, hoehe: p.bild.hoehe, kacheln: p.bild.kacheln };
  }
  return aus;
}

function bildPng(id) {
  ladeVorrat();
  const e = zuordnung()[String(id)];
  if (!e) return null;
  const schl = e.bild;
  const key = id + ':' + schl;
  if (pngCache.has(key)) return pngCache.get(key);
  const p = nachSchluessel.get(schl);
  if (!p) return null;
  const png = pngRgba(p.bild.breite, p.bild.hoehe, p.bild.rgba);
  pngCache.set(key, png);
  return png;
}

module.exports = { bilderIndex, bildPng, zerlege };
