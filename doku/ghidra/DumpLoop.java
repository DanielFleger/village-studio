import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.mem.*;
import ghidra.program.model.symbol.*;
import java.util.*;

// Gesucht: eine Funktion, die AUCH im Hauptmenue jeden Bildaufbau laeuft.
// processGameTick reicht nicht - der tickt nur im Gefecht, und genau deshalb
// kann der Befehlskanal aus dem Menue heraus kein Gefecht starten.
public class DumpLoop extends GhidraScript {
    public void run() throws Exception {
        DecompInterface d = new DecompInterface();
        d.openProgram(currentProgram);
        AddressSpace sp = currentProgram.getAddressFactory().getDefaultAddressSpace();

        println("### Kandidaten fuer die Hauptschleife / Menueschleife");
        String[] w = {"mainloop", "main_loop", "gameloop", "wndproc", "windowproc",
                      "messageloop", "pumpmessage", "peekmessage", "renderframe",
                      "drawframe", "updatemenu", "menuloop", "processmenu",
                      "mainmenu", "tickmenu", "runframe", "doframe"};
        for (Function f : currentProgram.getFunctionManager().getFunctions(true)) {
            String n = f.getName().toLowerCase();
            for (String k : w) {
                if (n.contains(k)) {
                    println(String.format("   %s  %-52s [%s]", f.getEntryPoint(),
                        f.getName(), f.getCallingConventionName()));
                    break;
                }
            }
        }

        println("");
        println("### Wer ruft processGameTick (0x45CD10) auf? Der Aufrufer ist die Schleife.");
        for (Reference r : getReferencesTo(sp.getAddress(0x45CD10L))) {
            Function auf = getFunctionContaining(r.getFromAddress());
            println(String.format("   %s  in %s", r.getFromAddress(),
                auf == null ? "?" : auf.getName() + " @ " + auf.getEntryPoint()));
        }

        println("");
        println("### Wer ruft SetupSkirmishMode (0x4C68D0) auf? Dort sitzt der Menuepunkt.");
        for (Reference r : getReferencesTo(sp.getAddress(0x4C68D0L))) {
            Function auf = getFunctionContaining(r.getFromAddress());
            println(String.format("   %s  in %s", r.getFromAddress(),
                auf == null ? "?" : auf.getName() + " @ " + auf.getEntryPoint()));
        }
        d.dispose();
    }
}
