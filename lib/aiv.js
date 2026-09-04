// AIV lesen (Stronghold Crusader "AI Village")
// Aufbau: 2036 Byte Verzeichnis, danach die Abschnitte.
// Gepackte Abschnitte haben 12 Byte Kopf (unkomprimiert, komprimiert, Prüfsumme)
// und danach einen PKWare-Implode-Strom.

const { blast } = require('./blast');

const DIR_SIZE = 2036;
const GRID = 100;

// Was in welchem Abschnitt steckt (aus dem Sourcehold-Projekt, gegen echte Dateien geprüft)
const SECTIONS = {
  2001: { name: 'Ansicht X', kind: 'u32' },
  2002: { name: 'Ansicht Y', kind: 'u32' },
  2003: { name: 'Zufallswerte', kind: 'raw' },
  2004: { name: 'Kantenlänge je Bau', kind: 'u8grid' },
  2005: { name: 'Lage im Bau (1-9)', kind: 'u8grid' },
  2006: { name: 'Bodenrauschen', kind: 'u8grid' },
  2007: { name: 'Bauten', kind: 'u16grid' },
  2008: { name: 'Bauschritte', kind: 'u32grid' },
  2009: { name: 'Anzahl Schritte', kind: 'u32' },
  2010: { name: 'Zuletzt gewählter Schritt', kind: 'i32' },
  2011: { name: 'Pausen', kind: 'i32array' },
  2012: { name: 'Einheiten, Feuer, Flaggen', kind: 'i32matrix', cols: 10 },
  2013: { name: 'Sonstiges', kind: 'u8grid' },
  2014: { name: 'Pausenlänge', kind: 'i32' },
};

function readAiv(buf) {
  const dirSize = buf.readUInt32LE(0);
  const size = buf.readUInt32LE(4);
  const count = buf.readUInt32LE(8);
  const version = buf.readUInt32LE(12);
  if (dirSize !== DIR_SIZE) throw new Error('Unerwartete Verzeichnisgröße ' + dirSize);
  if (count > 100) throw new Error('Unerwartete Abschnittszahl ' + count);

  const u32at = (base, i) => buf.readUInt32LE(base + i * 4);
  const raw = {};      // entpackte Nutzdaten je Abschnitt
  const roh = {};      // die Originalbytes je Abschnitt, so wie sie in der Datei stehen
  const meta = [];

  for (let i = 0; i < count; i++) {
    const uncLen = u32at(32, i);
    const len = u32at(432, i);
    const id = u32at(832, i);
    const packed = u32at(1232, i);
    const off = u32at(1632, i);
    const slice = buf.subarray(DIR_SIZE + off, DIR_SIZE + off + len);

    let data, note = null;
    if (packed) {
      const hdrUnc = slice.readUInt32LE(0);
      try {
        data = blast(slice.subarray(12));
      } catch (e) {
        data = Buffer.alloc(uncLen);
        note = 'Entpacken fehlgeschlagen: ' + e.message;
      }
      if (!note && data.length !== hdrUnc) note = `Länge ${data.length} statt ${hdrUnc}`;
    } else {
      data = Buffer.from(slice);
    }
    raw[id] = data;
    roh[id] = Buffer.from(slice);
    meta.push({ id, name: (SECTIONS[id] || {}).name || 'unbekannt', packed: !!packed, len, uncLen, ok: !note, note });
  }

  return { header: { size, count, version }, meta, raw, roh };
}

function toGrid(buf, bytes) {
  const n = GRID * GRID;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    if (bytes === 1) out[i] = buf.readUInt8(i);
    else if (bytes === 2) out[i] = buf.readUInt16LE(i * 2);
    else out[i] = buf.readInt32LE(i * 4);
  }
  return out;
}

// Alles, was die Oberfläche braucht, als schlichtes Objekt
function decode(buf) {
  const { header, meta, raw } = readAiv(buf);
  const has = (id, min) => raw[id] && raw[id].length >= min;

  const out = { header, meta, grid: GRID };

  out.bauten = has(2007, GRID * GRID * 2) ? toGrid(raw[2007], 2) : null;
  out.schritte = has(2008, GRID * GRID * 4) ? toGrid(raw[2008], 4) : null;
  out.gruppen = has(2004, GRID * GRID) ? toGrid(raw[2004], 1) : null;
  out.mauern = has(2005, GRID * GRID) ? toGrid(raw[2005], 1) : null;
  out.rauschen = has(2006, GRID * GRID) ? toGrid(raw[2006], 1) : null;
  out.sonstiges = has(2013, GRID * GRID) ? toGrid(raw[2013], 1) : null;

  out.anzahlSchritte = has(2009, 4) ? raw[2009].readUInt32LE(0) : null;
  out.pausenlaenge = has(2014, 4) ? raw[2014].readInt32LE(0) : null;
  out.letzterSchritt = has(2010, 4) ? raw[2010].readInt32LE(0) : null;
  out.ansicht = [has(2001, 4) ? raw[2001].readUInt32LE(0) : null,
                 has(2002, 4) ? raw[2002].readUInt32LE(0) : null];

  if (raw[2011]) {
    const n = Math.floor(raw[2011].length / 4);
    out.pausen = Array.from({ length: n }, (_, i) => raw[2011].readInt32LE(i * 4));
  }
  if (raw[2012]) {
    const cols = 10;
    const rows = Math.floor(raw[2012].length / 4 / cols);
    out.einheiten = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) row.push(raw[2012].readInt32LE((r * cols + c) * 4));
      out.einheiten.push(row);
    }
  }

  // Passen Kantenlaenge (2004) und Lage im Bau (2005) zu den Bauten? Ein Feld,
  // an dem das nicht stimmt, laesst ein Gebaeude in Einzelteile zerfallen -
  // im Werkzeug als eigene Ebene sichtbar.
  if (out.bauten && out.schritte && out.gruppen && out.mauern) {
    const { baueUmrisse, MAUERWERK } = require('./umrisse');
    const soll = baueUmrisse(out.bauten, out.schritte, out.gruppen, out.mauern);
    out.umrissFehler = new Array(GRID * GRID).fill(0);
    out.umrissFehlerZahl = 0;
    for (let i = 0; i < GRID * GRID; i++) {
      const t = out.bauten[i];
      if (!t) continue;
      // Bei Mauerwerk und Kartenrand schwankt die Kantenlaenge in echten
      // Dateien zwischen 0 und 1; die Regel dahinter kennen wir nicht. Beides
      // gilt hier als richtig - sonst meldet die Pruefung staendig Fehler an
      // Originaldateien und wird nutzlos.
      const tolerant = MAUERWERK.has(t) || t === 1;
      const gOk = tolerant ? (out.gruppen[i] === 0 || out.gruppen[i] === 1)
                           : out.gruppen[i] === soll.gruppen[i];
      const uOk = out.mauern[i] === soll.umrisse[i];
      if (!gOk || !uOk) { out.umrissFehler[i] = 1; out.umrissFehlerZahl++; }
    }
  }

  // Statistik über die Bau-Nummern, damit man ohne Namenstabelle etwas sieht
  if (out.bauten) {
    const zaehler = new Map();
    for (const v of out.bauten) if (v !== 0) zaehler.set(v, (zaehler.get(v) || 0) + 1);
    out.bautenStatistik = [...zaehler.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, n]) => ({ id, felder: n }));
  }
  return out;
}

module.exports = { readAiv, decode, GRID, SECTIONS };
