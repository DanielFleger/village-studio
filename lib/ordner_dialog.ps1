# Den Ordnerdialog von Windows oeffnen und den gewaehlten Pfad ausgeben.
#
# Windows hat zwei davon. Der alte (FolderBrowserDialog) ist der schmale Baum
# aus Windows XP - kein Adressfeld, keine Schnellzugriffe, kein Suchen. Der
# moderne ist derselbe Dialog, den Word und der Explorer benutzen; er heisst
# IFileOpenDialog und laesst sich mit dem Schalter PICKFOLDERS auf Ordner
# umstellen. Windows PowerShell 5.1 kennt ihn nicht von sich aus, darum steht
# er hier als kleines C#-Stueck.
#
# Faellt der moderne Dialog aus, kommt der alte - lieber ein haesslicher
# Dialog als gar keiner.
#
# Ausgabe: der Pfad, oder nichts, wenn abgebrochen wurde.

$ErrorActionPreference = 'Stop'

$quelle = @'
using System;
using System.Runtime.InteropServices;

public static class OrdnerWahl
{
    [ComImport, Guid("43826d1e-e718-42ee-bc55-a1e261c37bfe"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IShellItem
    {
        void BindToHandler(IntPtr pbc, ref Guid bhid, ref Guid riid, out IntPtr ppv);
        void GetParent(out IShellItem ppsi);
        void GetDisplayName(uint sigdnName, out IntPtr ppszName);
        void GetAttributes(uint sfgaoMask, out uint psfgaoAttribs);
        void Compare(IShellItem psi, uint hint, out int piOrder);
    }

    [ComImport, Guid("42f85136-db7e-439c-85f1-e4075d135fc8"),
     InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IFileDialog
    {
        [PreserveSig] int Show(IntPtr hwndOwner);
        void SetFileTypes(uint cFileTypes, IntPtr rgFilterSpec);
        void SetFileTypeIndex(uint iFileType);
        void GetFileTypeIndex(out uint piFileType);
        void Advise(IntPtr pfde, out uint pdwCookie);
        void Unadvise(uint dwCookie);
        void SetOptions(uint fos);
        void GetOptions(out uint pfos);
        void SetDefaultFolder(IShellItem psi);
        void SetFolder(IShellItem psi);
        void GetFolder(out IShellItem ppsi);
        void GetCurrentSelection(out IShellItem ppsi);
        void SetFileName([MarshalAs(UnmanagedType.LPWStr)] string pszName);
        void GetFileName([MarshalAs(UnmanagedType.LPWStr)] out string pszName);
        void SetTitle([MarshalAs(UnmanagedType.LPWStr)] string pszTitle);
        void SetOkButtonLabel([MarshalAs(UnmanagedType.LPWStr)] string pszText);
        void SetFileNameLabel([MarshalAs(UnmanagedType.LPWStr)] string pszLabel);
        void GetResult(out IShellItem ppsi);
        void AddPlace(IShellItem psi, int fdap);
        void SetDefaultExtension([MarshalAs(UnmanagedType.LPWStr)] string pszDefaultExtension);
        void Close(int hr);
        void SetClientGuid(ref Guid guid);
        void ClearClientData();
        void SetFilter(IntPtr pFilter);
    }

    [ComImport, Guid("DC1C5A9C-E88A-4dde-A5A1-60F82A20AEF7")]
    private class FileOpenDialog { }

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    private static extern int SHCreateItemFromParsingName(
        string pszPath, IntPtr pbc, ref Guid riid, out IShellItem ppv);

    private const uint FOS_PICKFOLDERS      = 0x00000020;
    private const uint FOS_FORCEFILESYSTEM  = 0x00000040;
    private const uint FOS_PATHMUSTEXIST    = 0x00000800;
    private const uint SIGDN_FILESYSPATH    = 0x80058000;

    // Gibt den gewaehlten Pfad zurueck, oder null bei Abbruch.
    public static string Waehlen(string titel, string startOrdner)
    {
        IFileDialog dialog = (IFileDialog)new FileOpenDialog();
        dialog.SetOptions(FOS_PICKFOLDERS | FOS_FORCEFILESYSTEM | FOS_PATHMUSTEXIST);
        if (!string.IsNullOrEmpty(titel)) dialog.SetTitle(titel);

        if (!string.IsNullOrEmpty(startOrdner))
        {
            try
            {
                Guid iid = typeof(IShellItem).GUID;
                IShellItem start;
                if (SHCreateItemFromParsingName(startOrdner, IntPtr.Zero, ref iid, out start) == 0)
                    dialog.SetFolder(start);
            }
            catch { }
        }

        // 0x800704C7 = der Benutzer hat abgebrochen
        if (dialog.Show(IntPtr.Zero) != 0) return null;

        IShellItem ergebnis;
        dialog.GetResult(out ergebnis);
        IntPtr zeiger;
        ergebnis.GetDisplayName(SIGDN_FILESYSPATH, out zeiger);
        string pfad = Marshal.PtrToStringAuto(zeiger);
        Marshal.FreeCoTaskMem(zeiger);
        return pfad;
    }
}
'@

$titel = 'Ordner mit AIV-Dateien waehlen'
$start = ''
if ($args.Count -ge 1) { $start = $args[0] }

try {
    Add-Type -TypeDefinition $quelle -Language CSharp | Out-Null
    $pfad = [OrdnerWahl]::Waehlen($titel, $start)
    if ($pfad) { Write-Output $pfad }
}
catch {
    # Rueckfall auf den alten Dialog
    Add-Type -AssemblyName System.Windows.Forms
    $oben = New-Object System.Windows.Forms.Form
    $oben.TopMost = $true
    $d = New-Object System.Windows.Forms.FolderBrowserDialog
    $d.Description = $titel
    $d.ShowNewFolderButton = $false
    if ($d.ShowDialog($oben) -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $d.SelectedPath }
    $oben.Dispose()
}
