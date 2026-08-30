# Betriebsregeln

Wie mehrere Sitzungen gleichzeitig an Stronghold Crusader arbeiten, ohne sich
gegenseitig die Arbeit zu zerstören.

Diese Datei entstand aus echten Vorfällen, nicht aus Vorsicht. Jede Regel hat
Stunden gekostet, bevor sie hier stand.

---

## Regel 1: Vor jeder Arbeit den Stand holen

```
git pull
```

Und danach `doku/Wissensstand.md` lesen. Dort steht, was **belegt** ist und was
nur **vermutet** — der Unterschied entscheidet, ob man darauf bauen darf.

Grund: Am 29.08. haben zwei Sitzungen unabhängig dieselbe Frage untersucht
(welches Bit Mauerwerk markiert), und eine hat mit einem falschen Wert
weitergearbeitet, der längst widerlegt war.

---

## Regel 2: `ucp-config.yml` hat nur einen Schreiber zur Zeit

**Das ist die wichtigste Regel.** Die Datei wurde am 29./30.08. **viermal**
überschrieben, jedes Mal mit stundenlanger Fehlersuche als Folge.

### Was passiert ist

| Wann | Wer | Was verloren ging |
|---|---|---|
| 28.08. abends | laufende UCP3-GUI | Modul-Eintrag — die GUI schreibt beim Spielstart ihren eigenen Stand über die Datei |
| 29.08. nachts | Zurücksetzen der Konfiguration | Modul-Eintrag **und** Fenster-Einstellungen |
| 30.08. 15:55 | Sitzung A trägt Modul ein | — |
| 30.08. 16:14 | Sitzung B trägt Fenster-Einstellungen ein | Modul-Eintrag von Sitzung A |

Die letzte Zeile ist die tückischste: Beide Sitzungen haben etwas Richtiges
getan, und trotzdem war das Ergebnis kaputt. Im Spiel sieht man davon
**nichts** — das Modul lädt einfach nicht, die Regeln feuern nie, und man sucht
den Fehler im eigenen Code.

### Die Regeln daraus

- **Wer die Datei ändert, sagt es vorher an** und meldet, wenn er fertig ist.
- **Nach jeder Änderung gegenlesen**, ob die Einträge der anderen noch da sind:
  ```
  grep -c villagestudio ucp-config.yml     # muss 3 sein
  grep -A2 continueOutOfFocus ucp-config.yml
  ```
- **Vor jedem Testlauf prüfen**, ob das Modul wirklich geladen hat:
  ```
  grep "villagestudio aktiv" ucp3.log
  ```
  Kommt dort nichts, ist jede weitere Beobachtung wertlos.
- **Die UCP3-GUI bleibt geschlossen**, solange getestet wird. Sie überschreibt
  die Konfiguration bei jedem Spielstart mit dem Stand, den sie beim eigenen
  Öffnen gelesen hat.

### Warum das Modul in der GUI nie auftaucht

`MISSING_DEPENDENCIES: villagestudio-0.1.0` ist **kein** Fehler in den
Abhängigkeiten. Die GUI löst nur signierte Zip-Pakete aus dem offiziellen Laden
auf; ein entpackter Ordner ist für sie unsichtbar. Deshalb:

- Start **immer** über die Verknüpfung mit `--ucp-no-security`, nie über die GUI
- Ein eigenes Modul kann grundsätzlich nur als entpackter Ordner laufen, weil
  die Signatur fehlt

---

## Regel 3: Beim Ändern der Bauliste im Speicher

Zwei Fallen, die beide zu einem stillen Totalausfall führen.

**Die Bauliste hat 1000 Einträge, nicht 0x922.** Eine Schleife über 0x922
Einträge überschreibt den Kopf des nächsten Slots. Der betroffene Spieler
verliert seinen AIV-Slot und baut nie wieder — sichtbar nur als
`kein AIV-Slot fuer Spieler N` im Log.

**Die Feld-Offsets zählen ab dem Slot, nicht ab dem Eintrag.** Zustand, Typ und
Position liegen bei `+0x38`, `+0x3A`, `+0x40` relativ zur Eintragsbasis. Wer ab
`+0` nullt, trifft die Spielernummer im Slotkopf.

---

## Regel 4: Rückgabewerte sind vorzeichenlos

`core.exposeCode` liefert Rückgaben ohne Vorzeichen. Aus `-2` wird
`4294967294`. Eine Prüfung auf `< 0` greift nie, und ein Fehlschlag wird als
Erfolg gelesen.

```lua
if wert > 0x7FFFFFFF then wert = wert - 0x100000000 end
```

Konkret betroffen: `tryPlaceAIV` gibt `-3` (Datei nicht ladbar) und `-2`
(passt nicht) zurück.

---

## Regel 5: Nichts als bewiesen melden, was nicht gemessen wurde

Drei Beispiele aus der Praxis, alle vom 29.08.:

- Ein Modulo-Wert wurde aus **zwei** Messpunkten hergeleitet (Monat = 1600
  Ticks) und war falsch. Der dritte Punkt ergab 800. **Modulo braucht
  mindestens drei Punkte.**
- Ein Screenshot bei Minimalgeschwindigkeit wurde als „wirkt" gelesen, obwohl
  die KI schlicht noch nicht gebaut hatte.
- `wait = 20` bei Mauern wurde als „20 Ticks" gedeutet. Gemessen sind es 50 —
  der Zähler sinkt je Baudurchgang, nicht je Tick.

Faustregel: Wenn eine Zahl aus dem Code **hergeleitet** ist, gehört sie als
*abgelesen* markiert, bis sie im Spiel gemessen wurde.

---

## Regel 6: Beim Testen die Störgrößen ausschalten

Sonst misst man etwas anderes als gedacht.

| Störgröße | Wirkung | Gegenmittel |
|---|---|---|
| **Armutsbremse** | Unter 5001 Gold baut die KI nur jeden `buildInterval`-ten Durchgang | Gold auf 20000+ setzen |
| **Pause bei Fokusverlust** | Beim Fensterwechsel steht das Spiel; Befehle kommen nie an | `continueOutOfFocus: render` |
| **Spieltempo** | Ticks je Sekunde = Tempowert; bei 800 baut die KI in 15 s eine halbe Burg | Für Messungen auf 100 stellen |
| **Alte Daueraufträge** | Ein vorgemerkter Umbau feuert erneut und reißt mitten im Test ab | Vor jedem Lauf Befehlsdatei neutralisieren (`{}`) |

Der letzte Punkt hat am 29.08. einen scheinbaren Zyklus erzeugt: Die KI schien
sich alle paar Spieljahre selbst abzureißen. Tatsächlich hatte jedes Nachladen
der Logik den Auftrag neu scharf gestellt.

---

## Regel 7: Was das Modul nicht überlebt

Beim Nachladen von `logik.lua` geht **jeder Zustand in der Datei verloren** —
Daueraufträge, Regeln, Protokollstände. Wer nachlädt, muss danach alles neu
setzen. Was in `init.lua` steht, überlebt nur einen Spielneustart.

Daraus folgt: **Während eines laufenden Tests nicht nachladen.**

---

## Die Prüfliste vor jedem Testlauf

1. `git pull`, Wissensstand gelesen
2. UCP3-GUI geschlossen
3. `grep -c villagestudio ucp-config.yml` → 3
4. Spiel über die Entwicklermodus-Verknüpfung gestartet
5. `grep "villagestudio aktiv" ucp3.log` → Treffer vorhanden
6. Befehlsdatei enthält nur den gewünschten Auftrag
7. Gold gesetzt, Tempo gesetzt

Punkt 5 ist der wichtigste. Er kostet fünf Sekunden und hat schon zweimal eine
Stunde gerettet — beziehungsweise gekostet, weil er vergessen wurde.

---

## Testen — die Lehren vom 30.08.2026

An einem Tag haben drei verschiedene Fehler überlebt, obwohl jeder einen
grünen Prüflauf hatte. Alle drei fielen erst durch einen Test, der **von außen**
kam. Daraus vier Handgriffe, die vor jeder Messung stehen.

### 1. Den Totschlagtest vorher aufschreiben

Ein Satz, der falsch sein **muss**, wenn die Annahme stimmt. Vor der Messung,
nicht danach.

Beispiel, der das Einheiten-Array erledigt hat: *„Jeder ernsthaft besetzte
Spieler hat genau einen Lord."* Gemessen: Besitzer 0 hatte 258 Einheiten und
keinen einzigen Lord. Ende der Diskussion.

Ohne diesen Satz vorher hätte man die Zahlen angesehen und eine Erklärung
gefunden — es findet sich immer eine.

### 2. Extremwerte, keine mittleren

Gebäude auf **1** Lebenspunkt, nicht auf 50. Kosten auf **0**, nicht auf 10.
Tempo auf **1**, nicht auf 20.

Bei 50 Leben hätte die Todesüberwachung „funktioniert" gemeldet, obwohl sie den
Fall gar nicht erwischt. Ein mittlerer Wert bestätigt fast jede Annahme; ein
Extremwert bricht die falschen.

### 3. Der eigene Prüfer beweist nichts

`_pruefe_schreiben.js` meldete **152 von 152 grün**, während die Dateien falsch
waren — Prüfer und Schreiber teilten dieselbe Annahme über die Abschnitte 2004
und 2005. Gefunden hat es Daniel, indem er die Datei im Village-Editor öffnete.

**Regel:** Ein selbstgebautes Prüfwerkzeug prüft die Umsetzung, nie die
Annahme. Für die Annahme braucht es ein fremdes Werkzeug oder das laufende
Spiel.

### 4. Abgeleitet ist nicht gemessen

Eine Adresse aus einer Ghidra-Struktur ist eine **Behauptung** über die Basis.
Eine Adresse, bei der man nachsieht, wohin das Programm tatsächlich schreibt,
ist eine **Tatsache**. Beim Weitergeben immer dazusagen, welches von beidem.

Genau hier ist das Einheiten-Array gestorben: abgeleitet, als „abgelesen"
weitergegeben, im Spiel widerlegt.

---

## Zu zweit testen — Arbeitsteilung

Ab 31.08.2026 laufen zwei Sitzungen gleichzeitig an einem Spiel. Das geht nur
mit klarer Trennung, sonst überschreiben wir uns gegenseitig.

**Die harte Grenze:** `ucp-config.yml` hat **einen** Schreiber. Wer sie anfasst,
sagt es vorher an. Vor jedem Testlauf prüfen, ob `villagestudio aktiv` im
`ucp3.log` steht — sonst läuft das eigene Modul gar nicht und man misst den
alten Stand.

**Wer macht was:**

| | Village Studio (diese Sitzung) | Lua-Sitzung |
|---|---|---|
| **Arbeitet an** | AIV-Dateien, Ghidra, Tabellen | laufendes Spiel, Speicherzugriff |
| **Schreibt** | `lib/`, `doku/`, Werkzeuge | `logik.lua`, Modul |
| **Beantwortet** | „Wo steht das in der exe?" | „Was passiert wirklich?" |
| **Fasst nicht an** | `logik.lua` | `lib/*.json` |

**Der Kreislauf, der heute funktioniert hat:** Village Studio liefert Adresse
plus Totschlagtest → die Lua-Sitzung misst im Spiel → das Ergebnis geht mit
Marke zurück in `Wissensstand.md`. Beide Richtungen sind gleich wichtig; die
drei besten Funde am 30.08. kamen aus dem Spiel, nicht aus der Analyse.

**Vor jedem Testlauf ansagen**, welche AIV geladen ist und welcher Spieler-Slot
beschrieben wird. Zwei Sitzungen, die gleichzeitig Slot 3 beschreiben, messen
Unsinn.

**Nach jedem Fund sofort pushen.** Die andere Sitzung sieht nur, was im Repo
steht — nicht, was in unserem Verlauf steht.
