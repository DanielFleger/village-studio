import ghidra.app.decompiler.*;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;

// Grafikfehler beim Drehen, Gebaeude (27.10.2026): Was bedeutet der Drehwert von
// placeBuilding, wer setzt uiBuildingRotation, und was gibt die Spiel-KI mit?
public class DumpBauDrehung extends GhidraScript {
    DecompInterface di;
    String c(Function f) throws Exception {
        DecompileResults r = di.decompileFunction(f, 300, monitor);
        return r.decompileCompleted() ? r.getDecompiledFunction().getC() : "(fehlgeschlagen)";
    }
    public void run() throws Exception {
        di = new DecompInterface(); di.openProgram(currentProgram);
        FunctionManager fm = currentProgram.getFunctionManager();
        Function place = null;
        for (Function f : fm.getFunctions(true))
            if (f.getName().equals("placeBuilding") && f.getParentNamespace().getName().equals("TileMapState")) place = f;
        println("##### placeBuilding @" + place.getEntryPoint());
        println(c(place));
        println("##### Aufrufer von placeBuilding (Zeile mit dem Aufruf)");
        for (Function k : place.getCallingFunctions(monitor)) {
            for (String z : c(k).split("\n"))
                if (z.contains("placeBuilding")) println("  " + k.getName(true) + ": " + z.trim());
        }
        println("##### Wer schreibt uiBuildingRotation");
        for (Function f : fm.getFunctions(true)) {
            String t = null;
            try { t = c(f); } catch (Exception e) { continue; }
            if (t == null || !t.contains("uiBuildingRotation =")) continue;
            for (String z : t.split("\n"))
                if (z.contains("uiBuildingRotation =")) println("  " + f.getName(true) + ": " + z.trim());
        }
    }
}
