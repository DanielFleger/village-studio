# Zeigt die Fensterreihenfolge und sagt, auf welchem Platz das Spiel liegt.
#
# Warum ein eigenes Werkzeug: Jeder Testdurchgang muss GLEICH gemessen werden,
# sonst vergleicht man Aepfel mit Birnen. Und "im Hintergrund" heisst hier
# genau eine Sache - zuunterst im Stapel, alles andere darueber. Nicht
# minimiert, nicht ohne Fokus, sondern zuunterst.
#
# "Program Manager" ist der Desktop selbst und liegt naturgemaess ganz unten;
# das Spiel direkt darueber gilt deshalb als erreicht.

Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public class Sp {
  [DllImport("user32.dll")] public static extern IntPtr GetTopWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h, uint c);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr h);
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int c);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
"@

$p = Get-Process | Where-Object {
    $_.MainWindowHandle -ne 0 -and $_.ProcessName -match 'Crusader'
} | Select-Object -First 1
if (-not $p) { Write-Output "Kein Spielfenster - laeuft Stronghold?"; exit 1 }
$spiel = $p.MainWindowHandle

$namen = @()
$platz = 0
$w = [Sp]::GetTopWindow([IntPtr]::Zero)
while ($w -ne [IntPtr]::Zero) {
    if ([Sp]::IsWindowVisible($w) -and -not [Sp]::IsIconic($w) -and [Sp]::GetWindowTextLength($w) -gt 0) {
        $sb = New-Object -TypeName System.Text.StringBuilder -ArgumentList 200
        [void][Sp]::GetWindowText($w, $sb, 200)
        $t = $sb.ToString()
        if ($t.Length -gt 45) { $t = $t.Substring(0, 45) }
        $namen += $t
        if ($w -eq $spiel) { $platz = $namen.Count }
    }
    $w = [Sp]::GetWindow($w, 2)
}

Write-Output "Fensterstapel, oben zuerst:"
for ($i = 0; $i -lt $namen.Count; $i++) {
    $m = if (($i + 1) -eq $platz) { "   <== DAS SPIEL" } else { "" }
    Write-Output ("  {0}. {1}{2}" -f ($i + 1), $namen[$i], $m)
}

$gesamt = $namen.Count
$desktopUnten = ($namen[$gesamt - 1] -eq "Program Manager")
$zuunterst = ($platz -eq $gesamt) -or ($desktopUnten -and $platz -eq ($gesamt - 1))

Write-Output ""
Write-Output ("Spiel: Platz {0} von {1}   Fokus beim Spiel: {2}" `
              -f $platz, $gesamt, ([Sp]::GetForegroundWindow() -eq $spiel))
if ($zuunterst) {
    Write-Output "ERGEBNIS: ZUUNTERST - alles andere liegt darueber."
    exit 0
} else {
    Write-Output ("ERGEBNIS: NICHT zuunterst - {0} Fenster liegen noch darunter." `
                  -f ($gesamt - $platz))
    exit 1
}
