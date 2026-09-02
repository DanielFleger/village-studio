# Übergabe 02.09.2026 — Stand nach der Steuerungs-Sitzung

**Zuerst lesen:** `doku/Menue-Handbuch.md` (Navigation ohne Maus) und
`doku/Wissensstand.md`, Abschnitt „Einheitentyp umschreiben".

---

## Was jetzt geht — alles gemessen, nichts vermutet

| Fähigkeit | Befehl / Werkzeug | Zeit |
|---|---|---|
| Spiel starten, im Hintergrund | `werkzeug/start_hinten.ps1` | 3,6 s |
| Spiel beenden | `{"beenden": true}` oder `shc.py stop` | 0,4 s |
| Start bis Hauptmenü mit Bild | `werkzeug/bis_menue.py` | 5,2 s |
| Jeden Menüknopf drücken | `{"hauptmenue": N}`, `{"optionen": N}`, `{"unteropt": N}`, `{"laden": N}`, `{"dialogJa": true}` | je 1,2 s |
| Bestimmten Spielstand laden | zwei `poke` + `{"laden": 2}` | 1,5 s |
| Bild aus dem Speicher | `{"bild": "karte", "aus": [x,y,b,h]}` | 0,4–1,0 s |
| Kamera auf eine Kartenstelle | `{"kamera": [x, y]}` | sofort |
| Einheiten **sichtbar** umwandeln | `{"wandle": {"von": 72, "nach": 27}}` | sofort |
| Ereignis-Regeln | `{"regel": {"wenn": {...}, "dann": [...]}}` | je Takt |

---

## Die vier Fallen, die diese Sitzung gekostet haben

**1. `exposeCode` kennt drei Aufrufarten — 2 ist stdcall.**
Alle Windows-Funktionen brauchen die 2. Mit 0 (cdecl) stirbt der Prozess
lautlos, weil zweimal aufgeräumt wird. Das hat zwei Abstürze und zwei falsche
Verdächtige gekostet (erst die Fensterposition, dann die Rechtestufe).
*Stirbt ein Aufruf ohne Meldung, ist die Aufrufart der erste Verdächtige.*

**2. Ein Befehl, der nicht in der Durchreiche-Liste steht, wird schweigend
verworfen.** Kein Log, keine Fehlermeldung. Deshalb: **immer als Liste
schicken** — `{"befehle": [...]}` wird immer durchgereicht.

**3. Zwei Befehle kurz nacheinander löschen einander.** Der Poll liest die
Datei nur alle 20 Bilder. Beides gehört in **denselben** Auftrag.

**4. Das Laden eines Spielstands hebt die Pause auf.** Pausieren muss als
eigener Befehl **danach** kommen, und das Flag (`0x01FEA054`) will geprüft
werden.

---

## Der wichtigste inhaltliche Fund

**Die Figur einer Einheit hängt an `spriteID` (+0x0C), nicht an `unitType`.**

Das Spiel schlägt den Grafiksatz nur zweimal nach — beim Erzeugen und beim
Umwandeln (`setUnitValues`, 0x0053B8E0, Tabelle `DAT_SPRITE_ID` bei
0x00B4E0A0). Danach steht die Figur im Feld.

| Weg | Verhalten | Figur |
|---|---|---|
| `unitType` (+0x8E) direkt schreiben | ändert sich **sofort** | bleibt **unverändert** |
| Umwandlungs-Pfad (`wandle`) | ändert sich | **ändert sich** |

Der Umwandlungs-Pfad stößt drei Felder an und überlässt dem Spiel den Rest:
`+0x2CC state_2 = 0`, `+0x2CA unitTypeToChangeInto = Ziel`,
`+0x8C logicalState = 4`. `unitType` dabei **nicht** anfassen.

**Belegt:** 258 Einheiten in einem Durchlauf umgewandelt, im Bild sichtbar,
Wirtschaft reagiert (Betriebe stehen leer und rekrutieren nach).

---

## Was offen ist

**Die Kachelgeometrie.** `x = kachel % 400` ist **falsch**. Gemessen an einer
Gruppe, die im Bild nebeneinandersteht: Abstand 2 innerhalb einer Reihe, rund
215 zwischen den Reihen. Solange das ungeklärt ist, mit **rohen
Kachelnummern** arbeiten — jede Bereichssuche über x/y liefert Unsinn.

**Gefecht mit bestimmten Gegnern.** `currentAIArray = aiType − 1` (aus dem
Code gelesen, nicht gemessen). Der bisherige Gefechtsstart setzt für alle
Plätze dieselbe KI; Teams und Kartenwahl sind noch nicht erprobt.

**Noch nicht angefasst:** Grundriss (`{"grundriss": true}`) und Kartendrehung
(`{"drehen": 0/2/4/6}`) sind eingebaut, aber ungetestet. Ebenso das
Speichern eines Spielstands ohne Klick.

**Ein Testaufbau für Bildbeweise fehlt.** Verstreute Einheiten taugen nicht:
Ein Differenzbild misst dann vor allem Bäume im Wind. Besser wäre eine dichte
Gruppe auf freiem Feld.

---

## Methodisches, das sich bewährt hat

**Der Zahlenweg schlägt den Bildweg.** Der Einheitenbericht zeigt eine
Änderung sofort und exakt; ein Bild braucht ein laufendes Spiel, die richtige
Kamera und eine Stelle ohne Vegetation.

**Ein Aufruf, der zurückkehrt, hat nichts bewiesen.** Der Ja-Knopf des
Beenden-Dialogs meldete `ok=true` und tat nichts — weil das Argument nicht
der Zweck ist, sondern welcher Knopf gedrückt wurde.

**Drei saubere Durchgänge, sonst zählt es nicht.** Findet man dabei einen
Fehler, beginnt die Zählung neu. Das hat zweimal einen Fehler gefangen, der
sonst durchgerutscht wäre — die fehlende Fokus-Rückgabe und den
Kodierungsfehler in der Prozessabfrage.
