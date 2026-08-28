// Vergleicht zwei AIV-Dateien: was hat die eine, was die andere auch hat.
// Erzeugt daraus eine Lua-Tabelle zum Filtern beim Abreissen.
//
//   node vergleiche_ki.js <Alt.aiv> <Neu.aiv> [Ziel.lua]
//
// "Alt" ist die Burg, die steht. "Neu" ist die, die daraufkommen soll.
// Behalten wird, was beide haben - alles andere kann weg.
const fs = require('fs');
const path = require('path');
const { decode } = require('./lib/aiv');

const tab = JSON.parse(fs.readFileSync(path.join(__dirname, 'lib', 'gebaeude.json'), 'utf8')).gebaeude;
const [altPfad, neuPfad, zielPfad] = process.argv.slice(2);
if (!altPfad || !neuPfad) {
  console.log('Aufruf: node vergleiche_ki.js <Alt.aiv> <Neu.aiv> [Ziel.lua]');
  process.exit(1);
}

function typen(p) {
  const d = decode(fs.readFileSync(p));
  const m = new Map();
  for (let i = 0; i < 10000; i++) {
    const t = d.bauten[i];
    if (!t || t === 1 || t === 2) continue;
    m.set(t, (m.get(t) || 0) + 1);
  }
  return m;
}

const alt = typen(altPfad), neu = typen(neuPfad);
const e = t => tab[String(t)] || {};
const behalten = [...alt.keys()].filter(t => neu.has(t)).sort((a, b) => a - b);
const weg = [...alt.keys()].filter(t => !neu.has(t)).sort((a, b) => a - b);

// Die entscheidende Probe: Gebaeude werden im Spiel ueber die Laufzeit-Nummer
// erkannt. Teilen sich ein Bau zum Behalten und einer zum Abreissen dieselbe,
// kann man sie im Gebaeude-Array nicht auseinanderhalten.
const behaltenLZ = new Map(), wegLZ = new Map();
for (const t of behalten) if (e(t).laufzeit) behaltenLZ.set(e(t).laufzeit, t);
for (const t of weg) if (e(t).laufzeit) wegLZ.set(e(t).laufzeit, t);
const streit = [...wegLZ.keys()].filter(l => behaltenLZ.has(l));

const zeile = t => `AIV ${String(t).padStart(3)}  Abriss ${String(e(t).laufzeit ?? '-').padStart(3)}  ${e(t).name}`;
console.log(`${path.basename(altPfad)} (${alt.size} Typen)  gegen  ${path.basename(neuPfad)} (${neu.size} Typen)`);
console.log(`\nSTEHEN LASSEN (${behalten.length}):`);
for (const t of behalten) console.log('   ' + zeile(t));
console.log(`\nABREISSEN (${weg.length}):`);
for (const t of weg) console.log('   ' + zeile(t) + `   ${alt.get(t)} Felder`);

console.log('');
if (streit.length) {
  console.log('ACHTUNG - gleiche Abriss-Nummer auf beiden Seiten:');
  for (const l of streit)
    console.log(`   Abriss ${l}: behalten waere ${e(behaltenLZ.get(l)).name}, abreissen ${e(wegLZ.get(l)).name}`
              + '  -> im Gebaeude-Array nicht unterscheidbar, nur ueber die Kachelposition');
} else {
  console.log('Probe: keine Abriss-Nummer steht auf beiden Seiten - der Filter ist eindeutig.');
}

const mauern = weg.filter(t => !e(t).laufzeit);
if (mauern.length) console.log(`Ohne Abriss-Nummer (Mauerwerk, braucht den Kachelweg): ${mauern.map(t => e(t).name).join(', ')}`);

if (zielPfad) {
  const L = [];
  L.push('--[[ Erzeugt von vergleiche_ki.js: ' + path.basename(altPfad) + ' gegen ' + path.basename(neuPfad));
  L.push('     BEHALTEN/ABREISSEN sind Laufzeit-Nummern fuer das Gebaeude-Array.');
  L.push('     MAUERN_WEG sind AIV-Nummern - die haben keine Laufzeit-Nummer und');
  L.push('     brauchen den Weg ueber WallOwnerLayer und DestroyWallOrPitch. ]]--');
  L.push('local M = {}');
  L.push('M.BEHALTEN = { ' + [...behaltenLZ.keys()].sort((a, b) => a - b).map(l => `[${l}] = true`).join(', ') + ' }');
  L.push('M.ABREISSEN = { ' + [...wegLZ.keys()].sort((a, b) => a - b).map(l => `[${l}] = true`).join(', ') + ' }');
  L.push('M.MAUERN_WEG = { ' + mauern.map(t => `[${t}] = ${JSON.stringify(e(t).name)}`).join(', ') + ' }');
  L.push('M.NAMEN = {');
  for (const t of [...behalten, ...weg]) if (e(t).laufzeit) L.push(`  [${e(t).laufzeit}] = ${JSON.stringify(e(t).name)},`);
  L.push('}');
  L.push('return M');
  fs.writeFileSync(zielPfad, L.join('\n') + '\n');
  console.log('\ngeschrieben: ' + zielPfad);
}
