// Prueft das Zurueckschreiben, ohne eine einzige Datei anzufassen.
// Alles laeuft im Arbeitsspeicher.
//
//   Probe 1  unveraendert schreiben -> muss Byte fuer Byte das Original ergeben
//   Probe 2  ein Feld aendern       -> genau dieses Feld anders, alles andere gleich
//
// Aufruf: node _pruefe_schreiben.js
const fs = require('fs');
const path = require('path');
const { readAiv, decode } = require('./lib/aiv');
const { writeAiv, writeAivMit } = require('./lib/aivwrite');

const orte = [
  path.resolve(__dirname, '..', 'Village'),
  path.resolve(__dirname, '..', 'Village', 'villages'),
  'C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme/aiv',
];

const dateien = [];
for (const o of orte) {
  let l; try { l = fs.readdirSync(o); } catch { continue; }
  for (const f of l) {
    if (!f.toLowerCase().endsWith('.aiv')) continue;
    const p = path.join(o, f);
    if (fs.statSync(p).isFile() && !dateien.includes(p)) dateien.push(p);
  }
}

let n = 0, gleich = 0, ungleich = [], fehler = [], aender = 0, aenderFehler = [];

for (const p of dateien) {
  const orig = fs.readFileSync(p);
  n++;

  // Probe 1: unveraendert
  try {
    const neu = writeAiv(orig);
    if (Buffer.compare(neu, orig) === 0) gleich++;
    else ungleich.push(`${path.basename(p)}: ${neu.length} statt ${orig.length} Byte`);
  } catch (e) { fehler.push(`${path.basename(p)}: ${e.message}`); continue; }

  // Probe 2: ein Feld aendern
  try {
    const vor = decode(orig);
    if (!vor.bauten) continue;
    const bauten = vor.bauten.slice();
    const stelle = 50 * 100 + 50;
    const alt = bauten[stelle];
    bauten[stelle] = alt === 80 ? 85 : 80;          // Huette <-> Brunnen
    const neu = writeAivMit(orig, { bauten });
    const nach = decode(neu);

    if (nach.bauten[stelle] !== bauten[stelle])
      throw new Error(`Feld nicht angekommen: ${nach.bauten[stelle]} statt ${bauten[stelle]}`);
    let abw = 0;
    for (let i = 0; i < bauten.length; i++) if (nach.bauten[i] !== bauten[i]) abw++;
    if (abw) throw new Error(`${abw} Felder weichen ab`);

    // alle nicht angefassten Abschnitte muessen Byte fuer Byte gleich sein
    const a = readAiv(orig), b = readAiv(neu);
    for (const m of a.meta) {
      if (m.id === 2007) continue;
      if (Buffer.compare(a.roh[m.id], b.roh[m.id]) !== 0)
        throw new Error(`Abschnitt ${m.id} wurde mit veraendert`);
      if (a.meta.find(x => x.id === m.id).packed !== b.meta.find(x => x.id === m.id).packed)
        throw new Error(`Gepackt-Kennung von ${m.id} geaendert`);
    }
    const g = b.meta.find(x => x.id === 2007);
    if (!g.packed) throw new Error('2007 wurde roh geschrieben');
    if (!g.ok) throw new Error('2007 laesst sich nicht mehr entpacken: ' + g.note);
    aender++;
  } catch (e) { aenderFehler.push(`${path.basename(p)}: ${e.message}`); }
}

console.log(`Dateien geprueft: ${n}`);
console.log(`Probe 1  unveraendert = byteidentisch: ${gleich}/${n}`);
if (ungleich.length) console.log('  Abweichungen:\n    ' + ungleich.slice(0, 8).join('\n    '));
if (fehler.length) console.log('  Fehler:\n    ' + fehler.slice(0, 8).join('\n    '));
console.log(`Probe 2  Feld geaendert, Rest unberuehrt: ${aender}/${n}`);
if (aenderFehler.length) console.log('  Fehler:\n    ' + aenderFehler.slice(0, 8).join('\n    '));
