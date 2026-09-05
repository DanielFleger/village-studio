// Der Prüfzettel für Daniel: alle zugeordneten Bilder auf einer Seite,
// die unsicheren zuerst und groß.
//
// Aufruf:  node _baue_pruefzettel.js
// Ergebnis: Tools\VillageStudio-bogen\Zuordnung_pruefen.html
//
// Die Bilder liegen schon als Einzelbilder daneben (einzeln\<n>x<n>\gross\),
// die Seite verlinkt sie nur - es wird nichts doppelt abgelegt.

const fs = require('fs');
const path = require('path');
const { sammle } = require('./lib/bildvorrat');

const BOGEN = path.resolve(__dirname, '..', 'VillageStudio-bogen');
const ZIEL = path.join(BOGEN, 'Zuordnung_pruefen.html');

function bildPfad(vorrat, n, pos) {
  const p = vorrat[n].find(x => x.pos === pos);
  return `einzeln/${n}x${n}/gross/${String(pos).padStart(3, '0')}_${p.datei}-${p.nr}.png`;
}

function karte(vorrat, id, e, stand) {
  const gruppe = (e.gruppe || []).length;
  return `<figure class="${stand}">
  <img src="${bildPfad(vorrat, e.kacheln, e.pos)}" alt="Nr ${id}" loading="lazy">
  <figcaption>
    <div class="kopf"><span class="nr">${id}</span> <b>${e.name}</b></div>
    <div class="meta">${e.kacheln}×${e.kacheln} Kacheln · Bild ${e.pos} im ${e.kacheln}×${e.kacheln}-Bogen · ${e.bild}${gruppe > 1 ? ` · ${gruppe} Fassungen` : ''}</div>
    <p>${e.beleg}</p>
  </figcaption>
</figure>`;
}

function main() {
  const vorrat = sammle();
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, 'lib', 'gebaeude_bilder.json'), 'utf8'));
  const gebaeude = require('./lib/gebaeude.json').gebaeude;
  const erstellt = new Date().toLocaleString('de-DE');

  const nach = o => Object.entries(o).sort((a, b) => a[0] - b[0]);
  const vermutet = nach(j.vermutet).map(([id, e]) => karte(vorrat, id, e, 'vermutet')).join('\n');
  const sicher = nach(j.sicher).map(([id, e]) => karte(vorrat, id, e, 'sicher')).join('\n');

  const ohne = Object.keys(gebaeude)
    .filter(id => gebaeude[id].b && gebaeude[id].b === gebaeude[id].h && !j.sicher[id] && !j.vermutet[id])
    .map(id => `<li><b>${id} ${gebaeude[id].name}</b> (${gebaeude[id].b}×${gebaeude[id].h})</li>`).join('');
  const offen = Object.entries(j._offen || {})
    .map(([k, v]) => `<li><b>${k}</b> — ${v}</li>`).join('');

  const html = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><title>Zuordnung prüfen — Village Studio</title>
<style>
:root{--gelb:#f0c674;--gruen:#8fd694}
body{background:#1a1d16;color:#e8e2d0;font:15px/1.5 system-ui,sans-serif;margin:0;padding:24px 20px 60px}
h1{font-size:24px;margin:0 0 4px}
h2{font-size:19px;margin:34px 0 6px;border-bottom:1px solid #3a3f31;padding-bottom:6px}
.timestamps{color:#9a9482;font-size:12px;margin-bottom:8px}
.hinweis{background:#252a1e;border-left:3px solid var(--gelb);padding:10px 14px;margin:14px 0 8px;max-width:900px}
.raster{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;margin-top:14px}
figure{margin:0;background:#242a1d;border:1px solid #3a3f31;border-left-width:4px;border-radius:6px;padding:12px;display:flex;gap:12px;align-items:flex-start}
figure.vermutet{border-left-color:var(--gelb)}
figure.sicher{border-left-color:var(--gruen)}
img{max-width:130px;max-height:150px;height:auto;image-rendering:pixelated;background:#12140f;border-radius:4px;flex:0 0 auto}
figcaption{min-width:0}
.kopf{font-size:16px}
.nr{display:inline-block;min-width:30px;padding:1px 6px;border-radius:4px;background:#3a3f31;color:var(--gelb);font-weight:700;text-align:center}
figure.sicher .nr{color:var(--gruen)}
.meta{color:#8d9a7c;font-size:12px;margin:3px 0 6px}
p{margin:0;font-size:13px;color:#c9c3b0}
ul{max-width:900px}
li{margin:5px 0}
.klein{columns:2;column-gap:26px;max-width:1100px}
</style></head><body>
<h1>Zuordnung Bau-Nummer → Bild — zum Prüfen</h1>
<div class="timestamps">Erstellt: ${erstellt} · ${Object.keys(j.sicher).length} belegt, ${Object.keys(j.vermutet).length} vermutet</div>

<div class="hinweis">
<b>Nur der gelbe Block braucht dich.</b> Dort steht jeweils, woran ich es festgemacht habe.
Wenn eine Zeile falsch ist, genügt „Nr. 59 ist kein Stall, sondern …" — den Rest trage ich nach.
Der grüne Block ist am Bild belegt und dient nur zum Gegenlesen.
</div>

<h2>Vermutet — bitte durchsehen (${Object.keys(j.vermutet).length})</h2>
<div class="raster">
${vermutet}
</div>

<h2>Am Bild belegt (${Object.keys(j.sicher).length})</h2>
<div class="raster">
${sicher}
</div>

<h2>Ohne Bild — dafür gibt es in keiner Datei eines</h2>
<ul class="klein">${ohne}</ul>

<h2>Offene Punkte</h2>
<ul>${offen}</ul>
</body></html>`;

  fs.writeFileSync(ZIEL, html, 'utf8');
  console.log('geschrieben:', ZIEL);
}

main();
