# Einer laufenden KI eine andere Burg geben

Was `applyAIV` mit dem Bergfried macht — und warum das die entscheidende Frage
ist, wenn man mitten im Spiel den Bauplan wechselt.

## Die Entwarnung: der Bergfried bleibt der Bezugspunkt

`applyAIV` (`0x004EF0D0`) **liest** `keepXOffset`, `keepYOffset` und
`keepOrientation` aus der AIVSpec — es schreibt sie nicht. Jede Kachel wird
darüber auf die Karte gerechnet:

```
Kachel = translationMatrix[keepYOffset + y].addXgetTile + keepXOffset + x
```

Wer diese drei Felder in Ruhe lässt, bekommt den neuen Plan also an genau
derselben Stelle und in derselben Drehung wie den alten. Der stehende Bergfried
bleibt der Ankerpunkt.

Gesetzt werden sie nur von `setKeepOffsetAndOrientation` (`0x004ECF70`):

```c
keepXOffset = keepX - 0x2B;      // 0x2B = 43
keepYOffset = keepY - 0x2B;
keepX = keepX;  keepY = keepY;
keepOrientation = calculatePreferredRelativeOrientation(keepX, keepY, 200, 200) & 0xFFFE;
// danach werden 2 und 6 gegeneinander getauscht
```

Die Ausrichtung ergibt sich also aus der Lage zur Kartenmitte (200, 200).

### Die 43 ist nachgemessen

Der Bergfried steht im AIV-Gitter immer an derselben Stelle. In **142 von 147**
Dateien auf diesem Rechner belegt AIV-Nummer 38 exakt die Felder
(43,43) bis (49,49) — 7x7 ab genau 43. Das ist dieselbe 43, die
`setKeepOffsetAndOrientation` abzieht. Zwei voneinander unabhängige Wege,
dieselbe Zahl.

Die fünf Ausreißer sind selbstgebaute Dörfer, deren Bergfried woanders liegt;
bei denen sitzt die ganze Burg entsprechend versetzt.

## Die Falle: applyAIV setzt alle Sperren zurück

Beim Anwenden läuft `applyAIV` über die Bauschritte und schreibt je Schritt:

```c
buildingSteps[n].buildStatus  = AIVBSS_unbuilt;   // also 1
buildingSteps[n].quantity     = 1;
buildingSteps[n].buildingType = ...;
buildingSteps[n].location     = ...;
if (totalSteps < n) totalSteps = n;
```

**Alles, was vorher auf `disabled` stand, ist danach wieder aktiv.** Wer
Schritte sperren will, muss das also *nach* `applyAIV` tun, nicht davor.

## Welche Datei angewendet wird

`applyAIV` sucht den Dateinamen selbst, aus `aiType` und `castleID` der AIVSpec:

```c
Name = AIVDefinedData.aivFileNames[(castleID - 0x10 + aiType * 8) * 50 + 0x234]
```

Die Namenstabelle steht ab `0x00B46358` und verrät die Lord-Reihenfolge:

| aiType | Lord | | aiType | Lord |
|---|---|---|---|---|
| 0 | Rat | | 8 | Frederick |
| 1 | Snake | | 9 | Phillip |
| 2 | Pig | | 10 | Wazir |
| 3 | Wolf | | 11 | Emir |
| **4** | **Saladin** | | 12 | Nizar |
| 5 | Caliph | | 13 | Sheriff |
| 6 | Sultan | | 14 | Marshal |
| 7 | Richard | | 15 | Abbot |

Jeder Lord hat acht Burgen (`saladin1.aiv` bis `saladin8.aiv`), deshalb
`aiType * 8`. Der Versatz `- 0x10` bedeutet, dass `castleID` bei 16 für die
erste Burg beginnt.

## Und die Persönlichkeit

`DAT_AICState` = `0x023FC8E8`, darin `aics[20]` mit je **676 Byte**
(`AICSpecification`: `flagType`, dann Beliebtheitsschwellen, Steuersätze und
weiter). `setInitialAIC` (`0x004D18B0`) füllt beim Start `aics[1]` bis
`aics[16]` über `setAICParameters_01` bis `_16`.

Sechzehn Einträge, sechzehn Lords, dieselbe Reihenfolge wie oben — nur eins
weiter, weil die AIC-Slots bei 1 beginnen. **Saladin ist `aics[5]`.**

### Belegt über die Flaggen

Das war zuerst nur ein Schluss. Der Beleg steckt im ersten Feld, das jede
`setAICParameters`-Funktion setzt — `flagType`:

| AIC | flagType | Lord | | AIC | flagType | Lord |
|---|---|---|---|---|---|---|
| 1 | 12 | Rat | | 9 | 13 | Frederick |
| 2 | 12 | Snake | | 10 | 13 | Phillip |
| 3 | 12 | Pig | | 11 | **10** | Wazir |
| 4 | 13 | Wolf | | 12 | **10** | Emir |
| 5 | **10** | Saladin | | 13 | **10** | Nizar |
| 6 | **10** | Caliph | | 14 | 13 | Sheriff |
| 7 | **10** | Sultan | | 15 | 13 | Marshal |
| 8 | 13 | Richard | | 16 | 13 | Abbot |

`flagType 10` steht auf genau sechs Slots: 5, 6, 7, 11, 12, 13. Das Spiel hat
genau sechs arabische Lords — Saladin, Caliph, Sultan, Wazir, Emir, Nizar —,
und in der Reihenfolge der Namenstabelle stehen sie genau auf diesen
Positionen. Sechzehn von sechzehn passen. Damit ist die Gleichsetzung
`AIC-Slot = aiType + 1` belegt und nicht mehr geraten.

Nebenbei fällt auf: die Slots 1 bis 3 haben `flagType 12` statt 13. Das sind
Rat, Snake und Pig — die drei Banditenfürsten aus dem ersten Stronghold.

## Ein Bauplanwechsel der Reihe nach

1. `aiType` (AIVSpec `+0x04`) und `castleID` (`+0x0C`) auf den neuen Lord und
   die gewünschte Burg setzen — oder die Gitter `constructions` (`+0x3F0C0`)
   und `steps` (`+0x43EE0`) selbst füllen, wenn eine eigene Datei ran soll.
2. `keepXOffset`, `keepYOffset`, `keepOrientation` **nicht anfassen**.
3. `applyAIV(AIVState*, aivSlot, spielerID)` rufen.
4. **Erst jetzt** die Schritte sperren, die nicht gebaut werden sollen.
5. Wenn auch die Persönlichkeit wechseln soll: 676 Byte von `aics[aiType + 1]`
   nach `aics[spieler]` kopieren — für Saladin also von
   `0x023FC8E8 + 5 * 676`.
