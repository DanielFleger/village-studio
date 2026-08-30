import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.mem.*;
import java.util.*;

// Was ruft die Hauptschleife in JEDEM Durchlauf - auch im Hauptmenue?
// MenuView_MainMenu_DoEveryFrame (0x424DA0) tut es nachweislich nicht:
// der Haken sass, hat aber nie gefeuert.
public class DumpWinMain extends GhidraScript {
    public void run() throws Exception {
        DecompInterface d = new DecompInterface();
        d.openProgram(currentProgram);
        AddressSpace sp = currentProgram.getAddressFactory().getDefaultAddressSpace();

        Function f = getFunctionContaining(sp.getAddress(0x57BE10L));
        println("### WinMain @ " + (f == null ? "?" : f.getEntryPoint()));
        if (f != null) {
            DecompileResults r = d.decompileFunction(f, 120, monitor);
            if (r.decompileCompleted()) {
                String[] z = r.getDecompiledFunction().getC().split("\n");
                for (int i = 0; i < z.length; i++) println("   " + z[i]);
            }
        }

        println("");
        println("### Alle Aufrufe aus WinMain heraus (das sind die Schleifen-Bausteine)");
        if (f != null) {
            Set<String> seen = new LinkedHashSet<>();
            for (Instruction i : currentProgram.getListing().getInstructions(f.getBody(), true)) {
                if (!i.getMnemonicString().toUpperCase().startsWith("CALL")) continue;
                for (var ref : i.getReferencesFrom()) {
                    Function z = getFunctionAt(ref.getToAddress());
                    if (z != null) seen.add(String.format("   %s  %s", ref.getToAddress(), z.getName()));
                }
            }
            for (String x : seen) println(x);
        }
        d.dispose();
    }
}
