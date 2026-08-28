import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.*;
import java.util.*;
public class DumpLogic2 extends GhidraScript {
    public void run() throws Exception {
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> fertig = new HashSet<>();
        while (it.hasNext()) {
            DataType d = it.next();
            String n = d.getName();
            if (!n.startsWith("Logic2") && !n.startsWith("Logic3")) continue;
            if (!(d instanceof ghidra.program.model.data.Enum)) continue;
            if (!fertig.add(n)) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            println("=== " + n + " (" + e.getCount() + " Werte)");
            List<String> nm = new ArrayList<>(Arrays.asList(e.getNames()));
            nm.sort((a, b) -> Long.compare(e.getValue(a), e.getValue(b)));
            for (String s : nm) println(String.format("   0x%08X  %s", e.getValue(s), s));
        }
    }
}
