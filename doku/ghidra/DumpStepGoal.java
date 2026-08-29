import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;

public class DumpStepGoal extends GhidraScript {
    public void run() throws Exception {
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        // 1. Fasst applyAIV currentStepGoal an?
        Address a = currentProgram.getAddressFactory().getAddress("0x4EF0D0");
        Function f = getFunctionContaining(a);
        println("### applyAIV: Zeilen mit currentStepGoal / aivCurrentPause");
        DecompileResults r = dec.decompileFunction(f, 240, monitor);
        int treffer = 0;
        if (r != null && r.decompileCompleted())
            for (String z : r.getDecompiledFunction().getC().split("\n")) {
                String t = z.trim();
                if (t.contains("currentStepGoal") || t.contains("aivCurrentPause") || t.contains("aivPause")) {
                    println("   " + t); treffer++;
                }
            }
        if (treffer == 0) println("   KEINE Zeile - applyAIV fasst currentStepGoal nicht an");

        // 2. Wer schreibt currentStepGoal ueberhaupt?
        println("");
        println("### Funktionen, die den Bauzeiger bewegen (Suche ueber aiPlaceAIVBuilding-Umfeld)");
        for (Symbol s : currentProgram.getSymbolTable().getAllSymbols(true)) {
            if (s.getSymbolType() != SymbolType.FUNCTION) continue;
            String n = s.getName();
            if (n.startsWith("_Hold")) continue;
            String low = n.toLowerCase();
            if (low.contains("placeaiv") || low.contains("aivbuild") || low.contains("stepgoal")
                || low.contains("aivstep") || low.contains("processaiv"))
                println("   " + s.getAddress() + "  " + n);
        }

        // 3. aiPlaceAIVBuilding: wie waehlt es den naechsten Schritt?
        println("");
        println("### aiPlaceAIVBuilding 0x4ED431");
        Address b = currentProgram.getAddressFactory().getAddress("0x4ED431");
        Function g = getFunctionContaining(b);
        if (g != null) {
            println("Funktion: " + g.getName() + " @ " + g.getEntryPoint());
            DecompileResults r2 = dec.decompileFunction(g, 240, monitor);
            if (r2 != null && r2.decompileCompleted()) {
                String[] zeilen = r2.getDecompiledFunction().getC().split("\n");
                for (String z : zeilen) {
                    String t = z.trim();
                    if (t.contains("currentStepGoal") || t.contains("totalSteps") || t.contains("buildStatus")
                        || t.contains("buildInterval") || t.contains("aivPoor"))
                        println("   " + t);
                }
                println("   ---- " + zeilen.length + " Zeilen insgesamt");
            }
        }
        dec.dispose();
    }
}
