import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import java.util.*;

public class DumpGold extends GhidraScript {
    public void run() throws Exception {
        println("### GameStateStructures: playerDataArray");
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("GameStateStructures") || !(d instanceof Structure)) continue;
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents()) {
                String n = c.getFieldName() == null ? "" : c.getFieldName();
                if (n.contains("player") || n.contains("Player"))
                    println(String.format("   +0x%06X  %-34s %-30s %d", c.getOffset(), n,
                        c.getDataType().getName(), c.getLength()));
            }
        }
        println("");
        println("### PlayerData: Waren und Gold");
        it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> fertig = new HashSet<>();
        while (it.hasNext()) {
            DataType d = it.next();
            String n = d.getName();
            if (!n.startsWith("PlayerData") || !(d instanceof Structure)) continue;
            if (!fertig.add(n)) continue;
            println("=== " + n + " (" + d.getLength() + " Byte)");
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents()) {
                String fn = c.getFieldName() == null ? "" : c.getFieldName();
                String low = fn.toLowerCase();
                if (low.contains("resource") || low.contains("gold") || low.contains("popular")
                    || low.contains("tax") || c.getOffset() < 0x40)
                    println(String.format("   +0x%05X  %-38s %-26s %d", c.getOffset(), fn,
                        c.getDataType().getName(), c.getLength()));
            }
        }
        println("");
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        for (String z : new String[]{ "0x41C310" }) {
            Address a = currentProgram.getAddressFactory().getAddress(z);
            Function f = getFunctionContaining(a);
            println("########## " + z + "  " + (f == null ? "?" : f.getName()));
            if (f == null) continue;
            println("Signatur: " + f.getSignature());
            DecompileResults r = dec.decompileFunction(f, 180, monitor);
            if (r != null && r.decompileCompleted()) println(r.getDecompiledFunction().getC());
        }
        dec.dispose();
    }
}
