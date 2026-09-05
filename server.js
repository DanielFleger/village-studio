// Village Studio - kleiner lokaler Server, ohne Fremdpakete.
// Liefert die Oberflaeche aus, liest und schreibt AIV-Dateien.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { decode } = require('./lib/aiv');
const { writeAivMit } = require('./lib/aivwrite');
const { vorschauAlsPng } = require('./lib/karte');
const webbilder = require('./lib/webbilder');

const PORT = 8790;
const HIER = __dirname;

const VILLAGE_DIR = path.resolve(HIER, '..', 'Village');
const DORF_ORDNER = [
  path.join(VILLAGE_DIR, 'villages'),
  path.join(VILLAGE_DIR, 'aiv'),
  VILLAGE_DIR,
];

// Stronghold-Installation: aus config.json, sonst der uebliche Steam-Pfad
function spielOrdner() {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(HIER, 'config.json'), 'utf8'));
    if (c.stronghold && fs.existsSync(c.stronghold)) return c.stronghold;
  } catch { }
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

function listeDoerfer() {
  const treffer = [];
  for (const ordner of DORF_ORDNER) {
    let namen;
    try { namen = fs.readdirSync(ordner); } catch { continue; }
    for (const n of namen) {
      if (!n.toLowerCase().endsWith('.aiv')) continue;
      const voll = path.join(ordner, n);
      let st; try { st = fs.statSync(voll); } catch { continue; }
      if (!st.isFile()) continue;
      if (treffer.some(t => t.pfad === voll)) continue;
      treffer.push({
        name: n.replace(/\.aiv$/i, ''), datei: n, pfad: voll,
        ordner: path.basename(ordner), groesse: st.size,
        geaendert: st.mtime.toISOString(),
      });
    }
  }
  treffer.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  return treffer;
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
  if (DORF_ORDNER.some(o => norm.startsWith(path.resolve(o).toLowerCase() + path.sep))) return true;
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

  if (u.pathname === '/api/doerfer')
    return sendeJson(res, 200, { ordner: DORF_ORDNER, doerfer: listeDoerfer(), spiel: spielOrdner() });

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
  const mBild = u.pathname.match(/^\/bilder\/(\d+)\.png$/);
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
  for (const o of DORF_ORDNER) console.log('  ' + o + (fs.existsSync(o) ? '' : '   (fehlt)'));
  const s = spielOrdner();
  console.log('Stronghold: ' + (s || 'nicht gefunden - config.json anlegen mit {"stronghold":"...pfad..."}'));
});
