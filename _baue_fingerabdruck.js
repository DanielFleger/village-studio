// Erzeugt aus einer AIV einen "Fingerabdruck": die Folge der Bau-Nummern,
// nach Bauschritt sortiert. Genau diese Folge muss im Speicher stehen, wenn
// das Spiel die Datei geladen hat.
//
// Damit findet man Basisadresse und Schrittweite der Bauliste, ohne zu raten:
// man sucht die Folge, statt eine Struktur anzunehmen.
//
//   node _baue_fingerabdruck.js <Datei.aiv> [Ziel.lua]
const fs = require('fs');
const path = require('path');
const { decode } = require('./lib/aiv');

const tab = JSON.parse(fs.readFileSync(path.join(__dirname, 'lib', 'gebaeude.json'), 'utf8')).gebaeude;
const quelle = process.argv[2];
const ziel = process.argv[3] || path.join(__dirname, 'lib', 'fingerabdruck.lua');
if (!quelle) { console.log('Aufruf: node _baue_fingerabdruck.js <Datei.aiv> [Ziel.lua]'); process.exit(1); }

const d = decode(fs.readFileSync(quelle));
const G = 100;

// Je Bauschritt: welcher Typ, wie viele Felder, wo faengt er an
const proSchritt = new Map();
for (let i = 0; i < G * G; i++) {
  const t = d.bauten[i];
  if (!t || t === 1 || t === 2) continue;          // Kartenrand und Flaeche sind kein Bau
  const s = d.schritte[i];
  let e = proSchritt.get(s);
  if (!e) { e = { typen: new Map(), felder: 0, erstes: i }; proSchritt.set(s, e); }
  e.typen.set(t, (e.typen.get(t) || 0) + 1);
  e.felder++;
  if (i < e.erstes) e.erstes = i;
}

const schritte = [...proSchritt.keys()].sort((a, b) => a - b);
const folge = [], felder = [], pos = [];
let gemischt = 0;
for (const s of schritte) {
  const e = proSchritt.get(s);
  if (e.typen.size > 1) gemischt++;
  // bei gemischten Schritten der haeufigste Typ
  const [top] = [...e.typen.entries()].sort((a, b) => b[1] - a[1]);
  folge.push(top[0]);
  felder.push(e.felder);
  pos.push(e.erstes);
}

const zeilen = [];
zeilen.push('--[[');
zeilen.push('  Fingerabdruck von ' + path.basename(quelle));
zeilen.push('');
zeilen.push('  TYPEN[i] = Bau-Nummer des i-ten Bauschritts (AIV-Typ)');
zeilen.push('  FELDER[i] = wie viele Kacheln dieser Schritt belegt');
zeilen.push('  POS[i] = erste Kachel des Schritts als Zeile*100 + Spalte');
zeilen.push('');
zeilen.push('  Wozu: genau diese Folge muss nach dem Laden im Speicher stehen.');
zeilen.push('  Sucht man sie, statt eine Struktur anzunehmen, fallen Basisadresse');
zeilen.push('  und Schrittweite der Bauliste von selbst heraus.');
zeilen.push('  Erzeugt von _baue_fingerabdruck.js im Village-Studio-Projekt.');
zeilen.push(']]--');
zeilen.push('');
zeilen.push('local M = {}');
zeilen.push('M.DATEI = ' + JSON.stringify(path.basename(quelle)));
zeilen.push('M.SCHRITTE = ' + folge.length);
zeilen.push('');
const alsLua = (arr, name) => {
  const teile = [];
  for (let i = 0; i < arr.length; i += 20) teile.push('  ' + arr.slice(i, i + 20).join(', ') + ',');
  return 'M.' + name + ' = {\n' + teile.join('\n') + '\n}';
};
zeilen.push(alsLua(folge, 'TYPEN'));
zeilen.push('');
zeilen.push(alsLua(felder, 'FELDER'));
zeilen.push('');
zeilen.push(alsLua(pos, 'POS'));
zeilen.push('');
zeilen.push('return M');
fs.writeFileSync(ziel, zeilen.join('\n') + '\n');

// Wie unverwechselbar ist der Anfang der Folge?
const anfang = folge.slice(0, 8).join(',');
let treffer = 0;
for (let i = 0; i + 8 <= folge.length; i++) if (folge.slice(i, i + 8).join(',') === anfang) treffer++;

console.log(path.basename(quelle) + ' -> ' + ziel);
console.log('  Bauschritte: ' + folge.length + '   gemischte Schritte: ' + gemischt);
console.log('  erste acht Typen: ' + folge.slice(0, 8).map(t => t + ' (' + ((tab[String(t)] || {}).name || '?') + ')').join(', '));
console.log('  diese Achterfolge kommt in der Datei ' + treffer + 'x vor' + (treffer === 1 ? ' - als Suchmuster eindeutig' : ''));
console.log('  Felder gesamt: ' + felder.reduce((a, b) => a + b, 0) + '   Baulistenplaetze je Slot: ' + 0x922);
