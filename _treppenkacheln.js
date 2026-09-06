// Die fuenf Treppenstufen als Draufsicht-Kacheln, im Stil der uebrigen
// Skins des AI-Toolkits: 32x32, reines Grau, Steinfuge.
//
// Die Helligkeit ist nicht ausgedacht, sondern gemessen: High Wall (25.png)
// ist ein Grau von 78, Low Wall (46.png) eines von 125. Eine Treppe fuehrt
// von der Mauerkrone herunter, also laeuft Stufe 1 (die hoechste) auf dem
// Grau der hohen Mauer los und Stufe 5 endet auf dem der niedrigen. Damit
// sagt die Farbe dasselbe wie im Rest der Palette, statt eine eigene
// Sprache zu erfinden.
const fs = require('fs'), path = require('path');
const { pngRgba } = require('./lib/gm1');

const ZIEL = process.argv[2];
if (!ZIEL) { console.error('Aufruf: node _treppenkacheln.js <zielordner>'); process.exit(1); }

const HOCH = 78, NIEDRIG = 125;     // gemessen an 25.png und 46.png
const N = 32, STUFEN = 5;

// Immer dasselbe Rauschen, damit zweimal Erzeugen zweimal dasselbe Bild
// gibt - ein Bild, das sich bei jedem Lauf aendert, macht jeden Vergleich
// im Repo zu einer Aenderung.
function streu(x, y) {
  const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (h - Math.floor(h)) * 2 - 1;
}

function kachel(stufe) {          // 1 = hoechste, 5 = niedrigste
  const grund = HOCH + (NIEDRIG - HOCH) * ((stufe - 1) / (STUFEN - 1));
  const rgba = Buffer.alloc(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let wert = grund + streu(x, y) * 7;
    // Die Stufenkanten: quer ueber die Kachel, alle sechs Punkte eine
    // dunkle Fuge mit einer hellen Kante darueber - so liest sich die
    // Kachel als Treppe und nicht als Pflaster.
    const inStufe = y % 6;
    if (inStufe === 0) wert -= 26;
    else if (inStufe === 1) wert += 16;
    // Rand, wie ihn die Mauerkacheln auch haben
    if (x === 0 || y === 0 || x === N - 1 || y === N - 1) wert -= 14;
    const g = Math.max(0, Math.min(255, Math.round(wert)));
    const i = (y * N + x) * 4;
    rgba[i] = g; rgba[i+1] = g; rgba[i+2] = g; rgba[i+3] = 255;
  }
  return pngRgba(N, N, rgba);
}

fs.mkdirSync(ZIEL, { recursive: true });
for (let s = 1; s <= STUFEN; s++) {
  const datei = path.join(ZIEL, String(180 + s) + '.png');
  fs.writeFileSync(datei, kachel(s));
  console.log('geschrieben: ' + datei);
}
