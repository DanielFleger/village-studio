# -*- coding: utf-8 -*-
"""Startet Stronghold und stellt das Fenster sofort hinten auf den rechten
Schirm - ohne dass jemand klickt.

Warum ueberhaupt ein Skript: Von aussen laesst sich dieses Fenster nicht
anfassen. Der Prozess laeuft auf hoher Rechtestufe, die Claude-Sitzung nicht;
SetWindowPos, Stop-Process und selbst das blosse Zuruecksetzen in der
Fensterreihenfolge scheitern mit Fehler 5 (01.09.2026 dreimal gemessen).
Der einzige Weg fuehrt ueber das Modul, das IM Spiel laeuft. Dieses Skript
startet also nur und schickt dem Modul dann den Auftrag.

Aufruf:  python werkzeug/starte_spiel.py [--links]
"""
import io, os, subprocess, sys, time

SPIEL   = r"C:\Program Files (x86)\Steam\steamapps\common\Stronghold Crusader Extreme"
EXE     = os.path.join(SPIEL, "Stronghold Crusader.exe")
BEFEHL  = os.path.join(SPIEL, "ucp", "villagestudio", "befehl.json")
LOG     = os.path.join(SPIEL, "ucp3.log")

# Monitor 2 beginnt bei x=2560 (Monitor 1 ist 2560 breit).
ZIEL_X, ZIEL_Y = (0, 0) if "--links" in sys.argv else (2560, 0)


def ps(befehl):
    return subprocess.run(["powershell", "-NoProfile", "-Command", befehl],
                          capture_output=True, text=True).stdout.strip()


def laeuft():
    return ps("(Get-Process 'Stronghold Crusader' -ErrorAction SilentlyContinue).Count")


def fenster():
    """Handle und Titel des Spielfensters, oder (None, None)."""
    aus = ps("$p = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and "
             "$_.ProcessName -match 'Crusader' } | Select-Object -First 1; "
             "if ($p) { '{0}|{1}' -f $p.MainWindowHandle, $p.MainWindowTitle }")
    if "|" not in aus:
        return None, None
    h, t = aus.split("|", 1)
    return int(h), t.strip()


def schreibe(text):
    io.open(BEFEHL, "wb").write(text.encode("utf-8"))


def main():
    if laeuft() not in ("", "0"):
        print("Es laeuft schon eine Instanz. Zwei Instanzen verfaelschen jede")
        print("Messung - die zweite haengt im Dialog 'is already running', laedt")
        print("UCP aber vollstaendig und schreibt Logzeilen. Erst beenden.")
        return 1

    # Ein stehengebliebener Auftrag wuerde beim Start sofort erneut feuern.
    schreibe("{}")

    subprocess.run(["powershell", "-NoProfile", "-Command",
                    "Start-Process -FilePath '%s' -ArgumentList '--ucp-no-security' "
                    "-WorkingDirectory '%s'" % (EXE, SPIEL)])
    print("gestartet, warte auf das Fenster ...")

    hwnd, titel = None, None
    for _ in range(60):
        time.sleep(1)
        hwnd, titel = fenster()
        if hwnd:
            break
    if not hwnd:
        print("Kein Fenster erschienen.")
        return 1
    if titel != "Crusader":
        print("Fenstertitel ist '%s' - das Spiel haengt in einem Dialog." % titel)
        return 1
    print("Fenster 0x%X ('%s')" % (hwnd, titel))

    # Warten, bis das Modul laeuft: vorher liest niemand die Befehlsdatei.
    for _ in range(60):
        try:
            if "villagestudio aktiv" in io.open(LOG, encoding="utf-8", errors="replace").read():
                break
        except OSError:
            pass
        time.sleep(1)
    else:
        print("Modul meldet sich nicht - lief der Start ohne --ucp-no-security?")
        return 1

    schreibe('{ "id": %d, "fenster": { "hwnd": %d, "x": %d, "y": %d, "alle": 300 } }'
             % (93000 + hwnd % 1000, hwnd, ZIEL_X, ZIEL_Y))
    print("Fenster-Wacht angefordert: hinten, auf (%d,%d), Nachfassen alle 300 Takte."
          % (ZIEL_X, ZIEL_Y))

    for _ in range(20):
        time.sleep(1)
        text = io.open(LOG, encoding="utf-8", errors="replace").read()
        if "FENSTER:" in text:
            print([z for z in text.splitlines() if "FENSTER:" in z][-1].split("]: ")[-1])
            return 0
    print("Das Modul hat den Fensterbefehl nicht quittiert.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
