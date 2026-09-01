// Sucht die Import-Adressen (IAT) benannter Windows-Funktionen: SHC_IMP.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.symbol.*;
import ghidra.program.model.address.Address;

public class FinderImport extends GhidraScript {
    @Override
    public void run() throws Exception {
        String namen = System.getenv("SHC_IMP");
        if (namen == null) return;
        for (String n : namen.split(",")) {
            String name = n.trim();
            boolean gefunden = false;
            SymbolIterator it = currentProgram.getSymbolTable().getSymbolIterator(name, true);
            while (it.hasNext()) {
                Symbol s = it.next();
                Address a = s.getAddress();
                // Verweise auf das Symbol zeigen auf den IAT-Eintrag
                for (Reference r : currentProgram.getReferenceManager().getReferencesTo(a)) {
                    println("IMPORT " + name + " ref von " + r.getFromAddress()
                            + " typ " + r.getReferenceType());
                    gefunden = true;
                }
                println("IMPORT " + name + " symbol bei " + a + " (" + s.getSymbolType() + ")");
                gefunden = true;
            }
            if (!gefunden) println("IMPORT " + name + " = nicht gefunden");
        }
    }
}
