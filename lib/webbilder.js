// Die Gebaeudebilder fuer die Oberflaeche - aus den Spieldateien, nach der
// Zuordnung in gebaeude_bilder.json.
//
// Es werden keine PNG-Dateien ins Repo gelegt: Der Server rendert auf Anfrage
// aus den gm1-Dateien und haelt das Ergebnis im Speicher. So bleibt die
// Anzeige immer auf dem Stand der Zuordnung, und die Spielgrafiken liegen
// nur dort, wo das Spiel installiert ist.

const fs = require('fs');
const path = require('path');
const { pngRgba } = require('./gm1');
const { sammle, zerlege } = require('./bildvorrat');

const ZUORDNUNG = path.join(__dirname, 'gebaeude_bilder.json');
const URTEIL = path.join(__dirname, 'zuordnung_urteil.json');

let vorrat = null;            // { n: [ { datei, nr, bild, pos } ] }, einmal je Serverlauf
let nachSchluessel = null;    // "tile_castle#135" -> Eintrag
const pngCache = new Map();

function ladeVorrat() {
  if (vorrat) return;
  vorrat = sammle();
  nachSchluessel = new Map();
  for (const pool of Object.values(vorrat)) for (const p of pool) nachSchluessel.set(p.datei + '#' + p.nr, p);
}

// Zuordnung lesen: sicher vor vermutet, jede Nummer einmal.
// Daniels Urteile (zuordnung_urteil.json) haben Vorrang - was er umgehaengt
// hat, gilt sofort, ohne dass jemand die Quelldatei anfassen muss.
function zuordnung() {
  let j; try { j = JSON.parse(fs.readFileSync(ZUORDNUNG, 'utf8')); } catch { return {}; }
  const aus = {};
  for (const stand of ['vermutet', 'sicher'])
    for (const [id, e] of Object.entries(j[stand] || {}))
      if (e && e.bild) aus[id] = { bild: e.bild, name: e.name, stand, beleg: e.beleg, kacheln: e.kacheln, pos: e.pos, gruppe: e.gruppe };
  for (const [id, u] of Object.entries(urteile())) {
    if (!aus[id] || !u.bild) continue;
    aus[id] = Object.assign({}, aus[id], { bild: u.bild, stand: 'von Daniel gesetzt' });
  }
  return aus;
}

function urteile() {
  try { return JSON.parse(fs.readFileSync(URTEIL, 'utf8')).urteile || {}; } catch { return {}; }
}

function schreibeUrteile(alle) {
  const stand = { _zweck: 'Daniels Urteil je Bau-Nummer aus der Pruefseite', _stand: new Date().toISOString(), urteile: alle };
  fs.writeFileSync(URTEIL, JSON.stringify(stand, null, 1));
  return stand;
}

// EINEN Eintrag ändern und den Rest stehen lassen. Zwei offene Seiten können
// sich damit nicht mehr gegenseitig überschreiben - vorher hat jede Seite die
// ganze Datei mit ihrem eigenen Stand ersetzt.
function speichereUrteil(id, eintrag) {
  const alle = urteile();
  if (eintrag === null) delete alle[id];
  else alle[id] = Object.assign({}, alle[id], eintrag);
  return schreibeUrteile(alle);
}

function speichereUrteile(neu) { return schreibeUrteile(neu); }

// Ein Screenshot aus dem Spiel, an eine Bau-Nummer geheftet. Liegt neben dem
// Repo im Bogen-Ordner, damit keine Bilddateien ins Repo wandern.
const PRUEFBILDER = path.resolve(__dirname, '..', '..', 'VillageStudio-bogen', 'pruefbilder');

function speicherePruefbild(id, endung, buf) {
  fs.mkdirSync(PRUEFBILDER, { recursive: true });
  const name = 'nr' + id + '_' + Date.now() + '.' + (endung || 'png').replace(/[^a-z0-9]/gi, '');
  fs.writeFileSync(path.join(PRUEFBILDER, name), buf);
  const alle = urteile();
  const e = alle[id] = alle[id] || {};
  e.bilder = (e.bilder || []).concat(name);
  schreibeUrteile(alle);
  return name;
}

function lesePruefbild(name) {
  if (!/^[a-z0-9_.]+$/i.test(name)) return null;
  const p = path.join(PRUEFBILDER, name);
  try { return fs.readFileSync(p); } catch { return null; }
}

// Zusatzbilder, die keine eigene Bau-Nummer haben, aber fuer die Anzeige
// gebraucht werden. Die Zugbruecke (44) liegt in vier Ausrichtungen vor; in der
// AIV steht keine, darum sucht sich die Oberflaeche die passende zum
// benachbarten Torhaus. Welche Fassung zu welcher Richtung gehoert, ist eine
// erste Zuordnung nach der Richtung der Bohlen - von Daniel zu pruefen.
const SONDERBILDER = {
  // Am 05.09.2026 an Daniels Spielbild abgelesen: bei einem Tor, dessen Bogen
  // auf der linken unteren Flaeche sitzt, liegt die Bruecke mit den Bohlen von
  // links unten nach rechts oben und die Ketten steigen zum Tor hin auf - das
  // ist tile_castle#1332. Die Spiegelfassung dazu ist #1382.
  '44x': 'tile_castle#1382',   // Tor mit Bogen auf der rechten unteren Flaeche (41, 43)
  '44y': 'tile_castle#1332',   // Tor mit Bogen auf der linken unteren Flaeche (40, 42)
};

// Was die Oberflaeche wissen muss, um ein Bild an die richtige Stelle zu legen
function bilderIndex() {
  ladeVorrat();
  const aus = {};
  const eintrag = (schluessel, stand) => {
    const p = nachSchluessel.get(schluessel);
    return p ? { bild: schluessel, stand, breite: p.bild.breite, hoehe: p.bild.hoehe, kacheln: p.bild.kacheln } : null;
  };
  for (const [id, e] of Object.entries(zuordnung())) {
    const t = eintrag(e.bild, e.stand);
    if (t) aus[id] = t;
  }
  for (const [name, schluessel] of Object.entries(SONDERBILDER)) {
    const t = eintrag(schluessel, 'Ausrichtung, nach dem Nachbartor gewaehlt');
    if (t) aus[name] = t;
  }
  return aus;
}

// Alles, was die Pruefseite braucht: Zuordnung, der ganze Bildervorrat je
// Grundflaeche und die schon gefaellten Urteile.
function pruefstand() {
  ladeVorrat();
  const gebaeude = JSON.parse(fs.readFileSync(path.join(__dirname, 'gebaeude.json'), 'utf8')).gebaeude;
  const j = JSON.parse(fs.readFileSync(ZUORDNUNG, 'utf8'));
  const z = zuordnung();

  const eintraege = Object.keys(z).map(Number).sort((a, b) => a - b).map(id => {
    const e = z[id], p = nachSchluessel.get(e.bild);
    return {
      id, name: e.name, stand: e.stand, beleg: e.beleg,
      kacheln: e.kacheln, pos: p ? p.pos : null, bild: e.bild,
      gruppe: (e.gruppe || []).length,
      gruppe_start: j.sicher[id] ? j.sicher[id].bild : (j.vermutet[id] ? j.vermutet[id].bild : null),
    };
  });

  const pool = {};
  for (const [n, liste] of Object.entries(vorrat))
    pool[n] = liste.map(p => ({ pos: p.pos, bild: p.datei + '#' + p.nr, breite: p.bild.breite, hoehe: p.bild.hoehe }));

  const ohneBild = Object.keys(gebaeude)
    .filter(id => gebaeude[id].b && gebaeude[id].b === gebaeude[id].h && !z[id])
    .map(id => ({ id: +id, name: gebaeude[id].name, kacheln: gebaeude[id].b }));

  return { eintraege, pool, ohneBild, offen: j._offen || {}, urteile: urteile() };
}

function bildPng(id) {
  ladeVorrat();
  if (SONDERBILDER[id]) return pngVon(SONDERBILDER[id]);
  const e = zuordnung()[String(id)];
  return e ? pngVon(e.bild) : null;
}

function pngVon(schluessel) {
  ladeVorrat();
  if (pngCache.has(schluessel)) return pngCache.get(schluessel);
  const p = nachSchluessel.get(schluessel);
  if (!p) return null;
  const png = pngRgba(p.bild.breite, p.bild.hoehe, p.bild.rgba);
  pngCache.set(schluessel, png);
  return png;
}

module.exports = { bilderIndex, bildPng, pngVon, pruefstand, urteile,
  speichereUrteil, speichereUrteile, speicherePruefbild, lesePruefbild, zerlege };
