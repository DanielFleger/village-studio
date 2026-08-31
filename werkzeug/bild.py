# -*- coding: utf-8 -*-
"""Macht ein Bild vom Spiel - auch wenn das Fenster verdeckt ist oder im
Hintergrund liegt. Prueft nach JEDEM Schritt, ob das Fenster noch da ist.

    1. Spiel offen?      nein -> starten, nochmal pruefen
    2. Bild anfordern    (das Spiel schreibt es selbst)
    3. Bild fertig?      auf die Dateigroesse warten, nicht auf eine Logzeile
    4. brauchbar?        BMP-Kopf, vollstaendige Groesse

Warum das Spiel es selbst schreibt: Stronghold zeichnet mit DirectDraw. Ueber
GDI kommt man nicht an das Bild - PrintWindow (Flag 0x2 und 0) und BitBlt vom
Fenster-DC liefern nur den leeren Rahmen. Ein Bildschirmfoto zeigt, was gerade
VOR dem Fenster liegt; am 31.08. kam so zweimal ein fremdes Fenster heraus.

takeScreenshot (0x00479540) liest aus der internen DirectDraw-Flaeche, die es
vorher selbst zusammensetzt. Sichtbarkeit, Fokus und Fensterreihenfolge sind
dabei egal.

Die Datei landet im DOKUMENTE-Ordner, nicht im Spielordner:
    Dokumente/Stronghold Crusader/screen_capture_NNN.bmp

Der Aufruf ist langsam: die Funktion schreibt je Farbkanal einen einzelnen
Schreibaufruf, bei 1600x900 also 4,3 Millionen. Waehrenddessen steht das Bild
still - das Spiel sieht eingefroren aus, ist es aber nicht.

Aufruf: bild.py [zielpfad]
"""
import io, os, sys, time, glob, shutil, subprocess

BASE = r"C:/Program Files (x86)/Steam/steamapps/common/Stronghold Crusader Extreme"
EXE  = BASE + "/Stronghold Crusader.exe"
CMD  = BASE + "/ucp/villagestudio/befehl.json"
DOKU = os.path.expanduser("~/Documents/Stronghold Crusader")
HIER = os.path.dirname(os.path.abspath(__file__))
ZIEL = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HIER, "spiel.png")


def ps(b):
    r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", b],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    fehler = (r.stderr or "").strip()
    if fehler:
        print("      [PowerShell] " + fehler.splitlines()[0][:160])
    return (r.stdout or "").strip()


def offen():
    """Zaehlt FENSTER, nicht Prozesse. Die exe startet einen Kindprozess ohne
    Fenster - wer Prozesse zaehlt, sieht zwei und haelt das faelschlich fuer
    zwei laufende Spiele."""
    a = ps('$p = @(Get-Process | Where-Object { $_.ProcessName -match "Crusader" '
           '-and $_.MainWindowTitle -ne "" }); '
           '"$($p.Count)|" + (($p | ForEach-Object { $_.MainWindowTitle }) -join ",")')
    teile = a.split("|", 1)
    try:
        n = int(teile[0])
    except (ValueError, IndexError):
        n = 0
    return n, (teile[1] if len(teile) > 1 else "")


def prozess_laeuft():
    """Nur der Prozess, ohne Fenstertitel. Waehrend takeScreenshot schreibt,
    blockiert der Renderfaden - Windows meldet dann keinen Fenstertitel mehr,
    obwohl das Spiel laeuft. Wer in dieser Zeit den Titel prueft, haelt das
    Spiel faelschlich fuer beendet."""
    a = ps('(Get-Process | Where-Object { $_.ProcessName -match "Crusader" } '
           '| Measure-Object).Count')
    try:
        return int(a) > 0
    except ValueError:
        return False


def pruefe(schritt):
    n, titel = offen()
    if n == 0:
        print("    [%s] FENSTER WEG - Abbruch." % schritt)
        return False
    if "FATAL" in titel or "Error" in titel:
        print("    [%s] Fenster haengt in einem Dialog (%s) - Abbruch." % (schritt, titel))
        return False
    if n > 1:
        print("    [%s] %d Instanzen - Messung waere wertlos, Abbruch." % (schritt, n))
        return False
    return True


def starten():
    ps('Get-Process | Where-Object { $_.ProcessName -match "Stronghold|Crusader" } '
       '| ForEach-Object { try { $_.Kill() } catch {} }')
    time.sleep(3)
    for f in glob.glob(BASE + "/ucp-pid-*"):
        try: os.remove(f)
        except OSError: pass
    open(CMD, "wb").write(b'{ "id": 0 }')
    # Merken, welches Fenster gerade vorn ist - dorthin geht der Fokus zurueck.
    ps('Start-Process -FilePath "%s" -ArgumentList "--ucp-no-security" -WorkingDirectory "%s"'
       % (EXE.replace("/", "\\"), BASE.replace("/", "\\")))
    time.sleep(16)
    nach_hinten()


def nach_hinten():
    """Schiebt das Spielfenster ganz nach hinten, ohne es zu schliessen oder
    zu minimieren. Fuer das Bild ist das egal - takeScreenshot liest aus der
    DirectDraw-Flaeche, nicht vom Bildschirm. Daniel arbeitet ungestoert
    weiter."""
    aus = ps('''Add-Type @"
using System;using System.Runtime.InteropServices;
public class HB {
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr nach,
      int x, int y, int w, int hh, uint f);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  public static readonly IntPtr HWND_BOTTOM = (IntPtr)1;
  public const uint NOSIZE = 0x1, NOMOVE = 0x2, NOACTIVATE = 0x10;
}
"@
$vorher = [HB]::GetForegroundWindow()
$p = Get-Process | Where-Object { $_.MainWindowTitle -eq "Crusader" } | Select-Object -First 1
if ($p) {
  [HB]::SetWindowPos($p.MainWindowHandle, [HB]::HWND_BOTTOM, 0, 0, 0, 0,
                     [HB]::NOSIZE -bor [HB]::NOMOVE -bor [HB]::NOACTIVATE) | Out-Null
  if ($vorher -ne [IntPtr]::Zero -and $vorher -ne $p.MainWindowHandle) {
    [HB]::SetForegroundWindow($vorher) | Out-Null
  }
  "nach hinten geschoben"
} else { "kein Fenster" }''')
    print("    " + aus)


print("[1] Spiel offen?")
n, titel = offen()
print("    %d Instanz(en), Titel: %s" % (n, titel or "(keiner)"))
if n != 1 or "Crusader" not in titel or "FATAL" in titel or "Error" in titel:
    print("    -> starte neu")
    starten()
    n, titel = offen()
    print("    %d Instanz(en), Titel: %s" % (n, titel or "(keiner)"))
if not pruefe("nach Schritt 1"):
    sys.exit(1)

print("[2] Laeuft ein Gefecht?")
# Der Foto-Befehl haengt am Spieltick, und der tickt nur im Gefecht. Im
# Zeichenhaken darf takeScreenshot nicht laufen - es zeichnet selbst, und der
# Wiedereintritt zerlegt den Prozess (gemessen am 31.08.).
LOG = BASE + "/ucp3.log"


def spielzeit():
    """Ticks aus der letzten Zustandsmeldung im Log."""
    try:
        with io.open(LOG, encoding="utf-8", errors="replace") as f:
            roh = f.read()
    except OSError:
        return -1
    import re
    treffer = re.findall(r"Spielzeit (\d+) Ticks", roh)
    return int(treffer[-1]) if treffer else -1


t = spielzeit()
print("    letzte gemeldete Spielzeit: %s Ticks" % t)
if t <= 0:
    print("    -> starte ein Gefecht (Gefechtspfad-Mission 0)")
    open(CMD, "wb").write(('{ "id": %d, "gefecht": 0 }'
                           % (int(time.time()) % 900000)).encode("utf-8"))
    for i in range(15):
        time.sleep(4)
        if not prozess_laeuft():
            print("    Prozess weg - Abbruch.")
            sys.exit(1)
        t = spielzeit()
        if t > 0:
            print("    Gefecht laeuft (Tick %d) nach %d s" % (t, (i + 1) * 4))
            break
    else:
        print("    Kein Gefecht zustande gekommen - Abbruch.")
        sys.exit(1)
if not pruefe("nach Schritt 2"):
    sys.exit(1)

print("[3] Bild anfordern")
nr = 1
datei = os.path.join(DOKU, "screen_capture_%03d.bmp" % nr)
if os.path.exists(datei):
    try:
        os.remove(datei)          # sonst haelt man die alte Fassung fuer neu
        print("    alte Datei entfernt")
    except OSError as e:
        print("    alte Datei nicht loeschbar: %s" % e)

open(CMD, "wb").write(('{ "id": %d, "foto": %d }'
                       % (int(time.time()) % 90000, nr)).encode("utf-8"))
print("    Befehl abgesetzt, Ziel: %s" % datei)
if not prozess_laeuft():
    print("    Prozess weg - Abbruch.")
    sys.exit(1)

print("[4] Warten, bis die Datei fertig ist")
# Fertig heisst: die Groesse aendert sich nicht mehr. Auf eine Logzeile zu
# warten reicht nicht - die kommt, bevor der Schreibstrom geleert ist.
letzte, ruhig, start = -1, 0, time.time()
while time.time() - start < 120:
    time.sleep(2)
    gr = os.path.getsize(datei) if os.path.exists(datei) else 0
    if gr != letzte:
        print("    %5.1f s: %d Byte" % (time.time() - start, gr))
        ruhig = 0
    elif gr > 0:
        ruhig += 1
        if ruhig >= 3:
            break
    letzte = gr
    if not prozess_laeuft():
        print("    Prozess weg - Abbruch.")
        sys.exit(1)

if not os.path.exists(datei) or os.path.getsize(datei) == 0:
    print("    Datei fehlt oder ist leer - Abbruch.")
    sys.exit(1)

print("[5] Bild brauchbar?")
gr = os.path.getsize(datei)
kopf = open(datei, "rb").read(54)
if len(kopf) < 26 or kopf[:2] != b"BM":
    print("    kein BMP-Kopf - Abbruch.")
    sys.exit(1)
breite = int.from_bytes(kopf[18:22], "little")
hoehe = int.from_bytes(kopf[22:26], "little")
soll = 0x36 + breite * hoehe * 3
print("    %dx%d, %d Byte (erwartet %d)" % (breite, hoehe, gr, soll))
if gr < soll:
    print("    -> unvollstaendig.")
    sys.exit(1)

ziel_bmp = os.path.splitext(ZIEL)[0] + ".bmp"
shutil.copy2(datei, ziel_bmp)
umgewandelt = ps('Add-Type -AssemblyName System.Drawing; '
                 '$b=[System.Drawing.Bitmap]::FromFile("%s"); '
                 '$b.Save("%s",[System.Drawing.Imaging.ImageFormat]::Png); '
                 '$w=$b.Width; $h=$b.Height; $b.Dispose(); "$w x $h"'
                 % (ziel_bmp.replace("/", "\\"), ZIEL.replace("/", "\\")))
print("    umgewandelt: %s -> %s" % (umgewandelt, ZIEL))

if not pruefe("nach Schritt 5"):
    sys.exit(1)
print("[6] Fenster steht noch. Fertig.")
