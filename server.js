// Village Studio - kleiner lokaler Server, ohne Fremdpakete.
// Liefert die Oberflaeche aus, liest und schreibt AIV-Dateien.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { decode } = require('./lib/aiv');
const { writeAivMit } = require('./lib/aivwrite');

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
