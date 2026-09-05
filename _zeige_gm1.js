// Irgendeine .gm1-Datei ansehen - egal welcher Datenart.
//
// Aufruf:  node _zeige_gm1.js anim_buildings2 [ziel.png] [--faktor 2] [--spalten 9]
//          node _zeige_gm1.js --liste          alle Dateien mit Art und Anzahl
//
// Die Bogen-Werkzeuge zeigen nur die Gebaeude-Dateien (Datenart 3) und nur
// ganze Bauten. Hier geht jede Datei, Bild fuer Bild, mit Nummer im Bild -
// gebraucht fuer die Bewegtbilder (Muehlenfluegel, Tanzbaer) und fuer alles,
// was neben einem Gebaeude liegt statt darin.

const fs = require('fs');
const path = require('path');
const { leseGm1, bildVon, pngRgba, ART } = require('./lib/gm1');
const { GM } = require('./lib/bildvorrat');

const ZIFFERN = {
  '0': ['111', '101', '101', '101', '111'], '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'], '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'], '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'], '7': ['111', '001', '001', '001', '001'],
  '8': ['111', '101', '111', '101', '111'], '9': ['111', '101', '111', '001', '111'],
};

function liste() {
  for (const f of fs.readdirSync(GM).filter(f => f.endsWith('.gm1')).sort()) {
    let g; try { g = leseGm1(fs.readFileSync(path.join(GM, f))); } catch (e) { console.log(f.padEnd(26), 'nicht lesbar:', e.message); continue; }
    const gr = {};
    for (const b of g.bilder) { const k = b.breite + 'x' + b.hoehe; gr[k] = (gr[k] || 0) + 1; }
    const top = Object.entries(gr).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => k + '×' + v);
    console.log(f.replace('.gm1', '').padEnd(26), 'Art ' + g.art, (ART[g.art] || '?').padEnd(20),
      String(g.anzahl).padStart(5) + ' Bilder |', top.join('  '));
  }
}

function main() {
  const a = process.argv.slice(2);
  if (a.includes('--liste') || !a.length) return liste();
  const datei = a[0].replace(/\.gm1$/i, '');
  const ziel = a[1] && !a[1].startsWith('--') ? a[1] : 'gm1_' + datei + '.png';
  const iF = a.indexOf('--faktor'); const F = iF >= 0 ? Number(a[iF + 1]) : 2;
  const iS = a.indexOf('--spalten'); const SP = iS >= 0 ? Number(a[iS + 1]) : 9;

  const g = leseGm1(fs.readFileSync(path.join(GM, datei + '.gm1')));
  console.log(datei, '· Art', g.art, ART[g.art] || '?', '·', g.anzahl, 'Bilder');
  const bilder = [];
  for (let i = 0; i < g.anzahl; i++) {
    let b; try { b = bildVon(g, i); } catch { b = null; }
    if (b && b.breite && b.hoehe) bilder.push({ nr: i, b });
  }
  if (!bilder.length) { console.error('nichts lesbar'); process.exit(1); }

  const ZB = Math.max(...bilder.map(x => x.b.breite)) * F + 8;
  const ZH = Math.max(...bilder.map(x => x.b.hoehe)) * F + 8 + 12;
  const zeilen = Math.ceil(bilder.length / SP);
  const B = SP * ZB, H = zeilen * ZH;
  const aus = Buffer.alloc(B * H * 4, 0);
  const setze = (x, y, r, gr, bl) => {
    if (x < 0 || y < 0 || x >= B || y >= H) return;
    const p = (y * B + x) * 4; aus[p] = r; aus[p + 1] = gr; aus[p + 2] = bl; aus[p + 3] = 255;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) {
    const rand = x % ZB === 0 || y % ZH === 0;
    setze(x, y, rand ? 70 : 28, rand ? 70 : 32, rand ? 60 : 24);
  }
  bilder.forEach((e, i) => {
    const bi = e.b;
    const ox = (i % SP) * ZB + 4, oy = Math.floor(i / SP) * ZH + 12 + (ZH - 12 - 8 - bi.hoehe * F);
    for (let y = 0; y < bi.hoehe * F; y++) for (let x = 0; x < bi.breite * F; x++) {
      const q = ((y / F | 0) * bi.breite + (x / F | 0)) * 4;
      if (!bi.rgba[q + 3]) continue;
      setze(ox + x, oy + y, bi.rgba[q], bi.rgba[q + 1], bi.rgba[q + 2]);
    }
    let tx = (i % SP) * ZB + 3, ty = Math.floor(i / SP) * ZH + 2;
    for (const z of String(e.nr)) {
      const m = ZIFFERN[z];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (m[r][c] === '1')
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) setze(tx + c * 2 + dx, ty + r * 2 + dy, 240, 198, 116);
      tx += 8;
    }
  });
  fs.writeFileSync(ziel, pngRgba(B, H, aus));
  console.log('geschrieben:', path.resolve(ziel), B + 'x' + H);
}

main();
