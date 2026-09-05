# -*- coding: utf-8 -*-
"""Faehrt den Burg_left_2-Lauf komplett allein.

Die Frage: Warum fielen beim ersten Lauf (Burg_left_1) fuenf Bauschritte aus?
Burg_left_2 hat DIESELBEN 450 Kacheln, aber die Bauschritte in umgekehrter
Reihenfolge. Damit schliessen sich die beiden Erklaerungen aus:

    Gelaende      -> Ausfaelle bei Schritt 337, 322, 228, 107, 16
    Schrittnummer -> Ausfaelle bei Schritt 116, 131, 225, 346, 437

Kommt etwas Drittes heraus, war keine von beiden richtig - dann ist es Zufall.

Diese Vorhersage steht VOR der Messung fest (doku/Wissensstand.md).

Kein Fenster, kein Fokus, keine Maus: alles laeuft ueber befehl.json und
ucp3.log.
"""
import io, os, sys, time, subprocess, glob

BASE = r"C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme"
EXE  = BASE + "/Stronghold Crusader.exe"
CMD  = BASE + "/ucp/villagestudio/befehl.json"
LOG  = BASE + "/ucp3.log"

SPIELER   = int(sys.argv[1]) if len(sys.argv) > 1 else 2
AIV       = sys.argv[2] if len(sys.argv) > 2 else "Burg_left_2.aiv"
BAUZEIT   = int(sys.argv[3]) if len(sys.argv) > 3 else 300   # Sekunden zuschauen
ABSTAND   = 10                                               # Pruefabstand in Ticks


def ps(befehl):
    """PowerShell-Einzeiler ausfuehren und Ausgabe zurueckgeben."""
    r = subprocess.run(["powershell", "-NoProfile", "-Command", befehl],
                       capture_output=True, text=True)
    return r.stdout.strip()


def prozesse_weg():
    # Ueber Get-Process, nicht ueber taskkill: der Prozessname enthaelt ein
    # Leerzeichen, und taskkill meldet Erfolg, auch wenn nichts getroffen wurde.
    ps('Get-Process | Where-Object { $_.ProcessName -match "Stronghold|Crusader" } '
       '| ForEach-Object { try { $_.Kill() } catch {} }')
    time.sleep(3)
    for f in glob.glob(BASE + "/ucp-pid-*"):
        try: os.remove(f)
        except OSError: pass


def instanzen():
    """Zahl der laufenden Spielprozesse. Ueber tasklist gezaehlt kam hier
    Unsinn heraus - der Filterkopf enthaelt den Namen selbst."""
    a = ps('(Get-Process | Where-Object { $_.ProcessName -match "Crusader" } '
           '| Measure-Object).Count')
    try:
        return int(a)
    except ValueError:
        return -1


def fenstertitel():
    return ps('(Get-Process | Where-Object { $_.ProcessName -match "Crusader" } '
              '| ForEach-Object { $_.MainWindowTitle }) -join ", "')


def befehl(text, warte=6):
    open(CMD, "wb").write(text.encode("utf-8"))
    time.sleep(warte)


def logstand():
    return os.path.getsize(LOG)


def logseit(pos, filter_=None):
    with io.open(LOG, encoding="utf-8", errors="replace") as f:
        f.seek(pos)
        roh = f.read()
    zeilen = [z.split("| ")[-1].strip() for z in roh.splitlines() if "villagestudio" in z]
    if filter_:
        zeilen = [z for z in zeilen if filter_ in z]
    return zeilen


print("=" * 70)
print("BURG_LEFT_2 - Gegenprobe Gelaende gegen Schrittnummer")
print("=" * 70)
print("Vorhersage steht fest:")
print("   Gelaende      -> Ausfaelle bei Schritt 337, 322, 228, 107, 16")
print("   Schrittnummer -> Ausfaelle bei Schritt 116, 131, 225, 346, 437")
print()

# --- 0. Testsperre ----------------------------------------------------------
# Zwei Sitzungen duerfen das Spiel nie gleichzeitig fahren: die zweite Instanz
# haengt im Dialog, schreibt aber Logzeilen, und ucp3.log wird bei jedem Start
# neu angelegt. Am 31.08. hat genau das einen Lauf zerstoert.
SPERRE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sperre.py")
if not os.path.exists(SPERRE):
    SPERRE = (r"%USERPROFILE%/Documents/PC_Affe/Games/Stronghold_Crusader/"
              r"Stronghold Crusader Modding/Tools/VillageStudio/werkzeug/sperre.py")
NAME = "villagestudio"

r = subprocess.run([sys.executable, SPERRE, "holen", NAME, "Burg_left_2-Lauf"],
                   capture_output=True, text=True)
print(r.stdout.strip())
if r.returncode != 0:
    sys.exit(1)


def sperre_frei():
    subprocess.run([sys.executable, SPERRE, "freigeben", NAME], capture_output=True)


# --- 1. sauber starten ------------------------------------------------------
print("[1] alte Instanzen beenden ...")
prozesse_weg()
open(CMD, "wb").write(b'{ "id": 0 }')

print("[2] Spiel starten (Entwicklermodus) ...")
# Ueber PowerShell starten: ein direktes Popen scheitert an
# "WinError 740 - erfordert erhoehte Rechte", Start-Process kommt damit klar.
subprocess.run(["powershell", "-NoProfile", "-Command",
                'Start-Process -FilePath "%s" -ArgumentList "--ucp-no-security" '
                '-WorkingDirectory "%s"' % (EXE.replace("/", "\\"), BASE.replace("/", "\\"))],
               capture_output=True)
time.sleep(16)
n = instanzen()
titel = fenstertitel()
print("    laufende Instanzen: %d   Fenstertitel: %s" % (n, titel or "(keiner)"))
if n != 1:
    print("    ABBRUCH: es muss genau eine sein (Mehrfachinstanzen verfaelschen jede Messung).")
    prozesse_weg()
    sperre_frei()
    sys.exit(1)
if "Crusader" not in titel or "FATAL" in titel or "Error" in titel:
    print("    ABBRUCH: das Fenster haengt in einem Dialog, das Spiel kommt nie ins Menue.")
    prozesse_weg()
    sperre_frei()
    sys.exit(1)

pos = logstand()
if not logseit(0, "villagestudio aktiv"):
    print("    ABBRUCH: 'villagestudio aktiv' fehlt im Log - das Modul laeuft nicht.")
    sperre_frei()
    sys.exit(1)
print("    Modul aktiv.")

# --- 2. Gefecht ------------------------------------------------------------
print("[3] Gefecht starten (Gefechtspfad-Mission 0) ...")
pos = logstand()
befehl('{ "id": 30001, "gefecht": 0 }', 25)
menue = logseit(pos, "MENUE")
for z in menue:
    print("    " + z)
if not any("starte Gefechtspfad" in z for z in menue):
    print("    ABBRUCH: der Gefechtsbefehl kam nicht an. Letzte Logzeilen:")
    for z in logseit(pos)[-6:]:
        if "Aufruf Nr." not in z:
            print("      " + z)
    sperre_frei()
    sys.exit(1)

# --- 3. Messbedingungen ----------------------------------------------------
print("[4] Messbedingungen setzen ...")
pos = logstand()
befehl('{ "id": 30002, "player": %d, "gold": 50000 }' % SPIELER, 5)
befehl('{ "id": 30003, "tempo": 100 }', 5)
for z in logseit(pos):
    if "Aufruf Nr." not in z:
        print("    " + z)

# --- 4. Messburg laden -----------------------------------------------------
print("[5] Messburg %s auf Spieler %d ..." % (AIV, SPIELER))
pos = logstand()
befehl('{ "id": 30004, "player": %d, "file": "%s" }' % (SPIELER, AIV), 12)
for z in logseit(pos):
    if "Aufruf Nr." not in z:
        print("    " + z)

# --- 5. Bauwacht -----------------------------------------------------------
print("[6] Bauwacht an, %d Sekunden zuschauen ..." % BAUZEIT)
pos = logstand()
befehl('{ "id": 30005, "player": %d, "bauwacht": %d }' % (SPIELER, ABSTAND), 4)
for z in logseit(pos, "BAUWACHT"):
    print("    " + z)

start = time.time()
while time.time() - start < BAUZEIT:
    time.sleep(20)
    n = len(logseit(pos, "BAU Tick"))
    print("    ... %3d s: %d Baumeldungen" % (int(time.time() - start), n))
    if instanzen() != 1:
        print("    Spiel ist weg - Abbruch.")
        break

# --- 6. Auswertung ---------------------------------------------------------
print()
print("=" * 70)
zeilen = logseit(pos, "BAU Tick")
print("AUSWERTUNG: %d Baumeldungen" % len(zeilen))
ziel = os.path.join(os.path.dirname(os.path.abspath(__file__)), "burg2_roh.txt")
io.open(ziel, "w", encoding="utf-8").write("\n".join(zeilen))
print("Rohdaten: " + ziel)
for z in zeilen[:8]:
    print("   " + z)
if len(zeilen) > 16:
    print("   ...")
for z in zeilen[-8:]:
    print("   " + z)

sperre_frei()
print("Sperre freigegeben.")
