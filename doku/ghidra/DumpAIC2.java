import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.*;
import java.util.*;

public class DumpAIC2 extends GhidraScript {
    public void run() throws Exception {
        String[] adr = { "0x4c8d20", "0x4c9120", "0x4c94f0", "0x4c9900", "0x4c9cf0",
                         "0x4ca0c0", "0x4ca4d0", "0x4ca8a0" };
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        for (int i = 0; i < adr.length; i++) {
            Address a = currentProgram.getAddressFactory().getAddress(adr[i]);
            Function f = getFunctionContaining(a);
            if (f == null) { println("## " + adr[i] + " keine Funktion"); continue; }
            DecompileResults r = dec.decompileFunction(f, 120, monitor);
            if (r == null || !r.decompileCompleted()) { println("## " + f.getName() + " nicht dekompilierbar"); continue; }
            // die ersten Zuweisungen mit sprechenden Feldnamen
            List<String> treffer = new ArrayList<>();
            for (String z : r.getDecompiledFunction().getC().split("\n")) {
                String t = z.trim();
                if (!t.contains("=")) continue;
                if (t.contains("flagType")) treffer.add(t);
                if (treffer.size() >= 1) break;
            }
            println("## " + f.getName());
            for (String t : treffer) println("     " + t);
        }
        dec.dispose();
    }
}
