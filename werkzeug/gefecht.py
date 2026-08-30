# -*- coding: utf-8 -*-
"""Startet ein Gefecht ueber den Dateikanal und liest das Ergebnis aus dem Log.

Kein Fenster, kein Fokus, keine Maus - Daniel kann waehrenddessen weiterarbeiten.
Die Anfuehrungszeichen gehoeren ins Skript, nicht in die PowerShell-Zeile:
dort verschwinden sie beim Weiterreichen.
"""
import io, os, sys, time, json

BASE = r"C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme"
CMD  = BASE + "/ucp/villagestudio/befehl.json"
LOG  = BASE + "/ucp3.log"

mission = int(sys.argv[1]) if len(sys.argv) > 1 else 0
kennung = int(sys.argv[2]) if len(sys.argv) > 2 else 23001
warte   = int(sys.argv[3]) if len(sys.argv) > 3 else 30

vorher = os.path.getsize(LOG)
befehl = '{ "id": %d, "gefecht": %d }' % (kennung, mission)
open(CMD, "wb").write(befehl.encode("utf-8"))
print("Befehl: " + befehl)

# Auf neue Logzeilen warten
ziel = time.time() + warte
gesehen = False
while time.time() < ziel:
    time.sleep(2)
    if os.path.getsize(LOG) > vorher:
        gesehen = True

with io.open(LOG, encoding="utf-8", errors="replace") as f:
    f.seek(vorher)
    neu = f.read()

zeilen = [z.split("| ")[-1].strip() for z in neu.splitlines()
          if "villagestudio" in z or "MENUE" in z]
print("--- neue Logzeilen: %d ---" % len(zeilen))
for z in zeilen[-25:]:
    print("   " + z)
if not zeilen:
    print("   (keine)")
