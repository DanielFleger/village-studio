# Abreißen: Gebäude, Mauern, einzelne Bauschritte

Alles aus der Ghidra-Referenz `OpenSHC-ref` abgelesen. Wie man es selbst
nachvollzieht, steht in `AIV-im-Speicher.md` — dieselben Skripte, andere
Adressen.

## Der Grundsatz: Befehle absetzen, nicht Funktionen aufrufen

Beides geht über das Befehlssystem des Spiels. Das ist nicht Zierrat: der
Befehl wird über `GameSynchronyState` verteilt, damit im Mehrspieler alle
Rechner dasselbe tun. Wer stattdessen direkt in den Speicher schreibt, läuft
Gefahr, dass die Partien auseinanderlaufen.

`DAT_GameSynchronyState` = `0x0191D768`

## Gebäude abreißen

`ClickDestroyBuilding` (`0x00481F40`), Befehlslänge 7:

| Parameter | Größe | Bedeutung |
|---|---|---|
| Param0 | 2 Byte | Index im Gebäude-Array. **Negativ heißt Pechgrube** — dann wird `destroyPitchDitch(-Param0)` gerufen |
| Param1 | 1 Byte | steuert die Rohstoffrückgabe |
| Param2 | 4 Byte | die `uid` des Gebäudes |

Die `uid` ist eine Sicherung: das Spiel vergleicht sie mit
`buildings[Param0].uid` und tut nichts, wenn sie nicht passt. Genau richtig,
wenn zwischen Auswählen und Ausführen ein Tick liegt und sich das Array
verschoben hat.

Dieser Weg gibt auch Rohstoffe zurück
(`giveBackResourceForDestroyedBuilding`) und behandelt Zugbrücken mit, die als
eigenes Gebäude am selben Ort liegen. Der direkte Aufruf von `destroyBuilding`
(`0x0041A7A0`) tut das alles nicht.

## Mauern abreißen

Mauern sind keine Gebäude — dazu steht die Begründung in `AIV-im-Speicher.md`.
Sie sind Einträge in den Kartenschichten.

**Im Einzelspieler ist der direkte Weg der richtige:** Liste füllen und
`destroyWall` (`0x00500E20`) aufrufen. Das Befehlssystem ist nur dafür da, dass
im Mehrspieler alle Rechner dasselbe tun; solange nur ein Rechner rechnet,
bringt es nichts als Umstände. Der direkte Weg:

```
destroyWall(0x00EE19D0, spielerID, anzahl, rohstoffMenge, holzFlag)
```

und die Liste, aus der er liest, ist **`0x00EE1E9C`**
(`receivedWallPlacementInfoArray`).

Über das Befehlssystem sieht es so aus — `DestroyWallOrPitch` (`0x00484C40`)
ist der Handler:

| Parameter | Größe | Bedeutung |
|---|---|---|
| Param0 | 4 Byte | Anzahl der Kacheln in der Liste |
| Param1 | 4 Byte | wie viel Rohstoff zurückkommt |
| Param2 | 4 Byte | 0 = Stein, sonst Holz |
| Param3 | 1 Byte | **3 = Mauer, 4 = Pechgrube** |
| dann | 1200 Byte | die Kachelliste, 100 Einträge à 12 Byte |

Die `0x4BD`, die in der Funktion steht, ist die **Befehlslänge** in Byte
(4+4+4+1+1200 = 1213), nicht die Befehlsnummer. Die Nummer steht im Enum
`GameCommandType`; der Zeiger auf diesen Handler liegt bei `0x00B38F40`, der
auf `ClickDestroyBuilding` bei `0x00B38E84`. Welche Nummer dazugehört, habe ich
nicht sicher bestimmen können — für den Einzelspieler braucht man sie auch
nicht. Abgesetzt würde ein Befehl mit `queueCommand` (`0x00489100`).

`DAT_GameSynchronyState` = `0x0191D768`, darin `DAT_CommandActionPlan` bei
`+0x2D828`, `DAT_CommandSize` bei `+0x2D830`, `DAT_GameCommandParam0` bis
`Param5` ab `+0x7A850`, `protocolInvokerPlayerID` bei `+0x109E70`.

`DAT_WallAndPitchState` = `0x00EE19D0`

- **`0x00EE19EC`** `wallPlacementInfoArray` — nur für den Weg über das
  Befehlssystem; von hier wird beim Absetzen gesendet
- **`0x00EE1E9C`** `receivedWallPlacementInfoArray` — hierher schreibt das Spiel
  beim Ausführen, und **nur daraus liest `destroyWall`**

Beim direkten Aufruf ist also `0xEE1E9C` die richtige Adresse. Nur wer den
Befehl absetzt, muss stattdessen `0xEE19EC` füllen.

Ein Eintrag (12 Byte):

```
+0x00  tile    int    Kachelnummer
+0x04  damage  byte   -> DamageLayer[tile]
+0x05  height  byte   -> HeightLayer[tile]
+0x08  logic   uint   -> LogicLayer[tile] = (alt & 0xFFB8F4FF) | logic
```

Mehr macht `destroyWall` (`0x00500E20`) nicht: es schreibt diese drei Werte
zurück, aktualisiert die Wegfindung und zeichnet die Übersichtskarte neu.

### Woher die Ersatzwerte kommen

Genau hier hakte es bisher — und die Antwort steht in der Karte selbst:

```
DAT_TileMapState = 0x01A93208
  LogicLayer          +0x165160  =  0x01BF8368   int  [80400]
  HeightLayer         +0x29FA30  =  0x01D32C38   byte [80400]
  DefaultHeightLayer  +0x2B3440  =  0x01D46648   byte [80400]   <- die Höhe ohne Bebauung
  WallOwnerLayer      +0x2C6E50  =  0x01D5A058   byte [80400]   <- wem die Mauerkachel gehört
  DamageLayer         +0x3290A0  =  0x01DBC2A8   byte [80400]
```

Für eine Mauerkachel, die verschwinden soll:

- `damage` = 0
- `height` = `DefaultHeightLayer[tile]`
- `logic` = 0 — die Maske `0xFFB8F4FF` löscht ohnehin genau die Bits
  `0x00470B00`, und nichts soll neu gesetzt werden

Die Maske ist der Beleg dafür, dass man `logic` nicht ausrechnen muss: was zur
Mauer gehört, wird gelöscht, alles andere bleibt unangetastet.

### Alle Mauern eines Spielers finden

`WallOwnerLayer[tile]` sagt, wem die Mauer auf dieser Kachel gehört. Dazu die
Probe, ob dort überhaupt Mauerwerk steht: `LogicLayer[tile] & 0x100000`.
Dieses Bit prüft auch `HandleWallTerrainMouseDrag`, bevor es eine Kachel
anfasst.

Also: über die Karte laufen, Kacheln mit passendem Besitzer und gesetztem Bit
einsammeln, in Hunderterpaketen in `0x00EE19EC` schreiben und den Befehl
absetzen. Mehr als 100 Kacheln passen nicht in eine Liste.

## Einen einzelnen Bauschritt abreißen

Ein Bauschritt ist ein Bauwerk (siehe `AIV-im-Speicher.md`). Seine Kacheln
stehen im Bauschritt-Eintrag: entweder direkt als `tile`, oder als Offset in
`locationsArray[4000]` der AIVSpec, wenn es mehrere sind.

- Ist es ein **Gebäude**: über die Kachel das Gebäude finden
  (`BuildingLayer` = `0x01C95BB8`, `ushort[80400]`, oder im Gebäude-Array über
  `xPosition`/`yPosition`), dann `ClickDestroyBuilding` mit Index und `uid`.
- Ist es **Mauerwerk**: die Kacheln in die Liste, dann `DestroyWallOrPitch`.

Damit lässt sich gezielt ein einzelner Schritt zurücknehmen statt eines ganzen
Bautyps.

## Offen

Ich habe **keine** Spielfunktion gefunden, die `wallPlacementInfoArray` füllt —
in der Referenz greift nur `DestroyWallOrPitch` darauf zu. Die Liste entsteht
also in der Oberfläche beim Ziehen mit der Maus, außerhalb dessen, was in der
Referenz benannt ist. Die Werte oben sind aus `destroyWall` rückwärts
erschlossen, im Spiel noch nicht ausprobiert.

Nach `destroyWall` könnte
`rebuildTileLogicLayerForGatesAndWalls` (`0x00419AC0`) nötig sein, damit
angrenzende Mauerstücke ihre Anschlüsse neu bestimmen. Die Funktion ruft
`destroyWall` nicht selbst auf.
