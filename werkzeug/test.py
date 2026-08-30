# -*- coding: utf-8 -*-
"""Setzt einen beliebigen Befehl ab und liest die neuen Logzeilen.
Aufruf: test.py <schluessel> [wert] [id] [wartesekunden]

  test.py einheiten            -> { "id": .., "einheiten": true }
  test.py einheitenroh 12      -> { "id": .., "einheitenroh": 12 }
  test.py zeit                 -> { "id": .., "zeit": true }
"""
import io, os, sys, time

BASE = r"C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme"
CMD  = BASE + "/ucp/villagestudio/befehl.json"
LOG  = BASE + "/ucp3.log"

schluessel = sys.argv[1] if len(sys.argv) > 1 else "einheiten"
wert       = sys.argv[2] if len(sys.argv) > 2 else "true"
kennung    = int(sys.argv[3]) if len(sys.argv) > 3 else 24001
warte      = int(sys.argv[4]) if len(sys.argv) > 4 else 20

vorher = os.path.getsize(LOG)
# 'player' muss mit: einzelbefehl bricht sonst ab, bevor es den Schluessel sieht
befehl = '{ "id": %d, "player": 1, "%s": %s }' % (kennung, schluessel, wert)
open(CMD, "wb").write(befehl.encode("utf-8"))
print("Befehl: " + befehl)

time.sleep(warte)

with io.open(LOG, encoding="utf-8", errors="replace") as f:
    f.seek(vorher)
    neu = f.read()

zeilen = [z.split("| ")[-1].strip() for z in neu.splitlines() if "villagestudio" in z]
# die Haken-Zaehlmeldungen sind hier nur Rauschen
zeilen = [z for z in zeilen if "Aufruf Nr." not in z]
print("--- %d Zeilen ---" % len(zeilen))
for z in zeilen[-40:]:
    print("   " + z)
if not zeilen:
    print("   (keine)")
