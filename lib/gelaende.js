// Das echte Gelaende einer .map zeichnen.
//
// Die kurze Fassung: Abschnitt 1001 der Karte ist der GfxLayer des Spiels -
// je Feld zwei Byte, und darin steht schon die fertige Bildnummer. Nicht ein
// Gelaendetyp, aus dem man erst ein Bild suchen muesste, sondern die Nummer
// selbst. Sie zaehlt ueber ALLE gm-Dateien hinweg durch, in der Reihenfolge,
// in der das Spiel sie laedt.
//
// Belegt am Programm:
//   * DAT_MapSectionAddressArray (exe 0x00b92a58) sagt zu Abschnitt 1001 die
//     Zieladresse 0x01ae5688. DAT_TileMapState liegt bei 0x01a93208, GfxLayer
//     bei +0x52480 - zusammen genau 0x01ae5688.
//   * loadGmFiles (0x00455c60) laedt die Namensliste ab 0xb601c0 (Schrittweite
//     1000 Byte) der Reihe nach, setzt GMTotalPicturesProcessed[gmID] auf den
//     bisherigen Zaehler und zaehlt danach die Bilder der Datei dazu. Der
//     Zaehler beginnt bei 1, nicht bei 0.
//   * renderGM (0x00455300) greift auf Platz GMTotalPicturesProcessed[gmID]
//     + bildNr - 1 zu. Also: Platz (0-basiert) = Wert aus 1001 minus 1.
//
// Gemessen und NICHT aus dem Programm hergeleitet: ab Listenplatz 149 liegt
// der Zaehler des Spiels um 21 Bilder unter der Summe, die man aus der
// exe-Liste und den Dateikoepfen ausrechnet. Ohne diese Verschiebung wird das
// Meer zu Farbrauschen. Woher die 21 kommen, ist offen - die Zahl ist an
// 11.497.200 Feldern aus 143 Karten angepasst (bester Wert mit Abstand).

const fs = require('fs');
const path = require('path');
const { leseGm1, tgxNachRgba, kachelNachRgba, pngRgba } = require('./gm1.js');
const { leseGfxSchicht, alleFelder, bildOrt } = require('./karte.js');

const NAMENSLISTE_VA = 0xb601c0;   // Anfang der Namensliste in der exe
const SCHRITT = 1000;              // Byte je Eintrag
const VERSATZ_AB = 149, VERSATZ = 21;

const KACHEL_B = 30, KACHEL_H = 16;

// --- die exe lesen ---------------------------------------------------------
function virtuellNachDatei(buf) {
  const pe = buf.readUInt32LE(0x3c);
  const anzahl = buf.readUInt16LE(pe + 6);
  const optGroesse = buf.readUInt16LE(pe + 20);
  const basis = buf.readUInt32LE(pe + 24 + 28);
  const tabelle = pe + 24 + optGroesse;
  const teile = [];
  for (let i = 0; i < anzahl; i++) {
    const o = tabelle + i * 40;
    teile.push({ vGroesse: buf.readUInt32LE(o + 8), vAdresse: buf.readUInt32LE(o + 12),
                 rGroesse: buf.readUInt32LE(o + 16), rAdresse: buf.readUInt32LE(o + 20) });
  }
  return (va) => {
    const r = va - basis;
    for (const t of teile) if (r >= t.vAdresse && r < t.vAdresse + t.rGroesse) return t.rAdresse + (r - t.vAdresse);
    return -1;
  };
}

// Die Ladereihenfolge der gm-Dateien samt Bildzahl und Startplatz
function leseBildvorrat(spielOrdner) {
  const exe = fs.readFileSync(path.join(spielOrdner, 'Stronghold Crusader.exe'));
  const nachDatei = virtuellNachDatei(exe);
  const start = nachDatei(NAMENSLISTE_VA);
  if (start < 0) throw new Error('Namensliste nicht in der exe gefunden');

  const dateien = [];
  let summe = 0;
  for (let i = 0; i < 260; i++) {
    const o = start + i * SCHRITT;
    if (o + 64 > exe.length) break;
    const name = exe.toString('ascii', o, o + 64).replace(/\0.*$/s, '');
    if (!/^[\w\-. ]+$/.test(name)) break;
    if (name === 'null') break;                      // loadGmFiles bricht hier ab
    let anzahl = 0, art = null;
    const datei = path.join(spielOrdner, 'gm', name + '.gm1');
    if (fs.existsSync(datei)) {
      const fd = fs.openSync(datei, 'r');
      const kopf = Buffer.alloc(88);
      fs.readSync(fd, kopf, 0, 88, 0);
      fs.closeSync(fd);
      anzahl = kopf.readUInt32LE(12); art = kopf.readUInt32LE(20);
    }
    dateien.push({ platz: i, gmID: i + 1, name, art, anzahl,
                   von: summe - (i >= VERSATZ_AB ? VERSATZ : 0) });
    summe += anzahl;
  }
  const mitBildern = dateien.filter(d => d.anzahl > 0).sort((a, b) => a.von - b.von);
  return { dateien, mitBildern, gesamt: summe };
}

// Bildnummer aus dem GfxLayer -> Datei und Nummer darin
function bildVonWert(vorrat, wert) {
  if (wert <= 0) return null;
  const p = wert - 1;
  const a = vorrat.mitBildern;
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1, t = a[m];
    if (p < t.von) hi = m - 1;
    else if (p >= t.von + t.anzahl) lo = m + 1;
    else return { datei: t.name, nr: p - t.von, art: t.art };
  }
  return null;
}

// --- zeichnen --------------------------------------------------------------
function gm1Vorrat(spielOrdner) {
  const gehalten = new Map();
  return (name) => {
    if (!gehalten.has(name)) gehalten.set(name, leseGm1(fs.readFileSync(path.join(spielOrdner, 'gm', name + '.gm1'))));
    return gehalten.get(name);
  };
}

// Ein Ausschnitt in Vorschau-Koordinaten: links oben (px0,py0), kante x kante
// Felder. Ein Feld ist 30 Punkte breit und 16 hoch; das Ergebnis ist also
// kante*30 x kante*16 Punkte gross und deckt genau denselben Ausschnitt ab
// wie das gleich grosse Stueck der Vorschau.
function zeichneGelaende(spielOrdner, kartenPuffer, px0, py0, kante) {
  const vorrat = leseBildvorrat(spielOrdner);
  const holeGm1 = gm1Vorrat(spielOrdner);
  const gfx = leseGfxSchicht(kartenPuffer);

  const B = kante * KACHEL_B, H = kante * KACHEL_H;
  const X0 = 30 * px0 - 2985, Y0 = 16 * py0 + 1592;   // aus bildOrt hergeleitet
  const bild = Buffer.alloc(B * H * 4, 0);
  const setze = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= B || y >= H) return;
    const i = (y * B + x) * 4;
    bild[i] = r; bild[i + 1] = g; bild[i + 2] = b; bild[i + 3] = 255;
  };

  // Alles einsammeln, was in den Ausschnitt ragt - hohe Felsen stehen weit
  // ueber ihrer eigenen Kachel, darum oben grosszuegig
  const liste = [];
  for (const [x, y, kachel] of alleFelder()) {
    const [ox, oy] = bildOrt(x, y);
    const sx = ox - X0, sy = oy - Y0;
    if (sx > B || sx < -KACHEL_B - 10 || sy > H || sy < -300) continue;
    liste.push([kachel, sx, sy]);
  }
  liste.sort((a, b) => a[2] - b[2]);                  // von hinten nach vorn

  let gezeichnet = 0, ohneBild = 0;
  const jeDatei = new Map();
  for (const [kachel, sx, sy] of liste) {
    const z = bildVonWert(vorrat, gfx[kachel]);
    if (!z) { ohneBild++; continue; }
    const g = holeGm1(z.datei);
    const e = g.bilder[z.nr];
    if (!e) { ohneBild++; continue; }
    jeDatei.set(z.datei, (jeDatei.get(z.datei) || 0) + 1);
    const roh = g.buf.subarray(g.aBilder + e.offset, g.aBilder + e.offset + e.groesse);

    // die Rautenkachel selbst
    const k = kachelNachRgba(roh.subarray(0, 512));
    for (let yy = 0; yy < KACHEL_H; yy++) for (let xx = 0; xx < KACHEL_B; xx++) {
      const q = (yy * KACHEL_B + xx) * 4;
      if (k[q + 3]) setze(sx + xx, sy + yy, k[q], k[q + 1], k[q + 2]);
    }
    // was darueber steht (Fels, Busch, Baum): kachelVersatz hebt es an
    if (roh.length > 512) {
      const hoch = e.kachelVersatz || 0;
      const auf = tgxNachRgba(roh.subarray(512), KACHEL_B, e.hoehe, null);
      const rechts = e.richtung === 3 ? 14 : 0;
      for (let yy = 0; yy < e.hoehe; yy++) for (let xx = 0; xx < KACHEL_B; xx++) {
        const q = (yy * KACHEL_B + xx) * 4;
        if (auf[q + 3]) setze(sx + rechts + xx, sy - hoch + yy, auf[q], auf[q + 1], auf[q + 2]);
      }
    }
    gezeichnet++;
  }
  return { breite: B, hoehe: H, rgba: bild, gezeichnet, ohneBild, jeDatei };
}

module.exports = { leseBildvorrat, bildVonWert, zeichneGelaende, pngRgba,
                   VERSATZ_AB, VERSATZ, KACHEL_B, KACHEL_H };
