# Schlossgespensts AI-Toolkit — was es kann

Stand 05.09.2026, gelesen am Quelltext von
[Schlossgespensty/AI-Toolkit](https://github.com/Schlossgespensty/AI-Toolkit)
(letzter Push 05.09.2026 16:42, Fassung 0.9.0). Angelegt, weil Daniel als
Mitarbeiter eingeladen wurde und die beiden Werkzeuge zusammengeführt werden
sollen.

## Was es ist

Eine **Electron-App** — ein Programmfenster mit Web-Oberfläche darin, also
dieselbe Bauart wie Village Studio, nur als eigenes Fenster statt im Browser.
Node ab 20, ein einziges Fremdpaket (`node-pkware` für die PKWare-Packung).
144 Dateien, davon 91 PNG-Kacheln; rund 9.500 Zeilen eigener Quelltext.

Drei Editoren in einem Fenster, dazu eine Bibliotheksverwaltung:

| Teil | Datei | Zeilen |
|---|---|---|
| Burg-Editor (AIV) | `src/js/castle-editor.js` | 2.424 |
| Charakter-Editor (AIC) | `src/js/character-editor.js` | 1.092 |
| Inhalte: Bilder, Sprache, Videos | `src/js/ai-content-editor.js` | 466 |
| UCP-Bibliothek | `src/js/ucp-library.js` + `src/node/ucp-library.js` | 1.526 |
| AIV lesen und schreiben | `src/node/aiv-codec.mjs`, `aiv-file.js` | — |
| Grundflächen und Überschneidungen | `src/js/castle-geometry.js` | 235 |

Dazu **19 Testdateien** (`node --test`) und ein `npm run check`, der jede Datei
einzeln prüft. Das Repo enthält außerdem Bauskripte für eine **Web-Fassung**,
ein **UCP-Modul** und einen **AIV-Konverter**; deren Ordner sind im Repo aber
nicht enthalten — die Web-Fassung liegt auf
<https://schlossgespenst.neocities.org/aic-editor/AI-Toolkit-Web>.

## Der Burg-Editor

Sechs Werkzeuge: **Auswählen/Verschieben, Pinsel, Einzeln, Linie, Kopieren,
Löschen.** Dazu Bauschritt-Verwaltung („Build order"), ein Hintergrundbild mit
einstellbarer Deckkraft und **eigene PNG-Kacheln je Gebäude** („Set PNG skin").

Die Ansicht ist **senkrecht von oben** — im ganzen Quelltext kommt kein Wort für
schräge Ansicht vor. Darum sind seine 91 Kacheln quadratisch, deckend und mit
dem englischen Namen beschriftet: beschriftete Farbquadrate, keine Spielgrafik.

Eingebaut ist ein **Wirtschaftsrechner**: Bevölkerung, Farmen, Eisenminen,
Steinbrüche, Holzfäller, Pechgruben, Ochsenkarren, „Arbeiter übrig nach der
Burg", „Arbeiter übrig nach Burg + Charakter".

## Der Charakter-Editor und die Inhalte

Das ist der Teil, den Village Studio überhaupt nicht hat: die `.aic` — Name der
KI, Startgüter, Truppen, Wahrscheinlichkeiten. Dazu die Inhalte einer KI:
Porträts (36×36 und 72×72), Sprachdateien, Bink-Videos, Sprache der Texte.

## Die UCP-Bibliothek

Verwaltet installierte KIs in einer UCP3-Installation: installierte und eigene
KIs, nur aktive Plugins zeigen, „Clone to My AIs", „Install / Update in UCP",
Versionsvergleich, `mapping.json` schreiben, Kürzel („shortcuts") und
`lines.json` speichern. Genau die Kette, die Village Studio bisher nur beim
Speichern anfasst.

## Der Schatz: die Konfigdateien

Sechzehn JSON-Dateien in `config/`. Zwei davon sind für uns unmittelbar wertvoll:

**`aiv_constants.json`** — 91 Einträge, je Mapper-Nummer `name`, `size`,
`maxAmount` (wie oft ein Bau vorkommen darf) und `overlap` (ob er sich mit
anderen überschneiden darf). Die beiden letzten Angaben fehlen bei uns ganz.

**`aiv_templates.json`** — 68 fertige Vorlagen, je Gebäude drei Gitter:
`bmap_id_template` (welche Bau-Nummer in welchem Feld steht),
`bmap_size_template` (Kantenlänge je Feld) und `bmap_tile_template` (Lage im
Bauwerk). Das sind genau unsere Abschnitte 2007, 2004 und 2005 — als Vorlage,
Feld für Feld.

Die Lage im Bauwerk ist damit entschlüsselt. Für ein 4×4-Gebäude steht dort:

```
1 5 5 2      1,2,3,4 = die vier Ecken (oben links, oben rechts,
8 9 9 6                unten rechts, unten links)
8 9 9 6      5,6,7,8 = die Ränder (oben, rechts, unten, links)
4 7 7 3      9       = innen,  0 = gehört nicht dazu
```

**Die Vorplätze stehen dort in Zahlen** — die Baufläche ist Nummer 2 mit
Kantenlänge 1, und die Vorlage sagt, wo sie liegt:

| Gebäude | Gesamt | Aufteilung |
|---|---|---|
| Bergfried (38) | 7×15 | 7×7 Bau, eine Übergangsreihe aus 3 Feldern, 7×7 Hof; dazu laut `castle-geometry.js` der Lagerplatz 5×5 rechts daneben |
| Söldnerposten (39) | 10×10 | 5×5 Bau oben links, der Rest des Quadrats Baufläche |
| Kaserne (55) | 10×10 | dasselbe |
| Ingenieursgilde (57) | 5×10 | 5×5 Bau oben, 5×5 Baufläche darunter |
| Tunnelgräbergilde (58) | 5×10 | dasselbe |
| Ölbrennerei (35) | 4×8 | 4×4 Bau oben, 4×4 Baufläche darunter |

## Wo die beiden Tabellen auseinandergehen

Verglichen wurde seine `aiv_constants.json` gegen unsere `lib/gebaeude.json`
über die Mapper-Nummer.

* **63 Nummern stimmen in Name und Größe überein.**
* **6 Größen weichen ab** — das sind genau die sechs Bauten mit Vorplatz oben.
  Er zählt die Baufläche zur Größe, wir nicht.
* **22 Nummern hat nur er**: die Einheiten 1–21 (Ölingenieur, Katapult,
  Bogenschütze …) und eine „Dummy Step" 200. Deshalb sind die ersten zwanzig
  seiner PNG-Kacheln Figuren und keine Gebäude.
* **9 Nummern haben nur wir**: Steinbruch, Eisenmine, Pechgräber,
  Apfelplantage, Milchviehhof, Getreidefarm, Hopfenfarm und die beiden Teiche.

## Was Village Studio hat und das Toolkit nicht

* Die **echten Gebäudebilder aus den `.gm1`-Dateien** und die schräge Ansicht.
* Die **Geländevorschau aus den `.map`-Dateien** des Spiels.
* Den **eigenen Packer und Entpacker** (`blast.js`/`implode.js`) statt eines
  Fremdpakets.
* Die **Umriss-Prüfung** gegen falsch zusammengesetzte Bauwerke.
* Das **Prüfblatt**, mit dem die Bildzuordnung entstanden ist.

## Vor einer Zusammenführung zu klären

**Das Toolkit hat keine Lizenzdatei.** Ohne Lizenz gilt das strengste Recht:
alle Rechte vorbehalten, kein fremder Code darf übernommen werden. Village
Studio steht unter MIT. Das ist unter Mitarbeitern schnell gelöst, muss aber
gelöst werden, bevor Quelltext in die eine oder andere Richtung wandert.

Die Konfigdateien sind der Teil, der sich sofort und ohne Vermischung von
Quelltext gemeinsam pflegen lässt: eine Tabelle, zwei Werkzeuge.
