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
const { bilderIndex, vorplaetze, aufsaetze, mitAufsatz, ohneKappe } = require('./lib/webbilder');

const SPIEL = 'C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme';
const GM = path.join(SPIEL, 'gm');

const ziel = process.argv[2];
if (!ziel) { console.error('Aufruf: node _exportiere_iso.js <zielordner>'); process.exit(1); }
fs.mkdirSync(ziel, { recursive: true });

const gebaeude = JSON.parse(fs.readFileSync(path.join(__dirname, 'lib', 'gebaeude.json'), 'utf8')).gebaeude;
const bilder = bilderIndex();
const plaetze = vorplaetze();
const zweiteilig = aufsaetze();

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

// Ein einzelnes Bild lesen, ohne es abzulegen - fuer die Teile, aus denen
// hier erst ein Bau zusammengesetzt wird.
function teilBild(schluessel) {
  const [name, nr] = schluessel.split('#');
  try { return ganzesGebaeude(datei(name), Number(nr)); } catch { return null; }
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
  // Zweiteilige Bauten: die Zinnenmauern. Sie haben kein eigenes Bild, sondern
  // sind Koerper plus Aufsatz - und der Aufsatz wechselt Feld fuer Feld
  // zwischen Klotz und flacher Scharte. Darum kommen hier ZWEI Bilder heraus,
  // und die Ansicht waehlt je Feld eines davon.
  const zwei = zweiteilig[g.mapper];
  if (zwei) {
    const koerper = ohneKappe(teilBild(zwei.koerper), zwei.kappe);
    const fassungen = { klotz: teilBild(zwei.klotz) };
    if (zwei.scharte) fassungen.scharte = teilBild(zwei.scharte);
    for (const [welche, aufsatz] of Object.entries(fassungen)) {
      const gebaut = mitAufsatz(koerper, aufsatz);
      if (!gebaut) continue;
      const name = 'mauer_' + g.mapper + '_' + welche + '.png';
      fs.writeFileSync(path.join(ziel, name), pngRgba(gebaut.breite, gebaut.hoehe, gebaut.rgba));
      if (welche === 'klotz') {
        eintrag.bild = name; eintrag.breite = gebaut.breite; eintrag.hoehe = gebaut.hoehe;
      } else {
        eintrag.wechselBild = name;
        eintrag.wechselBreite = gebaut.breite; eintrag.wechselHoehe = gebaut.hoehe;
      }
    }
    // Die Regel, nach der die Ansicht waehlt - aus dem Spiel gelesen.
    if (eintrag.wechselBild) eintrag.wechsel = 'x+y ungerade';
  }

  verzeichnis.gegenstaende[g.mapper] = eintrag;
}

fs.writeFileSync(path.join(ziel, 'verzeichnis.json'), JSON.stringify(verzeichnis, null, 1));

console.log(Object.keys(verzeichnis.gegenstaende).length + ' Gegenstaende, ' +
            abgelegt.size + ' Bilder nach ' + ziel);
if (ohne.length) console.log('ohne Bild (' + ohne.length + '): ' + ohne.join(', '));
