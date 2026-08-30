import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.*;
import java.util.*;
public class DumpUnitsState extends GhidraScript {
    public void run() throws Exception {
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("UnitsState") || !(d instanceof Structure)) continue;
            println("=== UnitsState (" + d.getLength() + " Byte)");
            int k = 0;
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents()) {
                println(String.format("   +0x%06X  %-36s %-26s %d", c.getOffset(),
                    c.getFieldName() == null ? "?" : c.getFieldName(),
                    c.getDataType().getName(), c.getLength()));
                if (++k > 14) break;
            }
        }
        // Lebenspunkte in Unit: alles mit health/hp
        println("");
        println("### Unit: Lebenspunkte und Kampfwerte");
        it = currentProgram.getDataTypeManager().getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("Unit") || !(d instanceof Structure)) continue;
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents()) {
                String n = c.getFieldName() == null ? "" : c.getFieldName();
                String low = n.toLowerCase();
                if (low.contains("health") || low.contains("hitpoint") || low.contains("hp")
                    || low.contains("armor") || low.contains("armour") || low.contains("attack")
                    || low.contains("dead") || low.contains("kill"))
                    println(String.format("   +0x%05X  %-38s %s", c.getOffset(), n, c.getDataType().getName()));
            }
        }
        // UnitType-Enum
        println("");
        println("### UnitType (Auszug)");
        it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> f = new HashSet<>();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("UnitType") || !(d instanceof ghidra.program.model.data.Enum)) continue;
            if (!f.add(d.getName())) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            List<String> nm = new ArrayList<>(Arrays.asList(e.getNames()));
            nm.sort((a, b) -> Long.compare(e.getValue(a), e.getValue(b)));
            int i = 0;
            for (String s : nm) { println("   " + e.getValue(s) + " = " + s); if (++i > 26) break; }
            println("   ... insgesamt " + e.getCount() + " Werte");
        }
    }
}
