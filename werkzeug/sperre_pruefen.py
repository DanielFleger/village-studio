# -*- coding: utf-8 -*-
"""Totschlagtests fuer sperre.py - an einer ATTRAPPE, nie an einer echten Sperre.

Warum an einer Attrappe (05.10.2026, 20:15): eine Gegenprobe an der echten Sperre von
Instanz 2 hat den Eintrag einer anderen Sitzung ueberschrieben. Dieser Test lenkt
spielordner()/datei() in einen eigenen Temp-Ordner um; keine Instanz wird beruehrt.

Aufruf:   python werkzeug/sperre_pruefen.py             (prueft das aktuelle sperre.py)
          python werkzeug/sperre_pruefen.py <datei.py>  (prueft eine andere Fassung, z. B. die alte -
                                                          dort MUESSEN die Faelle 1, 2, 6 rot werden)
Rueckgabe: 0 = alle gruen, 1 = mindestens einer rot.
"""
import importlib.util, io, os, sys, tempfile, time

HIER = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HIER)


def lade(pfad):
    spec = importlib.util.spec_from_file_location("sperre_unter_test", pfad)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def main():
    pfad = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HIER, "sperre.py")
    s = lade(pfad)
    ordner = tempfile.mkdtemp(prefix="sperre_attrappe_")
    os.makedirs(os.path.join(ordner, "ucp", "villagestudio"))
    s.spielordner = lambda n=1: ordner                       # Attrappe statt Spielordner
    s.datei = lambda n=1: os.path.join(ordner, "ucp", "villagestudio", "wer_testet.txt")
    s.vorhandene = lambda: [2]
    datei = s.datei(2)

    def ruf(sitzung, *argv):
        for k in ("CLAUDE_CODE_HOST_SESSION_ID", "CLAUDE_CODE_SESSION_ID", "SHC_SITZUNG"):
            os.environ.pop(k, None)
        if sitzung:
            os.environ["CLAUDE_CODE_HOST_SESSION_ID"] = sitzung
        os.environ["SHC_INSTANZ"] = "2"
        sys.argv = ["sperre.py"] + list(argv)
        alt, sys.stdout = sys.stdout, io.StringIO()
        try:
            rc = s.main()
        finally:
            sys.stdout = alt
        return rc

    def inhalt():
        return io.open(datei, encoding="utf-8").read() if os.path.exists(datei) else None

    def alt_schreiben(name, zweck, vor_sek=0):
        io.open(datei, "w", encoding="utf-8").write("%s|%f|%s" % (name, time.time() - vor_sek, zweck))

    faelle = []
    def pruefe(nr, text, ok):
        faelle.append((nr, text, ok))
        print("%-4s %d %s" % ("OK" if ok else "ROT", nr, text))

    # 1 - der Fall vom 05.10.: andere Sitzung, GLEICHER Name -> muss belegt sein
    ruf("A", "holen", "villagestudio2", "gefecht.py pruefen")
    pruefe(1, "fremde Sitzung mit gleichem Namen bekommt die Sperre NICHT", ruf("B", "holen", "villagestudio2", "Probe") == 1)
    # 2 - fremde Sitzung darf sie nicht freigeben, Eintrag bleibt unveraendert
    vorher = inhalt()
    pruefe(2, "fremde Sitzung kann sie nicht freigeben, Eintrag unveraendert",
           ruf("B", "freigeben", "villagestudio2") == 1 and inhalt() == vorher and "gefecht.py pruefen" in (inhalt() or ""))
    # 3 - eigene Sitzung erneuert
    pruefe(3, "eigene Sitzung erneuert ihre Sperre", ruf("A", "holen", "villagestudio2", "zweiter Lauf") == 0 and "zweiter Lauf" in inhalt())
    # 4 - eigene Sitzung gibt frei
    pruefe(4, "eigene Sitzung gibt frei, Datei weg", ruf("A", "freigeben", "villagestudio2") == 0 and inhalt() is None)
    # 5 - alter Eintrag ohne Kennung: wie bisher am Namen
    alt_schreiben("villagestudio2", "alter Lauf")
    pruefe(5, "alter Eintrag: anderer Name belegt, gleicher Name erneuert",
           ruf("B", "holen", "SAI", "x") == 1 and ruf("B", "holen", "villagestudio2", "neu") == 0)
    ruf("B", "freigeben", "villagestudio2")
    # 6 - Aufrufer OHNE Kennung (Mensch, Codex) gegen Sperre MIT Kennung, gleicher Name -> belegt
    ruf("A", "holen", "villagestudio2", "Lauf A")
    pruefe(6, "ohne eigene Kennung gilt eine Sperre mit Kennung als fremd",
           ruf("", "holen", "villagestudio2", "Mensch") == 1 and ruf("", "freigeben", "villagestudio2") == 1)
    # 7 - vergessene Sperre (aelter als 30 Minuten) darf jeder uebernehmen
    io.open(datei, "w", encoding="utf-8").write("villagestudio2|%f|S=A|alt" % (time.time() - 31 * 60))
    pruefe(7, "vergessene Sperre (31 Minuten) darf eine andere Sitzung uebernehmen", ruf("B", "holen", "villagestudio2", "uebernommen") == 0)
    ruf("B", "freigeben", "villagestudio2")
    # 8 - Zweck mit | und Leser: Name und Alter wie frueher an Stelle 0 und 2
    ruf("A", "holen", "villagestudio2", "a|b")
    s.DATEI = datei
    e = s.lesen()
    pruefe(8, "Zweck mit | bleibt ganz; Name an Stelle 0, Alter an Stelle 2",
           e is not None and e[0] == "villagestudio2" and e[1] == "a|b" and e[2] < 5 and (len(e) < 4 or e[3] == "A"))
    ruf("A", "freigeben", "villagestudio2")
    # 9 - ein alter Leser (name|zeit|zweck) liest Name und Alter aus dem neuen Format richtig
    ruf("A", "holen", "villagestudio2", "Format")
    teile = inhalt().split("|", 2)
    pruefe(9, "alter Leser: Name und Zeit unveraendert lesbar", teile[0] == "villagestudio2" and abs(float(teile[1]) - time.time()) < 5)
    ruf("A", "freigeben", "villagestudio2")

    rot = [f for f in faelle if not f[2]]
    print("\n%d von %d gruen (%s)" % (len(faelle) - len(rot), len(faelle), os.path.basename(pfad)))
    return 1 if rot else 0


if __name__ == "__main__":
    sys.exit(main())
