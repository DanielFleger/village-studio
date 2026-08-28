import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.*;
import java.util.*;

public class DumpApplyFull extends GhidraScript {
    public void run() throws Exception {
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        for (String z : new String[]{ "0x4ECF70", "0x4EF0D0" }) {
            Address a = currentProgram.getAddressFactory().getAddress(z);
            Function f = getFunctionContaining(a);
            println("########## " + z + "  " + (f == null ? "?" : f.getName()));
            if (f == null) continue;
            println("Signatur: " + f.getSignature());
            DecompileResults r = dec.decompileFunction(f, 240, monitor);
            if (r == null || !r.decompileCompleted()) { println("nicht dekompilierbar"); continue; }
            String c = r.getDecompiledFunction().getC();
            if (z.equals("0x4ECF70")) { println(c); continue; }
            // applyAIV ist lang: nur die Zeilen mit Bezug zum Bergfried und zur Ausrichtung
            int nr = 0;
            for (String zeile : c.split("\n")) {
                nr++;
                String t = zeile.trim();
                if (t.contains("keep") || t.contains("Keep") || t.contains("rientation")
                    || t.contains("totalSteps") || t.contains("buildStatus") || t.contains("currentStepGoal")
                    || t.contains("castleID") || t.contains("aiType") || t.contains("playerID"))
                    println(String.format("   %4d  %s", nr, t));
            }
            println("   ---- Laenge insgesamt: " + c.split("\n").length + " Zeilen");
        }
        dec.dispose();
    }
}
