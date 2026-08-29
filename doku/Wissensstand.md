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
| Lücken in der Bauschritt-Folge sind erlaubt | **belegt** | `nocturne_rat1.aiv` hat 562 Lücken, `Brandon.aiv` 86 — beides echte, benutzte Dateien |
| Bauschritt 1 enthält Kartenrand, Bergfried und Baufläche zusammen | **gemessen** | 144 von 152 Dateien. Ausnahmen: 5-mal ohne Kartenrand, 2-mal `[1,20]`, 1-mal nur `[1]` |
| Die Baufläche (Nr. 2) trägt eigene Bauschrittnummern, in Rotkäppchen bis 961 | **gemessen** | Wer eine KI bei Schritt N stoppen will, muss sie mitstreichen |
| Ein Bauschritt ist ein Bauwerk, keine Kachel | **belegt** | 81 Schritte mit Nr. 93 belegen je genau 4 Felder; ein Mauerzug dagegen 1 bis 27 |
| Pausenmuster ohne Pause: erster Eintrag 0, Rest -1 | **gemessen** | alle Abbot-Dateien |
| Der Bergfried steht im Gitter auf (43,43) bis (49,49) | **belegt** | 142 von 147 Dateien, und `setKeepOffsetAndOrientation` rechnet `keepX - 0x2B` = 43 |

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

## 4. Verhalten

| Aussage | Marke | Beleg |
|---|---|---|
| `applyAIV` (`0x004EF0D0`) **liest** keepXOffset/keepYOffset/keepOrientation, setzt sie nicht — der stehende Bergfried bleibt der Anker | **abgelesen** | im Spiel noch nicht gegengeprüft |
| `applyAIV` setzt **alle** Bauschritte auf `unbuilt` zurück | **abgelesen** | Sperren gehören also *nach* den Bauplanwechsel |
| `applyAIV` setzt `currentStepGoal` **nicht** zurück, nur `aivCurrentPauseIndex = 1` | **abgelesen** | **Der aussichtsreichste Verdacht für die „übersprungenen" frühen Schritte.** Messung ausstehend |
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
| Mauern sind für die KI kostenlos | **vermutet** | die Kostentabelle `BuildingCostStruct[110]` wird nach Laufzeit-Nummer indiziert, und Mauern haben keine. Aber `aiPlaceAIVBuilding` kennt sehr wohl „keine Rohstoffe" |
| Gold steht in `currentResources[15]` | **vermutet** | aus der Struktur geschlossen, Anzeige nicht verglichen |

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

## 7. Offene Fragen

1. **Wird `currentStepGoal` beim Umbau zum Problem?** Messung: vor und nach `applyAIV` auslesen. Das ist der schnellste Weg zur Antwort auf die Sprungfrage.
2. **Wie viele Ticks braucht ein Bauschritt?** Dafür sind `Burg_left_1` und `Burg_right_1` gebaut.
3. **Wie viele Ticks hat eine Sekunde?** Tick-Zähler zweimal im Abstand echter Sekunden lesen, je Geschwindigkeitsstufe.
4. **Gibt es einen Anlaufpuffer am Anfang?** Sichtbar, wenn die ersten Mauern langsamer kommen als die späteren.
5. **Baut das Spiel eine von Village Studio geschriebene AIV wirklich?** Der Schreiber ist an 152 Dateien geprüft, aber nie im Spiel.
6. **Greift der Mauerabriss?** Rezept steht, im Spiel nicht erprobt.

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
