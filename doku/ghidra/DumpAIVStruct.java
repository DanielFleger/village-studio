// Gibt Aufbau und Adresse der AIV-Strukturen aus.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.*;
import ghidra.program.model.symbol.*;
import java.util.*;

public class DumpAIVStruct extends GhidraScript {
    public void run() throws Exception {
        DataTypeManager dtm = currentProgram.getDataTypeManager();
        Iterator<DataType> it = dtm.getAllDataTypes();
        List<DataType> treffer = new ArrayList<>();
        while (it.hasNext()) {
            DataType d = it.next();
            String n = d.getName().toLowerCase();
            if (n.contains("aiv") || n.contains("mapper")) treffer.add(d);
        }
        println("### Datentypen mit AIV oder MAPPER im Namen: " + treffer.size());
        for (DataType d : treffer) {
            println("");
            println("=== " + d.getName() + "   (" + d.getLength() + " Byte)");
            if (d instanceof Structure) {
                Structure s = (Structure) d;
                for (DataTypeComponent c : s.getDefinedComponents())
                    println(String.format("   +0x%02X  %-28s %-22s %d Byte",
                        c.getOffset(),
                        c.getFieldName() == null ? "?" : c.getFieldName(),
                        c.getDataType().getName(), c.getLength()));
            } else if (d instanceof ghidra.program.model.data.Enum) {
                ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
                StringBuilder sb = new StringBuilder();
                for (String nm : e.getNames()) sb.append(nm).append("=").append(e.getValue(nm)).append("  ");
                println("   " + sb.toString());
            } else {
                println("   " + d.getClass().getSimpleName() + ": " + d.getDisplayName());
            }
        }
        println("");
        println("### Symbole mit AIV im Namen");
        SymbolTable st = currentProgram.getSymbolTable();
        SymbolIterator si = st.getAllSymbols(true);
        int n = 0;
        while (si.hasNext() && n < 60) {
            Symbol s = si.next();
            if (s.getName().toLowerCase().contains("aiv")) { println("   " + s.getAddress() + "  " + s.getName()); n++; }
        }
    }
}
