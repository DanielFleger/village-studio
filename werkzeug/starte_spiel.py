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


# Die PowerShell-Schnipsel stehen als eigene Zeichenketten da, damit die
# Anfuehrungszeichen nicht mit denen von Python kollidieren.
_TYP_VORN = (
    "Add-Type 'using System;using System.Runtime.InteropServices;"
    "public class Fv{[DllImport(\"user32.dll\")]public static extern IntPtr "
    "GetForegroundWindow();}'; [Fv]::GetForegroundWindow()"
)

_TYP_ZURUECK = (
    "Add-Type 'using System;using System.Runtime.InteropServices;"
    "public class Fz{[DllImport(\"user32.dll\")]public static extern bool "
    "SetForegroundWindow(IntPtr h);"
    "[DllImport(\"user32.dll\")]public static extern bool ShowWindow(IntPtr h,int c);"
    "[DllImport(\"user32.dll\")]public static extern bool IsIconic(IntPtr h);}'; "
    # ShowWindow(9) NUR bei minimierten Fenstern. Auf ein maximiertes Fenster
    # angewandt macht es dieses klein - am 01.09. ist Daniels Vollbild-Browser
    # dadurch auf Fenstergroesse geschrumpft. Wer den Fokus zurueckgibt, darf
    # die Fenstergroesse nicht anfassen.
    "$h=[IntPtr]{handle}; if ([Fz]::IsIconic($h)) { [void][Fz]::ShowWindow($h,9) }; "
    "[Fz]::SetForegroundWindow($h)"
)


def fokus_merken():
    """Handle des Fensters, das gerade vorn ist - vor dem Spielstart."""
    return ps(_TYP_VORN).strip()


def fokus_zurueck(handle):
    """Holt Daniels Fenster wieder nach vorn.

    Das Spielfenster wird dabei NICHT angefasst - das ist gesperrt (Fehler 5)
    und hat dreimal den Prozess gekostet. Stattdessen kommt einfach das
    Fenster zurueck, das vorher da war; das Spiel rutscht dadurch von selbst
    nach hinten und laeuft dank continueOutOfFocus: render weiter.
    """
    if not handle or handle == "0":
        return False
    return ps(_TYP_ZURUECK.replace("{handle}", handle)).strip().lower() in ("true", "wahr")


def beenden():
    """Beendet ein laufendes Spiel ueber das Modul.

    Von aussen geht das nicht: taskkill und Stop-Process scheitern mit
    Fehler 5, weil der Prozess auf hoher Rechtestufe laeuft. Das Modul laeuft
    IM Spiel und ruft dort ExitProcess. Belegt am 01.09.2026.
    """
    if laeuft() in ("", "0"):
        return True
    schreibe('{ "id": 94099, "beenden": true }')
    for _ in range(20):
        time.sleep(1)
        if laeuft() in ("", "0"):
            print("Laufendes Spiel beendet.")
            return True
    print("Das Spiel liess sich nicht beenden - steht es im Hauptmenue und ist")
    print("der Modulkern von vor dem 01.09.? Dann kennt er den Befehl nicht.")
    return False


def main():
    if laeuft() not in ("", "0"):
        # Zwei Instanzen verfaelschen jede Messung: die zweite haengt im Dialog
        # "is already running", laedt UCP aber vollstaendig und schreibt
        # Logzeilen. Von aussen sieht das gesund aus.
        print("Es laeuft schon eine Instanz - ich beende sie.")
        if not beenden():
            return 1

    # Ein stehengebliebener Auftrag wuerde beim Start sofort erneut feuern.
    schreibe("{}")

    vorher = fokus_merken()
    print("Fenster im Vordergrund vor dem Start: %s" % (vorher or "keines"))

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

    # KEIN Fensterbefehl mehr. Er hat das Spiel dreimal getoetet: das Modul
    # ruft dafuer SetWindowPos ueber exposeCode, und dabei zerfaellt der
    # Stapel. Die Fensterlage stellt der graphicsApiReplacer ueber window.pos
    # in der ucp-config.yml - und "topRight" darf es dort NICHT sein, das
    # bringt beim Wechsel auf den zweiten Schirm die Darstellung zum Erliegen.
    # Daniels Fenster zurueckholen. Damit rutscht das Spiel nach hinten, ohne
    # dass jemand sein Fenster anfassen muss.
    if fokus_zurueck(vorher):
        print("Dein Fenster ist wieder vorn, das Spiel liegt dahinter.")
    else:
        print("Konnte den Fokus nicht zurueckgeben - bitte einmal Alt+Tab.")
    print("Spiel laeuft. Fensterlage kommt aus der ucp-config.yml.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
