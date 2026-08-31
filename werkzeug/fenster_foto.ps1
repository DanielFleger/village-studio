# Fotografiert das Spielfenster SELBST - nicht den Bildschirmausschnitt.
#
# Warum das wichtig ist: CopyFromScreen kopiert, was an der Fensterposition auf
# dem Bildschirm zu sehen ist. Liegt ein anderes Fenster davor, fotografiert
# man das andere Fenster. Am 31.08. kam so ein Video statt des Spiels heraus -
# und weil danach ueber Logzeilen weitergeraten wurde, statt einfach
# hinzusehen, hat das eine halbe Stunde gekostet.
#
# PrintWindow mit PW_RENDERFULLCONTENT (0x2) laesst das Fenster sich selbst
# zeichnen, auch verdeckt, ohne den Fokus wegzunehmen. Ist das Fenster
# Das Fenster wird dabei NICHT angefasst: nicht nach vorn geholt, nicht
# wiederhergestellt, nicht aktiviert. Daniel arbeitet daneben weiter.
#
#   fenster_foto.ps1 [-Titel "Crusader"] [-Ziel "pfad.png"]
param(
  [string]$Titel = "Crusader",
  [string]$Ziel  = "$PSScriptRoot\fenster.png"
)

Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing @"
using System;
using System.Drawing;
using System.Runtime.InteropServices;
public class FensterFoto {
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr dc, uint flags);
  [DllImport("user32.dll")] public static extern IntPtr GetWindowDC(IntPtr h);
  [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr h, IntPtr dc);
  [DllImport("gdi32.dll")] public static extern bool BitBlt(IntPtr d, int dx, int dy, int w, int h, IntPtr s, int sx, int sy, uint rop);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int c);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }

  public const int SW_SHOWNOACTIVATE = 4;

  // Versucht erst PrintWindow (holt den Fokus nicht). Liefert das nichts oder
  // nur Schwarz - bei DirectX kommt das vor -, wird vom Bildschirm kopiert.
  public static Bitmap Hole(IntPtr h, out string weg) {
    weg = "PrintWindow";
    RECT r;
    if (!GetWindowRect(h, out r)) { weg = "kein Fensterrahmen"; return null; }
    int w = r.R - r.L, hh = r.B - r.T;
    if (w <= 0 || hh <= 0) { weg = "Fenstergroesse 0"; return null; }

    // Drei Wege, alle ohne das Fenster anzufassen. Der erste, der ein
    // brauchbares Bild liefert, gewinnt.
    //   0x2 = PW_RENDERFULLCONTENT (fuer DirectX gedacht)
    //   0   = klassisches PrintWindow
    //   BitBlt vom Fenster-DC
    foreach (uint flag in new uint[] { 0x2, 0x0 }) {
      Bitmap bmp = new Bitmap(w, hh, System.Drawing.Imaging.PixelFormat.Format32bppArgb);
      bool ok;
      using (Graphics g = Graphics.FromImage(bmp)) {
        IntPtr dc = g.GetHdc();
        ok = PrintWindow(h, dc, flag);
        g.ReleaseHdc(dc);
      }
      if (ok && !IstSchwarz(bmp)) { weg = "PrintWindow Flag 0x" + flag.ToString("X"); return bmp; }
      bmp.Dispose();
    }

    Bitmap b3 = new Bitmap(w, hh, System.Drawing.Imaging.PixelFormat.Format32bppArgb);
    IntPtr src = GetWindowDC(h);
    bool ok3 = false;
    if (src != IntPtr.Zero) {
      using (Graphics g = Graphics.FromImage(b3)) {
        IntPtr dst = g.GetHdc();
        ok3 = BitBlt(dst, 0, 0, w, hh, src, 0, 0, 0x00CC0020);  // SRCCOPY
        g.ReleaseHdc(dst);
      }
      ReleaseDC(h, src);
    }
    if (ok3 && !IstSchwarz(b3)) { weg = "BitBlt vom Fenster-DC"; return b3; }
    b3.Dispose();

    weg = "alle drei Wege lieferten nichts oder nur Schwarz (DirectX zeichnet am GDI vorbei)";
    return null;
  }

  // Ein paar Stichproben reichen, um ein komplett schwarzes Bild zu erkennen.
  static bool IstSchwarz(Bitmap b) {
    int schritt = Math.Max(1, Math.Min(b.Width, b.Height) / 20);
    for (int y = 0; y < b.Height; y += schritt)
      for (int x = 0; x < b.Width; x += schritt) {
        Color c = b.GetPixel(x, y);
        if (c.R > 12 || c.G > 12 || c.B > 12) return false;
      }
    return true;
  }
}
"@

$p = Get-Process | Where-Object { $_.MainWindowTitle -eq $Titel } | Select-Object -First 1
if (-not $p) {
  "Kein Fenster mit Titel '$Titel'."
  $offen = Get-Process | Where-Object { $_.MainWindowTitle -ne "" } |
           ForEach-Object { $_.MainWindowTitle }
  "Offene Fenster: " + ($offen -join " | ")
  exit 1
}

$weg = ""
$bmp = [FensterFoto]::Hole($p.MainWindowHandle, [ref]$weg)
if ($null -eq $bmp) { "Aufnahme fehlgeschlagen: $weg"; exit 1 }
$bmp.Save($Ziel, [System.Drawing.Imaging.ImageFormat]::Png)
$b = $bmp.Width; $h = $bmp.Height
$bmp.Dispose()
"Fenster '$Titel' ${b}x${h} ueber $weg aufgenommen: $Ziel"
