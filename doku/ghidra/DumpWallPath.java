import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.*;
public class DumpWallPath extends GhidraScript {
    public void run() throws Exception {
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        Function g = getFunctionAt(currentProgram.getAddressFactory().getAddress("0x4ED410"));
        DecompileResults r = dec.decompileFunction(g, 240, monitor);
        if (r == null || !r.decompileCompleted()) { println("nicht dekompilierbar"); return; }
        String[] z = r.getDecompiledFunction().getC().split("\n");
        for (int i = 110; i < Math.min(z.length, 200); i++) println(String.format("%4d %s", i + 1, z[i]));
        dec.dispose();
    }
}
