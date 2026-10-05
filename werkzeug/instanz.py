# -*- coding: utf-8 -*-
"""Welche Spielinstanz, welcher Ordner, welcher Prozess, welches Fenster.

EINE Stelle fuer alle Python-Werkzeuge in VillageStudio (fuer PowerShell:
instanz.ps1, gleiche Regel). Seit 05.10.2026 laufen zwei Spiele gleichzeitig;
Instanz N liegt im Ordner "<Instanz 1> InstanzN". Gewaehlt wird mit der
Umgebungsvariable SHC_INSTANZ (ohne = 1). Selfaware-AI/werkzeug/befehl.py
traegt dieselbe Ordner-Regel; spiel.py dort prueft, dass beide gleich sind.

Erkannt wird ein Prozess an seinem Programmpfad, nicht am Namen und nicht am
Fenstertitel - beide Instanzen heissen "Stronghold Crusader" und ihre Fenster
"Crusader". Den Pfad liest Windows auch beim erhoehten Spiel heraus
(OpenProcess mit PROCESS_QUERY_LIMITED_INFORMATION, gemessen 05.10.2026:
Prozess 2604 erhoeht, Pfad lesbar, rund 60 ms fuer alles).

Aufruf:  python instanz.py      zeigt alle laufenden Spiele mit Instanz, Prozess, Fenster
"""
import ctypes, ctypes.wintypes as w, os, subprocess

STAMM = r"C:\Program Files (x86)\Steam\steamapps\common\Stronghold Crusader Extreme"
EXE = "Stronghold Crusader.exe"

_k32 = ctypes.WinDLL("kernel32", use_last_error=True)
_k32.OpenProcess.restype = w.HANDLE
_k32.OpenProcess.argtypes = [w.DWORD, w.BOOL, w.DWORD]
_k32.QueryFullProcessImageNameW.argtypes = [w.HANDLE, w.DWORD, w.LPWSTR, ctypes.POINTER(w.DWORD)]
_k32.CloseHandle.argtypes = [w.HANDLE]
_u32 = ctypes.WinDLL("user32", use_last_error=True)
_FENSTER_CB = ctypes.WINFUNCTYPE(w.BOOL, w.HWND, w.LPARAM)
_u32.EnumWindows.argtypes = [_FENSTER_CB, w.LPARAM]
_u32.GetWindowThreadProcessId.argtypes = [w.HWND, ctypes.POINTER(w.DWORD)]
_u32.GetWindow.restype = w.HWND
_u32.GetWindow.argtypes = [w.HWND, ctypes.c_uint]
_u32.IsWindowVisible.argtypes = [w.HWND]
_u32.GetWindowTextW.argtypes = [w.HWND, w.LPWSTR, ctypes.c_int]


def nummer(n=None):
    """Die gewaehlte Instanz: n, sonst SHC_INSTANZ, sonst 1. Unsinn bricht laut ab."""
    if n is None:
        roh = os.environ.get("SHC_INSTANZ", "").strip() or "1"
        if not roh.isdigit() or int(roh) < 1:
            raise ValueError("SHC_INSTANZ=%r ist keine Instanznummer (1, 2, ...)" % roh)
        n = int(roh)
    return int(n)


def spielordner(n=None):
    n = nummer(n)
    return STAMM if n == 1 else "%s Instanz%d" % (STAMM, n)


def vorhandene():
    return [n for n in range(1, 10) if os.path.isdir(spielordner(n))]


def programmpfad(pid):
    """Voller Pfad der exe zu einer Prozessnummer, oder None."""
    h = _k32.OpenProcess(0x1000, False, pid)          # PROCESS_QUERY_LIMITED_INFORMATION
    if not h:
        return None
    try:
        puffer, laenge = ctypes.create_unicode_buffer(1024), w.DWORD(1024)
        if _k32.QueryFullProcessImageNameW(h, 0, puffer, ctypes.byref(laenge)):
            return puffer.value
        return None
    finally:
        _k32.CloseHandle(h)


def alle():
    """Alle laufenden Spiele als Liste (pid, instanznummer oder None, ordner).
    tasklist statt PowerShell: antwortet in Millisekunden (Betriebsregeln)."""
    aus = subprocess.run(["tasklist", "/fi", "imagename eq " + EXE, "/fo", "csv", "/nh"],
                         capture_output=True, text=True, errors="replace").stdout or ""
    ordner_zu_nr = {os.path.normcase(spielordner(n)): n for n in vorhandene()}
    liste = []
    for z in aus.splitlines():
        teile = z.split('","')
        if len(teile) > 1 and teile[0].strip('"') == EXE and teile[1].isdigit():
            pid = int(teile[1])
            pfad = programmpfad(pid)
            ordner = os.path.dirname(pfad) if pfad else None
            liste.append((pid, ordner_zu_nr.get(os.path.normcase(ordner)) if ordner else None, ordner))
    return liste


def pids(n=None):
    """Prozessnummern der Spiele dieser Instanz (leer = laeuft nicht)."""
    n = nummer(n)
    return [pid for pid, nr, _ in alle() if nr == n]


def fenster(n=None):
    """Sichtbare Hauptfenster der Instanz als Liste (hwnd, titel, pid) - Fenster ohne
    Besitzer, wie Windows sie fuer MainWindowHandle nimmt. Haengt das Spiel im Dialog
    "already running", steht hier "Stronghold Crusader Error"."""
    meine = set(pids(n))
    gefunden = []
    if not meine:
        return gefunden

    def je_fenster(h, _):
        pid = w.DWORD()
        _u32.GetWindowThreadProcessId(h, ctypes.byref(pid))
        if pid.value in meine and _u32.IsWindowVisible(h) and not _u32.GetWindow(h, 4):   # 4 = GW_OWNER
            puffer = ctypes.create_unicode_buffer(256)
            _u32.GetWindowTextW(h, puffer, 256)
            gefunden.append((h, puffer.value, pid.value))
        return True

    _u32.EnumWindows(_FENSTER_CB(je_fenster), 0)
    return gefunden


def hauptfenster(n=None):
    """(hwnd, titel) des ersten Fensters der Instanz, oder (None, None)."""
    liste = fenster(n)
    return (liste[0][0], liste[0][1]) if liste else (None, None)


if __name__ == "__main__":
    spiele = alle()
    if not spiele:
        print("Kein Spiel laeuft.")
    for pid, nr, ordner in spiele:
        titel = ", ".join(t for _, t, p in fenster(nr) if p == pid) if nr else ""
        print("Instanz %s  Prozess %d  Fenster '%s'  %s" % (nr or "?", pid, titel, ordner or "(Pfad nicht lesbar)"))
