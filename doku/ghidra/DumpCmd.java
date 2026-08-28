import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.Address;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;

public class DumpCmd extends GhidraScript {
    public void run() throws Exception {
        println("### queueCommand & Co");
        for (Symbol s : currentProgram.getSymbolTable().getAllSymbols(true)) {
            if (s.getSymbolType() != SymbolType.FUNCTION) continue;
            String n = s.getName();
            if (n.startsWith("_Hold")) continue;
            String low = n.toLowerCase();
            if (low.contains("queuecommand") || low.contains("scheduleandsend")
                || low.equals("processcommand") || low.contains("sendcommand"))
                println("   " + s.getAddress() + "  " + n + "   " + getFunctionAt(s.getAddress()));
        }
        println("");
        println("### GameSynchronyState: Parameter-Felder");
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("GameSynchronyState") || !(d instanceof Structure)) continue;
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents()) {
                String n = c.getFieldName() == null ? "" : c.getFieldName();
                if (n.contains("CommandParam") || n.contains("CommandSize")
                    || n.contains("CommandActionPlan") || n.contains("protocolInvokerPlayerID")
                    || n.contains("CommandType") || n.contains("Command"))
                    println(String.format("   +0x%05X  %-40s %-24s %d", c.getOffset(), n,
                        c.getDataType().getName(), c.getLength()));
            }
        }
        println("");
        println("### Befehlstyp-Enum: Eintraege mit Wall, Pitch, Destroy");
        it = currentProgram.getDataTypeManager().getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!(d instanceof ghidra.program.model.data.Enum)) continue;
            if (!d.getName().startsWith("GCT")) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            println("ENUM " + d.getName() + " (" + e.getCount() + " Werte)");
            List<String> namen = new ArrayList<>(Arrays.asList(e.getNames()));
            namen.sort((a, b) -> Long.compare(e.getValue(a), e.getValue(b)));
            for (String nm : namen) {
                String low = nm.toLowerCase();
                if (low.contains("wall") || low.contains("pitch") || low.contains("destroy")
                    || low.contains("demolish") || low.contains("terrain"))
                    println("   " + e.getValue(nm) + " (0x" + Long.toHexString(e.getValue(nm)) + ") = " + nm);
            }
        }
        println("");
        println("### queueCommand dekompiliert");
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        for (Symbol s : currentProgram.getSymbolTable().getAllSymbols(true)) {
            if (s.getSymbolType() != SymbolType.FUNCTION) continue;
            if (!s.getName().equals("queueCommand")) continue;
            Function f = getFunctionAt(s.getAddress());
            if (f == null) continue;
            println("Signatur: " + f.getSignature() + "  @ " + f.getEntryPoint());
            DecompileResults r = dec.decompileFunction(f, 120, monitor);
            if (r != null && r.decompileCompleted()) println(r.getDecompiledFunction().getC());
            break;
        }
        dec.dispose();
    }
}
