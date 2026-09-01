# Startet Stronghold Crusader und haelt es von der ERSTEN Sekunde an ganz
# unten in der Fensterreihenfolge.
#
# Warum ein eigenes Skript und nicht ein Schritt in shc.py:
# Das Zurueckschieben muss greifen, sobald das Fenster erscheint - nicht erst,
# wenn das Modul geladen ist. Zwischen beidem liegen rund 30 Sekunden, in denen
# Daniel das Spiel im Vollbild vor sich hat. Genau das war der Fehler am
# 01.09.2026: das Skript feuerte am Ende des Ladens statt an seinem Anfang.
#
# Warum der Umweg ueber die anderen Fenster:
# Das Spielfenster selbst nach unten zu schieben ist gesperrt - der Prozess
# laeuft auf hoher Rechtestufe, die Sitzung nicht, Windows antwortet mit
# Fehler 5. Gemessen, nicht vermutet. Auf Daniels eigene Fenster besteht
# dagegen Zugriff; hebt man alle davon an, liegt das Spiel danach zuunterst.
#
# Aufruf:  powershell -ExecutionPolicy Bypass -File werkzeug\start_hinten.ps1
#          ... -Sekunden 45      (laenger nachfassen)
#          ... -NurSchieben      (nicht starten, nur das laufende Spiel senken)

param(
    [int]$Sekunden = 40,
    [switch]$NurSchieben
)

Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public class Hi {
  [DllImport("user32.dll")] public static extern IntPtr GetTopWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetWindow(IntPtr h, uint c);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetWindowTextLength(IntPtr h);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool SetWindowPos(IntPtr h, IntPtr nach, int x, int y, int cx, int cy, uint f);
}
"@

$SPIEL_ORDNER = "C:\Program Files (x86)\Steam\steamapps\common\Stronghold Crusader Extreme"
$EXE = Join-Path $SPIEL_ORDNER "Stronghold Crusader.exe"

function Spielfenster {
    $p = Get-Process | Where-Object {
        $_.MainWindowHandle -ne 0 -and $_.ProcessName -match 'Crusader'
    } | Select-Object -First 1
    if ($p) { return $p.MainWindowHandle }
    return [IntPtr]::Zero
}

function SenkeSpiel([IntPtr]$spiel) {
    # Erst der direkte Weg. Er scheitert an der Rechtestufe, kostet aber nichts
    # - und falls das Spiel je ohne Adminrechte laeuft, ist er der saubere.
    if ([Hi]::SetWindowPos($spiel, [IntPtr]1, 0,0,0,0, 0x13)) { return $true }

    # Umweg: alle anderen sichtbaren Fenster ueber das Spiel heben.
    # HWND_TOP = 0, SWP_NOMOVE|NOSIZE|NOACTIVATE = 0x13 - nimmt keinen Fokus.
    $liste = @()
    $w = [Hi]::GetTopWindow([IntPtr]::Zero)
    while ($w -ne [IntPtr]::Zero) {
        if ([Hi]::IsWindowVisible($w) -and -not [Hi]::IsIconic($w) `
            -and [Hi]::GetWindowTextLength($w) -gt 0 -and $w -ne $spiel) {
            $liste += $w
        }
        $w = [Hi]::GetWindow($w, 2)
    }
    [array]::Reverse($liste)      # von unten nach oben, sonst dreht sich die Ordnung um
    foreach ($h in $liste) { [void][Hi]::SetWindowPos($h, [IntPtr]0, 0,0,0,0, 0x13) }
    return $false
}

function PlatzImStapel([IntPtr]$spiel) {
    $platz = 0; $gesamt = 0
    $w = [Hi]::GetTopWindow([IntPtr]::Zero)
    while ($w -ne [IntPtr]::Zero) {
        if ([Hi]::IsWindowVisible($w) -and -not [Hi]::IsIconic($w) `
            -and [Hi]::GetWindowTextLength($w) -gt 0) {
            $gesamt++
            if ($w -eq $spiel) { $platz = $gesamt }
        }
        $w = [Hi]::GetWindow($w, 2)
    }
    return @($platz, $gesamt)
}

if (-not $NurSchieben) {
    # Ein stehengebliebener Auftrag wuerde beim Start sofort erneut feuern.
    Set-Content -Path (Join-Path $SPIEL_ORDNER "ucp\villagestudio\befehl.json") `
                -Value "{}" -Encoding Ascii
    Start-Process -FilePath $EXE -ArgumentList "--ucp-no-security" `
                  -WorkingDirectory $SPIEL_ORDNER
}

# Ab hier: eng abfragen, damit das Fenster keinen Wimpernschlag vorn steht.
$uhr = [Diagnostics.Stopwatch]::StartNew()
$gefunden = $false
$erstesMal = $null
$durchgaenge = 0

while ($uhr.Elapsed.TotalSeconds -lt $Sekunden) {
    $spiel = Spielfenster
    if ($spiel -ne [IntPtr]::Zero) {
        if (-not $gefunden) {
            $gefunden = $true
            $erstesMal = $uhr.Elapsed.TotalSeconds
            Write-Output ("Fenster da nach {0:N1} s - schiebe sofort nach hinten." -f $erstesMal)
        }
        [void](SenkeSpiel $spiel)
        $durchgaenge++
    }
    Start-Sleep -Milliseconds 200
}

$spiel = Spielfenster
if ($spiel -eq [IntPtr]::Zero) {
    Write-Output "Kein Spielfenster gefunden."
    exit 1
}
$stand = PlatzImStapel $spiel
Write-Output ("Fertig: {0} Durchgaenge in {1:N0} s. Spiel steht auf Platz {2} von {3} sichtbaren Fenstern." `
              -f $durchgaenge, $uhr.Elapsed.TotalSeconds, $stand[0], $stand[1])
if ($stand[0] -eq $stand[1]) {
    Write-Output "-> zuunterst, alles andere liegt darueber."
} else {
    Write-Output ("-> NICHT zuunterst: {0} Fenster liegen noch darunter." -f ($stand[1] - $stand[0]))
}
