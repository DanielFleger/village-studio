import ghidra.app.decompiler.*;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.*;

// Grafikfehler beim Drehen (26.10.2026): ganzes Dekompilat von updateGfxLayer
// und dem Takt-Aufruf daraus (wann wird neu berechnet, mit welchen Schichten).
public class DumpUpdateGfx extends GhidraScript {
    public void run() throws Exception {
        DecompInterface di = new DecompInterface();
        di.openProgram(currentProgram);
        for (long a : new long[] { 0x00509180L, 0x004fc9e0L }) {
            Function f = getFunctionAt(toAddr(a));
            DecompileResults r = di.decompileFunction(f, 300, monitor);
            println("##### " + f.getName(true));
            println(r.decompileCompleted() ? r.getDecompiledFunction().getC() : "(fehlgeschlagen)");
        }
        Function t = getFunctionAt(toAddr(0x0045cd10L));
        String c = di.decompileFunction(t, 300, monitor).getDecompiledFunction().getC();
        String[] z = c.split("\n");
        println("##### processGameTick, Zeilen um updateGfx / Orientation");
        for (int i = 0; i < z.length; i++)
            if (z[i].contains("updateGfxLayer") || z[i].contains("updateGFXLayers") || z[i].contains("Orientation"))
                for (int k = Math.max(0, i - 6); k <= Math.min(z.length - 1, i + 3); k++)
                    println(String.format("%5d %s", k, z[k]));
    }
}
