# Menü-Handbuch: durch Stronghold Crusader navigieren, ohne zu klicken

**Stand: 02.09.2026.** Entstanden beim systematischen Durchgehen des Menüs.

Klicken ist unmöglich — der Spielprozess läuft auf hoher Rechtestufe, jede
Eingabe von außen scheitert mit Fehler 5. Der Weg führt über die **Knopf-Handler
des Spiels selbst**: dieselben Funktionen, die das Spiel beim Anklicken aufruft.
Das Modul läuft im Spielprozess und darf sie rufen.

---

## Die drei Regeln, ohne die nichts ankommt

**1. Jeder Befehl geht als Liste raus.** Der Menü-Haken des Moduls prüft auf
einzelne Befehlsnamen; bei `{"befehle": [...]}` greift die Prüfung immer.
Einzelne unbekannte Befehle werden **schweigend verworfen**, ohne eine Zeile
im Log.

```json
{ "befehle": [ { "id": 4711, "hauptmenue": 8 } ] }
```

**2. Zwei Befehle brauchen einen Auftrag.** Der Poll liest die Befehlsdatei nur
alle 20 gezeichneten Bilder, also etwa alle 0,3 Sekunden. Wer zwei Befehle
kurz nacheinander schreibt, löscht den ersten ungelesen. Beides gehört in
dieselbe Liste.

**3. Die Ansichtsnummer sagt nichts über Dialoge.** `currentMenuViewType`
(`0x01FE7D1C`) bleibt bei 41, egal ob das Hauptmenü, die Spieloptionen, der
Laden-Dialog oder die Soundoptionen offen sind. **Modale Dialoge ändern sie
nicht.** Wer wissen will, wo er steht, muss ein Bild machen.

---

## Ebene 1: Hauptmenü

`MenuItemActionHandler_MainMenu_Main` — `0x004251A0`, cdecl, ein Argument.
Befehl: `{"hauptmenue": N}`

| N | Knopf | Führt zu | Marke |
|---|---|---|---|
| 1 | Historische Kampagnen | Ansicht 42 | abgelesen |
| 2 | Kreuzzug | Ansicht 55 | abgelesen |
| 3 | Burgenbau | Ansicht 35 | abgelesen |
| 4 | Mehrspieler | Netzwerk-Dialog | abgelesen |
| 5 | **Beenden (Tor)** | Ja/Nein-Dialog | **gemessen** |
| 6 | Tutorial (Buch) | Mission 30, Baumodus | abgelesen |
| 7 | Abspann | Ansicht 45 | abgelesen |
| 8 | **Einstellungen (Schlüssel)** | Spieloptionen-Dialog | **gemessen** |
| 9 | Eigene Szenarien | Ansicht 44 | abgelesen |

---

## Ebene 2: Ja/Nein-Dialog

`MenuItemActionHandler_General_LaunchOrQuitMultiplayerGameUnk` — `0x00494950`,
cdecl. Befehl: `{"dialogJa": true}` / `{"dialogJa": false}`

**Die Falle:** Das Argument ist **nicht der Zweck**, sondern **welcher Knopf**
gedrückt wurde — **22 = Ja, 23 = Nein**. Den Zweck holt sich die Funktion aus
`DAT_MenuOptionsActionParameter`, wo ihn der öffnende Knopf hinterlegt hat
(das Tor legt dort die 9 ab).

Mit dem Zweck als Argument gerufen läuft die Funktion **sauber durch und meldet
Erfolg** — und tut nichts. Gemessen: Das Schließ-Flag stand danach weiter auf 0.
*Ein Aufruf, der zurückkehrt, hat nichts bewiesen.*

| Weg zum Beenden | Zeit bis der Prozess weg ist | Art |
|---|---|---|
| Tor (5) → Ja (22) | **0,36 s** | sauber, das Spiel räumt auf |
| `ExitProcess` direkt | **0,24 s** | Abbruch, Log bricht mitten ab |

**Nein (23) führt zuverlässig zurück** ins Hauptmenü — gemessen.

---

## Ebene 2: Spieloptionen (der Schlüssel)

`MenuItemActionHandler_OptionsMenu_Buttons` — `0x00496B80`, cdecl.
Befehl: `{"optionen": N}`

| N | Eintrag | Marke |
|---|---|---|
| 2 | **Laden** | **gemessen** |
| 3 | Speichern | abgelesen — im Hauptmenü **wirkungslos**, es gibt nichts zu speichern |
| 7 | Mission verlassen | abgelesen |
| 9 | Crusader verlassen | abgelesen |
| 10 | Spiel fortsetzen | abgelesen |
| 26 | Hilfe | abgelesen |
| 39 | Briefing | abgelesen |
| 44 | Mission neu starten | abgelesen |

Die Nummern **1, 4, 5, 6, 8** sind hier wirkungslos — durchprobiert, keine
Bildänderung. Die sichtbaren Untereinträge laufen über einen **anderen** Handler.

---

## Ebene 3: Untereinträge der Spieloptionen

`MenuItemActionHandler_OptionsMenu_SubOptionsButtons` — `0x00493BD0`, cdecl.
Befehl: `{"unteropt": N}`

| N | Führt zu | Marke |
|---|---|---|
| 4 | **Grafikoptionen** (Auflösung, Scrolltempo) | **gemessen** |
| 5 | **Soundoptionen** (Musik, SFX, Sprache) | **gemessen** |
| 6 | Netzwerkoptionen — **toter Zweig**, hat gar keinen Knopf | **gemessen** |
| 17 | **Zurück** (schließt den Dialog) | **gemessen** |
| 25 | **Spieloptionen** (Tempo, Sprechblasenhilfe) | **gemessen** |
| 45 | **Identität** (Spielername) | **gemessen** |
| 1–3, 7–9 | keine Wirkung | gemessen |

Damit ist dieser Zweig vollständig. Die Knopfnummer ist zugleich der
Textindex für die Beschriftung — die Texte selbst liegen aber nicht in der
exe, sondern in den Sprachdateien.

### Die Elementtabellen

Welche Knöpfe wirklich sichtbar sind, steht in zwei Tabellen (je 80 Byte pro
Eintrag mit Lage und Nummer):

| Tabelle | Adresse | enthält |
|---|---|---|
| Hauptmenü | `0x006006D8` | 25, 4, 5, 45, 17 |
| Pause-Menü im Spiel | `0x006004F8` | 25, 4, 5, 17 |

Der Unterschied erklärt den toten Zweig: **6 (Netzwerkoptionen) und 45
(Identität im Spiel) kommen in keiner Tabelle vor** — der Code kann sie, das
Menü zeigt sie nicht.

### Grafikoptionen im Einzelnen

`MenuItemActionHandler_VideoOptions_Main` — `0x00493E20`, cdecl.

| N | Wirkung |
|---|---|
| 11 | Auflösung weiterschalten |
| 16 | Scrolltempo weiterschalten |
| 18 | **OK** — übernimmt und baut die Anzeige neu auf |
| 17 | Abbrechen |
| −10 / −20 | Mauszeiger-Art 2 bzw. 1 |

---

## Ebene 3: Laden-Dialog

`MenuItemActionHandler_SaveLoadMap_Buttons` — `0x004943B0`, cdecl.
Befehl: `{"laden": N}`

| N | Knopf | Marke |
|---|---|---|
| 2 | **Laden** (lädt den markierten Eintrag) | **gemessen** |
| 3 | Speichern | abgelesen |
| 17 | **Zurück** (führt in die Spieloptionen) | **gemessen** |

Beim Öffnen ist der **oberste** Eintrag markiert, also der neueste Spielstand.

### Einen bestimmten Spielstand laden — gemessen

| Adresse | Bedeutung |
|---|---|
| `0x01126624` | markierte Zeile, relativ zum sichtbaren Fenster (0…15) |
| `0x01126628` | erste sichtbare Zeile (Scrollstand) |

Rezept für die absolute Zeile *n* (0-basiert, in der aktuellen Sortierung):
Scrollstand auf `n / 16 * 16`, markierte Zeile auf `n − Scrollstand`, dann
Knopf 2. **Alles in einem Auftrag**, sonst greift der Poll dazwischen.

```json
{ "befehle": [
  { "id": 1, "poke": 17983016, "wert": 0 },
  { "id": 2, "poke": 17983012, "wert": 2 },
  { "id": 3, "laden": 2 },
  { "id": 4, "pause": true } ] }
```

**Belegt am 02.09.2026:** Zeile 0 lud `Wallrest 4` mit 40 524 Ticks, Zeile 2
lud `Wallrest 1` mit 31 500 Ticks. Zwei verschiedene Stände, derselbe Weg.

**Die Falle dabei:** Das **Bild zeigt weiterhin den alten Eintrag markiert**.
Die sichtbare Hervorhebung und der beim Laden verwendete Index sind zwei
verschiedene Dinge. Wer sich aufs Bild verlässt, hält das Rezept für
gescheitert — entschieden hat es die Spielzeit danach.

**Immer sofort pausieren.** Ein geladener Stand läuft weiter; `Wallrest 4`
stand binnen Sekunden auf Ansicht 30 (*verloren*).

---

## Der schnellste Weg von Null in ein laufendes Spiel

Rund **neun Sekunden**, ohne einen Klick:

| Schritt | Aufruf | Zeit |
|---|---|---|
| Starten bis Hauptmenü | `bis_menue.py` | 5,2 s |
| Schlüssel | `{"hauptmenue": 8}` | 1,2 s |
| Laden | `{"optionen": 2}` | 1,2 s |
| Laden bestätigen | `{"laden": 2}` | 1,5 s |

**Die Abkürzung, die 26 Sekunden spart:** Nach dem Start direkt
`{"menue": 41}` schicken. Das überspringt Logos (Ansicht 3) und Vorspann
(Ansicht 48), die sonst ungefragt ablaufen.

---

## Gefahren und Fallen

**Ein Spielstand läuft weiter.** Nach dem Laden von `Wallrest 4` stand das
Spiel wenig später auf Ansicht 30 — *verloren*. Wer einen Stand als feste
Ausgangslage für Tests nutzt, muss **sofort pausieren**
(`{"pause": true}`), sonst misst er bei jedem Durchgang etwas anderes.

**Ein Bild direkt nach einem Knopfdruck kommt zu früh.** Der Dialog wird erst
im nächsten gezeichneten Bild aufgebaut. Nach dem Tor-Knopf zeigte das erste
Bild noch das unveränderte Hauptmenü; erst das zweite zeigte die Rückfrage.
Faustregel: eine Sekunde Abstand.

**Bildvergleich braucht die richtige Grundlage.** Zwei Dialoge dieses Spiels
unterscheiden sich oft nur um gut ein Prozent der Bildpunkte, weil der Rahmen
gleich bleibt. Eine Schwelle von 1 % hätte die Soundoptionen (1,38 %) fast
als „keine Wirkung" durchgehen lassen. Gegen das **richtige** Vorbild
vergleichen und die Schwelle niedrig setzen.
