import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.*;
import java.util.*;

public class DumpSpawn4 extends GhidraScript {
    public void run() throws Exception {
        String[] such = {"logicalState","owner","unitType","uid","health","x","y","tile",
                         "displayColorPlayerID","calculatedOwnerPlayerIndex","microXPosition",
                         "microYPosition","time","facingDirection","stoneAmmunition","speed","dead"};
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> g = new HashSet<>();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("Unit") || !(d instanceof Structure)) continue;
            Structure s = (Structure) d;
            if (!g.add(d.getPathName())) continue;
            println("### Unit (" + s.getLength() + " Byte) - gesuchte Felder");
            for (DataTypeComponent c : s.getDefinedComponents()) {
                String n = c.getFieldName()==null?"":c.getFieldName();
                for (String w : such) {
                    if (n.equalsIgnoreCase(w) || (n.toLowerCase().contains(w.toLowerCase()) && w.length()>3)) {
                        println(String.format("   +0x%04X  %-40s %-14s (%d Byte)", c.getOffset(), n,
                            c.getDataType().getName(), c.getLength()));
                        break;
                    }
                }
            }
        }
        println("");
        println("### UnitLogicStateShort - was 'belegt' bedeutet");
        it = currentProgram.getDataTypeManager().getAllDataTypes();
        g.clear();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!(d instanceof ghidra.program.model.data.Enum)) continue;
            if (!d.getName().contains("UnitLogicState")) continue;
            if (!g.add(d.getPathName())) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            List<String> nm = new ArrayList<>(Arrays.asList(e.getNames()));
            nm.sort((a,b)->Long.compare(e.getValue(a), e.getValue(b)));
            for (String n : nm) println("   " + e.getValue(n) + " = " + n);
        }
        println("");
        println("### UnitType - Lord und die ersten Werte");
        it = currentProgram.getDataTypeManager().getAllDataTypes();
        g.clear();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("UnitType") || !(d instanceof ghidra.program.model.data.Enum)) continue;
            if (!g.add(d.getPathName())) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            println("   " + d.getPathName() + " (" + e.getCount() + " Werte, " + e.getLength() + " Byte)");
            List<String> nm = new ArrayList<>(Arrays.asList(e.getNames()));
            nm.sort((a,b)->Long.compare(e.getValue(a), e.getValue(b)));
            for (String n : nm) {
                long v = e.getValue(n);
                if (v <= 6 || n.toUpperCase().contains("LORD") || n.toUpperCase().contains("KING"))
                    println("      " + v + " = " + n);
            }
        }
    }
}
