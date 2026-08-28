import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.*;
import java.util.*;
public class DumpLogic extends GhidraScript {
    public void run() throws Exception {
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        List<String> namen = new ArrayList<>();
        while (it.hasNext()) {
            DataType d = it.next();
            String n = d.getName();
            String low = n.toLowerCase();
            if (!(low.contains("logic") || low.contains("tileflag") || low.contains("tilebit")
                  || low.contains("walltype") || low.contains("wallflag"))) continue;
            namen.add(n + " [" + d.getClass().getSimpleName() + "]");
            if (d instanceof ghidra.program.model.data.Enum) {
                ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
                println("=== ENUM " + n + " (" + e.getCount() + " Werte)");
                List<String> nm = new ArrayList<>(Arrays.asList(e.getNames()));
                nm.sort((a, b) -> Long.compare(e.getValue(a), e.getValue(b)));
                for (String s : nm) println(String.format("   0x%08X  %s", e.getValue(s), s));
            } else if (d instanceof Structure) {
                println("=== STRUKTUR " + n + " (" + d.getLength() + " Byte)");
                for (DataTypeComponent c : ((Structure) d).getDefinedComponents())
                    println(String.format("   +0x%04X  %-30s %s", c.getOffset(),
                        c.getFieldName() == null ? "?" : c.getFieldName(), c.getDataType().getName()));
            }
        }
        println("");
        println("### gefundene Typnamen: " + namen);
    }
}
