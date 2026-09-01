# -*- coding: utf-8 -*-
"""Schliesst, startet, wartet aufs Hauptmenue und macht ein Bild - mit Zeiten.

    python werkzeug/bis_menue.py

Jeder Schritt wird einzeln gestoppt, damit sichtbar ist, wo die Zeit hingeht.
Gemessen wird gegen Belege, nicht gegen Vermutungen:
  - "Modul laeuft"  = die Zeile 'villagestudio aktiv' steht im frischen Log
  - "im Hauptmenue" = currentMenuViewType (0x01FE7D1C) meldet 41
  - "Bild da"       = die BMP-Datei ist geschrieben und groesser als der Kopf

Warum enges Nachfragen: Der Menue-Haken liest die Befehlsdatei alle 20 Bilder,
also rund alle 0,3 Sekunden. Wer im Sekundentakt fragt, verschenkt jedes Mal
den groesseren Teil davon.
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
BILD   = os.path.join(SPIEL, "ucp", "villagestudio", "menue_test.bmp")

MENUEANSICHT = 0x01FE7D1C     # currentMenuViewType
MVT_MAIN_MENU = 41


# Wer hat den Tastaturfokus? Und wie gibt man ihn zurueck?
#
# Ein blosses SetForegroundWindow reicht NICHT: Windows erlaubt den Wechsel
# nur einem Prozess, der selbst gerade Eingabe hat. Aus einem Skript heraus
# gibt der Aufruf "false" zurueck und tut nichts. Der uebliche Ausweg ist,
# den eigenen Eingabe-Thread kurz an den des Vordergrundfensters zu haengen.
_VORN = ("Add-Type 'using System;using System.Runtime.InteropServices;"
         "public class Fv{[DllImport(\"user32.dll\")]public static extern IntPtr "
         "GetForegroundWindow();}'; [Fv]::GetForegroundWindow()")

_ZURUECK = (
    "Add-Type 'using System;using System.Runtime.InteropServices;"
    "public class Fz{"
    "[DllImport(\"user32.dll\")]public static extern IntPtr GetForegroundWindow();"
    "[DllImport(\"user32.dll\")]public static extern bool SetForegroundWindow(IntPtr h);"
    "[DllImport(\"user32.dll\")]public static extern bool IsWindow(IntPtr h);}'; "
    "$h=[IntPtr]{handle}; "
    "if (-not [Fz]::IsWindow($h)) { 'kein Fenster'; exit }; "
    # Bis zu acht Versuche INNERHALB eines Aufrufs. Jeder eigene
    # PowerShell-Start kostet eine halbe Sekunde - zehn davon sind sechs
    # Sekunden fuer etwas, das in einer halben zu haben ist.
    "for ($i=0; $i -lt 8; $i++) { "
    "  if ([Fz]::GetForegroundWindow() -eq $h) { break }; "
    "  [void][Fz]::SetForegroundWindow($h); "
    "  Start-Sleep -Milliseconds 120 }; "
    "[Fz]::GetForegroundWindow() -eq $h"
)


def ps(befehl):
    return subprocess.run(["powershell", "-NoProfile", "-Command", befehl],
                          capture_output=True, text=True,
                          errors="replace").stdout or ""


def wacht_an():
    """Senkt das Modul das Fenster? Dann gehoert der Fokus zurueck zu Daniel."""
    return not os.path.exists(os.path.join(SPIEL, "ucp", "villagestudio", "vorn.txt"))


def laeuft():
    # errors="replace": tasklist gibt Zeichen aus, die die Windows-Kodierung
    # nicht kennt - ohne das ist stdout None.
    aus = subprocess.run(
        ["tasklist", "/FI", "IMAGENAME eq Stronghold Crusader.exe", "/NH"],
        capture_output=True, text=True, errors="replace").stdout or ""
    return aus.count("Stronghold Crusader.exe")


def schreibe(text):
    io.open(BEFEHL, "wb").write(text.encode("utf-8"))


def log_text():
    try:
        return io.open(LOG, encoding="utf-8", errors="replace").read()
    except OSError:
        return ""


def nummer():
    return int(time.time() * 1000) % 100000


def schritt(name, uhr):
    jetzt = time.time()
    print("  %-28s %5.2f s" % (name, jetzt - uhr))
    return jetzt


def main():
    gesamt = time.time()
    uhr = gesamt
    print("Ablauf: schliessen -> starten -> Hauptmenue -> Bild")

    # 1. Schliessen
    if laeuft():
        schreibe('{ "id": %d, "beenden": true }' % nummer())
        for _ in range(300):
            if laeuft() == 0:
                break
            time.sleep(0.05)
    uhr = schritt("1. geschlossen", uhr)

    # Wer ist jetzt vorn? Erst NACH dem Schliessen fragen - vorher stuende hier
    # das alte Spielfenster, und am Ende versuchte man, ein laengst
    # geschlossenes Fenster zurueckzuholen. Genau daran ist die Rueckgabe am
    # 02.09.2026 gescheitert, bei sechs Sekunden vergeblicher Muehe.
    vorher_vorn = ps(_VORN).strip() if wacht_an() else ""

    # 2. Starten. Die Befehlsdatei vorher leeren, sonst feuert ein alter
    #    Auftrag sofort beim Start.
    schreibe("{}")
    # Das Log VOR dem Start loeschen. Es wird beim Spielstart ohnehin neu
    # angelegt - aber solange die alte Datei liegt, findet die Pruefung
    # "villagestudio aktiv" die Zeile des VORIGEN Laufs und meldet 0,00 s.
    # Genau das ist am 02.09.2026 passiert: ein Beleg, der nichts belegt.
    try:
        os.remove(LOG)
    except OSError:
        pass
    subprocess.run(["powershell", "-NoProfile", "-Command",
                    "Start-Process -FilePath '%s' -ArgumentList "
                    "'--ucp-no-security' -WorkingDirectory '%s'" % (EXE, SPIEL)])
    uhr = schritt("2. Startbefehl abgesetzt", uhr)

    # 3. Warten, bis das Modul laeuft. Das Log wird bei jedem Start neu
    #    angelegt - deshalb auf die Zeile warten, nicht auf die Dateigroesse.
    for _ in range(600):
        if "villagestudio aktiv" in log_text():
            break
        time.sleep(0.1)
    else:
        print("  Modul meldet sich nicht.")
        return 1
    uhr = schritt("3. Modul laeuft", uhr)

    # 4. Direkt ins Hauptmenue schalten, statt Logos und Vorspann abzuwarten.
    #    Die kosten rund 28 Sekunden, in denen nichts Nuetzliches passiert.
    #    switchToMenuView ist derselbe Weg, den das Spiel selbst geht.
    # Beides in EINEM Auftrag: erst umschalten, dann nachsehen. Getrennt
    # geschickt geht der erste verloren - der Modul-Poll liest die Datei nur
    # alle 20 Bilder, und der zweite Schreibvorgang ueberschreibt den ersten,
    # bevor er gelesen wurde. Genau das ist am 02.09.2026 passiert: der
    # Menuesprung kam nie an, ohne eine einzige Zeile im Log.
    ansicht = None
    for _ in range(300):
        schreibe('{ "befehle": [ { "id": %d, "menue": %d }, '
                 '{ "id": %d, "peek": %d, "worte": 1 } ] }'
                 % (nummer(), MVT_MAIN_MENU, nummer() + 1, MENUEANSICHT))
        time.sleep(0.25)
        zeilen = [z for z in log_text().splitlines() if "PEEK 0x01FE7D1C" in z]
        if zeilen:
            wert = zeilen[-1].split("PEEK 0x01FE7D1C: ")[1].split()[0]
            ansicht = int(wert, 16)
            if ansicht == MVT_MAIN_MENU:
                break
    if ansicht != MVT_MAIN_MENU:
        print("  Hauptmenue nicht erreicht, zuletzt Ansicht %s" % ansicht)
        return 1
    uhr = schritt("4. Hauptmenue (Ansicht 41)", uhr)

    # 5. Bild anfordern
    if os.path.exists(BILD):
        os.remove(BILD)
    schreibe('{ "id": %d, "bild": "menue", "datei": '
             '"ucp/villagestudio/menue_test.bmp" }' % nummer())
    for _ in range(300):
        if os.path.exists(BILD) and os.path.getsize(BILD) > 54:
            groesse = os.path.getsize(BILD)
            # Kurz warten, bis das Schreiben durch ist
            time.sleep(0.2)
            if os.path.getsize(BILD) == groesse:
                break
        time.sleep(0.1)
    else:
        print("  Kein Bild entstanden.")
        return 1
    uhr = schritt("5. Bild geschrieben", uhr)

    # 6. Fokus zurueckgeben, falls das Spiel im Hintergrund laufen soll
    if vorher_vorn and vorher_vorn != "0":
        ps(_ZURUECK.replace("{handle}", vorher_vorn))
        uhr = schritt("6. Fokus zurueckgegeben", uhr)

    print("  %-28s %5.2f s" % ("GESAMT", time.time() - gesamt))
    print("  Bild: %s (%.1f MB)" % (BILD, os.path.getsize(BILD) / 1048576))
    return 0


if __name__ == "__main__":
    sys.exit(main())
