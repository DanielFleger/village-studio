import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.*;
import java.util.*;

public class DumpTempo extends GhidraScript {
    public void run() throws Exception {
        String[] adr = { "0x4c6d60","0x4c7120","0x4c7520","0x4c7910","0x4c7d20","0x4c8110",
                         "0x4c8530","0x4c8920","0x4c8d20","0x4c9120","0x4c94f0","0x4c9900",
                         "0x4c9cf0","0x4ca0c0","0x4ca4d0","0x4ca8a0" };
        String[] lord = { "Rat","Snake","Pig","Wolf","Saladin","Caliph","Sultan","Richard",
                          "Frederick","Phillip","Wazir","Emir","Nizar","Sheriff","Marshal","Abbot" };
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        println("### buildInterval je Lord (AIC-Slot = Nummer + 1)");
        for (int i = 0; i < adr.length; i++) {
            Address a = currentProgram.getAddressFactory().getAddress(adr[i]);
            Function f = getFunctionContaining(a);
            if (f == null) continue;
            DecompileResults r = dec.decompileFunction(f, 120, monitor);
            if (r == null || !r.decompileCompleted()) continue;
            String bi = "?", rd = "?";
            for (String z : r.getDecompiledFunction().getC().split("\n")) {
                String t = z.trim();
                if (t.contains("buildInterval") && t.contains("=")) bi = t.replaceAll(".*=\s*", "").replace(";", "");
                if (t.contains("resourceRebuildDelay") && t.contains("=")) rd = t.replaceAll(".*=\s*", "").replace(";", "");
            }
            println(String.format("   AIC %2d  %-10s buildInterval = %-8s resourceRebuildDelay = %s",
                    i + 1, lord[i], bi, rd));
        }
        dec.dispose();
    }
}
