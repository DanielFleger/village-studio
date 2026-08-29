// Baut eine Diagnose-AIV: nur ganz wenige Bauten, in bekannter Reihenfolge.
//
// Zweck: entscheiden, ob die fruehen Bauschritte nach einem Umbau
// uebersprungen werden. Wenn diese Datei angewendet wird und die Bauten
// erscheinen, werden sie nicht uebersprungen.
//
//   node baue_diagnose.js <Vorlage.aiv> <Ziel.aiv>
//
// Schritt 1 bleibt aus der Vorlage: Kartenrand, Bergfried und Bauflaeche.
// So machen es alle 148 echten Dateien - davon weiche ich nicht ab, sonst
// misst der Test die Abweichung mit.
const fs = require('fs');
const path = require('path');
const { decode } = require('./lib/aiv');
const { writeAivMit } = require('./lib/aivwrite');

const tab = JSON.parse(fs.readFileSync(path.join(__dirname, 'lib', 'gebaeude.json'), 'utf8')).gebaeude;
const name = nr => (tab[String(nr)] || {}).name || ('Nr. ' + nr);

const [vorlage, ziel] = process.argv.slice(2);
if (!vorlage || !ziel) { console.log('Aufruf: node baue_diagnose.js <Vorlage.aiv> <Ziel.aiv>'); process.exit(1); }

const G = 100;
const orig = fs.readFileSync(vorlage);
const d = decode(orig);

// Leeres Gitter, dann Schritt 1 der Vorlage zurueckholen
const bauten = new Array(G * G).fill(0);
const schritte = new Array(G * G).fill(0);
let uebernommen = 0;
for (let i = 0; i < G * G; i++) {
  if (d.bauten[i] && d.schritte[i] === 1) {
    bauten[i] = d.bauten[i];
    schritte[i] = 1;
    uebernommen++;
  }
}

// Der Bauplan. Positionen sind so gewaehlt, dass in der Vorlage dort
// entweder Bauflaeche oder Bebauung liegt - also erwiesen bebaubar -
// und dass sie den Bergfried (43,43 bis 49,49) nicht beruehren.
//
// Der Lagerplatz als Schritt 2 ist Absicht, obwohl jede KI schon mit einem
// startet: der zweite wird trotzdem gebaut und ist damit der frueheste
// Anhaltspunkt, ob ueberhaupt etwas passiert.
const PLAN = [
  { nr: 60, b: 5, h: 5, x: 50, y: 45, was: 'Lagerplatz, zweiter neben dem vorhandenen' },
  { nr: 66, b: 5, h: 5, x: 50, y: 51, was: 'Marktplatz' },
  { nr: 70, b: 4, h: 4, x: 36, y: 47, was: 'Kornspeicher' },
];
// zehn Holzfaeller in einer Reihe, drei Felder breit mit einem Feld Luecke
for (let k = 0; k < 10; k++)
  PLAN.push({ nr: 61, b: 3, h: 3, x: 29 + k * 4, y: 33, was: 'Holzfaellerhuette ' + (k + 1) });

const KEEP = { x0: 43, y0: 43, x1: 49, y1: 49 };
let schritt = 1;
const bericht = [];
for (const p of PLAN) {
  schritt++;
  // Sicherheitsnetz: nichts auf den Bergfried, nichts doppelt
  for (let y = p.y; y < p.y + p.h; y++)
    for (let x = p.x; x < p.x + p.b; x++) {
      if (x >= KEEP.x0 && x <= KEEP.x1 && y >= KEEP.y0 && y <= KEEP.y1)
        throw new Error(`${p.was} beruehrt den Bergfried bei ${x},${y}`);
      if (x < 1 || y < 1 || x > 98 || y > 98)
        throw new Error(`${p.was} liegt ausserhalb bei ${x},${y}`);
      const i = y * G + x;
      if (bauten[i] && schritte[i] !== 1)
        throw new Error(`${p.was} ueberschneidet sich bei ${x},${y}`);
      bauten[i] = p.nr;
      schritte[i] = schritt;
    }
  bericht.push(`  Schritt ${String(schritt).padStart(2)}  ${name(p.nr)} (${p.nr}) ${p.b}x${p.h} bei ${p.x},${p.y}   ${p.was}`);
}

const neu = writeAivMit(orig, { bauten, schritte });
fs.mkdirSync(path.dirname(path.resolve(ziel)), { recursive: true });
fs.writeFileSync(ziel, neu);

console.log(`${path.basename(vorlage)} -> ${path.basename(ziel)}`);
console.log(`  Schritt  1  aus der Vorlage uebernommen: ${uebernommen} Felder (Kartenrand, Bergfried, Bauflaeche)`);
console.log(bericht.join('\n'));

// Gegenprobe
const w = decode(fs.readFileSync(ziel));
const proSchritt = new Map();
for (let i = 0; i < G * G; i++) {
  const t = w.bauten[i];
  if (!t) continue;
  let e = proSchritt.get(w.schritte[i]);
  if (!e) { e = new Map(); proSchritt.set(w.schritte[i], e); }
  e.set(t, (e.get(t) || 0) + 1);
}
const liste = [...proSchritt.keys()].sort((a, b) => a - b);
console.log('\n  gegengelesen:');
for (const s of liste) {
  const e = proSchritt.get(s);
  console.log(`    ${String(s).padStart(2)}: ` + [...e.entries()].map(([t, n]) => `${name(t)} ${n} Felder`).join(', '));
}
const g = w.meta.find(m => m.id === 2007);
console.log(`  2007 ${g.packed ? 'gepackt' : 'ROH'}, lesbar ${g.ok ? 'ja' : 'NEIN'} - 2009 steht auf ${w.anzahlSchritte} (soll ${liste[liste.length - 1] + 1})`);
console.log(`  Datei ${orig.length} -> ${neu.length} Byte`);
