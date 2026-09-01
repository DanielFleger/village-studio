// Listet Funktionen, deren Name das Muster SHC_MUSTER enthaelt (ohne Gross-/
// Kleinschreibung). Zum Finden von Menue- und Knopf-Handlern.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Function;

public class SucheFunktionen extends GhidraScript {
    @Override
    public void run() throws Exception {
        String muster = System.getenv("SHC_MUSTER");
        if (muster == null) return;
        String[] teile = muster.toLowerCase().split(",");
        int n = 0;
        for (Function f : currentProgram.getFunctionManager().getFunctions(true)) {
            String name = f.getName().toLowerCase();
            for (String t : teile) {
                if (name.contains(t.trim())) {
                    println("FUNK " + f.getEntryPoint() + "  " + f.getName());
                    n++;
                    break;
                }
            }
            if (n > 120) break;
        }
        println("FUNK gefunden: " + n);
    }
}
