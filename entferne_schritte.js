// Streicht einzelne Bauschritte aus einer AIV. Alles davor und danach bleibt,
// wie es war - die uebrigen Schritte behalten ihre Nummern.
//
//   node entferne_schritte.js <Quelle.aiv> <Ziel.aiv> 30-90
//   node entferne_schritte.js <Quelle.aiv> <Ziel.aiv> 30-90,120,200-210
//
// Warum ohne Umnummerieren: Luecken in der Schrittfolge sind erlaubt - in
// nocturne_rat1.aiv fehlen 562 Nummern, in Brandon.aiv 86, beides echte
// Dateien. Umnummerieren wuerde nur die Pausenliste (2011) verschieben.
const fs = require('fs');
const path = require('path');
const { decode } = require('./lib/aiv');
const { writeAivMit } = require('./lib/aivwrite');

const tabelle = JSON.parse(fs.readFileSync(path.join(__dirname, 'lib', 'gebaeude.json'), 'utf8')).gebaeude;
const name = nr => (tabelle[String(nr)] || {}).name || ('Nr. ' + nr);

const [quelle, ziel, auswahl, auchFlaeche] = process.argv.slice(2);
if (!quelle || !ziel || !auswahl) {
  console.log('Aufruf: node entferne_schritte.js <Quelle.aiv> <Ziel.aiv> <30-90 | 5,7,10-20> [auch-flaeche]');
  console.log('  auch-flaeche: streicht auch Kartenrand und Bauflaeche in diesen Schritten.');
  console.log('  Noetig, wenn die KI wirklich bei einem Schritt aufhoeren soll - die');
  console.log('  Bauflaeche traegt eigene Schrittnummern und haelt sonst 2009 oben.');
  process.exit(1);
}
const mitFlaeche = auchFlaeche === 'auch-flaeche';

const weg = new Set();
for (const teil of auswahl.split(',')) {
  const m = teil.trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (m) { for (let n = +m[1]; n <= +m[2]; n++) weg.add(n); }
  else if (teil.trim()) weg.add(Number(teil.trim()));
}

const orig = fs.readFileSync(quelle);
const d = decode(orig);
if (!d.bauten || !d.schritte) throw new Error('Datei hat keine Bauten oder Bauschritte');

const bauten = d.bauten.slice();
const schritte = d.schritte.slice();

const vorher = new Set(), getroffen = new Map();
for (let i = 0; i < bauten.length; i++) {
  if (!bauten[i] || bauten[i] === 1 || bauten[i] === 2) continue;
  vorher.add(schritte[i]);
}
let felder = 0;
for (let i = 0; i < bauten.length; i++) {
  const t = bauten[i];
  if (!t) continue;
  if (!mitFlaeche && (t === 1 || t === 2)) continue;   // Kartenrand und Flaeche bleiben
  if (!weg.has(schritte[i])) continue;
  getroffen.set(t, (getroffen.get(t) || 0) + 1);
  felder++;
  bauten[i] = 0;
  schritte[i] = 0;
}

const nachher = new Set();
for (let i = 0; i < bauten.length; i++) if (bauten[i] && bauten[i] !== 1 && bauten[i] !== 2) nachher.add(schritte[i]);

const neu = writeAivMit(orig, { bauten, schritte });
fs.mkdirSync(path.dirname(path.resolve(ziel)), { recursive: true });
fs.writeFileSync(ziel, neu);

const liste = [...vorher].sort((a, b) => a - b);
console.log(`${path.basename(quelle)} -> ${path.basename(ziel)}`);
console.log(`  Bauschritte vorher: ${vorher.size} (von ${liste[0]} bis ${liste[liste.length - 1]})`);
console.log(`  gestrichen: ${vorher.size - nachher.size} Schritte, ${felder} Felder`);
console.log(`  entfernt wurden: ${[...getroffen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, n]) => `${name(t)} (${n})`).join(', ') || 'nichts'}`);
console.log(`  Bauschritte nachher: ${nachher.size}`);

const w = decode(fs.readFileSync(ziel));
const nochDa = new Set();
for (let i = 0; i < 10000; i++) if (w.bauten[i] && w.bauten[i] !== 1 && w.bauten[i] !== 2 && weg.has(w.schritte[i])) nochDa.add(w.schritte[i]);
const g = w.meta.find(m => m.id === 2007);
console.log(`  gegengelesen: 2007 ${g.packed ? 'gepackt' : 'ROH'}, lesbar ${g.ok ? 'ja' : 'NEIN'}, ` +
            `gestrichene Schritte noch belegt: ${nochDa.size ? [...nochDa].join(',') : 'keine'}`);
console.log(`  2009 steht auf ${w.anzahlSchritte}   Datei ${orig.length} -> ${neu.length} Byte`);
