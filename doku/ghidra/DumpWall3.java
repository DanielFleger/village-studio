import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;

public class DumpWall3 extends GhidraScript {
    public void run() throws Exception {
        // Wer greift auf das wallPlacementInfoArray (0xEE1E9C) zu?
        println("### ZUGRIFFE auf 0xEE1E9C (wallPlacementInfoArray)");
        Set<String> gesehen = new LinkedHashSet<>();
        for (long off = 0; off < 0x20; off += 4) {
            Address a = currentProgram.getAddressFactory().getAddress(Long.toHexString(0xEE1E9CL + off));
            for (Reference r : getReferencesTo(a)) {
                Function f = getFunctionContaining(r.getFromAddress());
                gesehen.add((f == null ? "?" : f.getName()) + "  @" + (f == null ? r.getFromAddress() : f.getEntryPoint())
                            + "   (" + r.getReferenceType() + " auf +0x" + Long.toHexString(off) + ")");
            }
        }
        for (String s : gesehen) println("   " + s);

        println("");
        println("### ZUGRIFFE auf 0xEE1E80 (WallAndPitchState) und Umfeld");
        gesehen.clear();
        for (long off = 0; off < 0x1C; off += 4) {
            Address a = currentProgram.getAddressFactory().getAddress(Long.toHexString(0xEE1E80L + off));
            for (Reference r : getReferencesTo(a)) {
                Function f = getFunctionContaining(r.getFromAddress());
                gesehen.add((f == null ? "?" : f.getName()) + "   (+0x" + Long.toHexString(off) + ")");
            }
        }
        for (String s : gesehen) println("   " + s);

        // HandleWallTerrainMouseDrag dekompilieren - dort entsteht die Vorschau
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        for (String z : new String[]{ "0x437cc0" }) {
            Address a = currentProgram.getAddressFactory().getAddress(z);
            Function f = getFunctionContaining(a);
            println("");
            println("########## " + z + "  " + (f == null ? "?" : f.getName()));
            if (f == null) continue;
            DecompileResults r = dec.decompileFunction(f, 180, monitor);
            if (r != null && r.decompileCompleted()) {
                String c = r.getDecompiledFunction().getC();
                // nur die Zeilen mit Bezug zur Liste
                for (String zeile : c.split("\n"))
                    if (zeile.contains("PlacementInfo") || zeile.contains("Damage")
                        || zeile.contains("Height") || zeile.contains("Logic")
                        || zeile.contains("destroy") || zeile.contains("Command"))
                        println("   " + zeile.trim());
            }
        }
        dec.dispose();
    }
}
