// Die Zuordnung Bau-Nummer -> Bild eintragen.
//
// Aufruf:  node _setze_zuordnung.js            nur zeigen
//          node _setze_zuordnung.js --schreibe  lib/gebaeude_bilder.json erneuern
//
// Hier steht die Zuordnung als Positionsnummer, nicht als "datei#nr" - das ist
// die Nummer, die in den Einzelbildern und Boegen steht, und die Nummer, unter
// der Daniel die Bilder gesehen hat. Umgerechnet wird beim Schreiben.
//
// stand: 'sicher'   = am Bild ein eindeutiges Merkmal erkannt (Amboss, Kreuz,
//                     Backofen). Wer es nachsehen will, findet es im Beleg.
//        'vermutet' = plausibel oder durch Ausschluss. Genau diese Zeilen soll
//                     Daniel pruefen.
//
// gruppe: alle Positionen, die dasselbe Gebaeude zeigen (Ausrichtungen,
//         Dachzustaende, Fuellstufen). anzeige = die Fassung fuer das Werkzeug.

const fs = require('fs');
const path = require('path');
const { sammle } = require('./lib/bildvorrat');

const ZIEL = path.join(__dirname, 'lib', 'gebaeude_bilder.json');

// id: [ Grundflaeche, Anzeigeposition, stand, Beleg, Gruppe (Positionen) ]
const Z = {
  // ---- 1x1: Mauern, Treppen, Graeben ----
  10: [1, 1, 'vermutet', 'Hohe Sandsteinmauer mit Zinnenkranz, 30x97 Punkte. Position 1 und 3 sind bis auf 278 von 2910 Punkten gleich - zwei Fassungen derselben Mauer. WELCHE davon Steinmauer und welche Zinnenmauer ist, ist nicht entschieden.', [1, 3]],
  11: [1, 24, 'vermutet', 'Gruene Holzpalisade. Der Tabellenname sagt "Niedrige Mauer", der Mapper-Name M_MAPPER_WOODWALL sagt Holzmauer - das ist Altbestand aus Stronghold 1, den Crusader nicht baut.', [24, 25, 26, 27]],
  12: [1, 3, 'vermutet', 'Die zweite, fast gleiche Fassung der hohen Mauer - siehe Nr. 10.', [1, 3]],
  13: [1, 2, 'vermutet', 'Dieselbe Mauer, aber 30x70 statt 30x97 Punkte hoch - sichtbar niedriger, gleicher Zinnenkranz. Das ist Daniels "die mittlere ist sichtbar niedriger".', [2]],
  14: [1, 195, 'vermutet', 'Gestufte Steinplattform, vier Ausrichtungen (195-198). Welche Nummer welche Ausrichtung ist, ist ungeprueft - hier steht schlicht die Reihenfolge der Datei. Fuer Treppe 5 und 6 gibt es kein fuenftes und sechstes Bild.', [195, 196, 197, 198]],
  15: [1, 196, 'vermutet', 'siehe Nr. 14', [195, 196, 197, 198]],
  16: [1, 197, 'vermutet', 'siehe Nr. 14', [195, 196, 197, 198]],
  17: [1, 198, 'vermutet', 'siehe Nr. 14', [195, 196, 197, 198]],
  24: [1, 249, 'sicher', 'Schwarze Pechflaeche mit Schilf, aus pitch_ditches. Acht Fassungen (249-256).', [249, 250, 251, 252, 253, 254, 255, 256]],
  37: [1, 233, 'sicher', 'Grube mit Sandrand und Holzpfaehlen, aus killing_pits. 16 Fassungen: 233-240 offen, 241-248 mit Deckung.', [233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248]],

  // ---- 2x2 ----
  63: [2, 9, 'sicher', 'Holzgestell mit Seilzug ueber gestapelten Steinbloecken - der Anbindeplatz des Ochsen am Steinbruch. Neun Fuellstufen: 9 leer bis 17 voll.', [9, 10, 11, 12, 13, 14, 15, 16, 17]],
  92: [2, 21, 'sicher', 'Helle Steinfigur mit erhobenem Schwert auf hohem Sockel. 23 ist dieselbe verwittert.', [21, 23]],
  93: [2, 22, 'vermutet', 'Steinernes Radkreuz auf Sockel. Kreuz statt Figur - das trennt Schrein von Statue.', [22, 24]],
  100: [2, 19, 'sicher', 'Galgenpfosten mit Querarm und Schlinge. 18 ist derselbe ohne Schlinge.', [18, 19]],
  106: [2, 20, 'sicher', 'Eisenkaefig in Menschenform, an einer Kette am Ausleger.', [20]],

  // ---- 3x3 ----
  30: [3, 25, 'sicher', 'Runder Steinturm mit Zinnen, der einzige 3x3-Turm. Daneben liegen seine Ruine (26) und sein Fundament (27).', [25]],
  36: [3, 22, 'vermutet', 'Offener Holzverschlag mit Gitterdach, darin dunkle Tiergestalten.', [22]],
  61: [3, 4, 'vermutet', 'Offener Holzverschlag mit Segeltuchdach auf Steinplatte. Durch Ausschluss: die Jaegerhuette ist an Wild und Blutkuebel erkannt (15), damit bleibt fuer den Holzfaeller dieses Bild.', [4]],
  74: [3, 15, 'sicher', 'Huette auf Stelzen, darin haengt ein Tierkadaver, davor ein roter Blutkuebel, links Knochen auf dem Boden.', [15]],
  76: [3, 9, 'sicher', 'Bockwindmuehle: Muehlenkasten mit Fenster und Schweifbalken auf einem Holzbock. Die Fluegel fehlen, weil sie als Bewegtbild getrennt liegen. 10 ist derselbe Bock ohne Kasten.', [9]],
  85: [3, 20, 'sicher', 'Steinbrunnen mit Holzgestell und Seil.', [20]],
  90: [3, 16, 'vermutet', 'Hoher Pfahl mit rotem Aufsatz im Sand.', [16]],
  95: [3, 1, 'sicher', 'Holzumrandetes Beet mit dichten bunten Blueten. Drei Fassungen (1-3).', [1, 2, 3]],
  102: [3, 17, 'vermutet', 'Zwei Pfosten mit Querbalken auf Sand - der Pranger.', [17]],
  103: [3, 18, 'sicher', 'Grosser Holzhaufen mit einem Pfahl in der Mitte.', [18]],
  105: [3, 19, 'vermutet', 'Holzgestell mit vier Stachelraedern.', [19]],
  107: [3, 21, 'sicher', 'Rotbrauner Holzblock mit Stufen, oben ein Beil, davor ein Kuebel mit Blut.', [21]],

  // ---- 4x4 ----
  31: [4, 149, 'sicher', 'Eckiger Sandsteinturm mit Zinnen und Schiessscharten. 150 ist derselbe beschaedigt, 151 sein Sockel.', [149]],
  35: [4, 12, 'vermutet', 'Grosser Kessel ueber offenem Feuer auf Kopfsteinpflaster. Zwei Fassungen (12, 13) - Daniels "Feuerkessel zweimal".', [12, 13]],
  50: [4, 59, 'sicher', 'Drehbank mit grossem Rad, dazu helle Holzstangen auf der Werkbank. 18 Fassungen (59-76).', [59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76]],
  51: [4, 23, 'sicher', 'Runde Zielscheibe, Fass mit Pfeilen, Boegen auf der Werkbank. 18 Fassungen (23-40).', [23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40]],
  52: [4, 112, 'sicher', 'Steinesse mit orangem Feuer, Amboss, haengende Schlagwaffen. 18 Fassungen (95-112).', [95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112]],
  53: [4, 140, 'sicher', 'Aufgespannte Tierhaut, Lederharnisch auf dem Staender, helle Gerbtroege. 18 Fassungen (131-148); 131-139 ohne, 140-148 mit haengender Haut.', [131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148]],
  54: [4, 113, 'sicher', 'Helm- und Panzergestelle, Ruestungsstaender, rot-weisses Schild. 18 Fassungen (113-130).', [113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130]],
  56: [4, 8, 'sicher', 'Steinbau mit Holzdach, Bogentuer und Waffenhaken an der Wand (8, geschlossen); 9 ist derselbe offen mit Holzboden und Haken am Balken.', [8, 9]],
  64: [4, 10, 'vermutet', 'Steinerner Schachtturm auf Holzplattform ueber Balkenlage.', [10]],
  65: [4, 11, 'sicher', 'Holzgeruest mit Leiter ueber einer schwarzen Pechflaeche, daneben zwei Faesser.', [11]],
  70: [4, 6, 'sicher', 'Offener Steinbau, Boden voll Getreide, ringsum Vorratskruege (6). 7 ist derselbe geschlossen, mit Holzgitter und Stroh auf dem Dach.', [6, 7]],
  77: [4, 57, 'sicher', 'Kuppelofen mit gluehender Oeffnung, Brotregal, Mehltrog, weisser Tisch. 18 Fassungen (41-58); 41-49 ohne Ofen, 50-58 mit.', [41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58]],
  78: [4, 86, 'sicher', 'Faesser, offener Gaerbottich, Kessel ueber Feuer, Steinschornstein. 18 Fassungen (77-94); 77-85 ohne Feuer, 86-94 mit.', [77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94]],
  80: [4, 15, 'sicher', 'Sandfarbenes Flachdachhaus, ein- und zweistoeckig. Sieben Fassungen - Daniels "Haus 1 bis 7".', [15, 16, 17, 18, 20, 21, 22]],
  86: [4, 19, 'sicher', 'Grosses Tongefaess mit Wasser und angelehnter Leiter - Daniels "Wasserpot".', [19]],
  94: [4, 1, 'vermutet', 'Holzumrandetes Beet mit Blueten in 4x4. Drei Fassungen (1-3).', [1, 2, 3]],

  // ---- 5x5 ----
  32: [5, 26, 'sicher', 'Eckiger Sandsteinturm mit Zinnen in 5x5. 27 ist seine Ruine, 28 sein Fundament.', [26]],
  39: [5, 9, 'vermutet', 'Zelt aus Fell und Tuch ueber Holzgestell - der arabische Posten, an dem Soeldner angeworben werden.', [9]],
  40: [5, 30, 'sicher', 'Kleines Torhaus mit Fallgitter. Von Daniel am 05.09.2026 im Editor korrigiert: die O-W-Fassung war um 90 Grad verdreht, die beiden Bilder sind getauscht. Dazu passt die Gegenprobe in den AIV-Dateien - das einzige dort verbaute Torhaus sitzt in einer Mauerlinie laengs x, seine Durchfahrt laeuft also laengs y.', [29, 30]],
  41: [5, 29, 'sicher', 'siehe Nr. 40 - die gespiegelte Fassung.', [29, 30]],
  44: [5, 31, 'vermutet', 'Holzbohlenbruecke ueber Wasser, an Ketten. Vier Stellungen (31-34).', [31, 32, 33, 34]],
  55: [5, 10, 'vermutet', 'Massiver Steinbau mit Zinnen, Holzdach, Bogentuer und Banner. Der Tabellenname sagt Kaserne, der Mapper-Name M_MAPPER_BARRACKS_ARAB das Gegenteil - die beiden Namen koennten vertauscht sein.', [10]],
  57: [5, 15, 'vermutet', 'Zinnenbau, auf dem Dach ein grosses Wagenrad, ein Saegeblatt und Balken - Teile fuer Belagerungsgeraet. Koennte mit Nr. 58 vertauscht sein.', [15]],
  58: [5, 16, 'vermutet', 'Zinnenbau, auf dem Dach Spitzhacke und Eimer am Seilzug, daneben unter einer Plane Haufen von Bruchstein. Koennte mit Nr. 57 vertauscht sein.', [16]],
  60: [5, 4, 'vermutet', 'Leere gepflasterte 5x5-Flaeche. Die Waren darauf liegen getrennt in tile_goods (258 Stueck zu 2x2).', [4, 5]],
  66: [5, 13, 'sicher', 'Marktstand unter Sonnensegel, davor Obst, Gemuese, Toepfe und Kruege.', [13]],
  79: [5, 11, 'sicher', 'Steinhaus mit Strohdach und Kruegen darauf (11); 12 zeigt dasselbe Haus offen mit Tischen, Baenken und Faessern.', [11, 12, 14]],
  91: [5, 1, 'vermutet', 'Hoher Pfahl mit Kette auf gepflastertem Grund - der Baer selbst liegt als Bewegtbild getrennt.', [1]],
  97: [5, 6, 'sicher', 'Wasserflaeche mit Steinrand, Gras und Blumen. Zwei Fassungen (6, 7).', [6, 7]],
  101: [5, 19, 'vermutet', 'Flache Grube mit gelbgruenem Inhalt. Drei Fassungen (17-19).', [17, 18, 19]],
  104: [5, 21, 'vermutet', 'Steinrand mit eisernem Gitterdeckel und Kette. 22 ist derselbe geschlossen.', [21, 22]],
  108: [5, 23, 'vermutet', 'Wasserbecken mit Holzgalgen und Seil darueber. 25 ist derselbe zerbrochen.', [23]],

  // ---- 6x6 ----
  59: [6, 5, 'vermutet', 'Offener Holzschuppen mit Segeltuchdach, Traenke und Geschirr. Durch Ausschluss: von den sechs 6x6-Nummern sind fuenf am Bild belegt, dieses Bild bleibt uebrig.', [5]],
  62: [6, 4, 'sicher', 'Holzgeruest mit Flaschenzug ueber behauenen Steinbloecken.', [4]],
  84: [6, 6, 'vermutet', 'Zweistoeckiges Steinhaus, auf der Terrasse Toepfe, Schalen und Kraeuter. 7 ist dieselbe Fassung aufgeschnitten.', [6, 7]],

  // ---- 7x7 ----
  38: [7, 9, 'sicher', 'Quadratischer Steinbau mit Zinnen, Fackeln an den Waenden, KEIN Torbogen - das einzige 7x7-Bauwerk ohne Tor, das kein Bauzustand ist.', [9]],
  42: [7, 4, 'sicher', 'Grosses Torhaus mit Fallgitter und Zinnen. Von Daniel am 05.09.2026 im Editor korrigiert: die O-W-Fassung war um 90 Grad verdreht, die beiden Bilder sind getauscht. Dazu passt die Gegenprobe in den AIV-Dateien - das einzige dort verbaute Torhaus (eine Nr. 42) sitzt in einer Mauerlinie laengs x, seine Durchfahrt laeuft also laengs y.', [3, 4]],
  43: [7, 3, 'sicher', 'siehe Nr. 42 - dieselbe Form gespiegelt.', [3, 4]],
};

// Schon belegt und nicht anzutasten: die fuenf aus der Vorsitzung
const ALT_SICHER = {
  33: [6, 8, 'Eckiger Turm', 'Quadratischer Turm mit Holzdach in 6x6. Unter allen vierzehn 6x6-Bildern gibt es genau einen eckigen und einen runden Turm, und die Tabelle kennt genau diese zwei.'],
  34: [6, 11, 'Runder Turm', 'Runder Turm mit Zinnen - siehe 33.'],
  81: [6, 14, 'Kapelle', 'Kuppelbau mit Kreuz.'],
  82: [9, 3, 'Kirche', 'Goldene Kuppel mit Kreuz und Langhaus.'],
  83: [13, 1, 'Kathedrale', 'Grosse goldene Kuppel, zwei Tuerme.'],
};

const OFFEN = {
  '71 Apfelplantage, 72 Milchviehhof': 'Kein einziges 10x10-Bild in den 20 Gebaeude-Dateien. Das Hofgebaeude muss anderswo liegen.',
  '73 Getreidefarm, 75 Hopfenfarm': 'Von den drei 9x9-Bildern sind zwei ein europaeischer Bergfried aus Stronghold 1 samt Fundament, das dritte die Kirche. Kein Farmgebaeude.',
  '96 Teich': 'Kein Wasserbild in 3x3. Die einzigen Teiche liegen in 5x5 (Grosser Teich) und in 6x6, wo die Tabelle gar keinen Teich kennt.',
  '20-23 Wassergraben': 'KEIN Bild. Gemessen am 05.09.2026: kein einziges 1x1-Bild der zehn Gebaeude-Dateien hat nennenswert blaugruene Punkte (Schwelle 10 Prozent, einziger Treffer ueberhaupt ist der 6x6-Teich). Auf Daniels Spielbild ist der Graben eine ausgehobene Mulde voll tuerkisem Wasser - das malt das Spiel als Gelaende, nicht als Gebaeudebild. Meine vorherige Zuordnung auf die braunen Erdkacheln war falsch und ist entfernt.',
  '14-17 Treppen': 'Von Daniel widerlegt. Auf seinem Spielbild sind es steinerne Stufen, die an der Mauer hochlaufen - die gestuften Steinplatten aus tile_flatties sind es nicht. Wo sie liegen, ist offen; naechster Ort zum Nachsehen ist anim_castle, wo auch die Mauer-Seitenflaechen liegen.',
  '18, 19 Treppe 5 und 6': 'Es gibt nur vier gestufte Steinplatten (195-198) fuer sechs Treppen-Nummern.',
  '25 unbenutzt': 'Laut Tabelle unbenutzt - kein Bild noetig.',
  'Mauern 10 und 12': 'Position 1 und 3 sind fast gleich (278 von 2910 Punkten verschieden, gleicher Zinnenkranz). Welche Steinmauer und welche Zinnenmauer ist, entscheidet nur das Spiel.',
  '57 und 58': 'Ingenieursgilde und Tunnelgraebergilde koennten vertauscht sein - entschieden ist nur, dass das eine Bild Belagerungsgeraet und das andere Grabwerkzeug zeigt.',
};

function main() {
  const schreibe = process.argv.includes('--schreibe');
  const vorrat = sammle();
  const gebaeude = require('./lib/gebaeude.json').gebaeude;

  const alt = JSON.parse(fs.readFileSync(ZIEL, 'utf8'));
  const sicher = {}, vermutet = {};
  const fehler = [];

  const umgekehrt = new Map();
  for (const [n, liste] of Object.entries(vorrat))
    for (const p of liste) umgekehrt.set(p.datei + '#' + p.nr, { n: +n, pos: p.pos });

  const schluessel = (n, pos) => {
    const pool = vorrat[n];
    const p = pool && pool.find(x => x.pos === pos);
    if (!p) { fehler.push('kein Bild: ' + n + 'x' + n + ' Position ' + pos); return null; }
    return p.datei + '#' + p.nr;
  };

  for (const [id, [n, pos, name, beleg]] of Object.entries(ALT_SICHER)) {
    const b = schluessel(n, pos); if (!b) continue;
    sicher[id] = { bild: b, name, kacheln: n, pos, beleg,
      gruppe: [b] };
  }

  for (const [id, [n, pos, stand, beleg, gruppe]] of Object.entries(Z)) {
    const b = schluessel(n, pos); if (!b) continue;
    const e = {
      bild: b,
      name: gebaeude[id] ? gebaeude[id].name : '?',
      kacheln: n,
      pos,
      beleg,
      gruppe: gruppe.map(p => schluessel(n, p)).filter(Boolean),
    };
    (stand === 'sicher' ? sicher : vermutet)[id] = e;
  }

  // Daniels Urteile aus der Pruefseite darueberlegen. Sie sind die staerkste
  // Quelle, die es gibt - er kennt die Gebaeude aus dem Spiel. Abgetippt wird
  // nichts: die Seite schreibt lib/zuordnung_urteil.json, das hier gelesen wird.
  let urteile = {};
  try { urteile = JSON.parse(fs.readFileSync(path.join(__dirname, 'lib', 'zuordnung_urteil.json'), 'utf8')).urteile || {}; } catch { }
  let bestaetigt = 0, unvollstaendig = 0, verworfen = 0;
  for (const [id, u] of Object.entries(urteile)) {
    const e = sicher[id] || vermutet[id];
    if (!e) continue;
    if (u.bild && u.bild !== e.bild) {
      const t = umgekehrt.get(u.bild);
      e.bild = u.bild;
      if (t) { e.pos = t.pos; e.kacheln = t.n; }
      e.beleg = 'Von Daniel selbst gewaehlt (05.09.2026). Vorher: ' + e.beleg;
    }
    if (u.notiz) e.notiz_daniel = u.notiz;
    delete sicher[id]; delete vermutet[id];
    if (u.urteil === 'passt') {
      e.beleg = 'Von Daniel am Bild bestaetigt (05.09.2026). ' + e.beleg;
      sicher[id] = e; bestaetigt++;
    } else if (u.urteil === 'unvollstaendig') {
      e.fehlt = u.notiz || 'Daniel: Grafik nicht vollstaendig - es fehlt ein Teil, den das Spiel getrennt zeichnet.';
      e.beleg = 'Von Daniel als richtiges Gebaeude bestaetigt, aber unvollstaendig (05.09.2026). ' + e.beleg;
      sicher[id] = e; unvollstaendig++;
    } else if (u.urteil === 'unsichtbar') {
      e.zweifel = 'Daniel erkennt dieses Bild NICHT als "' + e.name + '"'
        + (u.notiz ? ' - ' + u.notiz : '') + '. Die Zuordnung ist damit widerlegt, das richtige Bild ist noch zu finden.';
      vermutet[id] = e; verworfen++;
    } else {
      vermutet[id] = e;
    }
  }
  console.log('Daniels Durchgang: ' + bestaetigt + ' bestaetigt, ' + unvollstaendig
    + ' richtig aber unvollstaendig, ' + verworfen + ' widerlegt');

  const neu = {
    _zweck: alt._zweck,
    _stand: '2026-09-05',
    _erklaerung: 'sicher = am Bild ein eindeutiges Merkmal erkannt, im Beleg genannt. vermutet = plausibel oder durch Ausschluss; genau diese Zeilen sind zu pruefen. pos = Nummer im Einzelbild-Ordner und im Bogen der jeweiligen Grundflaeche. gruppe = alle Bilder desselben Gebaeudes (Ausrichtungen, Dachzustaende, Fuellstufen).',
    _quelle: 'Sichtung der Boegen und Einzelbilder am 05.09.2026, dann Daniels vollstaendiger Durchgang durch alle 74 Nummern in der Pruefseite (lib/zuordnung_urteil.json).',
    _marken: 'sicher = von Daniel am Bild bestaetigt, oder von mir an einem eindeutigen Merkmal erkannt. Ein Eintrag mit "fehlt" zeigt das richtige Gebaeude, aber ohne einen Teil, den das Spiel getrennt zeichnet (Aussenbereich, Bewegtbild). Ein Eintrag mit "zweifel" ist von Daniel widerlegt.',
    sicher,
    vermutet,
    _offen: OFFEN,
    _warnung: alt._warnung,
    _ausschuss: alt._ausschuss,
    _varianten: alt._varianten,
    von_daniel: alt.von_daniel,
    von_daniel_4x4: alt.von_daniel_4x4,
    kandidaten: alt.kandidaten,
  };

  const gesamt = Object.keys(gebaeude).filter(id => gebaeude[id].b && gebaeude[id].b === gebaeude[id].h).length;
  console.log('sicher:', Object.keys(sicher).length, ' vermutet:', Object.keys(vermutet).length,
    ' zusammen:', Object.keys(sicher).length + Object.keys(vermutet).length, 'von', gesamt, 'quadratischen Bau-Nummern');
  const fehlt = Object.keys(gebaeude).filter(id => gebaeude[id].b && gebaeude[id].b === gebaeude[id].h
    && !sicher[id] && !vermutet[id]);
  console.log('ohne Bild:', fehlt.map(id => id + ' ' + gebaeude[id].name).join(', '));
  if (fehler.length) console.log('FEHLER:\n  ' + fehler.join('\n  '));

  if (schreibe) {
    fs.writeFileSync(ZIEL, JSON.stringify(neu, null, 1));
    console.log('\ngeschrieben:', ZIEL);
  }
}

main();
