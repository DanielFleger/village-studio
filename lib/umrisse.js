// Erzeugt die Abschnitte 2004 und 2005 aus den Bauten.
//
// Diese beiden Abschnitte halten fest, wie die Felder eines Bauwerks
// zusammengehoeren. Fehlen sie oder passen sie nicht zu den Bauten, zerfaellt
// ein Gebaeude in lauter Einzelfelder - im Editor sieht man dann bei einem
// 3x3-Holzfaeller neunmal "Woodcutter" nebeneinander.
//
// Gemessen an den Originaldateien des Spiels:
//
//   2004 = Kantenlaenge des Bauwerks, auf jedem seiner Felder
//          Wachturm 3, Huette 4, Marktplatz 5, Bergfried 7, Kirche 9,
//          Kathedrale 13. Mauern, Kartenrand und Bauflaeche tragen 1.
//
//   2005 = Lage des Feldes im Bauwerk, als Ziffer 1 bis 9:
//
//              1 5 5 5 2
//              8 9 9 9 6
//              8 9 9 9 6
//              4 7 7 7 3
//
//          1 oben links, 2 oben rechts, 3 unten rechts, 4 unten links,
//          5 obere Kante, 6 rechte, 7 untere, 8 linke, 9 innen.
//          Einfeldrige Sachen wie Mauern tragen 0.

const GRID = 100;

// Mauerwerk: traegt in 2004 eine 1 und in 2005 eine 0.
// An 128 echten Dateien gemessen. Eine erste Stichprobe von 30 Dateien hatte
// 0 nahegelegt - ueber alle Dateien ueberwiegt die 1 deutlich.
const MAUERWERK = new Set([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 25, 37]);

// Graeben und Bauflaeche folgen einer eigenen Logik, die wir nicht kennen:
// Graeben tragen in 2004 eine 2 oder 3 und haben einen Umriss, die Bauflaeche
// hat mal einen und mal keinen. Solange wir davon nichts neu bauen, werden
// ihre Werte unveraendert aus der Vorlage uebernommen.
const UNBEKANNT = new Set([2, 20, 21, 22, 23, 24]);

function lage(x, y, x0, y0, x1, y1) {
  const links = x === x0, rechts = x === x1, oben = y === y0, unten = y === y1;
  if (oben && links) return 1;
  if (oben && rechts) return 2;
  if (unten && rechts) return 3;
  if (unten && links) return 4;
  if (oben) return 5;
  if (rechts) return 6;
  if (unten) return 7;
  if (links) return 8;
  return 9;
}

// bauten und schritte sind Arrays der Laenge 100*100.
// altGruppen und altUmrisse sind die Werte der Vorlage; sie werden dort
// uebernommen, wo wir die Regel nicht kennen.
// Rueckgabe: { gruppen, umrisse } - beides Arrays derselben Laenge.
function baueUmrisse(bauten, schritte, altGruppen, altUmrisse) {
  const n = GRID * GRID;
  const gruppen = new Array(n).fill(0);
  const umrisse = new Array(n).fill(0);
  const erledigt = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    const t = bauten[i];
    if (!t || erledigt[i]) continue;

    if (UNBEKANNT.has(t)) {
      gruppen[i] = altGruppen ? altGruppen[i] : 0;
      umrisse[i] = altUmrisse ? altUmrisse[i] : 0;
      erledigt[i] = 1;
      continue;
    }
    if (t === 1) {                     // Kartenrand
      gruppen[i] = 1; umrisse[i] = 0; erledigt[i] = 1; continue;
    }
    if (MAUERWERK.has(t)) {
      gruppen[i] = 1; umrisse[i] = 0; erledigt[i] = 1; continue;
    }

    // Zusammenhaengendes Gebiet gleicher Nummer UND gleichem Bauschritt.
    // Der Bauschritt gehoert dazu: zwei gleiche Gebaeude nebeneinander sind
    // zwei Bauwerke, und die trennt nur die Schrittnummer.
    const s = schritte[i];
    const stapel = [i];
    const felder = [];
    erledigt[i] = 1;
    let x0 = i % GRID, x1 = x0, y0 = (i / GRID) | 0, y1 = y0;
    while (stapel.length) {
      const c = stapel.pop();
      felder.push(c);
      const x = c % GRID, y = (c / GRID) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const k of [x > 0 ? c - 1 : -1, x < GRID - 1 ? c + 1 : -1,
                       y > 0 ? c - GRID : -1, y < GRID - 1 ? c + GRID : -1])
        if (k >= 0 && !erledigt[k] && bauten[k] === t && schritte[k] === s) {
          erledigt[k] = 1; stapel.push(k);
        }
    }

    const breite = x1 - x0 + 1;
    for (const c of felder) {
      gruppen[c] = breite;
      umrisse[c] = lage(c % GRID, (c / GRID) | 0, x0, y0, x1, y1);
    }
  }
  return { gruppen, umrisse };
}

module.exports = { baueUmrisse, MAUERWERK, UNBEKANNT };
