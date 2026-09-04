// Ein ganzes Dorf mit den echten Spielgrafiken zeichnen.
//
// Aufruf:  node _baue_beispieldorf.js <Dorfname> [ziel.png]
//
// Wo ein Bau anfaengt und wie gross er ist, steht schon in der AIV: Abschnitt
// 2005 traegt die Lage im Bauwerk (1 = oben links), 2004 die Kantenlaenge.
// Damit kenne ich Ort und Groesse jedes Baus, ohne die Zuordnung Nummer->Bild
// zu haben.
//
// Die Bildauswahl ist VORLAEUFIG: Zu jeder Bau-Nummer nehme ich ein Bild mit
// passender Grundflaeche, fest gewaehlt ueber die Nummer, damit dasselbe
// Gebaeude im ganzen Dorf gleich aussieht. Es ist also das richtige Format,
// die richtige Groesse und der richtige Ort - aber noch nicht zwingend das
// richtige Gebaeude. Genau das kommt als Naechstes.

const fs = require('fs');
const path = require('path');
const { decode } = require('./lib/aiv');
const { leseGm1, ganzesGebaeude, pngRgba } = require('./lib/gm1');

const SPIEL = 'C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme';
const GM = path.join(SPIEL, 'gm');
const N = 100;
const HALB_B = 16, HALB_H = 8;          // ein Feld: 32 breit, 16 hoch

// ---- Vorrat an Gebaeudebildern, nach Grundflaeche sortiert ----
function sammleBilder() {
  const nach = {};
  for (const datei of ['tile_buildings1', 'tile_buildings2', 'tile_workshops', 'tile_castle', 'tile_churches']) {
    const g = leseGm1(fs.readFileSync(path.join(GM, datei + '.gm1')));
    for (const s of g.bilder.filter(b => b.teil === 0)) {
      let bild;
      try { bild = ganzesGebaeude(g, s.nr); } catch { continue; }
      if (!bild) continue;
      const n = bild.kacheln;
      (nach[n] = nach[n] || []).push({ datei, nr: s.nr, bild });
    }
  }
  return nach;
}

function ankerX(n) { return Math.floor(n / 2) * 30 + (n - 1) - (n % 2 === 0 ? 15 : 0); }

function main() {
  const wunsch = process.argv[2] || 'Emir3';
  const ziel = process.argv[3] || ('beispieldorf_' + wunsch + '.png');

  const village = path.resolve(__dirname, '..', 'Village');
  const orte = [path.join(village, 'villages'), village, path.join(SPIEL, 'aiv')];
  let quelle = null;
  for (const o of orte) {
    let namen; try { namen = fs.readdirSync(o); } catch { continue; }
    const t = namen.find(f => f.toLowerCase() === (wunsch + '.aiv').toLowerCase());
    if (t) { quelle = path.join(o, t); break; }
  }
  if (!quelle) { console.error('Dorf nicht gefunden:', wunsch, '- gesucht in', orte.join(', ')); process.exit(1); }
  console.log('Dorf:', quelle);
  const d = decode(fs.readFileSync(quelle));

  const vorrat = sammleBilder();
  console.log('Bildervorrat nach Grundfläche:',
    Object.keys(vorrat).sort((a, b) => a - b).map(k => k + '×' + k + ': ' + vorrat[k].length).join(', '));

  // ---- Bauten einsammeln: jede Ecke oben links ist ein Bauwerk ----
  const bauten = [];
  const mauern = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x;
    const id = d.bauten[i];
    if (!id || id === 1 || id === 2) continue;          // Kartenrand und Baufläche überspringen
    const kante = d.gruppen ? d.gruppen[i] : 0;
    const lage = d.mauern ? d.mauern[i] : 0;
    if (kante >= 2 && lage === 1) bauten.push({ x, y, n: kante, id });
    else if (kante <= 1) mauern.push({ x, y, id });      // Mauerwerk und Einzelfelder
  }
  console.log('Bauwerke:', bauten.length, ' Einzelfelder (Mauern, Gräben):', mauern.length);

  // ---- Leinwand ----
  const rand = 400;
  const B = (N + N) * HALB_B + 2 * rand;
  const H = (N + N) * HALB_H + 2 * rand;
  const O = B / 2, P = rand;
  const flaeche = Buffer.alloc(B * H * 4, 0);
  const setze = (x, y, r, gr, b) => {
    if (x < 0 || y < 0 || x >= B || y >= H) return;
    const p = (y * B + x) * 4;
    flaeche[p] = r; flaeche[p + 1] = gr; flaeche[p + 2] = b; flaeche[p + 3] = 255;
  };
  const feldMitte = (x, y) => [O + (x - y) * HALB_B, P + (x + y) * HALB_H];

  // Boden: eine schlichte Raute je Feld, damit das Dorf auf etwas steht
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const [sx, sy] = feldMitte(x, y);
    for (let ry = 0; ry < 16; ry++) {
      const breite = [2, 6, 10, 14, 18, 22, 26, 30, 30, 26, 22, 18, 14, 10, 6, 2][ry];
      for (let rx = 0; rx < breite; rx++) {
        const gr = 54 + ((x * 7 + y * 13) % 9);
        setze(sx + 15 + rx - breite / 2 - 15, sy + ry, gr - 8, gr + 6, gr - 22);
      }
    }
  }

  // ---- alles von hinten nach vorn zeichnen ----
  const alles = [
    ...mauern.map(m => ({ ...m, n: 1, tiefe: m.x + m.y })),
    ...bauten.map(b => ({ ...b, tiefe: (b.x + b.n - 1) + (b.y + b.n - 1) })),
  ].sort((a, b) => a.tiefe - b.tiefe);

  let gezeichnet = 0, ohneBild = 0;
  for (const e of alles) {
    const pool = vorrat[e.n];
    if (!pool || !pool.length) { ohneBild++; continue; }
    const wahl = pool[e.id % pool.length];               // feste Wahl je Nummer
    const bild = wahl.bild;
    // untere Ecke des Bauwerks
    const [sx, sy] = feldMitte(e.x + e.n - 1, e.y + e.n - 1);
    const ox = sx - ankerX(e.n) + 15 - 15;
    const oy = sy - (bild.hoehe - 16);
    for (let y = 0; y < bild.hoehe; y++) for (let x = 0; x < bild.breite; x++) {
      const q = (y * bild.breite + x) * 4;
      if (!bild.rgba[q + 3]) continue;
      setze(ox + x, oy + y, bild.rgba[q], bild.rgba[q + 1], bild.rgba[q + 2]);
    }
    gezeichnet++;
  }
  console.log('gezeichnet:', gezeichnet, ' ohne passendes Bild:', ohneBild);

  // ---- auf das Benutzte zuschneiden ----
  let minX = B, maxX = 0, minY = H, maxY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < B; x++)
    if (flaeche[(y * B + x) * 4 + 3]) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  const nb = maxX - minX + 1, nh = maxY - minY + 1;
  const zug = Buffer.alloc(nb * nh * 4);
  for (let y = 0; y < nh; y++)
    flaeche.copy(zug, y * nb * 4, ((minY + y) * B + minX) * 4, ((minY + y) * B + minX + nb) * 4);

  fs.writeFileSync(ziel, pngRgba(nb, nh, zug));
  console.log('geschrieben:', ziel, nb + '×' + nh);
}

main();
