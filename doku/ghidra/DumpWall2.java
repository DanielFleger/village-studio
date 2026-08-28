import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;

public class DumpWall2 extends GhidraScript {
    public void run() throws Exception {
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        String[] ziele = { "0x484C40", "0x481F40", "0x41C190" };
        for (String z : ziele) {
            Address a = currentProgram.getAddressFactory().getAddress(z);
            Function f = getFunctionContaining(a);
            println("########## " + z + "  " + (f == null ? "?" : f.getName()));
            if (f == null) continue;
            println("Signatur: " + f.getSignature());
            DecompileResults r = dec.decompileFunction(f, 180, monitor);
            if (r != null && r.decompileCompleted()) println(r.getDecompiledFunction().getC());
            else println("nicht dekompilierbar");
        }
        // Wer schreibt in receivedWallPlacementInfoArray?
        println("########## SCHREIBER auf DAT_WallAndPitchState");
        Address basis = currentProgram.getAddressFactory().getAddress("0xEE1E80");
        for (Symbol s : currentProgram.getSymbolTable().getSymbols(basis)) {
            println("   Symbol an 0xEE1E80: " + s.getName());
            for (Reference r : getReferencesTo(basis)) {
                Function f = getFunctionContaining(r.getFromAddress());
                println("      " + r.getFromAddress() + "  " + r.getReferenceType()
                        + "  " + (f == null ? "?" : f.getName()));
            }
        }
        dec.dispose();
    }
}
