// .gm1 lesen - die Bildersammlungen von Stronghold.
//
// Aufbau (aus dem Stronghold-Wiki und der Umsetzung von LordVonAdel,
// an echten Dateien nachgemessen):
//   0..87    Kopf, 22 x u32. Darin: @12 Anzahl Bilder, @20 Datenart, @80 Datengroesse
//   88       Farbtafeln: 10 Tafeln zu je 256 Farben, je 2 Byte (RGB mit 5 Bit)
//   +5120    je Bild ein Offset (u32)
//            je Bild eine Groesse (u32)
//            je Bild ein Kopf zu 16 Byte
//            danach die Bilddaten
//
// Datenarten: 1 Oberflaeche, 2 Bewegtbilder, 3 Gebaeude und Kacheln,
//             4 Schrift, 5 ungepackt, 6 gepackt.
//
// Gebaeude (Art 3) bestehen aus zwei Teilen: einem Boden aus Rauten zu 30x16
// Punkten, ungepackt und Punkt fuer Punkt abgelegt, und darueber einem
// TGX-gepackten Aufbau. Die fremde Umsetzung nennt diesen Zweig ausdruecklich
// ungetestet - deshalb ist hier alles am echten Bild gegengeprueft.

const zlib = require('zlib');

const KOPF = 88;
const TAFELN = 10, FARBEN = 256;
const KACHEL_B = 30, KACHEL_H = 16;
// So viele Punkte stehen in jeder Zeile einer Rautenkachel
const ZEILE = [2, 6, 10, 14, 18, 22, 26, 30, 30, 26, 22, 18, 14, 10, 6, 2];

const ART = {
  1: 'Oberfläche', 2: 'Bewegtbild', 3: 'Gebäude und Kacheln',
  4: 'Schrift', 5: 'ungepackt', 6: 'gepackt', 7: 'unbekannt (7)',
};

function farbe(w) {
  // 15 Bit: 0RRRRRGGGGGBBBBB
  return [((w >> 10) & 31) * 255 / 31 | 0, ((w >> 5) & 31) * 255 / 31 | 0, (w & 31) * 255 / 31 | 0];
}

function leseGm1(buf) {
  const anzahl = buf.readUInt32LE(12);
  const art = buf.readUInt32LE(20);
  const datenGroesse = buf.readUInt32LE(80);

  const aOffsets = KOPF + TAFELN * FARBEN * 2;
  const aGroessen = aOffsets + anzahl * 4;
  const aKoepfe = aGroessen + anzahl * 4;
  const aBilder = aKoepfe + anzahl * 16;

  const tafeln = [];
  for (let t = 0; t < TAFELN; t++) {
    const tafel = [];
    for (let f = 0; f < FARBEN; f++) tafel.push(farbe(buf.readUInt16LE(KOPF + t * 512 + f * 2)));
    tafeln.push(tafel);
  }

  const bilder = [];
  for (let i = 0; i < anzahl; i++) {
    const k = aKoepfe + i * 16;
    bilder.push({
      nr: i,
      offset: buf.readUInt32LE(aOffsets + i * 4),
      groesse: buf.readUInt32LE(aGroessen + i * 4),
      breite: buf.readUInt16LE(k),
      hoehe: buf.readUInt16LE(k + 2),
      versatzX: buf.readUInt16LE(k + 4),
      versatzY: buf.readUInt16LE(k + 6),
      teil: buf.readUInt8(k + 8),
      teile: buf.readUInt8(k + 9),
      kachelVersatz: buf.readUInt16LE(k + 10),
      richtung: buf.readUInt8(k + 12),
      seitenVersatz: buf.readUInt8(k + 13),
      bauBreite: buf.readUInt8(k + 14),
      tafel: buf.readUInt8(k + 15),
    });
  }

  return { art, artName: ART[art] || String(art), anzahl, datenGroesse, tafeln, bilder, aBilder, buf };
}

// Ein TGX-Strom in eine RGBA-Fläche. Ohne Farbtafel sind Farben 2 Byte lang,
// mit Farbtafel 1 Byte als Nummer darin.
function tgxNachRgba(daten, breite, hoehe, tafel) {
  const bild = Buffer.alloc(breite * hoehe * 4, 0);
  const setze = (x, y, rgb) => {
    if (x < 0 || y < 0 || x >= breite || y >= hoehe) return;
    const i = (y * breite + x) * 4;
    bild[i] = rgb[0]; bild[i + 1] = rgb[1]; bild[i + 2] = rgb[2]; bild[i + 3] = 255;
  };

  let o = 0, x = 0, y = 0;
  while (o < daten.length) {
    const marke = daten[o++];
    const art = marke & 0xE0;
    const laenge = (marke & 0x1F) + 1;
    if (art === 0x00) {                       // Punkte am Stück
      for (let i = 0; i < laenge; i++) {
        if (tafel) { setze(x, y, tafel[daten[o]]); o += 1; }
        else { if (o + 1 >= daten.length) return bild; setze(x, y, farbe(daten.readUInt16LE(o))); o += 2; }
        x++;
      }
    } else if (art === 0x80) {                // Zeilenende
      y++; x = 0;
    } else if (art === 0x40) {                // ein Punkt, wiederholt
      let rgb;
      if (tafel) { rgb = tafel[daten[o]]; o += 1; }
      else { if (o + 1 >= daten.length) return bild; rgb = farbe(daten.readUInt16LE(o)); o += 2; }
      for (let i = 0; i < laenge; i++) { setze(x, y, rgb); x++; }
    } else if (art === 0x20) {                // durchsichtig
      x += laenge;
    } else {
      break;                                   // unbekannte Marke: hier ist Schluss
    }
    if (y >= hoehe) break;
  }
  return bild;
}

// Eine Rautenkachel: 512 Byte, Punkt fuer Punkt, Zeilenlaengen nach ZEILE
function kachelNachRgba(daten) {
  const bild = Buffer.alloc(KACHEL_B * KACHEL_H * 4, 0);
  let i = 0;
  for (let y = 0; y < ZEILE.length; y++) {
    const n = ZEILE[y];
    for (let s = 0; s < n; s++) {
      const x = 15 + s - n / 2;
      if (i * 2 + 1 >= daten.length) return bild;
      const rgb = farbe(daten.readUInt16LE(i * 2));
      const p = ((x | 0) + y * KACHEL_B) * 4;
      bild[p] = rgb[0]; bild[p + 1] = rgb[1]; bild[p + 2] = rgb[2]; bild[p + 3] = 255;
      i++;
    }
  }
  return bild;
}

// Ein Eintrag der Art 3: erst die Rautenkacheln, darueber der TGX-Aufbau.
// Die Kacheln liegen versetzt wie ein Schachbrett aus Rauten.
function gebaeudeNachRgba(g, eintrag) {
  const roh = g.buf.subarray(g.aBilder + eintrag.offset, g.aBilder + eintrag.offset + eintrag.groesse);
  const breite = eintrag.breite, hoehe = eintrag.hoehe;
  const bild = Buffer.alloc(breite * hoehe * 4, 0);

  const kachelnJeSeite = Math.max(1, Math.round(breite / KACHEL_B));
  const kachelZahl = kachelnJeSeite * kachelnJeSeite;
  const kachelBytes = kachelZahl * 512;

  // Rauten unten einsetzen
  if (roh.length >= kachelBytes) {
    let nr = 0;
    for (let r = 0; r < kachelnJeSeite; r++) {
      for (let s = 0; s < kachelnJeSeite; s++) {
        const k = kachelNachRgba(roh.subarray(nr * 512, nr * 512 + 512));
        // Rautengitter: nach rechts halbe Breite, nach unten halbe Hoehe
        const bx = (s - r) * (KACHEL_B / 2) + (breite - KACHEL_B) / 2;
        const by = hoehe - (kachelnJeSeite + 1) * (KACHEL_H / 2) + (s + r) * (KACHEL_H / 2);
        for (let y = 0; y < KACHEL_H; y++) for (let x = 0; x < KACHEL_B; x++) {
          const q = (y * KACHEL_B + x) * 4;
          if (!k[q + 3]) continue;
          const zx = (bx | 0) + x, zy = (by | 0) + y;
          if (zx < 0 || zy < 0 || zx >= breite || zy >= hoehe) continue;
          const p = (zy * breite + zx) * 4;
          bild[p] = k[q]; bild[p + 1] = k[q + 1]; bild[p + 2] = k[q + 2]; bild[p + 3] = 255;
        }
        nr++;
      }
    }
  }

  // Aufbau darueber
  const rest = roh.subarray(Math.min(kachelBytes, roh.length));
  if (rest.length > 2) {
    const oben = tgxNachRgba(rest, breite, hoehe, null);
    for (let i = 0; i < breite * hoehe; i++) {
      if (!oben[i * 4 + 3]) continue;
      bild[i * 4] = oben[i * 4]; bild[i * 4 + 1] = oben[i * 4 + 1];
      bild[i * 4 + 2] = oben[i * 4 + 2]; bild[i * 4 + 3] = 255;
    }
  }
  return { breite, hoehe, rgba: bild };
}

// Ein einzelnes Bild holen, je nach Datenart
function bildVon(g, i) {
  const e = g.bilder[i];
  const roh = g.buf.subarray(g.aBilder + e.offset, g.aBilder + e.offset + e.groesse);
  if (g.art === 3) return gebaeudeNachRgba(g, e);
  const tafel = g.art === 2 ? g.tafeln[e.tafel] : null;
  return { breite: e.breite, hoehe: e.hoehe, rgba: tgxNachRgba(roh, e.breite, e.hoehe, tafel) };
}

// ---- PNG mit Durchsichtigkeit, ohne Fremdpaket ----
let crcTafel = null;
function crc32(b) {
  if (!crcTafel) {
    crcTafel = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); crcTafel[n] = c; }
  }
  let c = -1;
  for (let i = 0; i < b.length; i++) c = crcTafel[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
  return c ^ -1;
}

function pngRgba(breite, hoehe, rgba) {
  const zeilen = Buffer.alloc(hoehe * (1 + breite * 4));
  for (let y = 0; y < hoehe; y++) {
    zeilen[y * (1 + breite * 4)] = 0;
    rgba.copy(zeilen, y * (1 + breite * 4) + 1, y * breite * 4, (y + 1) * breite * 4);
  }
  const stueck = (typ, inhalt) => {
    const l = Buffer.alloc(4); l.writeUInt32BE(inhalt.length, 0);
    const k = Buffer.concat([Buffer.from(typ, 'ascii'), inhalt]);
    const c = Buffer.alloc(4); c.writeUInt32BE(crc32(k) >>> 0, 0);
    return Buffer.concat([l, k, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(breite, 0); ihdr.writeUInt32BE(hoehe, 4);
  ihdr[8] = 8; ihdr[9] = 6;                       // 8 Bit, Echtfarbe mit Alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    stueck('IHDR', ihdr),
    stueck('IDAT', zlib.deflateSync(zeilen, { level: 9 })),
    stueck('IEND', Buffer.alloc(0)),
  ]);
}

// ---- Ein ganzes Gebaeude ----
// Ein Eintrag ist immer genau EINE Kachel breit (30 Punkte). Ein Gebaeude
// besteht aus `teile` Eintraegen, und `teile` ist stets eine Quadratzahl:
// teile = n*n bei einer Grundflaeche von n x n Kacheln. Gegenprobe an
// tile_churches: 36, 81 und 169 - also 6x6, 9x9 und 13x13, und genau so
// stehen Kapelle, Kirche und Kathedrale in der Gebaeudetabelle.
//
// versatzX und versatzY sind KEINE Lage im Gebaeude, sondern Punkte auf einer
// gemeinsamen Flaeche der ganzen Datei - je Gebaeude muss der kleinste Wert
// abgezogen werden.
//
// OFFEN: der senkrechte Versatz zwischen Boden und Aufbau stimmt noch nicht,
// die Daecher schweben ueber ihrem Grundriss.

const PUFFER = 260;   // so hoch wird ein Aufbau hoechstens

function ganzesGebaeude(g, startNr) {
  const s = g.bilder[startNr];
  const teile = [];
  for (let k = 0; k < s.teile; k++) { const b = g.bilder[startNr + k]; if (b) teile.push(b); }

  // Aufbauten vorher entpacken, um die wirkliche Hoehe zu kennen
  const aufbau = new Map();
  let hoechster = 0;
  for (const b of teile) {
    const roh = g.buf.subarray(g.aBilder + b.offset, g.aBilder + b.offset + b.groesse);
    if (roh.length <= 520) continue;
    const bild = tgxNachRgba(roh.subarray(512), 30, PUFFER, null);
    let unten = -1, oben = PUFFER;
    for (let y = 0; y < PUFFER; y++) for (let x = 0; x < 30; x++)
      if (bild[(y * 30 + x) * 4 + 3]) { if (y > unten) unten = y; if (y < oben) oben = y; }
    if (unten < 0) continue;
    aufbau.set(b.nr, { bild, unten, hoehe: unten - oben + 1 });
    if (unten - oben + 1 > hoechster) hoechster = unten - oben + 1;
  }

  const minX = Math.min(...teile.map(b => b.versatzX));
  const minY = Math.min(...teile.map(b => b.versatzY));
  const B = Math.max(...teile.map(b => b.versatzX)) - minX + 30;
  const kopf = Math.max(0, hoechster - 16);
  const H = Math.max(...teile.map(b => b.versatzY)) - minY + 16 + kopf;
  const bild = Buffer.alloc(B * H * 4, 0);

  teile.sort((a, b) => (a.versatzY - b.versatzY) || (a.versatzX - b.versatzX));
  for (const b of teile) {
    const roh = g.buf.subarray(g.aBilder + b.offset, g.aBilder + b.offset + b.groesse);
    const bx = b.versatzX - minX, by = b.versatzY - minY + kopf;
    const k = kachelNachRgba(roh.subarray(0, 512));
    for (let y = 0; y < 16; y++) for (let x = 0; x < 30; x++) {
      const q = (y * 30 + x) * 4; if (!k[q + 3]) continue;
      const zx = bx + x, zy = by + y; if (zx < 0 || zy < 0 || zx >= B || zy >= H) continue;
      const p = (zy * B + zx) * 4;
      bild[p] = k[q]; bild[p + 1] = k[q + 1]; bild[p + 2] = k[q + 2]; bild[p + 3] = 255;
    }
    const a = aufbau.get(b.nr);
    if (!a) continue;
    // Der Aufbau steht auf seiner Kachel: seine unterste Zeile trifft die Kachelunterkante
    const versatz = by + 15 - a.unten;
    for (let y = 0; y < PUFFER; y++) for (let x = 0; x < 30; x++) {
      const q = (y * 30 + x) * 4; if (!a.bild[q + 3]) continue;
      const zx = bx + x, zy = versatz + y; if (zx < 0 || zy < 0 || zx >= B || zy >= H) continue;
      const p = (zy * B + zx) * 4;
      bild[p] = a.bild[q]; bild[p + 1] = a.bild[q + 1]; bild[p + 2] = a.bild[q + 2]; bild[p + 3] = 255;
    }
  }
  return { breite: B, hoehe: H, rgba: bild, kacheln: Math.sqrt(s.teile) };
}

module.exports = { leseGm1, bildVon, ganzesGebaeude, tgxNachRgba, kachelNachRgba, pngRgba, ART };
