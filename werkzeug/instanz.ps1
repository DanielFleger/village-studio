# Welche Spielinstanz, welcher Ordner, welcher Prozess, welches Fenster -
# EINE Stelle fuer alle PowerShell-Werkzeuge (gleiche Regel wie instanz.py).
#
# Einbinden:   . "$PSScriptRoot\instanz.ps1"
# Danach:      Get-InstanzOrdner 2 / Get-InstanzProzesse / Get-InstanzFenster
#              (ohne Zahl: SHC_INSTANZ = Name oder Nummer, sonst "vorgabe" aus lib\instanzen.json)
#
# Ordner und Namen stehen in lib\instanzen.json (seit 15.11.2026). Erkannt wird ein Prozess
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

# 15.11.2026 (Daniel, SAI): Namen, Ordner und Rollen stehen in EINER Liste, lib/instanzen.json (steam, team-liga;
# 3, 4, 5 im Archiv auf D:). SHC_INSTANZ = Name oder Nummer, ohne Angabe gilt "vorgabe" (team-liga, B-197).
$script:SHC_LISTE = Get-Content -Raw -Encoding UTF8 (Join-Path $PSScriptRoot '..\lib\instanzen.json') | ConvertFrom-Json
$script:SHC_STAMM = Join-Path $script:SHC_LISTE.stamm (($script:SHC_LISTE.instanzen | Where-Object { $_.name -eq 'steam' }).ordner)

function Get-InstanzEintrag([string]$Wahl) {
    if (-not $Wahl) { $Wahl = $env:SHC_INSTANZ }
    if (-not $Wahl) { $Wahl = $script:SHC_LISTE.vorgabe }
    $e = $script:SHC_LISTE.instanzen | Where-Object { $_.name -ieq $Wahl -or "$($_.nummer)" -eq $Wahl } | Select-Object -First 1
    if ($e) { return $e }
    $a = $script:SHC_LISTE.archiv | Where-Object { "$($_.nummer)" -eq $Wahl } | Select-Object -First 1
    if ($a) { throw "Instanz $Wahl liegt seit $($a.seit) im Archiv: $($a.ordner)" }
    throw "Instanz '$Wahl' gibt es nicht - aktiv sind $(($script:SHC_LISTE.instanzen | ForEach-Object { $_.name }) -join ', ') (lib\instanzen.json)"
}

function Get-InstanzNummer([int]$Instanz = 0) {
    if ($Instanz -gt 0) { return [int](Get-InstanzEintrag "$Instanz").nummer }
    return [int](Get-InstanzEintrag).nummer
}

function Get-InstanzOrdner([int]$Instanz = 0) {
    $e = Get-InstanzEintrag "$(Get-InstanzNummer $Instanz)"
    return Join-Path $script:SHC_LISTE.stamm $e.ordner
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
