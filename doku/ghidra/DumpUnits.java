import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import java.util.*;
public class DumpUnits extends GhidraScript {
    public void run() throws Exception {
        println("### Adressen der Einheiten-Zustaende");
        DataIterator di = currentProgram.getListing().getDefinedData(true);
        while (di.hasNext()) {
            Data d = di.next();
            String t = d.getDataType().getName(), lb = d.getLabel() == null ? "" : d.getLabel();
            if (t.startsWith("UnitsState") || t.startsWith("UnitState") || lb.contains("UnitsState")
                || t.startsWith("TroopsState") || lb.contains("DAT_Units"))
                println("   " + d.getAddress() + "  " + lb + " : " + t);
        }
        println("");
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> fertig = new HashSet<>();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!(d instanceof Structure)) continue;
            String n = d.getName();
            if (!n.equals("Unit") && !n.equals("UnitsState")) continue;
            if (!fertig.add(n)) continue;
            println("=== " + n + "  (" + d.getLength() + " Byte)");
            int k = 0;
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents()) {
                String fn = c.getFieldName() == null ? "" : c.getFieldName();
                String low = fn.toLowerCase();
                boolean wichtig = low.contains("type") || low.contains("owner") || low.contains("health")
                    || low.contains("hp") || low.contains("uid") || low.contains("position") || low.contains("state")
                    || low.contains("speed") || low.contains("damage") || low.contains("target") || low.contains("tile")
                    || low.contains("player") || low.contains("count") || low.contains("units");
                if (wichtig || c.getOffset() < 0x14)
                    println(String.format("   +0x%05X  %-38s %-24s %d", c.getOffset(), fn, c.getDataType().getName(), c.getLength()));
                if (++k > 260) break;
            }
            println("");
        }
    }
}
