# Village Studio

Ein Editor für die KI-Dörfer (`.aiv`) von **Stronghold Crusader**.
Läuft im Browser, braucht nur Node — keine Installation, keine Fremdbausteine.

---

## Alpha. Bitte vorher lesen.

Dieses Werkzeug schreibt AIV-Dateien, die Stronghold Crusader lädt. Es
funktioniert bei mir, aber es ist jung und wenig erprobt.

* **Lege Sicherungen an.** Das Programm legt vor jedem Überschreiben selbst eine
  Kopie in `_backup` an — verlass dich trotzdem nicht allein darauf.
* **Getestet nur mit Stronghold Crusader und Crusader Extreme** unter Windows.
  Andere Teile der Reihe sind ungeprüft.
* **Rückgängig gilt nur, solange das Fenster offen ist.** Es gibt keinen Verlauf
  über Sitzungen hinweg.
* **Zwei Dinge im Dateiformat sind noch nicht verstanden** — sie stehen unten in
  der Todo-Liste. Dateien, die dieses Programm schreibt, sind deshalb nicht
  garantiert gleichwertig mit denen des Original-Editors.

---

![Village Studio mit dem geladenen Dorf Emir3, darunter das Gelände der Karte](bilder/oberflaeche.png)

*Das Original-KI-Dorf `Emir3`, darunter das Gelände einer echten Karte des Spiels.
Links die gefundenen Dörfer, rechts Werkzeuge, Speicherziele und Ebenen.*

---

## Starten

Node muss installiert sein ([nodejs.org](https://nodejs.org)).

```
node server.js
```

Dann [http://localhost:8790](http://localhost:8790) im Browser öffnen.
Unter Windows tut es auch ein Doppelklick auf `start.cmd`.

### Wo das Programm sucht

Ohne weitere Angabe schaut es in einen Ordner `Village` neben dem
Programmordner, in den Programmordner selbst und in den `aiv`-Ordner der
Spielinstallation. Passt das nicht, lege eine `config.json` daneben:

```json
{
  "stronghold": "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Stronghold Crusader Extreme",
  "doerfer": ["D:\\Meine AIV-Dateien"]
}
```

---

## Was heute funktioniert

Jede Zeile hier ist gemessen, nicht geplant.

**AIV-Dateien lesen** — alle 14 Abschnitte samt der PKWare-Implode-Packung.
An 152 Dateien geprüft, darunter alle 111 Originale des Spiels.

**AIV-Dateien schreiben** — gepackt zurück, mit automatisch neu berechneten
Abschnitten 2004 und 2005; die halten fest, wie die Felder eines Gebäudes
zusammengehören. Im Spiel bestätigt: eine geschriebene Burg wurde in einem Test
zu 445 von 450 Bauschritten gebaut.

**Anzeigen** — 100×100-Raster mit umschaltbaren Ebenen: Bauten, Bauschritte,
Lage im Bauwerk, Kantenlänge, Umriss-Prüfung. Zoom und Verschieben mit der Maus,
je Feld ein Hinweisfenster mit Nummer und Bauschritt.

**Gebäudenamen statt Nummern** — mit Größe und den drei verschiedenen
Nummernsätzen, die Stronghold für dasselbe Gebäude benutzt.

**Bearbeiten** — Malen, Radieren, Pipette, Pinselgröße 1 bis 7, Bauschritt
getrennt einstellbar, Rückgängig.

**Speichern an drei Stellen** — über das Original, unter neuem Namen, oder direkt
dorthin, wo das Spiel schaut (die `mapping.json` der UCP3-KI-Ordner). Immer mit
Sicherung.

**Karte als Hintergrund** — die Geländevorschau aus den `.map`-Dateien des
Spiels, senkrecht von oben, unter dem Raster. Alle 113 Karten des Spiels lesen
sich fehlerfrei; mit den Karten der Plugins findet das Programm 189. Alternativ
lässt sich ein eigenes Bild unterlegen.

**Umriss-Prüfung** — meldet Felder, an denen die Zusammengehörigkeit nicht zu den
Bauten passt. Genau der Fehler, der ein 3×3-Gebäude in neun einzelne zerfallen
lässt.

---

## Was als Nächstes kommt

1. **Echte Gebäudegrafiken** aus den `.gm1`-Dateien des Spiels statt der farbigen
   Blöcke.
2. **Karte automatisch einrasten.** Dafür fehlt die Umrechnung zwischen dem
   Kachelgitter der Karte (80.400 Felder, keine Quadratfläche) und der Vorschau
   (200×200). Bis dahin legt man die Karte von Hand zurecht.
3. **Mauerwerk in Abschnitt 2004.** Dort steht mal 0, mal 1, und die Regel
   dahinter ist unbekannt. Zwei Erklärungen sind gemessen und widerlegt.
4. **Bauschritte durchspielen** — den Aufbau der Burg Schritt für Schritt ansehen
   wie einen Film.
5. **AIV im laufenden Gefecht tauschen**, ohne das Gefecht neu zu starten.
6. **Die restlichen 113 Abschnitte der `.map`** — bisher ist nur die Vorschau
   erschlossen.

---

## Dank

Die Beschreibung des AIV- und des Kartenformats stammt in Teilen vom
[Sourcehold-Projekt](https://github.com/sourcehold). Der Entpacker ist eine
Portierung von Mark Adlers `blast.c`.

## Lizenz

MIT — siehe [LICENSE](LICENSE).
