// Zuordnung Bau-Nummer -> Bild vorbereiten und fortschreiben.
//
// Aufruf:  node _baue_zuordnung.js            nur berichten
//          node _baue_zuordnung.js --schreibe  lib/gebaeude_bilder.json erneuern
//          node _baue_zuordnung.js --boegen    je Grundfläche einen Bogen anlegen
//
// Der Filter ist die Grundfläche: ein 7x7-Bau kann nur ein Bild mit 7x7
// Kacheln sein. Das schneidet die Kandidaten je Nummer von 377 auf wenige.
// Bestätigte Zuordnungen bleiben beim Erneuern erhalten - sie stehen unter
// "sicher" und werden nie überschrieben.

const fs = require('fs');
const path = require('path');
const { leseGm1, ganzesGebaeude, pngRgba } = require('./lib/gm1');

const SPIEL = 'C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme';
const GM = path.join(SPIEL, 'gm');
const ZIEL = path.join(__dirname, 'lib', 'gebaeude_bilder.json');
const BOGEN_ORDNER = path.resolve(__dirname, '..', 'VillageStudio-bogen');
const DATEIEN = ['tile_buildings1', 'tile_buildings2', 'tile_workshops', 'tile_castle', 'tile_churches',
  'tile_farmland', 'tile_flatties', 'tile_ruins', 'killing_pits', 'pitch_ditches'];

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
  return nach;
}

function main() {
  const schreibe = process.argv.includes('--schreibe');
  const boegen = process.argv.includes('--boegen');

  const gebaeude = require('./lib/gebaeude.json').gebaeude;
  const vorrat = sammle();

  // Bestehendes behalten
  let alt = { sicher: {}, kandidaten: {} };
  try { alt = JSON.parse(fs.readFileSync(ZIEL, 'utf8')); } catch { }

  const kandidaten = {};
  const ohne = [];
  let mitKandidaten = 0;
  for (const [id, e] of Object.entries(gebaeude)) {
    if (!e.b || e.b !== e.h) continue;                 // nur quadratische Grundflächen
    const pool = vorrat[e.b];
    if (!pool) { ohne.push(id + ' ' + e.name + ' (' + e.b + '×' + e.h + ')'); continue; }
    kandidaten[id] = pool.map(p => p.datei + '#' + p.nr);
    mitKandidaten++;
  }

  const stand = {
    _zweck: 'Welches Bild aus den gm1-Dateien gehoert zu welcher AIV-Bau-Nummer',
    _stand: new Date().toISOString().slice(0, 10),
    _erklaerung: 'sicher = am Bild bestaetigt. kandidaten = alle Bilder mit passender Grundflaeche.',
    sicher: alt.sicher || {},
    kandidaten,
  };

  console.log('Bilder je Grundfläche:',
    Object.keys(vorrat).sort((a, b) => a - b).map(k => k + '×' + k + ': ' + vorrat[k].length).join(', '));
  console.log('Nummern mit Kandidaten:', mitKandidaten, ' schon sicher:', Object.keys(stand.sicher).length);
  const eng = Object.entries(kandidaten).filter(([, v]) => v.length <= 15)
    .sort((a, b) => a[1].length - b[1].length);
  console.log('\nDie engsten Fälle - dort lohnt das Hinschauen zuerst:');
  for (const [id, v] of eng.slice(0, 12))
    console.log('  Nr ' + id.padStart(3), (gebaeude[id].name + ' ').padEnd(24, '.'),
      gebaeude[id].b + '×' + gebaeude[id].h, ' Kandidaten:', v.length);
  if (ohne.length) console.log('\nOhne Bilder dieser Größe:', ohne.join(', '));

  if (schreibe) {
    fs.writeFileSync(ZIEL, JSON.stringify(stand, null, 1));
    console.log('\ngeschrieben:', ZIEL);
  }

  if (boegen) {
    fs.mkdirSync(BOGEN_ORDNER, { recursive: true });
    for (const [n, pool] of Object.entries(vorrat)) {
      if (pool.length > 200) continue;
      const SP = Math.min(8, pool.length);
      const ZB = Math.max(...pool.map(p => p.bild.breite)) + 8;
      const ZH = Math.max(...pool.map(p => p.bild.hoehe)) + 8;
      const zeilen = Math.ceil(pool.length / SP);
      const B = SP * ZB, H = zeilen * ZH;
      const bogen = Buffer.alloc(B * H * 4, 0);
      pool.forEach((p, i) => {
        const ox = (i % SP) * ZB + 4, oy = Math.floor(i / SP) * ZH + (ZH - p.bild.hoehe) - 4;
        for (let y = 0; y < p.bild.hoehe; y++) for (let x = 0; x < p.bild.breite; x++) {
          const q = (y * p.bild.breite + x) * 4;
          if (!p.bild.rgba[q + 3]) continue;
          const t = ((oy + y) * B + ox + x) * 4;
          if (t < 0 || t + 3 >= bogen.length) continue;
          bogen[t] = p.bild.rgba[q]; bogen[t + 1] = p.bild.rgba[q + 1];
          bogen[t + 2] = p.bild.rgba[q + 2]; bogen[t + 3] = 255;
        }
      });
      const name = path.join(BOGEN_ORDNER, 'groesse_' + n + 'x' + n + '.png');
      fs.writeFileSync(name, pngRgba(B, H, bogen));
      console.log('Bogen', n + '×' + n, pool.length + ' Bilder', SP + ' Spalten', '->', path.basename(name));
    }
  }
}

main();
