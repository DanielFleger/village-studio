// Mehrere Einzelbilder einer Grundflaeche nebeneinander, mit eingebrannter
// Positionsnummer - zum Vergleichen einer Gruppe auf einen Blick.
//
// Aufruf:  node _baue_montage.js <n> <von> <bis> [ziel.png] [--spalten 6] [--faktor 2]
//          node _baue_montage.js 4 23 40 bogenmacher.png
//
// Die Nummern sind dieselben wie in den Einzelbildern und im Bogen.

const fs = require('fs');
const path = require('path');
const { pngRgba } = require('./lib/gm1');
const { sammle } = require('./lib/bildvorrat');

// 3x5-Ziffern, damit die Nummer ohne Schriftbibliothek ins Bild kommt
const ZIFFERN = {
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '001', '001', '001'],
  '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
};

function main() {
  const a = process.argv.slice(2);
  const n = Number(a[0]), von = Number(a[1]), bis = Number(a[2]);
  const ziel = a[3] && !a[3].startsWith('--') ? a[3] : `montage_${n}x${n}_${von}-${bis}.png`;
  const s = a.indexOf('--spalten'); const SP = s >= 0 ? Number(a[s + 1]) : 6;
  const f = a.indexOf('--faktor'); const F = f >= 0 ? Number(a[f + 1]) : 2;
  if (!n || !von || !bis) { console.error('Aufruf: node _baue_montage.js <n> <von> <bis> [ziel.png]'); process.exit(1); }

  const pool = (sammle()[n] || []).filter(p => p.pos >= von && p.pos <= bis);
  if (!pool.length) { console.error('keine Bilder'); process.exit(1); }

  const ZB = Math.max(...pool.map(p => p.bild.breite)) * F + 8;
  const ZH = Math.max(...pool.map(p => p.bild.hoehe)) * F + 8 + 12;   // Platz fuer die Nummer
  const zeilen = Math.ceil(pool.length / SP);
  const B = SP * ZB, H = zeilen * ZH;
  const aus = Buffer.alloc(B * H * 4, 0);
  const setze = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= B || y >= H) return;
    const p = (y * B + x) * 4; aus[p] = r; aus[p + 1] = g; aus[p + 2] = b; aus[p + 3] = 255;
  };
  // dunkler Grund je Zelle, damit die Bilder nicht ineinanderlaufen
  for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) {
    const rand = x % ZB === 0 || y % ZH === 0;
    setze(x, y, rand ? 70 : 28, rand ? 70 : 32, rand ? 60 : 24);
  }

  pool.forEach((p, i) => {
    const ox = (i % SP) * ZB + 4, oy = Math.floor(i / SP) * ZH + 12 + (ZH - 12 - 8 - p.bild.hoehe * F);
    for (let y = 0; y < p.bild.hoehe * F; y++) for (let x = 0; x < p.bild.breite * F; x++) {
      const q = ((y / F | 0) * p.bild.breite + (x / F | 0)) * 4;
      if (!p.bild.rgba[q + 3]) continue;
      setze(ox + x, oy + y, p.bild.rgba[q], p.bild.rgba[q + 1], p.bild.rgba[q + 2]);
    }
    // Nummer oben links, 2x vergroessert
    const text = String(p.pos);
    let tx = (i % SP) * ZB + 3, ty = Math.floor(i / SP) * ZH + 2;
    for (const z of text) {
      const m = ZIFFERN[z];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (m[r][c] === '1')
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) setze(tx + c * 2 + dx, ty + r * 2 + dy, 240, 198, 116);
      tx += 8;
    }
  });

  fs.writeFileSync(ziel, pngRgba(B, H, aus));
  console.log('geschrieben:', path.resolve(ziel), B + 'x' + H, pool.length + ' Bilder');
}

main();
