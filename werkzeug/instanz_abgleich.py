# -*- coding: utf-8 -*-
"""Bringt eine Spielkopie (Instanz 2, 3, ...) auf den Modulstand von Instanz 1.

Warum es das gibt (05.10.2026): Instanz 2 hat ihr eigenes ucp/villagestudio -
sonst teilten sich beide Spiele befehl.json, ucp3.log und die Lagebilder. Der
Preis: Aendert jemand logik.lua in Instanz 1, laeuft Instanz 2 still mit dem
alten Stand weiter. Ein Testlauf dort misst dann eine KI, die es nicht mehr gibt.

Instanz 1 ist die Quelle - dort arbeitet die Lua-Sitzung. Abgeglichen wird nur,
was zum Modul gehoert:
    ucp/villagestudio/*.lua, *.json (ohne befehl.json)   logik.lua wird im Lauf neu geladen
    ucp/villagestudio/aiv/                                eigene Bauplaene
    ucp/modules/villagestudio-0.1.0/                      init.lua - wirkt erst nach Neustart
Nie: befehl.json, abzug/, wer_testet.txt, Bilder, ucp3.log.
ucp-config.yml nur mit --mit-config (die Datei hat einen Schreiber zur Zeit).

Jede ersetzte Datei der Zielinstanz wandert vorher nach
ucp/villagestudio/alt/<zeitstempel>/ - das ist der Rueckweg.

Schutz: logik.lua neu zu laden loescht alle Dauerauftraege der laufenden
Partie (Betriebsregel 7). Deshalb wird nur kopiert, wenn die Sperre der
Zielinstanz frei ist oder dem gehoert, der mit --als genannt ist.

Aufruf:
    python instanz_abgleich.py [ziel]                       nur zeigen, was abweicht (ziel: Vorgabe 2)
    python instanz_abgleich.py 2 --tun --als villagestudio2  abgleichen
    ... --mit-config                                        auch ucp-config.yml

Rueckgabe: 0 = gleich bzw. abgeglichen, 1 = Abweichung (nur gezeigt) oder gesperrt, 2 = falscher Aufruf.
"""
import hashlib, os, shutil, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sperre


def pruefsumme(pfad):
    return hashlib.sha256(open(pfad, "rb").read()).hexdigest()


def modul_dateien(wurzel, mit_config):
    """Relative Pfade aller Modul-Dateien in der Quelle."""
    liste = []
    vs = os.path.join(wurzel, "ucp", "villagestudio")
    for f in sorted(os.listdir(vs)):
        voll = os.path.join(vs, f)
        if os.path.isfile(voll) and f != "befehl.json" and os.path.splitext(f)[1] in (".lua", ".json"):
            liste.append("ucp/villagestudio/" + f)
    for teil in ("ucp/villagestudio/aiv", "ucp/modules/villagestudio-0.1.0"):
        basis = os.path.join(wurzel, teil)
        for ordner, _, dateien in os.walk(basis):
            for f in sorted(dateien):
                rel = os.path.relpath(os.path.join(ordner, f), wurzel).replace("\\", "/")
                liste.append(rel)
    if mit_config:
        liste.append("ucp-config.yml")
    return liste


def main(argumente):
    tun = "--tun" in argumente
    mit_config = "--mit-config" in argumente
    als = ""
    if "--als" in argumente:
        i = argumente.index("--als")
        als = argumente[i + 1] if i + 1 < len(argumente) else ""
    zahlen = [a for a in argumente if a.isdigit()]
    ziel = int(zahlen[0]) if zahlen else 2
    if ziel < 2:
        print("Ziel muss eine Kopie sein (2, 3, ...) - Instanz 1 ist die Quelle.")
        return 2

    quelle, zielordner = sperre.spielordner(1), sperre.spielordner(ziel)
    if not os.path.isdir(zielordner):
        print("Instanz %d gibt es nicht: %s" % (ziel, zielordner))
        return 2

    abweichend = []
    for rel in modul_dateien(quelle, mit_config):
        q, z = os.path.join(quelle, rel), os.path.join(zielordner, rel)
        if not os.path.exists(z):
            abweichend.append((rel, "fehlt in Instanz %d" % ziel))
        elif pruefsumme(q) != pruefsumme(z):
            alter = (os.path.getmtime(q) - os.path.getmtime(z)) / 60
            abweichend.append((rel, "anders (Quelle %+.0f min neuer)" % alter))

    print("Instanz 1 -> Instanz %d: %d Modul-Dateien weichen ab." % (ziel, len(abweichend)))
    for rel, grund in abweichend:
        print("   %-55s %s" % (rel, grund))
    if not abweichend:
        return 0
    if not tun:
        print("Nur gezeigt. Abgleichen mit:  python instanz_abgleich.py %d --tun --als villagestudio%d" % (ziel, ziel))
        return 1

    sperre.DATEI = sperre.datei(ziel)
    eintrag = sperre.lesen()
    if eintrag is not None and eintrag[2] <= sperre.ALTER and eintrag[0] != als:
        print("GESPERRT: die Sperre von Instanz %d gehoert %s (%s) - nichts kopiert." % (ziel, eintrag[0], eintrag[1]))
        print("logik.lua neu zu laden wuerde deren laufende Partie stoeren.")
        return 1

    stempel = time.strftime("%Y%m%d-%H%M%S")
    alt = os.path.join(zielordner, "ucp", "villagestudio", "alt", stempel)
    for rel, _ in abweichend:
        q, z = os.path.join(quelle, rel), os.path.join(zielordner, rel)
        if os.path.exists(z):
            sicherung = os.path.join(alt, rel)
            os.makedirs(os.path.dirname(sicherung), exist_ok=True)
            shutil.move(z, sicherung)
        os.makedirs(os.path.dirname(z), exist_ok=True)
        shutil.copy2(q, z)
        if pruefsumme(q) != pruefsumme(z):
            print("FEHLER: %s nach dem Kopieren nicht gleich." % rel)
            return 1
    print("Abgeglichen: %d Dateien. Alter Stand liegt in %s" % (len(abweichend), alt))
    if any(r.startswith("ucp/modules/") or r == "ucp-config.yml" for r, _ in abweichend):
        print("Achtung: init.lua bzw. ucp-config.yml wirken erst nach einem Neustart von Instanz %d." % ziel)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
