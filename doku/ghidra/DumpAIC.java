import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import java.util.*;
public class DumpAIC extends GhidraScript {
    public void run() throws Exception {
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (d.getName().equals("AICSpecification") && d instanceof Structure) {
                println("=== AICSpecification (" + d.getLength() + " Byte), erste Felder:");
                int n = 0;
                for (DataTypeComponent c : ((Structure) d).getDefinedComponents()) {
                    if (n++ > 10) break;
                    println(String.format("   +0x%04X  %-34s %-22s %d", c.getOffset(),
                        c.getFieldName() == null ? "?" : c.getFieldName(),
                        c.getDataType().getName(), c.getLength()));
                }
            }
        }
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        // Wer ruft setAICParameters_01 auf, und wie wird der Lord gewaehlt?
        Address a = currentProgram.getAddressFactory().getAddress("0x4c6d60");
        Function f = getFunctionContaining(a);
        println("");
        println("### setAICParameters_01: " + (f == null ? "?" : f.getSignature()));
        if (f != null) for (Function c : f.getCallingFunctions(monitor)) {
            println("   Aufrufer: " + c.getEntryPoint() + "  " + c.getName());
            DecompileResults r = dec.decompileFunction(c, 120, monitor);
            if (r != null && r.decompileCompleted()) {
                String[] zeilen = r.getDecompiledFunction().getC().split("\n");
                int gezeigt = 0;
                for (String z : zeilen)
                    if ((z.contains("setAICParameters") || z.contains("case ") || z.contains("switch")) && gezeigt++ < 30)
                        println("      " + z.trim());
            }
        }
        dec.dispose();
    }
}
