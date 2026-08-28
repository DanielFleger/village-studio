// PKWare-DCL-"Implode"-Packer, Gegenstueck zu blast.js.
//
// Warum so schlicht: das Format erlaubt einen Strom, der nur aus Literalen
// besteht - also ohne Rueckverweise. Der ist gueltig und wird von jedem
// Entpacker gelesen, auch vom Spiel. Er spart kein Byte, aber er erhaelt die
// Gepackt-Kennung der Datei, und genau darauf kommt es an: in allen 129
// AIV-Dateien auf diesem Rechner sind die Abschnitte 2004, 2005, 2007, 2008
// und 2013 gepackt, kein einziger roh. Wer sie roh zurueckschreibt, liefert
// dem Spiel etwas, das es so nie gesehen hat.
//
// Spaeter kann hier echte Kompression dazu, ohne dass sich sonst etwas aendert.

const MAXBITS = 13;

// Codelaengen der Laengen- und Abstands-Tabelle, gleiche Quelle wie in blast.js
const LENLEN = Uint8Array.from([2, 35, 36, 53, 38, 23]);
const DISTLEN = Uint8Array.from([2, 20, 53, 230, 247, 151, 248]);

const BASE = [3, 2, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24, 40, 72, 136, 264];
const EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];

const DICT = 6;              // Woerterbuch 4096
const FENSTER = 1 << (DICT + 6);
const MIN_LAENGE = 3;
const MAX_LAENGE = 518;

// Baut aus der Kurzschreibweise die kanonischen Codes: Symbol -> {laenge, code}
function baueCodes(rep) {
  const count = new Array(MAXBITS + 1).fill(0);
  const laenge = [];
  let sym = 0;
  for (const b of rep) {
    const anzahl = (b >> 4) + 1;
    const len = b & 15;
    for (let i = 0; i < anzahl; i++) { laenge[sym++] = len; count[len]++; }
  }

  // first[len] wie im Entpacker: first(1) = 0, first(len+1) = (first(len) + count[len]) << 1
  const first = new Array(MAXBITS + 2).fill(0);
  for (let len = 1; len <= MAXBITS; len++) first[len + 1] = (first[len] + count[len]) << 1;

  // Innerhalb einer Laenge zaehlen die Symbole in der Reihenfolge ihres Auftretens
  const rang = new Array(MAXBITS + 1).fill(0);
  const codes = [];
  for (let len = 1; len <= MAXBITS; len++)
    for (let s = 0; s < laenge.length; s++)
      if (laenge[s] === len) codes[s] = { laenge: len, code: first[len] + rang[len]++ };
  return codes;
}

const LEN_CODES = baueCodes(LENLEN);
const DIST_CODES = baueCodes(DISTLEN);

// Zu einer Laenge das passende Laengen-Symbol samt Zusatzbits.
// Achtung: BASE ist nicht aufsteigend - Symbol 0 steht fuer 3, Symbol 1 fuer 2.
const LAENGE_ZU_SYM = (() => {
  const t = new Int16Array(MAX_LAENGE + 1).fill(-1);
  for (let sym = 0; sym < 16; sym++)
    for (let k = 0; k < (1 << EXTRA[sym]); k++) {
      const l = BASE[sym] + k;
      if (l <= MAX_LAENGE && t[l] < 0) t[l] = sym;
    }
  return t;
})();

class Bitstrom {
  constructor() { this.bytes = []; this.puffer = 0; this.anzahl = 0; }
  // Der Entpacker liest von unten nach oben, also wird auch so geschrieben
  schreibe(wert, breite) {
    for (let i = 0; i < breite; i++) {
      this.puffer |= ((wert >> i) & 1) << this.anzahl;
      if (++this.anzahl === 8) { this.bytes.push(this.puffer); this.puffer = 0; this.anzahl = 0; }
    }
  }
  // Huffman-Codes gehen von oben nach unten und sind invertiert
  schreibeCode(eintrag) {
    for (let i = eintrag.laenge - 1; i >= 0; i--)
      this.schreibe(((eintrag.code >> i) & 1) ^ 1, 1);
  }
  fertig() {
    if (this.anzahl > 0) this.bytes.push(this.puffer);
    return Buffer.from(this.bytes);
  }
}

// Packt Daten als gueltigen Implode-Strom.
// Literale bleiben unkodiert (Kennung 0), Wiederholungen werden als
// Rueckverweis geschrieben. Die Suche ist geradeaus: Hash ueber drei Bytes,
// laengste Uebereinstimmung im Fenster gewinnt. Das reicht - AIV-Gitter
// bestehen zum grossen Teil aus langen gleichen Strecken.
function implode(daten) {
  const s = new Bitstrom();
  s.schreibe(0, 8);          // Literale unkodiert
  s.schreibe(DICT, 8);       // Woerterbuch 4096
  const n = daten.length;

  const KOEPFE = 1 << 16;
  const kopf = new Int32Array(KOEPFE).fill(-1);
  const kette = new Int32Array(Math.max(1, n)).fill(-1);
  const hash = i => ((daten[i] << 8) ^ (daten[i + 1] << 4) ^ daten[i + 2]) & (KOEPFE - 1);

  const literal = b => { s.schreibe(0, 1); s.schreibe(b, 8); };

  let i = 0;
  while (i < n) {
    let besteLaenge = 0, besterAbstand = 0;
    if (i + MIN_LAENGE <= n) {
      const grenze = Math.max(0, i - FENSTER);
      let k = kopf[hash(i)], versuche = 64;
      while (k >= grenze && versuche-- > 0) {
        let l = 0;
        const max = Math.min(MAX_LAENGE, n - i);
        while (l < max && daten[k + l] === daten[i + l]) l++;
        if (l > besteLaenge) { besteLaenge = l; besterAbstand = i - k; if (l === max) break; }
        k = kette[k];
      }
    }

    if (besteLaenge >= MIN_LAENGE) {
      const sym = LAENGE_ZU_SYM[besteLaenge];
      const d = besterAbstand - 1;
      const unten = besteLaenge === 2 ? 2 : DICT;
      s.schreibe(1, 1);
      s.schreibeCode(LEN_CODES[sym]);
      if (EXTRA[sym]) s.schreibe(besteLaenge - BASE[sym], EXTRA[sym]);
      s.schreibeCode(DIST_CODES[d >>> unten]);
      s.schreibe(d & ((1 << unten) - 1), unten);
    } else {
      literal(daten[i]);
      besteLaenge = 1;
    }

    // jede uebersprungene Stelle muss in die Kette, sonst findet die Suche sie nie
    for (let k = 0; k < besteLaenge; k++) {
      const j = i + k;
      if (j + MIN_LAENGE <= n) { const h = hash(j); kette[j] = kopf[h]; kopf[h] = j; }
    }
    i += besteLaenge;
  }

  s.schreibe(1, 1);          // 1 = Laenge folgt
  s.schreibeCode(LEN_CODES[15]);
  s.schreibe(255, 8);        // 264 + 255 = 519 = Endmarke
  return s.fertig();
}

// CRC32 wie in zlib/binascii, ohne Fremdpaket
let CRC_TABELLE = null;
function crc32(buf) {
  if (!CRC_TABELLE) {
    CRC_TABELLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      CRC_TABELLE[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABELLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// Ein kompletter gepackter Abschnitt: 12 Byte Kopf, dann der Strom
function packeAbschnitt(daten) {
  const strom = implode(daten);
  const kopf = Buffer.alloc(12);
  kopf.writeUInt32LE(daten.length, 0);
  kopf.writeUInt32LE(strom.length, 4);
  kopf.writeUInt32LE(crc32(daten), 8);
  return Buffer.concat([kopf, strom]);
}

module.exports = { implode, packeAbschnitt, crc32 };
