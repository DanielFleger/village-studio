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

module.exports = { leseVorschau, vorschauAlsPng, pngAus, VORSCHAU_KANTE };
