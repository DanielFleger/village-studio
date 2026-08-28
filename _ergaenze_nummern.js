// Ergaenzt lib/gebaeude.json um die beiden anderen Nummernsaetze:
//   mapper   - was im Speicher in AIVBuildingStep.buildingType steht
//   laufzeit - Platz in der Update-Sprungtabelle 0x5B79A8, den destroyBuilding braucht
//
// Die AIV->Mapper-Werte stammen NICHT aus einer Ableitung, sondern aus der
// Datentabelle der exe selbst (DAT_AIVDefinedData +0xF4, also ab 0x00B46218,
// 79 Werte fuer AIV 30..108). AIV 10..24 stehen im Schalter davor.
//
//   node _ergaenze_nummern.js <ordner-mit-den-dumps>
const fs = require('fs');
const path = require('path');

const dumpOrdner = process.argv[2];
if (!dumpOrdner) { console.log('Aufruf: node _ergaenze_nummern.js <ordner>'); process.exit(1); }
const lies = f => fs.readFileSync(path.join(dumpOrdner, f), 'utf8').split(/\r?\n/).filter(Boolean);

// AIV -> Mapper aus der exe-Tabelle (AIV 30..108)
const aivZuMapper = {};
for (const z of lies('aiv2mapper.txt')) {
  const [a, m] = z.split('->').map(s => Number(s.trim()));
  if (m) aivZuMapper[a] = m;          // 0 heisst: kein Mapper hinterlegt
}
// AIV 10..24 aus dem Schalter in convertAIVBuildingTypeToCommandBuildingType
Object.assign(aivZuMapper, {
  10: 25, 11: 46, 12: 26, 13: 35,
  14: 181, 15: 182, 16: 183, 17: 184, 18: 185, 19: 186,
  20: 106, 21: 106, 22: 106, 23: 106, 24: 99,
});

const mapperName = {};
for (const z of lies('mappernamen.txt')) {
  const [n, nm] = z.split('=').map(s => s.trim());
  if (!(n in mapperName)) mapperName[n] = nm;    // erster Name gewinnt
}
const btNr = {}, btName = {};
for (const z of lies('bttypen.txt')) {
  const [n, nm] = z.split('=').map(s => s.trim());
  btName[n] = nm;
  btNr[nm.replace(/^BT_/, '').toLowerCase()] = Number(n);
}

// AIV-Name -> Laufzeit-Kurzname. Ueber die Bedeutung, es gibt keine Formel.
const zuLaufzeit = {
  24: 'pitchditch', 30: 'tower_one', 31: 'tower_two', 32: 'tower_three', 33: 'tower_four',
  34: 'tower_five', 35: 'oilsmelter', 36: 'dogcage', 37: 'killingpit', 38: 'stonekeep',
  39: 'mercenarypost', 40: 'small_gatehouse', 41: 'small_gatehouse', 42: 'large_gatehouse',
  43: 'large_gatehouse', 44: 'drawbridge', 50: 'poleturner', 51: 'fletcher', 52: 'blacksmith',
  53: 'tanner', 54: 'armourer', 55: 'barracks', 56: 'armory', 57: 'engineersguild',
  58: 'tunnelersguild', 59: 'stables', 60: 'stockpile', 61: 'woodcuttershut', 62: 'quarry',
  63: 'oxtether', 64: 'ironmine', 65: 'pitchrig', 66: 'marketplace', 70: 'granary',
  71: 'apple_farm', 72: 'dairy_farm', 73: 'wheat_farm', 74: 'huntershut', 75: 'hop_farm',
  76: 'mill', 77: 'bakery', 78: 'brewery', 79: 'inn', 80: 'hovel', 81: 'chapel',
  82: 'church', 83: 'cathedral', 84: 'apothecary', 85: 'well', 86: 'waterpot',
  90: 'maypole', 91: 'dancingbear', 92: 'statue', 93: 'shrine', 94: 'garden', 95: 'garden',
  96: 'pond', 97: 'pond', 100: 'gallows', 101: 'cesspit', 102: 'stocks', 103: 'burningstake',
  104: 'dungeon', 105: 'stretchingrack', 106: 'gibbet', 107: 'choppingblock', 108: 'dunkingstool',
};
// Namen, die im BT-Enum anders heissen
const anders = {
  tower_one: 'tower1', tower_two: 'tower2', tower_three: 'tower3',
  tower_four: 'tower4', tower_five: 'tower5',
  small_gatehouse: 'gatehousesmall', large_gatehouse: 'gatehouselarge',
  apple_farm: 'applefarm', dairy_farm: 'dairyfarm',
  wheat_farm: 'wheatfarm', hop_farm: 'hopfarm',
};

const datei = path.join(__dirname, 'lib', 'gebaeude.json');
const doc = JSON.parse(fs.readFileSync(datei, 'utf8'));
let mitMapper = 0, mitLaufzeit = 0, ohneLaufzeit = [];

for (const nr of Object.keys(doc.gebaeude)) {
  const e = doc.gebaeude[nr];
  const n = Number(nr);
  if (aivZuMapper[n]) {
    e.mapper = aivZuMapper[n];
    e.mapperName = mapperName[String(aivZuMapper[n])] || null;
    mitMapper++;
  }
  const kurz = zuLaufzeit[n];
  if (kurz) {
    const schluessel = anders[kurz] || kurz.replace(/_/g, '');
    if (schluessel in btNr) { e.laufzeit = btNr[schluessel]; e.laufzeitName = btName[String(btNr[schluessel])]; mitLaufzeit++; }
    else ohneLaufzeit.push(nr + ' ' + e.name + ' (gesucht: ' + schluessel + ')');
  }
}
doc._quelle_nummern = 'mapper: Datentabelle der exe ab 0x00B46218 (AIV 30-108) plus der Schalter in convertAIVBuildingTypeToCommandBuildingType (AIV 10-24). laufzeit: Enum BuildingType aus der Ghidra-Referenz OpenSHC-ref, zugeordnet ueber die Bedeutung.';
fs.writeFileSync(datei, JSON.stringify(doc, null, 1));

console.log('lib/gebaeude.json ergaenzt');
console.log('  mit Mapper-Nummer:   ' + mitMapper + ' von ' + Object.keys(doc.gebaeude).length);
console.log('  mit Laufzeit-Nummer: ' + mitLaufzeit);
if (ohneLaufzeit.length) console.log('  nicht zugeordnet:\n    ' + ohneLaufzeit.join('\n    '));
// Stichproben
for (const nr of ['51', '80', '38', '10', '30']) {
  const e = doc.gebaeude[nr];
  if (e) console.log(`  Probe AIV ${nr} ${e.name}: Mapper ${e.mapper}${e.mapperName ? ' (' + e.mapperName + ')' : ''}, Laufzeit ${e.laufzeit ?? '-'}${e.laufzeitName ? ' (' + e.laufzeitName + ')' : ''}`);
}
