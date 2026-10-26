import ghidra.app.decompiler.*;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;

// Grafikfehler beim Drehen (26.10.2026): Womit wird die Zufallsschicht gefuellt,
// und laeuft das Neuberechnen des Bodenbilds (updateGfxLayer) beim Drehen?
// 1. Dekompilat von setupTileMapSections, nur die Zeilen um RandomLayer.
// 2. Aufrufer von updateGfxLayer / updateGFXLayers, drei Ebenen hoch.
// 3. Dekompilat der Dreh-Funktion setMapRotation und wer die Ausrichtung schreibt.
public class DumpRandomLayer extends GhidraScript {
    DecompInterface di;

    String dekompiliere(long adr) throws Exception {
        Function f = getFunctionAt(toAddr(adr));
        if (f == null) return "(keine Funktion bei 0x" + Long.toHexString(adr) + ")";
        DecompileResults r = di.decompileFunction(f, 120, monitor);
        return r.decompileCompleted() ? r.getDecompiledFunction().getC() : "(Dekompilat fehlgeschlagen)";
    }

    void aufrufer(Function f, int tiefe, Set<Function> gesehen) {
        if (tiefe > 3 || !gesehen.add(f)) return;
        for (Function c : f.getCallingFunctions(monitor)) {
            println("  ".repeat(tiefe) + "<- " + c.getName(true) + " @" + c.getEntryPoint());
            aufrufer(c, tiefe + 1, gesehen);
        }
    }

    public void run() throws Exception {
        di = new DecompInterface();
        di.openProgram(currentProgram);

        println("=== 1. setupTileMapSections, Zeilen mit RandomLayer");
        String[] z = dekompiliere(0x00511df0L).split("\n");
        for (int i = 0; i < z.length; i++)
            if (z[i].contains("Random") || z[i].contains("1bd0f48") || z[i].toLowerCase().contains("rand"))
                for (int k = Math.max(0, i - 4); k <= Math.min(z.length - 1, i + 4); k++)
                    println(String.format("%4d %s", k, z[k]));

        for (long a : new long[] { 0x00509180L, 0x004fc9e0L, 0x00511df0L }) {
            Function f = getFunctionAt(toAddr(a));
            println("=== 2. Aufrufer von " + f.getName(true));
            aufrufer(f, 1, new HashSet<>());
        }

        println("=== 3. setMapRotation 0x004f70e0");
        println(dekompiliere(0x004f70e0L));
        println("=== 3b. Wer liest/schreibt die Ausrichtung 0x01fe7aa4");
        for (Reference r : getReferencesTo(toAddr(0x01fe7aa4L))) {
            Function f = getFunctionContaining(r.getFromAddress());
            println("  " + r.getReferenceType() + "  " + (f == null ? "?" : f.getName(true) + " @" + f.getEntryPoint()));
        }
    }
}
