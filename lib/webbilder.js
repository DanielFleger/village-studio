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
  // Daniels Urteile darueberlegen. WICHTIG: auch Nummern, die vorher gar kein
  // Bild hatten - genau die hat er auf der Pruefseite neu belegt (Kartenrand,
  // Wassergraben, Treppen). Sie hier zu ueberspringen hiess, seine Arbeit
  // wegzuwerfen; das ist am 05.09.2026 passiert.
  const gebaeude = JSON.parse(fs.readFileSync(path.join(__dirname, 'gebaeude.json'), 'utf8')).gebaeude;
  for (const [id, u] of Object.entries(urteile())) {
    if (!u.bild) continue;
    if (aus[id]) { aus[id] = Object.assign({}, aus[id], { bild: u.bild, stand: 'von Daniel gesetzt' }); continue; }
    const g = gebaeude[id];
    aus[id] = {
      bild: u.bild, name: g ? g.name : ('Nr ' + id), stand: 'von Daniel gesetzt',
      beleg: 'Von Daniel auf der Pruefseite zugeordnet (05.09.2026).' + (u.notiz ? ' ' + u.notiz : ''),
      kacheln: g && g.b ? g.b : 1, pos: null, gruppe: [],
    };
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
// Die Zugbruecke liegt in vier Ausrichtungen vor, in der AIV steht keine.
// Welche gilt, sagt die LAGE zum Torhaus - Regel von Daniel am 05.09.2026:
//   Bruecke noerdlich des Tores  -> Bogenplatz 33
//   Bruecke unterhalb            -> 31
//   Bruecke links  (N-S-Tor)     -> 34
//   Bruecke rechts               -> 32
// Auf dem Schirm liegt Norden oben rechts: kleineres y ist noerdlich,
// groesseres y suedlich, kleineres x westlich, groesseres x oestlich.
const SONDERBILDER = {
  // Treppenstufen, die beim Ziehen einer Treppe obendrauf gelegt werden -
  // Daniel: "je nach perspektive". Vier Bilder, vier Richtungen; welche zu
  // welcher gehoert, ist eine erste Zuordnung nach der Reihenfolge im Bogen.
  'stufe_n': 'tile_land3#133',   // Bogenplatz 390
  'stufe_o': 'tile_land3#134',   // 391
  'stufe_s': 'tile_land3#135',   // 392
  'stufe_w': 'tile_land3#136',   // 393
  '44n': 'tile_castle#1382',   // Bogenplatz 33
  '44s': 'tile_castle#1332',   // Bogenplatz 31
  '44w': 'tile_castle#1407',   // Bogenplatz 34
  '44o': 'tile_castle#1357',   // Bogenplatz 32
};

// Die Vorplaetze. Sie stehen als Bau-Nummer 2 (Bauflaeche) Feld fuer Feld in
// der AIV, aber welches BILD darauf gehoert, sagt die Datei nicht.
//
// GEMESSEN am 05.09.2026 an 163 AIV-Dateien (35 eigene und die 128 des
// Spiels): fuer jedes Vorkommen des Gebaeudes wurde gezaehlt, welche Felder
// ringsum Bauflaeche sind. Aufgenommen ist nur, was bei mindestens vier von
// fuenf Vorkommen so aussieht. Ergebnis Feld fuer Feld:
//
//   38 Bergfried   162 Faelle: Hof 7x7 bei dy 8, davor eine Uebergangsreihe
//                  aus 3 Feldern (dx 2..4, dy 7), dazu das Lager 5x5
//                  rechts oben (dx 7, dy 2)
//   39 Soeldnerp.   92 Faelle: das Gebaeude steht oben links in einem
//   55 Kaserne     110 Faelle: 10x10-Quadrat, die drei anderen Viertel sind Platz
//   57 Ing.gilde   132 Faelle: 5x5 direkt darunter (dy 5)
//   58 Tunnelgilde  14 Faelle: dasselbe
//   35 Oelbrenner.  39 Faelle: 4x4 direkt darunter (dy 4)
//
// Dieselben Formen stehen unabhaengig davon in Schlossgespensts AI-Toolkit
// (config/aiv_templates.json) - zwei Quellen, gleiches Ergebnis.
//
// BELEGT am 06.09.2026 aus dem Programm, dritte Quelle und diesmal die
// eigentliche: Ein Vorplatz ist kein Bodenbelag, sondern ein EIGENES GEBAEUDE,
// das das Spiel beim Setzen des Hauptgebaeudes mit anlegt. placeOilsmelter
// (0x00508030) legt BT_CAMPFIRE (51, 4x4) an, placeBarracks (0x005076a0) drei
// Paradeplaetze, placeEngineersguild (0x00507bd0) BT_PARADEGROUND (53),
// placeTunnelersguild (0x00507e00) BT_PARADEGROUND5 (59), placeKeep
// (0x005146d0) BT_CAMPGROUND (55, 7x7). Bild und Lage kommen aus
// DAT_BuildingDefinedData bzw. DAT_TerrainDefinedData - Feld fuer Feld
// dieselben Werte, die hier schon standen. Ganze Kette im Wissensstand
// unter "Die Vorplaetze sind eigene Gebaeude".
//
// dx und dy sind Felder von der Ecke oben links des Bauwerks aus.
const VORPLAETZE = {
  39: [ { bild: 'tile_buildings1#72',  dx: 5, dy: 0 },     // 5x5 Platz 1, oben rechts
        { bild: 'tile_buildings1#122', dx: 0, dy: 5 },     // 5x5 Platz 3, unten links
        { bild: 'tile_buildings1#97',  dx: 5, dy: 5 } ],   // 5x5 Platz 2, unten rechts
  55: [ { bild: 'tile_buildings1#72',  dx: 5, dy: 0 },
        { bild: 'tile_buildings1#122', dx: 0, dy: 5 },
        { bild: 'tile_buildings1#97',  dx: 5, dy: 5 } ],
  57: [ { bild: 'tile_buildings1#147', dx: 0, dy: 5 } ],   // BT_PARADEGROUND  (53)
  // Korrigiert 06.09.2026: die Tunnelgraebergilde hatte hier das Bild der
  // Ingenieursgilde. Der Code legt BT_PARADEGROUND5 (59) an, und dessen
  // Sprite zeigt auf #172 - ein anderes Bild als #147, punktweise geprueft.
  58: [ { bild: 'tile_buildings1#172', dx: 0, dy: 5 } ],   // BT_PARADEGROUND5 (59)
  38: [ { bild: 'tile_buildings1#23',  dx: 0, dy: 8 },     // 7x7 Hof, eine Reihe tiefer als bisher
        { bild: 'tile_buildings2#25',  dx: 7, dy: 2 } ],   // das Lager, das der Bergfried mitbringt
  // Gefunden am 06.09.2026: BT_CAMPFIRE (51), 4x4, Sprite 297 -> Bild #296.
  // Festgetretene Erde mit Grasbuescheln und Steinen. Das Feuer, das der
  // Typname verspricht, steckt nicht im Bild - es kommt aus anim_boiled_oil
  // und haengt am Gebaeude, nicht am Platz.
  35: [ { bild: 'tile_buildings1#296', dx: 0, dy: 4 } ],   // BT_CAMPFIRE (51)
};

// Bauten, die aus zwei Teilen bestehen: Koerper plus Aufsatz.
//
// BELEGT am 06.09.2026 aus dem Programm und im Spielbild bestaetigt: Eine
// Zinnenmauer hat kein eigenes Bild. Sie ist die normale Mauer, auf der im
// Wechsel ein Klotz (die Zinne) und eine flache Scharte sitzt - im Spiel
// entschieden durch x+y ungerade. Daniel dazu am Bild: "Die Zinnen sind nicht
// auf jedem, sondern wirklich nur auf manchen, jedem 2. - bis auf die Ecken,
// die sind immer hoch."
//
// Der Aufsatz sitzt so, dass seine Bodenraute auf der Deckflaeche des Koerpers
// liegt: Oberkante des Aufsatzes = Oberkante des Koerpers minus Aufsatzhoehe
// plus 16 (eine halbe Kachel). Von Daniel am 06.09.2026 aus zwei Fassungen
// gewaehlt ("2 ist super und 4 fuer die kleinen").
const AUFSATZ_UEBERLAPP = 16;
const AUFSAETZE = {
  // Mapper 26 = AIV 12, Zinnenmauer hoch
  26: { koerper: 'tile_buildings1#0', klotz: 'tile_land3#120', scharte: 'tile_land3#112' },
  // Mapper 35 = AIV 13, Zinnenmauer niedrig
  35: { koerper: 'tile_buildings1#1', klotz: 'tile_land3#120', scharte: 'tile_land3#112' },
};

// Koerper und Aufsatz uebereinander in ein Bild. Gibt null, wenn ein Teil fehlt.
function mitAufsatz(koerperBild, aufsatzBild) {
  if (!koerperBild || !aufsatzBild) return null;
  const breite = Math.max(koerperBild.breite, aufsatzBild.breite);
  const hoehe = koerperBild.hoehe + aufsatzBild.hoehe - AUFSATZ_UEBERLAPP;
  const rgba = Buffer.alloc(breite * hoehe * 4, 0);
  const male = (bild, oy) => {
    for (let y = 0; y < bild.hoehe; y++) for (let x = 0; x < bild.breite; x++) {
      const q = (y * bild.breite + x) * 4;
      if (!bild.rgba[q + 3]) continue;
      const p = ((oy + y) * breite + x) * 4;
      rgba[p] = bild.rgba[q]; rgba[p + 1] = bild.rgba[q + 1];
      rgba[p + 2] = bild.rgba[q + 2]; rgba[p + 3] = bild.rgba[q + 3];
    }
  };
  male(aufsatzBild, 0);
  male(koerperBild, hoehe - koerperBild.hoehe);
  return { breite, hoehe, rgba, kacheln: 1 };
}

function aufsaetze() { return AUFSAETZE; }

function vorplaetze() {
  ladeVorrat();
  const aus = {};
  for (const [id, teile] of Object.entries(VORPLAETZE)) {
    const fertig = teile.map(t => {
      const p = nachSchluessel.get(t.bild);
      return p ? { bild: t.bild, dx: t.dx, dy: t.dy, kacheln: p.bild.kacheln,
                   breite: p.bild.breite, hoehe: p.bild.hoehe } : null;
    }).filter(Boolean);
    if (fertig.length) aus[id] = fertig;
  }
  return aus;
}

// Bauten, bei denen das Spiel beim Setzen eine Fassung auswuerfelt - Daniel
// am 05.09.2026: "haeuser sind auch 5x5 15-18 und 4x4 20-22, davon wird eine
// zufaellig bestimmt beim bauen". Fuer diese Nummern liefert der Server die
// ganze Gruppe mit; die Oberflaeche waehlt je Feld eine feste daraus, damit
// dasselbe Haus beim Neuzeichnen nicht springt.
const MIT_VARIANTEN = new Set(['80', '94', '95', '96', '97']);

// Fassungen, die Daniel als POSITIONSBEREICHE im 1x1-Bogen genannt hat
// (Notizen auf der Pruefseite, 05.09.2026). Beim Bauen wuerfelt das Spiel
// daraus eine aus; im Editor bekommt jedes Feld eine feste daraus.
//   Treppe 4: 377-389 · Treppe 5: 369-376 · Treppe 6: 353-360 und 394
//   Wassergraben: 1800-1831, dazu 1832-1863 als Randfassungen
const VARIANTEN_BEREICHE = {
  17: [[377, 389]],
  18: [[369, 376]],
  19: [[353, 360], [394, 394]],
  20: [[1800, 1831]], 21: [[1800, 1831]], 22: [[1800, 1831]], 23: [[1800, 1831]],
};

function bereichsVarianten(id) {
  const bereiche = VARIANTEN_BEREICHE[id];
  if (!bereiche) return null;
  const pool = vorrat[1] || [];
  const aus = [];
  for (const [von, bis] of bereiche)
    for (const p of pool)
      if (p.pos >= von && p.pos <= bis)
        aus.push({ bild: p.datei + '#' + p.nr, breite: p.bild.breite, hoehe: p.bild.hoehe, kacheln: 1 });
  return aus.length > 1 ? aus : null;
}

// Fertige Bilder aus Schlossgespensts AI-Toolkit. Sie sind nach der
// MAPPER-Nummer benannt - derselben Nummer, die in lib/gebaeude.json neben
// jedem Bau steht. Damit ist die Zuordnung eindeutig und muss nicht geraten
// werden. Die Dateien liegen neben dem Repo im Bogen-Ordner.
const SKINS = path.resolve(__dirname, '..', '..', 'VillageStudio-bogen', 'skins');

function skinFuer(id) {
  const g = gebaeudeTabelle()[id];
  if (!g || !g.mapper) return null;
  const datei = path.join(SKINS, g.mapper + '.png');
  return fs.existsSync(datei) ? { mapper: g.mapper, datei } : null;
}

let _tabelle = null;
function gebaeudeTabelle() {
  if (!_tabelle) _tabelle = JSON.parse(fs.readFileSync(path.join(__dirname, 'gebaeude.json'), 'utf8')).gebaeude;
  return _tabelle;
}

function leseSkin(mapper) {
  if (!/^[0-9]+$/.test(String(mapper))) return null;
  try { return fs.readFileSync(path.join(SKINS, mapper + '.png')); } catch { return null; }
}

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
    if (!t) continue;
    const sk = skinFuer(id);
    if (sk) { t.skin = sk.mapper; t.skinStand = 'fertiges Bild aus dem AI-Toolkit'; }
    const ausBereich = bereichsVarianten(id);
    if (ausBereich) t.varianten = ausBereich;
    else if (MIT_VARIANTEN.has(String(id)) && (e.gruppe || []).length > 1) {
      // nur Fassungen derselben Grundflaeche, sonst passt das Bild nicht aufs Feld
      t.varianten = e.gruppe
        .map(b => eintrag(b, e.stand))
        .filter(v => v && v.kacheln === t.kacheln)
        .map(v => ({ bild: v.bild, breite: v.breite, hoehe: v.hoehe, kacheln: v.kacheln }));
      if (t.varianten.length < 2) delete t.varianten;
    }
    aus[id] = t;
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

  // Nummern ohne Bild kommen als leere Karte mit auf die Pruefseite - nur so
  // kann Daniel eine Kachel darauf ziehen. Kartenrand und Bauflaeche sind
  // keine Gebaeude, brauchen aber trotzdem eine Bodentextur.
  const ohneBild = Object.keys(gebaeude)
    .filter(id => !z[id] && (gebaeude[id].b === gebaeude[id].h) && id !== '25')
    .map(id => ({ id: +id, name: gebaeude[id].name, kacheln: gebaeude[id].b || 1 }));
  for (const o of ohneBild) {
    const u = urteile()[o.id];
    eintraege.push({
      id: o.id, name: o.name, stand: 'ohne Bild', kacheln: o.kacheln, pos: null,
      bild: u && u.bild ? u.bild : null, gruppe: 0,
      beleg: (gebaeude[o.id] && gebaeude[o.id].hinweis) || 'Fuer diese Nummer ist noch kein Bild zugeordnet.',
    });
  }
  eintraege.sort((a, b) => a.id - b.id);

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

module.exports = { bilderIndex, bildPng, pngVon, pruefstand, vorplaetze, aufsaetze, mitAufsatz, leseSkin, skinFuer, urteile,
  speichereUrteil, speichereUrteile, speicherePruefbild, lesePruefbild, zerlege };
