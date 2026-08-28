// Erzeugt lib/aiv_typen.lua aus lib/gebaeude.json:
// die AIV-Typnummern mit Namen, plus die Bruecke zu den Laufzeit-Typen
// des Spiels (Sprungtabelle 0x5B79A8 = sourcehold/data/shc.py).
const fs = require('fs');
const path = require('path');

const tab = JSON.parse(fs.readFileSync(path.join(__dirname, 'lib', 'gebaeude.json'), 'utf8')).gebaeude;

// Laufzeit-Typen des Spiels. Belegt an sieben Ankern aus logik.lua des
// Hot-Swap-Moduls: 10 Lager, 40 Herrenhaus, 41 Steinburg, 42 Feste,
// 71/72/73 Bergfriedtueren - alle sieben stimmen mit dieser Liste ueberein.
const LAUFZEIT = {
  1: 'hovel', 2: 'house', 3: 'woodcuttershut', 4: 'oxtether', 5: 'ironmine',
  6: 'pitchrig', 7: 'huntershut', 8: 'mercenarypost', 9: 'barracks', 10: 'stockpile',
  11: 'armory', 12: 'fletcher', 13: 'blacksmith', 14: 'poleturner', 15: 'armourer',
  16: 'tanner', 17: 'bakery', 18: 'brewery', 19: 'granary', 20: 'quarry',
  21: 'quarrypile', 22: 'inn', 23: 'apothecary', 24: 'engineerguild', 25: 'tunnelerguild',
  26: 'marketplace', 27: 'well', 28: 'oilsmelter', 29: 'siege_tent', 30: 'wheat_farm',
  31: 'hop_farm', 32: 'apple_farm', 33: 'dairy_farm', 34: 'mill', 35: 'stables',
  36: 'chapel', 37: 'church', 38: 'cathedral', 40: 'manorhouse', 41: 'stonekeep',
  42: 'stronghold', 43: 'keep_four', 44: 'keep_five', 45: 'large_gatehouse',
  46: 'small_gatehouse', 47: 'wood_gate', 48: 'wood_postern', 49: 'drawbridge',
  50: 'tunnel', 60: 'gatehouse', 61: 'tower', 62: 'gallows', 63: 'stocks',
  64: 'witch_hoist', 65: 'maypole', 66: 'garden', 67: 'killingpit', 68: 'pitchditch',
  70: 'waterpot', 71: 'keepdoor_left', 72: 'keepdoor_right', 73: 'keepdoor',
  74: 'tower_one', 75: 'tower_two', 76: 'tower_three', 77: 'tower_four', 78: 'tower_five',
  91: 'cesspit', 92: 'burningstake', 93: 'gibbet', 94: 'dungeon', 95: 'stretchingrack',
  96: 'rackflogging', 97: 'choppingblock', 98: 'dunkingstool', 99: 'dogcage',
  100: 'statue', 101: 'shrine', 102: 'beehive', 103: 'dancingbear', 104: 'pond',
  105: 'bearcave',
};
const LAUFZEIT_NR = Object.fromEntries(Object.entries(LAUFZEIT).map(([n, k]) => [k, Number(n)]));

// AIV-Nummer -> Laufzeit-Name. Ueber die Bedeutung zugeordnet, nicht ueber
// eine Formel - die gibt es nicht. Was nicht eindeutig ist, steht als null
// drin und wird als offen gemeldet, statt geraten zu werden.
const BRUECKE = {
  // Mauern, Treppen und Graeben haben im Laufzeitsatz keine erkennbare
  // Entsprechung - das ist ungeklaert und wird nicht geraten.
  10: null, 11: null, 12: null, 13: null,
  14: null, 15: null, 16: null, 17: null, 18: null, 19: null,
  20: null, 21: null, 22: null, 23: null,
  24: 'pitchditch', 30: 'tower_one', 31: 'tower_two', 32: 'tower_three',
  33: 'tower_four', 34: 'tower_five', 35: 'oilsmelter', 36: 'dogcage',
  37: 'killingpit', 38: 'stonekeep', 39: 'mercenarypost',
  40: 'small_gatehouse', 41: 'small_gatehouse', 42: 'large_gatehouse', 43: 'large_gatehouse',
  44: 'drawbridge', 50: 'poleturner', 51: 'fletcher', 52: 'blacksmith', 53: 'tanner',
  54: 'armourer', 55: 'barracks', 56: 'armory', 57: 'engineerguild', 58: 'tunnelerguild',
  59: 'stables', 60: 'stockpile', 61: 'woodcuttershut', 62: 'quarry', 63: 'oxtether',
  64: 'ironmine', 65: 'pitchrig', 66: 'marketplace', 70: 'granary', 71: 'apple_farm',
  72: 'dairy_farm', 73: 'wheat_farm', 74: 'huntershut', 75: 'hop_farm', 76: 'mill',
  77: 'bakery', 78: 'brewery', 79: 'inn', 80: 'hovel', 81: 'chapel', 82: 'church',
  83: 'cathedral', 84: 'apothecary', 85: 'well', 86: 'waterpot', 90: 'maypole',
  91: 'dancingbear', 92: 'statue', 93: 'shrine', 94: 'garden', 95: 'garden',
  96: 'pond', 97: 'pond', 100: 'gallows', 101: 'cesspit', 102: 'stocks',
  103: 'burningstake', 104: 'dungeon', 105: 'stretchingrack', 106: 'gibbet',
  107: 'choppingblock', 108: 'dunkingstool',
};

const zeilen = [];
zeilen.push('--[[');
zeilen.push('  AIV-Typnummern mit Namen, plus Bruecke zu den Laufzeit-Typen.');
zeilen.push('');
zeilen.push('  Es gibt DREI Nummernsaetze fuer Gebaeude, die man leicht verwechselt:');
zeilen.push('    1. AIV-Typ      - steht in der .aiv-Datei (Abschnitt 2007) und im');
zeilen.push('                      Bauliste-Eintrag bei +0x3A. Quelle:');
zeilen.push('                      BUILDING_TYPE_AIV_FILES_KV in sourcehold/tool/convert/aiv/info.py');
zeilen.push('    2. Laufzeit-Typ - Platz in der Update-Sprungtabelle 0x5B79A8.');
zeilen.push('                      Gleich sourcehold/data/shc.py (BuildingType).');
zeilen.push('    3. Mapper-Typ   - nur im Karteneditor-Format, hier ohne Bedeutung.');
zeilen.push('');
zeilen.push('  Die AIV-Namen sind gegen die gemessenen Grundflaechen aller 18 Doerfer');
zeilen.push('  geprueft: 59 benutzte Nummern, keine Abweichung.');
zeilen.push('  Erzeugt von _baue_lua_tabelle.js im Village-Studio-Projekt.');
zeilen.push(']]--');
zeilen.push('');
zeilen.push('local M = {}');
zeilen.push('');
zeilen.push('-- AIV-Typ -> { name, breite, hoehe, art, mapper, laufzeit }');
zeilen.push('-- mapper   = was im Speicher in AIVBuildingStep.buildingType steht');
zeilen.push('-- laufzeit = Platz in der Sprungtabelle 0x5B79A8, den destroyBuilding braucht');
zeilen.push('M.AIV = {');
for (const nr of Object.keys(tab).map(Number).sort((a, b) => a - b)) {
  const e = tab[String(nr)];
  const groesse = e.b ? `b = ${e.b}, h = ${e.h}, ` : '';
  const m = e.mapper ? `mapper = ${e.mapper}, ` : '';
  const l = e.laufzeit ? `laufzeit = ${e.laufzeit}, ` : '';
  zeilen.push(`  [${nr}] = { name = ${JSON.stringify(e.name)}, ${groesse}${m}${l}art = ${JSON.stringify(e.gruppe)} },`);
}
zeilen.push('}');
zeilen.push('');
zeilen.push('-- Mapper-Nummer -> AIV-Typ, fuer den Weg zurueck aus dem Speicher');
zeilen.push('M.MAPPER_ZU_AIV = {');
for (const nr of Object.keys(tab).map(Number).sort((a, b) => a - b)) {
  const e = tab[String(nr)];
  if (e.mapper) zeilen.push(`  [${e.mapper}] = ${nr},   -- ${e.name}`);
}
zeilen.push('}');
zeilen.push('');
zeilen.push('-- Laufzeit-Typ (Platz in 0x5B79A8) -> Kurzname');
zeilen.push('M.LAUFZEIT = {');
for (const nr of Object.keys(LAUFZEIT).map(Number).sort((a, b) => a - b))
  zeilen.push(`  [${nr}] = ${JSON.stringify(LAUFZEIT[nr])},`);
zeilen.push('}');
zeilen.push('');
zeilen.push('-- AIV-Typ -> Laufzeit-Typ (fuer destroyBuilding).');
zeilen.push('-- Was fehlt, ist offen und nicht geraten - siehe M.OFFEN.');
zeilen.push('M.AIV_ZU_LAUFZEIT = {');
const offen = [];
for (const nr of Object.keys(tab).map(Number).sort((a, b) => a - b)) {
  const e = tab[String(nr)];
  if (nr <= 2 || nr === 25) continue;
  if (!e.laufzeit) { offen.push(nr); continue; }
  zeilen.push(`  [${nr}] = ${e.laufzeit},   -- ${e.name} = ${e.laufzeitName}`);
}
zeilen.push('}');
zeilen.push('');
zeilen.push('-- AIV-Typen ohne sichere Entsprechung im Laufzeitsatz');
zeilen.push('M.OFFEN = { ' + offen.map(n => `[${n}] = ${JSON.stringify((tab[String(n)] || {}).name || '?')}`).join(', ') + ' }');
zeilen.push('');
zeilen.push('return M');

fs.writeFileSync(path.join(__dirname, 'lib', 'aiv_typen.lua'), zeilen.join('\n') + '\n');

// Gegenprobe: jede AIV-Nummer aus der Bruecke muss es in gebaeude.json geben,
// und jeder Laufzeitname muss in LAUFZEIT stehen.
let fehler = 0;
for (const [nr, k] of Object.entries(BRUECKE)) {
  if (!tab[nr]) { console.log('AIV-Nummer ' + nr + ' fehlt in gebaeude.json'); fehler++; }
  if (k && !(k in LAUFZEIT_NR)) { console.log('Laufzeitname unbekannt: ' + k); fehler++; }
}
const ohneBruecke = Object.keys(tab).map(Number).filter(n => n > 2 && n !== 25 && !(n in BRUECKE));
console.log(`lib/aiv_typen.lua geschrieben.`);
console.log(`  AIV-Typen: ${Object.keys(tab).length}   Bruecke belegt: ${Object.keys(BRUECKE).length - offen.length}   offen: ${offen.length}`);
if (ohneBruecke.length) console.log('  ohne Eintrag in der Bruecke: ' + ohneBruecke.join(', '));
console.log(fehler ? `  ${fehler} Fehler` : '  keine Widersprueche');
