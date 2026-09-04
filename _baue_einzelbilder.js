// Jedes Gebaeudebild einzeln ausgeben, mit seiner Stelle im Bogen im Namen.
//
// Aufruf:  node _baue_einzelbilder.js            alle Grundflaechen
//          node _baue_einzelbilder.js --nur 4    nur 4x4
//
// Warum: Daniel hat den 4x4-Bogen beschrieben ("Zeile 1, das dritte Bild"),
// aber seine Zaehlung laeuft ueber Zeilengrenzen hinweg. Mit einer Nummer im
// Dateinamen laesst sich jede Beschreibung eindeutig auf ein Bild legen.
//
// Ausgabe je Grundflaeche n in Tools\VillageStudio-bogen\einzeln\<n>x<n>\:
//   037_tile_workshops-14.png   Originalgroesse (fuer das Werkzeug)
//   gross\037_tile_workshops-14.png   dreifach vergroessert (zum Ansehen)
//   _liste.json                 Stelle, Zeile, Spalte, Datei, Bildnummer
// und daneben <n>x<n>.html als Uebersicht mit allen Nummern.
//
// Die Stelle (pos) ist dieselbe wie im Bogen groesse_<n>x<n>.png: 8 Spalten,
// Zeile = aufgerundet(pos / 8), Spalte = (pos - 1) % 8 + 1.

const fs = require('fs');
const path = require('path');
const { pngRgba } = require('./lib/gm1');
const { sammle } = require('./lib/bildvorrat');

const BOGEN_ORDNER = path.resolve(__dirname, '..', 'VillageStudio-bogen');
const ZIEL = path.join(BOGEN_ORDNER, 'einzeln');
const SPALTEN = 8;
const FAKTOR = 3;

function vergroessere(bild, f) {
  const B = bild.breite * f, H = bild.hoehe * f;
  const aus = Buffer.alloc(B * H * 4, 0);
  for (let y = 0; y < H; y++) for (let x = 0; x < B; x++) {
    const q = ((y / f | 0) * bild.breite + (x / f | 0)) * 4;
    const p = (y * B + x) * 4;
    aus[p] = bild.rgba[q]; aus[p + 1] = bild.rgba[q + 1]; aus[p + 2] = bild.rgba[q + 2]; aus[p + 3] = bild.rgba[q + 3];
  }
  return { breite: B, hoehe: H, rgba: aus };
}

function dateiname(p) {
  return String(p.pos).padStart(3, '0') + '_' + p.datei + '-' + p.nr + '.png';
}

function uebersicht(n, pool, erstellt) {
  const zellen = pool.map(p => {
    const z = Math.ceil(p.pos / SPALTEN), s = (p.pos - 1) % SPALTEN + 1;
    return `<figure><img src="einzeln/${n}x${n}/gross/${dateiname(p)}" alt="${p.pos}">` +
      `<figcaption><b>${p.pos}</b> <span>Z${z} S${s}</span><br><small>${p.datei}#${p.nr}</small></figcaption></figure>`;
  }).join('\n');
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>Einzelbilder ${n}x${n}</title>
<style>
body{background:#1c1f18;color:#e8e2d0;font:14px system-ui,sans-serif;margin:16px}
h1{font-size:20px;margin:0 0 4px}
.timestamps{color:#9a9482;font-size:12px;margin-bottom:12px}
.raster{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
figure{margin:0;background:#262a20;border:1px solid #3a3f31;border-radius:6px;padding:8px;text-align:center}
img{max-width:100%;height:auto;image-rendering:pixelated;background:#12140f}
figcaption{margin-top:6px}
figcaption b{font-size:18px;color:#f0c674}
figcaption span{color:#9a9482;margin-left:6px}
small{color:#7f8a6e}
a{color:#f0c674}
</style></head><body>
<h1>Einzelbilder ${n}×${n} — ${pool.length} Stück</h1>
<div class="timestamps">Erstellt: ${erstellt} · Reihenfolge wie im Bogen groesse_${n}x${n}.png (${SPALTEN} Spalten) · <a href="einzeln.html">alle Größen</a></div>
<div class="raster">
${zellen}
</div></body></html>`;
}

function main() {
  const i = process.argv.indexOf('--nur');
  const nur = i >= 0 ? Number(process.argv[i + 1]) : null;
  const erstellt = new Date().toLocaleString('de-DE');
  const vorrat = sammle();
  const groessen = Object.keys(vorrat).map(Number).sort((a, b) => a - b);
  const links = [];

  for (const n of groessen) {
    if (nur && n !== nur) continue;
    const pool = vorrat[n];
    const ordner = path.join(ZIEL, n + 'x' + n);
    fs.mkdirSync(path.join(ordner, 'gross'), { recursive: true });
    const liste = [];
    for (const p of pool) {
      const name = dateiname(p);
      fs.writeFileSync(path.join(ordner, name), pngRgba(p.bild.breite, p.bild.hoehe, p.bild.rgba));
      const g = vergroessere(p.bild, FAKTOR);
      fs.writeFileSync(path.join(ordner, 'gross', name), pngRgba(g.breite, g.hoehe, g.rgba));
      liste.push({
        pos: p.pos, zeile: Math.ceil(p.pos / SPALTEN), spalte: (p.pos - 1) % SPALTEN + 1,
        datei: p.datei, nr: p.nr, bild: p.datei + '#' + p.nr, breite: p.bild.breite, hoehe: p.bild.hoehe, png: name,
      });
    }
    fs.writeFileSync(path.join(ordner, '_liste.json'), JSON.stringify(liste, null, 1));
    fs.writeFileSync(path.join(BOGEN_ORDNER, n + 'x' + n + '.html'), uebersicht(n, pool, erstellt));
    links.push(`<li><a href="${n}x${n}.html">${n}×${n}</a> — ${pool.length} Bilder</li>`);
    console.log(n + 'x' + n, pool.length, 'Bilder ->', ordner);
  }

  if (!nur) {
    fs.writeFileSync(path.join(BOGEN_ORDNER, 'einzeln.html'), `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>Einzelbilder je Grundfläche</title>
<style>body{background:#1c1f18;color:#e8e2d0;font:16px system-ui,sans-serif;margin:24px}a{color:#f0c674}li{margin:6px 0}.timestamps{color:#9a9482;font-size:12px}</style>
</head><body><h1>Einzelbilder je Grundfläche</h1><div class="timestamps">Erstellt: ${erstellt}</div>
<ul>${links.join('\n')}</ul></body></html>`);
  }
}

main();
