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

// Sicherheitszone um den Bergfried. Nicht nur er selbst ist tabu: jede KI
// bekommt beim Start automatisch ein Vorratslager daneben, und weder Bergfried
// noch Lager lassen sich ueberbauen. Beide stehen nicht in der AIV, man sieht
// sie also im Bauplan nicht - deshalb hier grosszuegig Abstand halten.
// Neun Felder auf jeder Seite, symmetrisch um die Bergfriedmitte (46).
const SPERRE = { x0: 35, y0: 35, x1: 57, y1: 57 };

const spalten = [];
if (seite === 'links') for (let x = 6; x <= 34; x += 2) spalten.push(x);
else                   for (let x = 58; x <= 86; x += 2) spalten.push(x);

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
  if (p.x >= SPERRE.x0 && p.x <= SPERRE.x1 && p.y >= SPERRE.y0 && p.y <= SPERRE.y1) continue;
  const i = p.y * G + p.x;
  // Kartenrand und Bergfried sind tabu. Die Bauflaeche (2) darf weichen - sie
  // ist nur eine Reservierung, kein Bauwerk. Sonst haetten beide Seiten
  // unterschiedlich viele Plaetze und der Vergleich waere schief: rechts vom
  // Bergfried liegen vier Rasterplaetze unter der Flaeche.
  if (bauten[i] === 1 || bauten[i] === 38) continue;
  schritt++;
  bauten[i] = MAUER;
  schritte[i] = schritt;
  gesetzt++;
}

// Alles aus der Vorlage raus, was nicht zur Messung gehoert:
//   2011 Pausen      - sonst haelt die KI mitten in der Messung an
//   2012 Einheiten   - sonst stehen fremde Truppen auf der Karte
//   2013 Sonstiges   - bezieht sich auf die Bauten der Vorlage
// 2004 und 2005 werden NICHT geleert: die erzeugt der Schreiber selbst aus
// den neuen Bauten. Wer sie leert, macht genau den Fehler wieder, wegen dem
// die Gebaeude in Einzelfelder zerfielen.
// Pausenmuster wie in den Abbot-Dateien: erster Eintrag 0, Rest -1.
const neu = writeAivMit(orig, {
  bauten, schritte,
  pausen: [0],
  einheiten: [],
  leeren: [2013],
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
console.log(`  Mauerstuecke: ${gesetzt}${gesetzt < ANZAHL ? '  ACHTUNG: ' + ANZAHL + ' gefordert' : ''}, Bauschritte ${nummern[0]} bis ${nummern[nummern.length - 1]}`);
console.log(`  Raster: x ${spalten[0]}..${spalten[spalten.length - 1]} und y ${zeilen[0]}..${zeilen[zeilen.length - 1]}, Schrittweite 2`);
console.log(`  Abstand zur Sperrzone um Bergfried und Startlager (${SPERRE.x0}..${SPERRE.x1}): ` +
            (seite === 'links' ? SPERRE.x0 - spalten[spalten.length - 1] : spalten[0] - SPERRE.x1) + ' Felder');
console.log(`  je Bauschritt genau ein Feld: ${mehrfach.length === 0 ? 'ja' : 'NEIN (' + mehrfach.length + ' Ausreisser)'}`);
console.log(`  Luecken in der Schrittfolge: ${luecken}`);
const echtePausen = (w.pausen || []).filter(v => v > 0);
const einheitenZeilen = (w.einheiten || []).filter(r => r.some(v => v !== 0)).length;
console.log(`  2007 ${g.packed ? 'gepackt' : 'ROH'}, lesbar ${g.ok ? 'ja' : 'NEIN'} - 2009 steht auf ${w.anzahlSchritte}`);
console.log(`  Pausen: ${echtePausen.length ? echtePausen.join(', ') : 'keine'}   Einheiten: ${einheitenZeilen ? einheitenZeilen + ' Zeilen' : 'keine'}`);
console.log(`  Datei ${orig.length} -> ${neu.length} Byte`);
