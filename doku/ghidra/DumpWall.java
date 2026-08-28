import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;

public class DumpWall extends GhidraScript {
    public void run() throws Exception {
        // 1. Was liegt an 0xEE1E9C und drumherum?
        println("### DATEN um 0xEE1E9C");
        Listing l = currentProgram.getListing();
        Address von = currentProgram.getAddressFactory().getAddress("0xEE1E00");
        Address bis = currentProgram.getAddressFactory().getAddress("0xEE2100");
        DataIterator di = l.getDefinedData(true);
        while (di.hasNext()) {
            Data d = di.next();
            if (d.getAddress().compareTo(von) < 0) continue;
            if (d.getAddress().compareTo(bis) > 0) break;
            println("   " + d.getAddress() + "  " + (d.getLabel() == null ? "" : d.getLabel())
                    + " : " + d.getDataType().getName() + " (" + d.getLength() + " Byte)");
        }

        // 2. Strukturen, die nach Mauer aussehen
        println("");
        println("### STRUKTUREN mit Wall im Namen");
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().toLowerCase().contains("wall")) continue;
            println("=== " + d.getName() + " (" + d.getLength() + " Byte)");
            if (d instanceof Structure)
                for (DataTypeComponent c : ((Structure) d).getDefinedComponents())
                    println(String.format("   +0x%03X  %-30s %-24s %d", c.getOffset(),
                        c.getFieldName() == null ? "?" : c.getFieldName(),
                        c.getDataType().getName(), c.getLength()));
            else if (d instanceof ghidra.program.model.data.Enum) {
                ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
                StringBuilder sb = new StringBuilder();
                for (String nm : e.getNames()) sb.append(e.getValue(nm)).append("=").append(nm).append("  ");
                println("   " + sb);
            }
        }

        // 3. Funktionen mit Wall im Namen
        println("");
        println("### FUNKTIONEN mit Wall im Namen");
        for (Symbol s : currentProgram.getSymbolTable().getAllSymbols(true)) {
            if (s.getSymbolType() != SymbolType.FUNCTION) continue;
            String n = s.getName();
            if (n.toLowerCase().contains("wall")) println("   " + s.getAddress() + "  " + n);
        }

        // 4. destroyWall dekompilieren
        println("");
        println("### destroyWall 0x500E20");
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        Address a = currentProgram.getAddressFactory().getAddress("0x500E20");
        Function f = getFunctionContaining(a);
        if (f != null) {
            println("Signatur: " + f.getSignature());
            DecompileResults r = dec.decompileFunction(f, 180, monitor);
            if (r != null && r.decompileCompleted()) println(r.getDecompiledFunction().getC());
            println("");
            println("### AUFRUFER von destroyWall");
            for (Function c : f.getCallingFunctions(monitor)) println("   " + c.getEntryPoint() + "  " + c.getName());
        }
        dec.dispose();
    }
}
