# Village Studio

Ein eigener AIV-Editor fuer Stronghold Crusader - Ersatz fuer `village.exe`
von Lord Reza (Stronghold-Engine von 2001).

Node ohne Fremdpakete, Oberflaeche als HTML/Canvas. Kein Bauschritt noetig:
`start.cmd` startet den Server auf http://localhost:8790 und oeffnet den Browser.

## Loslegen

1. **Node.js** installieren (LTS von [nodejs.org](https://nodejs.org) — sonst nichts,
   das Werkzeug benutzt kein einziges Fremdpaket).
2. Dieses Verzeichnis herunterladen: gruener Knopf *Code → Download ZIP*, oder
   `git clone https://github.com/DanielFleger/village-studio`.
3. **`start.cmd`** doppelklicken. Der Server laeuft auf
   <http://localhost:8790>, der Browser geht von selbst auf.
   Unter Linux/Mac stattdessen `node server.js`.

Zwei Dinge holt sich das Werkzeug von aussen:

**Die AIV-Dateien.** Gesucht wird an diesen Orten:

| Ort | gedacht fuer |
|---|---|
| `..\Village\villages`, `..\Village\aiv`, `..\Village` | neben dem alten Editor von Lord Reza |
| `aiv\` **in diesem Ordner** | der einfachste Weg: eigene .aiv einfach hier hineinlegen |
| `<Stronghold>\aiv` | die mitgelieferten KI-Doerfer des Spiels |

**Die Spielgrafiken.** Fuer die schraege Ansicht liest das Werkzeug die
`.gm1`-Dateien der Installation — nur lesend, es wird nichts veraendert.
Gesucht wird unter
`C:\Program Files (x86)\Steam\steamapps\common\Stronghold Crusader Extreme`.
Liegt das Spiel woanders, eine Datei `config.json` daneben legen:

```json
{ "stronghold": "D:\Spiele\Stronghold Crusader Extreme" }
```

Ohne Spielordner laeuft alles ausser den Spielgrafiken; die Rasteransicht
und das Bearbeiten funktionieren.

## Was drin ist

| Datei | Zweck |
|---|---|
| `server.js` | kleiner lokaler Server, liest und schreibt AIV-Dateien |
| `lib/aiv.js` | AIV lesen: 2036 Byte Verzeichnis, dann 14 Abschnitte |
| `lib/blast.js` | PKWare-DCL-Entpacker (Portierung von Mark Adlers `blast.c`) |
| `lib/implode.js` | der passende Packer - Gegenstueck zu `blast.js` |
| `lib/aivwrite.js` | AIV zurueckschreiben, unveraenderte Abschnitte byteweise |
| `lib/gebaeude.json` | Bau-Nummer -> Name, Groesse, Gebaeudeart |
| `web/` | Oberflaeche |

## Pruefen, ohne etwas anzufassen

Alle drei Skripte arbeiten nur lesend bzw. im Arbeitsspeicher:

```
node _pruefe_schreiben.js     # Rundlauf ueber alle gefundenen AIV-Dateien
node _pruefe_gebaeude.js      # Namenstabelle gegen die echten Dateien
node _untersuche_nummer.js 93 # eine Bau-Nummer im Detail ansehen
```

## Was wir wissen

`doku/Wissensstand.md` ist das Woerterbuch: alle Erkenntnisse ueber das
AIV-System an einer Stelle, jede mit Beleglage - belegt, gemessen, abgelesen,
vermutet oder widerlegt. Wer hier etwas nachschlaegt, sieht sofort, ob er sich
darauf verlassen kann. Die widerlegten Annahmen stehen mit drin, damit
dieselben Irrtuemer nicht wiederkommen.

Daneben:

| Datei | Inhalt |
|---|---|
| `doku/AIV-im-Speicher.md` | Bauliste im laufenden Spiel, Adressen und Aufbau |
| `doku/Abreissen.md` | Gebaeude, Mauern und einzelne Bauschritte abreissen |
| `doku/AIV-tauschen.md` | einer laufenden KI einen anderen Bauplan geben |
| `doku/ghidra/` | die Skripte, mit denen das alles herausfaellt |

## Zwei Dinge, die man wissen muss

**Die Gepackt-Kennung ist nicht optional.** In allen 129 Originaldateien auf
dem Entwicklungsrechner - davon 111 aus dem Spiel selbst - sind die Abschnitte
2004, 2005, 2007, 2008 und 2013 gepackt und alle uebrigen roh. Kein einziges
Gegenbeispiel. Es gibt keinen Beleg, dass das Spiel diese Abschnitte auch roh
liest, also werden sie nie roh zurueckgeschrieben.

**Die Bau-Nummern sind ein eigener Satz.** Weder die Reihenfolge der
Balance-Tabellen noch `sourcehold/data/shc.py` passen. Die richtige Liste ist
`BUILDING_TYPE_AIV_FILES_KV` aus `sourcehold/tool/convert/aiv/info.py`;
sie ist hier gegen die gemessenen Grundflaechen aller Dateien geprueft.
