# Legt das Spielfenster ganz unten in den Fensterstapel - ohne es anzufassen.
#
# Warum der Umweg: SetWindowPos auf das SPIEL scheitert mit Fehler 5, weil der
# Prozess auf hoher Rechtestufe laeuft. Auf Daniels eigene Fenster darf man es
# dagegen anwenden. Holt man alle anderen sichtbaren Fenster in ihrer
# bisherigen Reihenfolge wieder nach vorn, rutscht das Spiel von selbst nach
# ganz unten - und Daniels Reihenfolge bleibt erhalten.
#
# SWP_NOACTIVATE ist dabei Pflicht: Sonst wandert der Tastaturfokus mit, und
# das Fenster, in dem Daniel gerade tippt, verliert ihn.

Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public class St {
  [DllImport("user32.dll")] public static extern IntPtr GetTopWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h, uint c);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int c);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr h);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool SetWindowPos(IntPtr h, IntPtr nach, int x, int y, int cx, int cy, uint f);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
"@

function Fensterstapel {
    # Sichtbare Fenster mit Titel, von oben nach unten
    $liste = @()
    $w = [St]::GetTopWindow([IntPtr]::Zero)
    while ($w -ne [IntPtr]::Zero) {
        if ([St]::IsWindowVisible($w) -and -not [St]::IsIconic($w) -and [St]::GetWindowTextLength($w) -gt 0) {
            $sb = New-Object -TypeName System.Text.StringBuilder -ArgumentList 300
            [void][St]::GetWindowText($w, $sb, 300)
            # "Program Manager" ist der Windows-Desktop. Er liegt immer ganz
            # unten und laesst sich nicht verschieben - wer ihn mitzaehlt,
            # haelt ein Fenster faelschlich fuer "nicht ganz unten".
            if ($sb.ToString() -ne "Program Manager") {
                $liste += [PSCustomObject]@{ Handle = $w; Titel = $sb.ToString() }
            }
        }
        $w = [St]::GetWindow($w, 2)   # GW_HWNDNEXT
    }
    return $liste
}

$spiel = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.ProcessName -match 'Crusader' } | Select-Object -First 1
if (-not $spiel) { Write-Output "Kein Spielfenster gefunden."; exit 1 }
$sh = $spiel.MainWindowHandle

$vorher = Fensterstapel
$platzVorher = ($vorher | ForEach-Object { $_.Handle } | Select-String -SimpleMatch $sh) # nur zur Anzeige
$indexVorher = 0
for ($i = 0; $i -lt $vorher.Count; $i++) { if ($vorher[$i].Handle -eq $sh) { $indexVorher = $i + 1 } }
Write-Output ("Spiel liegt auf Platz {0} von {1}." -f $indexVorher, $vorher.Count)

# GEMESSEN 01.09.2026: SetWindowPos mit HWND_TOP meldet zwar "True" und
# Fehler 0, bewegt aber NICHTS - dieselbe Sperre wie beim Fokuswechsel. Ein
# Prozess ohne Eingabeberechtigung darf kein Fenster ueber das aktive heben.
#
# Was wirkt: kurz auf "immer oben" setzen und sofort wieder zurueck. Das hebt
# das Fenster zuverlaessig an die Spitze und laesst es dort, ohne dass es
# dauerhaft ueber allem klebt. Belegt: Firefox sprang damit von Platz 3 auf 1.
$TOPMOST   = [IntPtr](-1)
$NOTOPMOST = [IntPtr](-2)
$FLAGS = 0x13      # NOMOVE|NOSIZE|NOACTIVATE - der Tastaturfokus bleibt, wo er ist
$andere = $vorher | Where-Object { $_.Handle -ne $sh }

# Von UNTEN nach OBEN: am Ende steht wieder die alte Reihenfolge, nur ohne
# das Spiel dazwischen - das rutscht dadurch ganz nach unten.
for ($i = $andere.Count - 1; $i -ge 0; $i--) {
    [void][St]::SetWindowPos($andere[$i].Handle, $TOPMOST,   0,0,0,0, $FLAGS)
    [void][St]::SetWindowPos($andere[$i].Handle, $NOTOPMOST, 0,0,0,0, $FLAGS)
}

Start-Sleep -Milliseconds 300
$nachher = Fensterstapel
$indexNachher = 0
for ($i = 0; $i -lt $nachher.Count; $i++) { if ($nachher[$i].Handle -eq $sh) { $indexNachher = $i + 1 } }

Write-Output ("Spiel liegt jetzt auf Platz {0} von {1}." -f $indexNachher, $nachher.Count)
if ($indexNachher -eq $nachher.Count -and $nachher.Count -gt 1) {
    Write-Output "GANZ UNTEN - alle anderen Fenster liegen darueber."
    exit 0
} else {
    Write-Output "Noch nicht ganz unten. Daruber liegen:"
    for ($i = $indexNachher; $i -lt $nachher.Count; $i++) {
        Write-Output ("   " + $nachher[$i].Titel)
    }
    exit 1
}
