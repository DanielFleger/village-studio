# Wissensstand: Stronghold Crusader, KI-Dörfer und Speicher

Alles, was wir über das AIV-System herausgefunden haben — mit Beleglage. Der
Sinn dieser Datei: nichts zweimal herausfinden, und nie eine Vermutung für
gesichert halten.

**Stand: 29.08.2026**

## Wie zu lesen

| Marke | Bedeutung |
|---|---|
| **belegt** | Aus zwei unabhängigen Quellen bestätigt, oder an vielen echten Dateien gemessen. Darauf kann man bauen. |
| **gemessen** | An echten Dateien nachgezählt, aber ohne zweite Quelle. Sehr zuverlässig, könnte in Sonderfällen abweichen. |
| **abgelesen** | Steht so in der Ghidra-Referenz oder in der exe. Zuverlässig, aber im laufenden Spiel nicht gegengeprüft. |
| **vermutet** | Plausibel hergeleitet, aber nicht geprüft. **Nicht darauf verlassen.** |
| **widerlegt** | War einmal unsere Annahme und ist falsch. Steht hier, damit der Irrtum nicht wiederkommt. |

---

## 1. Das Dateiformat

| Aussage | Marke | Beleg |
|---|---|---|
| 2036 Byte Verzeichnis, dann Abschnitte; je Abschnitt Länge, ID, Gepackt-Kennung, Offset | **belegt** | Sourcehold-Projekt und alle 152 Dateien hier gelesen |
| Immer 14 Abschnitte, IDs 2001–2014 | **gemessen** | 152 Dateien |
| Packung ist PKWare-DCL-Implode, nicht zlib; 12 Byte Kopf mit Länge, Länge, CRC32 | **belegt** | Sourcehold plus eigener Ent- und Packer, Rundlauf über 152 Dateien |
| Abschnitte 2004, 2005, 2007, 2008, 2013 sind **immer** gepackt, alle anderen roh | **gemessen** | 129 Originaldateien, davon 111 aus dem Spiel — kein Gegenbeispiel |
| Abschnitt 2009 ist der größte benutzte Bauschritt **plus eins** | **gemessen** | 146 von 148 Dateien; die zwei Ausnahmen hatte unser eigenes Werkzeug falsch geschrieben |
| Abschnitt 2010 ist der Schritt, den der Editor beim Öffnen zeigt; meist gleich 2009 | **belegt** | 100 von 128 Dateien. Die Abweichler sind offenbar der Stand, bei dem der Autor zuletzt aufgehört hat. **Wer 2009 ändert, muss 2010 mitziehen** — sonst meldet der Editor eine Schrittzahl, die es in der Datei gar nicht gibt |
| Lücken in der Bauschritt-Folge sind erlaubt | **belegt** | `nocturne_rat1.aiv` hat 562 Lücken, `Brandon.aiv` 86 — beides echte, benutzte Dateien |
| Bauschritt 1 enthält Kartenrand, Bergfried und Baufläche zusammen | **gemessen** | 144 von 152 Dateien. Ausnahmen: 5-mal ohne Kartenrand, 2-mal `[1,20]`, 1-mal nur `[1]` |
| Die Baufläche (Nr. 2) trägt eigene Bauschrittnummern, in Rotkäppchen bis 961 | **gemessen** | Wer eine KI bei Schritt N stoppen will, muss sie mitstreichen |
| Ein Bauschritt ist ein Bauwerk, keine Kachel | **belegt** | 81 Schritte mit Nr. 93 belegen je genau 4 Felder; ein Mauerzug dagegen 1 bis 27 |
| Pausenmuster ohne Pause: erster Eintrag 0, Rest -1 | **gemessen** | alle Abbot-Dateien |
| Der Bergfried steht im Gitter auf (43,43) bis (49,49) | **belegt** | 142 von 147 Dateien, und `setKeepOffsetAndOrientation` rechnet `keepX - 0x2B` = 43 |
| **Abschnitt 2004 ist die Kantenlänge des Bauwerks**, auf jedem seiner Felder — Wachturm 3, Hütte 4, Marktplatz 5, Bergfried 7, Kirche 9, Kathedrale 13 | **belegt** | 128 Dateien, für echte Gebäude ohne eine einzige Abweichung. Der bisherige Name „Gebäudegruppen" war irreführend |
| **Abschnitt 2005 ist die Lage des Feldes im Bauwerk**, als Ziffer 1–9: 1 oben links, 2 oben rechts, 3 unten rechts, 4 unten links, 5 obere Kante, 6 rechte, 7 untere, 8 linke, 9 innen | **belegt** | dieselbe Messung; bisher „Mauerkanten" genannt |
| Ohne passende 2004/2005 zerfällt ein Gebäude in Einzelfelder — ein 3×3-Holzfäller wird zu neun Holzfällern | **belegt** | im Editor gesehen, und nach der Korrektur im Editor gegengeprüft: Gebäude erscheinen wieder als ein Stück, die Schrittzahl bleibt über mehrfaches Öffnen und Blättern stabil |
| Mauerwerk trägt in 2004 mal 0, mal 1 — die Regel dahinter ist unbekannt | **offen** | Zwei Hypothesen gemessen und beide widerlegt: es hängt weder an der Länge des Mauerzugs noch an der Position darin (37,7 % Treffer). Über 128 Dateien überwiegt die 1. Bedeutungslos ist der Wert nicht — `applyAIV`, `rotateAIV` und `computeAIVPlacementFit` lesen ihn. Die Umriss-Prüfung im Werkzeug lässt hier deshalb beides gelten |
| Gräben und Baufläche folgen in 2004/2005 einer eigenen Logik | **offen** | Gräben tragen 2 oder 3 und haben einen Umriss |

## 1b. Das Kartenformat (.map)

| Aussage | Marke | Beleg |
|---|---|---|
| `.map` beginnt mit `FFFFFFFF`, dann u32 Größe der Vorschau, dann die Vorschau als gepackter Abschnitt (entpackt, gepackt, CRC32, Daten) | **belegt** | Sourcehold `structure/map_structure.h`, an 113 Spielkarten nachgelesen |
| Die Packung ist dieselbe PKWare-DCL-Implode wie bei `.aiv` — `lib/blast.js` liest sie unverändert | **gemessen** | alle 113 Karten des Spiels entpackt, entpackte Länge stimmt jedes Mal mit der angekündigten überein |
| Die Vorschau ist **200×200 Punkte senkrecht von oben**: 512 Byte Farbtafel (256 Einträge zu 16 Bit, 5-5-5) und danach 40.000 Byte Punktnummern | **gemessen** | 40.512 Byte entpackt bei allen 113 Karten; das Bild ist im Werkzeug sichtbar richtig (Sand, Gras, Fels, Oasen an plausibler Stelle) |
| Danach folgen Beschreibung, vier einfache Abschnitte und ein Verzeichnis mit 150 Plätzen | **abgelesen** | `map_structure.h`; selbst noch nicht durchgelesen — meine eigene Abtastung der Kette bricht nach der Vorschau ab |
| Eine Karte hat **114 Abschnitte**, IDs 1001–1118, im Verzeichnis mit 150 Plätzen (4 Byte Verwaltung mehr als in `map_structure.h` steht: 3036 statt 3032) | **gemessen** | `A Friend Indeed.map` durchgezählt |
| Das Kachelgitter der Karte hat **80.400 Felder**, nicht 400×400. Die Abschnitte sind genau 80.400 · 1, · 2 oder · 4 Byte groß | **gemessen** | Alle Abschnittslängen sind 80.400, 160.800 oder 321.600. 80.400 = 400 · 201 |
| Wie das 100×100-Dorfraster auf der Karte liegt | **belegt** (06.09.2026) | Aus dem Programm gelesen und an 10,3 Millionen Dorffeldern durchgerechnet — siehe den Abschnitt „1b5. Wo das Dorf auf der Karte liegt". Die alte Zeile stand hier als offen und ist damit erledigt |

Nutzbar gemacht in `lib/karte.js` (`leseVorschau`, `vorschauAlsPng`) und in der
Oberfläche unter *Vorlage → Karte des Spiels wählen*. Der Server findet 189
Karten, die des Spiels und die der Plugins.

## 1b6. Das Gelände einer Karte zeichnen (06.09.2026)

**belegt**, aus dem Programm gelesen, von einem zweiten Leser mit einer
Blindprobe bestätigt.

> **Abschnitt 1001 trägt die fertige Bildnummer je Feld**, keinen Geländetyp.
> 2 Byte je Feld, 160.800 Byte = 80.400 Felder. Im Spiel ist das
> `TileMapState.GfxLayer`.

**Wie das belegt ist, ohne Raten:** In der EXE steht eine Adresstabelle
`DAT_MapSectionAddressArray` (`0x00b92a58`, 123 Einträge zu 16 Byte), die zu
jeder Abschnitts-ID die **Zieladresse im Speicher** nennt. Für 1001 steht dort
`0x01ae5688`; `DAT_TileMapState` liegt bei `0x01a93208`, `GfxLayer` bei
`+0x52480` — zusammen genau diese Adresse. Gegenprobe mit 1005:
`0x01a93208 + 0x29fa30 = 0x01d32c38`, und genau das steht in der Tabelle.
Damit sind alle Schichten benannt, nicht nur geraten.

| ID | Name im Spiel | Byte | was drinsteht |
|---|---|---|---|
| **1001** | `GfxLayer` | 2 | **die gezeichnete Bildnummer** |
| 1033 | `AlphaGFXLayer` | 2 | zweites Bild zum Überblenden; meist null |
| 1002 | `PillarGFXLayer` | 2 | Steilkanten, fast überall `tile_cliffs#0` |
| 1003 | `LogicLayer` | 4 | Art des Feldes als Bitfeld (Wasser, Fels, Erz) |
| 1037 | `Logic2Layer` | 1 | dasselbe, zweiter Satz |
| 1036 | `MacroLayer` | 2 | zu welchem Geländefleck ein Feld gehört — **keine** Bildnummer |
| 1005 / 1045 | `HeightLayer` / `DefaultHeightLayer` | je 1 | Höhe |
| 1008 | `RandomLayer` | — | steht in der Tabelle, wird aber in **keiner** der 143 Karten gespeichert |

Dass der Zufallswert fehlt, passt ins Bild: **Die Karte legt das Ergebnis ab,
nicht die Zutaten.** Deshalb steht in 1001 schon die fertige Nummer.

**Vom Wert zum Bild.** Die Nummer zählt über **alle** `.gm1` durch, in der
Ladereihenfolge der EXE:

* `loadGmFiles` (`0x00455c60`) geht die Namensliste ab `0xb601c0` durch
  (Schrittweite 1000 Byte, Abbruch beim Namen „null"), setzt
  `GMTotalPicturesProcessed[gmID]` auf den bisherigen Zähler und addiert die
  Bildzahl aus dem Dateikopf (@12). **Der Zähler startet bei 1.**
* `renderGM` (`0x00455300`) greift auf `GMTotalPicturesProcessed[gmID] + bildNr − 1` zu.
* Daraus: **0-basierter Platz = Wert aus 1001 minus 1.** Die Datei ist die,
  deren Summenbereich den Platz enthält; die Bildnummer ist Platz minus
  Summenanfang. Wert 0 heißt „kein Bild".
* Gezeichnet wird wie ein Gebäudeteil (Datenart 3): die ersten 512 Byte sind
  die Rautenkachel 30×16, der Rest ein TGX-Aufbau, den `kachelVersatz` anhebt
  (Fels, Busch). Lage: `x = 15·(sx−sy)`, `y = 8·(sx+sy)`, von hinten nach vorn.

**Verteilung über 143 Karten und 11.497.200 Felder:** keine Bildnummer außerhalb
ihrer Datei, kein Feld ohne Bildplatz. `tile_land_macros` 6.866.151,
`tile_land8` 3.167.958, `tile_sea_new_01` 435.802, `tile_sea8` 372.060,
`tile_rocks8` 366.766, `tile_land3` 176.379.

**Die Blindprobe, die es entscheidet:** Eine Karte hat **elf** Abschnitte mit
2 Byte je Feld — die Größe allein beweist nichts. Derselbe Ausschnitt aus 1002,
1033, 1036 und 1004 gezeichnet ergibt Steilkanten, Nullen, Farbrauschen mit
zufälligen Soldatenbildern und Gebäudekacheln. **Nur 1001 gibt Gelände.**

**Das Verzeichnis der `.map`**, nebenbei mitgemessen: Es beginnt beim u32-Wert
1001 und hat drei Felder zu je 150 u32 (IDs, Ja/Nein, Versätze), dann 4 Byte,
dann die Daten; je Abschnitt 12 Byte Kopf (entpackt, gepackt, Prüfsumme). Das
Ja/Nein-Feld ist verlässlich: 6781 von 6781 Ja-Abschnitten ließen sich
entpacken, kein einziger Nein-Abschnitt. Von 114 Verzeichniseinträgen tragen
über alle Karten nur **50 IDs** wirklich Daten.

**Zwei offene Stellen, ehrlich getrennt:**

1. **Der Versatz 21.** Ab Listenplatz 149 liegt der Zähler des Spiels um 21
   Bilder unter der Summe aus EXE-Liste und Dateiköpfen. Die Zahl ist an
   11,5 Millionen Feldern angepasst und ein scharfes Minimum (20 → 26.833
   unpassende Felder, 21 → 2.064, 22 → 2.096), und sie tut nachweislich Arbeit:
   ohne sie landen Meeresfelder in Menügrafik. **Warum 21, ist ungeklärt.**
2. **Der Vorschau-Versatz.** Die Zuordnung Vorschaupunkt → Feld
   (`x = px+py`, `y = py−px+199`) stimmt auf **82 von 113** Karten. Auf 31
   sitzt das Feld zwei Spalten weiter (`x = px+py+2`), darunter Rock Face,
   Cyclades, The Dunes, Edessa, Antioch. Das ist vermutlich derselbe Versatz,
   der in Abschnitt 1b5 offenblieb.

Nutzbar in `lib/gelaende.js` und `lib/karte.js` (`leseAbschnitte`,
`abschnittsDaten`, `leseGfxSchicht`); zum Ansehen
`node _zeige_gelaende.js "<karte.map>" <px0> <py0> <kante> "<ziel.png>"`.

**Wozu das gut ist, über die Anzeige hinaus:** Wer einen eigenen Karteneditor
bauen will, braucht genau diese Zuordnungen — welche Schicht was trägt und wie
eine Zahl zu einem Bild wird.

---

## 1b5. Wo das Dorf auf der Karte liegt (06.09.2026)

**belegt**, aus dem Programm gelesen, von einem zweiten Leser unabhängig
nachgebaut und an Millionen Feldern durchgerechnet.

**Das Spielfeld ist eine Raute, kein Rechteck.** Die 80.400 Felder sind nicht
400 × 201, sondern die Fläche einer Raute in einem 400 × 400 großen Rahmen:
Zeile y trägt 2·(y+1) Felder für y ≤ 199 und 800 − 2·y darunter. Aufsummiert
40.200 + 40.200 = **80.400**. Damit ist die krumme Zahl erklärt.

**Die Umrechnung**, in drei Schritten:

```
1) Dorfkoordinate:  vx = versatz % 100      vy = versatz / 100
1a) Dreht die KI (rotateAIV 0x004ed0b0), wird das ganze Raster VORHER gedreht:
      0: vx, vy    2: 99-vy, vx    4: 99-vx, 99-vy    6: vy, 99-vx
2) Kartenkoordinate: mx = keepX - 43 + vx     my = keepY - 43 + vy
3) Kachelnummer:     addX(y) = y*y + 2*y - 199              fuer y <= 199
                     addX(y) = 40200 + 400*k - k*k, k=y-200 fuer y >= 200
                     kachel = addX(my) + mx
```

Die `−43` steht wörtlich in `setKeepOffsetAndOrientation` (`0x004ecf70`):
**Dorffeld (43,43) sitzt auf dem Startplatz der Karte.** Der bisherige
„Ansatzpunkt" war also nicht nur eine Vermutung, sondern die Rechenregel
selbst. Die Zeilentabelle füllt `setTileSystemMemoryLookupArrays`
(`0x004e2050`), das Abschreiten des Rasters macht `applyAIV` (`0x004ef0d0`).

**Die Vorschau ist die um 45 Grad gedrehte Raute** — Punkt für Punkt, ohne
Verkleinerung:

```
nur fuer x+y ungerade:   px = (x - y + 199) / 2      py = (x + y - 199) / 2
zurueck:                 x  = px + py                y  = py - px + 199
```

Von den 80.400 Kacheln haben genau 40.200 ein ungerades x+y; davon liegen
40.000 = 200 × 200 im Bild, ohne eine Doppelbelegung und ohne einen leeren
Punkt. Die anderen liegen zwischen den Punkten. **Ein 100×100-Dorf erscheint
auf der Vorschau darum als Raute mit rund 99 Punkten Diagonale, nicht als
Quadrat** — wer es als Quadrat einpasst, liegt zwangsläufig schief.

**Wie belastbar das ist:** Bergfried auf (43,43)–(49,49) in **128 von 128**
AIV-Dateien; sechs 7×7-Bergfriede in der Bautyp-Schicht einer echten Karte
gefunden; Bijektion über alle 80.400 Felder ohne Lücke und ohne Doppelung;
Belastungsprobe über sechs Karten × 128 Burgen = 4096 Aufstellungen und
**10.266.592 Dorffelder** — keine Kachel außerhalb, kein zerrissenes Gebäude,
Bergfried trifft den Startplatz 4096 von 4096 Mal. Auch die Extremwerte
(Versatz 0, 99, 9900, 9999, Bergfried an der Rautenspitze, `keepX` kleiner 43).

**Offen geblieben:** Bei 19 der 113 Karten — den kleinen Formaten 98×99 und
78×79 — ist nicht entschieden, ob die Vorschau um zwei Punkte versetzt liegt.
Dort reicht das Bild bis an den Rand, es gibt keinen schwarzen Rahmen zum
Vergleichen. Der Zusammenhang ist gemessen (volle Karte → 0, 300er-Karte → 2),
die Regel dahinter nicht gefunden.

---

## 1b2. Die Treppen (06.09.2026)

**gemessen**, an allen 128 mitgelieferten AIV-Dateien:

* **62 von 128** Burgen haben Treppen.
* Eine Treppe ist immer ein **Fünfersatz 14, 15, 16, 17, 18** — in jeder Datei
  kommen die fünf Nummern gleich oft vor, nie einzeln. Über alle Dateien je
  **145 Felder**.
* **Treppe 6 (AIV 19, Mapper 186) kommt in keiner einzigen Datei vor.**
* Jedes Treppenfeld liegt **an einer Steinmauer (Bau 10)**, in drei
  nachgesehenen Dateien ausnahmslos; nie an Holz.

Nachzuvollziehen mit `lib/aiv.js` → `decode(...).bauten`, Nummern 14–18 zählen.

**Was daraus folgt und was nicht:** Der Fünfersatz erklärt, warum
Schlossgespensts AI-Toolkit die Treppe als *Rezept* führt (High Stair =
181–185, das sind die Mapper zu 14–18). Welche **Grafik** das Spiel dafür
zeichnet, ist damit nicht entschieden.

### Die Treppengrafik — gefunden (06.09.2026)

**belegt**, aus dem Programm gelesen und im Bild bestätigt:

> Die AIV-Treppe wird aus **`tile_land3.gm1`** gezeichnet, Bilder
> **#133, #134, #135, #136** — eine je Blickrichtung — und **#104** für ein
> Treppenfeld, neben dem nichts Höheres steht.

Die Kette, jedes Glied nachprüfbar:

1. `convertCommandBuildingTypeToBuildingType` (`0x00409370`) bildet Mapper auf
   Bautypen ab. Die Sprungtabelle bei `0x004097c4` liefert für die Mapper
   **181–189 den Wert 91**, die Funktion hat aber nur die Fälle 0–90.
   **Treppen sind also keine Gebäude** und haben keine Sprite-ID.
2. Stattdessen sind sie eine Eigenschaft der Kachel: `LogicLayer & 0x800`,
   in `hasHigherNeighborWithStairs` (`0x004f8a40`) als `L_STAIRS` kommentiert.
3. Diese Funktion wird an genau vier Stellen gerufen, alle in
   **`updateGfxLayer`** (`0x00509180`) — mit den Richtungen 0, 2, 4, 6.
4. Dort steht die Zuweisung
   `GfxLayer[kachel] = GMTotalPicturesProcessed[0xc] + {104, 133, 134, 135, 136}`.
5. `GMTotalPicturesProcessed[i]` ist der laufende Bildindex je Grafikdatei;
   `i` ist die **GmID**, und die Aufzählung ist **1-basiert**:
   `GID_TILE_LAND_3 = 12`. Also `tile_land3.gm1`.
6. **Gegenprobe**, unabhängig: Im selben `updateGfxLayer` steht Datei **5**
   (`GID_TILE_SEA_8 = tile_sea8`) mit Versätzen ab **204**. Genau dort liegen
   unsere Wassergraben-Bilder (`tile_sea8#204`–`#235`, seit dem 05.09. im
   Bildvorrat). Zwei Wege, dieselbe Rechnung.
7. **Augenschein**: `node _bogen.js tile_land3 133 136 <ziel.png> 4` zeigt vier
   hölzerne Treppen in vier Richtungen, `104` ein flaches Holzpodest.

**Was das für die Anzeige heißt:** Die Grafik hängt an der **Richtung**, nicht
an der Stufennummer. Die fünf AIV-Nummern 14–18 sind kein Bildersatz von hoch
nach niedrig — sie bekommen alle dieselben vier Bilder, ausgewählt danach, auf
welcher Seite die höhere Nachbarkachel liegt.

**widerlegt** damit: die Kandidaten aus `tile_castle` (#1550–#1554,
#1563–#1567), die ich am selben Tag über die Höhenstaffelung gefunden hatte —
sie sehen aus wie Treppen, werden für AIV-Treppen aber nicht benutzt. Ebenso
die alte Backlog-Spur `tile_buildings1` 390–393 (Bodenkacheln).

Der Weg dorthin war reines Lesen: Ghidra headless auf `OpenSHC-ref`, kein
Spielstart, keine Sperre. Skripte in `werkzeug/`, Aufruf in Abschnitt
„So findet man das selbst".

---

## 1b3. Die Zinnenmauer (06.09.2026)

**belegt**, aus dem Programm gelesen und an den Bildern nachgemessen.

Die Zinnenmauer hat **kein fertiges Einzelbild**. Das Spiel setzt sie aus zwei
Teilen zusammen:

* **Flanke** aus `anim_castle.gm1` — `#48`–`#61` glatt, `#62`–`#75` mit
  Zinnenkranz. Der Aufschlag von genau `0x0e` kommt, wenn zwei Nachbarkacheln
  `L_CRENEL` tragen.
* **Krone** aus `tile_land3` — `#112`–`#119` eine flache Platte (die Scharte),
  `#120`–`#127` ein aufgesetzter Klotz (die Zinne). Welche von beiden kommt,
  entscheidet allein die **x/y-Parität** der Kachel (`L_CRENEL_VARIATIONUnk`,
  `0x400000`). Darum wechseln Zinne und Scharte im Schachbrett entlang der
  Mauer — das ist der Zinnenkranz.

**Daniels „flache Version, einer der 4: 195–198" ist die Flachansicht**, die
das Spiel auf die Leertaste legt (`toggleFlatView` `0x004f70b0`, gerufen aus
`WindowMsgProcessingFunc` bei `VK_SPACE`). Dort steht in `renderMap`
(`0x004e8cf0`) wörtlich `Bild = flatties + 0x24 + (RandomLayer & 3)`, also
`tile_flatties#36`–`#39`; beschädigt `+0x2c` = `#44`/`#45`.

**Warum er nur „einer der 4" sagen konnte:** die vier Bilder sind
**punktgleich** — 0 von 274 Punkten verschieden, selbst nachgemessen. Es ist
gleichgültig welches, und sie gelten für **12 wie 13**.

**Der Unterschied zwischen hoch (12) und niedrig (13)** ist eine einzige Zahl.
`placeDefensiveStructureTile` (`0x005034a0`) setzt bei Mapper 26 die Höhe
`+98`, bei Mapper 35 `+68`; alle Bits sind gleich. Die Höhe wirkt aber
**mittelbar doch auf ein Bild**: `isWallConnectionHeightValid` (`0x004f8840`)
vergleicht `HeightLayer[Kachel] − 0x10` gegen den Nachbarn, und daraus wählt
`computeWallCornerRenderRotation` das Verbindungsbild. Eine Steinmauer neben
einer niedrigen Zinne verbindet also anders als neben einer hohen.

**Was die fuenf Mauerbilder in `tile_buildings1` wirklich sind** — Daniel am
06.09.2026, beim Durchsehen von `#0`–`#4`: „Nummer 1 zeigt leichtes
Grundgeruest, waehrend man es bei 3 mehr sieht, bei 2 sieht man es noch mehr,
aber die Hoehe ist geringer; bei Bild 4 ist wieder gleiche Groesse wie 1 und 3,
aber unten sieht man eben noch das Konstrukt darunter; und bei 5 sieht man
alles x-ray, aber es ist groesser und wahrscheinlich eine Zinne. **Aber das ist
was da steht, wenn man sie AUFZIEHT** — dieses x-ray. Beim Loslassen und
tatsaechlich Bauen ist es dann eine echte Zinne."

Das deckt sich mit `renderWallDragPreview`: Die Bilder `#0`–`#4` sind
**Vorschaubilder fuer das Ziehen**, keine gebauten Mauern. `#4` (30x117) ist
die Zinnenmauer, wie sie unter dem Mauszeiger haengt — durchscheinend, mit
Geruest. Wer eines davon als Bild eines fertigen Bauwerks nimmt, zeigt eine
Baustelle.

**Im Spiel gegengeprueft** (Daniel, 06.09.2026, mit Bildern): Eine gebaute
Mauer ist oben **glatt** - die Zacken auf `tile_buildings1#0`/`#2` sind das
Gitter der Vorschau, keine Zinnen. Die Zinnenmauer ist dieselbe Mauer mit einem
**Zackenkranz obendrauf** und dadurch sichtbar hoeher. Und: „Es ist egal, ob
kleine oder grosse Mauern - wenn ich nur eine Zinne ziehen will, kommt dieses
Graue als Vorschau", also `tile_buildings1#4`. Das bestaetigt am laufenden
Spiel, was aus `renderWallDragPreview` (`0x004f8bd0`) gelesen war: fuer den
Zinnenbefehl `0x1a` steht dort genau ein Bild, und fuer die niedrige Zinne
(Mapper 35) gibt es gar keinen Menuebefehl - darum ist die Vorschau immer
dieselbe.

**Dazu passen die Masse in `anim_castle`**: `#48`-`#61` sind 32x99 und oben
schraeg abgeschlossen (glatte Mauer), `#62`-`#75` sind 32x130 und tragen ueber
einer Trennlinie einen abgesetzten Block - den Kranz. Die Differenz von 31
Punkten ist genau das, was im Spielbild obendrauf sitzt.

**Eine gebaute Mauer besteht immer aus Koerper und Krone.** Gemessen an den
Bildern: ohne Zinnen ist die Krone eine flache Platte (`tile_land3#96`–`#111`,
30x18), mit Zinnen wechseln im Schachbrett flache Scharte (`#112`–`#119`,
30x22) und aufgesetzter Klotz (`#120`–`#127`, 30x37/38). Der Zinnenkranz ist
also **Feld fuer Feld gebaut**, nicht ein Bild.

**Korrektur am selben Tag:** Ich hatte `anim_castle#48`–`#75` erst fuer blosse
Texturstreifen gehalten — ein Fehlschluss aus einem zu kleinen Bogen. Gross
angesehen sind es **Mauerflanken**: `#48`–`#61` (32x99) mit schraegem Abschluss
oben, `#62`–`#75` (32x130) mit einem abgesetzten Block darueber — dem
Zinnenkranz. Die 31 Punkte Unterschied sind genau das, was im Spielbild
obendrauf sitzt.

**Am Bild bestaetigt, mit einer Ausnahme, die im Code noch fehlt** — Daniel,
06.09.2026: „Die Zinnen sind nicht auf jedem, sondern wirklich nur auf manchen,
jedem 2. — bis auf die Ecken, die sind immer hoch.“

Der Wechsel jede zweite Kachel ist die x/y-Paritaet aus
`placeDefensiveStructureTile`, die war gelesen. **Die Ecken-Ausnahme ist neu**
und aus dem Code bisher NICHT belegt. Sie passt aber zu
`computeWallCornerRenderRotation` (`0x004fc650`), die je Kachel beide Nachbarn
prueft — eine Ecke hat andere Nachbarn als ein gerades Stueck. Wer den
Zinnenkranz nachbaut, braucht beide Regeln: **Ecke immer Klotz**, dazwischen
Klotz und Scharte im Wechsel.

**Folge fuer den Editor:** Ein einzelnes fertiges Bild einer Zinnenmauer gibt
es nirgends. Wer eines zeigen will, muss es zusammensetzen — und wer eine ganze
Mauer zeichnet, braucht dazu die Paritaet und die Ecken-Ausnahme.

**Nebenbefund:** Bau 13 kann der Spieler gar nicht ziehen — für Mapper 35 gibt
es keinen Menübefehl. Nur die KI setzt sie. Gemessen an 749 AIV-Dateien: Bau 12
kommt 73.464-mal in 535 Dateien vor, Bau 13 17.989-mal in 188.

**Nicht widerlegt**, obwohl im ersten Anlauf so gemeldet: der Eintrag zur
Seitenfläche aus `anim_castle.gm1`. Die Gegenprobe hat ihn im Code bestätigt
(`renderGM(..., GM_CASTLE_ANIMS, ...)`, `GID_ANIM_CASTLE = 54`). Wer hier nur
`WallGFXLayer = GMTotal[10] + …` liest, hält ihn fälschlich für überholt —
`WallGFXLayer` trägt an anderer Stelle eine Höhe statt einer Bildnummer.

---

## 1b4. Die Vorplätze sind eigene Gebäude (06.09.2026)

**belegt**, aus dem Programm gelesen, von einem zweiten Leser Glied für Glied
nachgeprüft.

> Ein Vorplatz ist kein Bodenbelag und kein Teil des Gebäudebildes, sondern ein
> **eigenes zweites Gebäude**, das das Spiel beim Setzen des Hauptgebäudes
> automatisch mit anlegt.

| Hauptgebäude | Setz-Funktion | legt an | Größe | Lage | Bild |
|---|---|---|---|---|---|
| Ölbrennerei (35) | `placeOilsmelter` `0x00508030` | `BT_CAMPFIRE` (51) | 4×4 | (0, 4) | `tile_buildings1#296` |
| Kaserne (55), Söldnerposten (39) | `placeBarracks` `0x005076a0` | 57 / 58 / 56 | je 5×5 | (5,0) (0,5) (5,5) | `#72` `#122` `#97` |
| Ingenieursgilde (57) | `placeEngineersguild` `0x00507bd0` | `BT_PARADEGROUND` (53) | 5×5 | (0, 5) | `#147` |
| Tunnelgräbergilde (58) | `placeTunnelersguild` `0x00507e00` | `BT_PARADEGROUND5` (59) | 5×5 | (0, 5) | `#172` |
| Bergfried (38) | `placeKeep` `0x005146d0` | `BT_CAMPGROUND` (55) | 7×7 | (0, 8) | `#23` |

Bild und Lage stehen in `DAT_BuildingDefinedData` (`0x005b7974`) und
`DAT_TerrainDefinedData` (`0x00b48f54`, Feld `field63_0x19c`). **Die
Sprite-Nummern des Programms sind 1-basiert, unsere Bildnummern 0-basiert** —
die abziehende Zeile steht in `updateBuildingGraphicsLayer` (`0x00506370`).
Zwei unabhängige Anker: Ölbrennerei Sprite 708 → `tile_buildings2#707`,
Steinbergfried Sprite 714 → `tile_castle#713`.

**Was das wert ist:** Die Vorplatz-Tabelle in `lib/webbilder.js` war am
05.09.2026 aus Bildähnlichkeit und aus der Zählung an 163 AIV-Dateien
entstanden. Der Code bestätigt sie Feld für Feld — mit **einer Korrektur**: die
Tunnelgräbergilde trug das Bild der Ingenieursgilde (`#147` statt `#172`; die
beiden sind punktweise verschieden). Und mit **einer Ergänzung**: der 4×4-Platz
der Ölbrennerei, der bis dahin leer blieb.

Damit ist auch der offene Punkt bei **Bau 2 (Baufläche)** geschlossen: Es ist
keine Bodentextur, sondern je nach Nachbargebäude eines von sieben
Gebäudebildern.

**Offen geblieben:** Auf `#296` ist kein Feuer zu sehen, obwohl der Typ
`BT_CAMPFIRE` heißt. Feuer und Ölpresse kommen aus `anim_boiled_oil.gm1` (138
Bilder zu 100×100) und hängen am Gebäude, nicht am Platz. Wo genau die
Feuerstelle sitzt, die man im Spiel sieht, ist damit **nicht** geklärt.

**Beide Befunde ohne Spielstart**, reines Lesen in Ghidra plus Nachmessen an
den `.gm1`-Dateien. Am laufenden Bildschirm gesehen ist keiner von beiden.

---

## 1c. Die Bildersammlungen (.gm1)

| Aussage | Marke | Beleg |
|---|---|---|
| Kopf 88 Byte; @12 Anzahl Bilder, @20 Datenart, @80 Datengröße. Danach 10 Farbtafeln zu 256 Farben (je 2 Byte, 5-5-5), dann je Bild Offset, Größe und ein 16-Byte-Kopf | **belegt** | Stronghold-Wiki und die Umsetzung von LordVonAdel; alle 199 `.gm1` im `gm`-Ordner lesen ihren Kopf fehlerfrei |
| Datenart 3 sind Gebäude und Kacheln. Davon gibt es 20 Dateien | **gemessen** | 118 Bewegtbilder, 33 gepackte, 20 Oberflächen, 20 der Art 3, 4 ungepackte, 3 Schriften |
| **Ein Eintrag ist immer genau eine Kachel breit (30 Punkte).** Ein Gebäude besteht aus mehreren | **gemessen** | In allen vier Gebäude-Dateien ist jede Breite 30 |
| **`teile` ist eine Quadratzahl und nennt die Grundfläche: `teile = n·n` bei n×n Kacheln** | **belegt** | Nur Quadratzahlen kommen vor (1, 4, 9, 16, 25, 36, 49, 81, 121, 169). Summe über alle Bauten ergibt genau die Bildanzahl der Datei. Gegenprobe `tile_churches`: 36, 81, 169 — und die Tabelle sagt Kapelle 6×6, Kirche 9×9, Kathedrale 13×13 |
| `versatzX`/`versatzY` sind Punkte auf einer gemeinsamen Fläche der ganzen Datei, nicht im Gebäude — je Bau den kleinsten Wert abziehen | **gemessen** | Ohne Abzug wachsen die Bildbreiten monoton über die Datei |
| Das Feld bei +14 (früher „Baubreite" genannt) sagt über die Größe nichts | **widerlegt** | Es trägt in allen 20 Dateien nur 0 oder 30 |
| **Wie die Teile eines Gebäudes zueinander liegen: gelöst.** Die Lage steht *nicht* in der Datei, sie wird gerechnet. Die Teile füllen eine Raute von der untersten Spitze nach oben — erst 1 Kachel, dann 2, 3 … bis n, danach wieder abwärts. Je Kachel 32 Punkte nach rechts, je Zeile 8 nach oben und 16 nach links; ab der Mitte 16 nach rechts. Startpunkt: `y = Höhe − 16`, `x = ⌊n/2⌋·30 + (n−1) − (n gerade ? 15 : 0)`. Bildgröße `n·30 + (n−1)·2` breit | **belegt** | Nachgebaut nach Gm1KonverterCrossPlatform; im Bild geprüft: Kathedrale, Kirche, Kapelle und zerstörte Kathedrale stehen richtig zusammen |
| **`kachelVersatz` hebt den Aufbau über seine Kachel.** Ohne dieses Feld schwebt das Dach. Bei `richtung` 3 kommen 14 Punkte nach rechts dazu | **belegt** | dieselbe Quelle, dasselbe Bild |
| `versatzX`/`versatzY` sind für den Zusammenbau **nicht** zu gebrauchen — wer sie als Lage im Gebäude liest, bekommt bei der Kapelle eine senkrechte Spanne von 192 statt 96 | **widerlegt** | eigener Fehlversuch, an der Kapelle gemessen |
| Dass `teile` die Grundfläche nennt: `n = √teile` | **belegt** | Die Rechenvorschrift des fremden Werkzeugs kommt über ihre Eckenzählung auf denselben Wert; Gegenprobe an den drei Kirchen |
| **Die gm1-Dateien enthalten Altbestand aus Stronghold 1**, den Crusader nicht benutzt — etwa Holzpalisaden statt Steinmauern. Wer nach Grundfläche filtert, zieht ihn mit | **belegt** | Von Daniel im gerenderten Beispieldorf erkannt: die 1×1-Bauten kamen als Holzwälle heraus, die es in Crusader nicht gibt |
| **Jedes Gebaeude liegt mehrfach vor: je Ausrichtung und je Zustand** (offen mit Arbeiter, geschlossen ohne). Eine Bau-Nummer zeigt darum auf eine Gruppe von Bildern, nicht auf eines | **belegt** | Von Daniel an den Baeckereien im 4x4-Bogen erkannt. Erklaert die Zahl: 154 Bilder fuer 16 Werkstaetten sind rund zehn Fassungen je Gebaeude |
| **Eine Werkstatt hat 18 Fassungen** — Ausrichtungen und Zustaende zusammen | **gemessen** | Daniel beim Durchgang durch den 4x4-Bogen: „das geht 18 Gebaeude weiter", und dieselbe Schrittweite bei Schwertmacher, Ruestungsschmied und Lederharnischmacher |
| **Welche Bau-Nummer welches Bild hat: für 74 der 82 quadratischen Nummern eingetragen. Daniel hat alle 74 selbst durchgesehen** — 52 bestätigt, 13 als richtiges Gebäude ohne einen Teil, 9 widerlegt | **belegt** (65) / **widerlegt** (9) | `lib/gebaeude_bilder.json`, dazu sein Urteil je Nummer in `lib/zuordnung_urteil.json`. Gesichtet wurden alle 549 Gebäudebilder der zehn Dateien |
| Widerlegt sind: Zinnenmauer hoch, Treppe 1 bis 4, Wassergraben a bis d. Die dafür gewählten Bilder erkennt Daniel nicht als das Gebäude | **gemessen** | sein Durchgang am 05.09.2026 |
| **Die Mauern werden aus zwei Teilen zusammengesetzt**: die Kachel mit der Oberseite aus `tile_buildings1` (Bilder 0 bis 3) und die **Seitenfläche aus `anim_castle.gm1`** — glatt (Bilder 48–61, 32×99) oder mit Zinnenkranz obendrauf (62–74, 32×130) | **gemessen** | Beide Gruppen gezeichnet und angesehen. Erklärt Daniels Satz zur Zinnenmauer: „das ist normalerweise die Steinmauer aber mit noch etwas oben drauf" |
| **In der AIV steht keine Ausrichtung.** Von den vierzehn Abschnitten trägt keiner ein Richtungsfeld; nur bei den Torhäusern ist die Richtung eine eigene Bau-Nummer (40/41 und 42/43). Alle anderen Bauten richtet das Spiel selbst aus | **gemessen** | Abschnittsliste in `lib/aiv.js`, an Emir3 nachgesehen |
| **Bei den Torhäusern gehört das O-W-Bild zur N-S-Nummer und umgekehrt** — die beiden Paare waren getauscht | **gemessen** | Von Daniel am 05.09.2026 im Editor gesehen („die Torhäuser O-W sind eigentlich 90 Grad gedreht"). Unabhängig dazu passend: das einzige in allen AIV-Dateien verbaute Torhaus sitzt in einer Mauerlinie längs x, seine Durchfahrt läuft also längs y |
| **Die Torhaus-Nummern in der Durchfahrtsrichtung: 40 und 42 laufen N–S, 41 und 43 laufen O–W** | **gemessen** | Drei unabhängige Belege: der Torbogen im Bild (`tile_castle#394` und `#468` öffnen nach links-unten = Süden, `#369` und `#419` nach rechts-unten = Osten), die Etiketten im AI-Toolkit (144 „Small Gate NS", 145 „EW", 146 „Large Gate NS", 147 „EW") und Daniels Beobachtung im Editor. Unsere alten Namen hießen genau umgekehrt und sind darum auf „Durchfahrt N-S/O-W" geändert |
| **Die 90 Bilder aus Schlossgespensts AI-Toolkit sind KEINE Spielgrafiken**, sondern beschriftete Farbquadrate in Draufsicht — deckend, quadratisch, Kantenlänge n·64, mit dem englischen Gebäudenamen darauf. Für die schräge Ansicht taugen sie nicht; in der Rasteransicht sind sie die Beschriftung, die der AIV-Editor dort nie hatte | **gemessen** | Alle 90 als Montage gezeichnet und angesehen (05.09.2026). Kein einziges hat einen durchsichtigen Rand; die ersten 20 Nummern sind Einheiten-Sprites und gehören zu keinem unserer Bauten |
| **Die Namen decken sich: 72 von 72 Bau-Nummern mit Toolkit-Kachel tragen dort denselben Namen wie bei uns** — die einzige Abweichung waren die vier Torhäuser, und die ist geklärt | **gemessen** | Kachel für Kachel gegen `lib/gebaeude.json` gelesen. Damit ist unsere Nummernliste unabhängig bestätigt |
| **Der Wassergraben hat kein Gebäudebild.** Kein einziges 1×1-Bild der zehn Dateien hat nennenswert blaugrüne Punkte; im Spiel ist der Graben eine ausgehobene Mulde voll türkisem Wasser, das als **Gelände** gemalt wird | **gemessen** | Farbsuche über alle 549 Bilder, Schwelle 10 Prozent: ein einziger Treffer, und das ist der 6×6-Teich |
| **Drei Bergfried-Stufen, aber nur eine AIV-Nummer.** Das Spiel kennt Herrenhaus, steinernen Bergfried und Bollwerk; die Tabelle hat nur Nr. 38 (`M_MAPPER_KEEP2`, `BT_STONEKEEP`) — den mittleren. Der ist das 7×7-Bild `tile_castle#713`. Der große Bergfried ist das 11×11-Bild `tile_castle#1071`, das ummauerte Gehöft mit zwei Ecktürmen sind die 7×7-Bilder auf den Plätzen 5 und 6 | **abgelesen** | Von Daniel am Baumenü und am 11×11-Bild benannt (05.09.2026) |
| **Der Vorplatz gehört nicht zum Gebäudebild.** Beim Bergfried liegen Eingangsvorbau, gepflasterter Vorplatz und Feuerstelle daneben, nicht im 7×7-Bild; dasselbe bei Kaserne, Söldnerposten, Ölbrennerei und den beiden Gilden. In der AIV steht davon nichts — sie kennt nur die Kantenlänge des Bauwerks | **gemessen** | Alle zwölf 7×7-Bilder angesehen; keines enthält Vorbau oder Vorplatz. Daniels Spielbilder zeigen beides |
| **Die Vorplätze in Feldern, an 163 AIV-Dateien gemessen**: Bergfried 7×7-Hof bei dy 8, davor eine Übergangsreihe aus 3 Feldern (dx 2–4, dy 7), dazu das Lager 5×5 rechts oben (dx 7, dy 2) · Söldnerposten und Kaserne stehen oben links in einem 10×10-Quadrat · beide Gilden 5×5 darunter (dy 5) · Ölbrennerei 4×4 darunter (dy 4) | **gemessen** | Für jedes Vorkommen gezählt, welche Nachbarfelder Bauflächen (Nr. 2) sind; aufgenommen wurde nur, was bei mindestens vier von fünf Vorkommen so aussieht. 162 Bergfriede, 110 Kasernen, 132 Ingenieursgilden. Dieselben Formen stehen unabhängig davon in Schlossgespensts `config/aiv_templates.json` |
| Die Gegenprobe: von 30.788 Feldern, die unsere Vorplatz-Bilder abdecken, sind **30.713 auch in der Datei als Baufläche eingetragen** (99,8 %). Die 75 Ausnahmen sind drei Dörfer, die ihren Bergfried ohne Hof gesetzt haben | **gemessen** | Seitdem wird eine Platte nur noch auf ein Feld gezeichnet, das wirklich Nr. 2 trägt |
| **Die Lage im Bauwerk (Abschnitt 2005) ist ein Positionscode**: 1–4 sind die vier Ecken (oben links, oben rechts, unten rechts, unten links), 5–8 die Ränder (oben, rechts, unten, links), 9 innen, 0 gehört nicht dazu | **abgelesen** | Aus `config/aiv_templates.json` des AI-Toolkits, das für 68 Gebäude fertige Vorlagen der Abschnitte 2004, 2005 und 2007 mitbringt |
| **Ein Gebäudebild ist nicht das ganze Gebäude.** Was sich bewegt, liegt in einer eigenen Datei `anim_<gebäude>.gm1` — es gibt 45 davon, praktisch eine je Gebäudeart | **gemessen** | Alle `.gm1` durchgezählt; an `anim_windmill` (75 Bilder) im Bild geprüft: 0–14 Flügel, 15–29 drehbares Dach, 30–44 Mahlwerk, 45–74 der Müller mit dem Sack. Die Kachel `tile_buildings2#218` zeigt nur den Bock mit dem Mühlenkasten |
| Von Daniels 13 „unvollständig" haben sechs eine gleichnamige Bewegtbild-Datei: Ölbrennerei, Fallgrube, Bergfried (`anim_castle`), Tunnelgräbergilde, Mühle, Maibaum, Tanzbär | **gemessen** | Namensvergleich gegen alle `anim_*.gm1` |
| Für die **Außenbereiche** (Trainingsplatz an Kaserne und Söldnerposten, Versammlungsplatz an den Gilden) gibt es **keine** gleichnamige Datei — sie sind also weder Teil der Gebäudekachel noch ein eigenes Bewegtbild | **gemessen** | dieselbe Suche; wo sie stattdessen liegen, ist **offen** |
| **Eine Werkstatt hat 18 Fassungen = 2 Innenzustände × 9 Dachzustände.** Die erste Neunerreihe zeigt den Bau ohne Betrieb (kein Ofen, kein Feuer, keine Haut), die zweite mit | **gemessen** | An Bäckerei (Bogenplätze 41–58), Brauerei (77–94) und Gerberei (131–148) je gleich. Bestätigt Daniels „das geht 18 Gebäude weiter" |
| **`tile_walls.gm1` enthält die Mauern — aber als Datenart 5 (ungepackt), nicht als Datenart 3.** Wer nur die Gebäude-Dateien liest, findet nie eine Mauer | **gemessen** | 72 Bilder: 63× 30×186, 8× 30×87, 1× 30×75 |
| In Datenart 5 stehen 2 Byte je Punkt, aber nur `hoehe − 7` Zeilen — bei allen drei Höhen exakt | **gemessen** | 10740/2/30 = 179 bei Höhe 186; 4800/2/30 = 80 bei 87; 4080/2/30 = 68 bei 75 |
| Der Inhalt von `tile_walls.gm1` sind **Mauertexturen**, senkrechte Streifen in Sandstein, Graustein und Holz — keine fertigen Mauerbilder. Die einzelnen Mauerkacheln stehen als Datenart 3 in `tile_buildings1` | **gemessen** | Bogen aus allen 72 gezeichnet und angesehen |
| Die hohe Mauerkachel ist 30×97 Punkte, die niedrige 30×70; **beide tragen denselben Zinnenkranz**. Zwei der hohen Bilder unterscheiden sich in nur 278 von 2910 Punkten | **gemessen** | `tile_buildings1#0`, `#1`, `#2`, punktweiser Vergleich |
| **Für Getreidefarm, Hopfenfarm, Apfelplantage und Milchviehhof gibt es in KEINER Datei ein Gebäudebild.** Kein Bild hat 10×10 Kacheln, und die drei 9×9-Bilder sind ein europäischer Bergfried, sein Fundament und die Kirche | **gemessen** | alle 20 Dateien der Datenart 3 durchgezählt |
| Von den 20 Dateien der Datenart 3 tragen nur zehn Bauten. Die übrigen sind Gelände (`tile_land*`, `tile_sea*`, `tile_rocks8`, `tile_land_macros`), Brandflecken (`tile_burnt`), Kacheldaten (`tile_data`) und **die Waren auf dem Lagerplatz** (`tile_goods`, 258 Stück zu 2×2) | **gemessen** | dieselbe Zählung |

Leser: `lib/gm1.js` (`leseGm1`, `bildVon`, `ganzesGebaeude`).

## 2. Die drei Nummernsätze

Die häufigste Fehlerquelle. Dasselbe Bauwerk hat drei verschiedene Nummern.

| Satz | Wo er gilt | Quelle | Marke |
|---|---|---|---|
| **AIV-Typ** | in der Datei, Abschnitt 2007 | `BUILDING_TYPE_AIV_FILES_KV` in `sourcehold/tool/convert/aiv/info.py` | **belegt** — 59 benutzte Nummern gegen die gemessenen Grundflächen aller Dateien geprüft, keine Abweichung |
| **Mapper-Typ** | im Speicher, `AIVBuildingStep.buildingType` | Datentabelle der exe ab `0x00B46218`, 79 Werte für AIV 30–108; AIV 10–24 im Schalter davor | **belegt** — aus der exe gelesen und mit den `.variant`-Dateien von `kolunmi/gtk-crusader-village` gegengeprüft |
| **Laufzeit-Typ** | Gebäude-Array, `destroyBuilding` | Sprungtabelle `0x5B79A8`, gleich `sourcehold/data/shc.py` | **belegt** — sieben Anker aus der `PROTECTED`-Liste des Hot-Swap-Moduls stimmen |

Beispiel Bogenmacher: **AIV 51**, im Speicher **50**, zum Abreißen **12**.

Umrechnung im Spiel: `AIVState::convertAIVBuildingTypeToCommandBuildingType` (`0x4ECFE0`).

| Aussage | Marke |
|---|---|
| Mauern, Zinnen und Treppen haben **keine** Laufzeit-Nummer — sie sind keine Gebäude, sondern Kachelbits | **belegt** (Sprungtabelle enthält keinen Mauertyp; `destroyWall` arbeitet auf Kacheln) |
| Lord-Reihenfolge (`aiType`): 0 Rat, 1 Snake, 2 Pig, 3 Wolf, **4 Saladin**, 5 Caliph, 6 Sultan, 7 Richard, 8 Frederick, 9 Phillip, 10 Wazir, 11 Emir, 12 Nizar, 13 Sheriff, 14 Marshal, 15 Abbot | **belegt** — Dateinamenstabelle ab `0x00B46358` |

## 3. Adressen

Alle aus der Ghidra-Referenz `OpenSHC-ref` **abgelesen**.

| Was | Adresse |
|---|---|
| `DAT_AIVState` | `0x01866AB0` |
| `DAT_BuildingsState` | `0x00F98520` |
| `DAT_TileMapState` | `0x01A93208` |
| `DAT_GameState` | `0x0112B0B8` |
| `DAT_AICState` | `0x023FC8E8` |
| `DAT_WallAndPitchState` | `0x00EE19D0` |
| `DAT_GameSynchronyState` | `0x0191D768` |
| `DAT_AIVDefinedData` | `0x00B46124` |

### Bauliste

```
AIVState  +0x04  aivs[9], je AIVSpec = 28056 Byte (0x6D98)
AIVSpec   +0x00 playerID   +0x04 aiType   +0x0C castleID
          +0x14 currentStepGoal          +0x1C buildInterval (Kopie aus der AIC)
          +0x20 totalSteps
          +0x24/0x28 keepXOffset / keepYOffset   +0x2C/0x30 keepX / keepY
          +0x34 aivBuildingSteps[1000], je 12 Byte
          +0x2F14 locationsArray[4000]    +0x6D94 wallLocationsArrayIndex
Schritt   +0x00 buildStatus  +0x01 wait  +0x02 buildingType (Mapper)
          +0x04 quantity     +0x06 flag3 +0x08 location
```

| Aussage | Marke | Beleg |
|---|---|---|
| Ein Baulisten-Eintrag je **Bauschritt**, nicht je Kachel | **belegt** | King1 hat 2600 belegte Kacheln, ein Slot fasst nur 0x922 = 2338 Einträge — je Kachel passt nicht hinein, je Schritt (645) schon |
| Schritte sind 1-basiert, Index 0 bleibt leer | **abgelesen** | der Spielcode läuft `n = 1` bis `totalSteps` |
| Höchstens 999 Bauschritte | **abgelesen** | `aivBuildingSteps[1000]`; größter Wert in echten Dateien ist 991 (`nocturne_rat1`) |
| Zustände: 0 aus, 1 ungebaut, 3 gebaut, 4 kein Platz, 5 keine Rohstoffe | **abgelesen** | Enum `AIVBuildingStepStatus` |
| Zustand 4 wirkt wie 0 — beide überspringen den Schritt | **belegt** | `aiPlaceAIVBuilding` prüft bei `0x4ED461` auf 0 und `0x4ED465` auf 4; im Spiel bestätigt |

### Gebäude

```
BuildingsState +0x00 structCount  +0x08 maxBuildingsCount
               +0x14 buildings[2000], je 812 Byte
Building  +0x08C xPosition  +0x08D yPosition
          +0x0D0 logicalState  +0x0D2 buildingType (Laufzeit)  +0x0D6 owner
          +0x0D8 uid  +0x10C currentHealth  +0x10E maxHealth
```

### Karte

```
TileMapState  LogicLayer          0x01BF8368   int  [80400]
              HeightLayer         0x01D32C38   byte [80400]
              DefaultHeightLayer  0x01D46648   byte [80400]
              WallOwnerLayer      0x01D5A058   byte [80400]
              DamageLayer         0x01DBC2A8   byte [80400]
              BuildingLayer       0x01C95BB8   ushort[80400]
              Logic2Layer         0x01C471E8   byte [80400]
```

**80400 Kacheln, nicht 160000.** Index 0 bis 80399.

### Waren

```
GameState  +0x030D40  playerDataArray = 0x0115BDF8, je Spieler 0x39F4 Byte
PlayerData +0x46C startResources int[25]   +0x4D0 currentResources int[25]
           +0x3864 aivCurrentPauseIndex  +0x3868 aivCurrentPause
           +0x386C aivPauses short[20]    +0x3894 aivPauseDelay
```

`ResourceType`: 1 Holzstämme, 2 Holz, 3 Hopfen, 4 Stein, 5 Teilstein, 6 Eisen,
7 Pech, 8 Teilpech, 9 Weizen, 10 Brot, 11 Käse, 12 Fleisch, 13 Apfel, 14 Bier,
**15 Gold**, 16 Mehl, 17 Bogen, 18 Armbrust, 19 Speer, 20 Pike, 21 Keule,
22 Schwert, 23 Lederrüstung, 24 Eisenrüstung.

### Zeit

`totalGameTicksUnk` = `0x0117CADC`, `dayTicks` = `0x011BC680`, danach Woche und Monat.

**Die Kalenderzähler sind Restwerte des Tickzählers**, keine eigenständigen Uhren:

| Einheit | Ticks | entspricht | Marke |
|---|---|---|---|
| Tag | 50 | — | **belegt** |
| Woche | 200 | 4 Tage | **belegt** |
| Monat | 800 | 4 Wochen | **belegt** |
| Jahr | 9.600 | 12 Monate | **gemessen** (Monat belegt, 12 aus der Anzeige) |

Beleg (Sitzung danie-02, 29.08.2026, laufendes Gefecht): Aus `totalGameTicksUnk` wurden Tag, Woche und Monat **vorhergesagt** und gegen `0x011BC680`/`+4`/`+8` geprüft — sechs Messpunkte, drei unabhängige Vorhersagen, keine Abweichung. `dayTicks = Tick mod 50`, `weekTicks = Tick mod 200`, `monthTicks = Tick mod 800`.

Warnung aus dem eigenen Irrtum: Mit nur zwei Messpunkten ergab sich fälschlich 1600 für den Monat — der dritte Punkt hat es widerlegt. Bei Modulo-Werten braucht es mindestens drei Punkte.

Das erklärt auch die 50er-Schrittweite im Bauprotokoll: **Die KI baut auf Tagesgrenzen.**

### Bautempo

| Aussage | Marke | Beleg |
|---|---|---|
| **Ein Bauschritt dauert genau 50 Ticks — also einen Spieltag** | **belegt** | Messburg `Burg_left_1` (450 Einzelmauern), 445 gebaute Schritte, Formel `Tick = 2153 + (Schritt-2)*50` trifft **alle 445 ohne eine einzige Abweichung** |
| Ein Schritt, der nicht gebaut werden kann, verbraucht seinen Tag trotzdem | **belegt** | 5 Schritte blieben aus (116, 131, 225, 346, 437), die Formel gilt danach unverändert weiter — die Uhr läuft also mit |
| `wait = 20` bei Mauern bedeutet **nicht** 20 Ticks | **belegt** | Mauern entstanden im Abstand von 50 Ticks, nicht 20. Der Zähler sinkt je Baudurchgang, nicht je Tick |
| Es gibt **keinen** Anlaufpuffer am Anfang | **belegt** | Der erste Abstand ist wie alle anderen 50 Ticks (offene Frage 4 damit beantwortet) |

Messbedingungen: Tempo 100, Gold auf 50.000 gesetzt (sonst greift die Armutsbremse — Spieler 3 hatte vorher nur 1.358), Mauern als Messfühler, weil sie beim ersten Bau nichts kosten.

Daraus folgt für die Praxis: Eine Burg mit *n* Bauschritten braucht *n* Spieltage. 450 Mauern = 449 Tage = 22.450 Ticks; bei Tempo 100 sind das 224 Sekunden, im Spiel gut 28 Monate.

Warum 5 Schritte ausblieben, ist **offen** — vermutlich Gelände (Fels, Baum) auf
genau diesen Rasterplätzen. Ihre Lage im Gitter, aus `Burg_left_1.aiv` nachgerechnet:

| Schritt | Kachel | Rasterzeile / Spalte |
|---|---|---|
| 116 | 24, 34 | 7 / 9 |
| 131 | 24, 36 | 8 / 9 |
| 225 | 32, 48 | 14 / 13 |
| 346 | 34, 64 | 22 / 14 |
| 437 | 6, 78 | 29 / 0 |

**116 und 131 liegen im Raster direkt untereinander** — dieselbe Spalte, zwei
Kacheln Abstand. Bei fünf zufällig verteilten Ausfällen unter 450 Plätzen wäre
ein benachbartes Paar unwahrscheinlich; ein Hindernis, das zwei Rasterplätze
gleichzeitig verdeckt, erklärt es dagegen zwanglos. Die Schrittnummern selbst
zeigen kein Muster (Abstände 15, 94, 121, 91).

### Die Gegenprobe: `Burg_left_2`

Ein identischer Wiederholungslauf hält Gelände *und* Schrittnummer konstant und
kann beides deshalb nicht trennen. `Burg_left_2.aiv` löst das: **exakt dieselben
450 Kacheln, aber die Bauschritte in umgekehrter Reihenfolge vergeben.**

Damit schließen sich die beiden Erklärungen gegenseitig aus:

| Ursache | Ausfälle bei Schritt | an Kachel |
|---|---|---|
| **Gelände** | 337, 322, 228, 107, 16 | denselben wie vorher |
| **Schrittnummer** | 116, 131, 225, 346, 437 | 16/64, 16/62, 8/50, 6/34, 34/20 |

Kommt etwas Drittes heraus, war keine der beiden Erklärungen richtig — dann
wäre es tatsächlich Zufall, und der wäre damit auch belegt.

### Spieltempo

`gameSpeed` = `0x01FE7DD8` (Vorgabewert 0x28 = 40, gesetzt in `determineGameTicksToPerform` `0x00487A30`).

| Aussage | Marke | Beleg |
|---|---|---|
| **Ticks pro Sekunde = Tempowert** | **belegt** | Formel bei `0x487B42`: `1000 / gameSpeed` = Millisekunden je Tick. Gemessen im Spiel bei 20/50/100/200 → 20,0 / 50,0 / 99,8 / 199,8 Ticks/s |
| Höchstens 11 Ticks je Bild | **abgelesen** | `0x487BFF`: bei mehr als 10 Tickzeiten Rückstand wird 0xB zurückgegeben. Die Bildrate ist damit die zweite Grenze — bei 60 fps rund 660 Ticks/s |
| Der Wert ist zur Laufzeit frei schreibbar | **belegt** | `core.writeInteger(0x1FE7DD8, n)` wirkt sofort, ohne Nebenwirkungen (Sitzung danie-02) |

### Baukosten

```
in der exe        0x005C21D0   int[110][5]   (BuildingDefinedData +0xA85C)
im laufenden Spiel 0x01124CF4  dieselbe Tabelle (BuildingsState +0x18C7D4)
je Eintrag 20 Byte: Holz, Stein, Eisen, Pech, Gold
Index = Laufzeit-Gebaeudenummer
```

| Aussage | Marke | Beleg |
|---|---|---|
| Die Tabelle ist nach **Laufzeit**-Nummer indiziert | **belegt** | Die gelesenen Werte decken sich mit den bekannten Spielkosten: Hütte 6 Holz, Holzfäller 3 Holz, Brunnen 30 Gold, Stall 400, Kapelle 250, Kirche 500, Kathedrale 1000 — sieben unabhängige Treffer |
| `initBuildingCosts` (`0x00419780`) kopiert sie beim Start aus der exe in den Speicher | **abgelesen** | Wer im laufenden Spiel ändern will, muss die Kopie bei `0x01124CF4` beschreiben, nicht die exe |
| Adresse eines Gebäudes: `0x01124CF4 + laufzeitNr * 20` | **belegt** | aus der Struktur; die fertige Liste steht in `lib/kosten.json` |
| `getBuildingCost` (`0x0040C5F0`) nimmt dagegen die **Mapper**-Nummer | **abgelesen** | Signatur `(BuildingsState*, MappersEnum, int* pStone, int* pGold)` — rechnet intern um |

Die vollständige Tabelle mit Namen und Einzeladressen liegt in `lib/kosten.json`,
erzeugt von `_baue_kostentabelle.js`. 80 Einträge, davon 60 mit Namen; die
übrigen sind Laufzeit-Nummern, die in keiner AIV vorkommen.

### Einheiten

```
DAT_UnitsState = 0x01387F38
  +0x000  maxUnitCount           uint
  +0x004  DAT_UnitCount          uint      <- wie viele Einheiten es gibt
  +0x00C  DAT_LastSelectedUnitID
  +0x020  totalUnitsInSelection
  +0x024  unitCountOfSelection   int[9]    je Spieler
  +0x074  DAT_SelectedUnitsBitFlags byte[400]
  +0x614  units[2500]            Unit, je 1168 Byte   = 0x0138854C

Unit  +0x010 calculatedOwnerPlayerIndex int
      +0x038 healthbar        short      Anzeige
      +0x044 animationSpeed   int
      +0x08C logicalState     short
      +0x08E unitType         short      <- der Typ
      +0x096 owner            short      <- der Spieler
      +0x098 uid              int
      +0x0A0 targetUID        int
      +0x0B6/0x0B8 microXPosition / microYPosition  short
      +0x0C8/0x0CA destinationXPosition / Y         short
      +0x0D4 tile             int        <- Kachel, passt zu den Kartenschichten
      +0x0D8 destinationTilePosition int
      +0x0FA currentIndexInPathPlan   short
      +0x0FC totalSizeOfPathPlan      short
      +0x0FE pathPlanStart    byte[400]  <- der Wegplan
      +0x2D4 healthPercentage short
      +0x33E attackedUnitID   short
      +0x3AE attackedBy       short
      +0x3C8 health           int        <- Lebenspunkte
      +0x3CC maxHealth        int
      +0x3E8/0x3EA attackAtTileX / Y     short
      +0x3F0 killedFlagUnk    short
```

Adresse von Einheit `i`: `0x0138854C + i * 1168`.

| Aussage | Marke | Beleg |
|---|---|---|
| **Grundadresse `0x0138854C`, Schrittweite 1168** | **belegt (Code)** | Am 30.08. aus dem Maschinencode von `spawnUnit` gelesen, nicht aus der Struktur abgeleitet: `0053e44b LEA EAX,[EBX+0xb30]` → `units[1].logicalState` = `0x01388A68`; `0053e465 ADD EAX,0x490` und `0053e482 IMUL EDX,EDX,0x490` → Schrittweite 1168. Gegenprobe: `0x0138854C + 1168 + 0x8C` = `0x01388A68` ✓ |
| Suchgrenze ist `maxUnitCount` = `0x01387F38` (`UnitsState+0x00`) | **belegt (Code)** | `0053e472 CMP EDI,dword ptr [EBX]` mit EBX = UnitsState-Basis. **Nicht** `0x01387F3C` — das ist `DAT_UnitCount` und etwas anderes |
| **Belegt heißt `logicalState` (+0x8C) ≠ 0**, nicht `unitType` ≠ 0 | **belegt (Code)** | `spawnUnit` sucht den freien Platz mit `if (*pUVar3 == ULS_INVISIBLE) break;` auf genau diesem Feld. Ein freier Slot behält den Typ der gestorbenen Einheit |
| Slot 0 wird nie belegt, Vergabe beginnt bei 1 | **belegt (Code)** | `unitID = 1` und `&DAT_UnitsState.units[1]` am Schleifenkopf |
| `units[2500]`, nicht 3000 | **belegt (Code)** | `CMP EDI,0x9c4` = 2500, und die Struktur sagt `Unit[2500]` bei `+0x614` |
| Die Aussage vom 30.08., die Basis oder Schrittweite sei falsch | **zurückgenommen** | Beide waren richtig. Die drei Fehler steckten alle in der Schleife: Belegt-Test über `unitType`, Start bei 0, falsches Zählfeld |
| **Im Spiel bestätigt — alle fünf Tests grün** | **gemessen** | 30.08. um 23:35, Gefechtspfad-Mission 0: `maxUnitCount` 48, **48 belegte Plätze**, **null** Ausreißer bei Typ und Besitzer, Spieler 2 mit genau **einem** Lord (Typ 55) und einem Narren (57). Der Testlauf wurde ohne Menü und ohne Maus gefahren |
| Platz 0 **wird** belegt — die Schleife läuft ab 0 | **gemessen** | `logicalState[0] = 2` bei `maxUnitCount` 48 und 47 Plätzen ab Index 1: 47 + 1 = 48. `spawnUnit` sucht zwar ab 1, aber Platz 0 wird auf anderem Weg belegt. Der Satz „Platz 0 ist nie belegt" war eine Aussage über `spawnUnit`, nicht über das Array |
| (frühere Messung vom selben Abend) | **gemessen** | Der Beleg lag schon vor. Messung vom 30.08. um 21:36 (`ucp3.log`): Besitzer 0 → 258 Einheiten, **0 Lords**; Spieler 1 → 41 Einheiten, **1 Lord**; Spieler 2 → 210 Einheiten, **1 Lord**. Zwei Spieler mit exakt einem Lord — bei falscher Basis praktisch ausgeschlossen |
| Der Test galt als „fehlgeschlagen", weil **Besitzer 0 mitgeprüft** wurde | **Fehler im Testsatz** | Besitzer 0 ist die neutrale Seite: Tiere und herrenlose Bauern. Die hat nie einen Lord. Der Satz hätte „jeder Spieler **ab 1**" heißen müssen |

**Die schärfste Lehre des Tages:** Ein Totschlagtest ist nur so gut wie sein
Satz. Dieser hier war hart formuliert, sah aus wie ein Beweis — und hat einen
Tag lang die richtige Adresse verworfen, weil ein einziges Wort zu weit
gefasst war. Vor der Messung gehört deshalb nicht nur der Widerlegungssatz
aufgeschrieben, sondern auch **wofür er gilt und wofür nicht**.

**Was daraus zu lernen ist:** Der Lord-Test hat richtig angezeigt, dass die Kette
falsch ist. Die Zuweisung *„also stimmt die Basis nicht"* war danach aber
geraten — und hat einen Tag gekostet. **Ein Totschlagtest widerlegt die Kette,
nicht das einzelne Glied.** Nach einem roten Test muss jedes Glied einzeln
gemessen werden, sonst wird das gesunde weggeworfen und das kranke behalten.

`UnitType`: 1 Bauer, 2 brennender Mann, 3 Holzfäller, 4 Bogenmacher, 5 Tunnelgräber,
6 Jäger, 7 Steinmetz, 8 Steinbrucharbeiter, 9 Steinochse, 10 Pechmann,
11–14 die vier Bauernhoftypen — die Kampfeinheiten folgen weiter hinten.

**Was das aufschließt:** Einheiten befehligen (Ziel und Wegplan), Leben und
Werte steuern, Einheiten verwandeln (`unitType` überschreiben), Positionen
tauschen (`tile` tauschen). Für das Ausweichen fehlt noch die Geschossverwaltung.

### Geschosse und andere Objekte

```
DAT_EntityState = 0x02350300
  +0x000000  totalEntityCount
  +0x000004  maxEntityCount
  +0x000010  fireCount
  +0x000014  entityArray[3000]   je 232 Byte   = 0x02350314

Entity  +0x02A entityType  short   <- 1 Pfeil, 7 Armbrustbolzen, 9 Feuer,
        +0x02C owner       short      34/36 Feuerwerfer, 37 Feuerballiste
        +0x030 uid         int
        +0x03E targetX  +0x040 targetY  +0x042 targetZ   short
        +0x044 xPosition +0x046 yPosition                short
        +0x04C tile        int
        +0x078 speedUnk    int
        +0x0D4 unitUID     int     <- welche Einheit es abgeschossen hat
```

Geschoss `i`: `0x02350314 + i * 232`.

**Für das Ausweichen** ist damit alles da, was man braucht: über die Objekte
laufen, die mit `entityType` 1 oder 7 als Geschoss erkennen, aus `xPosition`,
`yPosition` und `targetX`/`targetY` die Flugbahn lesen — und die eigene Einheit
aus dem Zielfeld herausbewegen. Ob die Zeit dafür reicht, ist die offene Frage:
Ein Tick ist bei Tempo 40 gerade 25 Millisekunden, aber das Spieltempo ist
schreibbar.

**Marke: abgelesen.** Im Spiel nicht ausprobiert.

### Einheitentyp umschreiben aendert das AUSSEHEN nicht (02.09.2026)

| Aussage | Marke | Beleg |
|---|---|---|
| `unitType` (+0x8E) laesst sich schreiben, und die Zaehlung folgt sofort | **belegt** | 49 Einheiten von Typ 22 auf 24 gesetzt: Typ 22 verschwindet, Typ 24 steigt von 29 auf exakt 78. Dreimal wiederholt, immer aufs Stueck genau |
| **Die Darstellung aendert sich dabei NICHT** | **belegt** | Dieselbe Gruppe am Bergfried vor und nach dem Tausch: Schleuderer bleiben Schleuderer. Auch als ALLE Einheiten der Karte auf Typ 27 gesetzt wurden - inklusive der Lords - blieb jede Figur, wie sie war |
| `unitType` steuert also die Logik, nicht die Grafik | **belegt** | siehe oben |
| Beim Tausch aendert sich **kein einziges anderes Feld** | **belegt** | Die ganze Struktur (1168 Byte) vor und nach dem Schreiben verglichen: nur das Wort bei +0x08C ist anders - genau das, in das geschrieben wird. Kein Grafikzeiger, kein Animationsfeld, nichts reagiert |
| Ob sich das **Verhalten** aendert | **UNBELEGT** | Bisher wurde nur eine Zahl geschrieben und dieselbe Zahl zurueckgelesen. Weder Reichweite noch Angriffsart noch Wegverhalten wurden gemessen. Daniels Einwand am 02.09.: „ob du das Einheitenverhalten abgeaendert hast, laesst sich auch nur vermuten" - richtig |
| Wo die Darstellung haengt | **offen** | Nicht in der Einheitenstruktur. Entweder liest die Zeichenroutine `unitType` gar nicht, oder es gibt eine getrennte Liste, die beim Erzeugen gefuellt wird |

**Was das fuer Tests bedeutet - unbequem, aber ehrlich:** Vom Einheitentausch
ist bisher NUR belegt, dass sich die Zahl aendert. Weder Aussehen noch
Verhalten. Solange das so ist, taugt er nicht als Werkzeug, sondern nur als
Beobachtung: `unitType` laesst sich schreiben, und die Zaehlung folgt.

### Geloest: Die Figur haengt an spriteID, nicht am Typ

Die Zeichenroutine `renderMap` (0x004E8CF0) liest fuer die Figur **nicht**
`unitType`, sondern:

| Feld | Offset | Bedeutung |
|---|---|---|
| `spriteID` | **+0x0C** | welcher Grafiksatz (die Figur) |
| `gfxNumber` | +0x04 | Bildnummer darin |
| `gmIDUnk` | +0x7E | zweite Ebene (Pferd, Geruest) |

Die Zuordnung Typ zu Grafiksatz steht in `DAT_SPRITE_ID` (**0x00B4E0A0**,
int[80]) - und wird im ganzen Programm nur an **zwei** Stellen gelesen:
`setUnitValues` (0x0053B8E0) beim Erzeugen und beim Umwandeln. **Danach steht
die Figur im Feld und wird nie wieder aus dem Typ abgeleitet.** Genau deshalb
bleibt ein per Direktschreiben umgestellter Schleuderer ein Schleuderer.

### Das Rezept fuer eine ECHTE Umwandlung - gemessen und im Bild belegt

Das Spiel hat einen eigenen Umwandlungs-Pfad (so wird ein arbeitsloser
Handwerker wieder Bauer): `changeUnitType` (0x0053E6C0) ruft im naechsten
Tick `setUnitValues` - dieselbe Funktion wie beim Erzeugen.

**Drei Felder anstossen, den Rest macht das Spiel:**

| Reihenfolge | Offset | Wert |
|---|---|---|
| 1 | +0x2CC `state_2` | 0 |
| 2 | +0x2CA `unitTypeToChangeInto` | Zieltyp |
| 3 | +0x8C `logicalState` | **4** = ULS_TRANSITIONING |

`unitType` (+0x8E) dabei **nicht** anfassen - `setUnitValues` schreibt ihn.

**Belegt am 02.09.2026:** 46 Schleuderer von Spieler 1 umgewandelt; im Bild
standen danach weisse Kreuzritter mit rotem Kreuz, wo vorher Schleuderer
waren. Befehl: `{ "wandle": { "von": 72, "nach": 27, "spieler": 1 } }`.

**Nebenwirkung:** Leben, Tempo und Sichtweite werden auf die Werte des neuen
Typs gesetzt. Das ist gewollt - es ist eine echte Umwandlung, kein Etikett.

### Das Verhalten folgt dem Typ - sofort

`updateUnits` (0x00579300) holt die Update-Funktion **jeden Tick** aus der
Zeigertabelle `PTR_UpdateUnitFunctions` (**0x00B4DF60**, 80 Zeiger, Index =
unitType). Wer nur `unitType` schreibt, aendert also sehr wohl das Verhalten -
ein Schleuderer mit Typ 27 wird ab dem naechsten Tick von `UpdateSwordsman`
gesteuert und sieht dabei weiter aus wie ein Schleuderer.

Auch der Nahkampfschaden folgt dem Typ: `DAT_MELEE_DAMAGE` (0x00B4EE60,
int[80][80]) wird bei jedem Treffer mit Angreifer- und Zieltyp gelesen.

**Damit ist die Bilanz vom Vormittag korrigiert:** Der Typwechsel ist NICHT
wirkungslos - er wirkt auf Verhalten und Schaden, nur nicht auf die Figur.

### Kachelnummer ist NICHT `x = k % 400`

Die Umrechnung, die im Werkzeug stand, ist falsch. Gemessen an einer Gruppe,
die im Bild dicht beieinandersteht:

```
Lord              Kachel 67433
Gruppe daneben    68109, 68327, 68329, 68331, 68545, 68547, 68549, 68764, 68767
```

Innerhalb einer Bildreihe betraegt der Abstand **2**, zwischen den Reihen rund
**215**. Mit der Annahme `x = k % 400` lagen Lord und Gruppe rechnerisch fast
hundert Kacheln auseinander - im Bild stehen sie nebeneinander.

**Folge:** Jede Bereichssuche ueber `x`/`y` liefert falsche Ergebnisse. Am
02.09. fand sie am Bergfried zehn Einheiten, waehrend im Bild rund
fuenfundzwanzig standen. Bis die Geometrie geklaert ist, mit **rohen
Kachelnummern** arbeiten, nicht mit umgerechneten Koordinaten.

### Der Lord

`UT_LORD = 55` im `UnitType`. Damit ist die Todeserkennung einfacher als über
einen Haken in `checkSkirmishGameDefeat`: über das Einheiten-Array laufen und
prüfen, ob es noch eine Einheit mit `unitType == 55`, `owner == spieler` und
`health > 0` gibt. Verschwindet sie oder fällt `health` auf 0, ist der Lord tot.

Kampfeinheiten im selben Enum: 22 europäischer Bogenschütze, 24 Speerträger,
25 Pikenier, 26 Keulenträger, 27 Schwertkämpfer, 28 Ritter; 70 arabischer
Bogenschütze, 71 Sklave, 73 Assassine, 74 berittener Bogenschütze,
75 arabischer Schwertkämpfer.

### Einheitenkosten

```
DAT_BarracksUnitCost   0x00AB9114   uint[7]   Gold, europaeische Kaserne
DAT_NonEuroUnitCost    0x00AB913C   int[11]   Gold, arabischer Soeldnerposten
DAT_EuroUnitResourceCosts 0x00B55260 int[7][4] Waffen und Ruestung je Euro-Einheit
```

Gelesene Goldpreise, europäisch: 12, 20, 8, 20, 20, 40, 40.
Arabisch: 75, 5, 12, 60, 80, 80, 100, 50, 75, 75, 0.

| Aussage | Marke | Beleg |
|---|---|---|
| Das sind die Goldpreise der Einheiten | **belegt** | Die europäischen Werte decken sich mit den Spielpreisen: Bogenschütze 12, Speerträger 8, Armbrustschütze 20, Pikenier 20, Keulenträger 20, Schwertkämpfer 40, Ritter 40 |
| **Welcher Index welche arabische Einheit ist, ist offen** | **vermutet** | Die Zahlen stimmen mit bekannten Preisen überein, aber die Reihenfolge ist geraten. Wer sie braucht, muss einen Preis im Spiel ändern und schauen, wer teurer wird |
| Ob die Tabellen im laufenden Spiel wirken | **offen** | Im Gegensatz zu den Baukosten ist hier **keine** Kopie in einen Zustandsblock bekannt — diese Adressen liegen in der exe selbst |

### Handelspreise

```
MapAndTimeState +0x848  buyAndSalesPriceArray  BuySellPair[25]  (Kauf, Verkauf je Ware)
MapAndTimeState +0x780  copyOfBuyAndSalesPrice BuySellPair[25]
```

Für „alle Ressourcen verkaufen" der richtige Anlaufpunkt, zusammen mit dem
Befehl `GCT_BUY_OR_SELL` (38).

### Balance-Dateien (JSON): Feldnamen und Kostenreihenfolge (SBA, 04.09.2026)

*gemessen von SBA. Quelle: `DanielFleger/shc-vergleichstabelle`, `doku/Bedienungsanleitung.md` Abschnitt 5 - hier nur der Auszug, nicht doppelt gepflegt.*

Die Balance-JSON (Ascension, Team-Liga) bildet ihre Felder so auf die Spielwerte ab - **106 Treffer gegen 2 Abweichungen**, und die zwei waren Fehler in der Tabelle (Katapult/Tribok mit falschen Lebenspunkten), nicht in der Abbildung:

| Tabellenspalte | JSON-Feld |
|---|---|
| Health | `health` |
| Arrow | `arrowDamage` |
| Crossbow | `xbowDamage` |
| Sling | `stoneDamage` |
| Unit base | `baseMeleeDamage` |
| Buildings | `buildingDamage` |
| Towers and gates | `fortificationDamage` |
| Walls | `wallDamage` |

Die Kostenliste ist ein Feld mit fuenf Zahlen, deren Bedeutung nirgends in der Datei steht. Reihenfolge ueber Abgleich mit bekannten Werten ermittelt, **213 Treffer gegen 2**: **Holz, Stein, Eisen, Pech, Gold**. Deckt sich mit der Reihenfolge der Laufzeit-Kostentabelle aus Abschnitt 3 - zwei unabhaengige Quellen.

### Einheiten befehligen: Ziel-Felder reichen nicht, die Funktion muss gerufen werden (04.09.2026)

*gemessen im laufenden Gefecht (Pfad 2, 266 Einheiten) ueber peek/poke.*

Die Bewegungsfelder einer Einheit sind bestaetigt (Einheit i = 0x0138854C + i*1168):
`+0xC4/0xC6` Position x/y, `+0xC8/0xCA` Zielkoordinaten, `+0xD4` Kachel, `+0xD8` Zielkachel (int), `+0xFA` Wegplan-Index, `+0xFC` Wegplan-Laenge, `+0xFE` Wegplan (byte[400]), `+0x374` destinationNeeded (short).

An einer laufenden KI-Einheit abgelesen (Holzfaeller, Spieler 3): Position (199,361), Zielkoordinaten (168,318), Kachel 78878 -> Zielkachel 73644, Wegplan-Laenge 59, Index 13. So sieht "laeuft zu fernem Ziel" aus.

| Aussage | Marke | Beleg |
|---|---|---|
| **Das Schreiben der Ziel-Felder (Zielkachel, Zielkoordinaten, destinationNeeded) bewegt eine Einheit NICHT** | **gemessen** | Poke kam an (Zielkachel wechselte auf den neuen Wert), aber: ein ruhendes Tier blieb stehen, und eine laufende Einheit behielt ihren ALTEN Wegplan (Index/Laenge unveraendert 13/59) statt umzuleiten. destinationNeeded 1/2/4 durchprobiert, kein Effekt |
| destinationNeeded ist ein fluechtiger Ausloeser, kein stehendes Flag | **gemessen** | bei Laeufern wie Ruhenden immer 0 - der Wegfinder verbraucht ihn sofort |
| Der Wegplan (+0xFE) wird in `setDestinationForUnit` berechnet, der Tick-Update FOLGT ihm nur | **abgelesen** | Dekompilat von 0x0053D3D0: teleportUnitToUnitXAndY, dann Pfadberechnung ueber PathConnectionLayer/translationMatrix inline. Kein deferred-Flag |

**Folge fuer das Modul (gehoert SVS):** Einheiten befehligen braucht einen Aufruf von `setDestinationForUnit` (0x0053D3D0). Signatur laut Dekompilat: `BOOLEnum setDestinationForUnit(UnitsState *this, int unitID, uint x, uint y, int reusePathingInfo)` - thiscall, `this` = UnitsState 0x01387F38 (die Funktion nutzt ohnehin die Globale). Also `core.exposeCode(0x0053D3D0, 5, 1)` (this + 4 Argumente), Aufrufart wie bei tryPlaceAIV am ret-imm gegenpruefen. Dann ein Befehl der Art `{ "einheit_ziel": { "nr": N, "x": X, "y": Y } }`. Koordinaten 0..399; ist die Zielkachel kein Spielfeld, liefert die Funktion FALSE (Gueltigkeitskarte 0x21AEC98).

### Mauer nachbauen kostet keinen Stein - halb wie ganz (05.09.2026)

*gemessen im Gefecht (Pfad 2), Mauerkachel 50004 (Steinmauer, volle Hoehe 98).*

Frage aus der Wunschliste: kostet das Nachbauen einer halbkaputten Mauer so viel Stein wie einer ganz kaputten? Antwort: **beide kosten nichts.**

| Aussage | Marke | Beleg |
|---|---|---|
| Der reaktive Nachbau (Hoehe direkt zurueckschreiben) kostet 0 Stein, egal wie stark beschaedigt | **gemessen** | Spieler 4 hatte 122 Stein. Kachel von Hoehe 49 (halb) auf 98 zurueck: 122->122. Von Hoehe 0 (ganz) auf 98 zurueck: 122->122. Gesamtdifferenz 0 |
| Grund: der Nachbau schreibt die Hoehe in den Speicher und geht am Rohstoffsystem vorbei | **belegt** | eine Speicherschreibung hat keine Rohstoff-Nebenwirkung; deckt sich mit Abschnitt 5 |
| Auch der spieleigene KI-Bauweg zieht fuer Mauern keinen Stein ab | **abgelesen** | Abschnitt 5: kein Abzug im Mauerzweig; nur die Pruefung "mind. 1 Stein vorhanden" bei einem schon gebauten Schritt |

**Einschraenkung:** Gemessen am Endstand des Gefechts (Uhr eingefroren); die Wirkung (Hoehenschreiben aendert Stein nicht) ist aber phasenunabhaengig. Der Menue-Bau eines Menschen ueber die Bauleiste zahlt Stein - das ist aber nicht der reaktive Nachbau-Weg.

### Lord-Tod erkennen: der Ausloeser fuer die Kettenreaktion (05.09.2026)

*gemessen im Gefecht (Pfad 2).*

Die Erkennungsregel aus Abschnitt 3 ist bestaetigt: Der Lord ist die Einheit mit unitType == 55, und jeder AKTIVE Spieler hat genau einen. Gemessen: Spieler 2 (Einheit 5, 165000 Leben), Spieler 3 (Einheit 17, 150000), Spieler 4 (Einheit 19, 150000); Spieler 1 (Mensch) hat keinen - in diesem Aufbau nicht besetzt.

| Aussage | Marke | Beleg |
|---|---|---|
| Ein Lord je aktivem Spieler, Typ 55, Leben bei +0x3C8 | **gemessen** | 3 Lords, je genau einer, Leben 165000/150000 (voll) |
| Der Ausloeser ist das Leben, nicht der logicalState | **gemessen** | Lord-Leben 165000 -> 0 gepoked: Leben=0, aber logicalState blieb 2 (Einheit noch da). Wie bei Gebaeuden entfernt das Spiel die Einheit erst beim toedlichen Treffer, nicht beim Erreichen von 0 |
| Robuster Trigger: je Tick das Lord-Leben lesen; faellt es auf <=0 (oder Einheit verschwindet, logicalState 0), ist der Lord tot | **abgeleitet** | folgt aus dem Obigen |

**Fuer die Kettenreaktion:** Der Trigger steht. Die Reaktion selbst (alles abreissen ausser Lager/Markt, Ressourcen verkaufen, Geld an den Verbuendeten) baut auf schon belegten Bausteinen auf (Abriss mit Gruppenschutz, Geld/Waren verschicken) und ist der naechste Schritt.

### Einheiten befehligen: GELOEST - eine Einheit gehorcht (05.09.2026)

*Befehl ins Modul eingebaut (logik.lua, Lua-Sitzung) und live getestet.*

Der Aufruf von `setDestinationForUnit` (0x0053D3D0) ueber den Befehlskanal bewegt eine Einheit zuverlaessig auf eine Kachel - das blosse Schreiben der Ziel-Felder reichte nicht.

| Aussage | Marke | Beleg |
|---|---|---|
| `{ "einheit_ziel": { "nr": N, "x": X, "y": Y } }` schickt Einheit N auf (X,Y) | **belegt** | Einheit 6 von (240,209) auf die befohlene (235,283) gelaufen, Rueckgabe 1 (TRUE) |
| Signatur | **belegt** | `core.exposeCode(0x0053D3D0, 5, 1)` - thiscall, dreimal RET 0x10 = 4 Argumente; Aufruf `(this=0x01387F38, nr, x, y, reusePathing=0)` |
| Koordinaten 0..399; ungueltiges Ziel -> FALSE | **abgelesen** | Gueltigkeitskarte 0x21AEC98 |

Handler in logik.lua:

```lua
if cmd.einheit_ziel ~= nil then
  local z = cmd.einheit_ziel
  local nr, x, y = tonumber(z.nr), tonumber(z.x), tonumber(z.y)
  if nr == nil or x == nil or y == nil then log(WARNING, "EINHEIT: nr/x/y fehlt.") return false end
  _setDest = _setDest or core.exposeCode(0x0053D3D0, 5, 1)  -- lazy
  local ok, r = pcall(_setDest, 0x01387F38, nr, x, y, 0)
  -- r vorzeichenlos zuruecknehmen, dann loggen
end
```

**Schaltet Platz 2 auf** (mehrere Einheiten + Ausweichen): mehrere `einheit_ziel` in einem `befehle`-Batch; fuers Ausweichen Geschosse je Tick lesen und die bedrohte Einheit versetzen.

**Hinweis zur Repo-Angleichung:** Die Aenderung liegt in der deployten logik.lua (getestet). Der Repo-Zweig sgm-lua (24e54f6) ist weit hinter dem deployten Stand; ein Committen der ganzen Datei wuerde fremde Zeilen mitnehmen. Der isolierte Handler oben ist der Patch; die Angleichung des deployten Moduls in den Zweig ist eine eigene Aufgabe.

## 4. Verhalten

| Aussage | Marke | Beleg |
|---|---|---|
| `applyAIV` (`0x004EF0D0`) **liest** keepXOffset/keepYOffset/keepOrientation, setzt sie nicht — der stehende Bergfried bleibt der Anker | **abgelesen** | im Spiel noch nicht gegengeprüft |
| `applyAIV` setzt **alle** Bauschritte auf `unbuilt` zurück | **abgelesen** | Sperren gehören also *nach* den Bauplanwechsel |
| `applyAIV` setzt `currentStepGoal` **nicht** zurück, nur `aivCurrentPauseIndex = 1` | **abgelesen** | |
| **Die Bauschleife beginnt in jedem Durchgang bei Schritt 1** und läuft bis `currentStepGoal`; sie bricht ab, sobald ein Schritt gebaut wurde | **abgelesen** | `aiDecideOnNewBuildings` (`0x4F15C0`): `iVar3 = 1; while (iVar3 <= currentStepGoal) { ... }`. **Damit werden frühe Schritte strukturell nicht übersprungen** |
| `currentStepGoal` ist eine Ober-, keine Untergrenze, und wächst pro Durchgang | **abgelesen** | |
| **Das Bautempo hängt am Gold.** Unter 5001 Gold zählt `aivPoorCounter` hoch, und solange er kleiner als `buildInterval` ist, baut die KI in diesem Durchgang gar nicht | **abgelesen** | `aiDecideOnNewBuildings`, Zeilen 35–44. Deshalb heißt das Feld `aivPoorLimit_OR_AIC_buildInterval` — es ist beides |
| `resourceRebuildDelay` bremst zusätzlich | **abgelesen** | dieselbe Funktion, Zeilen 26–34 |
| `applyAIV` deaktiviert Schritte, deren Mapper-Typ 0 ist (`M_MAPPER_NULL`), ebenso KEEP3 und die Teiche | **abgelesen** | Ein Bauschritt ohne Felder im Gitter bekommt Typ 0 und landet auf `disabled` |
| `applyAIV` wählt die Datei über `aiType` und `castleID`: Index = `castleID - 0x10 + aiType * 8` | **abgelesen** | |
| AIC-Slot = `aiType + 1`, also Saladin = `aics[5]` | **belegt** | `flagType` steht auf genau den Slots 5,6,7,11,12,13 auf 10 — das sind exakt die sechs arabischen Lords. 16 von 16 passen |
| `buildInterval` (AIC `+0x78`) ist 1 bis 5; Rat und Nizar am schnellsten, Sultan am langsamsten | **abgelesen** | aus allen 16 `setAICParameters` gelesen |
| Was `buildInterval` in Ticks bedeutet | **offen** | dafür sind die Messburgen gebaut |
| Ob `buildInterval = 0` erlaubt ist | **offen** | könnte in eine Division laufen — vorsichtig testen |

## 5. Kacheln und Mauern

Bits im `LogicLayer`, Enum `Logic1` — **abgelesen**:

| Wert | Name |
|---|---|
| `0x100` | `L_WALL_OR_GATEHOUSE` |
| `0x200` | `L_CRENEL` (Zinne) |
| `0x400` | `L_BUILDING` |
| `0x800` | `L_STAIRS` |
| `0x4000` | `L_MOAT_DUG_OR_PLANNED` |
| `0x10000` | `L_UNKNOWN_WALL_RELATED` |
| `0x100000` | `L_RIVER` |
| `0x400000` | `L_CRENEL_VARIATION` |
| `0x40000000` | `L_MOAT` |

| Aussage | Marke | Beleg |
|---|---|---|
| `destroyWall` löscht `0x00470B00` — das ist genau die Summe der Mauer- und Schuttbits | **belegt** | Maske und Bit-Namen bestätigen sich gegenseitig |
| Mauerkacheln entfernt man mit `damage = 0`, `height = DefaultHeightLayer[tile]`, `logic = 0` | **vermutet** | aus `destroyWall` rückwärts erschlossen, im Spiel **nicht** geprüft |
| **Mauern kosten die KI nichts** — im Mauerzweig von `aiPlaceAIVBuilding` steht kein einziger Abzug | **abgelesen** | `processPlacementResourceLossForBuildingType` (`0x41BFD0`) wird nur von `placeBuilding`, `aiCreateSiegeUnits` und `ClickPlaceSiegeTent` gerufen, nicht aus dem Mauerpfad |
| **Aber:** war ein Mauerschritt schon einmal gebaut, verlangt die KI mindestens 1 Stein im Lager, sonst fordert sie 5 Stein an und baut nicht | **abgelesen** | `aiPlaceAIVBuilding` Zeile 129: `if (currentResources[4] < 1)`. Beim **ersten** Bau greift die Prüfung nicht |
| Nach dem Bau setzt die KI einen Wartezähler: Mauer 20, Treppe 1, Pechgraben 200 | **abgelesen** | `wait`-Feld im Bauschritt. Das sind **keine Ticks** — siehe Abschnitt *Bautempo* |
| Gold steht in `currentResources[15]` | **vermutet** | aus der Struktur geschlossen, Anzeige nicht verglichen |

## 5b. Im laufenden Gefecht erprobt

Alles hier wurde am 28./29.08.2026 im laufenden Spiel gemacht und von Daniel im Bild bestätigt (Sitzung danie-02, Modul `villagestudio` mit nachladbarer `logik.lua`).

| Aussage | Marke | Beleg |
|---|---|---|
| Eine AIV lässt sich **mitten im Gefecht** auf eine KI legen und wirkt sofort | **belegt** | `setAIVFileForAI` + `tryPlaceAIV` (`0x4F14F0`) + `applyAIV` (`0x4EF0D0`) in einem Tick. Sichtbar: die KI baut ab dem nächsten Tick nach dem neuen Plan |
| `tryPlaceAIV` liefert mitten im Gefecht fast immer `-2` | **belegt** | `computeAIVPlacementFit` (`0x4EF8C0`) prüft jede Kachel mit `isBuildingPlacementAllowedAtTile`; bebauter Boden zählt als Fehlschlag. Die Prüfung ist für den Gefechtsaufbau gedacht — der Rückgabewert muss **ignoriert** werden, sonst wirkt nichts |
| Rückgabewerte kommen **vorzeichenlos** aus `core.exposeCode` | **belegt** | `-2` erschien als 4294967294. Ohne Rückrechnung wird ein Fehlschlag als Erfolg gelesen |
| Bauschritte lassen sich zur Laufzeit gezielt abschalten | **belegt** | `buildStatus = 4` bei `0x4ED465`, geprüft mit 74 Mauer-/Turm-/Torhausschritten: die KI baut ihr Dorf, aber keine Mauer mehr |
| `destroyBuilding` (`0x41A7A0`) reißt **immer die ganze Gruppe** bei `+0x2BC` mit ab | **belegt** | Schleife ab `0x41A80F`. Ohne Gruppenschutz fiel der Bergfried, obwohl sein Typ geschont war: 52 abgerissen, 17 „verschont", danach war er trotzdem weg |
| Der Mauerabriss über `destroyWall` funktioniert | **belegt** | 421 Kacheln in 5 Paketen entfernt, im Bild bestätigt. Damit ist offene Frage 6 beantwortet |
| Die Kachel-Ebenen haben **80.400** Einträge | **belegt** | Lesen bis 160.000 liefert Zufallswerte — 108 „Mauerkacheln" waren frei erfunden |
| Das Spiel lässt sich per Speicherschreiben pausieren | **belegt** | `0x1FEA054` auf 1; `processGameTick+0x116` prüft den Wert. Der Schriftzug „Spiel pausiert" bleibt aus, der Takt steht trotzdem |
| Ein UCP3-Modulhaken am Anfang von `processGameTick` läuft **auch während der Pause** | **belegt** | Der Haken sitzt vor der Pausenprüfung. Befehle kommen also auch im pausierten Zustand an |
| `applyAIV` überschreibt einen Bauschritt nur, wenn dessen Mengenfeld leer ist | **vermutet** | Nach dem Nullen von Zustand, Menge, Typ und Position kamen die frühen Schritte durch. Welches der vier Felder es war, ist nicht einzeln geprüft |
| Der Bauzeiger muss nach `applyAIV` selbst genullt werden | **belegt** | Im Log stand vor dem Reset der alte Wert (41), das Spiel setzt ihn nicht zurück |

### Zwei Fallen, die uns Stunden gekostet haben

**Die Bauliste hat 1000 Einträge, nicht 0x922.** Eine Nullungsschleife über 0x922 Einträge überschreibt den Kopf des Folgeslots — der betroffene Spieler verliert seinen AIV-Slot und baut nie wieder. Sichtbar nur als `kein AIV-Slot fuer Spieler N` im Log.

**Die Feld-Offsets zählen ab dem Slot, nicht ab dem Eintrag.** `entryAddr(slot, nr)` liefert die Basis; Zustand, Typ und Position liegen bei `+0x38`, `+0x3A`, `+0x40`. Wer ab `+0` nullt, trifft die Spielernummer im Slotkopf.

---

## 5c. Auslöser und Live-Eingriffe (30.08.2026)

| Aussage | Marke | Beleg |
|---|---|---|
| Geld lässt sich zwischen Spielern verschieben, laufend und regelbasiert | **belegt** | Regel „ab 200 Gold an Verbündeten", sieben Buchungen ohne Zutun, im Spiel an der Rangliste bestätigt (4802 beim Empfänger) |
| Die Baukosten-Tabelle bei `0x01124CF4` ist im Spiel les- und schreibbar | **belegt** | Hütte (Laufzeit-Typ 1) liest 5 Holz. Adresse von Sitzung danie-2a, im Spiel gegengeprüft |
| **Die Kostentabelle ist vor dem Gefecht leer** | **belegt** | Beim Programmstart liest sie überall 0; `initBuildingCosts` füllt sie erst beim Kartenstart. Wer vorher liest, misst Nullen und hält die Adresse für falsch |
| **Die Schadens-Ebene `0x1DBC2A8` führt KEINE Mauer-Gesundheit** | **belegt** | Bei sichtbar zerschossenen Mauern steht dort für alle fünf Spieler 0. `destroyWall` beschreibt sie, aber sie trägt etwas anderes |
| Mauerverlust ist über die **Anzahl** der Mauerkacheln erkennbar | **belegt** | Zählung je Besitzerwert liefert stabile Werte (510 / 486 / 511 / 509); fällt die Zahl, ist Mauerwerk weg |
| Die Besitzer-Ebene zählt ab 0 | **belegt** | Spieler 3 steht dort als Wert 2 |

**Offen:** Wo Teilschaden an Mauern steht. Bekannt ist nur, wo er *nicht* steht.

---

## 5d. Mauerschaden und die Höhen-Ebene (30.08.2026)

**Der wichtigste Fund des Tages.** Er widerlegt drei Annahmen auf einmal, mit
denen wir stundenlang gearbeitet haben.

| Aussage | Marke | Beleg |
|---|---|---|
| **Beschuss ändert die Logikbits einer Mauerkachel NICHT** | **belegt** | Gemessen im Treffer-Moment: `Logik 0x100 -> 0x100`, weg 0x0, dazu 0x0 |
| **Die HÖHE ist die Gesundheit einer Mauerkachel** | **belegt** | Derselbe Treffer: `Hoehe 98 -> 77`. Gesunde Steinmauer hat 98 |
| Der Schadenswert steigt beim Treffer | **belegt** | `Schaden 0 -> 1` im selben Moment |
| Die Logikbits verschwinden erst, wenn die Kachel **ganz** fällt | **belegt** | Zählung über die Bits sinkt nur bei vollständiger Zerstörung |
| Eine Mauerkachel lässt sich durch Zurückschreiben der Höhe im **selben Tick** heilen | **belegt** | Über 8.700 Heilungen in einem Gefecht, Mauer blieb unter Dauerbeschuss intakt |
| Das funktioniert auch, **während feindliche Einheiten davorstehen** | **belegt** | Im Bild bestätigt — die Sperre der KI („baut nicht bei Feinden in der Nähe") gilt nur für den Bauschritt-Weg |
| Die Höhe darf **nicht** über den Ursprungswert der Kachel gehoben werden | **belegt** | Wer allen Kacheln mit Mauerbit die maximale Mauerhöhe gibt, hebt auch den Lagerplatz an — der trägt dasselbe Bit `0x100` |

### Warum alle früheren Versuche scheitern mussten

Drei unabhängige Gründe, jeder allein hätte gereicht:

1. **Falsches Merkmal.** Wir haben auf verschwundene Mauerbits geprüft. Die
   verschwinden beim Beschuss nicht.
2. **Zu grobe Zeitauflösung.** Eine Prüfung alle 25 Ticks kann einen Treffer
   nicht im selben Tick beantworten.
3. **Der Umweg über die Bauliste.** Selbst ein sofort geöffneter Bauschritt
   wird erst im nächsten Baudurchgang abgearbeitet — das sind 50 Ticks, ein
   Spieltag. Ein Nachbau „im nächsten Tick" ist über die Bauliste
   **prinzipiell unmöglich**.

Der Weg, der funktioniert, geht an der KI vorbei: Kachelhöhe direkt schreiben.

### Das Rezept

```lua
-- Beim Scharfstellen: alle Mauerkacheln merken, je Mauerart die groesste
-- Hoehe als "gesund" nehmen. Untergrenze = halbe gesunde Hoehe.
local gesund = hoechstJeArt[logik & MAUERBIT]
local grenze = math.floor(gesund / 2)
if grenze > ursprungsHoehe then grenze = ursprungsHoehe end   -- nie anheben

-- In jedem Tick: faellt die Hoehe unter die Grenze, zurueckschreiben.
if core.readByte(HOEHE + k) < grenze then
  core.writeByte(HOEHE + k, grenze)
end
```

Mit der Untergrenze bei der Hälfte bröckelt die Mauer sichtbar, hält aber —
das ist der beste Sichtbeweis, weil man Schaden **und** Wirkung gleichzeitig
sieht.

---

## 5e. Kacheln, Gebaeude, Einheiten (30.08.2026 abends)

| Aussage | Marke | Beleg |
|---|---|---|
| **Ein Mauerbit auf einer Kachel heisst NICHT, dass dort eine Mauer steht** | **belegt** | Dasselbe Bit sitzt unter Lagerplaetzen, Torhaeusern und geplanten Bauten. Wer deren flache Kachel auf Mauerhoehe hebt, erzeugt Erhebungen, ueber die niemand laeuft - Softlock. Zweimal am selben Tag passiert |
| Eine Kachel darf **nie ueber ihre Ursprungshoehe** angehoben werden | **belegt** | Einzig verlaessliche Sicherung. Aufnahme nur, wenn die eigene Hoehe ueber dem Ziel liegt |
| Wer Logikbits schreibt, **erzeugt** Mauern statt sie zu erhalten | **belegt** | Phantommauern ueber die halbe Karte. Eine Wacht, die nur Hoehe und Schaden schreibt, kann das prinzipiell nicht |
| Der Schadenswert muss mitzurueckgesetzt werden | **belegt** | Sonst laeuft er hoch und das Spiel zerstoert die Kachel trotz gehaltener Hoehe - Einheiten kamen nach einer Weile durch |
| **Gebaeude-Leben liegt bei +0x120, Maximum bei +0x122** (Basis `0xF98520 + i*0x32C`) | **belegt** | Die Ghidra-Referenz zaehlt ab Gebaeude+0x14; ohne diesen Versatz liest man falsche Bytes und die Wacht sieht nie Schaden. Beleg: `Leben 180/350 -> 1` |
| Ein Gebaeude auf 1 Leben stirbt am naechsten Treffer | **belegt** | Extremwert-Test von Daniel. Erst das Zuruecknehmen von Zustand 3 haelt es am Leben |
| Angreifer merken die Auferstehung nicht | **belegt** | Sie hoeren die Zerstoerung, ziehen zum naechsten Ziel und kommen zurueck - Endlosschleife |
| ~~Das Einheiten-Array bei `0x0138854C` ist widerlegt~~ **Diese Schlussfolgerung war falsch** | **korrigiert 30.08. abends** | Der Lord-Test war richtig und zeigte richtig an, dass die Kette falsch ist (258 Einheiten ohne Lord). Mein Schluss daraus - "also stimmt die Grundadresse" - war jedoch **geraten**. Basis und Schrittweite sind aus dem Maschinencode von `spawnUnit` belegt; krank waren drei andere Glieder: der Belegt-Test (`logicalState` bei +0x8C statt `unitType`), der Startindex (ab 1, nicht 0) und das Zaehlfeld. Siehe Abschnitt 3 |

### Die teuerste Lehre des Tages

**Ein Totschlagtest widerlegt die KETTE, nicht das einzelne GLIED.**

Der Lord-Test war richtig und schlug richtig an. Der Fehler kam danach: aus
"die Kette ist falsch" wurde ohne Pruefung "also ist die Grundadresse falsch".
Tatsaechlich waren Basis und Schrittweite gesund, und drei andere Glieder
krank. Ergebnis: sieben Versatz-Varianten durchprobiert, die alle scheitern
mussten, und eine richtige Adresse faelschlich als widerlegt gemeldet.

Nach einem roten Test gehoert **jedes Glied einzeln geprueft** - sonst wirft
man das gesunde weg und behaelt das kranke. Der erste Einzeltest muss dabei so
klein sein, dass er nur EIN Glied prueft: "Slot 0 hat logicalState 0" haengt
weder von Typnummern noch von Lord-Regeln noch von Schleifenlogik ab.

### Methodik, die sich bewaehrt hat

**Extremwerte statt mittlerer Werte.** Daniel setzte die Gebaeude auf **1**
Lebenspunkt - dadurch kam sofort heraus, dass die Wacht den Todesfall gar
nicht erwischt. Bei 50 Leben haette das Gebaeude ueberlebt und der Test waere
faelschlich als bestanden gewertet worden.

**Totschlagtest vorher festlegen.** Beim Einheiten-Array war die Bedingung
"genau ein Lord je Spieler" vor der Messung aufgeschrieben. Zufallsdaten
erfuellen so etwas praktisch nie - der Test hat die These sauber gekippt,
statt sie zu bestaetigen.

**Falsifikation statt Bestaetigung.** Wer zeigen will, dass etwas immer gilt,
sucht das eine Gegenbeispiel statt weiterer Belege.

---

## 5f. Ein Bild vom laufenden Spiel, ohne Fokus (31.08.2026)

Die Aufgabe: ein Bild vom Spielinhalt, waehrend das Fenster im Hintergrund
liegt und Daniel weiterarbeitet. Geloest — mit einem Weg, der ohne Fenster,
ohne Fokus und ohne jeden Zeichenaufruf auskommt.

| Aussage | Marke | Beleg |
|---|---|---|
| **`PostMessage` an das Spielfenster ist von hier aus unmoeglich** | **belegt** | `PostMessage(hwnd, WM_KEYDOWN, VK_Q, ...)` liefert `false`, `GetLastError` = 5. `IsWindow` sagt gleichzeitig `true`. Das Spiel laeuft erhoeht, unsere Sitzung nicht — Windows (UIPI) sperrt jede Nachricht an ein hoeher berechtigtes Fenster. Der Q-Weg ist damit **nicht** widerlegt, sondern von aussen schlicht nicht erreichbar |
| **`takeScreenshot` toetet den Prozess auch im laufenden Gefecht** | **belegt** | `{ "foto": 1 }` ueber den Dateikanal: Prozess weg, zurueck bleibt `screen_capture_001.bmp` mit 0 Byte. Die Vermutung, es liege am fehlenden Gefecht, ist damit widerlegt — es liegt am Aufrufort |
| **Der Grund steht im Dekompilat**: `takeScreenshot` ruft als Erstes `bltMapGameSurfaceToScreenMenuSurfaceComplete` | **belegt** | Dekompilat von `0x00479540`, Zeile 107. Aus dem Zeichenhaken heraus ist das ein Wiedereintritt. Das Dekompilat liegt als `doku/takeScreenshot_dekompilat.c` daneben |
| **Die Zeichenflaeche ist roher Speicher und laesst sich direkt lesen** | **belegt** | Aus demselben Dekompilat: `puVar10 = surfacePointer_screenMenu + resolutionX * y`, `ushort` je Pixel. Also Zeilenlaenge genau `Breite * 2` Byte, **kein Rand**, Zeile 0 oben. Farbe: B=`(v&0x1F)<<3`, G=`((v>>5)&0x3F)<<2`, R=`(v>>11)<<3` |
| **Das Lua-Modul kann die BMP selbst schreiben** | **belegt** | 1920x1080 aus dem Speicher gelesen und als 6.220.854-Byte-BMP geschrieben, **in 0,36 Sekunden**. Das Bild zeigt lesbar die Spieloberflaeche. Weder Fenster noch Fokus noch Sichtbarkeit spielen eine Rolle |
| Die Flaeche ist **1920x1080**, obwohl das Fenster 1600x900 misst | **gemessen** | `+0x38`/`+0x3C` lesen 1920/1080, `+0x4C` liest 6.220.800 = 1920*3*1080. Passt exakt |
| `io.open` im UCP-Sandkasten schreibt **nur innerhalb des Spielordners** | **belegt** | Absoluter Pfad in die Dokumente: `Invalid path`. Relativ (`ucp/villagestudio/...`) geht |
| **Die Kartenflaeche `+0xD8` hat einen anderen Zeilenabstand** | **gemessen** | Mit `Breite*2` gelesen ergibt sie Rauschen. Die Oberflaechen-Flaeche `+0xD4` dagegen ein sauberes Bild. Welcher Abstand fuer die Karte gilt, ist **offen** — und dank des Blt-Aufrufs auch nicht mehr noetig |
| **Das Format ist RGB555, NICHT RGB565** | **gemessen** | Mit 565 gelesen ist das ganze Bild rotstichig, mit 555 einwandfrei (Versionszeile „V1.41 UCP 3.0.7" lesbar). Das Dekompilat rechnet zwar 565 — unter `graphicsApiReplacer 1.3.0` kommt aber 555 aus dem Speicher. **Messung schlaegt Ableitung**: Der Code der exe beschreibt, was die exe tut, nicht was der Ersatztreiber in den Puffer legt |
| **Der Blt ist aus dem SPIELTICK harmlos** | **belegt** | `bltMapGameSurfaceToScreenMenuSurfaceComplete` (`0x00470610`, thiscall, nur `this`) aus dem Tick-Poll gerufen: Prozess lebt weiter, Bild danach vollstaendig. Toedlich ist nicht die Funktion, sondern **der Aufrufort** — aus dem Zeichenhaken ist sie ein Wiedereintritt |
| Ohne den Blt zeigt die Flaeche ein **Mischbild** | **belegt** | Von Daniel im Bild erkannt: oben das alte Hauptmenue, unten der startende Spielbildschirm. Die Menueflaeche wird nicht von selbst nachgefuehrt — genau deshalb ruft `takeScreenshot` den Blt zuerst |

**Der Befehl:** `{ "id": <neu>, "bild": "menue" }` — schreibt
`ucp/villagestudio/vs_menue.bmp`. Kein `player` noetig, der Zweig liegt vor der
Spielerpruefung. Ein zweiter Zweig `{ "peek": <Adresse>, "worte": <n> }` liest
beliebigen Speicher ins Log.

### Warum die Spielzeit bei ~4010 Ticks stehenbleibt

Die Uebergabe nannte zwei moegliche Erklaerungen: Gefechtsende oder fehlender
Fokus. **Beide waren geraten, und das Bild beantwortet die Frage direkt.**

| Aussage | Marke | Beleg |
|---|---|---|
| Nach `SetupSkirmishMode(0)` steht das Spiel im Auswertungsbildschirm **„Maechtigster Fuerst"** | **belegt** | Bild aus dem Speicher, `doku/bilder/speicherbild_auswertung.png`. Der Lord liegt aufgebahrt — das ist der Niederlage-Bildschirm |
| `currentMenuViewType` steht auf **30 = `MVT_GAME_LOSTUnk`** | **gemessen** | `GameCore+0x0C` gelesen. **Das Spiel ist verloren**, nicht pausiert |
| `currentGameMode` (`0x0191DD80`) liest gleichzeitig **99** | **gemessen** | Der Wert taugt also **nicht** als Anzeige dafuer, ob noch gespielt wird. Wer nur ihn prueft, haelt ein verlorenes Spiel fuer ein laufendes |
| **Der Grund: es ist gar kein vollstaendiges Match** | **belegt** | Daniels Beobachtung am Bild: in der Rangliste steht **nur ein Spieler**, Spieler 1 (rot) fehlt komplett. Ein Gefecht braucht mindestens zwei. `SetupSkirmishMode(0)` setzt die Karte auf, aber besetzt die Spielerplaetze nicht — deshalb ist nach rund 80 Spieltagen Schluss |
| Dreimal wiederholt, dreimal dasselbe | **gemessen** | Zeitraeume Jan.–Mai 1100 und Jan.–Juni 1100; die Uhr blieb bei 3815 bzw. 4008 Ticks stehen |

**Damit ist die Ursachenkette fuer die zweite Aufgabe geklaert, aber noch nicht
behoben:** Solange kein zweiter Spieler besetzt ist, laeuft kein Gefecht lange
genug fuer einen Bau-Messlauf. Der naechste Schritt ist die Spielerbesetzung,
nicht der Gefechtsstart.

### Aus einem Menuebildschirm herauskommen, ohne zu klicken

**Geht** — im Spiel erprobt:

```json
{ "id": <neu>, "menue": 41 }
```

| Was | Wert |
|---|---|
| `DAT_GameCore` | `0x01FE7D10` (Ghidra-Symbol) |
| `menuSwitchDelay` / `currentMenuViewType` / `menuViewToSwitchTo` | `+0x04` / `+0x0C` / `+0x18` |
| `switchToMenuView` | `0x0046B340`, thiscall, `this` + 2 Argumente |
| Ansichtsnummern | 12 Landschaftseditor, 14 Baumenue, **16 Gebaeude-/Statusleiste**, 30 Spiel verloren, **41 Hauptmenue**, 58 Rangliste |

`getAreWeInAInGameMenu` (`0x0046BB60`) ist genau dann wahr, wenn die Ansicht
12, 14 oder 16 ist — das ist die Bedingung, an der auch die Taste Q haengt.

Zweimal ausgefuehrt (30 -> 41), beide Male sauber: das Spiel stand danach im
Hauptmenue und nahm einen neuen Gefechtsbefehl an.

## 5g. Der aiSwapper: was beim Einbau einer KI still scheitert (03.09.2026)

*belegt — im Quelltext von `ucp/modules/aiSwapper-1.2.1.zip` gelesen, danach an
Karl und Franz in der Team-Liga nachgeprueft.*

Wer eine eigene KI in einen Vanilla-Platz haengt, merkt Fehler nicht im Spiel,
sondern gar nicht. Der Swapper laesst den Eintrag weg und schreibt eine Warnung
ins Log. Vier Stellen, an denen das passiert:

**Burgen (`aiv/mapping.json`).** `scripts/aiv.lua` geht `CASTLE_1` bis
`CASTLE_8` durch. Fehlt ein Eintrag, setzt es `castlesToSet[i] = ""` — im
Quelltext steht dahinter der Kommentar `disables castle`. Die Burg faellt also
**nicht** auf die Vorlage des ersetzten Charakters zurueck, sie ist weg. Wer nur
`castle_1` eintraegt, hat auf sieben von acht Plaetzen keine Burg. Dasselbe
passiert, wenn die genannte .aiv-Datei fehlt.

**Sprache (`speech/mapping.json`).** `scripts/sfx.lua` prueft jede genannte
Datei einzeln und setzt den Eintrag auf `nil`, wenn sie fehlt. Es wird **keine**
Endung ersetzt: Ein Verweis auf `Held_plead.wav` findet die daneben liegende
`Held_plead.mp3` nicht. Genau das kostete bei Franz 33 von 34 Spruechen — im
Spiel hoert man dann die Vanilla-Stimme des ersetzten Charakters und sucht den
Fehler im Charakter statt im Dateinamen. Zielformat ist echtes WAV; die
uebrigen Liga-KIs liegen alle als `pcm_s16le`, 44100 Hz, mono vor.

**Videos (`binks/mapping.json`).** Hier gibt es einen ausdruecklichen Sonderweg:
Der Wert `null.bik` wird gesetzt, **ohne** dass die Datei existieren muss
(`bink.lua`, Zeile 41). Das ist der vorgesehene Weg fuer "diese KI hat kein
Video" — besser als der Eintrag wegzulassen.

**Bilder.** `portrait.lua` laedt `portrait.png` und `portrait_small.png` aus dem
KI-Ordner. Die Groessen sind 72x72 und 36x36; alle 18 Liga-KIs halten sich
daran. Fehlt eine Datei, steht `<Name> has no portrait` im Log.

Merksatz: Nach jedem Einbau einmal `ucp3.log` nach `Problems with` und
`has no portrait` durchsehen. Das ist billiger als jede Sichtpruefung im Spiel.

## 5h. Spielerbesetzung: warum ein Gefecht frueh endet, und wie es lange laeuft (03.09.2026)

*gemessen -- im laufenden Spiel ueber den `peek`-Befehl des Moduls.*

Abschnitt 5f schloss aus dem ~4010-Tick-Stopp, `SetupSkirmishMode` besetze die
Spielerplaetze nicht. Die Messung verfeinert das: **die KI-Gegner stehen sehr
wohl im Array -- der fruehe Abbruch haengt an der Zahl der aktiven Spieler.**

`currentAIArray` (int[9], `0x0191DE7C`, in `GameSynchronyState+0x714`) traegt je
Platz die KI-Art: Platz 0 = neutral, Platz 1 = Mensch (Wert 0, also keine KI),
Platz 2..8 = KI-Gegner. Nach `{ "gefecht": N }` gemessen:

| Missionspfad N | currentAIArray[0..8] | KI-Gegner |
|---|---|---|
| 0, 1, 3 | z. B. `[0,0,7,0,0,0,0,0,0]` | **1** (Platz 2) |
| 2, 4 | `[0,0,8,6,6,0,0,0,0]` bzw. `[0,0,2,2,2,0,0,0,0]` | **3** (Plaetze 2-4) |
| 5 | `[0,0,8,4,0,0,0,0,0]` | 2 (Plaetze 2-3) |

Der Abbruch haengt an der Gegnerzahl, nicht an fehlender Besetzung:

| Aussage | Marke | Beleg |
|---|---|---|
| Pfad 0 (1 Gegner) friert bei ~4010 Ticks ein, `currentMenuViewType` = 30 (verloren) | **gemessen** | deckt sich mit 5f |
| Pfad 2 (3 Gegner) laeuft bis **22066 Ticks / 654 Einheiten**, dann ebenfalls `currentMenuViewType` = 30 | **gemessen** | 75 s beobachtet, Uhr 0 -> 672 -> 8665 -> 22066 |
| Der Mensch (Platz 1) hat keinen Bergfried, wir verlieren deshalb immer -- nur spaeter, je mehr KIs sich gegenseitig beschaeftigen | **vermutet** | erklaert beide Endzustaende (view 30); die fehlende Bergfried-Setzung des Menschen ist nicht direkt gemessen |

**Rezept fuer einen Messlauf**, der lange genug laeuft (ein voller 450-Schritt-Bau
braucht 22500 Ticks): `{ "id": <neu>, "gefecht": 2 }` (oder 4) -- drei KI-Gegner,
rund 22000 Ticks echtes Spiel statt der ~4010 bei Pfad 0. Zwischen Laeufen mit
`{ "menue": 41 }` ins Hauptmenue zurueck.

Adressen: `GameSynchronyState`-Basis `0x0191D768` (aus `currentGameMode` 0x0191DD80
minus 0x618), `currentAIArray` +0x714, `SEC_AIVariationArray` +0x738,
`DAT_PlayerSlotArraySomeValue` +0x106db0. `CampaignTrailMission` (0x90 Byte):
`numberOfPlayers` +0xc, `player2AI` +0x14; die Missions-Arrays liegen in
`SkirmishDefinedData` (+0x114 Skirmish-, +0x2e14 Extreme-Pfad).

## 5i. Der Live-Swap erzeugt einen nicht baubaren Plan (03.09.2026)

*gemessen im laufenden Gefecht (Pfad 2) ueber den `peek`-Befehl, mit dem
Vanilla-Nachbarn als Kontrolle.*

Frage 1 (warum bleiben nach einem Umbau Bauschritte ungebaut) hat eine
handfeste, aber unerwartete Teilantwort. Nach einem **Live-Swap mitten im
Gefecht** (`{ "player": 2, "file": "Burg_left_2.aiv" }`) ist der neue Plan
nicht funktionsfaehig -- und zwar KEIN Schritt, nicht nur die fruehen.

Wichtig zur Adressierung, sonst misst man den falschen Spieler:
**`AIVState.aivs[]` ist nach aktiver Reihenfolge gepackt, NICHT nach playerID.**
Gemessen: aivs[1].playerID = 2, aivs[2].playerID = 3, aivs[3].playerID = 4,
aivs[4] = neutral. Der Swap "player 2" landet in aivs-Slot 1. `PlayerData`
dagegen ist nach playerID indiziert (`0x0115BDF8 + playerID*0x39F4`).

| Aussage | Marke | Beleg |
|---|---|---|
| Nach dem Swap: totalSteps korrekt (451 fuer Burg_left_2), currentStepGoal steigt normal (81 -> 148), aivPoorCounter 0, Gold 9975 | **gemessen** | Header von aivs[1] ueber ~60 s verfolgt |
| Aber JEDER Schritt: buildStatus 0 (aus), buildingType 0, quantity 0; nur `location` traegt kleine Rohwerte (309, 333, 357 ...) | **gemessen** | Detail-Dump aivs[1], Schritte 1-30 |
| Die KI baut deshalb nichts -- buildStatus bleibt ueber den ganzen Lauf 0 | **gemessen** | 9 Messpunkte, "000...0" unveraendert |
| Der Vanilla-Nachbar (aivs[2], Spieler 3) baut zeitgleich normal: buildStatus 3, buildingType 50-80, quantity 1, location 74289 (echte Kachel) | **gemessen** | Kontrolle, gleiche Ausleseroutine -- das Layout stimmt, der Fehler ist swap-spezifisch |
| Es liegt NICHT an den drei vermuteten Ursachen aus Frage 1 (Schritt aus / Ziel zu klein / Armutsbremse) | **gemessen** | Ziel steigt, poorCounter 0, Gold ueber 5001 |

**Vermutlicher Grund (ungeprueft):** Der Live-Swap (`swapLive` -> `applyAIV`)
schreibt Gebaeudetyp/Menge/Status nicht in das Layout, das der Spielcode liest.
Massgeblich ist `aivs[slot].aivBuildingSteps[step]` (Stride 0x6D98, Schritt
+0x00 Status, +0x02 Typ) -- so liest es `aiPlaceAIVBuilding` (0x4ED410) Tick
fuer Tick, und so zeigt es der Vanilla-Nachbar. Der Kommentar in init.lua
beschreibt applyAIV dagegen mit dem ALTEN Layout (Stride 0x922, +0x38 Status,
+0x3a Typ). Schreibt der Swap dorthin, sieht der Spielcode 0. Zu pruefen im
Swap-Code (gehoert SVS).

**Abgrenzung:** Das betrifft den Live-Swap. Der normale Startweg
(Dateiumleitung + Neustart -> `LaunchSkirmishGame` -> `applyAIV`) ist davon
nicht zwingend betroffen -- der frueher gemessene Erfolg "Burg_left_1 baut
445/450" (Frage 5, 29.08.) lief ueber diesen Weg, nicht ueber den Live-Swap.

## 6. Widerlegtes

Damit die Irrtümer nicht wiederkommen.

| Was wir glaubten | Was stimmt |
|---|---|
| `0x100000` ist das Mauerbit | Es ist `L_RIVER`. Die Mauerbits sind `0x100`, `0x200`, `0x800`. Aufgefallen beim Nachrechnen: die Maske von `destroyWall` lässt `0x100000` unangetastet |
| `0x4BD` ist die Befehlsnummer für den Mauerabriss | Es ist die Befehls**länge** in Byte (4+4+4+1+1200) |
| Die Adressrechnung des Hot-Swap-Moduls liegt um 4 Byte daneben | Sie stimmt. Der Irrtum entstand aus einer falschen Annahme über dessen Basisadresse |
| `sourcehold/data/shc.py` passt nicht auf die AIV | Es ist die **Laufzeit**-Tabelle und damit richtig — nur eben nicht für die Zahlen in der Datei |
| Abschnitte dürfen roh zurückgeschrieben werden | Kein Beleg dafür. In 129 Originaldateien ist keiner der fünf gepackten Abschnitte roh |
| Abschnitt 2009 ist der größte Bauschritt | Er ist der größte **plus eins** |
| Ein zweites Vorratslager ist als Keimzelle nötig | Jede KI startet mit einem |
| Die frühen Bauschritte werden nach einem Umbau strukturell übersprungen | Die Schleife startet in jedem Durchgang bei Schritt 1. Was aussieht wie Überspringen, ist entweder ein deaktivierter Schritt, ein zu kleines `currentStepGoal` oder die Armutsbremse |
| Bergfried und Vorratslager kann man überbauen | Beide sind eigene Gebäude und lassen sich nicht überbauen. Das Startlager steht nicht in der AIV, ist im Bauplan also unsichtbar |
| Es reicht, die Bauten (2007) und Bauschritte (2008) zu schreiben | Es reicht nicht. Ohne passende 2004 und 2005 zerfällt jedes Gebäude in Einzelfelder, und ohne 2010 zeigt der Editor die Schrittzahl der Vorlage. Alle vor dem 29.08. mit diesem Werkzeug erzeugten AIVs waren davon betroffen |
| Ein verdecktes Fenster laesst sich mit PrintWindow oder der DWM-Vorschau abfotografieren | Nein, **bei aktivem `graphicsApiReplacer`**: beide liefern durchgehend Schwarz (gemessen, 3720 Proben, genau 1 Farbe). Der Ersatztreiber praesentiert nicht in einen von aussen abgreifbaren Puffer -- fuer ein Bild ohne Vordergrund taugt nur der Speicher-Weg aus 5f |
| `CopyFromScreen` des Fensterbereichs liefert das Spielbild | Nur wenn das Fenster obenauf liegt. Im Hintergrund oder verdeckt greift es das **darueberliegende** Fenster ab (gemessen: statt SHC ein fremdes Programm im Bild) |

## 7. Offene Fragen

1. **Warum bleiben nach dem Umbau frühe Schritte ungebaut?** Die Bauschleife startet nachweislich bei 1, überspringt also nichts. Bleiben drei Erklärungen: der Schritt steht auf `disabled` (Mapper-Typ 0), `currentStepGoal` ist zu klein, oder die Armutsbremse greift. Messung: `currentStepGoal`, `aivPoorCounter` und der `buildStatus` der ersten Schritte. **Teilweise beantwortet (03.09.2026), siehe 5i:** Beim Live-Swap bleiben ALLE Schritte ungebaut, weil der Swap den Plan nicht baubar macht (buildStatus/Typ/Menge = 0); keine der drei Erklaerungen trifft. Ob der Startweg dasselbe Bild zeigt, ist offen.
2. ~~**Wie viele Ticks braucht ein Bauschritt?**~~ **Beantwortet** am 29.08.2026: genau 50 Ticks, also ein Spieltag. Siehe Abschnitt *Bautempo*.
3. ~~**Wie viele Ticks hat eine Sekunde?**~~ **Beantwortet** am 29.08.2026: Ticks pro Sekunde = Tempowert, siehe Abschnitt *Spieltempo*. Ein Jahr sind 9.600 Ticks.
4. ~~**Gibt es einen Anlaufpuffer am Anfang?**~~ **Beantwortet** am 29.08.2026: nein. Der erste Abstand ist wie alle anderen 50 Ticks.
5. ~~**Baut das Spiel eine von Village Studio geschriebene AIV wirklich?**~~ **Beantwortet** am 29.08.2026: ja. `Burg_left_1` wurde im laufenden Gefecht aufgelegt und zu 445 von 450 Schritten gebaut. Der Schreiber ist damit im Spiel bestätigt.
6. ~~**Greift der Mauerabriss?**~~ **Beantwortet** am 29.08.2026: Ja, 421 Kacheln entfernt, im Bild bestätigt. Zwei Korrekturen am Rezept: die echten Mauerbits sind `0x100|0x200|0x800|0x10000|0x400000`, und die Besitzer-Ebene zählt **ab 0** — Spieler 3 steht dort als 2.

## Wie man selbst nachsieht

Ghidra ohne Oberfläche:

```
~/ghidra/ghidra_12.1.2_PUBLIC/support/analyzeHeadless.bat \
  %USERPROFILE%/ghidra-projects OpenSHC-ref \
  -process -noanalysis \
  -scriptPath %USERPROFILE%/ghidra-scripts \
  -postScript <Skript>.java
```

Die Skripte liegen in `doku/ghidra/`. Zwei Stolpersteine: `Enum` ist mehrdeutig
(immer `ghidra.program.model.data.Enum` ausschreiben), und die Ausgabe braucht
`| sed 's/^INFO  <Skript>.java> //; s/ (GhidraScript)  $//'`.

An den Dateien messen: `_pruefe_gebaeude.js`, `_pruefe_schreiben.js`,
`_untersuche_nummer.js <Nr>`.
