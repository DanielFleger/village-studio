// Die Gebaeudebilder fuer die Oberflaeche - aus den Spieldateien, nach der
// Zuordnung in gebaeude_bilder.json.
//
// Es werden keine PNG-Dateien ins Repo gelegt: Der Server rendert auf Anfrage
// aus den gm1-Dateien und haelt das Ergebnis im Speicher. So bleibt die
// Anzeige immer auf dem Stand der Zuordnung, und die Spielgrafiken liegen
// nur dort, wo das Spiel installiert ist.

const fs = require('fs');
const path = require('path');
const { leseGm1, pngRgba } = require('./gm1');
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

// ---------------------------------------------------------------- Mauern
//
// Eine gebaute Mauer ist im Spiel KEIN Feldraster, sondern eine durchgehende
// Flaeche. Daniel am 06.09.2026: "zwischen den mauern ist immer noch ein
// dunkler strich als abstand ... wenn gebaut wird wird sie sozusagen neu
// gerechnet und schoene uebergaenge werden gemacht".
//
// GEMESSEN am 06.09.2026, der Reihe nach:
//
// 1. Woher der dunkle Strich kam. Bis heute war der Mauerkoerper
//    tile_buildings1#0 bzw. #1. Das sind aber EINZELNE PFEILER mit Geruest
//    und Bauschutt - die Vorschau, die beim Ziehen am Mauszeiger haengt. Ein
//    Pfeiler zeigt zwei Seiten: Spalten 0..13 sind die besonnte (Helligkeit
//    im Mittel 142), Spalten 14..29 die beschattete (84). Zwei benachbarte
//    Felder liegen 16 Punkte auseinander, das spaetere verdeckt die Spalten
//    16..29 des frueheren - sichtbar bleiben also 0..15, und darin stecken
//    die zwei dunklen Spalten 14 und 15. Das ist der Strich, alle 16 Punkte.
//
// 2. Was das Spiel stattdessen nimmt: tile_walls.gm1, Datenart 5 (ungepackt,
//    2 Byte je Punkt, 30 je Zeile). 72 Streifen, 63x 30x186, 8x 30x87,
//    1x 30x75; nutzbar sind hoehe-7 Zeilen (10740/2/30 = 179).
//
// 3. Welcher Streifen auf welches Feld gehoert, steht in
//    computeWallCornerRenderRotation (0x004fc650). Sie prueft mit
//    isWallConnectionHeightValid (0x004f8840), ob BEIDE Nachbarn einer Achse
//    Mauern sind, und rechnet dann bei Blickrichtung 0:
//      Lauf in x:  Bildnummer = (0x11 - (x & 15)) - 1 = 16 - (x & 15)
//      Lauf in y:  Bildnummer = (0x20 - (y & 15)) - 1 = 31 - (y & 15)
//      sonst (Ende, Ecke, Einzelfeld): 0x21-1 = 32, 0x30-1 = 47, 0x3f-1 = 62
//
// 4. Warum ZWEI Saetze. Jeder Streifen hat dieselbe Zweiteilung wie der
//    Pfeiler - links besonnt, rechts beschattet -, aber die Kante sitzt
//    verschieden. Ueber alle 72 Streifen nachgemessen:
//      Bildnummer  1..16 und 33..47: Kante bei Spalte 16
//      Bildnummer 17..31 und 48..62: Kante bei Spalte 14
//      Bildnummer 0 bzw. 32:         Kante bei Spalte 14 bzw. 15
//    Laeuft die Mauer in x, bleiben die Spalten 0..15 sichtbar - dazu passt
//    Kante 16, und die sichtbare Flaeche ist ganz hell. Laeuft sie in y,
//    liegt das naechste Feld 16 Punkte LINKS, sichtbar bleiben 14..29 - dazu
//    passt Kante 14, und die sichtbare Flaeche ist ganz dunkel. Genau diese
//    beiden Saetze waehlt die Funktion; damit ist nebenbei belegt, dass ihre
//    Richtung 2 die x-Achse ist und Richtung 0 die y-Achse.
//
//    Die drei Randfaelle folgen derselben Rechnung, und auch hier stimmen
//    Programm und Bild ueberein:
//      Nr. 47, Kante 16 (0x30): das naechste Feld liegt in x, verdeckt also
//        die rechte Haelfte - die sichtbare ist ganz hell.
//      Nr. 62, Kante 14 (0x3f): das naechste Feld liegt in y, verdeckt die
//        linke Haelfte - die sichtbare ist ganz dunkel.
//      Nr. 32, Kante 15 (0x21): gar kein Nachbar, beide Seiten sichtbar,
//        also je zur Haelfte - der freistehende Pfeiler.
//
// 5. Wie hoch. placeDefensiveStructureTile (0x005034a0) setzt die Hoehe je
//    Mapper: 25 -> +0x5a (90), 46 -> +0x3c (60), 26 -> +0x62 (98),
//    35 -> +0x44 (68). Eine Einheit ist eine Bildzeile -
//    BlitMapImageWithVerticalClip (0x00453b00) zeichnet genau so viele.
//
// 6. Wo der Koerper anfaengt und aufhoert. Die Bodenraute ist 16 Zeilen hoch,
//    ihre untere Kante liegt in Zeile 8 + floor(min(x, 29-x) / 2). Der
//    Koerper haengt genau darunter und ist koerperHoehe Zeilen lang; die
//    Krone ist dieselbe Raute, um koerperHoehe angehoben, und schliesst
//    buendig an - kein Ueberlapp, keine geratene Konstante. Damit ist auch
//    das "kleine Dreieck oben" weg: der alte Koerper hatte eine GERADE
//    Oberkante, die an den Seiten unter der Krone hervorschaute.
//
// Bauschutt und Geruestkappe entfallen ersatzlos - sie gehoerten zur
// Vorschau, nicht zur Mauer.

const GM_ORDNER = path.join(
  'C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme', 'gm');

const MAUERN = {
  25: { hoehe: 0x5a, klotz: 'tile_land3#96' },                               // Steinmauer
  46: { hoehe: 0x3c, klotz: 'tile_land3#96' },                               // niedrige Mauer
  26: { hoehe: 0x62, klotz: 'tile_land3#120', scharte: 'tile_land3#112' },   // Zinnenmauer hoch
  35: { hoehe: 0x44, klotz: 'tile_land3#120', scharte: 'tile_land3#112' },   // Zinnenmauer niedrig
};

// Die Bildnummern in tile_walls, so wie computeWallCornerRenderRotation sie
// rechnet. Der Platz in der Liste ist x & 15 bzw. y & 15.
const STREIFEN_LAENGS = Array.from({ length: 16 }, (unbenutzt, i) => 16 - i);  // Lauf in x
// Lauf in y. ACHTUNG, ein Sonderfall aus dem Programm: computeWallCornerRotation
// (0x004fc650) gibt im y-Zweig 0x20 - (y & 15) zurueck, ABER fuer y & 15 == 15
// ausdruecklich 1 - also Streifen 0, nicht 17. Wer die Formel ohne diesen Fall
// nachbaut, greift auf Streifen 16, und dessen Hell/Dunkel-Kante sitzt bei
// Spalte 16 statt 14: jedes sechzehnte Feld bekommt einen hellen Strich.
// Gemessen an der Rohdatei: Kante bei 16 haben die Streifen 1..16, Kante bei 14
// haben 0 und 17..31 - der saubere Satz fuer den y-Lauf ist also {0, 17..31}.
const STREIFEN_QUER = Array.from({ length: 16 }, (unbenutzt, i) => (i === 15 ? 0 : 31 - i));
// Die Raender: nur ein Nachbar oder gar keiner.
const STREIFEN_RAND = { laengs: 47, quer: 62, allein: 32 };

// Untere Kante der Bodenraute, Zeile je Spalte. Aus den Zeilenlaengen der
// unteren Rautenhaelfte (30, 26, 22, 18, 14, 10, 6, 2).
const rautenKante = (x) => 8 + Math.floor(Math.min(x, 29 - x) / 2);

// ---------------------------------------------------------------- Treppen
//
// Daniel am 06.09.2026: "ich wuerde bei den stairs aufpassen, die haben noch
// keine hoehe, die sind bisher nur alle einfach trappen". Genau so war es:
// alle sechs Stufen zeigten dasselbe Bild auf derselben Hoehe.
//
// GEMESSEN am 06.09.2026, in derselben Funktion, die auch die Mauerhoehen
// setzt - placeDefensiveStructureTile (0x005034a0). Je Mapper eine Zeile,
// Adresse und Zahl:
//
//   Mapper 181  Stair 1 (highest)  0x0050359d  ADD ...,0x50  ->  80
//   Mapper 182  Stair 2            0x005035b9  ADD ...,0x40  ->  64
//   Mapper 183  Stair 3            0x005035d5  ADD ...,0x30  ->  48
//   Mapper 184  Stair 4            0x005035f1  ADD ...,0x20  ->  32
//   Mapper 185  Stair 5 (lowest)   0x0050360d  ADD ...,0x10  ->  16
//   Mapper 186  Stair6 (Floor)     - keine Zeile -           ->   0
//
// Jede der fuenf setzt davor LogicLayer |= 0x800 (L_STAIRS). Mapper 186 hat
// weder eine Hoehe noch das Bit; er kommt in der Funktion nur noch einmal vor,
// bei 0x005036e2, wo er wie die anderen fuenf den Mauerverlust ueberspringt.
// "Floor" ist also woertlich zu nehmen: ein Treppenfeld auf Bodenhoehe.
//
// Die Kette bis dorthin: aiPlaceAIVBuilding (0x004ed410) prueft bei 0x004edc4a
// auf M_MAPPER_STAIR1..STAIR6 und reicht den Mapper unveraendert an
// placeDefensiveStructureTile weiter - dieselbe Funktion, dieselbe Rechnung
// wie bei den Mauern. Andere Aufrufer hat sie nicht.
//
// GEGENPROBE, unabhaengig: placeWalls (0x00502f30) ist der Weg des SPIELERS
// (M_MAPPER_STAIR, 27). Dort steht keine Tabelle, sondern eine Schleife: die
// Bezugshoehe faengt an der Mauer an, jedes Feld bekommt
// "Bezugshoehe - Bodenhoehe - 0x10", und am Ende jedes Durchlaufs faellt die
// Bezugshoehe um 0x10. Abgebrochen wird unter 0x18. Der Spieler zieht also
// dieselbe Treppe in Sechzehnerschritten, die die KI als feste Leiter
// 80/64/48/32/16 bekommt. Zwei Wege, dieselbe Stufenhoehe.
//
// NICHT gemessen: dass eine Hoeheneinheit eine Bildzeile ist. Das ist die im
// Projekt schon geltende Annahme aus dem Mauerteil oben (Punkt 5). Die
// Umrechnung des Spiels laeuft ueber heightBasedScreenYOffset, eine Tabelle
// im .bss - sie steht nicht in der Datei und ist statisch nicht nachzulesen.
const TREPPEN_HOEHE = { 181: 0x50, 182: 0x40, 183: 0x30, 184: 0x20, 185: 0x10, 186: 0 };

// Welches Bild zu welcher Blickrichtung gehoert. GEMESSEN in updateGfxLayer
// (0x00509180): dort haengt an hasHigherNeighborWithStairs(.., 0) das Bild
// #134, an Richtung 2 das #135, an 4 das #136, an 6 das #133; findet sich gar
// kein hoeherer Nachbar, steht #104 da. Dieselben vier Bilder kommen ein
// zweites Mal ueber hasHigherPlainNeighborWithWallOrGatehouse - eine hoehere
// MAUER neben der Treppe waehlt also dasselbe Bild wie eine hoehere Treppe.
//
// Die Namen r0/r2/r4/r6 sind die Richtungsnummern des Spiels, nicht Himmels-
// richtungen. Welcher Bildschirmnachbar Richtung 0 ist, steht in
// directionTranslationMatrix - die wird erst im laufenden Spiel gefuellt und
// ist aus der Datei nicht zu lesen. Die Zuordnung Richtung -> Nachbarfeld
// steht darum in EINER Zeile in iso-geometry.js und ist dort als vermutet
// gekennzeichnet.
const TREPPEN_TRITT = {
  r0: 'tile_land3#134',
  r2: 'tile_land3#135',
  r4: 'tile_land3#136',
  r6: 'tile_land3#133',
  allein: 'tile_land3#104',
};

// Ein Treppenfeld wird gebaut wie ein Mauerfeld: Koerper so hoch wie die
// gemessene Hoehe, die Trittflaeche buendig obendrauf. Der Koerper kommt aus
// demselben Steinstreifen wie die Mauer - jedes Treppenfeld einer AIV liegt
// an einer Steinmauer (an drei Dateien Feld fuer Feld nachgezaehlt,
// Wissensstand "Die Treppen"), und der freistehende Streifen 32 ist der, der
// beide Seiten zeigt. Bei Stufe 6 ist die Hoehe 0; dann bleibt genau das
// Bodenbild uebrig, ohne Koerper.
// Ein einzelnes Bild aus dem Vorrat holen, ohne es zu einem Bau zu machen.
function teilBildFuerTreppe(schluessel) {
  const p = nachSchluessel.get(schluessel);
  return p ? p.bild : null;
}

function treppenBilder() {
  ladeVorrat();
  const alle = {};
  for (const [mapper, hoehe] of Object.entries(TREPPEN_HOEHE)) {
    const eintrag = { hoehe, richtungen: {} };
    let vollstaendig = true;

    // Stufe 6 ist keine Treppe. placeDefensiveStructureTile setzt fuer Mapper
    // 186 weder eine Hoehe noch das Bit L_STAIRS (0x800) - und genau an diesem
    // Bit haengt der Treppenzweig in updateGfxLayer. Ohne das Bit faellt die
    // Kachel in den Zweig darueber und bekommt eine Bodenkachel
    // (tile_land3 + 0x60/0x68 + Random & 7, also #96-#111). "Floor" ist
    // woertlich zu nehmen. Sie bekommt darum genau ein Bild, eine flache
    // Platte, und keine Richtungsfassungen - sonst zeigt der Editor eine
    // Treppe, die das Spiel nie zeichnet.
    if (Number(mapper) === 186) {
      const platte = teilBildFuerTreppe('tile_land3#96');
      if (platte) alle[mapper] = { hoehe: 0, richtungen: {
        allein: { name: 'treppe_186_allein.png', bild: platte } } };
      continue;
    }

    for (const [richtung, schluessel] of Object.entries(TREPPEN_TRITT)) {
      const bild = mauerFeld(STREIFEN_RAND.allein, schluessel, hoehe);
      if (!bild) { vollstaendig = false; break; }
      eintrag.richtungen[richtung] = { name: 'treppe_' + mapper + '_' + richtung + '.png', bild };
    }
    if (vollstaendig) alle[mapper] = eintrag;
  }
  return alle;
}

let wallsGelesen = null;
function wallsDatei() {
  if (!wallsGelesen) wallsGelesen = leseGm1(fs.readFileSync(path.join(GM_ORDNER, 'tile_walls.gm1')));
  return wallsGelesen;
}

// Ein Streifen aus tile_walls. Datenart 5 heisst: keine Packung, 2 Byte je
// Punkt, 30 Punkte je Zeile, so viele Zeilen wie Daten da sind.
function mauerTextur(nr) {
  const g = wallsDatei(), e = g.bilder[nr];
  if (!e) return null;
  const daten = g.buf.subarray(g.aBilder + e.offset, g.aBilder + e.offset + e.groesse);
  const breite = 30, hoehe = Math.floor(daten.length / 2 / breite);
  const rgba = Buffer.alloc(breite * hoehe * 4);
  for (let p = 0; p < breite * hoehe; p++) {
    const w = daten.readUInt16LE(p * 2);
    rgba[p * 4] = ((w >> 10) & 31) * 255 / 31 | 0;
    rgba[p * 4 + 1] = ((w >> 5) & 31) * 255 / 31 | 0;
    rgba[p * 4 + 2] = (w & 31) * 255 / 31 | 0;
    rgba[p * 4 + 3] = 255;
  }
  return { breite, hoehe, rgba };
}

// Ein fertiges Mauerfeld: Krone oben, darunter der Koerper aus der Textur.
function mauerFeld(streifenNr, kroneSchluessel, koerperHoehe) {
  const textur = mauerTextur(streifenNr);
  const eintrag = nachSchluessel.get(kroneSchluessel);
  if (!textur || !eintrag) return null;
  const krone = eintrag.bild;
  const ueberRaute = krone.hoehe - 16;              // was ueber der Bodenraute steht
  const hoehe = ueberRaute + 16 + koerperHoehe;
  const rgba = Buffer.alloc(30 * hoehe * 4, 0);

  for (let x = 0; x < 30; x++) {
    const oben = ueberRaute + rautenKante(x) + 1;
    for (let k = 0; k < koerperHoehe; k++) {
      const q = ((k % textur.hoehe) * 30 + x) * 4, z = ((oben + k) * 30 + x) * 4;
      rgba[z] = textur.rgba[q]; rgba[z + 1] = textur.rgba[q + 1];
      rgba[z + 2] = textur.rgba[q + 2]; rgba[z + 3] = 255;
    }
  }
  for (let y = 0; y < krone.hoehe; y++) for (let x = 0; x < krone.breite; x++) {
    const q = (y * krone.breite + x) * 4;
    if (!krone.rgba[q + 3]) continue;
    const z = (y * 30 + x) * 4;
    rgba[z] = krone.rgba[q]; rgba[z + 1] = krone.rgba[q + 1];
    rgba[z + 2] = krone.rgba[q + 2]; rgba[z + 3] = 255;
  }
  return { breite: 30, hoehe, rgba, kacheln: 1 };
}

// Alle Fassungen einer Mauer, fertig zum Ablegen. Je Laufrichtung sechzehn
// Streifen, je Krone eine Reihe davon, dazu die drei Randfaelle.
function mauerBilder() {
  ladeVorrat();
  const alle = {};
  for (const [mapper, m] of Object.entries(MAUERN)) {
    const kronen = m.scharte ? { klotz: m.klotz, scharte: m.scharte } : { klotz: m.klotz };
    const eintrag = { hoehe: m.hoehe, laengs: {}, quer: {}, rand: { laengs: {}, quer: {}, allein: {} } };
    let vollstaendig = true;
    for (const [welche, schluessel] of Object.entries(kronen)) {
      for (const [fall, nr] of Object.entries(STREIFEN_RAND)) {
        const bild = mauerFeld(nr, schluessel, m.hoehe);
        if (!bild) { vollstaendig = false; break; }
        eintrag.rand[fall][welche] = { name: 'mauer_' + mapper + '_r' + fall[0] + '_' + welche + '.png', bild };
      }
      if (!vollstaendig) break;
      const laeufe = [['laengs', STREIFEN_LAENGS], ['quer', STREIFEN_QUER]];
      for (const [lauf, streifen] of laeufe) {
        eintrag[lauf][welche] = streifen.map((nr, i) => ({
          name: 'mauer_' + mapper + '_' + lauf[0] + String(i).padStart(2, '0') + '_' + welche + '.png',
          bild: mauerFeld(nr, schluessel, m.hoehe),
        })).filter((f) => f.bild);
      }
    }
    if (vollstaendig) alle[mapper] = eintrag;
  }
  return alle;
}

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

module.exports = { bilderIndex, bildPng, pngVon, pruefstand, vorplaetze, mauerBilder, treppenBilder, leseSkin, skinFuer, urteile,
  speichereUrteil, speichereUrteile, speicherePruefbild, lesePruefbild, zerlege };
