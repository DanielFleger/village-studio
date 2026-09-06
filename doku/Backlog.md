# Backlog — zurückgestellt, nicht vergessen

Was liegen bleibt, bis Daniel es wieder aufruft. Angelegt am 05.09.2026, als
die Verschmelzung mit Schlossgespensts AI-Toolkit Vorrang bekam.

## Grafiken (zurückgestellt am 05.09.2026)

**Wassergraben (Bau-Nummern 20–23).** Das Bild ist noch nicht zugeordnet.
Gemessen: In den acht Geländedateien (`tile_land3`, `tile_land8`,
`tile_land_and_stones`, `tile_land_macros`, `tile_rocks8`, `tile_burnt`,
`tile_flatties`, `tile_farmland`) gibt es **keine** Kachel mit auch nur 8 %
blaugrünen Punkten. Blaugrün liegt nur in `tile_sea8` (1004 Kacheln),
`tile_sea_new_01` (270) und als vier einfarbige Farbmarker in `tile_data`
(#40–#43). Ein Auswahlblatt mit allen 34 Farbtönen liegt in
`VillageStudio-bogen/wasser_auswahl.png`; Daniel sagt, den Graben gebe es
schon — der nächste Schritt ist also, ihn im Spiel zu suchen und nicht in
den Kacheldateien.

**Zinnenmauer hoch und niedrig (12, 13).** Daniels Urteil: die gewählten
Bilder sind es nicht. Die flachen Fassungen sind laut ihm eine der vier
Nummern 195–198.

**BEANTWORTET am 06.09.2026**, über die EXE. Die 195–198 waren
Bogenpositionen, keine Bildnummern — sie zeigen auf `tile_flatties#36`–`#39`,
und das ist die **Flachansicht** (Leertaste im Spiel). Die vier Bilder sind
punktgleich und gelten für 12 wie 13; darum konnte Daniel nur „einer der vier"
sagen. Eine fertige Zinnenmauer gibt es im Spiel nicht — sie wird aus Flanke
(`anim_castle#62`–`#75`) und Krone (`tile_land3#120`–`#127` bzw. `#112`–`#119`)
zusammengesetzt. Ganze Kette im Wissensstand unter „1b3. Die Zinnenmauer".

**Noch offen daran:** welches Einzelbild der Editor in der Schrägansicht zeigen
soll. Das ist eine Darstellungsfrage, keine Messung — Daniel entscheidet.
Kandidat ist `tile_buildings1#4` (30×117), das Bild, das das Spiel beim Ziehen
einer Zinnenmauer zeigt.

**Treppe 1 bis 4 (14–17).** Dasselbe. Beim Ziehen legt das Spiel die
Stufenbilder 390–393 darüber, je nach Blickrichtung; die flache Fassung ist
199 oder 201.

Nachtrag 06.09.2026, gemessen: Die Nummern 390–393 in `tile_buildings1` sind
Bodenkacheln (Gras, Sand), keine Stufen — die alte Notiz zeigt ins Leere.
Angesehen mit `node _bogen.js tile_buildings1 388 396 <ziel.png> 3`.

**Widerlegt** (06.09.2026, ein paar Stunden später): Ich hatte in
`tile_castle` zwei Reihen für die Treppen gehalten, weil sie wie Treppen
aussehen und die Höhen passen. Sie sind es nicht — das Spiel zeichnet aus
`tile_land3`. Die Reihen stehen hier nur noch, damit niemand denselben Weg
zweimal geht:

* `#1550`–`#1554`, Höhen 84 / 81 / 65 / 48 / 32
* `#1563`–`#1567`, Höhen 81 / 65 / 48 / 32 / 16

Jede Stufe ist genau 16 Punkte niedriger als die vorige, also eine halbe
Kachel — fünf Stücke, so viele wie die AIV-Treppen 181–185 hat. Dazu
`#1547`/`#1548` (30×29), eine kurze **Steintreppe** in zwei Richtungen.

**ERLEDIGT am 06.09.2026**, über die EXE statt über das Bild: Es ist keine
von beiden. Die AIV-Treppe kommt aus `tile_land3.gm1`, Bilder #133–#136 (je
Blickrichtung) und #104 (freistehend). Die ganze Kette steht im Wissensstand
unter „Die Treppengrafik — gefunden".

**Der 4×4-Platz der Ölbrennerei (35).** Die Felder sind gemessen (4×4 direkt
unter dem Gebäude), das Bild dafür fehlt.

**ERLEDIGT am 06.09.2026**, über die EXE. Der Platz ist ein eigenes Gebäude,
das `placeOilsmelter` mit anlegt: `BT_CAMPFIRE` (51), 4×4, Lage (0,4), Bild
`tile_buildings1#296`–`#311`. Eingetragen in `lib/webbilder.js`. Im selben Zug
bestätigt der Code die ganze Vorplatz-Tabelle und korrigiert einen Eintrag —
die Tunnelgräbergilde hatte das Bild der Ingenieursgilde. Siehe Wissensstand
„1b4. Die Vorplätze sind eigene Gebäude".

**Sitzen die Bilder richtig?** Für die Vorplätze ist es geprüft (99,8 % der
abgedeckten Felder sind auch in der Datei Baufläche). Für die Gebäudebilder
selbst gibt es keine solche Gegenprobe — sie sind von Daniel angesehen, aber
nicht vermessen.

## Das grosse Ziel: ein echter Karten-Editor (07.09.2026)

Daniel, im Gespraech: „spaeter wollen wir ja aus dem AI-Toolkit ein wirkliches
Map-Bearbeitungstool machen — mit Hoehenveraenderung, mit Landschaften und
allem, was Stronghold-Crusader-Map-Editing kann, zusaetzlich dann noch den
Grhin Map Editor, also spiegeln, und Editing-Tools wie Splash, Geometry-Edits
(Kreise/Formen etc. hinzufuegen)."

**Was dafuer schon da ist** (Stand 07.09.2026, alles belegt und dokumentiert):

* Der Aufbau der `.map`: Verzeichnis mit 150 Plaetzen, je Abschnitt 12 Byte
  Kopf, PKWare-DCL gepackt. Von 114 Eintraegen tragen nur 50 IDs Daten.
* **Die Schichten sind benannt**, nicht geraten — ueber die Adresstabelle
  `DAT_MapSectionAddressArray` (`0x00b92a58`) laesst sich jede weitere
  nachschlagen. Siehe Wissensstand 1b6:
  1001 `GfxLayer` (die gezeichnete Bildnummer), 1002 `PillarGFXLayer`,
  1003 `LogicLayer`, 1004 `OrganismLayer`, **1005/1045 `HeightLayer` —
  das ist die Hoehe, die fuer die Hoehenveraenderung gebraucht wird**,
  1013 Gebaeude, 1014 Baumliste, 1033 `AlphaGFXLayer`, 1036 `MacroLayer`,
  1037 `Logic2Layer`, 1038 Felsliste.
* Die Geometrie: das Spielfeld ist eine **Raute** in einem 400x400-Rahmen,
  80.400 Felder, `kachel = addX(y) + x`. Vorschau = die um 45 Grad gedrehte
  Raute. Siehe Wissensstand 1b5.
* Vom Wert zum Bild: Ladereihenfolge aller `.gm1`, Zaehler ab 1.
* Zeichnen von Boden, Baeumen und Felsen: `lib/gelaende.js`, `lib/karte.js`.

**Was fehlt:**

1. **Schreiben.** Wir lesen nur. Noetig: Zurueckpacken (PKWare-DCL — `blast.js`
   entpackt nur), die Pruefsumme im Abschnittskopf, und die Frage, welche
   Schichten bei einer Aenderung mitwandern muessen. Das ist der Schluessel zu
   allem Weiteren; ohne ihn bleibt es ein Betrachter.
2. **Hoehe.** `HeightLayer` ist gefunden, aber der Zeichner ist noch flach: das
   Spiel verschiebt jede Kachel um `heightBasedScreenYOffset[Hoehe]` nach oben.
   Auf 79,4 % der Felder steht Hoehe 8, auf 7,2 % Hoehe 0 — was die Werte in
   Punkten bedeuten, ist **nicht** gemessen (die Tabelle wird erst beim Laden
   gefuellt).
3. **Landschaft setzen.** Der `GfxLayer` traegt fertige Bildnummern. Wer
   Gelaende malen will, muss wissen, welche Nummer zu welchem Untergrund passt
   und wie das Spiel die Uebergaenge waehlt — `MacroLayer` (1036) sagt, zu
   welchem Flecken ein Feld gehoert, das ist vermutlich der Ansatz.
4. Werkzeuge: Spiegeln, Splash, Kreise und Formen. Reine Oberflaeche, sobald
   1 bis 3 stehen.

## Karten (07.09.2026)

**Startplätze verschieben.** Daniels Ziel, im Gespräch entstanden: „ich will die
Startgebäude sehen können, die könnten ja dann auch wieder mit dem AI-Toolkit
verschoben werden." Das Lesen ist damit erledigt — die Startplätze stehen in
Abschnitt 1013 der `.map` (Building-Feld, 812 Byte je Eintrag: Bautyp +210,
Besitzer +214, x +238, y +240), und der Besitzer bei +214 ist die Spielernummer.

Was dafür noch fehlt: **in die `.map` schreiben**. Bisher lesen wir sie nur.
Nötig wären das Zurückpacken eines Abschnitts (PKWare-DCL, `lib/blast.js` kann
nur entpacken), die Prüfsumme im 12-Byte-Kopf und die Frage, welche anderen
Schichten mitwandern müssen, wenn ein Bergfried umzieht — mindestens der
Geländebelag (Abschnitt 1001 trägt die Gebäudekacheln mit, gemessen: sechs
Bergfriede = 294 Felder aus `tile_buildings1`) und der Lord in der
Einheitenschicht.

**Die Startgebäude bleiben im Kartenbild sichtbar** — ausdrücklich so gewollt,
kein Ausblender. Wer eine KI-Burg darauf setzt, sieht den Bergfried der Karte
darunter; das ist die Wahrheit der Karte, nicht ein Fehler.

## Aus dem Discord (05.09.2026)

Wünsche von Monsterfish und Schlossgespenst, gesammelt in der Nachricht vom
05.09.2026 — die vollständige Liste steht dort. Die drei mit Vorrang:
Mauern mit beliebigen Winkeln ziehen, Baureihenfolge ändern, Gebäude und
Mauern verschieben. **Alle drei kann das AI-Toolkit bereits** — siehe
`AI-Toolkit-Ueberblick.md`.
