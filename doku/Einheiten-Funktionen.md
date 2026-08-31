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
SHC_EXPORT=/pfad/funktionen.csv "C:/Users/danie/ghidra/ghidra_12.1.2_PUBLIC/support/analyzeHeadless.bat" "C:/Users/danie/ghidra-projects" OpenSHC-ref -process -noanalysis -readOnly -scriptPath /pfad -postScript ExportFunktionen.java
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
