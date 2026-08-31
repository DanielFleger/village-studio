// Exportiert alle Funktionen als CSV: adresse;name;signatur
// Laeuft schreibgeschuetzt - das Ghidra-Projekt wird nicht veraendert.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Function;
import java.io.PrintWriter;

public class ExportFunktionen extends GhidraScript {
    @Override
    public void run() throws Exception {
        String ziel = System.getenv("SHC_EXPORT");
        if (ziel == null) ziel = "C:/Users/danie/funktionen.csv";
        PrintWriter w = new PrintWriter(ziel, "UTF-8");
        w.println("adresse;name;signatur");
        int n = 0;
        for (Function fn : currentProgram.getFunctionManager().getFunctions(true)) {
            String sig = "";
            try { sig = fn.getSignature().getPrototypeString(); } catch (Exception e) { }
            sig = sig.replace(";", ",").replace("\n", " ");
            w.println("0x" + fn.getEntryPoint().toString() + ";" + fn.getName() + ";" + sig);
            n++;
        }
        w.close();
        println("[Export] " + n + " Funktionen -> " + ziel);
    }
}
