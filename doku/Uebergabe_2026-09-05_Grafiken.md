# Übergabe 05.09.2026 — Spielgrafiken im Village Studio

Für die nächste SVS-Sitzung. Wer hier anfängt, liest zuerst `Wissensstand.md`
Abschnitt **1c** (das Bildformat) und dann diese Seite.

*Stand 05.09.2026 vormittags. Die Fassung von heute Nacht steht im Verlauf des
Repos; was dort als „nächster Handgriff" stand, ist erledigt.*

---

## Wo das Vorhaben steht

| Stück | Stand |
|---|---|
| `.gm1` lesen (Kopf, Farbtafeln, TGX) | fertig, alle 199 Dateien |
| Ganze Gebäude zusammensetzen | fertig, `lib/gm1.js` → `ganzesGebaeude` |
| Ganzes Dorf zeichnen | fertig, `_baue_beispieldorf.js <Dorfname>` |
| Einzelbilder mit Nummer im Dateinamen | fertig, `_baue_einzelbilder.js` |
| **Zuordnung Nummer → Bild** | **74 von 82; Daniel hat alle 74 selbst durchgesehen** |
| **Grafiken in der Oberfläche** | **fertig — die schräge Ansicht zeichnet das Spiel** |
| Prüfseite im Werkzeug | fertig, `localhost:8790/pruefen.html` |
| Darstellung flach / Grundriss | fertig |
| Drehen der Torhäuser (Taste R) | fertig |
| Einstellungen überleben das Neuladen | fertig |

Was noch fehlt, fehlt **in den Spieldateien**, nicht in der Arbeit: für acht
Nummern gibt es in keiner der zwanzig Gebäude-Dateien ein Bild.

---

## Was Daniels Durchgang ergeben hat (05.09.2026)

Er hat alle 74 Nummern beurteilt: **52 passt, 13 richtig aber unvollständig,
9 widerlegt.** Zwölf Bilder hat er selbst umgehängt. Sein Urteil steht in
`lib/zuordnung_urteil.json` und wird vom Generator gelesen, nicht abgetippt.

**Die 13 unvollständigen haben ein Muster.** Es fehlt entweder das Bewegtbild
(Mühlenflügel, Tanzbär, Kinder am Maibaum) oder der **Außenbereich**
(Pennerhof am Bergfried, Trainingslager an Kaserne und Söldnerposten,
Versammlungsplatz an Ölbrennerei und den Gilden). Für die Bewegtbilder ist die
Quelle gefunden: 45 Dateien `anim_<gebäude>.gm1`. Für die Außenbereiche nicht —
aber Daniels Grundriss-Bilder aus dem Spiel zeigen, dass sie **zur Grundfläche
des Gebäudes gehören**: der Bauplan des Bergfrieds schließt die Feuerstelle
und die Treppe mit ein. Sie sind also kein eigenes Bauwerk, sondern Teil
desselben Bildes — nur eben eines größeren, das ich noch nicht gefunden habe.

## Was als Nächstes ansteht

**1. Weitere Korrekturen von Daniel.** Die Prüfseite läuft im Werkzeug unter
`localhost:8790/pruefen.html`: je Nummer drei Knöpfe, rechts die ausziehbare
Sammlung zum Draufziehen (wahlweise nur die passende Grundfläche oder alle
Größen), Screenshots per Strg+V. Alles landet sofort in
`lib/zuordnung_urteil.json`, und `node _setze_zuordnung.js --schreibe` holt es
in die Zuordnung. **Nichts abtippen** — die Datei ist die Quelle.

**2. Die vier Farmen.** Getreidefarm, Hopfenfarm, Apfelplantage und
Milchviehhof haben **kein** Gebäudebild in den gelesenen Dateien (gemessen:
kein einziges Bild mit 10×10 Kacheln, und die drei 9×9-Bilder sind ein
europäischer Bergfried, sein Fundament und die Kirche). Das Feld selbst liegt
als 1×1-Kacheln in `tile_farmland` (62 Stück, vom nackten Acker bis zur
Garbe). Zu suchen ist also nur das **Hofgebäude** — nächster Ort zum Nachsehen
wären `anim_farmer.gm1` und `body_farmer.gm1`, oder ein Bild kleinerer
Grundfläche, das ich bisher einem anderen Bau zugeschrieben habe.

**3. Der Teich (Nr. 96).** Die Tabelle sagt 3×3, es gibt aber kein Wasserbild
dieser Größe. Die einzigen Teiche liegen in 5×5 (dort sitzt schon der Große
Teich) und in 6×6, wo die Tabelle gar keinen Teich kennt. Entweder stimmt die
Größe in der Tabelle nicht, oder der kleine Teich ist Gelände.

---

## Was diese Sitzung gelernt hat

**Die Mauern lagen in einer Datei mit anderer Datenart.** `tile_walls.gm1` ist
Datenart 5 (ungepackt), nicht 3. Wer nur die Gebäude-Dateien liest, findet
darum nie eine Mauer und sucht den Fehler bei sich. Der Inhalt sind
obendrein **Texturen** — senkrechte Streifen Sandstein, Graustein, Holz —,
keine fertigen Mauerbilder. Die einzelnen Mauerkacheln stehen als Datenart 3
ganz vorn in `tile_buildings1` (Bilder 0 bis 3).

**Datenart 5 speichert `höhe − 7` Zeilen zu je 2 Byte je Punkt.** Bei allen
drei vorkommenden Höhen exakt (186→179, 87→80, 75→68). Der Leser dafür steht
noch nicht in `lib/gm1.js`; für den Bogen hat ein Wegwerf-Skript gereicht.

**18 Fassungen je Werkstatt sind 2 × 9.** Neun Dachzustände, und das Ganze
zweimal: einmal ohne Betrieb, einmal mit. Bei der Bäckerei ist die erste
Neunerreihe **ohne Backofen**, bei der Brauerei **ohne Feuer unter dem
Kessel**, bei der Gerberei **ohne aufgespannte Haut**. Für die Anzeige ist die
zweite Reihe die richtige — sonst sieht das Gebäude leer aus.

**Daniels 4×4-Durchgang stimmt, seine Zählung verschiebt sich ab Bild 7 um
eins.** Grund: Kornspeicher *und* Waffenlager haben je zwei Fassungen (offen
und geschlossen), er hat sie als drei gezählt. Ab da passt alles wieder,
Bild für Bild bis „Haus 7".

**Ein Fleißlauf mit vielen Betrachtern ist an der Sitzungsgrenze gescheitert.**
Neun von 59 waren fertig, als das Kontingent endete; die neun Ergebnisse waren
gut und sind eingeflossen. Die restlichen Gruppen von Hand anzusehen hat
danach etwa so lange gedauert wie der Lauf selbst. Wer so etwas wieder
aufsetzt, teilt es in kleinere Läufe.

---

## Was beim Zuordnen Zeit spart

**Der Filter ist die Grundfläche.** `teile` im Bildkopf ist n·n bei n×n
Kacheln.

**Viel ist gar kein Gebäude.** Teiche, Geröllflächen, Bauzustände, Ruinen,
Fundamente — und ein Entwickler-Platzhalter, der in jeder Größe einmal
auftaucht (weißes Gitterbild mit gelbem Smiley).

**Altbestand aus Stronghold 1.** Holzpalisaden, Fachwerkhäuser, ein grauer
europäischer Bergfried. Alles in europäischer Optik ist Altbestand; Crusader
ist sandfarben, mit Flachdächern und Palmwedeln.

**Die Namen der Tabelle sind nicht die des Spiels.** Nr. 50 hieß hier
„Stangendreher" (wörtlich für *Poleturner*), heißt aber **Lanzenmacher**. Bei
Nr. 39 und 55 widersprechen sich Tabellenname und Mapper-Name: die Tabelle
sagt Söldnerposten/Kaserne, die Mapper-Namen sagen BARRACKS_EURO/BARRACKS_ARAB
— also genau andersherum. Zugeordnet ist nach dem Bild (Zelt = Söldnerposten,
Steinbau mit Banner = Kaserne).

---

## Offene Fragen an Daniel

* **Welches Wasser ist der Graben?** Im ganzen `gm`-Ordner gibt es nur zwei
  Dateien mit türkisen Kacheln: `tile_sea8` (ruhige Fläche) und
  `tile_sea_new_01` (dunkel mit Schaumkronen). Eingetragen ist `tile_sea8`,
  aber als *vermutet* — Daniel hat gewarnt, dass See- und Flusstexturen etwas
  anderes sind. Vergleichsbild: `Tools\VillageStudio-bogen\Wasser_Vergleich.png`.
* **Die vier Treppen.** Von Daniel widerlegt. Auf seinem Spielbild sind es
  steinerne Stufen an der Mauer; die gestuften Steinplatten aus `tile_flatties`
  sind es nicht. Nächster Ort zum Nachsehen ist `anim_castle`, wo auch die
  Mauer-Seitenflächen liegen.
* **Ingenieurs- oder Tunnelgräbergilde?** Das eine Bild trägt Wagenrad, Sägeblatt
  und Balken, das andere Spitzhacke, Seilzugeimer und Schutthaufen. Welches
  welche Gilde ist, ist die einzige Frage.

*Erledigt seit der ersten Fassung:* die Torrichtungen (Daniel hat sie im Editor
korrigiert, die Paare waren getauscht) und die Mauerfrage (er hat Steinmauer
und Niedrige Mauer selbst gesetzt).

---

## Werkzeuge

```
node _baue_zuordnung.js --schreibe --boegen    Kandidaten und Bögen erneuern
node _baue_einzelbilder.js                     Einzelbilder mit Nummer im Namen
node _baue_montage.js 4 23 40 ziel.png         eine Gruppe nebeneinander
node _setze_zuordnung.js --schreibe            Zuordnung eintragen
node _zeige_gm1.js --liste                      alle gm1-Dateien mit Art
node _zeige_gm1.js anim_windmill a.png         eine Datei Bild für Bild ansehen
node _baue_beispieldorf.js Emir3 bild.png      ein Dorf als PNG
node server.js                                 Oberfläche auf localhost:8790
```

Bögen und Einzelbilder liegen in `Tools\VillageStudio-bogen` (gehört SVS, im
Ordner-Register). Die Positionsnummern dort sind dieselben wie in
`lib/gebaeude_bilder.json` und in `_setze_zuordnung.js` — eine Reihenfolge für
alles, festgelegt in `lib/bildvorrat.js`.

**Es liegt kein einziges PNG im Repo.** Der Server rendert die Bilder auf
Anfrage aus den `.gm1`-Dateien des Spiels und hält sie im Speicher
(`/api/bilder`, `/bilder/<nr>.png`). Die Anzeige folgt damit der Zuordnung
ohne Zwischenschritt.
