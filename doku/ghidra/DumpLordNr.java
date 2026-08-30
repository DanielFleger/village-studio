import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.*;
import java.util.*;
public class DumpLordNr extends GhidraScript {
    public void run() throws Exception {
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> g = new HashSet<>();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!(d instanceof ghidra.program.model.data.Enum)) continue;
            if (!d.getName().startsWith("UnitType")) continue;
            if (!g.add(d.getPathName())) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            println("### " + d.getPathName() + "  (" + e.getCount() + " Werte)");
            List<String> nm = new ArrayList<>(Arrays.asList(e.getNames()));
            nm.sort((a,b)->Long.compare(e.getValue(a), e.getValue(b)));
            for (String n : nm) {
                long v = e.getValue(n);
                if (n.toUpperCase().contains("LORD") || n.toUpperCase().contains("KING")
                    || (v >= 20 && v <= 30) || (v >= 53 && v <= 57) || (v >= 70 && v <= 76))
                    println(String.format("   %3d = %s", v, n));
            }
        }
    }
}
