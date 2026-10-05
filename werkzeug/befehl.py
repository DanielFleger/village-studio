# -*- coding: utf-8 -*-
"""Schreibt befehl.json ohne BOM. Aufruf: befehl.py <json-text>

PowerShells Set-Content -Encoding UTF8 schreibt ein BOM, an dem sowohl Lua
als auch der JSON-Leser des Moduls stolpern. Deshalb geht jeder Befehl ueber
diesen Weg.
"""
import sys, io, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from instanz import spielordner   # Instanz waehlen: SHC_INSTANZ (05.10.2026)
ZIEL = os.path.join(spielordner(), "ucp", "villagestudio", "befehl.json")
LOG  = os.path.join(spielordner(), "ucp3.log")

text = sys.argv[1] if len(sys.argv) > 1 else '{ "id": 0 }'
open(ZIEL, "wb").write(text.encode("utf-8"))
print("geschrieben: " + text)
print("Logstand: %d Byte" % os.path.getsize(LOG))
