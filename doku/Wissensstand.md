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
| Im Spiel bestätigt | **offen** | `doku/test_einheiten.lua` liegt bereit — fünf Tests, Widerlegungskriterien vorher festgelegt |

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

## 7. Offene Fragen

1. **Warum bleiben nach dem Umbau frühe Schritte ungebaut?** Die Bauschleife startet nachweislich bei 1, überspringt also nichts. Bleiben drei Erklärungen: der Schritt steht auf `disabled` (Mapper-Typ 0), `currentStepGoal` ist zu klein, oder die Armutsbremse greift. Messung: `currentStepGoal`, `aivPoorCounter` und der `buildStatus` der ersten Schritte.
2. ~~**Wie viele Ticks braucht ein Bauschritt?**~~ **Beantwortet** am 29.08.2026: genau 50 Ticks, also ein Spieltag. Siehe Abschnitt *Bautempo*.
3. ~~**Wie viele Ticks hat eine Sekunde?**~~ **Beantwortet** am 29.08.2026: Ticks pro Sekunde = Tempowert, siehe Abschnitt *Spieltempo*. Ein Jahr sind 9.600 Ticks.
4. ~~**Gibt es einen Anlaufpuffer am Anfang?**~~ **Beantwortet** am 29.08.2026: nein. Der erste Abstand ist wie alle anderen 50 Ticks.
5. ~~**Baut das Spiel eine von Village Studio geschriebene AIV wirklich?**~~ **Beantwortet** am 29.08.2026: ja. `Burg_left_1` wurde im laufenden Gefecht aufgelegt und zu 445 von 450 Schritten gebaut. Der Schreiber ist damit im Spiel bestätigt.
6. ~~**Greift der Mauerabriss?**~~ **Beantwortet** am 29.08.2026: Ja, 421 Kacheln entfernt, im Bild bestätigt. Zwei Korrekturen am Rezept: die echten Mauerbits sind `0x100|0x200|0x800|0x10000|0x400000`, und die Besitzer-Ebene zählt **ab 0** — Spieler 3 steht dort als 2.

## Wie man selbst nachsieht

Ghidra ohne Oberfläche:

```
~/ghidra/ghidra_12.1.2_PUBLIC/support/analyzeHeadless.bat \
  C:/Users/danie/ghidra-projects OpenSHC-ref \
  -process -noanalysis \
  -scriptPath C:/Users/danie/ghidra-scripts \
  -postScript <Skript>.java
```

Die Skripte liegen in `doku/ghidra/`. Zwei Stolpersteine: `Enum` ist mehrdeutig
(immer `ghidra.program.model.data.Enum` ausschreiben), und die Ausgabe braucht
`| sed 's/^INFO  <Skript>.java> //; s/ (GhidraScript)  $//'`.

An den Dateien messen: `_pruefe_gebaeude.js`, `_pruefe_schreiben.js`,
`_untersuche_nummer.js <Nr>`.
