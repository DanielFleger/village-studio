# Eine Partie starten

**Angelegt: 15.11.2026 (Sitzung SAI - Raid-Liga, S169).** Gilt für jede Sitzung, die eine Stronghold-Partie startet.

## 0. ZUERST: Daniel fragen. Vor jedem Spielstart, ohne Ausnahme.

Keine Partie, bevor Daniel die Fragen unten beantwortet hat. Nie per Skript starten (`eigenesGefecht`,
`aufstellung_vergleich`, `gefecht_starten`), sondern über das Spiel: Kreuzzug → Eigenes Spiel.

Daniels Wortlaut:
- 15.11.2026 11:31: „warum du das Spiel aus dem Hauptmenü direkt startest, anstatt wie besprochen mich erst fragst, wer
  gegen wen, auf welcher Map, welche Position und Teams“
- 15.11.2026 11:33: „bitte starte das Spiel nicht über ein Skript, sondern über das Spiel – eigenes Gefecht, Karte
  auswählen, Position auswählen (mich davor fragen, welche Karte, welche Position, welche Gegner / welche Teams, wie viel
  Gold etc.). Und natürlich muss die Selfaware AI auch selbständig laufen ohne deine Hilfe“
- 15.11.2026 11:44: „Dann mach daraus einfach keine Disziplin, sondern erstelle eine Wissensdatenbank, wo drinsteht, wie
  man ein Spiel startet, dort sollte ganz oben stehen, dass man mich erst fragen sollte“
- 02.09.2026: „daher musst [du] übers Menü starten“

### Welche Instanz (seit 15.11.2026)

Es gibt zwei Spielordner, beide in **einer** Liste: `lib/instanzen.json` (Daniel 15.11.2026 14:18/14:54).

| Name | Ordner | Wofür |
|---|---|---|
| `team-liga` | `Stronghold Crusader Extreme Team-Liga` | SamurAI spielen und testen (Kreativmodus) – **Vorgabe** |
| `steam` | `Stronghold Crusader Extreme` | Steams eigener Ordner, bleibt unverändert |

Gewählt wird mit `SHC_INSTANZ=team-liga` bzw. `steam` (Nummern 2 und 1 gehen weiter). Die früheren Instanzen 3, 4 und 5 liegen
im Archiv `D:\SHC-Archiv6-11-15\`; ein Werkzeug, das sie nennt, bricht mit Hinweis ab. Später kommt je Spielmodus eine
Instanz dazu (Ascension, Vanilla, eigener Mod – Backlog B-198).

### Der Fragebogen

Daniels Vorgaben vom 15.11.2026 11:44 („ein paar Dinge würde ich voraussetzen, aber du kannst fragen, ob sie so
stimmen“). Die ersten zwei Zeilen sind seine Annahmen: bestätigen lassen, nicht still übernehmen.

| # | Frage | Daniels Annahme |
|---|---|---|
| 1 | Welches Spiel? | Stronghold Crusader mit dem UCP |
| 2 | Welcher Weg im Menü? | Kreuzzug → Eigenes Spiel → Normales Spiel, Standard |
| 3 | Wie viel Gold bekommt der Spieler? | – |
| 4 | Wie viel Gold bekommen die KIs? | – |
| 5 | Welche Karte? | – |
| 6 | Wer gegen wen? | – |
| 7 | Teams, und wenn ja welche? | – |
| 8 | Wo wird jeder aufgestellt (Startposition)? | – |
| 9 | Sonst noch etwas (Tempo, Instanz, Zuschauen)? | – |

### Die Freigabe (Fänger, keine Disziplin)

Nach Daniels Antwort schreibt die Sitzung seine Antwort im Wortlaut nach
`Selfaware-AI/data/research/partie_freigabe.json`:

```json
{"zeit": "15.11.2026 11:50", "daniel": "<sein Wortlaut>", "weg": "menue",
 "aufstellung": {"karte": "...", "gold_spieler": 0, "gold_ki": 0, "spieler": [], "teams": "...", "positionen": "..."},
 "verbraucht": false}
```

**Startsperre** (`Selfaware-AI/src/selfaware/execution/startsperre.py`, sitzt in `befehl.sende`): Ein Befehl mit
`eigenesGefecht` kommt nur durch, wenn die Freigabe Daniels Wortlaut trägt und er ausdrücklich den Befehlsweg erlaubt hat
(`"weg": "befehl"`). Jede Freigabe gilt für genau einen Start, danach steht sie auf `"verbraucht": true`. Ohne Freigabe
wird der Befehl verworfen, Meldung `STARTSPERRE: ...`. Test: `tests/test_startsperre.py` (Negativlauf rot, 15.11.2026).

### SamurAI ist eine eigene KI – nie ein Platzhalter

SamurAI hat ein eigenes KI-Paket mit Namen, Beschreibung, Profilbild und Burg (`Selfaware-AI/assets/ai/SamurAI`). UCP setzt es
über den KI-Tauscher auf den **Abt-Platz (KI 16)**: `ucp-config.yml` → `aiSwapper` → `abbot` → `SamurAI` (so in der Team-Liga-Instanz mit
`Selfaware-AI-0.2.0`, abgelesen 15.11.2026; die archivierten Instanzen 4 und 5 hatten 0.2.0 bzw. 0.1.0). Nennt Daniel SamurAI, kommt genau dieses Bild in
die Lobby. Steht es nicht in der KI-Auswahl, wird erst nachgesehen und gefragt – nie Rotkäppchen, Ratte oder Abt ohne sein Ja.
Fehler vom 15.11.2026 12:27: Partie 34 lief mit Rotkäppchen als Platzhalter, Daniel: „ich habe gesagt SamurAI, das hat sogar schon
eine Beschreibung und ein Profilbild“.

Startplätze nie aus eigener Deutung von „links unten“ setzen: das Bild der Kartenvorschau mit nummerierten Schildern zeigen und
Daniel die Nummern wählen lassen (Beispiel `Selfaware-AI/data/research/menueweg_20261115/schilder_nummeriert.png`).

## 1. Was über den Menüweg bekannt ist (Stand 15.11.2026)

| Aussage | Marke | Quelle |
|---|---|---|
| Klicken von außen geht nicht (Spiel läuft mit erhöhten Rechten, Fehler 5); der Weg führt über die Knopf-Handler des Spiels, die das Modul ruft | **gemessen** | `Menue-Handbuch.md`, Abschnitt 1 |
| Hauptmenü Knopf 2 „Kreuzzug“ führt zu Ansicht 55; `{"menue": 41}` führt von jeder Ansicht zurück ins Hauptmenü | **gemessen** | `Menue-Handbuch.md`, „Ebene 1 vollständig“ |
| Im Hauptmenü kommen Knöpfe nur als Liste an: `{"befehle": [{"id": n, "kreuzzug": 2}]}`; einzeln verwirft der Menü-Haken sie ohne Logzeile | **gemessen 15.11.2026** | `init.lua` Menü-Haken; Log „KREUZZUG: Knopf 2, ok=true“ erst als Liste |
| Kreuzzug-Knopf 2 öffnet „Eigenes Gefecht“ (Lobby); voreingestellt: Normales Spiel, Gold 0 · 150 | **gemessen 15.11.2026** | Bild `Selfaware-AI/data/research/menueweg_20261115/1_eigenes_gefecht.png`; Bedeutung der Nummern: `funktionswissen/eingang/rest_060.txt` |
| Kartenliste der Lobby im Speicher: Eintrag n (0 = oben) = Namensnummer k bei `0x01126E28 + 4n`, Name bei `0x11BFCF8 + k × 0x3E9` (dieselbe Liste wie im Lade-Dialog). Die Zählstelle `0x0112661C` steht in der Lobby auf 0 – bis zum ersten leeren Namen lesen | **gemessen 15.11.2026** | `menueweg_20261115/kartenliste.txt`: „Liga_Battle Brother_s Strife“ = Eintrag 46 |
| Karte wählen: `{"knopf": "LobbyMenu_MapSelectScrollbar", "nr": 0, "art": 3, "wert": R}` setzt den Rollstand R (wie Balken ziehen, Modul gibt Zeiger auf drei Zahlen), dann `{"knopf": "LobbyMenu_MapSelectTable", "nr": n − R}` (Zeile 0 = oberste sichtbare) | **gemessen 15.11.2026** | Bild `menueweg_20261115/2_karte.png`: „Liga_Battle Brother_s Strife – Ausgeglichen“ markiert |
| Gegner hinzufügen: `LobbyMenu_PlayerListAndNpcButtons` Nr −101 öffnet die KI-Auswahl, `AiLordSelect_Main` Nr n setzt die n-te KI in den nächsten freien Platz | **abgelesen, nicht gemessen** | `rest_047.txt`, `rest_019.txt` |
| Startposition: Startknopf-Handler Nr −201 nimmt die Mausposition über einem Schild der Kartenvorschau (`keepPositions`) | **abgelesen, nicht gemessen** | `rest_047.txt` |
| Starten: `{"knopf": "LobbyMenu_LobbyscreenStartButtonClick", "nr": 4}` – nur mit Freigabe (Startsperre, `"weg": "menue"`) | **abgelesen, nicht gemessen** | `rest_047.txt` case 4 „start game“ → `LaunchSkirmishGame` |
| `eigenesGefecht` ist **kein** Menüweg: Platz 1 immer ein Mensch, daneben N KIs desselben Typs, Startpositionen zufällig | **abgelesen** | `Wissensstand.md` (Tabelle „Erstes eigenes Spiel per Befehl“) |

## 2. SamurAI im Menü wählbar, spielt ohne Sitzung

Daniels Ziel (11:31/11:33): Er startet selbst eine Partie, wählt SamurAI als KI, und sie spielt ohne Claude. Später auch
als UCP-Erweiterung hochladbar.

Stand laut Gedächtnis vom 26.10.2026, **ungeprüft übernommen**: Daniels App „Selfaware AI (lokal)“ auf Instanz 5 hat
eine Wache, die jede Menü-Partie erkennt und den Platz mit KI 16 (Abt) mit SamurAI übernimmt – aus einer eingefrorenen
Kopie. Lücken: kein eigenes Bild in der KI-Auswahl, keine hochladbare UCP-Erweiterung, neue Arbeit erst nach Übernahme in
die Kopie. Bisher daran gearbeitet: Sitzungen „KIL – Zeitreisender statt Bauer“ und „SAI: Waffenkette“.

## 3. Ablauf, der am 15.11.2026 funktioniert hat (Partie 34, Instanz 2)

1. SamurAI-Paket eingebunden: Plugin `ucp/plugins/Selfaware-AI-0.2.0` (Inhalt aus `Selfaware-AI/assets/ai/SamurAI`),
   `ucp-config.yml` → `aiSwapper` → `abbot` → SamurAI (lines, portrait, aiv), Plugin in beiden Ladereihenfolgen; Sicherung
   `ucp-config.yml.vor-samurai-20261115_1231`. Log: „enabling extension: Selfaware-AI“, keine Warnung zu SamurAI. **gemessen**
2. Lobby: `kreuzzug 2` → (eigener Befehl, sonst zu früh) Karte → `PlayerListAndNpcButtons −101` → `AiLordSelect_Main 8`
   (Kriegsfürst) → wieder −101 → `AiLordSelect_Main 16` (SamurAI, Roboterbild) → `100` schließt. **gemessen**
3. Startplätze: Maus auf das Schild legen (`poke 0xF2C9C0/0xF2C9C4`), `LobbyscreenStartButtonClick −200` (aufnehmen), Maus auf
   das Zielschild, `−201` (ablegen = tauschen). Trefferfeld: x = Schild.x + Rand + 572…595, y = Schild.y + Rand + 3…35; Schilder bei
   `0x1FE9A5C + 8·i`, Rand `0xF98358`/`0xF9835C`, Belegung `0x01A275D0` (Schild → Spieler). **gemessen**
4. **Wache VOR dem Start** (`SHC_PARTNER=ja`, Platz 16 = SamurAI): sie hält bei Takt 1 an, schaltet die KI von Platz 16 aus und
   startet den Lenker (`uebernehmen=ja`). Ohne vorher laufende Wache spielte der Abt ~1.000 Takte selbst. **gemessen**
5. Start: `LobbyscreenStartButtonClick 4` (nur mit Freigabe), dann `{"tempo": 100}`.

**GELÖST 15.11.2026 13:05 – so wie es auf Instanz 5 lief:** Instanz 2 (heute `team-liga`) lädt statt `villagestudio` das Modul
`selfaware-runtime` (Kopie von Instanz 5, nur `logik.lua` = aktuelle `logik_stand_20261115.lua`; Sicherung der Einstellungen
`ucp-config.yml.vor-runtime-20261115_*`). Es bringt `command_owner.lua` (SamurAIs Befehle gehören vor der Sortierung dem richtigen
Spieler – ohne das nahm das Spiel sie an und tat nichts), `takeover.lua` (Abt-Platzhalter vor Takt 0 aus) und `starttroops.lua`
(Vorgabe 4 Assassinen + 6 arab. Bogen statt Mönche; in der Team-Liga-Instanz per `ucp-config.yml` auf **5 Bogenschützen +
7 Speerträger** gestellt, Daniel 15.11.2026). Gemessen Partie 34: 16 von 20 ersten Bauten stehen bei Takt 234, Spieler 2 hat 4+1
Assassinen und 6 arab. Bogen. Python liest Antwortzeilen jetzt unter beiden Modulnamen (`befehl.MODUL_NAMEN`).
Ablauf seitdem: Lobby wie oben, `tickpause bei 1` + Start als eine Liste, Lenker `uebernehmen=ja` für Spieler 2 starten, dann frei.

~~**OFFEN (15.11.2026 12:58, Blocker):** In der Lobby-Partie nimmt das Spiel SamurAIs Baubefehle an („abgesetzt“), führt sie aber
nicht aus – Holz blieb 150 (Probe: 1 Holzfäller für Spieler 2 bei (140,285), Takt 5845). Ursache nicht gemessen. Vermutung,
ungeprüft: Im Lobby-Spiel ist der Mensch kein Spieler („Geist“), und die Absender-Umschaltung reicht dort nicht.~~

