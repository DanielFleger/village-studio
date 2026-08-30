import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.*;
public class DumpCost2 extends GhidraScript {
    public void run() throws Exception {
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        for (String z : new String[]{ "0x40C5F0", "0x419780" }) {
            Address a = currentProgram.getAddressFactory().getAddress(z);
            Function f = getFunctionContaining(a);
            println("########## " + z + "  " + (f == null ? "?" : f.getName()));
            if (f == null) continue;
            println("Signatur: " + f.getSignature());
            DecompileResults r = dec.decompileFunction(f, 180, monitor);
            if (r == null || !r.decompileCompleted()) { println("   nicht dekompilierbar"); continue; }
            String[] zl = r.getDecompiledFunction().getC().split("\n");
            int n = 0;
            for (String t : zl) {
                String s = t.trim();
                if (s.contains("buildingCosts") || s.contains("required") || s.contains("Cost")
                    || s.contains("return") || s.contains("DAT_")) {
                    println("   " + s);
                    if (++n > 22) break;
                }
            }
            println("   ---- " + zl.length + " Zeilen");
        }
        dec.dispose();
    }
}
