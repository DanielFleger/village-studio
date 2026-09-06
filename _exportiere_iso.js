// Die Gebaeudebilder fuer die 2,5D-Ansicht im AI-Toolkit ausgeben.
//
// Anders als _exportiere_skins.js wird hier NICHT in ein Quadrat gepresst:
// jedes Bild behaelt seine Groesse, denn die schraege Ansicht braucht die
// Hoehe. Dazu kommt eine kleine Beschreibungsdatei, damit die Ansicht weiss,
// welches Bild zu welcher Gegenstandsnummer gehoert und wie viele Felder es
// bedeckt.
//
// Aufruf:  node _exportiere_iso.js <zielordner>

const fs = require('fs');
const path = require('path');
const { leseGm1, ganzesGebaeude, pngRgba } = require('./lib/gm1');
const { bilderIndex, vorplaetze, mauerBilder, treppenBilder } = require('./lib/webbilder');

const SPIEL = 'C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme';
const GM = path.join(SPIEL, 'gm');

const ziel = process.argv[2];
if (!ziel) { console.error('Aufruf: node _exportiere_iso.js <zielordner>'); process.exit(1); }
fs.mkdirSync(ziel, { recursive: true });

const gebaeude = JSON.parse(fs.readFileSync(path.join(__dirname, 'lib', 'gebaeude.json'), 'utf8')).gebaeude;
const bilder = bilderIndex();
const plaetze = vorplaetze();
const mauern = mauerBilder();
const treppen = treppenBilder();

const geoeffnet = new Map();
function datei(name) {
  if (!geoeffnet.has(name)) geoeffnet.set(name, leseGm1(fs.readFileSync(path.join(GM, name + '.gm1'))));
  return geoeffnet.get(name);
}

// Ein Bild einmal ablegen, auch wenn mehrere Nummern darauf zeigen
const abgelegt = new Map();
function lege(schluessel) {
  if (abgelegt.has(schluessel)) return abgelegt.get(schluessel);
  const [name, nr] = schluessel.split('#');
  let bild;
  try { bild = ganzesGebaeude(datei(name), Number(nr)); } catch { bild = null; }
  if (!bild) return null;
  const dateiname = schluessel.replace('#', '_') + '.png';
  fs.writeFileSync(path.join(ziel, dateiname), pngRgba(bild.breite, bild.hoehe, bild.rgba));
  const eintrag = { datei: dateiname, breite: bild.breite, hoehe: bild.hoehe };
  abgelegt.set(schluessel, eintrag);
  return eintrag;
}

const verzeichnis = { erzeugt: new Date().toISOString(), feld: 32, gegenstaende: {} };
let ohne = [];

for (const [id, g] of Object.entries(gebaeude)) {
  if (!g.mapper) continue;
  const e = bilder[id];
  if (!e || !e.bild) { ohne.push(g.mapper + ' ' + g.name); continue; }
  const abgelegtes = lege(e.bild);
  if (!abgelegtes) { ohne.push(g.mapper + ' ' + g.name + ' (nicht lesbar)'); continue; }

  const eintrag = {
    name: g.name, aiv: Number(id), kacheln: e.kacheln,
    bild: abgelegtes.datei, breite: abgelegtes.breite, hoehe: abgelegtes.hoehe,
  };

  // Die Bodenplatten daneben - Bergfriedhof, Trainingsplaetze, Gildenplaetze
  const teile = plaetze[id];
  if (teile && teile.length) {
    eintrag.platten = [];
    for (const t of teile) {
      const p = lege(t.bild);
      if (p) eintrag.platten.push({ dx: t.dx, dy: t.dy, kacheln: t.kacheln,
                                    bild: p.datei, breite: p.breite, hoehe: p.hoehe });
    }
  }
  // Die Mauern. Sie haben kein fertiges Einzelbild, sondern werden Feld fuer
  // Feld gerechnet: der Koerper aus einem Texturstreifen von tile_walls, der
  // von der Laufrichtung und von x & 15 bzw. y & 15 abhaengt, darauf die
  // Krone. Bei den Zinnenmauern wechselt die Krone zusaetzlich zwischen Klotz
  // und flacher Scharte. Darum kommen hier viele Bilder heraus, und die
  // Ansicht sucht sich je Feld eines. Die ganze Herleitung steht in
  // lib/webbilder.js ueber MAUERN.
  const mauer = mauern[g.mapper];
  if (mauer) {
    const ablegen = (f) => {
      fs.writeFileSync(path.join(ziel, f.name), pngRgba(f.bild.breite, f.bild.hoehe, f.bild.rgba));
      return { bild: f.name, breite: f.bild.breite, hoehe: f.bild.hoehe };
    };
    const reihe = (liste) => liste.map(ablegen);
    // zinne merkt sich, ob diese Mauer einen Zinnenkranz traegt. Fuer die
    // Treppen ist das wichtig: hasHigherPlainNeighborWithWallOrGatehouse
    // (0x004f8ac0) verlangt L_WALL_OR_GATEHOUSE und schliesst L_CRENEL
    // (0x200) ausdruecklich aus - eine Treppe richtet sich also nicht nach
    // einer hoeheren ZINNENmauer, nur nach einer glatten.
    const m = { hoehe: mauer.hoehe, zinne: !!mauer.rand.allein.scharte,
                laengs: {}, quer: {}, rand: { laengs: {}, quer: {}, allein: {} } };
    for (const welche of Object.keys(mauer.rand.allein)) {
      for (const fall of Object.keys(m.rand)) m.rand[fall][welche] = ablegen(mauer.rand[fall][welche]);
      m.laengs[welche] = reihe(mauer.laengs[welche]);
      m.quer[welche] = reihe(mauer.quer[welche]);
    }
    // Die Regeln, nach denen die Ansicht waehlt - aus dem Spiel gelesen.
    m.regel = {
      lauf: 'beide Nachbarn einer Achse sind Mauer (isWallConnectionHeightValid)',
      laengs: 'Platz = x & 15', quer: 'Platz = y & 15',
      rand: 'ein Nachbar in x -> rand.laengs, einer in y -> rand.quer, keiner -> rand.allein',
      krone: mauer.rand.allein.scharte ? 'Klotz bei x+y ungerade, sonst Scharte' : 'immer flach',
    };
    eintrag.mauer = m;
    // Was ohne Nachbarn gilt, ist auch das Bild fuer Katalog und Vorschau.
    Object.assign(eintrag, m.rand.allein.klotz);
    if (m.rand.allein.scharte) {
      eintrag.wechselBild = m.rand.allein.scharte.bild;
      eintrag.wechselBreite = m.rand.allein.scharte.breite;
      eintrag.wechselHoehe = m.rand.allein.scharte.hoehe;
      eintrag.wechsel = 'x+y ungerade';
    }
  }

  // Die Treppen. Sie haben - wie die Mauern - kein fertiges Einzelbild,
  // sondern eine gemessene Hoehe: Mapper 181 steht 80 Punkte ueber dem Boden,
  // 182 auf 64, 183 auf 48, 184 auf 32, 185 auf 16, 186 auf 0
  // (placeDefensiveStructureTile 0x005034a0, Herleitung in lib/webbilder.js
  // ueber TREPPEN_HOEHE). Darum kommt je Stufe ein eigener Koerper heraus,
  // und dazu vier Trittflaechen - eine je Blickrichtung, so wie
  // updateGfxLayer sie waehlt.
  const treppe = treppen[g.mapper];
  if (treppe) {
    const t = { hoehe: treppe.hoehe, richtungen: {} };
    for (const [richtung, f] of Object.entries(treppe.richtungen)) {
      fs.writeFileSync(path.join(ziel, f.name), pngRgba(f.bild.breite, f.bild.hoehe, f.bild.rgba));
      t.richtungen[richtung] = { bild: f.name, breite: f.bild.breite, hoehe: f.bild.hoehe };
    }
    t.regel = {
      bild: 'die Seite, auf der der HOEHERE Nachbar liegt (Treppe oder Mauer)',
      ohne: 'kein hoeherer Nachbar -> allein (tile_land3#104, das flache Podest)',
      quelle: 'updateGfxLayer 0x00509180, Richtung 0/2/4/6 -> #134/#135/#136/#133',
    };
    eintrag.treppe = t;
    // Ohne hoeheren Nachbarn gilt dasselbe wie im Spiel: das flache Podest.
    // Das ist auch das Bild fuer Katalog und Vorschau - und weil der Koerper
    // je Stufe verschieden hoch ist, sehen die sechs Stufen dort jetzt
    // verschieden aus statt sechsmal gleich.
    Object.assign(eintrag, t.richtungen.allein);
  }

  verzeichnis.gegenstaende[g.mapper] = eintrag;
}

fs.writeFileSync(path.join(ziel, 'verzeichnis.json'), JSON.stringify(verzeichnis, null, 1));

console.log(Object.keys(verzeichnis.gegenstaende).length + ' Gegenstaende, ' +
            abgelegt.size + ' Bilder nach ' + ziel);
if (ohne.length) console.log('ohne Bild (' + ohne.length + '): ' + ohne.join(', '));
