# -*- coding: utf-8 -*-
"""GRA-Pruefllauf (27.10.2026): Was passiert mit den Kartenschichten beim Drehen?

Liest den Speicher von Instanz 2 direkt (sie laeuft ohne erhoehte Rechte) und
schickt Befehle ueber befehl.json. Die Logik dort ist alt und schreibt keine
Quittungen - deshalb wird nicht auf Antworten gewartet, sondern auf den
Speicher (Ausrichtung, Spielzeit).

Aufruf:  python messen.py <karte> <kennung>
Ablage:  schichten_<kennung>_<schritt>.bin + bild_<kennung>_<schritt>.bmp hier im Ordner
"""
import ctypes, json, os, shutil, subprocess, sys, time

HIER = os.path.dirname(os.path.abspath(__file__))
SPIEL = r"C:\Program Files (x86)\Steam\steamapps\common\Stronghold Crusader Extreme Instanz2"
BEFEHL = os.path.join(SPIEL, "ucp", "villagestudio", "befehl.json")

# Adressen aus DAT_MapSectionAddressArray (Wissensstand 13x) und GameCore
SCHICHTEN = {"gfx": 0x01AE5688, "zufall": 0x01BD0F48, "makro": 0x01DCFCB8}
GROESSE = 80400 * 2
AUSRICHTUNG = 0x01FE7AA4
SPIELZEIT = 0x01FE7D10 + 0x1E0  # wird unten gegen das Log geprueft, nur Hinweis

k32 = ctypes.WinDLL("kernel32", use_last_error=True)
k32.OpenProcess.restype = ctypes.c_void_p
k32.ReadProcessMemory.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
                                  ctypes.c_size_t, ctypes.POINTER(ctypes.c_size_t)]


def pid_von_instanz2():
    ps = ("Get-CimInstance Win32_Process -Filter \"Name='Stronghold Crusader.exe'\" | "
          "Where-Object { $_.ExecutablePath -like '*Extreme Instanz2*' } | "
          "Select-Object -ExpandProperty ProcessId")
    out = subprocess.run(["powershell", "-NoProfile", "-Command", ps], capture_output=True, text=True).stdout.split()
    if len(out) != 1:
        sys.exit("FEHLER: erwartet genau ein Spiel aus Instanz 2, gefunden: %r" % out)
    return int(out[0])


H = k32.OpenProcess(0x0010 | 0x0400, False, pid_von_instanz2())  # VM_READ | QUERY_INFORMATION
if not H:
    sys.exit("FEHLER: Speicher von Instanz 2 nicht lesbar (Fehler %d)" % ctypes.get_last_error())


def lies(adr, n):
    puf = ctypes.create_string_buffer(n)
    got = ctypes.c_size_t()
    if not k32.ReadProcessMemory(H, adr, puf, n, ctypes.byref(got)) or got.value != n:
        raise OSError("ReadProcessMemory 0x%08X: Fehler %d" % (adr, ctypes.get_last_error()))
    return puf.raw


def zahl(adr):
    return int.from_bytes(lies(adr, 4), "little", signed=True)


_nr = [int(time.time())]


def sende(cmd):
    _nr[0] += 1
    cmd = dict(cmd, id=_nr[0])
    open(BEFEHL, "wb").write(json.dumps(cmd).encode("utf-8"))
    print("  gesendet:", json.dumps(cmd))


def abzug(kennung, schritt):
    pfad = os.path.join(HIER, "schichten_%s_%s.bin" % (kennung, schritt))
    with open(pfad, "wb") as f:
        for name in ("gfx", "zufall", "makro"):
            f.write(lies(SCHICHTEN[name], GROESSE))
    print("  Abzug %s: Ausrichtung %d -> %s" % (schritt, zahl(AUSRICHTUNG), os.path.basename(pfad)))


def bild(kennung, schritt):
    # UCP3 laesst Lua nur unterhalb des Spielordners schreiben (absoluter Pfad = "Invalid path"),
    # "menue" haelt im Gefecht nur das alte Menuebild, die Karte steht auf der Flaeche "karte" (4056x2076).
    rel = "ucp/villagestudio/abzug/gra_%s_%s.bmp" % (kennung, schritt)
    quelle = os.path.join(SPIEL, rel.replace("/", os.sep))
    if os.path.exists(quelle):
        os.remove(quelle)
    sende({"bild": "karte", "datei": rel})
    for _ in range(40):
        time.sleep(0.5)
        if os.path.exists(quelle) and os.path.getsize(quelle) > 1000:
            time.sleep(0.5)
            shutil.copyfile(quelle, os.path.join(HIER, "bild_%s_%s.bmp" % (kennung, schritt)))
            return
    print("  WARNUNG: Bild %s kam nicht an" % schritt)


def warte_ausrichtung(soll):
    for _ in range(60):
        time.sleep(0.5)
        if zahl(AUSRICHTUNG) == soll:
            time.sleep(1.5)  # updateGfxLayer laeuft im selben Takt; Sicherheitsabstand
            return
    sys.exit("FEHLER: Ausrichtung wurde nicht %d (steht auf %d)" % (soll, zahl(AUSRICHTUNG)))


def main():
    karte, kennung = sys.argv[1], sys.argv[2]
    leer = lies(SCHICHTEN["gfx"], GROESSE)
    sende({"menue": 41})
    time.sleep(3)
    sende({"eigenesGefecht": True, "karte": karte, "ki": 5, "kis": [5], "gegner": 1})
    for _ in range(120):          # warten, bis die Karte im Speicher steht
        time.sleep(0.5)
        if lies(SCHICHTEN["gfx"], GROESSE) != leer:
            break
    else:
        sys.exit("FEHLER: keine Karte geladen")
    time.sleep(8)
    sende({"pause": True})
    time.sleep(2)
    a0 = zahl(AUSRICHTUNG)
    print("Karte %s geladen, Ausrichtung %d" % (karte, a0))
    abzug(kennung, "a0"); bild(kennung, "a0")
    sende({"drehen": "links"}); warte_ausrichtung((a0 + 2) % 8)
    abzug(kennung, "a2"); bild(kennung, "a2")
    sende({"drehen": "rechts"}); warte_ausrichtung(a0)
    abzug(kennung, "b0"); bild(kennung, "b0")
    print("OK: fertig")


if __name__ == "__main__":
    main()
