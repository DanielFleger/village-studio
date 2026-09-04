# Übergabe 05.09.2026 — Spielgrafiken im Village Studio

Für die nächste SVS-Sitzung. Wer hier anfängt, liest zuerst `Wissensstand.md`
Abschnitt **1c** (das Bildformat) und dann diese Seite.

---

## Wo das Vorhaben steht

Der ganze Weg von der `.gm1`-Datei bis zum fertigen Bild ist **gelöst und im
Bild geprüft**. Was fehlt, ist eine einzige Fleißarbeit: welche Bau-Nummer
welches Bild bekommt.

| Stück | Stand |
|---|---|
| `.gm1` lesen (Kopf, Farbtafeln, TGX) | fertig, alle 199 Dateien |
| Ganze Gebäude zusammensetzen | fertig, `lib/gm1.js` → `ganzesGebaeude` |
| Ganzes Dorf zeichnen | fertig, `_baue_beispieldorf.js <Dorfname>` |
| Kandidaten je Nummer | fertig, `lib/gebaeude_bilder.json` |
| **Zuordnung Nummer → Bild** | **5 sicher, 6 vermutet von 84** |
| Grafiken in der Oberfläche | **noch nicht** — die schräge Ansicht zeichnet Klötze |

---

## Daniels Freigabe — der Auftrag steht schon

Daniel am 05.09.2026, 00:51, wörtlich sinngemäß: **„Du kannst die Bilder selbst
zuordnen, und wenn was falsch ist, gebe ich dir Bescheid."**

Das ist die Erlaubnis, ohne Rückfrage durchzugehen. Nicht raten heißt hier
trotzdem: was erkennbar ist, kommt unter `sicher` mit Begründung; was nur
plausibel ist, unter `vermutet`. Der Unterschied bleibt sichtbar, damit Daniels
Korrektur weiß, wo sie ansetzen muss. Er korrigiert gern — aber nur, was als
unsicher gekennzeichnet ist, kann er auch gezielt prüfen.

Fang mit den häufigen an, dann sieht das Werkzeug am schnellsten nach Spiel
aus: Steinmauer, Hütte, Bäckerei, Lanzenmacher, Rüstungsschmied, Lagerplatz.

---

## Der nächste Handgriff

**Die Bilder einzeln ausgeben, mit der Nummer im Dateinamen.** Daniel hat den
4×4-Bogen vollständig durchgesprochen (steht wörtlich in
`lib/gebaeude_bilder.json` unter `von_daniel_4x4`), aber seine Zählung läuft
über die Zeilengrenzen des Bogens hinweg und ließ sich nicht sicher auf
Positionen abbilden. Mit Einzelbildern wird daraus in einem Durchgang eine
Tabelle, ohne dass jemand rät.

Danach: seine Beschreibung Zeile für Zeile eintragen, dann die schräge Ansicht
auf die Bilder umstellen.

---

## Was beim Zuordnen Zeit spart

**Der Filter ist die Grundfläche.** `teile` im Bildkopf ist n·n bei n×n
Kacheln. Statt 377 Bilder je Nummer bleiben wenige.

**18 Fassungen je Werkstatt** — von Daniel gemessen, dieselbe Schrittweite bei
Schwertmacher, Rüstungsschmied und Lederharnischmacher. Die Fassungen sind
Ausrichtungen und Zustände (offen mit Arbeiter, geschlossen). Eine Nummer zeigt
also auf eine **Gruppe**; für die Anzeige genügt eine Fassung.

**Viel ist gar kein Gebäude.** In den Kandidatenlisten stehen Teiche,
Geröllflächen, Bauzustände, Ruinen, Fundamente — und ein Entwickler-Platzhalter
(weißes Gitterbild mit gelbem Smiley, `tile_buildings2#86`). Von zwölf
7×7-Kandidaten waren nur drei echte Gebäude.

**Altbestand aus Stronghold 1.** Die Dateien enthalten Dinge, die Crusader
nicht benutzt — Holzpalisaden statt Steinmauern. Daniel hat es im Beispieldorf
sofort erkannt. Beim Filtern mitbedenken.

**Die Namen der Tabelle sind nicht die des Spiels.** Nr. 50 hieß hier
„Stangendreher" — die wörtliche Übersetzung von *Poleturner*, die im deutschen
Spiel niemand kennt. Er heißt **Lanzenmacher**. In den 84 Einträgen stecken
vermutlich weitere solche Kunstwörter; sie fallen nur Daniel auf.

---

## Zwei eigene Irrtümer, damit sie sich nicht wiederholen

**Die Lage der Teile steht nicht in der Datei.** `versatzX`/`versatzY` als
Position im Gebäude zu lesen ergibt bei der Kapelle eine senkrechte Spanne von
192 statt der möglichen 96. Die Lage wird **gerechnet** (siehe Wissensstand 1c).

**`kachelVersatz` hebt den Aufbau über seine Kachel.** Ohne dieses Feld
schweben die Dächer.

Beide Male hatte ich selbst hergeleitet und danebengelegen; beim dritten Mal
habe ich die Lösung von `Gm1KonverterCrossPlatform` nachgelesen und es war in
zehn Minuten erledigt. **Bei fremden Formaten zuerst nachlesen, nicht
herleiten** — bei der Formatbeschreibung hatte ich es richtig gemacht, beim
Zusammenbau nicht.

---

## Offene Kleinigkeiten

* **10×10 fehlt.** Für Apfelplantage und Milchviehhof gibt es in keiner der
  zehn durchsuchten Dateien ein Bild dieser Größe. Es fehlt eine Datei.
* **Torhaus-Ausrichtung.** `tile_castle#419` und `#468` sind dieselbe Form
  gespiegelt. Welche O-W und welche N-S ist, ist ungeprüft.
* **Die drei Mauerbilder.** Daniel: „große Mauer, drittes kleine Mauer" — die
  mittlere ist sichtbar niedriger. Muss nachgefragt werden.

---

## Werkzeuge

```
node _baue_zuordnung.js --schreibe --boegen    Kandidaten und Bögen erneuern
node _baue_beispieldorf.js Emir3 bild.png      ein Dorf mit echten Grafiken
```

Bögen liegen in `Tools\VillageStudio-bogen` (gehört SVS, im Ordner-Register).
Bestätigtes in `lib/gebaeude_bilder.json` wird beim Erneuern **nie**
überschrieben.
