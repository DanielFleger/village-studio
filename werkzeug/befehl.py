# -*- coding: utf-8 -*-
"""Schreibt befehl.json ohne BOM. Aufruf: befehl.py <json-text>

PowerShells Set-Content -Encoding UTF8 schreibt ein BOM, an dem sowohl Lua
als auch der JSON-Leser des Moduls stolpern. Deshalb geht jeder Befehl ueber
diesen Weg.
"""
import sys, io, os

ZIEL = r"C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme/ucp/villagestudio/befehl.json"
LOG  = r"C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme/ucp3.log"

text = sys.argv[1] if len(sys.argv) > 1 else '{ "id": 0 }'
open(ZIEL, "wb").write(text.encode("utf-8"))
print("geschrieben: " + text)
print("Logstand: %d Byte" % os.path.getsize(LOG))
