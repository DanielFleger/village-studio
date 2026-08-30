import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;

// Verfolgt, WOHIN spawnUnit eine neue Einheit tatsaechlich schreibt.
// Kein Ableiten aus Strukturen - nur das, was der Code wirklich tut.
public class DumpSpawn extends GhidraScript {

    public void run() throws Exception {
        DecompInterface d = new DecompInterface();
        d.openProgram(currentProgram);

        // 1) Kandidaten finden: alles mit "spawn" oder "createUnit" im Namen
        println("### Funktionen mit spawn/createUnit im Namen");
        for (Function f : currentProgram.getFunctionManager().getFunctions(true)) {
            String n = f.getName().toLowerCase();
            if (n.contains("spawn") || n.contains("createunit") || n.contains("newunit")
                || n.contains("adduniten") || n.contains("makeunit"))
                println(String.format("   %s  %s", f.getEntryPoint(), f.getName()));
        }

        // 2) Die Zielfunktion an 0x53E440 volle Laenge dekompilieren
        Address a = currentProgram.getAddressFactory().getDefaultAddressSpace().getAddress(0x53E440L);
        Function f = getFunctionContaining(a);
        println("");
        println("### Funktion an 0x53E440: " + (f == null ? "KEINE" : f.getName() + " @ " + f.getEntryPoint()));
        if (f != null) {
            DecompileResults r = d.decompileFunction(f, 120, monitor);
            if (r.decompileCompleted()) {
                println("--- Dekompilat ---");
                println(r.getDecompiledFunction().getC());
            } else println("   Dekompilierung fehlgeschlagen: " + r.getErrorMessage());

            // 3) Alle Datenreferenzen aus dieser Funktion - das sind die Kandidaten
            //    fuer die Grundadresse
            println("");
            println("### Globale Adressen, die diese Funktion anfasst");
            Set<String> seen = new TreeSet<>();
            for (Instruction i : currentProgram.getListing().getInstructions(f.getBody(), true)) {
                for (Reference ref : i.getReferencesFrom()) {
                    if (!ref.getReferenceType().isData()) continue;
                    Address t = ref.getToAddress();
                    Symbol s = getSymbolAt(t);
                    seen.add(String.format("   %s  %-12s %s", t,
                        ref.getReferenceType().getName(),
                        s == null ? "(unbenannt)" : s.getName()));
                }
            }
            for (String s : seen) println(s);

            // 4) Alle Konstanten-Multiplikationen im Rohcode - die Schrittweite
            println("");
            println("### IMUL/Schiebe-Konstanten (Kandidaten fuer die Schrittweite)");
            Map<String,Integer> mult = new LinkedHashMap<>();
            for (Instruction i : currentProgram.getListing().getInstructions(f.getBody(), true)) {
                String m = i.getMnemonicString().toUpperCase();
                if (!m.startsWith("IMUL") && !m.startsWith("SHL") && !m.equals("LEA")) continue;
                mult.merge(i.getAddress() + "  " + i.toString(), 1, Integer::sum);
            }
            for (String s : mult.keySet()) println("   " + s);
        }
        d.dispose();
    }
}
