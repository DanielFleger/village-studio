// Prueft, ob die Adressen in doku/rezepte.lua zu denen im Wissensstand passen.
// Damit faellt ein Tippfehler in der Adresstabelle sofort auf, statt erst im
// laufenden Spiel an einer unerklaerlichen Stelle.
const fs = require('fs');
const path = require('path');

const lua = fs.readFileSync(path.join(__dirname, 'doku', 'rezepte.lua'), 'utf8');

const soll = {
  AIV_STATE: 0x01866AB0, BUILDINGS: 0x00F98520, BAUKOSTEN: 0x01124CF4,
  PLAYERDATA: 0x0115BDF8, GAME_SPEED: 0x01FE7DD8, TICKS: 0x0117CADC,
  LOGIC: 0x01BF8368, HEIGHT: 0x01D32C38, DEFAULT_HEIGHT: 0x01D46648,
  WALL_OWNER: 0x01D5A058, DAMAGE: 0x01DBC2A8, BUILDING_LAYER: 0x01C95BB8,
  UNITS: 0x0138854C, UNIT_MAX: 0x01387F38, UNIT_COUNT: 0x01387F3C,
  ENTITIES: 0x02350314, ENTITY_COUNT: 0x02350300,
};

let ok = 0;
const fehler = [];
for (const [name, wert] of Object.entries(soll)) {
  const m = lua.match(new RegExp(name + '\\s*=\\s*(0x[0-9A-Fa-f]+)'));
  if (!m) { fehler.push(`${name}: kein Eintrag gefunden`); continue; }
  const ist = parseInt(m[1], 16);
  if (ist !== wert) fehler.push(`${name}: 0x${ist.toString(16).toUpperCase()} statt 0x${wert.toString(16).toUpperCase()}`);
  else ok++;
}

// Abgeleitete Groessen, die zusammenpassen muessen
const proben = [
  ['AIVSpec-Schrittweite', /0x6D98/, 0x6D98],
  ['Gebaeudegroesse 812', /\* 812/, 812],
  ['Einheitengroesse 1168', /\* 1168/, 1168],
  ['Geschossgroesse 232', /\* 232/, 232],
  ['PlayerData-Schrittweite', /0x39F4/, 0x39F4],
  ['Kosteneintrag 20 Byte', /\* 20/, 20],
];
const fehlend = proben.filter(([, muster]) => !muster.test(lua)).map(([n]) => n);

console.log(`Adressen: ${ok}/${Object.keys(soll).length} stimmen mit dem Wissensstand ueberein`);
if (fehler.length) console.log('  ' + fehler.join('\n  '));
console.log(`Schrittweiten: ${proben.length - fehlend.length}/${proben.length} vorhanden`);
if (fehlend.length) console.log('  fehlt: ' + fehlend.join(', '));

// Gegenprobe zur Einheiten-Basis: units[1].logicalState muss auf die
// Adresse fallen, die im Maschinencode von spawnUnit steht (0x01388A68).
// Das prueft Basis, Schrittweite und den logicalState-Versatz in einem Zug.
const u1 = 0x0138854C + 1168 + 0x8C;
if (u1 !== 0x01388A68) fehler.push(`Einheiten-Gegenprobe: 0x${u1.toString(16).toUpperCase()} statt 0x1388A68`);
else console.log('Einheiten-Gegenprobe: units[1].logicalState = 0x1388A68 wie im Code (LEA EAX,[EBX+0xb30])');
// Die Schleife darf NICHT ueber unitType belegt pruefen - das war der Fehler
if (lua.includes('local typ = M.einheitTyp(i)') && lua.includes('if typ ~= 0 then'))
  fehler.push('jedeEinheit prueft noch ueber unitType statt ueber logicalState (+0x8C)');
if (!lua.includes('M.einheitZustand(i) ~= 0'))
  fehler.push('jedeEinheit prueft nicht ueber logicalState (+0x8C)');
if (!lua.includes('for i = 1, n - 1'))
  fehler.push('jedeEinheit startet nicht bei 1 - Slot 0 wird nie vergeben');
if (!/UNIT_MAX/.test(lua)) fehler.push('A.UNIT_MAX fehlt - die Schleife nimmt die falsche Grenze');

// Mauerbits gegen den belegten Wert
const mb = 0x100 + 0x200 + 0x800 + 0x10000 + 0x400000;
console.log(`Mauerbits 0x${mb.toString(16).toUpperCase()} — die von destroyWall geloeschte Maske ` +
            `0x470B00 enthaelt zusaetzlich den Schutt (Boulders 0x20000, Pebbles 0x40000), ` +
            `der zum Erkennen von Mauern nicht dazugehoert.`);

process.exit(fehler.length || fehlend.length ? 1 : 0);
