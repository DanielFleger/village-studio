# -*- coding: utf-8 -*-
"""Vergleicht zwei Spielbilder und sagt, OB und WO sich etwas geaendert hat.

    python werkzeug/vergleich.py vorher.png nachher.png [ziel.png]

Warum das Werkzeug: Zwei Bilder eines laufenden Spiels von Hand zu vergleichen
ist die langsamste und unzuverlaessigste Stelle im ganzen Testlauf. Ein
Rechner sieht in einer Sekunde, was ein Auge uebersieht - und liefert eine
Zahl, die man in eine Dokumentation schreiben kann.

Ausgegeben wird:
  - wie viele Bildpunkte sich geaendert haben, in Prozent
  - in welchem Bereich (damit man weiss, wo man hinsehen muss)
  - ein Differenzbild: unveraendert wird abgedunkelt, Aenderungen leuchten rot

WICHTIG bei der Deutung: Ein pausiertes Spiel zeichnet trotzdem Animationen -
Rauch, Fahnen, Wasser. Ein paar Promille Unterschied heissen also NICHT, dass
die Aenderung gewirkt hat. Die Schwelle steht deshalb bei 0,5 Prozent, und
darunter meldet das Werkzeug ausdruecklich "kein belastbarer Unterschied".
"""
import sys

import numpy as np
from PIL import Image

SCHWELLE_PROZENT = 0.5      # darunter: Bildrauschen und Animationen
FARBABSTAND = 24            # ab welchem Unterschied ein Punkt als geaendert gilt


def vergleiche(a_pfad, b_pfad, ziel=None):
    a = np.array(Image.open(a_pfad).convert("RGB")).astype(np.int16)
    b = np.array(Image.open(b_pfad).convert("RGB")).astype(np.int16)
    if a.shape != b.shape:
        print("Die Bilder haben verschiedene Groessen: %s gegen %s"
              % (a.shape, b.shape))
        return None

    abstand = np.abs(a - b).max(axis=2)
    geaendert = abstand > FARBABSTAND
    anteil = geaendert.mean() * 100

    print("Bildpunkte geaendert: %d von %d  (%.2f %%)"
          % (geaendert.sum(), geaendert.size, anteil))

    if geaendert.any():
        zeilen = np.where(geaendert.any(axis=1))[0]
        spalten = np.where(geaendert.any(axis=0))[0]
        print("Bereich: Zeile %d bis %d, Spalte %d bis %d"
              % (zeilen.min(), zeilen.max(), spalten.min(), spalten.max()))

    if anteil < SCHWELLE_PROZENT:
        print("-> KEIN belastbarer Unterschied. Unter %.1f %% ist das "
              "Animation (Rauch, Fahnen, Wasser), nicht Wirkung."
              % SCHWELLE_PROZENT)
    else:
        print("-> Deutlicher Unterschied.")

    if ziel:
        # Unveraendertes abdunkeln, Aenderungen rot leuchten lassen
        bild = (b // 3).astype(np.uint8)
        bild[geaendert] = [255, 40, 40]
        Image.fromarray(bild).save(ziel)
        klein = ziel.replace(".png", "_klein.png")
        Image.fromarray(bild).resize((900, int(900 * bild.shape[0] / bild.shape[1]))).save(klein)
        print("Differenzbild: %s  (klein: %s)" % (ziel, klein))

    return anteil


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(2)
    ergebnis = vergleiche(sys.argv[1], sys.argv[2],
                          sys.argv[3] if len(sys.argv) > 3 else None)
    sys.exit(0 if ergebnis is not None else 1)
