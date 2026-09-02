// Listet fuer jede Adresse in SHC_ADR die aufrufenden Funktionen (eingehende
// Referenzen) und zusaetzlich - falls SHC_SYM gesetzt - Symboladressen.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.symbol.*;

public class Aufrufer extends GhidraScript {
    @Override
    public void run() throws Exception {
        String adr = System.getenv("SHC_ADR");
        String syms = System.getenv("SHC_SYM");
        if (adr != null) for (String s : adr.split(",")) {
            Address a = currentProgram.getAddressFactory().getAddress(s.trim());
            Function ziel = getFunctionAt(a);
            println("ZIEL " + s.trim() + " " + (ziel == null ? "(keine Funktion)" : ziel.getName()));
            ReferenceIterator it = currentProgram.getReferenceManager().getReferencesTo(a);
            int n = 0;
            while (it.hasNext() && n < 60) {
                Reference r = it.next();
                Address from = r.getFromAddress();
                Function f = getFunctionContaining(from);
                println("  RUF " + from + "  " + (f == null ? "?" : f.getName())
                        + "  [" + r.getReferenceType() + "]");
                n++;
            }
            println("  RUF-ANZAHL " + n);
        }
        if (syms != null) for (String s : syms.split(",")) {
            String name = s.trim();
            SymbolIterator it = currentProgram.getSymbolTable().getSymbols(name);
            boolean g = false;
            while (it.hasNext()) { println("SYMBOL " + name + " = " + it.next().getAddress()); g = true; }
            if (!g) println("SYMBOL " + name + " = nicht gefunden");
        }
    }
}
