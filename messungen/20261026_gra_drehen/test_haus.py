# -*- coding: utf-8 -*-
"""GRA-Gegenprobe (27.10.2026): Gebaeude mit Drehwert 0 (wie SamurAI) gegen 15 (wie der Mausklick).

Baut auf Instanz 2 je ein Haus und eine Apfelplantage mit beiden Werten, dreht die Ansicht
einmal ganz herum und holt in jeder Stellung ein Bild. Erwartung, VORHER festgelegt:
  - Drehwert 15 sieht in allen vier Stellungen richtig aus.
  - Drehwert 0 sieht nur in Stellung 0 richtig aus, sonst zerbrochen (Daniels Bild).
Widerlegt ist die Ursache, wenn beide gleich aussehen.
"""
import os, struct, sys, time
import importlib.util as u

HIER = os.path.dirname(os.path.abspath(__file__))
sys.argv = [sys.argv[0], "x", "x"]
spec = u.spec_from_file_location("messen", os.path.join(HIER, "messen.py"))
m = u.module_from_spec(spec); spec.loader.exec_module(m)

UNITS, U_GR = 0x0138854C, 1168
GEB, G_GR = 0x00F98520 + 0x14, 812
HUETTE = (1, 54, 4)            # Typ, Mapper, Groesse (Selfaware wege_abstand.py)
APFEL = (32, 72, 10)


def lord(spieler):
    d = m.lies(UNITS, 2500 * U_GR)
    for i in range(2500):
        b = i * U_GR
        zust, typ, sp = struct.unpack_from("<hh", d, b + 0x8C) + (struct.unpack_from("<h", d, b + 0x96)[0],)
        if zust != 0 and typ == 55 and sp == spieler:
            x, y = struct.unpack_from("<hh", d, b + 0xB6)
            return x // 8, y // 8
    sys.exit("FEHLER: kein Lord fuer Spieler %d" % spieler)


def zaehle(typ, spieler):
    n = m.zahl(GEB - 0x14)
    d = m.lies(GEB, min(n, 2000) * G_GR)
    return sum(1 for i in range(min(n, 2000))
               if struct.unpack_from("<h", d, i * G_GR + 0xD0)[0] != 0
               and struct.unpack_from("<h", d, i * G_GR + 0xD2)[0] == typ
               and struct.unpack_from("<h", d, i * G_GR + 0xD6)[0] == spieler)


def baue(art, richtung, kandidaten):
    typ, mapper, groesse = art
    for (x, y) in kandidaten:
        vorher = zaehle(typ, 1)
        m.sende({"baue": {"mapper": mapper, "x": x, "y": y, "groesse": groesse, "richtung": richtung}})
        for _ in range(10):
            time.sleep(0.5)
            if zaehle(typ, 1) > vorher:
                print("  gebaut: Typ %d Drehwert %d bei (%d,%d)" % (typ, richtung, x, y))
                return (x, y)
    print("  NICHT gebaut: Typ %d Drehwert %d" % (typ, richtung))
    return None


def main():
    leer = m.lies(m.SCHICHTEN["gfx"], m.GROESSE)
    m.sende({"menue": 41}); time.sleep(3)
    m.sende({"eigenesGefecht": True, "karte": "!KOphase Map 1", "ki": 5, "kis": [5], "gegner": 1})
    for _ in range(120):
        time.sleep(0.5)
        if m.lies(m.SCHICHTEN["gfx"], m.GROESSE) != leer:
            break
    time.sleep(8)
    lx, ly = lord(1)
    print("Lord Spieler 1 bei (%d,%d)" % (lx, ly))
    ringe = [(lx + dx, ly + dy) for r in range(8, 30, 3) for dx, dy in
             ((r, 0), (0, r), (-r, 0), (0, -r), (r, r), (-r, r), (r, -r), (-r, -r))]
    orte = {}
    for name, art, richtung in (("haus0", HUETTE, 0), ("haus15", HUETTE, 15),
                                ("apfel0", APFEL, 0), ("apfel15", APFEL, 15)):
        orte[name] = baue(art, richtung, ringe)
    print("Orte:", orte)
    m.sende({"kamera": [lx, ly]}); time.sleep(2)
    m.sende({"pause": True}); time.sleep(2)
    a = m.zahl(m.AUSRICHTUNG)
    for k in range(4):
        m.bild("haus", "r%d" % a)
        m.sende({"drehen": "links"}); a = (a + 2) % 8; m.warte_ausrichtung(a)
    print("OK: fertig")


if __name__ == "__main__":
    main()
