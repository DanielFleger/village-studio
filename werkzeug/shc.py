# -*- coding: utf-8 -*-
"""Stronghold Crusader steuern - ein Werkzeug, wenige Schalter.

    python werkzeug/shc.py start                    starten (Standard)
    python werkzeug/shc.py start --vollbild         randlos ueber den Schirm
    python werkzeug/shc.py start --eigenes          und gleich ein Gefecht
    python werkzeug/shc.py start --eigenes --gegner 3 --ki 1
    python werkzeug/shc.py stop                     beenden

Der STANDARD ist Fenstermodus im Hintergrund - nicht Vollbild, obwohl Steam
das so starten wuerde. Grund: In diesem Zustand kann Daniel weiterarbeiten,
waehrend das Spiel laeuft, und genau darum geht es hier. Vollbild nimmt ihm
den Bildschirm. Wer es doch will, sagt --vollbild.

Warum es dieses Werkzeug ueberhaupt braucht: Von aussen ist am Spielfenster
alles gesperrt - der Prozess laeuft auf hoher Rechtestufe, die Claude-Sitzung
nicht. Tastendruck, Fensterlage, Speicherzugriff und Prozessende scheitern
samt und sonders mit Fehler 5. Der Weg fuehrt ausschliesslich ueber das Modul,
das IM Spiel laeuft. Dieses Werkzeug spricht mit ihm.
"""
import io
import os
import subprocess
import sys
import time

SPIEL  = r"C:\Program Files (x86)\Steam\steamapps\common\Stronghold Crusader Extreme"
EXE    = os.path.join(SPIEL, "Stronghold Crusader.exe")
BEFEHL = os.path.join(SPIEL, "ucp", "villagestudio", "befehl.json")
LOG    = os.path.join(SPIEL, "ucp3.log")

# Die PowerShell-Schnipsel als eigene Zeichenketten, damit sich die
# Anfuehrungszeichen nicht mit denen von Python beissen.
_VORN = ("Add-Type 'using System;using System.Runtime.InteropServices;"
         "public class Fv{[DllImport(\"user32.dll\")]public static extern IntPtr "
         "GetForegroundWindow();}'; [Fv]::GetForegroundWindow()")

# ShowWindow(9) NUR bei minimierten Fenstern: auf ein maximiertes angewandt
# macht es dieses klein. Am 01.09.2026 ist so Daniels Vollbild-Browser
# geschrumpft. Wer den Fokus zurueckgibt, laesst die Groesse in Ruhe.
_ZURUECK = ("Add-Type 'using System;using System.Runtime.InteropServices;"
            "public class Fz{[DllImport(\"user32.dll\")]public static extern bool "
            "SetForegroundWindow(IntPtr h);"
            "[DllImport(\"user32.dll\")]public static extern bool ShowWindow(IntPtr h,int c);"
            "[DllImport(\"user32.dll\")]public static extern bool IsIconic(IntPtr h);}'; "
            "$h=[IntPtr]{handle}; if ([Fz]::IsIconic($h)) { [void][Fz]::ShowWindow($h,9) }; "
            "[Fz]::SetForegroundWindow($h)")


def ps(befehl):
    return subprocess.run(["powershell", "-NoProfile", "-Command", befehl],
                          capture_output=True, text=True).stdout.strip()


def laeuft():
    """Anzahl der Spielprozesse als Zahl."""
    aus = ps("(Get-Process 'Stronghold Crusader' -ErrorAction SilentlyContinue "
             "| Measure-Object).Count")
    return int(aus) if aus.isdigit() else 0


def fenster():
    aus = ps("$p = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and "
             "$_.ProcessName -match 'Crusader' } | Select-Object -First 1; "
             "if ($p) { '{0}|{1}' -f $p.MainWindowHandle, $p.MainWindowTitle }")
    if "|" not in aus:
        return None, None
    h, t = aus.split("|", 1)
    return int(h), t.strip()


def fenstermodus(vollbild):
    """Stellt window.type in der ucp-config.yml.

    Nur der AKTIVE Block wird angefasst - weiter unten in derselben Datei
    steht noch die Vorgabenliste des Moduls, die gleich aussieht. Wer die
    erwischt, aendert nichts und sucht den Fehler woanders.
    """
    pfad = os.path.join(SPIEL, "ucp-config.yml")
    zeilen = io.open(pfad, encoding="utf-8").read().splitlines()
    start_i = next(i for i, z in enumerate(zeilen)
                   if z.strip() == "graphicsApiReplacer:")
    ende_i = next(i for i in range(start_i + 1, len(zeilen))
                  if zeilen[i].startswith("  plugins:"))
    ziel = "borderlessFullscreen" if vollbild else "window"
    geaendert = False
    for i in range(start_i, ende_i):
        if zeilen[i].strip() == "type:" and zeilen[i + 2].strip().startswith("value:"):
            if zeilen[i + 2].strip() != "value: " + ziel:
                zeilen[i + 2] = "              value: " + ziel
                geaendert = True
            break
    if geaendert:
        io.open(pfad, "w", encoding="utf-8",
                newline="\n").write("\n".join(zeilen) + "\n")
        print("Fenstermodus auf '%s' gestellt." % ziel)
    return geaendert


def schreibe(text):
    io.open(BEFEHL, "wb").write(text.encode("utf-8"))


def naechste_id():
    """Jeder Befehl braucht eine neue Nummer - ein byte-gleicher Inhalt gilt
    als schon erledigt und wird stillschweigend uebersprungen."""
    return int(time.time()) % 100000


def stop(leise=False):
    """Beendet das Spiel ueber das Modul.

    Von aussen geht das nicht: taskkill und Stop-Process scheitern mit
    Fehler 5. Das Modul ruft im Spiel ExitProcess (Import bei 0x0059E110).
    Ausgerechnet dieser Aufruf ist sicher, weil er nie zurueckkehrt - der
    Stapelschaden aus der falschen Aufrufart kann nicht mehr wirken.
    """
    if laeuft() == 0:
        if not leise:
            print("Es laeuft kein Spiel.")
        return True
    schreibe('{ "id": %d, "beenden": true }' % naechste_id())
    for _ in range(20):
        time.sleep(1)
        if laeuft() == 0:
            print("Spiel beendet.")
            return True
    print("Das Spiel liess sich nicht beenden. Steht es im Hauptmenue und ist der")
    print("Modulkern aelter als der 01.09.2026? Dann kennt er den Befehl nicht.")
    return False


def start(vollbild=False):
    """Startet das Spiel und gibt Daniel den Fokus zurueck."""
    fenstermodus(vollbild)
    if laeuft() > 0:
        print("Es laeuft schon eine Instanz - ich beende sie zuerst.")
        # Zwei Instanzen verfaelschen jede Messung: die zweite haengt im Dialog
        # "is already running", laedt UCP aber vollstaendig und schreibt
        # Logzeilen. Von aussen sieht das voellig gesund aus.
        if not stop(leise=True):
            return False

    schreibe("{}")          # ein alter Auftrag wuerde beim Start sofort feuern
    vorher = ps(_VORN).strip()

    subprocess.run(["powershell", "-NoProfile", "-Command",
                    "Start-Process -FilePath '%s' -ArgumentList '--ucp-no-security' "
                    "-WorkingDirectory '%s'" % (EXE, SPIEL)])

    hwnd = titel = None
    for _ in range(60):
        time.sleep(1)
        hwnd, titel = fenster()
        if hwnd:
            break
    if not hwnd:
        print("Kein Fenster erschienen.")
        return False
    if titel != "Crusader":
        print("Fenstertitel ist '%s' - das Spiel haengt in einem Dialog." % titel)
        return False

    # Warten, bis das Modul laeuft: vorher liest niemand die Befehlsdatei.
    for _ in range(60):
        try:
            if "villagestudio aktiv" in io.open(LOG, encoding="utf-8",
                                                errors="replace").read():
                break
        except OSError:
            pass
        time.sleep(1)
    else:
        print("Das Modul meldet sich nicht - lief der Start ohne --ucp-no-security?")
        return False

    # Daniels Fenster zurueckholen. Das Spielfenster wird dabei NICHT
    # angefasst - das ist gesperrt und hat schon dreimal den Prozess gekostet.
    if vorher and vorher != "0" and ps(_ZURUECK.replace("{handle}", vorher)).strip().lower() in ("true", "wahr"):
        print("Spiel laeuft im Hintergrund, dein Fenster ist wieder vorn.")
    else:
        print("Spiel laeuft. Den Fokus konnte ich nicht zurueckgeben - Alt+Tab.")
    return True


def eigenes(gegner=2, ki=1, karte="!KOphase Map 1", vollbild=False):
    """Startet das Spiel und setzt ein eigenes Gefecht auf."""
    if not start(vollbild):
        return False
    schreibe('{ "id": %d, "eigenesGefecht": true, "gegner": %d, "ki": %d, '
             '"karte": "%s" }' % (naechste_id(), gegner, ki, karte))
    print("Gefecht angefordert: %d Gegner (Typ %d) auf '%s'." % (gegner, ki, karte))

    for _ in range(40):
        time.sleep(2)
        try:
            text = io.open(LOG, encoding="utf-8", errors="replace").read()
        except OSError:
            continue
        if "GEFECHT: LaunchSkirmishGame zurueck" in text:
            print("Gefecht steht.")
            return True
    print("Das Gefecht kam nicht zustande - siehe ucp3.log.")
    return False


def main(argumente):
    was = argumente[0].lower() if argumente else ""
    schalter = [a.lower() for a in argumente[1:]]

    def wert(name, vorgabe):
        if name in schalter:
            i = schalter.index(name)
            if i + 1 < len(schalter):
                return schalter[i + 1]
        return vorgabe

    if was in ("stop", "beende", "beenden"):
        return stop()
    if was in ("start", "starte"):
        vollbild = "--vollbild" in schalter
        if "--eigenes" in schalter:
            return eigenes(gegner=int(wert("--gegner", 2)),
                           ki=int(wert("--ki", 1)),
                           karte=wert("--karte", "!KOphase Map 1"),
                           vollbild=vollbild)
        return start(vollbild)

    print(__doc__)
    return False


if __name__ == "__main__":
    sys.exit(0 if main(sys.argv[1:]) else 2)
