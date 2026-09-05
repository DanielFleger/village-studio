# Village Studio und AI-Toolkit zusammenführen

Stand 05.09.2026, am Quelltext beider Werkzeuge gelesen. Daniel ist
Mitarbeiter in Schlossgespensts Repo, die Werkzeuge sollen eins werden.
Der Überblick über das Toolkit steht in `AI-Toolkit-Ueberblick.md`; hier
geht es nur um die Frage, **wie** man zusammenführt.

## Der eine Unterschied, der alles erklärt

Beide Werkzeuge lesen dieselbe Datei, aber sie halten sie völlig
verschieden im Kopf.

**Das Toolkit denkt in Bauschritten und Gegenständen:**

```js
{ pauseDelayAmount: 100,
  frames: [ { itemType: 61, tilePositionOfsets: [4950], shouldPause: false }, … ],
  miscItems: [] }
```

Ein Bergfried ist **ein Ding** mit einem Typ und einer Position. Deshalb
kann das Toolkit ihn auswählen, verschieben, kopieren, löschen und in einen
anderen Bauschritt schieben — das sind alles Operationen auf einem Objekt.

**Village Studio denkt in Feldern:**

```js
{ bauten: Uint16Array(10000), gruppen: …, mauern: …, schritte: … }
```

Vier Zahlen je Feld, genau wie die Datei sie speichert. Das ist ideal zum
Anzeigen und Prüfen — und der Grund, warum Verschieben, Kopieren und
Umsortieren bei uns fehlen: Ein Gebäude ist bei uns keine Sache, sondern
eine Ansammlung gleicher Zahlen, die man erst wieder zusammensuchen muss.

**Daraus folgt die ganze Arbeitsteilung.** Sein Modell ist das bessere
Fundament zum *Bearbeiten*, unseres das bessere zum *Anzeigen und Prüfen*.

## Was jeder mitbringt

| | AI-Toolkit | Village Studio |
|---|---|---|
| Bearbeiten | Einzeln, Pinsel, **Linie mit Hindernis-Umfließung**, Auswahl mit Rahmen, **Verschieben**, **Kopieren**, Löschen, Rückgängig/Wiederholen, frei belegbare Tastenkürzel | Malen, Radieren, Pipette, Pinselgröße, Rückgängig |
| Bauschritte | Liste, Schieberegler, Schritte einfügen und verschieben, Pause je Schritt | anzeigen und beim Malen mitschreiben |
| Regeln | `maxAmount` je Bau, Überlappungsregeln, Verträglichkeits-Anzeige beim Setzen | Umriss-Prüfung nach dem Laden |
| Vorlagen | **Blueprint**: eine Auswahl als Pause speichern und woanders einsetzen | Hintergrundbild aus `.map` oder eigener Datei |
| Ansicht | senkrecht, beschriftete Farbkacheln, eigene PNG je Bau | senkrecht **und schräg**, echte `.gm1`-Grafiken, vier Darstellungen |
| Einheiten | platzieren, nummerieren, Marker zeichnen | gar nicht |
| Wirtschaft | Bevölkerungsrechner (Farmen, Minen, Steinbrüche, Ochsen, „Arbeiter übrig") | Kostentabelle in `lib/kosten.json`, nicht in der Oberfläche |
| Charakter (`.aic`) | vollständiger Editor samt Porträts, Sprache, Videos | gar nicht |
| UCP | Bibliothek: installieren, klonen, Versionen vergleichen, `mapping.json` | direkt in ein Ziel speichern |
| Format | `parseAiv`/`encodeAiv`, `node-pkware` für die Packung | eigener Packer und Entpacker (`blast.js`, `implode.js`), ohne Fremdpaket |
| Hülle | Electron-Anwendung | lokaler Server, läuft im Browser |
| Prüfung | 19 Testdateien, `npm run check` | Rundlauf über alle AIV-Dateien |

## Drei Wege

**A — Village Studio wird die Ansicht im Toolkit.** Wir liefern die schräge
Ansicht mit echten Spielgrafiken als Teil seiner Anwendung; er behält die
Bearbeitung. Schnellster sichtbarer Gewinn, kleinster Eingriff. Nachteil:
Zwei Programme bleiben zwei Programme, und unsere Doku und Werkzeuge stehen
daneben.

**B — Die Werkzeuge des Toolkits nach Village Studio holen.** Wir übernehmen
sein Bauschritt-Modell und bauen Verschieben, Kopieren, Linie darauf. Größter
Aufwand, und es hieße, seine Arbeit von zwei Monaten nachzubauen.

**C — Ein gemeinsamer Kern, zwei Oberflächen.** Ein Paket, das beide
benutzen: AIV lesen und schreiben, das Bauschritt-Modell, die Gebäudetabelle.
Darüber bleiben seine Electron-App und unser Browser-Werkzeug, jedes mit
seinen Stärken. Das ist die saubere Lösung und der übliche Weg, wenn zwei
Werkzeuge dieselben Daten anfassen.

**Empfehlung: C als Ziel, A als erster Schritt.** Der gemeinsame Kern ist
das, was auf Dauer trägt; die schräge Ansicht in seinem Toolkit ist das, was
man in einer Woche vorzeigen kann.

## Was zuerst — und ohne Lizenzfrage

Sein Repo hat **keine Lizenzdatei**. Bis das geklärt ist, wandert besser kein
Quelltext. Diese drei Schritte gehen trotzdem sofort:

**1. Die Gebäudetabelle zusammenführen.** Seine `config/aiv_constants.json`
(91 Einträge mit `maxAmount` und Überlappungsregel) und unsere
`lib/gebaeude.json` (deutsche Namen, drei Nummernsätze, Größen)
beschreiben dieselben Dinge. 63 stimmen bereits überein. Eine gemeinsame
Datei, beide lesen sie. Das ist Wissen, kein Code.

**2. Seine `aiv_templates.json` bei uns nutzen.** Sie enthält für 68 Gebäude
die fertigen Vorlagen der Abschnitte 2004, 2005 und 2007 — damit ist unsere
offene Frage zur Lage im Bauwerk beantwortet und die Vorplätze stehen in
Zahlen. Umgekehrt hat er unsere Messungen an 163 Dateien nicht.

**3. Die Lizenz ansprechen.** Ein Satz an Schlossgespenst: unter welche
Lizenz soll das gemeinsame Werkzeug? Village Studio steht unter MIT.

Danach die eigentliche Entscheidung: welche Hülle das gemeinsame Werkzeug
bekommt — seine Electron-App oder unser Browser-Werkzeug. Das ist keine
technische Frage, sondern eine des Geschmacks und der Verteilung: Eine
Electron-App lädt man herunter und startet sie; ein Browser-Werkzeug
braucht Node, läuft dafür überall und lässt sich aus der Ferne ansehen.
