import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.*;
import java.util.*;
public class DumpFortschritt extends GhidraScript {
    public void run() throws Exception {
        println("### PlayerData: alles mit aiv im Namen");
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> fertig = new HashSet<>();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("PlayerData") || !(d instanceof Structure)) continue;
            if (!fertig.add(d.getName())) continue;
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents()) {
                String n = c.getFieldName() == null ? "" : c.getFieldName();
                if (n.toLowerCase().contains("aiv") || n.toLowerCase().contains("buildinterval")
                    || n.toLowerCase().contains("buildspeed") || n.toLowerCase().contains("step"))
                    println(String.format("   +0x%05X  %-42s %-26s %d", c.getOffset(), n,
                        c.getDataType().getName(), c.getLength()));
            }
        }
        println("");
        println("### AICSpecification: Bautempo-Kandidaten");
        it = currentProgram.getDataTypeManager().getAllDataTypes();
        fertig.clear();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("AICSpecification") || !(d instanceof Structure)) continue;
            if (!fertig.add(d.getName())) continue;
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents()) {
                String n = c.getFieldName() == null ? "" : c.getFieldName();
                String low = n.toLowerCase();
                if (low.contains("build") || low.contains("speed") || low.contains("interval")
                    || low.contains("delay") || low.contains("rate"))
                    println(String.format("   +0x%04X  %-42s %s", c.getOffset(), n, c.getDataType().getName()));
            }
        }
        println("");
        println("### Kostenstruktur");
        it = currentProgram.getDataTypeManager().getAllDataTypes();
        fertig.clear();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("BuildingCostStruct") || !(d instanceof Structure)) continue;
            if (!fertig.add(d.getName())) continue;
            println("   BuildingCostStruct (" + d.getLength() + " Byte)");
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents())
                println(String.format("      +0x%02X  %-30s %s", c.getOffset(),
                    c.getFieldName() == null ? "?" : c.getFieldName(), c.getDataType().getName()));
        }
    }
}
