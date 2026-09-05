// Den Stand dieses Arbeits-Repos ins oeffentliche DanielFleger/village-studio
// spiegeln.
//
// Das oeffentliche Repo ist KEIN Abbild dieses hier: es enthaelt nur das
// lauffaehige Werkzeug, nicht die Werkstatt - keine Doku, keine
// Untersuchungsskripte, keine Ghidra-Sachen, keine fremden Bilder. Welche
// Dateien hinueber gehen, steht darum hier ausdruecklich und nicht in einer
// Ausschlussliste: was neu dazukommt, kommt bewusst dazu.
//
// Aufruf:
//   node _spiegle_oeffentlich.js            nur zeigen, was sich aendern wuerde
//   node _spiegle_oeffentlich.js --schreibe kopieren, committen und pushen
//
// Der Klon liegt in einem Wegwerf-Ordner; das Zugangswort holt sich der Push
// wie ueberall mit "gh auth token --user DanielFleger".

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const HIER = __dirname;
const REPO = 'https://github.com/DanielFleger/village-studio.git';

// Was oeffentlich ist. Reihenfolge egal, Pfade relativ zu diesem Ordner.
const DATEIEN = [
  'server.js', 'start.cmd',
  'lib/aiv.js', 'lib/aivwrite.js', 'lib/bildvorrat.js', 'lib/blast.js',
  'lib/gebaeude.json', 'lib/gebaeude_bilder.json', 'lib/gm1.js',
  'lib/implode.js', 'lib/karte.js', 'lib/umrisse.js', 'lib/webbilder.js',
  'web/app.js', 'web/index.html', 'web/style.css',
  'web/pruefen.html', 'web/pruefen.js', 'web/pruefen.css',
  'aiv/LIESMICH.txt',
];

// Diese Dateien pflegt das oeffentliche Repo selbst - README, Lizenz, Bilder
// und die Ignorierliste sind dort anders und werden hier nie ueberschrieben.
const NICHT_ANFASSEN = ['README.md', 'LICENSE', '.gitignore', 'bilder/'];

const istText = rel => /\.(js|json|html|css|cmd|md|txt)$/i.test(rel);

const schreiben = process.argv.includes('--schreibe');

function git(ordner, ...args) {
  return execFileSync('git', ['-C', ordner, ...args], {
    encoding: 'utf8',
    env: { ...process.env, GH_TOKEN: token() },
  });
}

let _token = null;
function token() {
  if (_token === null) {
    try {
      _token = execFileSync('gh', ['auth', 'token', '--user', 'DanielFleger'], { encoding: 'utf8' }).trim();
    } catch { _token = ''; }
  }
  return _token;
}

const ziel = fs.mkdtempSync(path.join(os.tmpdir(), 'village-studio-'));
console.log('Klon nach ' + ziel);
execFileSync('git', ['clone', '--quiet', REPO, ziel], {
  encoding: 'utf8', env: { ...process.env, GH_TOKEN: token() },
});

let geaendert = 0, neu = 0;
for (const rel of DATEIEN) {
  const quelle = path.join(HIER, rel);
  if (!fs.existsSync(quelle)) { console.log('  FEHLT hier: ' + rel); continue; }
  const dort = path.join(ziel, rel);
  const vorher = fs.existsSync(dort) ? fs.readFileSync(dort) : null;
  const jetzt = fs.readFileSync(quelle);
  // Git checkt hier mit CRLF aus, die Quellen haben LF - ohne Angleichen
  // sieht jede Datei geaendert aus.
  const ohneCr = b => b.toString('utf8').replace(/\r\n/g, '\n');
  const gleich = vorher !== null && (istText(rel)
    ? ohneCr(vorher) === ohneCr(jetzt)
    : vorher.equals(jetzt));
  if (vorher === null) { console.log('  neu:      ' + rel); neu++; }
  else if (!gleich) { console.log('  geaendert:' + rel); geaendert++; }
  else continue;
  fs.mkdirSync(path.dirname(dort), { recursive: true });
  fs.writeFileSync(dort, jetzt);
}

// Was drueben liegt und hier nicht mehr vorkommt, faellt auf - geloescht wird
// aber nichts von selbst. Ein Loeschen im oeffentlichen Repo ist eine
// Entscheidung, keine Nebenwirkung.
const drueben = git(ziel, 'ls-files').split('\n').filter(Boolean);
for (const rel of drueben) {
  if (NICHT_ANFASSEN.some(n => rel === n || rel.startsWith(n))) continue;
  if (!DATEIEN.includes(rel)) console.log('  nur drueben (bleibt): ' + rel);
}

console.log(`\n${neu} neu, ${geaendert} geaendert.`);
if (!schreiben) {
  console.log('Nur angesehen. Mit --schreibe wird committet und gepusht.');
  console.log('Der Klon bleibt liegen: ' + ziel);
} else if (neu + geaendert === 0) {
  console.log('Nichts zu tun.');
} else {
  const heute = new Date().toISOString().slice(0, 10);
  git(ziel, 'add', '--', ...DATEIEN.filter(r => fs.existsSync(path.join(ziel, r))));
  git(ziel, 'commit', '-q', '-m', 'Stand vom ' + heute + ' aus dem Arbeits-Repo');
  git(ziel, 'push', '-q');
  console.log('gepusht: ' + REPO);
}
