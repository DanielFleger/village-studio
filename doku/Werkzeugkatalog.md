# Werkzeug-Katalog: was sich beobachten und steuern laesst

Erarbeitet am 01.09.2026 aus vier getrennten Untersuchungen (Angriffserkennung,
Buendnisse, KI-Nummern, guenstige Ereignisse). Grundlage fuer die Regelwacht
und fuer die Steuerung in normaler Sprache.

**Vor dem Bauen lesen:** Die Marken unterscheiden gemessen von abgelesen von
vermutet. Eine Adresse aus einer Struktur ist eine Behauptung ueber die Basis,
keine Tatsache - genau daran ist am 30.08. das Einheiten-Array gestorben.

---

# Werkzeug-Katalog: Steuerung von Stronghold Crusader

**Marken:** **belegt** = im laufenden Spiel gemessen · **abgelesen** = aus Dekompilat/Struktur, im Spiel nicht gegengeprüft · **berechnet** = Adresse ist Basis + Versatz, also eine Behauptung über die Basis · **VERMUTET** = nicht geprüft.

**Woher-Kürzel:** `[W]` = `doku/Wissensstand.md` (Zeile) · `[L]` = `ucp/logik.lua` (Zeile) · `[BR]` = `doku/Betriebsregeln.md` · `[A]` = Untersuchung *angriff* · `[B]` = *buendnisse* · `[E]` = *ereignisse* · `[K]` = *ki-liste*.

**Spielerbasis überall:** `PD(p) = 0x0115BDF8 + p*0x39F4`, p = 1..8 (Platz 0 = neutrale Seite).
Diese Basis ist **belegt**: `updateAIPlayerState` (0x004D49E0) enthält die Literaladresse `0x0115E9D4`, minus Feldversatz `+0x2BDC` = `0x0115BDF8`.

**Eine Korrektur vorweg:** Die zweite Beleg-Rechnung im Bericht *angriff* („Schleifengrenze `0x0117EA8C` = Basis + **8**·0x39F4 + 0x2300") geht so nicht auf. Nachgerechnet: `0x0117EA8C − 0x0115BDF8 = 142.484 = 9·0x39F4 + 0x2300`. Es ist der Platz **hinter** Spieler 8 (Index 9) — bei einer Schleife über 0..8 genau richtig. Der Beleg trägt also, die Zahl im Bericht war ein Schreibfehler. Folge daraus: **`aiType` liegt bei `PD(p)+0x2300`** — das ist das Feld, mit dem man im laufenden Gefecht „ist dieser Platz eine KI?" beantworten könnte (siehe Lücke 1).

---

## 0. Der Katalog: sechs Werkzeuge

| # | Werkzeug | Aufgabe | Stand |
|---|---|---|---|
| 1 | **Aufsetzer** | Gefecht ohne Menü starten: Karte, Plätze, KI je Platz, Gruppen, Startgüter | vorhanden als `{"eigenesGefecht":…}` `[L 888]`, aber **nur eine KI-Sorte für alle Plätze** — für „Rotkäppchen gegen Sultan" fehlt die Liste je Platz |
| 2 | **Stellwerk** | Laufzeit stellen: Tempo, Pause, Gold, Bündnis, Beenden | Tempo/Pause/Gold/Beenden vorhanden `[L 691,697,994,795]`; **Bündnis fehlt** |
| 3 | **Fühler** | Beobachten, gestaffelt nach Kosten (Tabelle 1) | Gold/Tick/Jahr/Einheiten vorhanden `[L 1309]`; **Lord tot, Angriff, Gebäude, Verluste fehlen** |
| 4 | **Regelwerk** | „wenn X, dann Y", einmalig oder wiederholt, mehrere Folgen | Gerüst vorhanden `[L 827, 1339]`; **kein „irgendeine KI", keine Flanke, kein Wiederscharf, keine Kombination** |
| 5 | **Namensbuch** | Klartext → Zahl: „Rotkäppchen" = 1, „Sultan" = 7 | **fehlt ganz.** Tabelle liegt in `[K]`, ist nirgends im Werkzeug |
| 6 | **Kanal** | `befehl.json` rein, `logik.lua` neu laden, `ucp3.log` raus, Testsperre | vorhanden und erprobt `[BR 249, 298]` |

Der einzige Weg ins Spiel ist das Lua-Modul: von außen sind Speicher, Tasten, Fensterlage und `taskkill` mit Fehler 5 gesperrt `[BR 419]`.

---

## 1. Beobachtbare Größen, sortiert nach Kosten

Kosten = Lesezugriffe je Takt. „×8" heißt: einmal je Spieler, also 8 für alle.

| Name | Adresse | Kosten/Takt | Marke | Woher |
|---|---|---|---|---|
| Spielzeit `totalGameTicks` | `0x0117CADC` | 1 | **belegt** | `[W 137]`, in Benutzung `[L 66]` |
| Spieltempo (rücklesen) | `0x01FE7DD8` | 1 | **belegt** | `[W 204]` |
| Pausenflag (rücklesen) | `0x1FEA054` | 1 | **belegt** | `[W 428]` |
| Menüansicht `currentMenuViewType` | `0x01FE7D1C` | 1 | **belegt** | `[L 1259]`, in der Kette benutzt |
| Takt im Tag / Woche / Monat | `0x011BC680 / 84 / 88` | 1 | **belegt** (dayTicks) | `[E]`, `[W 137]` |
| Jahres-/Monats-/Wochenwechsel | `0x0117CAC8 / CAC4 / CACC` | 1 | **abgelesen** | `updateDateAndTime` 0x456670 `[E]` |
| Tagesanfang `startOfDay` | `0x0117CAF0` | 1 | **abgelesen** | ebenda |
| Jahr / Monat / Woche | `0x0117CAB8 / CAB4 / CAB0` | 1 | **abgelesen** | ebenda |
| Spiel vorbei `gameOver` | `0x0117D500` | 1 | **abgelesen**, Basis berechnet | `checkSkirmishGameDefeat` 0x486600 `[E]` |
| Objekte in der Luft `totalEntityCount` | `0x02350300` | 1 | **abgelesen** | `updateEntities` 0x4087C0 `[E]` |
| Feuer auf der Karte `fireCount` | `0x02350310` | 1 | **abgelesen** | `recountActiveFires` 0x401620 `[E]` |
| Uhr angehalten `isTimeHalted` | `0x01FE7DE0` | 1 | **abgelesen** | `[E]` |
| **Gold** | `PD(p)+0x50C` (p1 `0x0115FCF8`) | 1 ×8 | **belegt** | `[W 123]`, gegengeprüft 01.09. `[L 683]` |
| **Angriffszustand `aiPlayerState`** | `PD(p)+0x2BA4` (p1 `0x01162390`) | 1 ×8 | **abgelesen**, Basis belegt | `updateAIPlayerState` 0x004D49E0 `[A]` |
| Angriffsziel `attackedPlayerID` | `PD(p)+0x2BD8` (p1 `0x011623C4`) | 1 ×8 | **abgelesen** | `selectAttackTarget` 0x004D4680 `[A]` |
| Angriffsdauer `attackTicker` | `PD(p)+0x3970` (p1 `0x0116315C`) | 1 ×8 | **abgelesen** | `[A]` |
| **Lord tot `lordKilledByPlayerID`** | `PD(p)+0x2210` (p1 `0x011619FC`) | 1 ×8 | **abgelesen** | `checkSkirmishGameDefeat` Z. 78–99 `[E]` |
| **Verluste `troopsLost`** (steigt monoton) | `PD(p)+0x2230` (p1 `0x01161A1C`) | 1 ×8 | **abgelesen** | `processUnitLossStatistic` 0x4563D0 `[E]` |
| Einheiten gesamt `countEntities` | `PD(p)+0x84` (p1 `0x0115F870`) | 1 ×8 | **abgelesen** | `resetCountsAndStatistics` 0x4560F0 `[E]` |
| Armee `armySize` / Vortakt `+0x3B8` | `PD(p)+0x53C` (p1 `0x0115FD28`) | 1 ×8 | **abgelesen** | ebenda `[E]` |
| Bevölkerung | `PD(p)+0x2180` (p1 `0x0116196C`) | 1 ×8 | **abgelesen** | `computePopulationStatistics` 0x45AF30 `[E]` |
| Beliebtheit | `PD(p)+0x60` | 1 ×8 | **abgelesen** | `[E]` |
| Belagerungsgerät | `PD(p)+0x3BC` | 1 ×8 | **abgelesen** | `[A]`, `[E]` |
| Nervös durch Feinddruck | `PD(p)+0x3820` | 1 ×8 | **abgelesen** | `computeNervousness` 0x004D3780 `[A]` |
| **Gebäudezahl** | `0x011BEC88 + p*4` | 1 ×8 | **abgelesen**, mit vier Grenzen (§4) | `addBuildingInRegistry` 0x45AE10 `[E]` |
| **Bündnis `playerTeams`** | `0x0117D548 + p*4` | 1 ×8 | **berechnet**, dreifach gegengeprüft | `resetTeams` 0x00459640, `isSameTeam` 0x00401090 `[B]` |
| `aiType` (ist der Platz eine KI?) | `PD(p)+0x2300` (p1 `0x01161AEC`) | 1 ×8 | **abgelesen**, Bedeutung des Menschwerts offen | Schleifengrenze `updateAIBehaviour` 0x004D53E0, oben nachgerechnet |
| Lord lebt, mit UID-Gegenprobe | `PD+0x21F8`, `+0x21FC`, `units[id]+0x98` | 3 ×8 = 24 | **abgelesen** | `computePopulationStatistics` Z. 30 `[E]` |
| Angriffszähler beim Opfer (Flanke) | `0x0115E9D4 + opfer*0x39F4 + angreifer*0x20` | 64 (voll) | **abgelesen**, Adresse ist Literal im Code | `updateAIPlayerState` `[A]` |
| Feindtruppen je Angreifer im Umkreis 60 | `PD(p)+0x38B8` int[9] | 9 ×8 = 72 | **abgelesen** | `recomputeTroopValuesForPlayer` 0x00532BA0 `[A]` |
| Gemerkte Mauerkacheln (Höhe) | `0x01D32C38 + k` | ~500 je Spieler | **belegt** | 8.700 Heilungen im Gefecht `[W 467]` |
| Gebäude-Array durchgehen | `0x00F98534`, Schritt 812 | ~4.000 | **belegt** | `[L 39]` |
| Einheiten-Array durchgehen | `0x0138854C`, Schritt 1168, Grenze `0x01387F38` | ~7.500 | **belegt** | `spawnUnit` 0x53E440, Maschinencode `[L 239]` |
| Objekt-Array durchgehen | `0x02350314`, Schritt 232 | ~9.000 | **abgelesen** | `[W 303]` |
| Volle Kachelschicht | `0x01D5A058` u. a., 80.400 Kacheln | 80.400 | **belegt** | nur beim Scharfstellen `[L 22]` |

**Empfohlene Grundlast:** 6 globale + 2 je Spieler (`lordKilledByPlayerID`, `aiPlayerState`) = 22 Lesezugriffe je Takt. Das ist rund ein Tausendstel dessen, was die Mauerwacht ohne spürbare Bremse gelesen hat.

**Wichtig zum Taktzeitpunkt:** Der Modulhaken sitzt am Anfang von `processGameTick`, vor dem Nullen der Zähler `[E]`. `countEntities`, `armySize` und der Gebäudezähler zeigen dort den **vollständigen Stand des Vortakts** — mitten im Takt gelesen wären sie halbfertig.

---

## 2. Steuerbare Größen

| Name | Adresse / Funktion | Wie setzen | Marke | Woher |
|---|---|---|---|---|
| **Spieltempo** | `0x01FE7DD8` | `writeInteger(n)`; Ticks/s = Wert, Vorgabe 40 | **belegt** | `[W 204–210]`, `[L 697]` |
| **Pause** | `0x1FEA054` | `writeInteger(1/0)`. Kein Schriftzug im Bild, der Takt steht trotzdem. Der Haken läuft weiter | **belegt** | `[W 428]`, `[L 691]` |
| **Gold / Ware** | `PD(p)+0x4D0+art*4` (Gold = art 15) | `writeInteger` | **belegt** | `[W 123]`, `[L 985]` |
| **Bündnis im Gefecht** | `playerTeams 0x0117D548 + p*4` | gleiche Zahl = ein Team. `isSameTeam` liest es bei **jeder** Prüfung neu, also wirkt es sofort | Adresse **berechnet**, **Schreibwirkung VERMUTET** | `[B]` |
| Bündnis sauber über den Spielweg | `CommandSwitchTeams 0x0048ACB0` | Param 0 anfragen / 1 annehmen / 2 kündigen | **abgelesen** | `[B]` |
| **Bündnis vor dem Start** | `DAT_PlayerGroupArray 0x01A275B5 + i` (byte) | `0xFF` leer, `0` allein, `1..4` Gruppe | **gemessen** | `[B]`, in Benutzung `[L 963]` |
| **KI je Platz** | `currentAIArray 0x0191DE7C + slot*4` | Wert = `aiType + 1`, `0` = leer | **gemessen** nur für Wert 1 (Rotkäppchen), Rest erschlossen | `[K]`, `[L 954]` |
| KI-Variation zurücksetzen | `0x0191DEA0` + `resetAiVar 0x00428050(slot)` | je Platz aufrufen | **gemessen** | `[L 955]` |
| Startposition | `playerPositionsArray 0x01A275D0 + i` (byte) | `0xF6` = zufällig | **gemessen** | `[L 961]` |
| Karte | `0x01A22F9C` char[1000] | Name **ohne** `.map` | **gemessen** | `[L 971]` |
| Ausgleich / Startgüter | `0x01A24A4C = 2` / `0x01A245A4 = 1` | echte Werte aus Gefechtsmission 0 (`0x00B3EC48`) — **0 ist hier kein neutraler Wert** | **gemessen** | `[BR 391]`, `[L 966]` |
| **Gefecht starten** | `LaunchSkirmishGame 0x00441270`, `exposeCode(…,1,0)`, Argument 0 | erst Lobby füllen, dann rufen; Reihenfolge ist zwingend | **gemessen** | `[L 888–978]` |
| Kampagnengefecht starten | `SetupSkirmishMode 0x4C68D0` | `{"gefecht": n}` | **belegt** | `[BR 260]` |
| Menüansicht wechseln | `switchToMenuView 0x0046B340` thiscall(`0x01FE7D10`, ziel, 0) | 41 Hauptmenü, 14 Baumenü, 16 Spiel | **belegt** | `[L 744]` |
| **Spiel beenden** | `ExitProcess` über IAT `0x0059E110` | `exposeCode(adr,1,0)(0)`; kehrt nie zurück | **belegt** | `[L 795]`, `[BR 419]` |
| Baukosten | `0x01124CF4` int[110][5] | vor dem Gefecht leer | **belegt** | `[W 446]` |
| Mauerkachel heilen | `0x01D32C38 + k` | Höhe zurückschreiben, Schaden `0x01DBC2A8+k` mit | **belegt** | `[W 467]`, `[L 100]` |
| Einheit erzeugen | `spawnUnit 0x53E440` | im Modul **nicht** umgesetzt | **abgelesen** | `[L 239]` |
| Angriff abbrechen | `abortAttackAndGoIdle`, oder `aiPlayerState` auf 8 schreiben | nicht umgesetzt | **VERMUTET** | `[A]` |
| Fenster verschieben | `SetWindowPos` über IAT `0x0059E1F4` | **Nicht benutzen** — `exposeCode` kennt kein stdcall, der Prozess stirbt (dreimal gemessen) | **belegt (negativ)** | `[L 612–645]` |

---

## 3. Format einer Ereignis-Regel

Baut auf dem vorhandenen Gerüst auf (`regel` / `wenn` / `dann` / `einmal`, `[L 827]`) und ergänzt genau vier Dinge: Vergleichswörter, „irgendeine KI", Flanke, Wiederscharf.

```json
{ "regel": {
    "name":   "Reicher Gegner",
    "wenn":   { "wert": "gold", "spieler": "ki", "ueber": 100000 },
    "dann":   [ { "sage": "Erste KI bei 100.000 Gold" },
                { "pause": true } ],
    "einmal": true
} }
```

**Bedingung** — ein Objekt mit genau drei Angaben:

| Feld | Werte |
|---|---|
| `wert` | Name aus Tabelle 1: `gold` `einheiten` `armee` `gebaeude` `bevoelkerung` `beliebtheit` `verluste` `belagerungsgeraet` `angriff` `lordTot` `tick` `jahr` `objekte` |
| `spieler` | `1`…`8`, oder `"ki"` = irgendein KI-Platz, `"mensch"`, `"alle"` = jeder muss erfüllen |
| Vergleich | genau eines von `ueber` · `unter` · `ist` · `steigt` (Flanke: Wert ist seit dem letzten Takt gewachsen) |

Optional in der Bedingung: `"alle": 25` — nur jeden 25. Takt prüfen. Pflicht bei allem, was Tabelle 1 mit mehr als 100 Zugriffen ausweist.

**Mehrere Bedingungen:** `wenn` darf eine **Liste** sein. Liste heißt „alle müssen gelten" — kein Schlüsselwort nötig, von Hand lesbar:

```json
"wenn": [ { "wert": "angriff", "spieler": "ki",  "ist": true },
          { "wert": "gold",    "spieler": "ki",  "ueber": 50000 } ]
```

**Auslösen:**

| Feld | Bedeutung |
|---|---|
| `"einmal": true` (Vorgabe) | feuert einmal, dann ist die Regel erledigt |
| `"einmal": false` | feuert bei **jeder** neuen steigenden Flanke — die Regel wird erst wieder scharf, wenn die Bedingung dazwischen falsch war. Kein Dauerfeuer je Takt |
| `"wieder": 500` | frühestens 500 Takte nach dem letzten Mal |

**Folgen:** `dann` ist eine Liste ganz gewöhnlicher Befehle — damit steht der komplette vorhandene Wortschatz zur Verfügung (`pause`, `tempo`, `gold`, `beenden`, `bild`, `menue`, `kette`, `regel`, …). Zusätzlich zwei kleine: `{"sage": "Text"}` schreibt eine Logzeile, `{"loesche": "Regelname"}` entschärft eine andere Regel.

**Verwaltung:** `{"regeln": "aus"}` löscht alle (vorhanden), `{"regeln": "liste"}` meldet Name, Zustand und letzte Auslösung jeder Regel (fehlt noch, für „was ist eigentlich scharf?" nötig).

**Daniels fünf Sätze in diesem Format:**

```json
[ { "eigenesGefecht": { "karte": "!KOphase Map 1", "ki": [1, 7] } },
  { "tempo": 100 },
  { "team": { "1": 1, "2": 1 } },

  { "regel": { "name": "Reicher Gegner",
               "wenn": { "wert": "gold", "spieler": "ki", "ueber": 100000 },
               "dann": [ { "pause": true } ], "einmal": true } },

  { "regel": { "name": "Erster Angriff",
               "wenn": { "wert": "angriff", "spieler": "ki", "ist": true },
               "dann": [ { "sage": "KI marschiert" }, { "beenden": true } ],
               "einmal": true } } ]
```

`"angriff"` liest `aiPlayerState` und gilt bei `1 <= Wert <= 6` als wahr (`[A]`). `"lordTot"` liest `lordKilledByPlayerID` und gilt bei `≠ 0` als wahr.

---

## 4. Nicht verlässlich beobachtbar — und was fehlt

**1. „Ist dieser Platz eine KI?"** Für `"spieler": "ki"` braucht das Regelwerk die Liste der KI-Plätze. Zwei Kandidaten, beide ungeklärt: `currentAIArray 0x0191DE7C` ist ein **Lobby**-Array — ob es im Gefecht noch gilt, ist **VERMUTET**. `aiType PD(p)+0x2300` steht im Spielerblock, aber **welchen Wert der menschliche Platz dort trägt, weiß niemand** (0 ist hier verdächtig: 0 wäre auch „Rat"). *Fehlt:* ein Lauf mit einem Menschen und zwei bekannten KIs, beide Felder für alle 9 Plätze mitschreiben. Bis dahin: KI-Plätze beim Scharfstellen von Hand mitgeben.

**2. Gebäudezahl.** Der Zähler `0x011BEC88+p*4` hat vier Grenzen `[E]`: Deckel bei 500; brennende Gebäude fehlen (`fireDuration ≠ 0` wird übersprungen — bei Brand fällt die Zahl ohne Verlust); in `GM_SOLITARY` läuft er gar nicht; **Bergfried und Vorratslager stehen nicht in der Aufruferliste**. *Fehlt:* Anzündtest (fällt er um genau eins, kommt er nach dem Löschen zurück?) und ein Spieler mit über 500 Gebäuden.

**3. Abschüsse `troopsKilled` `PD+0x2234`.** **VERMUTET.** Nur der Null-Schreiber beim Spielstart ist gefunden, der Hochzähler nicht. *Fehlt:* die Schreibstelle. Ersatz: `troopsLost` des Gegners.

**4. Raubzüge.** Eine KI mit `aiPlayerState == 0` kann trotzdem einen Trupp losschicken, der Gebäude zerlegt — `aiGiveRaidInstructions` (0x004D2A70) läuft unabhängig vom Angriffszustand `[A]`. „Wenn eine KI angreift" erfasst mit `aiPlayerState` also **Belagerungen, keine Nadelstiche**. Ersatzfeld `totalRaidingTroopsUnk PD+0x30EC` ist **abgelesen**, Bedeutung ungeprüft.

**5. Menschliche Angreifer.** `aiPlayerState` gibt es nur für KIs. Wer „jemand greift mich an" braucht, muss `totalEnemyTroopValueByPlayerID PD+0x38B8` lesen (72 Zugriffe/Takt, **abgelesen**). Abstandsmaß ist `max(|dx|,|dy|)`, Schwelle 60 Kacheln.

**6. Zustandswechsel kommen nicht tickgenau.** `updateAIPlayerState` läuft nur, wenn `weekTicks == spielerID` — höchstens einmal je Wochentakt und Spieler. **Zustand 1 kann komplett übersprungen werden** (er wird im selben Aufruf zu 2). Eine Flankenerkennung darf sich nie darauf verlassen, die 1 zu sehen.

**7. `totalEntityCount` als „Kampf läuft".** Zählt **alles**: Feuer, Fahnen, Krähen, Gold- und Beliebtheitsblasen. Ohne vorher **gemessene** Ruhelinie ist jede Schwelle geraten. Sauberer: `totalEntityCount − fireCount`.

**8. Mauerkacheln eines Spielers.** **Es gibt kein Feld dafür** — `strukturen.txt` und die Funktionsliste wurden danach durchsucht `[E]`. Nur der Weg über die beim Scharfstellen gesammelte Kachelliste (~500/Takt).

**9. `playerIsAlive 0x0117EF40`.** Klingt richtig, ist es nicht: beschrieben wird es nur im Spielende-Zweig, in `VoteKick` und im Baumenü. Während des Spiels steht dort nichts Brauchbares. Ebenso `finalResults 0x01A26D2C` — Abschlusswerte, kein laufender Stand. **Nehmen: `lordKilledByPlayerID`.**

**10. Bündnis mitten im Gefecht schreiben.** `playerTeams` ist die einzige Wahrheit im Kampf (rund 85 Funktionen lesen es, `isSameTeam` ist eine Zeile) — aber ein Schreibversuch im laufenden Spiel wurde **nie gemacht**. Offen bleibt, was mit Einheiten passiert, die den alten Feind schon als Ziel führen. Falle nebenbei: `getTeamsDifferent` (0x004596D0) liefert FALSE, sobald eine der IDs 0 ist — Platz 0 gilt dort nie als Feind, `isSameTeam` macht diese Ausnahme nicht.

**11. „Der Sultan" ist zweideutig.** Mit aktivem `aiSwapper` sitzt auf dem Vanilla-Platz *sultan* (`currentAIArray` 7) im Spiel der **Gardist** `[K]`. Nur Wert 1 (Rotkäppchen) ist im Spiel gemessen, die übrigen 15 sind aus der Missionstabelle **erschlossen**. *Fehlt:* Totschlagtest mit Wert 16 — muss den Abt erzeugen, nicht den Sheriff und nicht „nichts". Das Namensbuch muss außerdem sagen können, welche Fassung gemeint ist: Vanilla-Lord oder Mod-KI.

**12. `siegeTargetPlayerID` (Unit +0x432)** und die Trupp-Verhaltenswerte 1010–1054: beides **VERMUTET**, Schreibstelle bzw. Bedeutung nicht aufgelöst `[A]`.

**13. `skirmishAlliances 0x01A26A20`:** dass es „Bündnisse erlaubt ja/nein" bedeutet, ist aus Name und Menüverwendung geschlossen, **nicht im Code geprüft** `[B]`.

---

## Dateien

```bash
explorer /select,"C:\Users\danie\Documents\PC_Affe\Games\Stronghold_Crusader\Stronghold Crusader Modding\Tools\VillageStudio\ucp\logik.lua"
```
```bash
explorer /select,"C:\Users\danie\Documents\PC_Affe\Games\Stronghold_Crusader\Stronghold Crusader Modding\Tools\VillageStudio\doku\Wissensstand.md"
```
```bash
explorer /select,"C:\Users\danie\Documents\PC_Affe\Games\Stronghold_Crusader\Stronghold Crusader Modding\Tools\VillageStudio\doku\Betriebsregeln.md"
```

Weiter: `…\VillageStudio\lib\strukturen.txt` (PlayerData ab Zeile 4510, MapAndTimeState 4918, AICState 4047, Tribe 6587), `…\lib\funktionen.csv`, `…\werkzeug\` (befehl.py, gefecht.py, test.py, sperre.py, starte_spiel.py).

Das laufende Spiel wurde nicht angefasst: keine `befehl.json`, keine `logik.lua` geändert, kein Prozess, kein Bild — nur gelesen.