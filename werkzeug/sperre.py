# -*- coding: utf-8 -*-
"""Testsperre: verhindert, dass zwei Sitzungen gleichzeitig das Spiel fahren.

Warum es die gibt (31.08.2026, 20:36):
Zwei Claude-Sitzungen haben gleichzeitig einen Testlauf gestartet. Was dabei
kaputtgeht, ist nicht offensichtlich - es sieht naemlich alles gesund aus:

  * Die zweite Spielinstanz bleibt im Dialog "is already running" haengen,
    laedt UCP aber VOLLSTAENDIG und schreibt Logzeilen. Das Log meldet
    "Haken gesetzt" und "Modul aktiv", waehrend das Spiel nie ins Menue kommt.
  * ucp3.log wird bei jedem Spielstart NEU angelegt. Wer startet, loescht die
    Messwerte des anderen.
  * Beide schreiben in dieselbe befehl.json und ueberschreiben sich.

Aufruf:
    sperre.py nachsehen
    sperre.py holen <name> <zweck>
    sperre.py freigeben <name>

Rueckgabe: 0 = frei bzw. bekommen, 1 = belegt.
"""
import io, os, sys, time

BASE  = r"C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme"
DATEI = BASE + "/ucp/villagestudio/wer_testet.txt"
ALTER = 30 * 60          # nach 30 Minuten gilt eine Sperre als vergessen


def lesen():
    """Gibt (name, zweck, alter_in_sekunden) zurueck oder None."""
    if not os.path.exists(DATEI):
        return None
    try:
        roh = io.open(DATEI, encoding="utf-8").read().strip()
    except OSError:
        return None
    if not roh:
        return None
    teile = roh.split("|", 2)
    if len(teile) < 3:
        return None
    try:
        zeit = float(teile[1])
    except ValueError:
        return None
    return teile[0].strip(), teile[2].strip(), time.time() - zeit


def zeigen(eintrag):
    if eintrag is None:
        print("Sperre ist FREI.")
        return
    name, zweck, alter = eintrag
    print("Sperre gehoert: %s" % name)
    print("   Zweck : %s" % zweck)
    print("   Alter : %d Minuten" % (alter / 60))
    if alter > ALTER:
        print("   -> aelter als %d Minuten, gilt als vergessen und darf uebernommen werden."
              % (ALTER / 60))


def main():
    was = sys.argv[1] if len(sys.argv) > 1 else "nachsehen"
    name = sys.argv[2] if len(sys.argv) > 2 else ""
    zweck = " ".join(sys.argv[3:]) if len(sys.argv) > 3 else "(ohne Angabe)"
    eintrag = lesen()

    if was == "nachsehen":
        zeigen(eintrag)
        return 0 if eintrag is None else 1

    if was == "holen":
        if not name:
            print("Aufruf: sperre.py holen <name> <zweck>")
            return 2
        if eintrag is not None and eintrag[0] != name and eintrag[2] <= ALTER:
            print("BELEGT - nicht testen!")
            zeigen(eintrag)
            print()
            print("Schreib der anderen Sitzung, statt trotzdem zu starten.")
            return 1
        io.open(DATEI, "w", encoding="utf-8").write(
            "%s|%f|%s" % (name, time.time(), zweck))
        print("Sperre geholt: %s - %s" % (name, zweck))
        return 0

    if was == "freigeben":
        if eintrag is not None and name and eintrag[0] != name:
            print("Sperre gehoert %s, nicht %s - nicht freigegeben." % (eintrag[0], name))
            return 1
        if os.path.exists(DATEI):
            os.remove(DATEI)
        print("Sperre freigegeben.")
        return 0

    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main())
