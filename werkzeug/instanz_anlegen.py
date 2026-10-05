# -*- coding: utf-8 -*-
"""Legt eine weitere Spielinstanz an (Kopie von Instanz 1), die neben Instanz 1 laeuft.

So entstand Instanz 2 am 05.10.2026 (Wissensstand 13q, Betriebsregeln
"Zwei Spielinstanzen gleichzeitig"). Drei Schritte:

  1. Spielordner kopieren - OHNE ucp3.log, ucp-pid-*, Sicherungen der
     ucp-config.yml, Bildschirmfotos (*.bmp, gut 570 MB), logik.lua.bak-*,
     wer_testet.txt, befehl.json und den Inhalt von abzug/ (Laufdaten von Instanz 1).
  2. In der Spieldatei der Kopie die Sperrmarke umbenennen: das Spiel prueft beim
     Start den festen Namen "Global\\FireflyStrongholdCrusadersExtreme" - eine Kopie
     ohne Umbenennung bleibt im Dialog "already running" haengen. Geaendert wird
     genau ein Byte: das letzte "e" wird zur Instanznummer ("...Extrem2").
  3. befehl.json = {} und ein leerer abzug/-Ordner.

Danach: instanz_abgleich.py haelt das Modul auf dem Stand von Instanz 1.
Rueckweg: den neuen Ordner wegschieben - Instanz 1 wird nirgends angefasst.

Aufruf:
    python instanz_anlegen.py 2          nur zeigen, was passieren wuerde
    python instanz_anlegen.py 2 --tun    anlegen (bricht ab, wenn der Ordner schon da ist)
    python instanz_anlegen.py --marke <spieldatei> <nummer>   nur Schritt 2 (z. B. an einer Kopie testen)
"""
import io, os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sperre import spielordner

MARKE = b"Global\\FireflyStrongholdCrusadersExtreme\x00"
SPIELDATEI = "Stronghold Crusader.exe"


def marke_umbenennen(exe, nummer):
    """Schritt 2. Gibt die Liste der geaenderten Byte-Stellen zurueck (muss genau eine sein)."""
    neu = MARKE[:-2] + str(nummer).encode() + b"\x00"
    assert len(neu) == len(MARKE) and 2 <= nummer <= 9
    b = open(exe, "rb").read()
    if b.count(neu) == 1 and b.count(MARKE) == 0:
        print("Sperrmarke ist schon umbenannt:", neu[:-1].decode())
        return []
    if b.count(MARKE) != 1:
        raise RuntimeError("Sperrmarke %d-mal gefunden statt einmal - andere Spielversion? Nichts geaendert."
                           % b.count(MARKE))
    i = b.find(MARKE)
    neu_b = b[:i] + neu + b[i + len(MARKE):]
    open(exe, "wb").write(neu_b)
    stellen = [hex(k) for k in range(len(b)) if b[k] != neu_b[k]]
    print("Sperrmarke umbenannt in %s, geaenderte Stelle(n): %s" % (neu[:-1].decode(), stellen))
    return stellen


def kopieren(quelle, ziel):
    """Schritt 1 und 3 - robocopy wie am 05.10. (Rueckgabe unter 8 = ohne Fehler)."""
    vs = "ucp\\villagestudio"
    # Kein Muster "ucp-config.yml.*": robocopy nahm damit auch ucp-config.yml selbst weg (05.10. gemessen).
    sicherungen = [f for f in os.listdir(quelle) if f.startswith("ucp-config.yml.")]
    l1 = ["robocopy", quelle, ziel, "/E", "/R:1", "/W:1", "/NP", "/NFL", "/NDL",
          "/XD", os.path.join(quelle, vs),
          "/XF", "ucp3.log", "ucp3-error-log.log", "ucp-pid-*", "RedirectPlay.log"] + sicherungen
    l2 = ["robocopy", os.path.join(quelle, vs), os.path.join(ziel, vs), "/E", "/R:1", "/W:1", "/NP", "/NFL", "/NDL",
          "/XD", os.path.join(quelle, vs, "abzug"), os.path.join(quelle, vs, "alt"),
          "/XF", "*.bmp", "logik.lua.bak-*", "wer_testet.txt", "befehl.json"]
    for befehl in (l1, l2):
        r = subprocess.run(befehl, capture_output=True, text=True, errors="replace")
        print("\n".join(z for z in r.stdout.splitlines() if "Dateien:" in z or "Files :" in z or "FEHLER" in z))
        if r.returncode >= 8:
            raise RuntimeError("robocopy meldet Fehler (Rueckgabe %d)" % r.returncode)
    os.makedirs(os.path.join(ziel, vs, "abzug"), exist_ok=True)
    io.open(os.path.join(ziel, vs, "befehl.json"), "wb").write(b"{}")
    if not os.path.exists(os.path.join(ziel, "ucp-config.yml")):
        raise RuntimeError("ucp-config.yml fehlt in der Kopie")


def main(argumente):
    if argumente[:1] == ["--marke"] and len(argumente) == 3:
        return 0 if len(marke_umbenennen(argumente[1], int(argumente[2]))) <= 1 else 1
    zahlen = [a for a in argumente if a.isdigit()]
    if not zahlen or not 2 <= int(zahlen[0]) <= 9:
        print(__doc__)
        return 2
    nummer = int(zahlen[0])
    quelle, ziel = spielordner(1), spielordner(nummer)
    print("Quelle: %s\nZiel  : %s" % (quelle, ziel))
    if os.path.exists(ziel):
        print("Den Ordner gibt es schon - nichts getan. Fuer den Modulstand: instanz_abgleich.py %d" % nummer)
        return 1
    if "--tun" not in argumente:
        print("Nur gezeigt. Anlegen mit:  python instanz_anlegen.py %d --tun" % nummer)
        return 0
    kopieren(quelle.replace("/", "\\"), ziel.replace("/", "\\"))
    stellen = marke_umbenennen(os.path.join(ziel, SPIELDATEI), nummer)
    if len(stellen) != 1:
        print("FEHLER: erwartet war genau eine geaenderte Stelle.")
        return 1
    print("Instanz %d angelegt. Starten: start_hinten.ps1 -Instanz %d, dann 'villagestudio aktiv' im ucp3.log pruefen."
          % (nummer, nummer))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
