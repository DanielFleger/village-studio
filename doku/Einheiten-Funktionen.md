# Einheiten steuern — die Funktionen im Spiel

Stand 31.08.2026. **Alles hier ist _abgelesen_, nichts _gemessen_.** Die Namen
und Adressen stammen aus der benannten Ghidra-Analyse (Projekt `OpenSHC-ref`,
4581 Funktionen); im laufenden Spiel wurde bisher **keine einzige** dieser
Funktionen aufgerufen. Wer die erste erfolgreich aufruft, trägt sie hier als
*belegt* ein und schreibt den Messwert dazu.

Grundlage ist das Einheiten-Array, das am 30./31.08. bestätigt wurde:
`units[0] = 0x0138854C`, Schrittweite 1168, belegt heißt `logicalState (+0x8C) ~= 0`.
Der `this`-Zeiger für alle `UnitsState`-Funktionen ist **`0x01387F38`**
(UnitsState+0x00 ist `maxUnitCount`, das Array liegt bei +0x614).

Aufrufart: Ghidra zeigt `this` als ersten Parameter — das ist `__thiscall`,
der Zeiger geht also in ECX. Für `core.exposeCode` heißt das Aufrufart
`"thiscall"` und die Parameterzahl **ohne** `this`.

---

## 1. Einheiten befehligen

| Adresse | Funktion | Was sie tut |
|---|---|---|
| `0x0053D3D0` | `setDestinationForUnit(this, unitID, x, y, reusePathingInfo)` | **Der Haupteinstieg.** Schickt eine einzelne Einheit auf eine Kachel. |
| `0x00526F00` | `commandUnitsToLocation(this=TribesState, tribeID, zielX, zielY, tempoAngleichen)` | Ganzen Trupp bewegen, mit Tempoangleichung. |
| `0x00537D60` | `tryAttackUnitID(this, unitID_1, unitID_2)` | Einheit 1 greift Einheit 2 an. |
| `0x0051C800` | `commandUnitsToMoveToKeep(this=TroopValueState)` | Alles zurück zum Bergfried. |
| `0x004CE4D0` | `aiRetreatUnits(this=AICState, playerID)` | Rückzug für einen ganzen Spieler. |

Blickrichtung getrennt setzbar: `setUnitFacingDirectionForTargetXandY`
(`0x0052FE90`), `setUnitFacingDirectionTowardsTarget` (`0x0052FD00`).

## 2. Einheiten umwandeln

| Adresse | Funktion | Was sie tut |
|---|---|---|
| `0x0053B8E0` | `setUnitValues(this, unitID, unitType)` | **Setzt Typ und die zugehörigen Werte auf einem bestehenden Platz neu.** Das ist der Umwandel-Kandidat: Bauer wird Ritter, ohne die Einheit zu ersetzen. |
| `0x004A67D0` | `spawnUnitAndAddToTribe(this=PathFindingState, playerID, farbe, anzahl, unitType, tribeID)` | Neue Einheiten erzeugen. |
| `0x0053E440` | `spawnUnit` | Der einzelne Erzeuger, aus dem Basis und Schrittweite belegt sind. |
| `0x00530390` | `killUnits(this, playerID)` | Tötet alle Einheiten eines Spielers — **Extremwert-Test**, nicht für den Betrieb. |

**Vermutung, ausdrücklich ungeprüft:** dass `setUnitValues` auch die
Grafik und die Trefferpunkte mitzieht. Möglich ist ebenso, dass nur die
Kennzahlen wechseln und das Bild stehen bleibt. Erst messen.

## 3. Trefferpunkte

Das Leben steht direkt im Array bei `+0x3C8` und ist beschreibbar — dafür
braucht es keine Funktion. Der Umweg über eine Funktion lohnt nur, wenn auch
die Nebenwirkungen gewünscht sind (Sterbeanimation, Klang, Zählerstände).

Verwandt, für Gebäude: `SetUndamagedBuildingHealthToValue` (`0x0041A060`),
`updateRepairCostAndReturnIfDamaged` (`0x00410320`),
`computeHealthPercentage` (`0x004092C0`).

## 4. Geschosse

| Adresse | Funktion | Was sie tut |
|---|---|---|
| `0x00404AE0` | `spawnProjectileEntity(this=EntityState, unitID, playerID, farbe, mikroX, mikroY, hoehe, zielX, zielY, zielZ, entityType, p11)` | **Geschoss aus dem Nichts erzeugen.** |
| `0x00403A20` | `initializeProjectileVelocities(this, entityID, x, y, hoehe, zielX, zielY, zielZ)` | Flugbahn neu setzen — der Ansatz fürs Ablenken. |
| `0x00403FF0` | `handleProjectileWallBounce(this, entityID)` | Abprall an der Mauer. |
| `0x004039B0` | `activateProjectileEntity(this, entityID)` | Geschoss scharf stellen. |
| `0x005330A0` | `setRandomShootLocation(this=UnitsState, unitID, mikroX, mikroY, z)` | Schussziel einer Einheit setzen. |

**Zum Ausweichen:** eine fertige „Ausweichen"-Funktion gibt es **nicht** — die
Suche nach `dodge`, `evade`, `duck`, `avoid` liefert nur `aiRetreatUnits`.
Wer Ausweichen will, baut es selbst: Geschosse je Tick durchgehen, Ziel
ausrechnen, und die bedrohte Einheit über `setDestinationForUnit` versetzen.
Das ist keine vorhandene Fähigkeit des Spiels, sondern eine eigene.

---

## Wie man selbst in der Liste sucht

Der ganze Funktionsindex liegt als `lib/funktionen.csv`
(Adresse;Name;Signatur, 4581 Zeilen). Kein Ghidra nötig:

```bash
grep -i "unit" lib/funktionen.csv | grep -i "set"
```

Neu erzeugen lässt er sich mit `werkzeug/ExportFunktionen.java`:

```bash
SHC_EXPORT=/pfad/funktionen.csv "%USERPROFILE%/ghidra/ghidra_12.1.2_PUBLIC/support/analyzeHeadless.bat" "%USERPROFILE%/ghidra-projects" OpenSHC-ref -process -noanalysis -readOnly -scriptPath /pfad -postScript ExportFunktionen.java
```

`-readOnly` ist Absicht: das Ghidra-Projekt wird dabei nicht verändert.
**Python-Skripte laufen in Ghidra 12 nicht mehr** ohne PyGhidra — deshalb Java.

---

## Der nächste Schritt, wenn ein Spiel frei ist

Der kleinste Test mit dem größten Aussagewert ist
`setDestinationForUnit`: eine einzelne Einheit auf eine Kachel schicken.

- **Grün:** Die Einheit läuft sichtbar los.
- **Rot:** Nichts passiert oder das Spiel stürzt ab. Dann ist entweder der
  `this`-Zeiger falsch oder die Aufrufart nicht `thiscall`.

Vorher festhalten, sonst wird das Ergebnis hinterher passend gedeutet.

---

# Nachtrag 31.08.2026, 21:0x — der Feldplan aus der Struktur

Die Offsets mussten nicht gemessen und nicht geraten werden: Die Ghidra-Analyse
enthält die Struktur `Unit` mit **275 benannten Feldern**, und ihre Größe ist
**1168 Byte (0x490)** — exakt die im Spiel gemessene Schrittweite. Ebenso
`Building` mit **812 Byte (0x32C)**, exakt unser `G_SCHRITT`. Zwei unabhängige
Wege, gleiches Ergebnis: die Basisannahmen des Moduls stimmen.

Der ganze Feldplan liegt als `lib/strukturen.txt` (451 Strukturen).

## Gegenprobe: unsere Konstanten gegen die Struktur

| Unsere Konstante | Struktur `Unit` | Stimmt? |
|---|---|---|
| `E_ZUSTAND = 0x08C` | `+0x8c logicalState` (short) | ja |
| `E_TYP = 0x08E` | `+0x8e unitType` (short) | ja |
| `E_BESITZER = 0x096` | `+0x96 owner` (short) | ja |
| `E_LEBEN = 0x3C8` | `+0x3c8 health` (**int**, 4 Byte) | ja, aber 4 Byte |
| `E_SCHRITT = 1168` | Strukturgröße 0x490 | ja |

Zum Leben: Es ist ein **int**, kein short. Wer es mit `readSmallInteger` liest,
bekommt bei Werten unter 32768 zufällig das Richtige — bei größeren nicht.
Sauber ist `readInteger`.

## Position und Bewegungsziel — die offene Frage, beantwortet

| Offset | Feld | Art |
|---|---|---|
| `+0xC4` | **`x`** — die tatsächliche Position | short |
| `+0xC6` | **`y`** | short |
| `+0xC8` | `destinationXPosition` | short |
| `+0xCA` | `destinationYPosition` | short |
| `+0xCC` / `+0xCE` | `ladderExitXPosition` / `-Y` | short |
| `+0xD8` | `destinationTilePosition` | int |
| `+0xDC` | `previousTilePosition` | int |
| `+0xEC` / `+0xEE` | `destinationX_2Unk` / `-Y` | short |
| `+0x374` | `destinationNeeded` | Enum short |

Damit sind zwei frühere Aussagen zu berichtigen:

- „`+0xC8` als x/y war geraten und ist falsch" — **halb richtig.** `+0xC8` ist
  ein echtes Koordinatenpaar, nur eben das **Ziel**, nicht der Standort. Die
  tatsächliche Position steht vier Byte davor, bei **`+0xC4`**.
- `+0xD8` und `+0xDC` als Kachelnummern sind **bestätigt** — beide `int`.

## Der Fund, mit dem niemand gerechnet hat

```
  +0x2ca   unitTypeToChangeInto        UnitTypeShort
```

Das Spiel bringt das Umwandeln **selbst mit**. Es braucht keinen Funktionsaufruf
und keinen Nachbau: in dieses Feld den Zieltyp schreiben und abwarten, was der
nächste Durchlauf daraus macht.

**Ausdrücklich Vermutung, ungeprüft:** wann das Feld ausgewertet wird und ob es
Nebenbedingungen gibt. Der kleinste Test steht unten.

## Wie eine Kachelnummer entsteht — nicht y × 400

Aus dem Dekompilat von `setDestinationForUnit`:

```c
if (399 < x || 399 < y || *(char *)(y * 400 + 0x21aec98 + x) == '\0') return FALSE;
...
destinationTilePosition = x + translationMatrix[y].addXgetTile;
```

Drei Dinge stehen damit fest:

1. Koordinaten laufen von **0 bis 399**, beide Achsen.
2. Bei `0x21AEC98` liegt eine **Gültigkeitskarte**, 400 × 400 Byte, ein Byte je
   Feld. Ist das Byte 0, ist die Kachel kein Spielfeld — die Funktion bricht ab.
3. Die Kachelnummer ist **nicht** `y * 400 + x`, sondern
   `x + translationMatrix[y].addXgetTile` — eine Zeilentabelle. Das erklärt
   nebenbei, warum die Kachelgrenze bei rund 80400 liegt und nicht bei 160000:
   das Spielfeld ist eine Raute in einem quadratischen Rahmen, also gut die
   Hälfte.

Wer also aus x/y eine Kachelnummer rechnen will, darf nicht multiplizieren,
sondern muss die Zeilentabelle lesen. Andersherum ist es einfacher: Der
kürzeste Weg zu einer gültigen Kachel ist, die Einheit erst dorthin zu schicken
und dann `+0xD8` abzulesen.

## Die drei kleinsten Tests, wenn ein Spiel frei ist

Widerlegungskriterien vorher festgehalten, damit hinterher nichts umgedeutet wird.

1. **Standort lesen.** Für eine belegte Einheit `+0xC4`/`+0xC6` lesen.
   Rot, wenn ein Wert außerhalb 0..399 liegt.
2. **Umwandeln.** In `+0x2CA` bei einem Bauern die Ritternummer schreiben.
   Grün: die Einheit wechselt sichtbar. Rot: nichts geschieht über 500 Ticks —
   dann wird das Feld nur gelesen, nicht ausgewertet.
3. **Laufen schicken.** `setDestinationForUnit` (`0x0053D3D0`, `thiscall`,
   `this = 0x01387F38`, vier Parameter) mit einem Ziel in der Nähe.
   Grün: die Einheit läuft sichtbar los und `+0xD8` ändert sich.
   Rot: Rückgabe 0 — dann war das Ziel keine gültige Kachel, und die
   Gültigkeitskarte bei `0x21AEC98` ist die nächste Adresse zum Nachsehen.

Test 1 und 2 brauchen **keinen** Funktionsaufruf, nur Lesen und Schreiben. Sie
sind damit die risikoärmsten und gehören zuerst.
