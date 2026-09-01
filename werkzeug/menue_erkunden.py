# -*- coding: utf-8 -*-
"""Geht eine Menuefolge durch und haelt nach jedem Schritt Bild und Zustand fest.

    python werkzeug/menue_erkunden.py <name> <schritt> [<schritt> ...]

Ein Schritt ist entweder ein Knopfdruck oder eine Wartezeit:
    haupt:8      Knopf 8 im Hauptmenue
    opt:2        Knopf 2 im Optionen-Dialog
    laden:2      Knopf 2 im Laden-Dialog
    ja / nein    Ja/Nein-Dialog beantworten
    menue:41     direkt zu einer Ansicht schalten
    warte:2      zwei Sekunden warten

Nach JEDEM Schritt entsteht ein Bild und eine Zeile mit dem Zustand. Warum so
kleinteilig: Ein Menuesprung kann einen halbfertigen Zustand hinterlassen, der
erst zwei Schritte spaeter auffaellt - am 01.09.2026 fehlte nach einem
Gefechtsstart die halbe Oberflaeche, und im Bild davor war noch alles heil.

WICHTIG: Jeder Befehl geht als LISTE raus ({"befehle": [...]}). Der Menue-Haken
des Moduls prueft sonst auf einzelne Befehlsnamen und verwirft alles, was er
nicht kennt - schweigend, ohne eine Zeile im Log.
"""
import io
import os
import subprocess
import sys
import time

SPIEL  = r"C:\Program Files (x86)\Steam\steamapps\common\Stronghold Crusader Extreme"
BEFEHL = os.path.join(SPIEL, "ucp", "villagestudio", "befehl.json")
LOG    = os.path.join(SPIEL, "ucp3.log")
BILDER = r"C:\Users\danie\AppData\Local\Temp\claude\C--Users-danie\904277fa-cdd6-418f-bde7-0c6d7e053a73\scratchpad"

ANSICHT = 0x01FE7D1C      # currentMenuViewType
TICKS   = 0x0117CADC      # Spielzeit

# Ansichtsnummern, soweit belegt (aus dem Enum MenuViewType)
NAMEN = {
    0: "keine", 3: "Logos", 12: "Karteneditor", 14: "Baumenue",
    16: "Bau/Statusleiste", 20: "Lobby", 28: "Beschreibung", 30: "verloren",
    35: "Kartenwahl", 41: "Hauptmenue", 42: "Kampagnenwahl", 44: "Eigene Szenarien",
    45: "Abspann", 48: "Vorspann", 55: "Kreuzzug", 57: "Kreuzzugskarte",
    58: "Rangliste", 62: "Kreuzzug-Ende",
}


def laeuft():
    aus = subprocess.run(
        ["tasklist", "/FI", "IMAGENAME eq Stronghold Crusader.exe", "/NH"],
        capture_output=True, text=True, errors="replace").stdout or ""
    return aus.count("Stronghold Crusader.exe")


def log_text():
    try:
        return io.open(LOG, encoding="utf-8", errors="replace").read()
    except OSError:
        return ""


def schreibe(inhalt):
    io.open(BEFEHL, "wb").write(inhalt.encode("utf-8"))


def nummer():
    return int(time.time() * 1000) % 100000


def sende(*befehle):
    """Schickt Befehle als Liste - der einzige Weg, der im Menue ankommt."""
    teile = []
    for b in befehle:
        teile.append('{ "id": %d, %s }' % (nummer() + len(teile), b))
    schreibe('{ "befehle": [ %s ] }' % ", ".join(teile))


def peek(adresse, worte=1):
    """Liest Speicher und gibt den ersten Wert zurueck."""
    marke = "PEEK 0x%08X" % adresse
    vorher = log_text().count(marke)
    sende('"peek": %d, "worte": %d' % (adresse, worte))
    for _ in range(30):
        time.sleep(0.15)
        zeilen = [z for z in log_text().splitlines() if marke in z]
        if len(zeilen) > vorher:
            return int(zeilen[-1].split(marke + ": ")[1].split()[0], 16)
    return None


def bild(datei):
    ziel = os.path.join(SPIEL, "ucp", "villagestudio", datei)
    if os.path.exists(ziel):
        os.remove(ziel)
    sende('"bild": "menue", "datei": "ucp/villagestudio/%s"' % datei)
    for _ in range(60):
        time.sleep(0.15)
        if os.path.exists(ziel) and os.path.getsize(ziel) > 54:
            groesse = os.path.getsize(ziel)
            time.sleep(0.2)
            if os.path.getsize(ziel) == groesse:
                return ziel
    return None


def nach_png(bmp, name):
    """Wandelt das BMP in ein handliches PNG."""
    ziel = os.path.join(BILDER, name + ".png")
    werkzeug = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                            "..", "..", "..", "..", "..", "..")
    try:
        from PIL import Image
        im = Image.open(bmp)
        im.convert("RGB").resize((900, int(900 * im.height / im.width))).save(ziel)
        return ziel
    except Exception as e:
        print("    (PNG fehlgeschlagen: %s)" % e)
        return None


def zustand():
    a = peek(ANSICHT)
    t = peek(TICKS)
    return a, t


def schritt_ausfuehren(s):
    if s.startswith("haupt:"):
        sende('"hauptmenue": %s' % s.split(":")[1])
    elif s.startswith("opt:"):
        sende('"optionen": %s' % s.split(":")[1])
    elif s.startswith("unteropt:"):
        sende('"unteropt": %s' % s.split(":")[1])
    elif s.startswith("laden:"):
        sende('"laden": %s' % s.split(":")[1])
    elif s.startswith("menue:"):
        sende('"menue": %s' % s.split(":")[1])
    elif s == "ja":
        sende('"dialogJa": true')
    elif s == "nein":
        sende('"dialogJa": false')
    elif s.startswith("warte:"):
        time.sleep(float(s.split(":")[1]))
        return
    else:
        print("    unbekannter Schritt: %s" % s)
        return
    time.sleep(1.2)          # dem Spiel Zeit zum Umschalten geben


def main(argumente):
    if len(argumente) < 2:
        print(__doc__)
        return 2
    name, schritte = argumente[0], argumente[1:]

    if laeuft() == 0:
        print("Es laeuft kein Spiel.")
        return 1

    a, t = zustand()
    print("Start: Ansicht %s (%s), Spielzeit %s"
          % (a, NAMEN.get(a, "?"), t))

    for i, s in enumerate(schritte, 1):
        schritt_ausfuehren(s)
        if laeuft() == 0:
            print("  %d. %-12s -> SPIEL ABGESTUERZT" % (i, s))
            return 1
        a, t = zustand()
        datei = "%s_%d.bmp" % (name, i)
        bmp = bild(datei)
        png = nach_png(bmp, "%s_%d" % (name, i)) if bmp else None
        print("  %d. %-12s -> Ansicht %s (%s), Zeit %s%s"
              % (i, s, a, NAMEN.get(a, "?"), t,
                 "" if png else "   [KEIN BILD]"))

    print("Fertig. Bilder in %s" % BILDER)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
