// Baut eine Messburg: viele einzelne Mauerstuecke, jedes ein eigener Bauschritt.
//
//   node baue_messburg.js <Vorlage.aiv> <Ziel.aiv> <links|rechts> [Anzahl]
//
// Wozu: Mauerstuecke sind der ideale Messfuehler. Sie stehen einzeln, sind
// abzaehlbar, und sie haben keinen Eintrag in der Kostentabelle - die wird
// nach Laufzeit-Gebaeudenummer indiziert, und Mauern haben keine.
// Damit misst man, wie viele Ticks ein Bauschritt braucht, und sieht beim
// Umschalten auf den zweiten Plan, ab welchem Schritt weitergebaut wird.
//
// Raster: ein Feld Mauer, ein Feld frei - so bleibt jedes Stueck ein eigener
// Bauschritt und verschmilzt nicht mit dem Nachbarn zu einem Mauerzug.
const fs = require('fs');
const path = require('path');
const { decode } = require('./lib/aiv');
const { writeAivMit } = require('./lib/aivwrite');

const [vorlage, ziel, seite, anzahlArg] = process.argv.slice(2);
if (!vorlage || !ziel || !['links', 'rechts'].includes(seite)) {
  console.log('Aufruf: node baue_messburg.js <Vorlage.aiv> <Ziel.aiv> <links|rechts> [Anzahl]');
  process.exit(1);
}
const ANZAHL = Number(anzahlArg || 300);
const MAUER = 10;                 // AIV 10 = Steinmauer
const G = 100;
const KEEP = { x0: 43, y0: 43, x1: 49, y1: 49 };

// Der Bergfried liegt bei 43..49. Links davon bleibt x 2..42, rechts x 50..97.
// Mit Schrittweite 2 sind das je 15 Spalten, wenn man Rand und Bergfried meidet.
const spalten = [];
if (seite === 'links') for (let x = 12; x <= 40; x += 2) spalten.push(x);
else                   for (let x = 52; x <= 80; x += 2) spalten.push(x);

const zeilen = [];
for (let y = 20; y <= 78; y += 2) zeilen.push(y);

// Plaetze in Leserichtung: erst die oberste Zeile ganz durch, dann die naechste.
// So waechst die Burg sichtbar von oben nach unten und ist gut abzuzaehlen.
const plaetze = [];
for (const y of zeilen) for (const x of spalten) plaetze.push({ x, y });
if (plaetze.length < ANZAHL)
  throw new Error(`nur ${plaetze.length} Plaetze im Raster, ${ANZAHL} gefordert`);

const orig = fs.readFileSync(vorlage);
const d = decode(orig);
const bauten = new Array(G * G).fill(0);
const schritte = new Array(G * G).fill(0);

// Schritt 1 aus der Vorlage: Kartenrand, Bergfried, Bauflaeche
let uebernommen = 0;
for (let i = 0; i < G * G; i++) {
  if (d.bauten[i] && d.schritte[i] === 1) { bauten[i] = d.bauten[i]; schritte[i] = 1; uebernommen++; }
}

let schritt = 1, gesetzt = 0;
for (const p of plaetze) {
  if (gesetzt >= ANZAHL) break;
  if (p.x >= KEEP.x0 && p.x <= KEEP.x1 && p.y >= KEEP.y0 && p.y <= KEEP.y1) continue;
  const i = p.y * G + p.x;
  if (bauten[i] && schritte[i] === 1) continue;      // nichts aus Schritt 1 ueberschreiben
  schritt++;
  bauten[i] = MAUER;
  schritte[i] = schritt;
  gesetzt++;
}

// Alles aus der Vorlage raus, was nicht zur Messung gehoert:
//   2011 Pausen      - sonst haelt die KI mitten in der Messung an
//   2012 Einheiten   - sonst stehen fremde Truppen auf der Karte
//   2004 Gruppen     - beziehen sich auf die Bauten der Vorlage
//   2005 Mauerkanten - dito
//   2013 Sonstiges   - dito
// Pausenmuster wie in den Abbot-Dateien: erster Eintrag 0, Rest -1.
const neu = writeAivMit(orig, {
  bauten, schritte,
  pausen: [0],
  einheiten: [],
  leeren: [2004, 2005, 2013],
});
fs.mkdirSync(path.dirname(path.resolve(ziel)), { recursive: true });
fs.writeFileSync(ziel, neu);

// Gegenprobe: jeder Schritt genau ein Feld, lueckenlos von 2 aufwaerts
const w = decode(fs.readFileSync(ziel));
const proSchritt = new Map();
for (let i = 0; i < G * G; i++) {
  if (w.bauten[i] !== MAUER) continue;
  const s = w.schritte[i];
  proSchritt.set(s, (proSchritt.get(s) || 0) + 1);
}
const nummern = [...proSchritt.keys()].sort((a, b) => a - b);
const mehrfach = [...proSchritt.entries()].filter(([, n]) => n !== 1);
const luecken = nummern.length ? nummern[nummern.length - 1] - nummern[0] + 1 - nummern.length : 0;
const g = w.meta.find(m => m.id === 2007);

console.log(`${path.basename(vorlage)} -> ${path.basename(ziel)}   (${seite})`);
console.log(`  Schritt 1 uebernommen: ${uebernommen} Felder (Kartenrand, Bergfried, Bauflaeche)`);
console.log(`  Mauerstuecke: ${gesetzt}, Bauschritte ${nummern[0]} bis ${nummern[nummern.length - 1]}`);
console.log(`  Raster: x ${spalten[0]}..${spalten[spalten.length - 1]} und y ${zeilen[0]}..${zeilen[zeilen.length - 1]}, Schrittweite 2`);
console.log(`  je Bauschritt genau ein Feld: ${mehrfach.length === 0 ? 'ja' : 'NEIN (' + mehrfach.length + ' Ausreisser)'}`);
console.log(`  Luecken in der Schrittfolge: ${luecken}`);
const echtePausen = (w.pausen || []).filter(v => v > 0);
const einheitenZeilen = (w.einheiten || []).filter(r => r.some(v => v !== 0)).length;
console.log(`  2007 ${g.packed ? 'gepackt' : 'ROH'}, lesbar ${g.ok ? 'ja' : 'NEIN'} - 2009 steht auf ${w.anzahlSchritte}`);
console.log(`  Pausen: ${echtePausen.length ? echtePausen.join(', ') : 'keine'}   Einheiten: ${einheitenZeilen ? einheitenZeilen + ' Zeilen' : 'keine'}`);
console.log(`  Datei ${orig.length} -> ${neu.length} Byte`);
