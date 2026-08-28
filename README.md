# Village Studio

Ein eigener AIV-Editor fuer Stronghold Crusader - Ersatz fuer `village.exe`
von Lord Reza (Stronghold-Engine von 2001).

Node ohne Fremdpakete, Oberflaeche als HTML/Canvas. Kein Bauschritt noetig:
`start.cmd` startet den Server auf http://localhost:8790 und oeffnet den Browser.

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
