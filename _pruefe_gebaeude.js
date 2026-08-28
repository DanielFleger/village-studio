// Prueft die Gebaeudetabelle gegen die echten AIV-Dateien:
// Kommt eine Nummer vor, die nicht in der Tabelle steht?
// Passt die hinterlegte Grundflaeche zur haeufigsten gemessenen Form?
const fs = require('fs');
const path = require('path');
const { decode } = require('./lib/aiv');

const tab = JSON.parse(fs.readFileSync(path.join(__dirname, 'lib', 'gebaeude.json'), 'utf8')).gebaeude;
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

const G = 100;
const stat = new Map();
for (const p of dateien) {
  let d; try { d = decode(fs.readFileSync(p)); } catch (e) { console.error('FEHLER', path.basename(p), e.message); continue; }
  if (!d.bauten) continue;
  const g = d.bauten, seen = new Uint8Array(G * G);
  for (let i = 0; i < G * G; i++) {
    const v = g[i];
    if (!v || seen[i]) continue;
    const stack = [i]; seen[i] = 1;
    let minx = i % G, maxx = minx, miny = (i / G) | 0, maxy = miny;
    while (stack.length) {
      const c = stack.pop();
      const x = c % G, y = (c / G) | 0;
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
      for (const k of [x > 0 ? c - 1 : -1, x < G - 1 ? c + 1 : -1, y > 0 ? c - G : -1, y < G - 1 ? c + G : -1])
        if (k >= 0 && !seen[k] && g[k] === v) { seen[k] = 1; stack.push(k); }
    }
    let s = stat.get(v);
    if (!s) { s = { formen: new Map(), bloecke: 0 }; stat.set(v, s); }
    s.bloecke++;
    const key = (maxx - minx + 1) + 'x' + (maxy - miny + 1);
    s.formen.set(key, (s.formen.get(key) || 0) + 1);
  }
}

const fehlend = [], schief = [], ok = [];
for (const [id, s] of [...stat.entries()].sort((a, b) => a[0] - b[0])) {
  const e = tab[String(id)];
  const top = [...s.formen.entries()].sort((a, b) => b[1] - a[1])[0];
  if (!e) { fehlend.push(`${id} (${s.bloecke} Bloecke, meist ${top[0]})`); continue; }
  if (!e.b) { ok.push(`${id} ${e.name} (ohne Groesse)`); continue; }
  // Ein Bau darf mit gleichartigen Nachbarn verschmelzen -> Vielfache der Kantenlaenge sind in Ordnung
  const [bb, hh] = top[0].split('x').map(Number);
  const passt = bb % e.b === 0 && hh % e.h === 0;
  (passt ? ok : schief).push(`${id} ${e.name}: Tabelle ${e.b}x${e.h}, gemessen meist ${top[0]}`);
}

console.log(`Dateien: ${dateien.length}   Nummern im Einsatz: ${stat.size}`);
console.log(`stimmig: ${ok.length}`);
if (fehlend.length) console.log('NICHT IN DER TABELLE:\n  ' + fehlend.join('\n  '));
if (schief.length) console.log('GROESSE PASST NICHT:\n  ' + schief.join('\n  '));
if (!fehlend.length && !schief.length) console.log('Keine Abweichung.');
