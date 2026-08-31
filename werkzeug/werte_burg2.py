# -*- coding: utf-8 -*-
"""Wertet die Bauwacht-Mitschrift aus und entscheidet die Gegenprobe.

Die Frage: Warum fielen beim ersten Lauf (Burg_left_1) fuenf Bauschritte aus?
Burg_left_2 baut dieselben 450 Kacheln in umgekehrter Schrittreihenfolge.

    Gelaende      -> Ausfaelle bei Schritt 337, 322, 228, 107, 16
    Schrittnummer -> Ausfaelle bei Schritt 116, 131, 225, 346, 437
    keins von beiden -> es war Zufall

Diese drei Faelle stehen VOR der Messung fest. Was hier herauskommt, wird
nicht umgedeutet.

Grundlage: ein Bauschritt dauert belegte 50 Ticks (Burg_left_1, 445 Schritte
ohne eine einzige Abweichung). Ein ausgefallener Schritt verbraucht seinen
Tag trotzdem - er erscheint als Luecke von 100 statt 50 Ticks.

Aufruf: werte_burg2.py [rohdatei]
"""
import io, os, re, sys

HIER = os.path.dirname(os.path.abspath(__file__))
ROH = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HIER, "burg2_roh.txt")

VORHERSAGE = {
    "Gelaende":      [337, 322, 228, 107, 16],
    "Schrittnummer": [116, 131, 225, 346, 437],
}
TICKS_JE_SCHRITT = 50

if not os.path.exists(ROH):
    print("Rohdatei fehlt: " + ROH)
    sys.exit(1)

# "BAU Tick 12345 (+678 seit Start) | Mauern 12 -> 13 (+1) | Stufe 3 | ..."
muster = re.compile(r"BAU Tick (\d+).*?Mauern (\d+) -> (\d+)")
punkte = []
for zeile in io.open(ROH, encoding="utf-8", errors="replace"):
    m = muster.search(zeile)
    if m:
        punkte.append((int(m.group(1)), int(m.group(2)), int(m.group(3))))

if not punkte:
    print("Keine Baumeldungen in der Rohdatei - nichts auszuwerten.")
    sys.exit(1)

print("=" * 72)
print("BURG_LEFT_2 - Auswertung")
print("=" * 72)
print("%d Baumeldungen, Mauern von %d auf %d" % (len(punkte), punkte[0][1], punkte[-1][2]))
print("Erster Tick %d, letzter Tick %d" % (punkte[0][0], punkte[-1][0]))
print()

# --- Abstaende: bestaetigen sie die 50 Ticks? -------------------------------
abstaende = [punkte[i][0] - punkte[i - 1][0] for i in range(1, len(punkte))]
if abstaende:
    haeufig = {}
    for a in abstaende:
        haeufig[a] = haeufig.get(a, 0) + 1
    top = sorted(haeufig.items(), key=lambda x: -x[1])[:6]
    print("Haeufigste Abstaende zwischen zwei Bauten (Tick):")
    for a, n in top:
        marke = ""
        if abs(a - TICKS_JE_SCHRITT) <= 10:
            marke = "   <- ein Schritt"
        elif abs(a - 2 * TICKS_JE_SCHRITT) <= 10:
            marke = "   <- ZWEI Schritte, also einer ausgefallen"
        print("   %4d Ticks : %4dx%s" % (a, n, marke))
    print()

# --- Ausfaelle finden -------------------------------------------------------
# Der Bezugspunkt ist der erste gebaute Schritt. Seine Nummer kennen wir nicht
# sicher, deshalb wird relativ gezaehlt und am Ende beides gezeigt.
start = punkte[0][0]
luecken = []
for i in range(1, len(punkte)):
    d = punkte[i][0] - punkte[i - 1][0]
    fehlend = int(round(d / float(TICKS_JE_SCHRITT))) - 1
    if fehlend > 0:
        # Nummer relativ zum ersten gebauten Schritt
        nr = int(round((punkte[i - 1][0] - start) / float(TICKS_JE_SCHRITT))) + 2
        for k in range(fehlend):
            luecken.append((nr + k, punkte[i - 1][0] + (k + 1) * TICKS_JE_SCHRITT))

print("Ausgefallene Schritte: %d" % len(luecken))
for nr, t in luecken:
    print("   Schritt %4d (relativ)  bei Tick %d" % (nr, t))
print()

# --- Vergleich mit der Vorhersage ------------------------------------------
gefunden = set(nr for nr, _ in luecken)
print("=" * 72)
print("URTEIL")
print("=" * 72)
treffer = None
for name, erwartet in VORHERSAGE.items():
    e = set(erwartet)
    ueberschneidung = gefunden & e
    print("%-14s erwartet %s" % (name, sorted(e)))
    print("               getroffen %d von %d %s" % (
        len(ueberschneidung), len(e), sorted(ueberschneidung) if ueberschneidung else ""))
    if len(ueberschneidung) >= 3:
        treffer = name
print()
if treffer:
    print("-> %s erklaert die Ausfaelle." % treffer.upper())
elif not luecken:
    print("-> KEINE Ausfaelle. Beim ersten Lauf gab es fuenf - das widerlegt beide")
    print("   Erklaerungen und macht Zufall bzw. eine Bedingung des ersten Laufs")
    print("   (Gold, Tempo, Nachbarschaft) zur wahrscheinlichsten Ursache.")
else:
    print("-> WEDER NOCH. Die Ausfaelle liegen an anderen Nummern als beide")
    print("   Vorhersagen sagen. Damit sind Gelaende und Schrittnummer als")
    print("   alleinige Erklaerung widerlegt.")
print()
print("Achtung bei der Deutung: die Nummern oben sind RELATIV zum ersten")
print("gebauten Schritt. Faellt Schritt 1 selbst aus, verschiebt sich alles")
print("um eins - deshalb zaehlt die Ueberschneidung, nicht die exakte Zahl.")
