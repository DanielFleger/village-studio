import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;

// Welche TASTE loest im Spiel den Screenshot aus?
// Der Aufruf sitzt bei 0x004b488d in WindowMsgProcessingFunc. Wird die Taste
// per PostMessage ans Fenster geschickt, macht das Spiel das Bild auf dem
// Weg, den es selbst benutzt - ohne Fokus und ohne Wiedereintritt.
public class DumpTaste extends GhidraScript {
    public void run() throws Exception {
        DecompInterface d = new DecompInterface();
        d.openProgram(currentProgram);
        AddressSpace sp = currentProgram.getAddressFactory().getDefaultAddressSpace();

        Function f = getFunctionContaining(sp.getAddress(0x4B2AE0L));
        println("### " + f.getName() + " @ " + f.getEntryPoint());

        DecompileResults r = d.decompileFunction(f, 180, monitor);
        if (r.decompileCompleted()) {
            String[] z = r.getDecompiledFunction().getC().split("\n");
            // Umgebung des Screenshot-Aufrufs zeigen
            for (int i = 0; i < z.length; i++) {
                if (z[i].contains("takeScreenshot") || z[i].contains("ScreenshotFilename")) {
                    int von = Math.max(0, i - 22), bis = Math.min(z.length, i + 4);
                    println("--- Zeilen " + von + ".." + bis + " ---");
                    for (int k = von; k < bis; k++) println("   " + z[k]);
                    println("");
                }
            }
        }

        // Der Rohcode vor dem Aufruf: dort steht der Tastenvergleich
        println("### Anweisungen vor 0x004b488d");
        Address a = sp.getAddress(0x4B4820L);
        Instruction i = currentProgram.getListing().getInstructionAt(a);
        int n = 0;
        while (i != null && n++ < 40 && i.getAddress().getOffset() <= 0x4B4895L) {
            String s = i.toString();
            String mark = "";
            if (s.toUpperCase().startsWith("CMP") || s.toUpperCase().startsWith("SUB")
                || s.contains("CALL")) mark = "   <--";
            println(String.format("   %s  %s%s", i.getAddress(), s, mark));
            i = i.getNext();
        }
        d.dispose();
    }
}
