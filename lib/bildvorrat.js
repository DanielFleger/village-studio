// Der Bildervorrat: alle ganzen Gebaeude aus den gm1-Dateien, nach
// Grundflaeche sortiert.
//
// EINE Stelle fuer die Reihenfolge. Die Boegen, die Einzelbilder, die
// Kandidatenlisten und Daniels Zaehlung ("Zeile 1, das dritte Bild") haengen
// alle an derselben Reihenfolge: Dateien in der Folge von DATEIEN, darin die
// Bauten nach Bildnummer. Wer hier etwas anhaengt, haengt es HINTEN an, sonst
// stimmen die Positionen in Daniels Beschreibungen nicht mehr.
//
// Gemessen am 05.09.2026: Von den 20 Dateien der Datenart 3 sind dies die
// zehn mit Bauten. Die anderen sind Gelaende (tile_land*, tile_sea*,
// tile_rocks8, tile_land_macros), Brandflecken (tile_burnt), Kacheldaten
// (tile_data) und Waren auf dem Lagerplatz (tile_goods, 258 Stueck 2x2).
// Ein Bild mit 10x10 Kacheln gibt es in KEINER Datei.

const fs = require('fs');
const path = require('path');
const { leseGm1, ganzesGebaeude } = require('./gm1');

const SPIEL = 'C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme';
const GM = path.join(SPIEL, 'gm');
const DATEIEN = ['tile_buildings1', 'tile_buildings2', 'tile_workshops', 'tile_castle', 'tile_churches',
  'tile_farmland', 'tile_flatties', 'tile_ruins', 'killing_pits', 'pitch_ditches'];

// Liefert { n: [ { datei, nr, bild, pos } ] } - pos ist 1-basiert und ist
// die Stelle im Bogen und im Dateinamen der Einzelbilder.
function sammle() {
  const nach = {};
  for (const datei of DATEIEN) {
    const g = leseGm1(fs.readFileSync(path.join(GM, datei + '.gm1')));
    for (const s of g.bilder.filter(b => b.teil === 0)) {
      let bild; try { bild = ganzesGebaeude(g, s.nr); } catch { continue; }
      if (!bild) continue;
      (nach[bild.kacheln] = nach[bild.kacheln] || []).push({ datei, nr: s.nr, bild });
    }
  }
  for (const pool of Object.values(nach)) pool.forEach((p, i) => { p.pos = i + 1; });
  return nach;
}

// "tile_workshops#14" -> { datei, nr }
function schluessel(p) { return p.datei + '#' + p.nr; }
function zerlege(s) { const [datei, nr] = s.split('#'); return { datei, nr: Number(nr) }; }

module.exports = { SPIEL, GM, DATEIEN, sammle, schluessel, zerlege };
