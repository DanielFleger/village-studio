import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.listing.*;
public class DumpDecide extends GhidraScript {
    public void run() throws Exception {
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        Function f = getFunctionAt(currentProgram.getAddressFactory().getAddress("0x4F15C0"));
        DecompileResults r = dec.decompileFunction(f, 240, monitor);
        if (r == null || !r.decompileCompleted()) { println("nicht dekompilierbar"); return; }
        String[] z = r.getDecompiledFunction().getC().split("\n");
        for (int i = 25; i < Math.min(z.length, 143); i++) println(String.format("%4d %s", i + 1, z[i]));
        dec.dispose();
    }
}
