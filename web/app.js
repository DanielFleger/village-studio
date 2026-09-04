// Village Studio - Oberfläche

const $ = s => document.querySelector(s);
const N = 100;

let doerfer = [], ziele = [];
let dorf = null;
let zoom = 1, offX = 0, offY = 0, zelle = 8;
let ziehen = null, malt = false;
let werkzeug = 'zeigen';
let geaendert = false;
const undoStapel = [];

const cv = $('#karte');
const ctx = cv.getContext('2d');

// ---------- Gebäudetabelle ----------
// Nummern aus dem sourcehold-Projekt, gegen die 18 AIV-Dateien hier gegengeprüft.
let GEB = {}, GRUPPEN = {};
async function ladeGebaeude() {
  try {
    const r = await fetch('/api/gebaeude').then(r => r.json());
    GEB = r.gebaeude || {}; GRUPPEN = r.gruppen || {};
  } catch { GEB = {}; GRUPPEN = {}; return; }
  // Innerhalb einer Gebäudeart die Helligkeit gleichmäßig spreizen,
  // sonst sehen z. B. die acht Freude-Bauten alle gleich aus.
  const proGruppe = {};
  for (const id of Object.keys(GEB).map(Number).sort((a, b) => a - b)) {
    const g = GEB[String(id)].gruppe;
    (proGruppe[g] = proGruppe[g] || []).push(id);
  }
  for (const [g, ids] of Object.entries(proGruppe))
    ids.forEach((id, k) => {
      // Spannweite an die Gruppengroesse anpassen: kleine Gruppen brauchen wenig
      const spanne = Math.min(48, 12 * (ids.length - 1));
      GEB[String(id)].stufe = ids.length < 2 ? 0 : -spanne / 2 + spanne * k / (ids.length - 1);
    });
}
function bau(id) { return GEB[String(id)] || null; }
function bauName(id) {
  if (!id) return '–';
  const b = bau(id);
  return b ? b.name : 'unbekannt';
}

// ---------- Farben ----------
function farbeFuer(id) {
  if (!id) return null;
  const b = bau(id);
  if (b && GRUPPEN[b.gruppe]) {
    // Grundfarbe der Gebäudeart, innerhalb der Art nach Nummer aufgehellt/abgedunkelt
    if (b.farbe) return b.farbe;              // fest gesetzte Farbe hat Vorrang
    return mischen(GRUPPEN[b.gruppe].farbe, b.stufe || 0);
  }
  const h = (id * 137.508) % 360;
  const s = 42 + (id * 29) % 26;
  const l = 38 + (id * 17) % 22;
  return `hsl(${h.toFixed(0)} ${s}% ${l}%)`;
}
function mischen(hex, prozent) {
  const n = parseInt(hex.slice(1), 16);
  const k = v => Math.max(0, Math.min(255, Math.round(v + 255 * prozent / 100)));
  return '#' + [k(n >> 16), k((n >> 8) & 255), k(n & 255)]
    .map(v => v.toString(16).padStart(2, '0')).join('');
}
function schritteFarbe(s, max) {
  if (!s || !max) return null;
  const t = Math.min(1, s / max);
  return `hsl(${(210 - 210 * t).toFixed(0)} 70% ${(28 + 34 * t).toFixed(0)}%)`;
}

// ---------- Listen ----------
async function ladeListe() {
  const r = await fetch('/api/doerfer').then(r => r.json());
  doerfer = r.doerfer;
  zeichneListe();
  $('#status').textContent = `${doerfer.length} Dörfer gefunden`;
  const z = await fetch('/api/spielziele').then(r => r.json());
  ziele = z.ziele || [];
  const sel = $('#spielziel');
  sel.innerHTML = '';
  if (!ziele.length) {
    sel.innerHTML = '<option value="">kein Stronghold gefunden</option>';
    $('#speicherinfo').textContent = 'Stronghold nicht gefunden — config.json anlegen.';
  } else {
    for (const t of ziele) {
      const o = document.createElement('option');
      o.value = t.pfad;
      o.textContent = t.ki === 'Original' ? `Spiel · ${t.datei}` : `${t.ki} · ${t.slot} → ${t.datei}`;
      sel.appendChild(o);
    }
  }
}

function zeichneListe() {
  const f = $('#suche').value.trim().toLowerCase();
  const ul = $('#liste');
  ul.innerHTML = '';
  for (const d of doerfer) {
    if (f && !d.name.toLowerCase().includes(f)) continue;
    const li = document.createElement('li');
    li.innerHTML = `<span></span><small>${(d.groesse / 1024).toFixed(0)} KB</small>`;
    li.firstChild.textContent = d.name;
    li.title = d.pfad;
    if (dorf && dorf.pfad === d.pfad) li.className = 'aktiv';
    li.onclick = () => { if (!warnenWennUngespeichert()) return; ladeDorf(d.pfad, d.name); };
    ul.appendChild(li);
  }
}

function warnenWennUngespeichert() {
  if (!geaendert) return true;
  return confirm('Es gibt ungespeicherte Änderungen. Trotzdem weiter?');
}

// ---------- Dorf laden ----------
async function ladeDorf(pfad, name) {
  $('#status').textContent = 'lade …';
  const r = await fetch('/api/dorf?pfad=' + encodeURIComponent(pfad)).then(r => r.json());
  if (r.fehler) { $('#status').textContent = 'Fehler: ' + r.fehler; return; }
  dorf = r;
  undoStapel.length = 0;
  setzeGeaendert(false);
  $('#dorfname').textContent = name || r.datei;
  $('#hinweis').hidden = true;
  $('#speichern').disabled = false;
  $('#speichernAls').disabled = false;
  $('#insSpiel').disabled = ziele.length === 0;
  zeichneListe(); zeigeKennzahlen(); zeigeLegende(); zeigeAbschnitte(); einpassen(); ladeVorlage();
  $('#status').textContent = `${r.datei} · ${(r.dateigroesse / 1024).toFixed(1)} KB · Version ${r.header.version}`;
}

function setzeGeaendert(v) {
  geaendert = v;
  $('#geaendert').hidden = !v;
  $('#rueckgaengig').disabled = undoStapel.length === 0;
}

function zeigeKennzahlen() {
  const belegt = dorf.bauten ? dorf.bauten.filter(v => v !== 0).length : 0;
  const arten = new Set(dorf.bauten ? dorf.bauten.filter(v => v) : []).size;
  let maxSchritt = 0;
  if (dorf.schritte) for (const v of dorf.schritte) if (v > maxSchritt) maxSchritt = v;
  const rows = [
    ['bebaute Felder', belegt.toLocaleString('de')],
    ['verschiedene Bauten', arten],
    ['Bauschritte', maxSchritt || (dorf.anzahlSchritte ?? '–')],
    ['Pausenlänge', dorf.pausenlaenge ?? '–'],
    ['Dateiversion', dorf.header.version],
  ];
  if (dorf.umrissFehlerZahl !== undefined)
    rows.push(['Umriss-Prüfung', dorf.umrissFehlerZahl === 0 ? 'in Ordnung'
               : dorf.umrissFehlerZahl + ' Felder passen nicht']);
  $('#kennzahlen').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
}

function zeigeLegende() {
  const ul = $('#legende');
  ul.innerHTML = '';
  const zaehler = new Map();
  if (dorf.bauten) for (const v of dorf.bauten) if (v) zaehler.set(v, (zaehler.get(v) || 0) + 1);
  const liste = [...zaehler.entries()].sort((a, b) => b[1] - a[1]);
  for (const [id, n] of liste) {
    const li = document.createElement('li');
    const b = bau(id);
    const groesse = b && b.b ? ` ${b.b}×${b.h}` : '';
    const nummern = b ? `AIV ${id}${groesse}` +
      (b.mapper ? ` · im Speicher ${b.mapper}${b.mapperName ? ' (' + b.mapperName + ')' : ''}` : '') +
      (b.laufzeit ? ` · zum Abreißen ${b.laufzeit}${b.laufzeitName ? ' (' + b.laufzeitName + ')' : ''}` : '')
      : `Nr. ${id}`;
    li.innerHTML = `<i style="background:${farbeFuer(id)}"></i>` +
      `<span title="${nummern}">${bauName(id)}</span><b>${n}</b>`;
    li.style.cursor = 'pointer';
    li.title = `${nummern} – anklicken übernimmt die Nummer zum Malen`;
    li.onclick = () => { $('#baunr').value = id; setzeWerkzeug('malen'); };
    ul.appendChild(li);
  }
}

function zeigeAbschnitte() {
  $('#abschnitte').innerHTML = dorf.meta.map(m =>
    `<li${m.ok ? '' : ' class="fehler"'}><b>${m.id}</b><span>${m.name}</span><span>${m.packed ? 'gepackt' : 'roh'} ${m.uncLen}</span></li>`
  ).join('');
}

// ---------- Zeichnen ----------
function groesseAnpassen() {
  const r = cv.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  cv.width = Math.round(r.width * dpr);
  cv.height = Math.round(r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  malen_();
}

function einpassen() {
  const r = cv.parentElement.getBoundingClientRect();
  // Beim ersten Laden steht die Bühne noch nicht — sonst käme ein 2-Pixel-Raster heraus
  if (r.width < 120 || r.height < 120) { requestAnimationFrame(einpassen); return; }
  zelle = Math.max(2, Math.floor(Math.min(r.width - 40, r.height - 40) / N));
  zoom = 1;
  offX = (r.width - N * zelle) / 2;
  offY = (r.height - N * zelle) / 2;
  malen_();
}

function malen_() {
  const r = cv.parentElement.getBoundingClientRect();
  ctx.clearRect(0, 0, r.width, r.height);
  if (!dorf) return;
  const z = zelle * zoom, x0 = offX, y0 = offY;

  ctx.fillStyle = '#1a1d16';
  ctx.fillRect(x0, y0, N * z, N * z);

  // Vorlage liegt unter allem anderen
  if (vorlage.bild && vorlage.sichtbar) {
    const bw = N * vorlage.skala * z;
    const bh = bw * (vorlage.bild.naturalHeight / vorlage.bild.naturalWidth);
    ctx.save();
    ctx.globalAlpha = vorlage.deckkraft;
    ctx.imageSmoothingEnabled = z < 8;
    ctx.drawImage(vorlage.bild, x0 + vorlage.x * z, y0 + vorlage.y * z, bw, bh);
    ctx.restore();
    if (vorlageSchiebt) {
      ctx.strokeStyle = 'rgba(214,184,122,.9)';
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x0 + vorlage.x * z, y0 + vorlage.y * z, bw, bh);
      ctx.setLineDash([]);
    }
  }

  const an = id => $(id).checked;
  let maxSchritt = 1;
  if (dorf.schritte) for (const v of dorf.schritte) if (v > maxSchritt) maxSchritt = v;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      let f = null;
      if (an('#ebSchritte') && dorf.schritte && dorf.schritte[i]) f = schritteFarbe(dorf.schritte[i], maxSchritt);
      if (an('#ebGruppen') && dorf.gruppen && dorf.gruppen[i]) f = `hsl(${(dorf.gruppen[i] * 47) % 360} 45% 34%)`;
      if (an('#ebSonst') && dorf.sonstiges && dorf.sonstiges[i]) f = 'rgba(200,120,220,.55)';
      if (an('#ebBauten') && dorf.bauten && dorf.bauten[i]) f = farbeFuer(dorf.bauten[i]);
      if (f) { ctx.fillStyle = f; ctx.fillRect(x0 + x * z, y0 + y * z, z, z); }
      if (an('#ebMauern') && dorf.mauern && dorf.mauern[i]) {
        ctx.fillStyle = 'rgba(235,225,190,.75)';
        ctx.fillRect(x0 + x * z + z * .3, y0 + y * z + z * .3, z * .4, z * .4);
      }
      // Felder, an denen Kantenlänge oder Lage nicht zu den Bauten passen
      if (an('#ebUmriss') && dorf.umrissFehler && dorf.umrissFehler[i]) {
        ctx.fillStyle = 'rgba(255,60,60,.85)';
        ctx.fillRect(x0 + x * z, y0 + y * z, z, z);
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x0 + x * z + .5, y0 + y * z + .5, z - 1, z - 1);
      }
    }
  }

  if (an('#ebRaster') && z >= 5) {
    ctx.lineWidth = 1;
    for (let i = 0; i <= N; i++) {
      ctx.strokeStyle = (i % 10 === 0) ? 'rgba(255,255,255,.13)' : 'rgba(255,255,255,.045)';
      ctx.beginPath();
      ctx.moveTo(x0 + i * z, y0); ctx.lineTo(x0 + i * z, y0 + N * z);
      ctx.moveTo(x0, y0 + i * z); ctx.lineTo(x0 + N * z, y0 + i * z);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = 'rgba(214,184,122,.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + .5, y0 + .5, N * z, N * z);
  $('#zoomWert').textContent = Math.round(zoom * 100) + ' %';
}

// ---------- Vorlage ----------
// x, y und Größe zählen in Rasterfeldern, damit die Vorlage beim Zoomen sitzen bleibt.
const vorlage = { bild: null, x: 0, y: 0, skala: 1, deckkraft: .6, sichtbar: true };
let vorlageSchiebt = false;
let vorlageMerkZeit = null;

function vorlageReglerAn(sichtbar) {
  $('#vorlageRegler').hidden = !sichtbar;
  $('#vorlageWaehlen').textContent = sichtbar ? 'Anderes Bild wählen …' : 'Bild wählen …';
}

async function ladeVorlage() {
  vorlage.bild = null; vorlageSchiebt = false;
  $('#vorlageSchieben').textContent = 'Verschieben: aus';
  vorlageReglerAn(false);
  if (!dorf) return malen_();
  const v = await fetch('/api/vorlage?pfad=' + encodeURIComponent(dorf.pfad)).then(r => r.json());
  if (!v.vorhanden) return malen_();
  Object.assign(vorlage, { x: v.x, y: v.y, skala: v.skala, deckkraft: v.deckkraft, sichtbar: v.sichtbar });
  $('#vorlageAn').checked = vorlage.sichtbar;
  $('#vorlageDeck').value = Math.round(vorlage.deckkraft * 100);
  $('#vorlageDeckWert').textContent = Math.round(vorlage.deckkraft * 100);
  $('#vorlageSkala').value = Math.round(vorlage.skala * 100);
  $('#vorlageSkalaWert').textContent = Math.round(vorlage.skala * 100);
  const bild = new Image();
  bild.onload = () => { vorlage.bild = bild; vorlageReglerAn(true); malen_(); };
  bild.onerror = () => malen_();
  bild.src = v.bild;
}

function merkeVorlage(bildBase64) {
  if (!dorf) return;
  clearTimeout(vorlageMerkZeit);
  const senden = () => fetch('/api/vorlage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pfad: dorf.pfad, bildBase64,
      x: vorlage.x, y: vorlage.y, skala: vorlage.skala,
      deckkraft: vorlage.deckkraft, sichtbar: vorlage.sichtbar,
    }),
  });
  if (bildBase64) senden(); else vorlageMerkZeit = setTimeout(senden, 400);
}

// ---------- Bearbeiten ----------
function schnappschuss() {
  if (!dorf) return;
  undoStapel.push({ bauten: dorf.bauten.slice(), schritte: dorf.schritte ? dorf.schritte.slice() : null });
  if (undoStapel.length > 40) undoStapel.shift();
}

function rueckgaengig() {
  const s = undoStapel.pop();
  if (!s) return;
  dorf.bauten = s.bauten;
  if (s.schritte) dorf.schritte = s.schritte;
  setzeGeaendert(undoStapel.length > 0 || true);
  zeigeKennzahlen(); zeigeLegende(); malen_();
}

function anwenden(cx, cy) {
  if (!dorf || !dorf.bauten) return;
  const p = +$('#pinsel').value;
  const halb = Math.floor((p - 1) / 2);
  const nr = Math.max(0, Math.min(65535, +$('#baunr').value || 0));
  const schritt = Math.max(0, +$('#schrittnr').value || 0);
  const mitSchritt = $('#schrittMit').checked && dorf.schritte;
  let etwas = false;
  for (let dy = -halb; dy <= halb + ((p - 1) % 2); dy++) {
    for (let dx = -halb; dx <= halb + ((p - 1) % 2); dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= N || y >= N) continue;
      const i = y * N + x;
      if (werkzeug === 'malen') {
        if (dorf.bauten[i] !== nr) { dorf.bauten[i] = nr; etwas = true; }
        if (mitSchritt && dorf.schritte[i] !== schritt) { dorf.schritte[i] = schritt; etwas = true; }
      } else if (werkzeug === 'radieren') {
        if (dorf.bauten[i] !== 0) { dorf.bauten[i] = 0; etwas = true; }
        if (mitSchritt && dorf.schritte[i] !== 0) { dorf.schritte[i] = 0; etwas = true; }
      }
    }
  }
  if (etwas) { setzeGeaendert(true); malen_(); }
}

function setzeWerkzeug(w) {
  werkzeug = w;
  for (const b of document.querySelectorAll('.wz')) b.classList.toggle('aktiv', b.dataset.wz === w);
  cv.style.cursor = w === 'zeigen' ? 'grab' : 'crosshair';
}

// ---------- Maus ----------
function zelleAn(ev) {
  const r = cv.getBoundingClientRect();
  const z = zelle * zoom;
  const x = Math.floor((ev.clientX - r.left - offX) / z);
  const y = Math.floor((ev.clientY - r.top - offY) / z);
  if (x < 0 || y < 0 || x >= N || y >= N) return null;
  return { x, y, i: y * N + x };
}

cv.addEventListener('mousedown', ev => {
  if (!dorf) return;
  const c = zelleAn(ev);
  if (vorlageSchiebt && vorlage.bild && ev.button === 0) {
    ziehen = { vorlage: true, mx: ev.clientX, my: ev.clientY, vx: vorlage.x, vy: vorlage.y };
    cv.style.cursor = 'grabbing';
    return;
  }
  const schieben = ev.button === 1 || ev.button === 2 || werkzeug === 'zeigen';
  if (schieben) {
    ziehen = { mx: ev.clientX, my: ev.clientY, ox: offX, oy: offY };
    cv.style.cursor = 'grabbing';
    return;
  }
  if (!c) return;
  if (werkzeug === 'pipette') {
    $('#baunr').value = dorf.bauten[c.i] || 0;
    if (dorf.schritte) $('#schrittnr').value = dorf.schritte[c.i] || 0;
    setzeWerkzeug('malen');
    return;
  }
  schnappschuss();
  malt = true;
  anwenden(c.x, c.y);
});

cv.addEventListener('contextmenu', ev => ev.preventDefault());

cv.addEventListener('mousemove', ev => {
  if (ziehen && ziehen.vorlage) {
    const z = zelle * zoom;
    vorlage.x = ziehen.vx + (ev.clientX - ziehen.mx) / z;
    vorlage.y = ziehen.vy + (ev.clientY - ziehen.my) / z;
    malen_(); return;
  }
  if (ziehen) {
    offX = ziehen.ox + (ev.clientX - ziehen.mx);
    offY = ziehen.oy + (ev.clientY - ziehen.my);
    malen_(); return;
  }
  const c = zelleAn(ev);
  if (malt && c) { anwenden(c.x, c.y); }
  const tt = $('#tooltip');
  if (!c || !dorf) { tt.hidden = true; $('#fadenkreuz').textContent = ''; return; }
  $('#fadenkreuz').textContent = `x ${c.x} · y ${c.y}`;
  const zeilen = [`Feld  ${c.x} , ${c.y}`];
  if (dorf.bauten) {
    const id = dorf.bauten[c.i];
    const b = id ? bau(id) : null;
    zeilen.push(`Bau      ${id ? bauName(id) + ' (AIV ' + id + ')' : '–'}`);
    if (b && (b.mapper || b.laufzeit))
      zeilen.push(`         Speicher ${b.mapper ?? '–'} · Abriss ${b.laufzeit ?? '–'}`);
  }
  if (dorf.schritte) zeilen.push(`Schritt  ${dorf.schritte[c.i] || '–'}`);
  if (dorf.gruppen) zeilen.push(`Kantenl. ${dorf.gruppen[c.i] || '–'}`);
  if (dorf.mauern) zeilen.push(`Lage     ${dorf.mauern[c.i] || '–'}`);
  if (dorf.umrissFehler && dorf.umrissFehler[c.i]) zeilen.push('!! Umriss passt nicht zum Bau');
  tt.textContent = zeilen.join('\n');
  tt.hidden = false;
  tt.style.left = (ev.clientX + 16) + 'px';
  tt.style.top = (ev.clientY + 16) + 'px';
});

cv.addEventListener('mouseleave', () => { $('#tooltip').hidden = true; });
window.addEventListener('mouseup', () => {
  if (ziehen && ziehen.vorlage) merkeVorlage();
  ziehen = null; malt = false;
  cv.style.cursor = werkzeug === 'zeigen' ? 'grab' : 'crosshair';
  if (geaendert) { zeigeKennzahlen(); zeigeLegende(); }
});

cv.addEventListener('wheel', ev => {
  ev.preventDefault();
  const r = cv.getBoundingClientRect();
  const mx = ev.clientX - r.left, my = ev.clientY - r.top;
  const alt = zoom;
  zoom = Math.min(8, Math.max(0.25, zoom * (ev.deltaY < 0 ? 1.15 : 1 / 1.15)));
  offX = mx - (mx - offX) * (zoom / alt);
  offY = my - (my - offY) * (zoom / alt);
  malen_();
}, { passive: false });

// ---------- Speichern ----------
async function speichereNach(ziel, wohin) {
  if (!dorf) return;
  $('#status').textContent = 'speichere …';
  const antwort = await fetch('/api/speichern', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quelle: dorf.pfad, ziel,
      bauten: dorf.bauten, schritte: dorf.schritte,
      pausenlaenge: dorf.pausenlaenge,
    }),
  }).then(r => r.json());
  if (antwort.fehler) {
    $('#status').textContent = 'Fehler: ' + antwort.fehler;
    $('#speicherinfo').textContent = antwort.fehler;
    return;
  }
  setzeGeaendert(false);
  $('#status').textContent = `gespeichert nach ${wohin} · ${(antwort.groesse / 1024).toFixed(1)} KB`;
  $('#speicherinfo').textContent = antwort.sicherung ? 'Sicherung: _backup' : 'neue Datei angelegt';
  ladeListe();
}

$('#speichern').onclick = () => {
  if (confirm('Original überschreiben? Eine Sicherung wird in _backup angelegt.'))
    speichereNach(dorf.pfad, dorf.datei);
};
$('#speichernAls').onclick = () => {
  const name = prompt('Name des neuen Dorfes:', dorf.datei.replace(/\.aiv$/i, '') + '_neu');
  if (!name) return;
  const ordner = dorf.pfad.slice(0, dorf.pfad.lastIndexOf('\\') + 1);
  speichereNach(ordner + name + '.aiv', name + '.aiv');
};
$('#insSpiel').onclick = () => {
  const ziel = $('#spielziel').value;
  if (!ziel) return;
  const t = ziele.find(z => z.pfad === ziel);
  if (!confirm(`Nach "${t.datei}" im Spiel schreiben?\n\nSicherung kommt in _backup.\nDanach im Spiel nur das Gefecht neu starten.`)) return;
  speichereNach(ziel, t.datei);
};

// ---------- Bedienung ----------
$('#suche').addEventListener('input', zeichneListe);
$('#zoomRein').onclick = () => { zoom = Math.min(8, zoom * 1.25); malen_(); };
$('#zoomRaus').onclick = () => { zoom = Math.max(0.25, zoom / 1.25); malen_(); };
$('#zoomFit').onclick = einpassen;
$('#rueckgaengig').onclick = rueckgaengig;
$('#pinsel').addEventListener('input', () => $('#pinselWert').textContent = $('#pinsel').value);
for (const b of document.querySelectorAll('.wz')) b.onclick = () => setzeWerkzeug(b.dataset.wz);
for (const id of ['ebBauten', 'ebSchritte', 'ebMauern', 'ebGruppen', 'ebSonst', 'ebUmriss', 'ebRaster'])
  $('#' + id).addEventListener('change', malen_);

window.addEventListener('keydown', ev => {
  if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'SELECT') return;
  if (ev.ctrlKey && ev.key.toLowerCase() === 'z') { ev.preventDefault(); rueckgaengig(); }
  else if (ev.key === '1') setzeWerkzeug('zeigen');
  else if (ev.key === '2') setzeWerkzeug('malen');
  else if (ev.key === '3') setzeWerkzeug('radieren');
  else if (ev.key === '4') setzeWerkzeug('pipette');
});

window.addEventListener('beforeunload', ev => { if (geaendert) { ev.preventDefault(); ev.returnValue = ''; } });
// ---------- Vorlage bedienen ----------
// Die Karten des Spiels bringen ihre eigene Vorschau mit: 200x200 Punkte,
// senkrecht von oben. Startgroesse 4 heisst: die Vorschau deckt 400 Felder ab,
// also viermal die Kantenlaenge des Dorfrasters. Das ist der Anfangswert,
// nicht gemessen - mit „Größe" nachziehen.
async function ladeKarten() {
  const sel = $('#karteWahl');
  try {
    const r = await fetch('/api/karten').then(r => r.json());
    for (const k of r.karten) {
      const o = document.createElement('option');
      o.value = k.pfad; o.textContent = k.name;
      sel.appendChild(o);
    }
    sel.firstChild.textContent = `Karte des Spiels wählen … (${r.karten.length})`;
  } catch { sel.firstChild.textContent = 'keine Karten gefunden'; }
}

$('#karteWahl').onchange = async ev => {
  const kartePfad = ev.target.value;
  if (!kartePfad || !dorf) return;
  $('#status').textContent = 'lese Karte …';
  const a = await fetch('/api/vorlage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pfad: dorf.pfad, kartePfad, x: 0, y: 0, skala: 4, deckkraft: .75, sichtbar: true }),
  }).then(r => r.json());
  if (a.fehler) { $('#status').textContent = 'Fehler: ' + a.fehler; return; }
  await ladeVorlage();
  $('#status').textContent = 'Karte als Vorlage gesetzt — mit „Verschieben" und „Größe" auf das Dorf ausrichten';
};

$('#vorlageWaehlen').onclick = () => $('#vorlageDatei').click();
$('#vorlageDatei').onchange = ev => {
  const f = ev.target.files[0];
  if (!f || !dorf) return;
  const leser = new FileReader();
  leser.onload = () => {
    const bild = new Image();
    bild.onload = () => {
      vorlage.bild = bild;
      // erstmal so legen, dass die Vorlage das Raster ausfüllt
      vorlage.x = 0; vorlage.y = 0; vorlage.skala = 1; vorlage.sichtbar = true;
      $('#vorlageSkala').value = 100; $('#vorlageSkalaWert').textContent = 100;
      $('#vorlageAn').checked = true;
      vorlageReglerAn(true);
      malen_();
      merkeVorlage(leser.result);
      $('#status').textContent = 'Vorlage gesetzt — mit „Verschieben" ausrichten, mit „Größe" anpassen';
    };
    bild.src = leser.result;
  };
  leser.readAsDataURL(f);
  ev.target.value = '';
};
$('#vorlageAn').onchange = () => { vorlage.sichtbar = $('#vorlageAn').checked; malen_(); merkeVorlage(); };
$('#vorlageDeck').oninput = () => {
  vorlage.deckkraft = +$('#vorlageDeck').value / 100;
  $('#vorlageDeckWert').textContent = $('#vorlageDeck').value;
  malen_(); merkeVorlage();
};
$('#vorlageSkala').oninput = () => {
  vorlage.skala = +$('#vorlageSkala').value / 100;
  $('#vorlageSkalaWert').textContent = $('#vorlageSkala').value;
  malen_(); merkeVorlage();
};
$('#vorlageSchieben').onclick = () => {
  vorlageSchiebt = !vorlageSchiebt;
  $('#vorlageSchieben').textContent = 'Verschieben: ' + (vorlageSchiebt ? 'an' : 'aus');
  malen_();
};
$('#vorlageWeg').onclick = async () => {
  if (!dorf || !confirm('Vorlage für dieses Dorf entfernen?')) return;
  await fetch('/api/vorlage', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pfad: dorf.pfad, entfernen: true }),
  });
  vorlage.bild = null; vorlageSchiebt = false;
  $('#vorlageSchieben').textContent = 'Verschieben: aus';
  vorlageReglerAn(false);
  malen_();
};

window.addEventListener('resize', groesseAnpassen);
ladeKarten();
groesseAnpassen();

// Direktlink auf ein Dorf: /?dorf=Emir3 öffnet es gleich beim Laden.
// Nützlich zum Verlinken, und die Bildaufnahme für das Handbuch braucht es.
ladeGebaeude().then(ladeListe).then(() => {
  const wunsch = new URLSearchParams(location.search).get('dorf');
  if (!wunsch) return;
  const d = doerfer.find(x => x.name.toLowerCase() === wunsch.toLowerCase());
  if (d) return ladeDorf(d.pfad, d.name);
  $('#status').textContent = `Dorf „${wunsch}" nicht gefunden`;
});
