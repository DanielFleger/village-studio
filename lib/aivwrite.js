// AIV zurueckschreiben.
//
// Zwei Regeln, aus den Dateien selbst abgeleitet, nicht geraten:
//   1. Die Gepackt-Kennung bleibt genau so, wie sie im Original stand.
//      In allen 129 AIV-Dateien auf diesem Rechner - einschliesslich der 111
//      Originale des Spiels - sind 2004, 2005, 2007, 2008 und 2013 gepackt und
//      alle anderen roh. Kein einziges Gegenbeispiel. Wer davon abweicht,
//      liefert dem Spiel etwas, das es so noch nie gelesen hat.
//   2. Ein Abschnitt, der nicht angefasst wurde, wird Byte fuer Byte aus dem
//      Original uebernommen. Nichts neu codieren, was niemand geaendert hat.
//
// Nur was wirklich geaendert wurde, wird neu gebaut - und dann, wenn der
// Abschnitt gepackt war, auch wieder gepackt (siehe implode.js).

const { readAiv, GRID } = require('./aiv');
const { packeAbschnitt } = require('./implode');

const DIR_SIZE = 2036;

// Diese Abschnitte sind in allen 129 Originaldateien gepackt, ohne Ausnahme.
// Wird einer davon geaendert, wird er gepackt geschrieben - auch wenn die
// Quelldatei ihn roh enthielt. Solche Dateien gibt es: sie stammen aus einer
// frueheren Fassung dieses Werkzeugs, das faelschlich alles roh abgelegt hat.
const IMMER_GEPACKT = new Set([2004, 2005, 2007, 2008, 2013]);

// Setzt die Datei aus fertigen Abschnittsbloecken zusammen.
// teile[i] = { bytes, uncLen, packed } - bytes sind schon im Endzustand.
function baueDatei(version, ids, teile) {
  const gesamt = teile.reduce((a, t) => a + t.bytes.length, 0);
  const out = Buffer.alloc(DIR_SIZE + gesamt, 0);

  out.writeUInt32LE(DIR_SIZE, 0);
  out.writeUInt32LE(gesamt, 4);
  out.writeUInt32LE(ids.length, 8);
  out.writeUInt32LE(version, 12);

  let off = 0;
  for (let i = 0; i < ids.length; i++) {
    const t = teile[i];
    out.writeUInt32LE(t.uncLen, 32 + i * 4);        // Laenge der Nutzdaten
    out.writeUInt32LE(t.bytes.length, 432 + i * 4); // Laenge in der Datei
    out.writeUInt32LE(ids[i], 832 + i * 4);         // Abschnitts-Nummer
    out.writeUInt32LE(t.packed ? 1 : 0, 1232 + i * 4);
    out.writeUInt32LE(off, 1632 + i * 4);           // Offset
    t.bytes.copy(out, DIR_SIZE + off);
    off += t.bytes.length;
  }
  return out;
}

function gridToBuffer(werte, bytes) {
  const n = GRID * GRID;
  const b = Buffer.alloc(n * bytes);
  for (let i = 0; i < n; i++) {
    const v = werte[i] | 0;
    if (bytes === 1) b.writeUInt8(v & 0xff, i);
    else if (bytes === 2) b.writeUInt16LE(v & 0xffff, i * 2);
    else b.writeInt32LE(v, i * 4);
  }
  return b;
}

// Baut aus Original plus geaenderten Nutzdaten die neue Datei.
// neu: { 2007: Buffer, 2008: Buffer, ... } - nur die wirklich geaenderten.
function baueAus(src, neu) {
  const ids = src.meta.map(m => m.id);
  const teile = ids.map((id, i) => {
    const gepackt = src.meta[i].packed;
    if (!(id in neu)) {
      // unveraendert: Originalbytes uebernehmen
      return { bytes: src.roh[id], uncLen: src.meta[i].uncLen, packed: gepackt };
    }
    const nutz = neu[id];
    return (gepackt || IMMER_GEPACKT.has(id))
      ? { bytes: packeAbschnitt(nutz), uncLen: nutz.length, packed: true }
      : { bytes: nutz, uncLen: nutz.length, packed: false };
  });
  return baueDatei(src.header.version, ids, teile);
}

// Unveraendert zurueckschreiben - der Rundlauf-Test
function writeAiv(buf) {
  return baueAus(readAiv(buf), {});
}

// Aenderungen einarbeiten: Bauten (2007), Bauschritte (2008) mit Anzahl (2009),
// Pausenlaenge (2014).
function writeAivMit(buf, aenderung) {
  const src = readAiv(buf);
  const neu = {};

  if (aenderung.bauten) neu[2007] = gridToBuffer(aenderung.bauten, 2);

  if (aenderung.schritte) {
    neu[2008] = gridToBuffer(aenderung.schritte, 4);
    let max = 0;
    for (const v of aenderung.schritte) if (v > max) max = v;
    const b = Buffer.alloc(4);
    b.writeUInt32LE(max, 0);
    neu[2009] = b;
  }

  if (typeof aenderung.pausenlaenge === 'number' && src.raw[2014]) {
    const b = Buffer.alloc(4);
    b.writeInt32LE(aenderung.pausenlaenge, 0);
    neu[2014] = b;
  }

  return baueAus(src, neu);
}

module.exports = { writeAiv, writeAivMit };
