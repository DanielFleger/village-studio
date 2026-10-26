import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;

// Wer liest und schreibt die Kartenschichten? (26.10.2026, Grafikfehler beim Drehen)
// Je Schicht alle Verweise in den ganzen Speicherbereich, nach Funktion gruppiert,
// getrennt nach Lesen und Schreiben. Adressen aus DAT_MapSectionAddressArray (0x00b92a58).
public class DumpLayerRefs extends GhidraScript {
    public void run() throws Exception {
        Object[][] schichten = {
            { "RandomLayer 1008", 0x01BD0F48L, 0x27420L },
            { "GfxLayer 1001",    0x01AE5688L, 0x27420L },
            { "MacroLayer 1036",  0x01DCFCB8L, 0x27420L },
        };
        ReferenceManager rm = currentProgram.getReferenceManager();
        FunctionManager fm = currentProgram.getFunctionManager();
        AddressSpace sp = currentProgram.getAddressFactory().getDefaultAddressSpace();
        for (Object[] s : schichten) {
            long a = (Long) s[1], n = (Long) s[2];
            AddressSet set = new AddressSet(sp.getAddress(a), sp.getAddress(a + n - 1));
            TreeMap<String, int[]> jeFunktion = new TreeMap<>();
            AddressIterator it = rm.getReferenceDestinationIterator(set, true);
            while (it.hasNext()) {
                Address ziel = it.next();
                for (Reference r : rm.getReferencesTo(ziel)) {
                    Function f = fm.getFunctionContaining(r.getFromAddress());
                    String name = (f == null ? "?" : f.getName(true) + " @" + f.getEntryPoint());
                    int[] z = jeFunktion.computeIfAbsent(name, k -> new int[3]);
                    RefType t = r.getReferenceType();
                    if (t.isWrite()) z[1]++; else if (t.isRead()) z[0]++; else z[2]++;
                }
            }
            println("== " + s[0] + " (0x" + Long.toHexString(a) + ")");
            for (Map.Entry<String, int[]> e : jeFunktion.entrySet())
                println("  lesen " + e.getValue()[0] + "  schreiben " + e.getValue()[1]
                        + "  sonst " + e.getValue()[2] + "  " + e.getKey());
        }
    }
}
