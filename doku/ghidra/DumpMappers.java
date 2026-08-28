import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.*;
import java.util.*;
public class DumpMappers extends GhidraScript {
    public void run() throws Exception {
        DataTypeManager dtm = currentProgram.getDataTypeManager();
        Iterator<DataType> it = dtm.getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().startsWith("MappersEnum")) continue;
            if (!(d instanceof ghidra.program.model.data.Enum)) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            println("ENUM " + d.getName() + " (" + d.getLength() + " Byte, " + e.getCount() + " Werte)");
            List<String> namen = new ArrayList<>(Arrays.asList(e.getNames()));
            namen.sort((a,b) -> Long.compare(e.getValue(a), e.getValue(b)));
            for (String nm : namen) {
                long v = e.getValue(nm);
                String low = nm.toLowerCase();
                if (low.contains("wall") || low.contains("crenal") || low.contains("crenel")
                    || low.contains("stair") || low.contains("tower") || low.contains("gate")
                    || low.contains("moat") || low.contains("bridge") || low.contains("keep"))
                    println("   " + v + " = " + nm);
            }
            println("");
        }
    }
}
