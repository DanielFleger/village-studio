// Prüfseite: Zuordnung Bau-Nummer -> Bild durchgehen, austauschen, urteilen.
//
// Was Daniel tut, landet sofort in lib/zuordnung_urteil.json auf der Platte -
// kein Abtippen, kein Kopieren. Ein umgehängtes Bild gilt ab dem nächsten
// Neuladen auch in der schrägen Ansicht des Editors.
//
// Gespeichert wird IMMER nur der eine geänderte Eintrag. Zwei offene Seiten
// können sich sonst gegenseitig überschreiben - das ist am 05.09. beinahe
// passiert, als eine zweite Seite mit altem Stand mitgeschrieben hätte.

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let stand = null;          // Antwort von /api/pruefstand
let urteile = {};          // id -> { urteil, bild, notiz, bilder[] }
let filter = 'offen';
let offen = null;          // Nummer, deren Sammlung gerade rechts steht
let alleGroessen = false;  // Sammlung: nur passende Grundfläche oder alles
let gewaehlt = null;       // zuletzt angeklickte Karte - dorthin geht Einfügen

const bildUrl = s => '/bild/' + s.replace('#', '/') + '.png';

// ---------- Laden ----------
async function laden() {
  stand = await fetch('/api/pruefstand').then(r => r.json());
  if (stand.fehler) { $('#karten').textContent = 'Fehler: ' + stand.fehler; return; }
  urteile = stand.urteile || {};
  zeichne();
}

// ---------- Karten ----------
function passtZuFilter(e) {
  const u = urteile[e.id];
  if (filter === 'alle') return true;
  if (filter === 'offen') return !u || !u.urteil;
  if (filter === 'vermutet') return e.stand === 'vermutet';
  if (filter === 'sicher') return e.stand === 'sicher';
  return true;
}

function kachelnVon(bild) {
  for (const [n, liste] of Object.entries(stand.pool))
    if (liste.some(p => p.bild === bild)) return +n;
  return null;
}

function karteHtml(e) {
  const u = urteile[e.id] || {};
  const bild = u.bild || e.bild;
  const klasse = u.bild ? 'gesetzt' : (e.stand === 'sicher' ? 'sicher' : (bild ? 'vermutet' : 'leer'));
  const an = w => u.urteil === w ? ' an' : '';
  const nBild = kachelnVon(bild);
  const warnung = nBild && nBild !== e.kacheln
    ? `<div class="warnung">Achtung: dieses Bild ist ${nBild}×${nBild}, der Bau ist ${e.kacheln}×${e.kacheln} — im Editor wird es dann nicht gezeichnet. Als Hinweis für mich ist es trotzdem gespeichert.</div>` : '';
  const shots = (u.bilder || []).map(n =>
    `<a class="shot" href="/pruefbild/${n}" target="_blank" title="${n}"><img src="/pruefbild/${n}" loading="lazy" alt="Screenshot"></a>`).join('');
  return `<div class="karte ${klasse}" data-id="${e.id}" data-n="${e.kacheln}" tabindex="0">
  <div class="bild">${bild ? `<img src="${bildUrl(bild)}" alt="Nr ${e.id}" loading="lazy">`
    : '<span class="leerbild">kein Bild<br>Kachel herziehen</span>'}</div>
  <div class="rechts">
    <div class="kopf"><span class="nr">${e.id}</span> <b>${e.name}</b></div>
    <div class="meta">${e.kacheln}×${e.kacheln} Kacheln · ${bild || 'noch nichts zugeordnet'}${e.gruppe > 1 ? ` · ${e.gruppe} Fassungen` : ''}</div>
    <p class="beleg">${e.beleg || ''}</p>
    ${u.bild && u.bild !== e.bild ? `<div class="getauscht">von dir umgehängt — vorher ${e.bild}</div>` : ''}
    ${warnung}
    <div class="knoepfe">
      <button class="u${an('passt')}" data-u="passt">passt</button>
      <button class="u${an('unsichtbar')}" data-u="unsichtbar">Grafik sehe ich nicht</button>
      <button class="u${an('unvollstaendig')}" data-u="unvollstaendig">Grafik nicht vollständig</button>
      <button class="u" data-u="sammlung">andere Grafik …</button>
      <button class="u" data-u="shot">Screenshot …</button>
    </div>
    ${shots ? `<div class="shots">${shots}</div>` : ''}
    <input class="notiz" placeholder="Notiz (wird mitgespeichert)" value="${(u.notiz || '').replace(/"/g, '&quot;')}">
  </div>
</div>`;
}

function zeichne() {
  const liste = stand.eintraege.filter(passtZuFilter);
  $('#karten').innerHTML = liste.length ? liste.map(karteHtml).join('') : '<p>Nichts in dieser Auswahl.</p>';
  const gefaellt = Object.values(urteile).filter(u => u.urteil).length;
  $('#zaehler').textContent = `${stand.eintraege.length} Nummern · ${gefaellt} beurteilt · ${stand.eintraege.length - gefaellt} offen`;
  bindeKarten();
}

function bindeKarten() {
  for (const k of $$('.karte')) {
    const id = k.dataset.id;
    k.onclick = () => { gewaehlt = id; $$('.karte').forEach(x => x.classList.toggle('gewaehlt', x === k)); };
    for (const b of k.querySelectorAll('.u')) b.onclick = ev => {
      ev.stopPropagation(); gewaehlt = id;
      if (b.dataset.u === 'sammlung') return zeigeSammlung(id);
      if (b.dataset.u === 'shot') return dateiWaehlen(id);
      const u = urteile[id] = urteile[id] || {};
      u.urteil = u.urteil === b.dataset.u ? null : b.dataset.u;
      speichern(id); zeichne();
    };
    k.querySelector('.notiz').onchange = ev => {
      (urteile[id] = urteile[id] || {}).notiz = ev.target.value;
      speichern(id);
    };
    k.querySelector('.bild').onclick = ev => { ev.stopPropagation(); gewaehlt = id; zeigeSammlung(id); };

    // Ziel für Kacheln aus der Sammlung UND für Screenshot-Dateien
    k.ondragover = ev => { ev.preventDefault(); k.classList.add('ziel'); };
    k.ondragleave = () => k.classList.remove('ziel');
    k.ondrop = async ev => {
      ev.preventDefault(); k.classList.remove('ziel');
      const datei = [...(ev.dataTransfer.files || [])].find(f => f.type.startsWith('image/'));
      if (datei) return sendeShot(id, await alsDataUrl(datei));
      const bild = ev.dataTransfer.getData('text/plain');
      if (!bild || !bild.includes('#')) return;
      const u = urteile[id] = urteile[id] || {};
      u.bild = bild;
      if (!u.urteil) u.urteil = 'passt';
      speichern(id); zeichne(); zeigeSammlung(id);
    };
  }
}

// ---------- Sammlung ----------
function zeigeSammlung(id) {
  const e = stand.eintraege.find(x => String(x.id) === String(id));
  if (!e) return;
  offen = e;
  const jetzt = (urteile[id] || {}).bild || e.bild;

  let liste;
  if (alleGroessen) {
    liste = [];
    for (const n of Object.keys(stand.pool).map(Number).sort((a, b) => a - b))
      for (const p of stand.pool[n]) liste.push(Object.assign({ n }, p));
  } else {
    liste = (stand.pool[e.kacheln] || []).map(p => Object.assign({ n: e.kacheln }, p));
  }

  const such = ($('#sammlungSuche').value || '').trim().toLowerCase();
  if (such) liste = liste.filter(p => p.bild.toLowerCase().includes(such));
  $('#sammlungInfo').textContent = `Nr ${e.id} ${e.name} · ${liste.length} Bilder`
    + (alleGroessen ? ' (alle Größen)' : ` mit ${e.kacheln}×${e.kacheln}`)
    + (such ? ` · gefiltert nach „${such}"` : '');
  $('#alleGroessen').classList.toggle('an', alleGroessen);
  $('#sammlungRaster').innerHTML = liste.map(p => `
    <div class="kachel${p.bild === jetzt ? ' aktuell' : ''}" draggable="true" data-bild="${p.bild}">
      <img src="${bildUrl(p.bild)}" alt="${p.pos}" loading="lazy">
      <b>${p.n}×${p.n} · ${p.pos}</b><small>${p.bild}</small>
    </div>`).join('');
  for (const kach of $$('.kachel')) {
    kach.ondragstart = ev => { ev.dataTransfer.setData('text/plain', kach.dataset.bild); };
    kach.ondblclick = () => {
      const u = urteile[e.id] = urteile[e.id] || {};
      u.bild = kach.dataset.bild;
      if (!u.urteil) u.urteil = 'passt';
      speichern(e.id); zeichne(); zeigeSammlung(e.id);
    };
  }
  $('#sammlung').classList.remove('zu');
}

// ---------- Screenshots ----------
function alsDataUrl(datei) {
  return new Promise(ok => { const l = new FileReader(); l.onload = () => ok(l.result); l.readAsDataURL(datei); });
}

function dateiWaehlen(id) {
  const ein = document.createElement('input');
  ein.type = 'file'; ein.accept = 'image/*'; ein.multiple = true;
  ein.onchange = async () => {
    for (const f of ein.files) await sendeShot(id, await alsDataUrl(f));
  };
  ein.click();
}

async function sendeShot(id, dataUrl) {
  $('#stand').textContent = 'Screenshot wird gespeichert …';
  try {
    const r = await fetch('/api/pruefbild', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, daten: dataUrl }),
    }).then(r => r.json());
    if (r.fehler) { $('#stand').textContent = 'FEHLER: ' + r.fehler; return; }
    const u = urteile[id] = urteile[id] || {};
    u.bilder = (u.bilder || []).concat(r.name);
    $('#stand').textContent = 'Screenshot gespeichert: ' + r.name;
    zeichne();
  } catch (e) { $('#stand').textContent = 'FEHLER: ' + e.message; }
}

// Einfügen aus der Zwischenablage geht auf die zuletzt angeklickte Karte
window.addEventListener('paste', async ev => {
  const bild = [...(ev.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
  if (!bild) return;
  if (!gewaehlt) { $('#stand').textContent = 'Erst eine Karte anklicken, dann einfügen.'; return; }
  ev.preventDefault();
  sendeShot(gewaehlt, await alsDataUrl(bild.getAsFile()));
});

// ---------- Speichern ----------
const warte = {};
function speichern(id) {
  clearTimeout(warte[id]);
  $('#stand').textContent = 'speichere …';
  warte[id] = setTimeout(async () => {
    try {
      const r = await fetch('/api/urteil', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, eintrag: urteile[id] || {} }),
      }).then(r => r.json());
      $('#stand').textContent = r.fehler
        ? 'FEHLER beim Speichern: ' + r.fehler
        : `Nr ${id} gespeichert · ` + new Date().toLocaleTimeString('de-DE');
    } catch (e) { $('#stand').textContent = 'FEHLER beim Speichern: ' + e.message; }
  }, 250);
}

// ---------- Bedienung ----------
for (const b of $$('.f')) b.onclick = () => {
  $$('.f').forEach(x => x.classList.toggle('aktiv', x === b));
  filter = b.dataset.f; zeichne();
};
$('#sammlungAuf').onclick = () => {
  const a = $('#sammlung');
  if (a.classList.contains('zu') && offen) zeigeSammlung(offen.id);
  else a.classList.toggle('zu');
};
$('#sammlungZu').onclick = () => $('#sammlung').classList.add('zu');
$('#alleGroessen').onclick = () => { alleGroessen = !alleGroessen; if (offen) zeigeSammlung(offen.id); };
$('#sammlungSuche').addEventListener('input', () => { if (offen) zeigeSammlung(offen.id); });
$('#alsText').onclick = () => {
  const zeilen = stand.eintraege.map(e => {
    const u = urteile[e.id] || {};
    if (!u.urteil && !u.bild && !u.notiz && !(u.bilder || []).length) return null;
    return `${e.id} ${e.name}: ${u.urteil || '—'}`
      + (u.bild && u.bild !== e.bild ? ' → ' + u.bild : '')
      + (u.notiz ? ' (' + u.notiz + ')' : '')
      + ((u.bilder || []).length ? ' [' + u.bilder.length + ' Screenshot(s)]' : '');
  }).filter(Boolean);
  $('#textFeld').value = zeilen.length ? zeilen.join('\n') : 'noch nichts beurteilt';
  $('#textFenster').showModal();
};
$('#textZu').onclick = () => $('#textFenster').close();

laden();
