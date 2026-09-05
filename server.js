// Village Studio - kleiner lokaler Server, ohne Fremdpakete.
// Liefert die Oberflaeche aus, liest und schreibt AIV-Dateien.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { decode } = require('./lib/aiv');
const { writeAivMit } = require('./lib/aivwrite');
const { vorschauAlsPng } = require('./lib/karte');
const webbilder = require('./lib/webbilder');

const PORT = 8790;
const HIER = __dirname;

const VILLAGE_DIR = path.resolve(HIER, '..', 'Village');

// Wo AIV-Dateien gesucht werden. Die ersten drei sind der Ordner des alten
// Editors neben diesem hier - so liegt es auf dem Entwicklungsrechner. Wer
// das Werkzeug irgendwohin klont, hat den nicht: darum sucht es auch im
// eigenen Ordner "aiv" und im aiv-Ordner der Stronghold-Installation.
// Die Reihenfolge entscheidet nur, was zuerst in der Liste steht.
function dorfOrdner() {
  const o = [
    path.join(VILLAGE_DIR, 'villages'),
    path.join(VILLAGE_DIR, 'aiv'),
    VILLAGE_DIR,
    path.join(HIER, 'aiv'),
  ];
  const spiel = spielOrdner();
  if (spiel) o.push(path.join(spiel, 'aiv'));
  // Eigene Ordner aus der config.json - "doerfer": ["D:\Meine AIV-Dateien"]
  for (const e of (einstellungen().doerfer || [])) if (typeof e === 'string') o.push(e);
  return o;
}

// config.json neben dem Werkzeug: { "stronghold": "...", "doerfer": ["..."] }
function einstellungen() {
  try { return JSON.parse(fs.readFileSync(path.join(HIER, 'config.json'), 'utf8')); }
  catch { return {}; }
}

// Stronghold-Installation: aus der config.json, sonst der uebliche Steam-Pfad
function spielOrdner() {
  const c = einstellungen();
  if (c.stronghold && fs.existsSync(c.stronghold)) return c.stronghold;
  const std = 'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Stronghold Crusader Extreme';
  return fs.existsSync(std) ? std : null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

// Alle regulären AIV-Dateien unter den Suchordnern erfassen. Verzeichnislinks
// werden nicht verfolgt, damit die Suche im gewählten Baum bleibt.
function sucheAiv(wurzel, treffer, wurzelName, gesehen = new Set(), besucht = new Set()) {
  const schluessel = p => process.platform === 'win32' ? path.resolve(p).toLowerCase() : path.resolve(p);
  const offen = [path.resolve(wurzel)];
  while (offen.length) {
    const ordner = offen.pop();
    const key = schluessel(ordner);
    if (besucht.has(key)) continue;
    besucht.add(key);
    let eintraege;
    try { eintraege = fs.readdirSync(ordner, { withFileTypes: true }); } catch { continue; }
    for (const e of eintraege) {
      const voll = path.join(ordner, e.name);
      if (e.isDirectory()) { offen.push(voll); continue; }
      if (!e.isFile() || !e.name.toLowerCase().endsWith('.aiv')) continue;
      const dateiKey = schluessel(voll);
      if (gesehen.has(dateiKey)) continue;
      let st; try { st = fs.statSync(voll); } catch { continue; }
      gesehen.add(dateiKey);
      treffer.push({
        name: e.name.replace(/\.aiv$/i, ''), datei: e.name, pfad: voll,
        ordner: path.basename(ordner), wurzel: wurzelName,
        herkunft: path.join(wurzelName, path.relative(wurzel, ordner)),
        groesse: st.size, geaendert: st.mtime.toISOString(),
      });
    }
  }
}

function listeDoerfer() {
  const treffer = [], gesehen = new Set(), besucht = new Set();
  for (const ordner of dorfOrdner())
    sucheAiv(ordner, treffer, path.basename(ordner), gesehen, besucht);
  treffer.sort((a, b) => a.name.localeCompare(b.name, 'de') || a.pfad.localeCompare(b.pfad, 'de'));
  return treffer;
}

// Einen eigenen Ordner merken oder wieder vergessen. Er landet in der
// config.json neben dem Werkzeug, damit er den naechsten Start ueberlebt.
function merkeOrdner(pfad, entfernen) {
  const c = einstellungen();
  const liste = Array.isArray(c.doerfer) ? c.doerfer.slice() : [];
  const gleich = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
  const drin = liste.findIndex(o => gleich(o, pfad));
  if (entfernen) { if (drin < 0) return { fehler: 'nicht in der Liste' }; liste.splice(drin, 1); }
  else {
    if (!fs.existsSync(pfad)) return { fehler: 'Diesen Ordner gibt es nicht: ' + pfad };
    if (!fs.statSync(pfad).isDirectory()) return { fehler: 'Das ist kein Ordner: ' + pfad };
    if (drin >= 0) return { ordner: liste };
    liste.push(pfad);
  }
  c.doerfer = liste;
  fs.writeFileSync(path.join(HIER, 'config.json'), JSON.stringify(c, null, 2) + '\n');
  return { ordner: liste };
}

// Der Windows-Ordnerdialog. Der Server laeuft auf demselben Rechner wie der
// Browser, darum darf er ihn oeffnen - im Browser selbst gibt es keinen Weg
// an einen echten Pfad zu kommen.
function ordnerDialog() {
  const ps = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$oben = New-Object System.Windows.Forms.Form',
    '$oben.TopMost = $true',
    '$d = New-Object System.Windows.Forms.FolderBrowserDialog',
    "$d.Description = 'Ordner mit AIV-Dateien waehlen'",
    '$d.ShowNewFolderButton = $false',
    'if ($d.ShowDialog($oben) -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.SelectedPath }',
    '$oben.Dispose()',
  ].join('; ');
  try {
    return execFileSync('powershell', ['-NoProfile', '-STA', '-Command', ps],
      { encoding: 'utf8', timeout: 180000 }).trim();
  } catch { return ''; }
}

// Wohin das Spiel schaut: die mapping.json der UCP3-KI-Ordner
function spielZiele() {
  const spiel = spielOrdner();
  const ziele = [];
  if (!spiel) return ziele;
  const pluginDir = path.join(spiel, 'ucp', 'plugins');
  let plugins = [];
  try { plugins = fs.readdirSync(pluginDir); } catch { return ziele; }
  for (const pl of plugins) {
    const aiDir = path.join(pluginDir, pl, 'resources', 'ai');
    let kis = [];
    try { kis = fs.readdirSync(aiDir); } catch { continue; }
    for (const ki of kis) {
      const mapDatei = path.join(aiDir, ki, 'aiv', 'mapping.json');
      if (!fs.existsSync(mapDatei)) continue;
      let map;
      try { map = JSON.parse(fs.readFileSync(mapDatei, 'utf8')); } catch { continue; }
      for (const [slot, datei] of Object.entries(map)) {
        if (typeof datei !== 'string') continue;
        const ziel = path.join(aiDir, ki, 'aiv', datei);
        ziele.push({
          plugin: pl, ki, slot, datei, pfad: ziel,
          vorhanden: fs.existsSync(ziel),
        });
      }
    }
  }
  // Dazu die Original-Burgen des Spiels
  const aivDir = path.join(spiel, 'aiv');
  if (fs.existsSync(aivDir)) {
    for (const n of fs.readdirSync(aivDir)) {
      if (!n.toLowerCase().endsWith('.aiv')) continue;
      ziele.push({ plugin: '(Spiel)', ki: 'Original', slot: n.replace(/\.aiv$/i, ''), datei: n,
                   pfad: path.join(aivDir, n), vorhanden: true });
    }
  }
  return ziele;
}

// Vorlagen (Kartenbilder unter dem Raster) liegen gesammelt neben den Doerfern
const VORLAGEN = path.join(VILLAGE_DIR, '_vorlagen');
function vorlageName(dorfPfad) {
  return path.basename(dorfPfad, '.aiv').replace(/[^A-Za-z0-9_. -]/g, '_');
}
function vorlagePng(dorfPfad) { return path.join(VORLAGEN, vorlageName(dorfPfad) + '.png'); }
function vorlageJson(dorfPfad) { return path.join(VORLAGEN, vorlageName(dorfPfad) + '.json'); }

// Karten des Spiels und der Plugins
function listeKarten() {
  const spiel = spielOrdner();
  if (!spiel) return [];
  const ordner = [path.join(spiel, 'maps')];
  const pluginDir = path.join(spiel, 'ucp', 'plugins');
  try {
    for (const pl of fs.readdirSync(pluginDir)) {
      const m = path.join(pluginDir, pl, 'resources', 'maps');
      if (fs.existsSync(m)) ordner.push(m);
    }
  } catch { }
  const treffer = [];
  for (const o of ordner) {
    let namen; try { namen = fs.readdirSync(o); } catch { continue; }
    for (const n of namen) {
      if (!n.toLowerCase().endsWith('.map')) continue;
      treffer.push({ name: n.replace(/\.map$/i, ''), pfad: path.join(o, n),
                     quelle: path.basename(path.dirname(o)) });
    }
  }
  treffer.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  return treffer;
}

function darfSchreiben(p) {
  const norm = path.resolve(p).toLowerCase();
  if (dorfOrdner().some(o => norm.startsWith(path.resolve(o).toLowerCase() + path.sep))) return true;
  const spiel = spielOrdner();
  if (spiel && norm.startsWith(path.resolve(spiel).toLowerCase() + path.sep)) return true;
  return false;
}

function sichern(datei) {
  if (!fs.existsSync(datei)) return null;
  const ordner = path.join(path.dirname(datei), '_backup');
  fs.mkdirSync(ordner, { recursive: true });
  const stempel = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const ziel = path.join(ordner, path.basename(datei, '.aiv') + '_' + stempel + '.aiv');
  fs.copyFileSync(datei, ziel);
  return ziel;
}

function sendeJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function leseKoerper(req) {
  return new Promise((ok, fehler) => {
    let d = '';
    req.on('data', c => { d += c; if (d.length > 40e6) req.destroy(); });
    req.on('end', () => { try { ok(JSON.parse(d)); } catch (e) { fehler(e); } });
    req.on('error', fehler);
  });
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');

  // Einen eigenen AIV-Ordner hinzufuegen oder entfernen
  if (u.pathname === '/api/ordner' && req.method === 'POST') {
    let d;
    try { d = await leseKoerper(req); } catch { return sendeJson(res, 400, { fehler: 'ungueltige Anfrage' }); }
    if (!d.pfad) return sendeJson(res, 400, { fehler: 'kein Pfad angegeben' });
    try {
      const erg = merkeOrdner(String(d.pfad).trim(), !!d.entfernen);
      if (erg.fehler) return sendeJson(res, 400, erg);
      return sendeJson(res, 200, { eigene: erg.ordner, doerfer: listeDoerfer() });
    } catch (e) { return sendeJson(res, 500, { fehler: e.message }); }
  }

  // Den Windows-Ordnerdialog oeffnen und den gewaehlten Pfad zurueckgeben
  if (u.pathname === '/api/ordnerwaehlen') {
    const p = ordnerDialog();
    return sendeJson(res, 200, { pfad: p });
  }

  if (u.pathname === '/api/doerfer')
    return sendeJson(res, 200, {
      ordner: dorfOrdner(),
      // fuer die Fehlersuche in der Oberflaeche: welcher Ordner ist da, welcher nicht
      ordnerInfo: dorfOrdner().map(o => ({ pfad: o, da: fs.existsSync(o) })),
      eigene: einstellungen().doerfer || [],
      doerfer: listeDoerfer(), spiel: spielOrdner(),
    });

  if (u.pathname === '/api/gebaeude') {
    try {
      return sendeJson(res, 200, JSON.parse(fs.readFileSync(path.join(HIER, 'lib', 'gebaeude.json'), 'utf8')));
    } catch (e) {
      return sendeJson(res, 500, { fehler: e.message });
    }
  }

  if (u.pathname === '/api/spielziele')
    return sendeJson(res, 200, { spiel: spielOrdner(), ziele: spielZiele() });

  // Spielgrafiken fuer die schraege Ansicht - aus den gm1-Dateien, nach lib/gebaeude_bilder.json
  if (u.pathname === '/api/bilder') {
    try { return sendeJson(res, 200, webbilder.bilderIndex()); }
    catch (e) { return sendeJson(res, 500, { fehler: e.message }); }
  }
  const mBild = u.pathname.match(/^\/bilder\/([a-z0-9_]+)\.png$/i);
  if (mBild) {
    let png = null;
    try { png = webbilder.bildPng(mBild[1]); } catch (e) { res.writeHead(500); return res.end(e.message); }
    if (!png) { res.writeHead(404); return res.end('kein Bild fuer Nummer ' + mBild[1]); }
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-cache' });
    return res.end(png);
  }

  // Jedes einzelne Gebaeudebild, angesprochen wie in der Zuordnung: /bild/tile_castle/713.png
  const mRoh = u.pathname.match(/^\/bild\/([a-z0-9_]+)\/(\d+)\.png$/i);
  if (mRoh) {
    let png = null;
    try { png = webbilder.pngVon(mRoh[1] + '#' + mRoh[2]); } catch (e) { res.writeHead(500); return res.end(e.message); }
    if (!png) { res.writeHead(404); return res.end('kein Bild ' + mRoh[1] + '#' + mRoh[2]); }
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=86400' });
    return res.end(png);
  }

  // Die Pruefseite: Zuordnung, ganzer Bildervorrat, bisherige Urteile
  const mSkin = u.pathname.match(/^\/skin\/(\d+)\.png$/);
  if (mSkin) {
    const buf = webbilder.leseSkin(mSkin[1]);
    if (!buf) { res.writeHead(404); return res.end('kein Skin ' + mSkin[1]); }
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=86400' });
    return res.end(buf);
  }
  if (u.pathname === '/api/vorplaetze') {
    try { return sendeJson(res, 200, webbilder.vorplaetze()); }
    catch (e) { return sendeJson(res, 500, { fehler: e.message }); }
  }
  if (u.pathname === '/api/pruefstand') {
    try { return sendeJson(res, 200, webbilder.pruefstand()); }
    catch (e) { return sendeJson(res, 500, { fehler: e.message }); }
  }
  // Urteil speichern. Zwei Formen: { id, eintrag } aendert genau einen Eintrag
  // (so koennen zwei offene Seiten sich nicht ueberschreiben), { urteile }
  // ersetzt alles - das kann noch eine alte, nicht neu geladene Seite schicken.
  if (u.pathname === '/api/urteil' && req.method === 'POST') {
    let k;
    try { k = await leseKoerper(req); } catch { return sendeJson(res, 400, { fehler: 'ungueltige Anfrage' }); }
    try {
      if (k.id !== undefined) return sendeJson(res, 200, webbilder.speichereUrteil(String(k.id), k.eintrag));
      return sendeJson(res, 200, webbilder.speichereUrteile(k.urteile || {}));
    } catch (e) { return sendeJson(res, 500, { fehler: e.message }); }
  }

  // Screenshot aus dem Spiel an eine Bau-Nummer heften
  if (u.pathname === '/api/pruefbild' && req.method === 'POST') {
    let k;
    try { k = await leseKoerper(req); } catch { return sendeJson(res, 400, { fehler: 'ungueltige Anfrage' }); }
    try {
      const m = String(k.daten || '').match(/^data:image\/([a-z]+);base64,(.+)$/i);
      if (!m) return sendeJson(res, 400, { fehler: 'kein Bild erkannt' });
      const endung = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
      const name = webbilder.speicherePruefbild(String(k.id), endung, Buffer.from(m[2], 'base64'));
      return sendeJson(res, 200, { name });
    } catch (e) { return sendeJson(res, 500, { fehler: e.message }); }
  }
  const mPruef = u.pathname.match(/^\/pruefbild\/([A-Za-z0-9_.]+)$/);
  if (mPruef) {
    const buf = webbilder.lesePruefbild(mPruef[1]);
    if (!buf) { res.writeHead(404); return res.end('kein Bild'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(mPruef[1])] || 'image/png' });
    return res.end(buf);
  }
  if (u.pathname === '/pruefen') { res.writeHead(302, { Location: '/pruefen.html' }); return res.end(); }

  if (u.pathname === '/api/dorf') {
    const p = u.searchParams.get('pfad');
    const bekannt = listeDoerfer().some(d => d.pfad === p) || spielZiele().some(z => z.pfad === p);
    if (!bekannt) return sendeJson(res, 400, { fehler: 'Datei liegt nicht in einem bekannten Ordner' });
    try {
      const buf = fs.readFileSync(p);
      const daten = decode(buf);
      daten.datei = path.basename(p);
      daten.pfad = p;
      daten.dateigroesse = buf.length;
      return sendeJson(res, 200, daten);
    } catch (e) {
      return sendeJson(res, 500, { fehler: e.message });
    }
  }

  if (u.pathname === '/api/speichern' && req.method === 'POST') {
    let k;
    try { k = await leseKoerper(req); } catch { return sendeJson(res, 400, { fehler: 'ungueltige Anfrage' }); }
    const quelle = k.quelle, ziel = k.ziel;
    if (!quelle || !fs.existsSync(quelle)) return sendeJson(res, 400, { fehler: 'Quelldatei fehlt' });
    if (!ziel || !darfSchreiben(ziel)) return sendeJson(res, 400, { fehler: 'Ziel liegt ausserhalb der erlaubten Ordner' });
    try {
      const original = fs.readFileSync(quelle);
      const neu = writeAivMit(original, {
        bauten: k.bauten, schritte: k.schritte, pausenlaenge: k.pausenlaenge,
      });
      const kopie = sichern(ziel);
      fs.mkdirSync(path.dirname(ziel), { recursive: true });
      fs.writeFileSync(ziel, neu);
      return sendeJson(res, 200, { ok: true, ziel, groesse: neu.length, sicherung: kopie });
    } catch (e) {
      return sendeJson(res, 500, { fehler: e.message });
    }
  }

  // ---- Karten des Spiels ----
  if (u.pathname === '/api/karten') return sendeJson(res, 200, { karten: listeKarten() });

  if (u.pathname === '/api/karte') {
    const p = u.searchParams.get('pfad');
    if (!listeKarten().some(k => k.pfad === p)) return sendeJson(res, 400, { fehler: 'Karte unbekannt' });
    try {
      const png = vorschauAlsPng(fs.readFileSync(p));
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
      return res.end(png);
    } catch (e) {
      return sendeJson(res, 500, { fehler: e.message });
    }
  }

  // ---- Vorlage: ein Kartenbild, das unter dem Raster liegt ----
  if (u.pathname === '/api/vorlage' && req.method === 'GET') {
    const p = u.searchParams.get('pfad');
    if (!p) return sendeJson(res, 400, { fehler: 'Pfad fehlt' });
    try {
      const j = JSON.parse(fs.readFileSync(vorlageJson(p), 'utf8'));
      j.bild = '/vorlage/' + encodeURIComponent(vorlageName(p)) + '.png?t=' + Date.now();
      return sendeJson(res, 200, j);
    } catch {
      return sendeJson(res, 200, { vorhanden: false });
    }
  }

  if (u.pathname === '/api/vorlage' && req.method === 'POST') {
    let k;
    try { k = await leseKoerper(req); } catch { return sendeJson(res, 400, { fehler: 'ungueltige Anfrage' }); }
    if (!k.pfad) return sendeJson(res, 400, { fehler: 'Pfad fehlt' });
    try {
      fs.mkdirSync(VORLAGEN, { recursive: true });
      if (k.entfernen) {
        for (const f of [vorlageJson(k.pfad), vorlagePng(k.pfad)])
          if (fs.existsSync(f)) fs.unlinkSync(f);
        return sendeJson(res, 200, { ok: true, entfernt: true });
      }
      if (k.bildBase64) {
        const roh = k.bildBase64.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(vorlagePng(k.pfad), Buffer.from(roh, 'base64'));
      } else if (k.kartePfad) {
        if (!listeKarten().some(x => x.pfad === k.kartePfad))
          return sendeJson(res, 400, { fehler: 'Karte unbekannt' });
        fs.writeFileSync(vorlagePng(k.pfad), vorschauAlsPng(fs.readFileSync(k.kartePfad)));
      }
      const stand = {
        vorhanden: true,
        x: k.x || 0, y: k.y || 0,
        skala: k.skala || 1,
        deckkraft: k.deckkraft === undefined ? 0.6 : k.deckkraft,
        sichtbar: k.sichtbar !== false,
      };
      fs.writeFileSync(vorlageJson(k.pfad), JSON.stringify(stand, null, 1));
      return sendeJson(res, 200, Object.assign({ ok: true }, stand));
    } catch (e) {
      return sendeJson(res, 500, { fehler: e.message });
    }
  }

  if (u.pathname.startsWith('/vorlage/')) {
    const name = decodeURIComponent(u.pathname.slice('/vorlage/'.length));
    const f = path.join(VORLAGEN, path.basename(name));
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end('keine Vorlage'); }
    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
    return res.end(fs.readFileSync(f));
  }

  let rel = u.pathname === '/' ? '/index.html' : u.pathname;
  const datei = path.join(HIER, 'web', path.normalize(rel).replace(/^[\\/]+/, ''));
  if (!datei.startsWith(path.join(HIER, 'web'))) { res.writeHead(403); return res.end('verboten'); }
  fs.readFile(datei, (err, data) => {
    if (err) { res.writeHead(404); res.end('nicht gefunden'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(datei)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('Village Studio laeuft auf http://localhost:' + PORT);
  console.log('Doerfer aus:');
  for (const o of dorfOrdner()) console.log('  ' + o + (fs.existsSync(o) ? '' : '   (fehlt)'));
  const s = spielOrdner();
  console.log('Stronghold: ' + (s || 'nicht gefunden - config.json anlegen mit {"stronghold":"...pfad..."}'));
});
