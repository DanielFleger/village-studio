// Untersucht eine Bau-Nummer: wo liegt sie, wie gross sind die Bloecke,
// was steht an denselben Feldern in den anderen Abschnitten.
// Aufruf: node _untersuche93.js [Nummer]
const fs = require('fs');
const path = require('path');
const { decode } = require('./lib/aiv');

const ZIEL = Number(process.argv[2] || 93);
const G = 100;

const dir = path.resolve(__dirname, '..', 'Village');
const dateien = [];
for (const o of [path.join(dir, 'villages'), path.join(dir, 'aiv'), dir]) {
  let n; try { n = fs.readdirSync(o); } catch { continue; }
  for (const f of n) {
    if (!f.toLowerCase().endsWith('.aiv')) continue;
    const p = path.join(o, f);
    if (fs.statSync(p).isFile() && !dateien.includes(p)) dateien.push(p);
  }
}

function bloecke(g, ziel) {
  const seen = new Uint8Array(G * G), out = [];
  for (let i = 0; i < G * G; i++) {
    if (g[i] !== ziel || seen[i]) continue;
    const stack = [i]; seen[i] = 1; const felder = [];
    let minx = i % G, maxx = minx, miny = (i / G) | 0, maxy = miny;
    while (stack.length) {
      const c = stack.pop(); felder.push(c);
      const x = c % G, y = (c / G) | 0;
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
      for (const k of [x > 0 ? c - 1 : -1, x < G - 1 ? c + 1 : -1, y > 0 ? c - G : -1, y < G - 1 ? c + G : -1])
        if (k >= 0 && !seen[k] && g[k] === ziel) { seen[k] = 1; stack.push(k); }
    }
    out.push({ felder, minx, maxx, miny, maxy });
  }
  return out;
}

// Schwerpunkt aller Bauten ausser Rand/Flaeche = ungefaehre Burgmitte
function burgmitte(g) {
  let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < G * G; i++) {
    const v = g[i];
    if (!v || v === 1 || v === 2) continue;
    sx += i % G; sy += (i / G) | 0; n++;
  }
  return n ? [sx / n, sy / n] : [50, 50];
}

for (const p of dateien) {
  let d; try { d = decode(fs.readFileSync(p)); } catch { continue; }
  if (!d.bauten) continue;
  const bl = bloecke(d.bauten, ZIEL);
  if (!bl.length) continue;

  const [mx, my] = burgmitte(d.bauten);
  const formen = new Map();
  const schritte = new Set(), gruppen = new Set(), mauern = new Set(), sonst = new Set();
  const abstaende = [];
  let voll = 0;
  for (const b of bl) {
    const bb = b.maxx - b.minx + 1, hh = b.maxy - b.miny + 1;
    const key = bb + 'x' + hh;
    formen.set(key, (formen.get(key) || 0) + 1);
    if (b.felder.length === bb * hh) voll++;
    const cx = (b.minx + b.maxx) / 2, cy = (b.miny + b.maxy) / 2;
    abstaende.push(Math.hypot(cx - mx, cy - my));
    for (const i of b.felder) {
      if (d.schritte) schritte.add(d.schritte[i]);
      if (d.gruppen) gruppen.add(d.gruppen[i]);
      if (d.mauern) mauern.add(d.mauern[i]);
      if (d.sonstiges) sonst.add(d.sonstiges[i]);
    }
  }
  abstaende.sort((a, b) => a - b);
  const kurz = s => [...s].sort((a, b) => a - b).slice(0, 12).join(',') + ([...s].length > 12 ? ' …' : '');

  console.log('\n=== ' + path.basename(p) + ' ===');
  console.log(`  Bloecke: ${bl.length}   davon volle Rechtecke: ${voll}`);
  console.log(`  Formen:  ${[...formen.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => k + '(' + n + ')').join(' ')}`);
  console.log(`  Abstand zur Burgmitte: min ${abstaende[0].toFixed(1)}  Mitte ${abstaende[Math.floor(abstaende.length / 2)].toFixed(1)}  max ${abstaende[abstaende.length - 1].toFixed(1)}`);
  console.log(`  Bauschritte:     ${kurz(schritte)}   (Dorf hat ${d.anzahlSchritte} Schritte)`);
  console.log(`  Gebaeudegruppen: ${kurz(gruppen)}`);
  console.log(`  Mauerkanten:     ${kurz(mauern)}`);
  console.log(`  Sonstiges:       ${kurz(sonst)}`);
}
