import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.*;
import java.util.*;

public class DumpKosten extends GhidraScript {
    public void run() throws Exception {
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);

        // 1. Wer zieht ueberhaupt Baukosten ab?
        Address a = currentProgram.getAddressFactory().getAddress("0x41BFD0");
        Function f = getFunctionContaining(a);
        println("########## processPlacementResourceLossForBuildingType");
        if (f != null) {
            println("Signatur: " + f.getSignature());
            DecompileResults r = dec.decompileFunction(f, 180, monitor);
            if (r != null && r.decompileCompleted()) println(r.getDecompiledFunction().getC());
            println("### Aufrufer:");
            for (Function c : f.getCallingFunctions(monitor)) println("   " + c.getEntryPoint() + "  " + c.getName());
        }

        // 2. aiPlaceAIVBuilding: der Mauerpfad gegen den Gebaeudepfad
        println("");
        println("########## aiPlaceAIVBuilding - Struktur");
        Address b = currentProgram.getAddressFactory().getAddress("0x4ED410");
        Function g = getFunctionAt(b);
        if (g != null) {
            DecompileResults r2 = dec.decompileFunction(g, 240, monitor);
            if (r2 != null && r2.decompileCompleted()) {
                String[] zeilen = r2.getDecompiledFunction().getC().split("\n");
                for (int i = 0; i < zeilen.length; i++) {
                    String t = zeilen[i].trim();
                    if (t.contains("ResourceLoss") || t.contains("hasEnough") || t.contains("HasEnough")
                        || t.contains("insufficient") || t.contains("MAPPER_WALL") || t.contains("MAPPER_CRENAL")
                        || t.contains("MAPPER_STAIR") || t.contains("buildWall") || t.contains("placeWall")
                        || t.contains("Cost") || t.contains("switch") || t.contains("case M_MAPPER"))
                        println(String.format("   %4d  %s", i + 1, t));
                }
                println("   ---- " + zeilen.length + " Zeilen");
            }
        }
        dec.dispose();
    }
}
