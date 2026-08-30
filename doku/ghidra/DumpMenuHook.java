import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.mem.*;

// Einsprungbytes fuer den Menue-Haken. hookCode braucht eine ganze Zahl von
// Anweisungen, die mindestens 5 Byte lang ist (Platz fuer den Sprung).
public class DumpMenuHook extends GhidraScript {
    public void run() throws Exception {
        AddressSpace sp = currentProgram.getAddressFactory().getDefaultAddressSpace();
        Memory m = currentProgram.getMemory();
        for (long adr : new long[]{0x470040L, 0x440430L}) {
            Address a = sp.getAddress(adr);
            Function f = getFunctionContaining(a);
            println("### " + (f == null ? "?" : f.getName()) + " @ " + a
                    + "  [" + (f == null ? "?" : f.getCallingConventionName()) + "]");
            byte[] b = new byte[24];
            m.getBytes(a, b);
            StringBuilder hex = new StringBuilder();
            for (byte x : b) hex.append(String.format("%02x ", x));
            println("   Bytes : " + hex.toString().trim());
            Instruction i = currentProgram.getListing().getInstructionAt(a);
            int summe = 0, n = 0;
            while (i != null && n++ < 6) {
                summe += i.getLength();
                println(String.format("     %s  %-34s (%d Byte, Summe %d)%s",
                    i.getAddress(), i.toString(), i.getLength(), summe,
                    summe >= 5 && n <= 4 ? "   <- ab hier reicht es fuer den Sprung" : ""));
                i = i.getNext();
            }
            // letztes RET fuer die Aufrufart
            Instruction last = null;
            if (f != null)
                for (Instruction x : currentProgram.getListing().getInstructions(f.getBody(), true))
                    if (x.getMnemonicString().equalsIgnoreCase("RET")) last = x;
            println("   letztes RET: " + (last == null ? "?" : last.toString()));
            println("");
        }
    }
}
