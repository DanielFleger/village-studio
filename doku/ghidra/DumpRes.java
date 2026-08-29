import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;

public class DumpRes extends GhidraScript {
    public void run() throws Exception {
        println("### ResourceType-Enum");
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> fertig = new HashSet<>();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!(d instanceof ghidra.program.model.data.Enum)) continue;
            String n = d.getName();
            if (!n.startsWith("ResourceType") && !n.equals("Resource")) continue;
            if (!fertig.add(n)) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            println("=== " + n + " (" + e.getCount() + ")");
            List<String> nm = new ArrayList<>(Arrays.asList(e.getNames()));
            nm.sort((a, b) -> Long.compare(e.getValue(a), e.getValue(b)));
            for (String s : nm) println("   " + e.getValue(s) + " = " + s);
        }
        println("");
        println("### BuildingsState um +0x134");
        it = currentProgram.getDataTypeManager().getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("BuildingsState") || !(d instanceof Structure)) continue;
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents())
                if (c.getOffset() >= 0x18C7D4 || c.getOffset() < 0x20)
                    println(String.format("   +0x%06X  %-40s %-28s %d", c.getOffset(),
                        c.getFieldName() == null ? "?" : c.getFieldName(),
                        c.getDataType().getName(), c.getLength()));
        }
        println("");
        println("### Funktionen: Resource / Gold / Stockpile / Treasury");
        for (Symbol s : currentProgram.getSymbolTable().getAllSymbols(true)) {
            if (s.getSymbolType() != SymbolType.FUNCTION) continue;
            String n = s.getName();
            if (n.startsWith("_Hold")) continue;
            String low = n.toLowerCase();
            if (low.contains("resourcegain") || low.contains("addresource") || low.contains("stockpile")
                || low.contains("gold") || low.contains("treasury") || low.contains("resourcelo"))
                println("   " + s.getAddress() + "  " + n);
        }
        println("");
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        for (String z : new String[]{ "0x41BB30" }) {
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
