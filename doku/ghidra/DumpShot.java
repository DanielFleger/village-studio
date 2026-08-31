import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.mem.*;
import ghidra.program.model.symbol.*;

// takeScreenshot: das Spiel schreibt sein eigenes Bild in eine Datei.
// Der Weg ueber GDI (PrintWindow, BitBlt) scheitert, weil DirectX daran
// vorbeizeichnet - diese Funktion nicht, sie sitzt hinter der Zeichenkette.
public class DumpShot extends GhidraScript {
    public void run() throws Exception {
        DecompInterface d = new DecompInterface();
        d.openProgram(currentProgram);
        AddressSpace sp = currentProgram.getAddressFactory().getDefaultAddressSpace();

        Function f = getFunctionContaining(sp.getAddress(0x479540L));
        println("### " + (f == null ? "?" : f.getName()) + " @ " + f.getEntryPoint()
                + "   [" + f.getCallingConventionName() + "]");
        println("   " + f.getSignature());

        DecompileResults r = d.decompileFunction(f, 90, monitor);
        if (r.decompileCompleted()) {
            println("--- Dekompilat ---");
            println(r.getDecompiledFunction().getC());
        }

        println("");
        println("### Einsprungbytes");
        byte[] b = new byte[24];
        currentProgram.getMemory().getBytes(f.getEntryPoint(), b);
        StringBuilder hex = new StringBuilder();
        for (byte x : b) hex.append(String.format("%02x ", x));
        println("   " + hex.toString().trim());
        Instruction i = currentProgram.getListing().getInstructionAt(f.getEntryPoint());
        int n = 0, summe = 0;
        while (i != null && n++ < 6) {
            summe += i.getLength();
            println(String.format("     %s  %-32s (%d, Summe %d)", i.getAddress(), i, i.getLength(), summe));
            i = i.getNext();
        }
        Instruction last = null;
        for (Instruction x : currentProgram.getListing().getInstructions(f.getBody(), true))
            if (x.getMnemonicString().equalsIgnoreCase("RET")) last = x;
        println("   letztes RET: " + (last == null ? "?" : last.toString()));

        println("");
        println("### this: DAT_WindowAndDirectDraw");
        for (Symbol s : currentProgram.getSymbolTable().getAllSymbols(true)) {
            String nm = s.getName();
            if (nm.equals("DAT_WindowAndDirectDraw") || nm.startsWith("DAT_WindowAndDirectDraw."))
                { println(String.format("   %s  %s", s.getAddress(), nm)); if (nm.length() > 26) break; }
        }

        println("");
        println("### Wer ruft takeScreenshot auf? (dort steht der Parameter)");
        for (Reference ref : getReferencesTo(f.getEntryPoint())) {
            Function auf = getFunctionContaining(ref.getFromAddress());
            println(String.format("   %s  in %s", ref.getFromAddress(),
                auf == null ? "?" : auf.getName() + " @ " + auf.getEntryPoint()));
            if (auf != null) {
                DecompileResults rr = d.decompileFunction(auf, 60, monitor);
                if (rr.decompileCompleted()) {
                    for (String z : rr.getDecompiledFunction().getC().split("\n"))
                        if (z.contains("takeScreenshot") || z.toLowerCase().contains("screen"))
                            println("      > " + z.trim());
                }
            }
        }
        d.dispose();
    }
}
