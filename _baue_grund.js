// Der Gelaendegrund fuer die 2,5D-Ansicht des AI-Toolkits.
//
// Aus echten Sandkacheln des Spiels zusammengesetzt statt aus einem Foto: so
// stimmt der Massstab von selbst, denn eine Kachel im Bild IST eine Kachel im
// Spiel (30 x 16 Punkte). Gemalt wird mit Umlauf ueber die Raender, darum
// kachelt das Ergebnis stossfrei.
//
// Aufruf:  node _baue_grund.js <ziel.png> [felder]

const fs = require('fs');
const path = require('path');
const { leseGm1, bildVon, pngRgba } = require('./lib/gm1');

const GM = 'C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme/gm';
const KACHEL_B = 30, KACHEL_H = 16;

// Sandkacheln aus tile_land8: volle 30x16-Rauten, sandfarben (rot > gruen >
// blau, deutlicher Abstand). Gemessen am 06.09.2026: 22 Stueck.
function sandkacheln(g, anzahl) {
  const aus = [];
  for (let i = 0; i < anzahl; i++) {
    const b = bildVon(g, i);
    if (b.breite !== KACHEL_B || b.hoehe !== KACHEL_H) continue;
    let r = 0, gr = 0, bl = 0, n = 0;
    for (let k = 0; k < b.rgba.length; k += 4) {
      if (!b.rgba[k + 3]) continue;
      r += b.rgba[k]; gr += b.rgba[k + 1]; bl += b.rgba[k + 2]; n++;
    }
    if (n < 200) continue;
    r /= n; gr /= n; bl /= n;
    if (r > 130 && r > gr && gr > bl && (r - bl) > 20) aus.push({ bild: b, hell: r });
  }
  // Nur Kacheln aehnlicher Helligkeit nehmen. Alle 22 gemischt ergibt ein
  // unruhiges Schachbrett aus hellem und dunklem Sand - im Spiel liegt
  // gleichmaessiger Boden. Genommen wird die groesste Gruppe im Fenster +-12.
  if (!aus.length) return [];
  let beste = [], besteZahl = 0;
  for (const kandidat of aus) {
    const gruppe = aus.filter(k => Math.abs(k.hell - kandidat.hell) <= 12);
    if (gruppe.length > besteZahl) { besteZahl = gruppe.length; beste = gruppe; }
  }
  return beste.map(k => k.bild);
}

function main() {
  const ziel = process.argv[2] || 'grund.png';
  const N = Number(process.argv[3]) || 8;
  const g = leseGm1(fs.readFileSync(path.join(GM, 'tile_land8.gm1')));
  const kacheln = sandkacheln(g, g.bilder ? g.bilder.length : g.anzahl);
  if (!kacheln.length) { console.error('keine Sandkacheln gefunden'); process.exit(1); }

  const B = N * KACHEL_B, H = N * KACHEL_H;
  const aus = Buffer.alloc(B * H * 4, 0);
  // Immer dieselbe Streuung, damit zwei Laeufe dasselbe Bild ergeben.
  let saat = 20260906;
  const wuerfel = () => (saat = (saat * 1103515245 + 12345) & 0x7fffffff) % kacheln.length;
  const male = (bild, ox, oy) => {
    for (let y = 0; y < bild.hoehe; y++) for (let x = 0; x < bild.breite; x++) {
      const q = (y * bild.breite + x) * 4;
      if (!bild.rgba[q + 3]) continue;
      const px = ((ox + x) % B + B) % B, py = ((oy + y) % H + H) % H;   // Umlauf
      const p = (py * B + px) * 4;
      aus[p] = bild.rgba[q]; aus[p + 1] = bild.rgba[q + 1];
      aus[p + 2] = bild.rgba[q + 2]; aus[p + 3] = 255;
    }
  };
  // Rauten fuellen die Ebene in zwei versetzten Reihen: bei (a*30, b*16) und
  // eine halbe Kachel daneben. Zusammen ergibt das eine dichte Flaeche.
  for (let b = 0; b < N; b++) for (let a = 0; a < N; a++) {
    male(kacheln[wuerfel()], a * KACHEL_B, b * KACHEL_H);
    male(kacheln[wuerfel()], a * KACHEL_B + KACHEL_B / 2, b * KACHEL_H + KACHEL_H / 2);
  }
  let luecken = 0;
  for (let i = 3; i < aus.length; i += 4) if (!aus[i]) luecken++;
  fs.writeFileSync(ziel, pngRgba(B, H, aus));
  console.log('geschrieben: ' + ziel + '  ' + B + 'x' + H + ' (' + N + 'x' + N + ' Felder), '
            + kacheln.length + ' Sandkacheln, ' + luecken + ' Luecken');
}

main();
