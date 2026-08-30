import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.*;
import ghidra.program.model.data.*;
import ghidra.program.model.symbol.*;
import java.util.*;

public class DumpSpawn3 extends GhidraScript {
    public void run() throws Exception {
        // A) UnitsState: wo beginnt units[] und was steht davor
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        println("### UnitsState - Kopf und Beginn von units[]");
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("UnitsState") || !(d instanceof Structure)) continue;
            Structure s = (Structure) d;
            println("   Gesamtlaenge " + s.getLength());
            for (DataTypeComponent c : s.getDefinedComponents()) {
                DataType ct = c.getDataType();
                String ex = "";
                if (ct instanceof Array) { Array a = (Array) ct;
                    ex = String.format("   [%d x %d Byte]", a.getNumElements(), a.getElementLength()); }
                if (c.getOffset() <= 0x6B0 || (ct instanceof Array))
                    println(String.format("   +0x%05X  %-30s %-20s len=%d%s", c.getOffset(),
                        c.getFieldName()==null?"?":c.getFieldName(), ct.getName(), c.getLength(), ex));
            }
        }
        // B) Unit: die ersten Felder (Offset von logicalState!)
        println("");
        println("### Unit - die ersten 12 Felder");
        it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> g = new HashSet<>();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("Unit") || !(d instanceof Structure)) continue;
            Structure s = (Structure) d;
            if (!g.add(d.getPathName())) continue;
            println("   " + d.getPathName() + "  Groesse " + s.getLength());
            int k = 0;
            for (DataTypeComponent c : s.getDefinedComponents()) {
                println(String.format("      +0x%04X  %-32s %s", c.getOffset(),
                    c.getFieldName()==null?"?":c.getFieldName(), c.getDataType().getName()));
                if (++k >= 12) break;
            }
            // gezielt: unitType / health
            println("      --- gesucht ---");
            for (DataTypeComponent c : s.getDefinedComponents()) {
                String n = c.getFieldName()==null?"":c.getFieldName();
                if (n.equals("unitType")||n.equals("type")||n.equals("owner")||n.equals("uid")
                    ||n.toLowerCase().contains("health")||n.equals("x")||n.equals("y"))
                    println(String.format("      +0x%04X  %-32s %s", c.getOffset(), n,
                        c.getDataType().getName()));
            }
        }
        // C) UT_LORD Nummer
        println("");
        println("### UnitType: Lord und Nachbarn");
        it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> ge = new HashSet<>();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("UnitType") || !(d instanceof ghidra.program.model.data.Enum)) continue;
            if (!ge.add(d.getPathName())) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            for (String n : e.getNames())
                if (n.toUpperCase().contains("LORD") || n.toUpperCase().contains("KING")
                    || n.toUpperCase().contains("INVISIBLE") || n.toUpperCase().contains("NONE"))
                    println("   " + e.getValue(n) + " = " + n);
        }
        // D) Symbol-Adressen zur Kontrolle
        println("");
        println("### Adressen zur Kontrolle");
        for (Symbol s : currentProgram.getSymbolTable().getAllSymbols(true)) {
            String n = s.getName();
            if (n.equals("DAT_UnitsState") || n.startsWith("DAT_UnitsState.units[0]")
                || n.startsWith("DAT_UnitsState.units[1]") || n.startsWith("DAT_UnitsState.units[2]")
                || n.contains("UnitsState.maxUnitCount") || n.contains("UnitsState.units"))
                println(String.format("   %s  %s", s.getAddress(), n));
        }
    }
}
