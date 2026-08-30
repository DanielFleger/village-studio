import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import java.util.*;
public class DumpEnt extends GhidraScript {
    public void run() throws Exception {
        DataIterator di = currentProgram.getListing().getDefinedData(true);
        while (di.hasNext()) {
            Data d = di.next();
            String t = d.getDataType().getName(), lb = d.getLabel() == null ? "" : d.getLabel();
            if (t.contains("Entit") || lb.contains("Entit"))
                println("   " + d.getAddress() + "  " + lb + " : " + t + "  (" + d.getLength() + " Byte)");
        }
        println("");
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> f = new HashSet<>();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!(d instanceof Structure)) continue;
            String n = d.getName();
            if (!n.toLowerCase().contains("entit") || !n.toLowerCase().contains("state")) continue;
            if (!f.add(n)) continue;
            println("=== " + n + " (" + d.getLength() + " Byte)");
            int k = 0;
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents()) {
                println(String.format("   +0x%06X  %-32s %-24s %d", c.getOffset(),
                    c.getFieldName() == null ? "?" : c.getFieldName(), c.getDataType().getName(), c.getLength()));
                if (++k > 10) break;
            }
        }
        println("");
        println("### EntityType: Geschosse");
        it = currentProgram.getDataTypeManager().getAllDataTypes();
        f.clear();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("EntityType") || !(d instanceof ghidra.program.model.data.Enum)) continue;
            if (!f.add("y")) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            List<String> nm = new ArrayList<>(Arrays.asList(e.getNames()));
            nm.sort((a, b) -> Long.compare(e.getValue(a), e.getValue(b)));
            for (String s : nm) {
                String u = s.toUpperCase();
                if (u.contains("ARROW") || u.contains("BOLT") || u.contains("ROCK") || u.contains("BOULDER")
                    || u.contains("SPEAR") || u.contains("FIRE") || u.contains("PROJ") || u.contains("STONE"))
                    println("   " + e.getValue(s) + " = " + s);
            }
        }
    }
}
