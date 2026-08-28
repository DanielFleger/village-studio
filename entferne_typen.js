// Entfernt bestimmte Bau-Nummern aus einer AIV und schreibt eine neue Datei.
//
//   node entferne_typen.js <Quelle.aiv> <Ziel.aiv> [Nummern]
//   node entferne_typen.js King1.aiv King1_ohne_Mauern.aiv mauern
//
// "mauern" ist die Abkuerzung fuer 10-19 (Steinmauer, Zinnenmauern, Treppen 1-6).
// Sonst eine Liste: 10,11,12  oder ein Bereich: 10-19
//
// Warum ohne Umnummerieren der Bauschritte: Luecken in der Schrittfolge sind
// erlaubt. Belegt an echten, benutzten Dateien - nocturne_rat1.aiv hat 562
// Luecken, Brandon.aiv 86. Umnummerieren waere also unnoetiges Risiko: es
// wuerde auch die Pausenliste (2011) verschieben.
const fs = require('fs');
const path = require('path');
const { decode } = require('./lib/aiv');
const { writeAivMit } = require('./lib/aivwrite');

const tabelle = JSON.parse(fs.readFileSync(path.join(__dirname, 'lib', 'gebaeude.json'), 'utf8')).gebaeude;
const name = nr => (tabelle[String(nr)] || {}).name || ('Nr. ' + nr);

const [quelle, ziel, auswahl = 'mauern'] = process.argv.slice(2);
if (!quelle || !ziel) {
  console.log('Aufruf: node entferne_typen.js <Quelle.aiv> <Ziel.aiv> [mauern | 10,11 | 10-19]');
  process.exit(1);
}

function nummern(text) {
  if (text === 'mauern') return Array.from({ length: 10 }, (_, i) => 10 + i);
  if (text === 'graeben') return [20, 21, 22, 23, 24];
  const raus = new Set();
  for (const teil of text.split(',')) {
    const m = teil.trim().match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) { for (let n = +m[1]; n <= +m[2]; n++) raus.add(n); }
    else if (teil.trim()) raus.add(Number(teil.trim()));
  }
  return [...raus].sort((a, b) => a - b);
}

const weg = new Set(nummern(auswahl));
const orig = fs.readFileSync(quelle);
const d = decode(orig);
if (!d.bauten || !d.schritte) throw new Error('Datei hat keine Bauten oder Bauschritte');

const bauten = d.bauten.slice();
const schritte = d.schritte.slice();

const proTyp = new Map();
const schritteVorher = new Set(), schritteBetroffen = new Set();
for (let i = 0; i < bauten.length; i++) {
  if (!bauten[i]) continue;
  schritteVorher.add(schritte[i]);
  if (!weg.has(bauten[i])) continue;
  proTyp.set(bauten[i], (proTyp.get(bauten[i]) || 0) + 1);
  schritteBetroffen.add(schritte[i]);
  bauten[i] = 0;
  schritte[i] = 0;
}

// Ein Bauschritt gilt nur als leer, wenn danach kein Feld mehr auf ihm liegt
const schritteNachher = new Set();
for (let i = 0; i < bauten.length; i++) if (bauten[i]) schritteNachher.add(schritte[i]);
const leer = [...schritteBetroffen].filter(s => !schritteNachher.has(s));

const neu = writeAivMit(orig, { bauten, schritte });
fs.mkdirSync(path.dirname(path.resolve(ziel)), { recursive: true });
fs.writeFileSync(ziel, neu);

console.log(`${path.basename(quelle)} -> ${path.basename(ziel)}`);
console.log(`  entfernt: ${[...proTyp.entries()].sort((a, b) => b[1] - a[1]).map(([t, n]) => `${name(t)} (${n} Felder)`).join(', ') || 'nichts'}`);
console.log(`  Bauschritte: ${schritteVorher.size} vorher, ${schritteNachher.size} nachher, ${leer.length} jetzt leer`);
console.log(`  Datei: ${orig.length} -> ${neu.length} Byte`);

// Gegenprobe: neu einlesen
const w = decode(fs.readFileSync(ziel));
const uebrig = w.bautenStatistik.filter(s => weg.has(s.id));
const g = w.meta.find(m => m.id === 2007);
console.log(`  gegengelesen: 2007 ${g.packed ? 'gepackt' : 'ROH'}, lesbar ${g.ok ? 'ja' : 'NEIN'}, ` +
            `entfernte Nummern noch da: ${uebrig.length ? uebrig.map(s => s.id).join(',') : 'keine'}`);
console.log(`  2009 steht auf ${w.anzahlSchritte} (groesster benutzter Schritt + 1 = ${Math.max(...schritteNachher) + 1})`);
