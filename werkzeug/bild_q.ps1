# Loest im Spiel den eingebauten Screenshot aus - ueber die Taste Q, per
# Fensternachricht statt ueber die Tastatur. Kein Fokus, kein Nach-vorn-Holen.
#
# Aus WindowMsgProcessingFunc (0x004b2ae0):
#     case VK_Q:
#       if (getAreWeInAInGameMenu(&DAT_GameCore)) {
#           takeScreenshot(&DAT_WindowAndDirectDraw, ScreenshotFilenameVariant);
#           ScreenshotFilenameVariant++;
#       }
#
# Zwei Dinge folgen daraus:
#   - Es geht NUR im laufenden Gefecht, nicht im Hauptmenue.
#   - Das Spiel zaehlt den Dateinamen selbst hoch:
#     Dokumente/Stronghold Crusader/screen_capture_NNN.bmp
#
# Warum nicht takeScreenshot direkt aufrufen: aus dem Zeichenhaken heraus
# stirbt der Prozess (die Funktion zeichnet selbst - Wiedereintritt), und aus
# dem Spieltick kommt man nicht dran, sobald die Spieluhr steht.
param([string]$Titel = "Crusader")

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Taste {
  [DllImport("user32.dll")] public static extern IntPtr PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  public const uint WM_KEYDOWN = 0x0100, WM_KEYUP = 0x0101, WM_CHAR = 0x0102;
  public const int VK_Q = 0x51;
}
"@

$p = Get-Process | Where-Object { $_.MainWindowTitle -eq $Titel } | Select-Object -First 1
if (-not $p) { "kein Fenster '$Titel'"; exit 1 }
$h = $p.MainWindowHandle

# lParam nach Windows-Vorgabe: Wiederholung 1, Scancode fuer Q (0x10)
$down = [IntPtr]0x00100001
$up   = [IntPtr]0xC0100001

[Taste]::PostMessage($h, [Taste]::WM_KEYDOWN, [IntPtr][Taste]::VK_Q, $down) | Out-Null
Start-Sleep -Milliseconds 60
[Taste]::PostMessage($h, [Taste]::WM_CHAR,    [IntPtr]0x71,          $down) | Out-Null
Start-Sleep -Milliseconds 60
[Taste]::PostMessage($h, [Taste]::WM_KEYUP,   [IntPtr][Taste]::VK_Q, $up)   | Out-Null
"Taste Q an Fenster $h geschickt"
