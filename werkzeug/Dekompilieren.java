// Dekompiliert die in SHC_ADR genannten Adressen (kommagetrennt) nach SHC_OUT.
import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import java.io.PrintWriter;

public class Dekompilieren extends GhidraScript {
    @Override
    public void run() throws Exception {
        String adr = System.getenv("SHC_ADR");
        String out = System.getenv("SHC_OUT");
        DecompInterface d = new DecompInterface();
        d.openProgram(currentProgram);
        PrintWriter w = new PrintWriter(out, "UTF-8");
        for (String s : adr.split(",")) {
            Address a = currentProgram.getAddressFactory().getAddress(s.trim());
            Function fn = getFunctionAt(a);
            if (fn == null) { w.println("// keine Funktion bei " + s); continue; }
            w.println("// ================= " + fn.getName() + " @ " + s + " =================");
            DecompileResults r = d.decompileFunction(fn, 90, monitor);
            if (r.decompileCompleted()) w.println(r.getDecompiledFunction().getC());
            else w.println("// Dekompilieren fehlgeschlagen: " + r.getErrorMessage());
            w.println();
        }
        w.close();
        println("[Dekompilat] fertig -> " + out);
    }
}
