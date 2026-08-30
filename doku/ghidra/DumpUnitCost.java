import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;
public class DumpUnitCost extends GhidraScript {
    public void run() throws Exception {
        println("### Funktionen und Daten mit Einheitenkosten");
        for (Symbol s : currentProgram.getSymbolTable().getAllSymbols(true)) {
            String n = s.getName();
            if (n.startsWith("_Hold")) continue;
            String low = n.toLowerCase();
            if ((low.contains("unitcost") || low.contains("costofunit") || low.contains("recruitcost")
                 || low.contains("unit_cost") || (low.contains("cost") && low.contains("troop"))))
                println("   " + s.getAddress() + "  " + n);
        }
        println("");
        println("### Datenfelder mit COST im Namen");
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> gesehen = new HashSet<>();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!(d instanceof Structure)) continue;
            if (!gesehen.add(d.getName())) continue;
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents()) {
                String n = c.getFieldName() == null ? "" : c.getFieldName();
                if (n.toUpperCase().contains("COST") || n.toLowerCase().contains("price"))
                    println(String.format("   %s +0x%X  %s  (%s, %d Byte)",
                        d.getName(), c.getOffset(), n, c.getDataType().getName(), c.getLength()));
            }
        }
        println("");
        println("### RECRUIT_UNIT-Befehl");
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        for (Symbol s : currentProgram.getSymbolTable().getAllSymbols(true)) {
            String n = s.getName();
            if (!n.equals("ClickRecruitUnit") && !n.equals("RecruitUnit") && !n.contains("Recruit")) continue;
            if (s.getSymbolType() != SymbolType.FUNCTION) continue;
            println("   " + s.getAddress() + "  " + n);
        }
        dec.dispose();
    }
}
