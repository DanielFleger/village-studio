# Welche Spielinstanz, welcher Ordner, welcher Prozess, welches Fenster -
# EINE Stelle fuer alle PowerShell-Werkzeuge (gleiche Regel wie instanz.py).
#
# Einbinden:   . "$PSScriptRoot\instanz.ps1"
# Danach:      Get-InstanzOrdner 2 / Get-InstanzProzesse / Get-InstanzFenster
#              (ohne Zahl: SHC_INSTANZ, sonst 1)
#
# Instanz N liegt im Ordner "<Instanz 1> InstanzN". Erkannt wird ein Prozess
# an seinem Programmpfad - beide Instanzen heissen "Stronghold Crusader" und
# ihre Fenster "Crusader". Get-Process liefert den Pfad beim erhoehten Spiel
# NICHT (.Path bleibt leer); QueryFullProcessImageName mit den kleinsten
# Leserechten schon (gemessen 05.10.2026).

if (-not ([System.Management.Automation.PSTypeName]'ShcInstanz').Type) {
    Add-Type @"
using System; using System.Text; using System.Runtime.InteropServices;
public class ShcInstanz {
  [DllImport("kernel32.dll", SetLastError=true)] static extern IntPtr OpenProcess(uint a, bool erben, uint pid);
  [DllImport("kernel32.dll", SetLastError=true, CharSet=CharSet.Unicode)] static extern bool QueryFullProcessImageName(IntPtr h, uint f, StringBuilder s, ref uint n);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
  public static string Pfad(int pid) {
    IntPtr h = OpenProcess(0x1000, false, (uint)pid);
    if (h == IntPtr.Zero) return null;
    try { var sb = new StringBuilder(1024); uint n = 1024; return QueryFullProcessImageName(h, 0, sb, ref n) ? sb.ToString() : null; }
    finally { CloseHandle(h); }
  }
}
"@
}

$script:SHC_STAMM = "C:\Program Files (x86)\Steam\steamapps\common\Stronghold Crusader Extreme"

function Get-InstanzNummer([int]$Instanz = 0) {
    if ($Instanz -gt 0) { return $Instanz }
    if ($env:SHC_INSTANZ) {
        $n = 0
        if (-not [int]::TryParse($env:SHC_INSTANZ, [ref]$n) -or $n -lt 1) {
            throw "SHC_INSTANZ='$($env:SHC_INSTANZ)' ist keine Instanznummer (1, 2, ...)"
        }
        return $n
    }
    return 1
}

function Get-InstanzOrdner([int]$Instanz = 0) {
    $n = Get-InstanzNummer $Instanz
    if ($n -le 1) { return $script:SHC_STAMM }
    return "$($script:SHC_STAMM) Instanz$n"
}

function Get-InstanzProzesse([int]$Instanz = 0) {
    $ordner = Get-InstanzOrdner $Instanz
    Get-Process -Name 'Stronghold Crusader' -ErrorAction SilentlyContinue | Where-Object {
        $p = [ShcInstanz]::Pfad($_.Id)
        $p -and ([IO.Path]::GetDirectoryName($p) -ieq $ordner)
    }
}

function Get-InstanzFenster([int]$Instanz = 0) {
    $p = Get-InstanzProzesse $Instanz | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
    if ($p) { return $p.MainWindowHandle }
    return [IntPtr]::Zero
}
