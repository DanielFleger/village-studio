# Die AIV-Bauliste im Speicher

Wie das laufende Spiel eine geladene AIV verwaltet — und wie man einzelne
Bauschritte abschaltet. Alles hier ist aus der Ghidra-Referenz `OpenSHC-ref`
abgelesen, nicht geraten. **Am Ende steht, wie man es selbst nachvollzieht.**

## Kurzfassung

Basis: `DAT_AIVState` = **`0x01866AB0`**

```
AIVState                             (748656 Byte)
  +0x00      totalSteps          int
  +0x04      aivs[9]             AIVSpec, je 28056 Byte (0x6D98)
  +0x3F0C0   constructions       short[10000]   <- das 100x100-Gitter, Abschnitt 2007
  +0x43EE0   steps               int[100][100]  <- Abschnitt 2008
  +0x4DB20   rotatedConstructions short[100][100]
  +0x52940   rotatedSteps        int[100][100]
  +0x5C580   pauses              int[20]
  +0x5C648   pauseDelay          int

AIVSpec                              (28056 Byte)
  +0x00      playerID            int
  +0x04      aiType              int
  +0x08      keepOrientation     int
  +0x0C      castleID            int
  +0x14      currentStepGoal     int
  +0x20      totalSteps          int
  +0x24/0x28 keepXOffset / keepYOffset
  +0x2C/0x30 keepX / keepY
  +0x34      aivBuildingSteps[1000]  AIVBuildingStep, je 12 Byte
  +0x2F14    locationsArray[4000]    int
  +0x6D94    wallLocationsArrayIndex int

AIVBuildingStep                      (12 Byte)
  +0x00      buildStatus     byte    0 aus, 1 ungebaut, 3 gebaut,
                                     4 kein Platz, 5 keine Rohstoffe
  +0x01      wait            byte
  +0x02      buildingType    short   MAPPER-Nummer, nicht die AIV-Nummer
  +0x04      quantity        short
  +0x06      flag3           short
  +0x08      location        4 Byte  entweder tile (int)
                                     oder offset (short) + flag (short)
```

Adresse des Bauschritts `n` von Slot `s`:

```
0x01866AB0 + 0x04 + s * 0x6D98 + 0x34 + n * 12
```

**Die Schritte sind 1-basiert.** Der Spielcode selbst läuft `n = 1` bis
`totalSteps` — `aivBuildingSteps[0]` wird nicht benutzt. Das Feld fasst 1000
Einträge; der größte Bauschritt in den 148 AIV-Dateien auf diesem Rechner ist
991 (`nocturne_rat1.aiv`), es ist also knapp.

## Korrektur zu einer früheren Fassung

Hier stand, die Adressrechnung des Hot-Swap-Moduls liege um 4 Byte daneben.
**Das war falsch.** Ich war davon ausgegangen, dessen `AIV_MANAGER` sei
`AIVState + 4`; tatsächlich ist es `AIVState` selbst. Dann gilt
`4 + 0x34 = 0x38`, und beide Rechnungen treffen dieselbe Adresse.

## Die Falle: drei Nummernsätze

`buildingType` im Speicher ist die **Mapper**-Nummer. Die AIV-Datei enthält
dagegen die **AIV**-Nummer. Wer im Speicher nach AIV-Nummern sucht, findet
nichts Passendes.

| Bauwerk | AIV-Nummer (Datei) | Mapper-Nummer (Speicher) |
|---|---|---|
| Steinmauer | 10 | 25 `M_MAPPER_WALL` |
| Niedrige Mauer | 11 | 46 `M_MAPPER_WOODWALL` |
| Zinnenmauer hoch | 12 | 26 `M_MAPPER_CRENAL` |
| Zinnenmauer niedrig | 13 | 35 `M_MAPPER_CRENAL2` |
| Treppen 1-6 | 14-19 | 181-186 `M_MAPPER_STAIR1..6` |
| Türme 1-5 | 30-34 | 110-114 `M_MAPPER_TOWER1..5` |
| Kleines Torhaus | 40, 41 | 144, 145 `M_MAPPER_GATE_STONE1A/B` |
| Großes Torhaus | 42, 43 | 146, 147 `M_MAPPER_GATE_STONE2A/B` |
| Zugbrücke | 44 | 105 `M_MAPPER_DRAWBRIDGE` |
| Wassergraben | 20-23 | 106 `M_MAPPER_MOAT` |

Umgerechnet wird beim Laden; die Funktion heißt
`AIVState::convertAIVBuildingTypeToCommandBuildingType` (`0x4ECFE0`).
AIV 10-24 stehen dort in einem Schalter, **alles ab AIV 30 kommt aus einer
Datentabelle in der exe**: 79 Werte ab `0x00B46218`, indiziert mit `AIV - 30`
(gleichbedeutend `0xB461A0 + AIV * 4`). Über AIV 109 liefert die Funktion fest
`0x6C`. Damit lässt sich die ganze Tabelle aus der exe erzeugen statt
abzuleiten — genau das tut `_ergaenze_nummern.js`.

Alle drei Sätze stehen jetzt in `lib/gebaeude.json` je Bauwerk als `mapper`
und `laufzeit`, und die Oberfläche zeigt sie an. Beispiel Bogenmacher:
AIV 51, im Speicher 50 (`M_MAPPER_FLETCHER`), zum Abreißen 12 (`BT_FLETCHER`).

## Bauschritte abschalten

Der Spielcode macht das selbst — in der Funktion, die eine AIV auf einen
Spieler anwendet, steht sinngemäß:

```c
if (schritt->buildingType == M_MAPPER_NULL || schritt->buildingType == M_MAPPER_KEEP3
    || schritt->buildingType == M_MAPPER_POND1 || ... )
    schritt->buildStatus = AIVBSS_disabled;
```

Also: `buildStatus` auf **0** setzen, dann wird der Schritt übersprungen.
Für „keine Mauern, Treppen, Türme und Torhäuser" ist die Menge:

```
25, 26, 35, 46          Mauern und Zinnen
181, 182, 183, 184, 185, 186   Treppen
110, 111, 112, 113, 114 Türme
144, 145, 146, 147      steinerne Torhäuser
```

Das verhindert **weiteres** Bauen. Bereits Gebautes verschwindet dadurch nicht.

## Status 4 wirkt wie Status 0

`aiPlaceAIVBuilding` prüft bei `0x4ED461` auf 0 und bei `0x4ED465` auf 4 —
beide springen sofort zurück. Status 5 lässt bei `0x4ED476` einen Zähler in
`wait` (+0x01) herunterlaufen. Zum Abschalten ist 0 die sauberere Wahl, 4
wirkt genauso. (Beides im Spiel bestätigt.)

## Gebäude abreißen

```
DAT_BuildingsState = 0x00F98520
  +0x00000  structCount        int
  +0x00008  maxBuildingsCount  int
  +0x00014  buildings[2000]    Building, je 812 Byte

Building
  +0x08C  xPosition   byte        +0x08D  yPosition byte
  +0x0D0  logicalState short      +0x0D2  buildingType short  (Laufzeit-Nummer)
  +0x0D6  owner        short      +0x0D8  uid          int
  +0x10C  currentHealth short     +0x10E  maxHealth    short
```

Adresse von Gebäude `i`: `0x00F98520 + 0x14 + i * 812`.

Funktionen: `destroyBuilding` (`0x0041A7A0`),
`destroyBuildingAndLinkedDuplicates` (`0x00421990`) für mehrteilige Bauten,
`destroyBuildings` (`0x0041A860`).

**Vorsicht mit Gruppen.** `destroyBuilding` reißt ab `0x41A80F` alles mit, was
dieselbe Kennung bei `+0x2BC` trägt. Ghidra nennt das Feld
`unknownAccessibilityRelatedFlag`, der Name ist also unsicher — die Wirkung
ist es nicht: beim Abreißen nach Typ verschwand einmal der Bergfried mit.
Wer etwas verschonen will, muss dessen Gruppenkennung vorher einsammeln und
mitschützen.

**Und erst sammeln, dann abreißen** — das Array wird beim Abreißen umgeräumt.

## Warum sich schon gebaute Mauern nicht abreißen lassen

Die Laufzeit-Sprungtabelle `0x5B79A8` — die Liste, aus der `destroyBuilding`
seinen Gebäudetyp nimmt — enthält **keinen** Eintrag für Mauern, Zinnen,
Treppen oder Gräben. Von 1 bis 105 gibt es `gatehouse`, `tower`, `drawbridge`
und `tunnel`, aber nichts für Mauerwerk. Mauern sind in dieser Engine keine
Gebäude; sie hängen an `wallLocationsArrayIndex` und `locationsArray` der
AIVSpec. Türme und Torhäuser dagegen **sind** Gebäude und lassen sich abreißen.
Der einzige Weg zu den Mauern wäre `destroyWall` (`0x500E20`), und die will
eine vorbereitete Kachelliste ab `0xEE1E9C` mit je 12 Byte samt
Ersatz-Bodenwerten — die berechnet sonst die Vorschau beim Ziehen mit der Maus.

## Warum ein Mauerzug mehrere Kacheln hat

Ein Bauschritt ist ein Bauwerk, nicht eine Kachel. Ein Gebäude belegt genau
seine Grundfläche, ein Mauerzug dagegen 1 bis 27 Kacheln in einem einzigen
Schritt. Deshalb ist `location` eine Union: bei einem Gebäude steht dort die
Kachel selbst (`tile`), bei mehreren Kacheln ein `offset` in
`locationsArray[4000]`.

Gegenprobe an `King1.aiv` (Mod-KI-Team-Liga): 2600 belegte Kacheln, aber nur
645 Bauschritte. Steinmauer: 17 Schritte für 151 Kacheln. Hütte: 14 Schritte
für 224 Kacheln, also sauber 4x4 je Stück.

## So findet man das selbst

Voraussetzung: Ghidra unter `~/ghidra`, Projekt `OpenSHC-ref` unter
`~/ghidra-projects` (die benannte SHC-Analyse).

Ein Skript nach `~/ghidra-scripts` legen und ohne Oberfläche laufen lassen:

```
~/ghidra/ghidra_12.1.2_PUBLIC/support/analyzeHeadless.bat \
  C:/Users/danie/ghidra-projects OpenSHC-ref \
  -process -noanalysis \
  -scriptPath C:/Users/danie/ghidra-scripts \
  -postScript DumpAIVStruct.java
```

Die Skripte liegen in `doku/ghidra/`:

- `DumpAIVStruct.java` — alle Datentypen mit „AIV" oder „MAPPER" im Namen,
  mit Feld-Offsets; dazu alle Symbole mit „AIV" im Namen
- `DumpMappers.java` — das Mapper-Enum, gefiltert auf Mauern, Treppen, Türme, Tore
- `DumpBase.java` — die Basisadressen `DAT_AIVState` und `DAT_AIVDefinedData`
- `DumpAIVFuncs.java` — die dekompilierten Funktionen an gegebenen Adressen

Zwei Stolpersteine dabei:

- `Enum` ist mehrdeutig, weil Java selbst eins hat. In Ghidra-Skripten immer
  `ghidra.program.model.data.Enum` ausschreiben, sonst bricht die Übersetzung ab.
- Die Ausgabe kommt mit `INFO  <Skript>> ` davor und ` (GhidraScript)` dahinter.
  Zum Weiterverarbeiten:
  `| sed 's/^INFO  DumpAIVStruct.java> //; s/ (GhidraScript)  $//'`

Die Gegenprobe zu den Nummernsätzen kommt aus zwei unabhängigen Quellen:

- **AIV-Nummern:** `BUILDING_TYPE_AIV_FILES_KV` in
  `sourcehold/tool/convert/aiv/info.py`
  (`pip install git+https://github.com/sourcehold/sourcehold-maps.git`)
- **Mapper-Nummern:** die Datei `src/items/*.variant` im GTK-Editor
  `kolunmi/gtk-crusader-village` — dort steht je Bauwerk `id`, `tile-width`
  und `tile-height`. Stone Wall 25, Low Wall 46, Lookout Tower 110 … deckt
  sich mit dem Enum aus Ghidra.
- **Laufzeit-Nummern:** `sourcehold/data/shc.py`

Und die Probe aufs Exempel ohne jedes Werkzeug: `node _pruefe_gebaeude.js`
misst die Grundflächen aller AIV-Dateien und hält sie gegen die Namensliste.
