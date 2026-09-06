// .map lesen (Stronghold / Crusader)
//
// Aufbau laut sourcehold-maps (structure/map_structure.h), an echten Dateien geprueft:
//   u32 magic (0xFFFFFFFF)
//   u32 groesse der Vorschau
//   Vorschau als gepackter Abschnitt: u32 entpackt, u32 gepackt, u32 Pruefsumme, Daten
//   ... danach Beschreibung, vier einfache Abschnitte, dann das Verzeichnis
//
// Die Vorschau ist das Wertvolle fuer uns: 200x200 Punkte senkrecht von oben,
// je Punkt ein Byte als Nummer in eine Farbtafel aus 256 Eintraegen (RGB mit je 5 Bit).

const zlib = require('zlib');
const { blast } = require('./blast');

const VORSCHAU_KANTE = 200;

function leseVorschau(buf) {
  const magic = buf.readUInt32LE(0);
  if (magic !== 0xFFFFFFFF) throw new Error('Kein bekannter Karten-Kopf (magic ' + magic.toString(16) + ')');

  const blockLaenge = buf.readUInt32LE(4);
  const unc = buf.readUInt32LE(8);
  const comp = buf.readUInt32LE(12);
  const daten = buf.subarray(20, 8 + blockLaenge);

  const roh = blast(daten);
  if (roh.length !== unc)
    throw new Error(`Vorschau entpackt ${roh.length} statt ${unc} Bytes`);

  const erwartet = 512 + VORSCHAU_KANTE * VORSCHAU_KANTE;
  if (roh.length !== erwartet)
    throw new Error(`Vorschau hat ${roh.length} Bytes, erwartet ${erwartet}`);

  // Farbtafel: 256 Eintraege zu 16 Bit, Aufteilung 5-5-5
  const tafel = [];
  for (let i = 0; i < 256; i++) {
    const w = roh.readUInt16LE(i * 2);
    const r = (w >> 10) & 31, g = (w >> 5) & 31, b = w & 31;
    tafel.push([(r * 255 / 31) | 0, (g * 255 / 31) | 0, (b * 255 / 31) | 0]);
  }

  const punkte = roh.subarray(512);
  return { kante: VORSCHAU_KANTE, tafel, punkte, komprimiert: comp, entpackt: unc };
}

// Kleiner PNG-Schreiber, damit kein Fremdpaket noetig ist
function pngAus(breite, hoehe, rgbAt) {
  const zeilen = Buffer.alloc(hoehe * (1 + breite * 3));
  let p = 0;
  for (let y = 0; y < hoehe; y++) {
    zeilen[p++] = 0;                       // Filter "keiner"
    for (let x = 0; x < breite; x++) {
      const [r, g, b] = rgbAt(x, y);
      zeilen[p++] = r; zeilen[p++] = g; zeilen[p++] = b;
    }
  }

  const stueck = (typ, inhalt) => {
    const laenge = Buffer.alloc(4);
    laenge.writeUInt32BE(inhalt.length, 0);
    const koerper = Buffer.concat([Buffer.from(typ, 'ascii'), inhalt]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(koerper) >>> 0, 0);
    return Buffer.concat([laenge, koerper, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0);
  ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8;    // 8 Bit je Kanal
  ihdr[9] = 2;    // Echtfarbe
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    stueck('IHDR', ihdr),
    stueck('IDAT', zlib.deflateSync(zeilen, { level: 9 })),
    stueck('IEND', Buffer.alloc(0)),
  ]);
}

let crcTafel = null;
function crc32(buf) {
  if (!crcTafel) {
    crcTafel = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      crcTafel[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTafel[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return c ^ -1;
}

function vorschauAlsPng(buf) {
  const v = leseVorschau(buf);
  return pngAus(v.kante, v.kante, (x, y) => v.tafel[v.punkte[y * v.kante + x]]);
}

// ---------------------------------------------------------------------------
// Das Verzeichnis und die Abschnitte einer .map
//
// Aufbau, an 143 Karten gemessen:
//   Das Verzeichnis beginnt mit dem u32-Wert 1001 und hat drei Felder zu je
//   150 u32: die Abschnitts-IDs, ein Ja/Nein je Abschnitt, die Versaetze.
//   4 Byte spaeter beginnen die Daten. Jeder Abschnitt hat 12 Byte Kopf
//   (entpackt, gepackt, Pruefsumme) und danach die gepackten Daten.
//   Ist gepackt == entpackt, liegen die Daten roh da.
//
// Welcher Abschnitt was ist, steht in der exe: DAT_MapSectionAddressArray
// (0x00b92a58, 123 Eintraege zu 16 Byte) nennt zu jeder ID die Zieladresse
// im Speicher. Die Zieladressen liegen in DAT_TileMapState (0x01a93208).
const ABSCHNITTE = {
  1001: 'GfxLayer',            // 2 Byte: die fertige Bildnummer je Feld
  1033: 'AlphaGFXLayer',       // 2 Byte: das ueberblendete Bild (Uebergaenge)
  1002: 'PillarGFXLayer',      // 2 Byte
  1036: 'MacroLayer',          // 2 Byte: zu welchem Gelaendefleck ein Feld gehoert
  1008: 'RandomLayer',         // 2 Byte: die Zufallszahl je Feld (& 7 waehlt die Fassung)
  1003: 'LogicLayer',          // 4 Byte: die Art des Feldes als Bitfeld
  1037: 'Logic2Layer',         // 1 Byte
  1005: 'HeightLayer',         // 1 Byte: Hoehe
  1045: 'DefaultHeightLayer',  // 1 Byte
  1009: 'WallGFXLayer', 1012: 'BuildingLayer', 1049: 'BuildingWasLayer',
  1004: 'OrganismLayer', 1010: 'UnitLayer', 1026: 'EntityLayer',
  1118: 'EntityLayerLT25', 1006: 'ShowHiLayer', 1007: 'MiscDisplayLayer',
  1020: 'DamageLayer', 1021: 'PathConnectionLayer', 1030: 'PathLinkageLayer',
  1028: 'AIZoneLayer', 1029: 'AIInfoLayer', 1043: 'WallOwnerLayer',
  1103: 'unitDeathHeatMap', 1104: 'TileMap1104',
  1105: 'PathfindingCostTileMap', 1041: 'moats', 1083: 'pitchDitches',
};

const FELDER = 80400;   // Felder einer Karte: die Raute im 400x400-Rahmen

function findeVerzeichnis(buf) {
  for (let o = 0; o + 4 <= buf.length; o++) if (buf.readUInt32LE(o) === 1001) return o;
  throw new Error('kein Abschnittsverzeichnis gefunden');
}

function leseAbschnitte(buf) {
  const dir = findeVerzeichnis(buf);
  const basis = dir + 1804;
  const abschnitte = [];
  for (let i = 0; i < 150; i++) {
    const id = buf.readUInt32LE(dir + i * 4);
    if (!id) continue;
    const o = basis + buf.readUInt32LE(dir + 1200 + i * 4);
    if (o + 12 > buf.length) continue;
    abschnitte.push({
      id, name: ABSCHNITTE[id] || null, platz: i,
      benutzt: buf.readUInt32LE(dir + 600 + i * 4),
      dateiOffset: o,
      entpackt: buf.readUInt32LE(o), gepackt: buf.readUInt32LE(o + 4),
    });
  }
  return { verzeichnis: dir, basis, abschnitte, buf };
}

function abschnittsDaten(k, ab) {
  const roh = k.buf.subarray(ab.dateiOffset + 12, ab.dateiOffset + 12 + ab.gepackt);
  const out = ab.gepackt === ab.entpackt ? Buffer.from(roh) : blast(roh);
  if (out.length !== ab.entpackt)
    throw new Error(`Abschnitt ${ab.id}: ${out.length} statt ${ab.entpackt} Byte`);
  return out;
}

// Der GfxLayer: je Feld eine Bildnummer ueber alle gm-Dateien hinweg
function leseGfxSchicht(buf) {
  const k = leseAbschnitte(buf);
  const ab = k.abschnitte.find(a => a.id === 1001);
  if (!ab || ab.entpackt !== FELDER * 2) throw new Error('kein GfxLayer (1001) in dieser Karte');
  const d = abschnittsDaten(k, ab);
  const werte = new Uint16Array(FELDER);
  for (let i = 0; i < FELDER; i++) werte[i] = d.readUInt16LE(i * 2);
  return werte;
}

// ---------------------------------------------------------------------------
// Das Rautengitter: Kachelnummer <-> Spalte/Zeile im 400x400-Rahmen
// Zeile y traegt 2*(y+1) Felder fuer y <= 199, darunter 800-2*y.
function addX(y) {
  return y <= 199 ? y * y + 2 * y - 199 : 40200 + 400 * (y - 200) - (y - 200) * (y - 200);
}
function zeilenBereich(y) { return y <= 199 ? [199 - y, 200 + y] : [y - 200, 599 - y]; }
function kachelNummer(x, y) {
  const [a, b] = zeilenBereich(y);
  return (x < a || x > b) ? -1 : addX(y) + x;
}
function* alleFelder() {
  for (let y = 0; y < 400; y++) { const [a, b] = zeilenBereich(y); for (let x = a; x <= b; x++) yield [x, y, addX(y) + x]; }
}
// Der Punkt der Vorschau zu einem Feld - nur die Felder mit ungeradem x+y
function vorschauPunkt(x, y) {
  if (((x + y) & 1) === 0) return null;
  const px = (x - y + 199) / 2, py = (x + y - 199) / 2;
  return (px < 0 || py < 0 || px > 199 || py > 199) ? null : [px, py];
}
// Die Lage eines Feldes im schraegen Bild: eine Kachel ist 30 x 16 Punkte
function bildOrt(x, y) { return [15 * (x - y), 8 * (x + y)]; }

module.exports = { leseVorschau, vorschauAlsPng, pngAus, VORSCHAU_KANTE,
  ABSCHNITTE, FELDER, leseAbschnitte, abschnittsDaten, leseGfxSchicht,
  addX, zeilenBereich, kachelNummer, alleFelder, vorschauPunkt, bildOrt };

