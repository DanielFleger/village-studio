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

---

## Testen ohne Menü und ohne Maus (ab 30.08.2026)

Daniel startet nichts, klickt nichts und soll während eines Testlaufs
weiterarbeiten können. Der ganze Kreislauf läuft deshalb über Dateien.

### Der Kanal

| Richtung | Weg |
|---|---|
| **Befehl hinein** | `ucp/villagestudio/befehl.json` schreiben |
| **Logik ändern** | `ucp/villagestudio/logik.lua` überschreiben — wird im Lauf neu geladen, kein Neustart |
| **Ergebnis heraus** | `ucp3.log` lesen |

Fertige Helfer liegen in `werkzeug/`: `gefecht.py` (Gefecht starten),
`test.py` (beliebigen Befehl absetzen und Antwort lesen), `befehl.py`.

### Gefecht starten, ohne das Menü zu bedienen

```json
{ "id": 23010, "gefecht": 0 }
```

`SetupSkirmishMode(n)` bei `0x4C68D0` macht alles allein. Damit der Befehl
außerhalb eines Gefechts überhaupt gelesen wird, hängt ein zweiter Haken an
**`renderBltAndFlip` (`0x470040`)** — `hookCode(f, a, 2, 1, 6)`, thiscall mit
einem Argument, 6 gestohlene Bytes.

**Warum ausgerechnet der:** Der normale Befehls-Poll hängt an
`processGameTick`, und der tickt nur **im** Gefecht. Zwei andere Kandidaten
sind gemessen und ausgeschieden — `MenuView_MainMenu_DoEveryFrame`
(`0x424DA0`) feuert im Hauptmenü nie, `SetCursorDependingOnProgramState`
(`0x440430`) nur bei Zustandswechsel.

### Zwei Fallen, die einen Abend gekostet haben

**1. PowerShell schreibt ein BOM.** `Set-Content -Encoding UTF8` setzt in
PowerShell 5.1 drei Bytes (`EF BB BF`) an den Dateianfang. Lua bricht ab mit
*„unexpected symbol near '<239>'"*. **Lua- und JSON-Dateien hier immer mit
Python schreiben**, nie mit `Set-Content` oder `Out-File`.

**2. Mehrfachinstanzen verfälschen jede Messung.** Startet man das Spiel,
während schon eines läuft, lädt die neue Instanz UCP **vollständig**
(schreibt also Logzeilen, setzt Haken) und bleibt dann im Dialog *„Stronghold
Crusader is already running"* stehen — sie kommt nie ins Menü. Das Log zeigt
dann „Haken gesetzt", der Haken feuert aber nie, und man sucht den Fehler an
der falschen Stelle.

**Vor jedem Testlauf:**
```
Get-Process | Where-Object { $_.ProcessName -match "Crusader" } | ForEach-Object { $_.Kill() }
```
und danach prüfen, dass **genau eine** Instanz läuft und ihr Fenstertitel
`Crusader` heißt (nicht `FATAL`, nicht `Stronghold Crusader Error`).

### Die Testsperre — nur eine Sitzung fährt das Spiel

**Am 31.08. um 20:36 haben beide Sitzungen gleichzeitig einen Testlauf
gestartet.** Beide Läufe waren wertlos, und keiner der beiden hat es sofort
gemerkt — denn von außen sieht alles gesund aus:

- Die zweite Instanz bleibt im Dialog *„is already running"* hängen, lädt UCP
  aber **vollständig** und schreibt Logzeilen. Das Log meldet „Haken gesetzt"
  und „Modul aktiv", während das Spiel nie ins Menü kommt.
- `ucp3.log` wird bei **jedem** Spielstart neu angelegt. Wer startet, löscht
  die Messwerte des anderen.
- Beide schreiben in dieselbe `befehl.json` und überschreiben sich.

Deshalb gibt es `werkzeug/sperre.py` und die Datei
`ucp/villagestudio/wer_testet.txt`:

```bash
python werkzeug/sperre.py nachsehen
```

**Vor jedem Testlauf holen, danach freigeben:**

```bash
python werkzeug/sperre.py holen villagestudio "Burg_left_2-Lauf"
```

Rückgabe 0 heißt bekommen, 1 heißt belegt — dann **nicht testen**, sondern der
anderen Sitzung schreiben. Eine Sperre, die älter als 30 Minuten ist, gilt als
vergessen und darf übernommen werden. `werkzeug/lauf_burg2.py` holt und gibt
sie von selbst frei, auch bei jedem Abbruch.

Das ersetzt keine Absprache, es fängt nur den Fall ab, dass eine vergessen
wurde.

### Das Spielfenster ist von aussen NICHT bedienbar (31.08.2026)

Der Prozess laeuft erhoeht, die Claude-Sitzung nicht. Windows (UIPI) sperrt
deshalb **jede** Eingabe von aussen an dieses Fenster:

| Weg | Ergebnis | Marke |
|---|---|---|
| `PostMessage(hwnd, WM_KEYDOWN, VK_Q, ...)` | `false`, `GetLastError` = **5** | **gemessen** |
| Maussteuerung ueber den Rechner (computer-use) | dieselbe Sperre — der Werkzeugkasten sagt es selbst an | **abgelesen** |
| `OpenProcess` / `ReadProcessMemory` | Fehler 5 | **belegt** (schon vorher bekannt) |
| `taskkill` auf den Prozess | „Zugriff verweigert" | **gemessen** |

`IsWindow` liefert dabei `true` — das Fenster existiert also, nur darf man
nicht hineinreden.

**Folgen fuer die Arbeitsweise:**

- Der spieleigene Screenshot per Taste Q ist von hier aus **prinzipiell**
  unerreichbar. Nicht „noch nicht ausprobiert" — unerreichbar.
- Auch das Beenden des Spiels geht nicht von hier. Ein Neustart braucht Daniel.
  Wer eine Sackgasse baut, sitzt darin fest.
- Der **einzige** Weg ins Spiel ist das Lua-Modul, das im Spielprozess selbst
  laeuft und dessen Rechte hat. Alles, was gebraucht wird, muss dort hinein.

---

### Lua: Vorwaertsdeklaration nicht vergessen (31.08.2026)

In `logik.lua` wurde `bauwachtStart` in Zeile 716 gerufen, aber erst in Zeile
822 als `local function` definiert. Lua sucht den Namen dann im globalen Raum,
findet nichts und bricht mit *„attempt to call a nil value"* ab.

**Der Bauwacht-Befehl war dadurch seit jeher wirkungslos** — und genau er ist
der Messfuehler fuer den `Burg_left_2`-Lauf. Ein Messlauf haette schweigend
nichts geliefert, und man haette den Fehler beim Bauen der KI gesucht.

Der Fehler faellt nicht auf, weil `einzelbefehl` in `pcall` laeuft: die Warnung
landet als eine Zeile im Log und der Rest arbeitet weiter.

**Regel:** Wer in `logik.lua` eine Funktion aus `einzelbefehl` ruft, die weiter
unten steht, schreibt oben `local name` hin und unten `name = function(...)`.
Pruefen laesst sich das ohne Spiel:

```bash
python - <<'EOF'
import io, re
s = io.open('logik.lua', encoding='utf-8').read().splitlines()
defs = {re.match(r'local function (\w+)', z).group(1): i
        for i, z in enumerate(s, 1) if re.match(r'local function \w+', z)}
start = next(i for i, z in enumerate(s, 1) if z.startswith('local function einzelbefehl'))
for name, zeile in defs.items():
    if zeile > start and any(re.search(r'(?<![.:])%s\s*\(' % name, z)
                             for z in s[start-1:zeile]):
        print('zu spaet definiert:', name, zeile)
EOF
```

---

### Die Null ist auch nur geraten (01.09.2026)

Die Regel *"keine geschaetzten Konstanten - Wert auf 0 setzen oder echt messen"*
hat eine Luecke, die an diesem Tag zugeschlagen hat.

Beim Aufsetzen eines eigenen Gefechts wurden `skirmishGameIntensityType`
(Startgueter) und `skirmishCurrentAdvantageBalance` (Ausgleich) auf 0 gesetzt -
in der Annahme, 0 sei der neutrale Wert. Ergebnis im Spiel: **1 Stueck von
jedem Startgut, Tierhaeute, die es in Crusader gar nicht gibt, und 5.892.144
Gold.** Die Null ist dort kein neutraler Wert, sondern ein ungueltiger Index in
eine Guetertabelle - das Spiel las daneben.

Die echten Werte standen die ganze Zeit im Spiel selbst, in Gefechtspfad-
Mission 0 bei `0x00B3EC48`: **fairness = 2, startLevels = 1.** Ein Blick
dorthin haette zwei Minuten gekostet.

**Die Praezisierung:** Die Null ist nur bei *Zaehlern und Summen* ein
neutraler Anfangswert. Bei einem **Index, einer Art- oder Stufennummer** ist
sie genauso geraten wie jede andere Zahl - und faellt haerter auf, weil sie
harmlos aussieht.

Vor dem Schreiben eines solchen Feldes deshalb immer: **Wo benutzt das Spiel
dieses Feld selbst?** Diese Stelle auslesen und den echten Wert nehmen. Bei
Gefechtseinstellungen ist das die Missionstabelle, bei Gebaeuden die
Kostentabelle, bei KI-Nummern die Zuordnung im Plugin.

---

### Was von aussen geht und was nicht (Stand 01.09.2026)

Der Spielprozess laeuft auf hoher Rechtestufe, die Claude-Sitzung nicht. Diese
Tabelle ist gemessen, nicht hergeleitet - jede Zeile hat einen Versuch gekostet.

| Von aussen | Ergebnis |
|---|---|
| Tastendruck an das Fenster schicken | Fehler 5 |
| Fenster nach hinten setzen, verschieben, minimieren | Fehler 5 |
| Speicher lesen oder schreiben | Fehler 5 |
| Prozess beenden (taskkill, Stop-Process) | Zugriff verweigert |
| Fenster **suchen** und Lage **lesen** | geht |
| Ein ANDERES Fenster nach vorn holen | geht — und das genuegt |

**Der Weg hinein fuehrt ausschliesslich ueber das Modul**, das im Spielprozess
laeuft und dessen Rechte hat. Alles, was von aussen gesperrt ist, muss dort
hinein.

**Spiel beenden — geht jetzt selbst.** `{ "beenden": true }` ruft im Modul
`ExitProcess` ueber den Import-Eintrag bei `0x0059E110`. Ausgerechnet hier ist
der Aufruf sicher: Die Funktion kehrt nie zurueck, der Stapelschaden aus der
falschen Aufrufart kann also nicht mehr wirken. `werkzeug/starte_spiel.py`
beendet damit von selbst, bevor es neu startet.

**Fenster in den Hintergrund — ohne es anzufassen.** Vor dem Start merken,
welches Fenster vorn war, danach dieses zurueckholen. Das Spiel rutscht von
selbst nach hinten und laeuft mit `continueOutOfFocus: render` weiter.
**Dabei die Fenstergroesse nicht anfassen:** `ShowWindow(9)` holt ein
minimiertes Fenster zurueck, macht aber ein maximiertes klein - am 01.09. ist
Daniels Vollbild-Browser dadurch geschrumpft. Erst `IsIconic` fragen.

**Monitor 2 ist ueber die Fensterlage nicht erreichbar.** `window.pos:
topRight` verschiebt korrekt, aber beim Wechsel auf den zweiten Schirm bricht
die Darstellung zusammen und der Prozess stirbt (dreimal gemessen, von Daniel
im Bild bestaetigt). Gegenprobe mit `bottomLeft`, das auf Monitor 1 bleibt:
laeuft stabil. **Der Monitorwechsel ist die Ursache, nicht die Option.**

---

### exposeCode kennt drei Aufrufarten - die 2 ist stdcall (01.09.2026)

**Der wichtigste Fund des Abends**, weil er nicht nur ein Problem loest, sondern
eine ganze Tuer oeffnet: Windows-Funktionen sind aus dem Modul heraus rufbar.

| Wert | Aufrufart | Beispiel |
|---|---|---|
| 0 | cdecl | `SetupSkirmishMode`, `LaunchSkirmishGame` |
| 1 | thiscall (`this` zaehlt als erstes Argument mit) | `applyAIV` mit 2 Argumenten -> `exposeCode(a, 3, 1)` |
| **2** | **stdcall** | **alle Windows-Funktionen** |

Vorgeschichte: `SetWindowPos` mit Aufrufart 0 hat den Prozess **zweimal
getoetet**. Die Funktion ist stdcall und raeumt ihre sieben Argumente selbst
vom Stapel; exposeCode raeumte bei cdecl ein zweites Mal auf, der Stapelzeiger
wanderte, der naechste Ruecksprung ging ins Leere. Der Verdacht fiel dabei
nacheinander auf die Fensterposition des Grafikmoduls und auf die Rechtestufe -
beides falsch. Mit Aufrufart 2 kommt der Aufruf sauber zurueck.

**Merksatz:** Stirbt ein Aufruf ueber exposeCode ohne Fehlermeldung, ist die
Aufrufart der erste Verdaechtige, nicht die Adresse.

---

### Das Spielfenster in den Hintergrund - was geht und was nicht

„Im Hintergrund" heisst hier genau eine Sache: **zuunterst im Fensterstapel,
alles andere darueber.** Nicht minimiert (dann friert der Zeichenhaken), nicht
bloss ohne Tastaturfokus (dann verdeckt es weiter den Bildschirm).

| Weg | Ergebnis |
|---|---|
| `SetWindowPos` von aussen auf das Spielfenster | **Fehler 5** - hohe Rechtestufe |
| Alle anderen Fenster von aussen anheben | wirkt, aber ist ein Wettlauf: das Spiel drueckt zurueck |
| **`SetWindowPos` aus dem Modul, Aufrufart 2** | **wirkt dauerhaft** - Platz 6 von 7, nur der Desktop darunter |

Der Fokus ist eine zweite, unabhaengige Sache: Windows gibt ihn dem frisch
gestarteten Spiel, und `SWP_NOACTIVATE` nimmt ihn nicht weg. Ihn
zurueckzugeben braucht `AttachThreadInput` - ein blosses
`SetForegroundWindow` aus einem Hintergrundprozess gibt `false` zurueck und
tut nichts. Zwoelf Wiederholungen davon sind zwoelfmal nichts.

**Gemessen, drei Durchgaenge in Folge:** Oeffnen im Hintergrund 3,6 s,
Schliessen 0,4 s. `werkzeug/start_hinten.ps1` ueberbrueckt die ersten Sekunden,
bis das Modul laeuft, und uebergibt dann an die Wacht im Spiel.

**Zwei Zeitfresser, die dabei aufgefallen sind:**
- Jeder PowerShell-Start kostet rund eine halbe Sekunde. Wer im Takt fragt
  „laeuft der Prozess noch?", nimmt `tasklist` direkt - das antwortet in
  Millisekunden. Dabei `errors="replace"` setzen: tasklist gibt Zeichen aus,
  die die Windows-Standardkodierung nicht kennt, sonst ist `stdout` **None**.
- Feste Wartezeiten sind fast immer zu lang. Besser eine Abbruchbedingung:
  das Startskript hoert auf, sobald das Modul laeuft und die Lage sitzt - das
  hat aus 22 Sekunden 3,2 gemacht.

---

### Start von Hand

Nur über die Desktop-Verknüpfung „Stronghold (Entwicklermodus)":
`Stronghold Crusader.exe --ucp-no-security`. Ohne den Schalter verweigert der
sichere Modus das Modul, weil es als Ordner statt als ZIP vorliegt.
