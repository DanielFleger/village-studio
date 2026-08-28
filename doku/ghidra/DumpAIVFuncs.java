// Gibt die dekompilierten Funktionen rund um die AIV-Bauliste aus.
import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;

public class DumpAIVFuncs extends GhidraScript {
    public void run() throws Exception {
        String[] ziele = { "0x4ED431", "0x4EF281", "0x4EF28B" };
        DecompInterface d = new DecompInterface();
        d.openProgram(currentProgram);
        for (String z : ziele) {
            Address a = currentProgram.getAddressFactory().getAddress(z);
            Function f = getFunctionContaining(a);
            println("========== " + z + " ==========");
            if (f == null) { println("keine Funktion an dieser Adresse"); continue; }
            println("Funktion: " + f.getName() + "  @ " + f.getEntryPoint());
            DecompileResults r = d.decompileFunction(f, 90, monitor);
            if (r != null && r.decompileCompleted()) println(r.getDecompiledFunction().getC());
            else println("Dekompilierung fehlgeschlagen: " + (r == null ? "?" : r.getErrorMessage()));
        }
        d.dispose();
    }
}
