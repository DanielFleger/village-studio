# Ideenliste mit Bewertung

Daniels Ideen vom 29.08.2026, sortiert nach dem, was wir bereits belegt haben.
Die Einschätzung stützt sich auf `Wissensstand.md` — wo dort etwas als *belegt*
steht, ist der Weg frei; wo *offen*, muss erst gemessen werden.

**Stand: 30.08.2026**

## Wie zu lesen

| Marke | Bedeutung |
|---|---|
| **frei** | Alle Bausteine sind belegt. Kann sofort gebaut werden. |
| **kurz** | Ein bis zwei Messungen fehlen, danach frei. |
| **mittel** | Eine Struktur ist noch gar nicht untersucht. |
| **weit** | Grundlagenarbeit, mehrere Tage. |
| **fraglich** | Nach dem, was wir wissen, vermutlich nicht möglich. |

---

## Die Rangliste

### 1. Kosten von Gebäuden im laufenden Spiel ändern — **frei**

Der schnellste Treffer der ganzen Liste, und ich glaube, sein Wert wird
unterschätzt. `BuildingCostStruct[110]` liegt bei `DAT_BuildingsState + 0x18C7D4`,
je Eintrag fünf `int`: Holz, Stein, Eisen, Pech, Gold. Ein Schreibvorgang je
Wert, indiziert nach Laufzeit-Gebäudenummer — die Tabelle dafür steht in
`lib/gebaeude.json`.

Damit lässt sich Balance **pro Tick** verändern, ohne Neustart. Auch als
Werkzeug für alles andere brauchbar: Wer eine Messung ohne Rohstoffbremse
will, setzt die Kosten auf 0.

### 2. Geld und Waren verschieben — **frei**

`currentResources` je Spieler ist belegt (`0x0115BDF8 + spieler * 0x39F4 + 0x4D0`),
Gold ist Ware 15. Zum Gutschreiben gibt es `processResourceGain` (`0x0041C310`),
die das passende Lager sucht und die Stapelgrafik nachzieht.

Für „Geld an den Verbündeten" gibt es sogar eine fertige Spielfunktion:
`shareGoldAmongTeamMembers` (`0x004D05D0`). Die habe ich noch nicht
dekompiliert — ein Blick lohnt, bevor man es von Hand nachbaut.

**Offen:** ob das auch an Nicht-Verbündete geht. Die Funktion heißt nach
Team; ein direkter Schreibvorgang auf die Warenzelle des Gegners kennt
dagegen keine Bündnisse.

### 3. Trigger „Mauerteil beschädigt" → nachbauen — **frei**

Alle Teile liegen: `DamageLayer` (`0x01DBC2A8`) zeigt den Schaden je Kachel,
`WallOwnerLayer` (`0x01D5A058`) den Besitzer (**zählt ab 0**, Spieler 3 steht
dort als 2), und ein Bauschritt lässt sich durch `buildStatus = 1` wieder
öffnen.

**Zu Daniels Frage, ob halbkaputte Mauern billiger sind:** Teilantwort steht
schon im Wissensstand. Im Mauerzweig von `aiPlaceAIVBuilding` wird **gar kein
Rohstoff abgezogen** — es wird nur geprüft, ob mindestens 1 Stein da ist, und
das auch nur, wenn der Schritt schon einmal gebaut war. Für die KI dürfte
Nachbauen also gleich teuer sein wie Neubauen, nämlich fast nichts. Für den
**Spieler** gilt das nicht, dort läuft der Bau über einen anderen Weg.
Messen: Steinbestand vor und nach dem Nachbau, einmal bei halbem und einmal
bei vollem Schaden.

### 4. Trigger „Lord stirbt" → alles verkaufen und verschenken — **kurz**

Die Teile für den zweiten Teil sind da: Abreißen ist belegt (Gebäude über
`ClickDestroyBuilding`, Mauern über `destroyWall`), Waren und Gold auch.

**Was fehlt:** wie man den Tod des Lords erkennt. Der Lord ist eine Einheit,
und das Einheiten-Array haben wir noch nie angesehen. Kandidaten in der Nähe:
`gameOverTime` in `MapAndTimeState` (`+0xFC`) und `DAT_DestroyedBuildingsCountHistory`.

**Und Verkaufen fehlt:** Es gibt den Befehl `GCT_BUY_OR_SELL` (Nummer 38) und
`marketGold` in `PlayerData` (`+0x54`). Der Weg ist absehbar, aber ungeprüft.

Daniels Testidee mit dem Speicherstand kurz vor dem Tod ist genau richtig —
ohne den wartet man sonst jedes Mal ein halbes Gefecht.

### 5. Zeit steuern — **frei**

`gameSpeed` = `0x01FE7DD8`, zur Laufzeit schreibbar, im Spiel bestätigt.
Ticks pro Sekunde entsprechen dem Wert.

Als eigene Idee unspektakulär, aber als **Werkzeug für alles andere**
wertvoll: Tempo hoch für lange Messungen, Tempo runter, um einen Moment genau
zu betrachten. Für Daniels Ausweich-Idee wäre es sogar der Kern.

### 6. Einheiten befehligen — **mittel**

Hier fehlt die Grundlage: Das **Einheiten-Array haben wir nie untersucht**.
Bekannt sind nur Randstücke — `UnitLayer` in der Karte, `tribeIDArray` und
`tribeUIDArray` im `AICState`, dazu Funktionen wie
`giveUnitSelectionMoveInstructionNoMatchedSpeed` und die Befehle
`GCT_UNITS_SELECT` (16), `GCT_UNITS_MOVE` (17), `GCT_UNIT_STANCE` (70).

Das ist ein eigener Brocken Grundlagenarbeit, vergleichbar mit dem, was wir für
die Bauliste gemacht haben — also ein bis zwei Sitzungen, bis die Struktur steht.
Danach wird vieles auf einmal möglich, weshalb ich es trotz des Aufwands weit
oben sehe.

**Mehrere Einheiten gleichzeitig** sollte danach einfach sein: Die Befehle
arbeiten ohnehin auf einer Auswahl.

### 7. Werte steuern: Tempo, Schaden, Leben, Resistenzen — **mittel**

Leben ist schon greifbar: `currentHealth` und `maxHealth` stehen im
Gebäude-Eintrag (`+0x10C`, `+0x10E`). Für Einheiten hängt es am Einheiten-Array,
also an Punkt 6.

Schaden und Resistenzen haben wir nie gesucht. Die UCP-Balance-Dateien
(`Ascension-AI-Balance`, `liga_ai.json`) enthalten solche Werte — ein Blick
dorthin wäre der schnelle Einstieg, weil dort schon jemand die Adressen
gefunden haben muss.

### 8. Dinge spawnen: Truppen, Bauern, Tiere, Gebäude — **mittel**

Es gibt fertige Befehle: `GCT_SPAWN_ENTITY` (69), `GCT_CREATE_ANIMAL` (44),
`GCT_RECRUIT_UNIT` (31), `GCT_PLACE_BUILDING` (28). Der Weg über Befehle ist
der saubere — man muss nur die Parameter je Befehl herausfinden, so wie wir es
für `ClickDestroyBuilding` gemacht haben. Pro Befehl etwa eine Stunde.

**Neue Spieler zur Laufzeit** halte ich für deutlich schwerer: Die Arrays sind
fest (`PlayerData[9]`, `AIVSpec[9]`), ein zehnter Spieler passt nicht hinein.

### 9. Auf gegnerischem Gebiet bauen, gegnerische AIVs steuern — **kurz**

Technisch dürfte das kaum anders sein als beim eigenen Spieler: Die Bauliste
gibt es je Slot (`aivs[9]`), und `applyAIV` nimmt die Spielernummer als
Parameter. Wer Slot 5 statt 3 beschreibt, baut für den Gegner.

**Der Haken ist nicht die Technik, sondern das Gelände:** Jeder Bauplan hängt am
Bergfried des jeweiligen Spielers. Auf fremdem Gebiet zu bauen heißt, den
Bezugspunkt zu verschieben — das geht über `keepXOffset`/`keepYOffset`, aber
dann stimmt die Ausrichtung nicht mehr.

### 10. Gelände live ändern — **weit**

`GCT_SET_TERRAIN` (21) existiert, und `HandleWallTerrainMouseDrag` zeigt, wie es
die Oberfläche benutzt. Die Kartenschichten sind alle bekannt und beschreibbar.

Aber: Höhen, Wegfindung, Grafik und Logik hängen zusammen — `destroyWall` muss
nicht umsonst drei Schichten gleichzeitig zurücksetzen und die Wegfindung
anstoßen. Wer hier von Hand schreibt, produziert leicht eine Karte, auf der
niemand mehr laufen kann. Machbar, aber sorgfältig.

### 11. Ausweichen, Schaden vorausberechnen — **weit**

Reizvoll, aber es setzt drei Dinge voraus, die wir alle nicht haben: das
Einheiten-Array, die Geschossverwaltung und eine Vorstellung davon, wie das
Spiel Treffer berechnet. Dazu kommt, dass Ausweichen nur zwischen zwei Ticks
entschieden werden kann — bei 50 Ticks je Bauschritt ist das eng, aber machbar,
wenn man das Tempo drosselt.

Das ist der interessanteste Punkt der Liste und zugleich der, bei dem ich am
wenigsten sagen kann.

### 12. Kartengröße oder -form ändern — **fraglich**

Nach allem, was wir wissen: **geht nicht ohne Weiteres.** Sämtliche
Kartenschichten sind fest auf 80400 Kacheln dimensioniert, das AIV-Gitter auf
100×100, die Bauliste auf 1000 Einträge je Spieler. Diese Größen stecken als
Konstanten überall im Code.

Wer die Karte vergrößern will, müsste jede dieser Strukturen neu anlegen und
jeden Zugriff darauf umbiegen. Das ist keine Modifikation mehr, das ist ein
Umbau der Engine.

### 13. Neue Einheiten, Gebäude, Animationen — **fraglich bis weit**

Neue **Typen** einzuführen heißt, die Sprungtabelle `0x5B79A8` zu erweitern —
sie hat feste Plätze, und die Update-Funktionen dahinter müsste man selbst
schreiben. Dazu Grafiken in einem Format, das wir nicht kennen.

Realistischer wäre das Gegenteil: **vorhandene Typen umwidmen.** Ein Gebäude
bekommt andere Kosten, andere Lebenspunkte, eine andere Wirkung — sieht aus wie
das alte, verhält sich wie ein neues. Das wäre mit Punkt 1 und 7 zu machen.

### 14. Einheiten verwandeln oder Positionen tauschen — **mittel**

Hängt am Einheiten-Array (Punkt 6). Wenn der Typ dort ein schreibbares Feld ist —
wie bei Gebäuden `buildingType` bei `+0xD2` —, ist Verwandeln ein einzelner
Schreibvorgang. Positionstausch entsprechend zwei.

---

## Meine Empfehlung für die Reihenfolge

**Zuerst die drei freien Sachen**, weil sie in Stunden statt Tagen fertig sind
und sofort etwas zeigen:

1. **Kosten live ändern** — kleinster Aufwand, größter Hebel für alles Weitere
2. **Trigger „Mauer beschädigt" → nachbauen** — Daniels erste Reaktionsregel,
   alle Teile liegen bereit, und sie beantwortet nebenbei die Steinfrage
3. **Geld und Waren verschieben** — inklusive der Frage, ob es auch an Gegner geht

**Dann die eine Grundlagenarbeit, die alles andere aufschließt:**

4. **Das Einheiten-Array untersuchen** — so, wie wir es für die Bauliste gemacht
   haben. Danach werden die Punkte 6, 7, 11 und 14 auf einmal erreichbar.

**Danach der Lord-Trigger** (4), weil er das Erkennen des Todes braucht, was
vermutlich auch am Einheiten-Array hängt.

Was ich **zurückstellen** würde: Kartengröße und neue Typen. Nicht weil sie
uninteressant wären, sondern weil der Aufwand in keinem Verhältnis steht,
solange die einfachen Hebel noch ungenutzt sind.
