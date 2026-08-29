import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.*;
import java.util.*;
public class DumpWait extends GhidraScript {
    public void run() throws Exception {
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        Function ai = getFunctionAt(currentProgram.getAddressFactory().getAddress("0x4ED410"));
        println("### Aufrufer von aiPlaceAIVBuilding");
        for (Function c : ai.getCallingFunctions(monitor)) {
            println("   " + c.getEntryPoint() + "  " + c.getName());
            DecompileResults r = dec.decompileFunction(c, 240, monitor);
            if (r == null || !r.decompileCompleted()) { println("      nicht dekompilierbar"); continue; }
            String[] z = r.getDecompiledFunction().getC().split("\n");
            println("      --- Zeilen mit wait, buildInterval, currentStepGoal, aiPlaceAIVBuilding:");
            for (int i = 0; i < z.length; i++) {
                String t = z[i].trim();
                if (t.contains(".wait") || t.contains("buildInterval") || t.contains("currentStepGoal")
                    || t.contains("aiPlaceAIVBuilding") || t.contains("aivPoorLimit"))
                    println(String.format("      %4d  %s", i + 1, t));
            }
            println("      --- " + z.length + " Zeilen");
        }
        dec.dispose();
    }
}
