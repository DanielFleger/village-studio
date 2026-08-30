import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;

// Wie startet das Spiel selbst ein Gefecht - und gibt es einen Weg, einen
// Spielstand zu laden? Ziel: Testlaeufe ohne Menue und ohne Mauszeiger.
public class DumpStart extends GhidraScript {

    public void run() throws Exception {
        DecompInterface d = new DecompInterface();
        d.openProgram(currentProgram);

        // 1) Kandidaten: Gefecht starten, Spielstand laden
        println("### Funktionen zum Starten / Laden");
        List<Function> ziel = new ArrayList<>();
        for (Function f : currentProgram.getFunctionManager().getFunctions(true)) {
            String n = f.getName();
            String l = n.toLowerCase();
            if (l.contains("launchskirmish") || l.contains("startskirmish")
                || l.contains("loadsave") || l.contains("loadgame")
                || l.contains("startgame") || l.contains("loadmap")
                || (l.contains("skirmish") && (l.contains("setup") || l.contains("init")))) {
                println(String.format("   %s  %s", f.getEntryPoint(), n));
                ziel.add(f);
            }
        }

        // 2) LaunchSkirmishGame im Klartext
        Address a = currentProgram.getAddressFactory()
                    .getDefaultAddressSpace().getAddress(0x441270L);
        Function f = getFunctionContaining(a);
        println("");
        println("### 0x441270 = " + (f == null ? "keine Funktion" : f.getName()));
        if (f != null) {
            println("   Signatur: " + f.getSignature());
            println("   Aufrufart: " + f.getCallingConventionName());
            DecompileResults r = d.decompileFunction(f, 120, monitor);
            if (r.decompileCompleted()) {
                String c = r.getDecompiledFunction().getC();
                // nur die ersten 90 Zeilen - der Rest ist Deko
                String[] z = c.split("\n");
                for (int i = 0; i < Math.min(90, z.length); i++) println("   " + z[i]);
                if (z.length > 90) println("   ... (" + (z.length - 90) + " weitere Zeilen)");
            }
            println("");
            println("### Wer ruft LaunchSkirmishGame auf?");
            for (Reference ref : getReferencesTo(f.getEntryPoint())) {
                Function auf = getFunctionContaining(ref.getFromAddress());
                println(String.format("   %s  in %s", ref.getFromAddress(),
                    auf == null ? "(unbekannt)" : auf.getName()));
            }
        }
        d.dispose();
    }
}
