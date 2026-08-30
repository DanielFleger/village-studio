// Verbindet die aus der exe gelesene Kostentabelle mit den Gebaeudenamen
// und schreibt lib/kosten.json.
//
//   node _baue_kostentabelle.js <kosten.txt aus dem Ghidra-Dump>
//
// Die Tabelle steht in der exe ab 0x005C21D0 (BuildingDefinedData +0xA85C)
// als int[110][5]: Holz, Stein, Eisen, Pech, Gold. Beim Spielstart kopiert
// initBuildingCosts (0x00419780) sie nach BuildingsState +0x18C7D4 - dorthin
// muss man schreiben, wenn die Kosten im laufenden Spiel gelten sollen.
const fs = require('fs');
const path = require('path');

const quelle = process.argv[2];
if (!quelle) { console.log('Aufruf: node _baue_kostentabelle.js <kosten.txt>'); process.exit(1); }

const doc = JSON.parse(fs.readFileSync(path.join(__dirname, 'lib', 'gebaeude.json'), 'utf8'));
// Laufzeit-Nummer -> Name, aus der Gebaeudetabelle
const nachLaufzeit = {};
for (const [nr, e] of Object.entries(doc.gebaeude))
  if (e.laufzeit) nachLaufzeit[e.laufzeit] = { name: e.name, aiv: Number(nr), mapper: e.mapper };

const eintraege = {};
for (const zeile of fs.readFileSync(quelle, 'utf8').split(/\r?\n/)) {
  const t = zeile.trim().split(/\s+/).map(Number);
  if (t.length !== 6 || Number.isNaN(t[0])) continue;
  const [idx, holz, stein, eisen, pech, gold] = t;
  const bekannt = nachLaufzeit[idx];
  eintraege[idx] = {
    name: bekannt ? bekannt.name : null,
    aiv: bekannt ? bekannt.aiv : null,
    holz, stein, eisen, pech, gold,
  };
}

const out = {
  _quelle: 'Aus der exe gelesen ab 0x005C21D0 (BuildingDefinedData +0xA85C), int[110][5]. ' +
           'Index ist die Laufzeit-Gebaeudenummer. Im laufenden Spiel steht dieselbe Tabelle ' +
           'bei BuildingsState +0x18C7D4 = 0x01124CF4 und ist dort schreibbar.',
  _reihenfolge: ['holz', 'stein', 'eisen', 'pech', 'gold'],
  _adresse_exe: '0x005C21D0',
  _adresse_laufzeit: '0x01124CF4',
  _eintragsgroesse: 20,
  kosten: eintraege,
};
fs.writeFileSync(path.join(__dirname, 'lib', 'kosten.json'), JSON.stringify(out, null, 1));

const nr = Object.keys(eintraege).map(Number).sort((a, b) => a - b);
const mitNamen = nr.filter(i => eintraege[i].name);
console.log(`lib/kosten.json geschrieben: ${nr.length} Eintraege, davon ${mitNamen.length} mit Namen`);
console.log('');
console.log('Laufz  Gebaeude              Holz  Stein  Eisen  Pech   Gold   Adresse im Spiel');
for (const i of nr) {
  const e = eintraege[i];
  const adr = (0x01124CF4 + i * 20).toString(16).toUpperCase();
  console.log(String(i).padStart(5) + '  ' + (e.name || '(unbenannt)').padEnd(20) +
    String(e.holz).padStart(5) + String(e.stein).padStart(7) + String(e.eisen).padStart(7) +
    String(e.pech).padStart(6) + String(e.gold).padStart(7) + '   0x' + adr);
}
const ohne = nr.filter(i => !eintraege[i].name);
if (ohne.length) console.log('\nOhne Namen (Laufzeit-Nummern, die in keiner AIV vorkommen): ' + ohne.join(', '));
