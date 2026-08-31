# -*- coding: utf-8 -*-
"""Zeigt den Spielmodus in der Zustandsmeldung.

Die Spielzeit bleibt bei ~4010 Ticks stehen, nachdem sie rund 100 Sekunden
gelaufen ist. Zwei Erklaerungen sind noch offen: fehlender Fokus oder ein
beendetes Gefecht. Der Spielmodus trennt beides eindeutig.

    GameSynchronyState = 0x0191D768,  currentGameMode bei +0x618
    -> 0x0191DD80

      0 = GM_SOLITARY
      1 = GM_MULTIPLAYER
     99 = GM_SKIRMISH_SINGLE_PLAYER
    666 = GM_SKIRMISH_END_OF_GAME_SINGLE_PLAYER   <- Gefecht vorbei
"""
import io, sys

INIT = r"C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme/ucp/modules/villagestudio-0.1.0/init.lua"
roh = open(INIT, "rb").read()
if roh.startswith(b"\xef\xbb\xbf"):
    roh = roh[3:]
s = roh.decode("utf-8")

alt = '''    local ticks = core.readInteger(0x0117CADC) or -1
    local einh  = core.readInteger(0x01387F38) or -1
    log(INFO, string.format(
      "ZUSTAND (Bild %d): Spielzeit %d Ticks, maxUnitCount %d -> %s",
      menuCounter, ticks, einh,
      ticks > 0 and "Gefecht laeuft" or "KEIN Gefecht"))'''
neu = '''    local ticks = core.readInteger(0x0117CADC) or -1
    local einh  = core.readInteger(0x01387F38) or -1
    -- currentGameMode: GameSynchronyState (0x0191D768) + 0x618
    local modus = core.readInteger(0x0191DD80) or -1
    local wasIst = "?"
    if modus == 0 then wasIst = "GM_SOLITARY"
    elseif modus == 1 then wasIst = "GM_MULTIPLAYER"
    elseif modus == 99 then wasIst = "GM_SKIRMISH (laeuft)"
    elseif modus == 666 then wasIst = "GM_SKIRMISH_ENDE - Gefecht ist VORBEI"
    end
    log(INFO, string.format(
      "ZUSTAND (Bild %d): Spielzeit %d Ticks, maxUnitCount %d, Modus %d = %s",
      menuCounter, ticks, einh, modus, wasIst))'''
assert alt in s, "Anker Zustandsmeldung nicht gefunden"
s = s.replace(alt, neu, 1)
open(INIT, "wb").write(s.encode("utf-8"))

t = io.open(INIT, encoding="utf-8").read()
for p in ["0x0191DD80", "GM_SKIRMISH_ENDE"]:
    print(("  ok    " if p in t else "  FEHLT ") + p)
print("erstes Byte: %02X" % open(INIT, "rb").read(1)[0])
