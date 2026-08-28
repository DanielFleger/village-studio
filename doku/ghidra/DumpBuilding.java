import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import ghidra.program.model.address.Address;
import java.util.*;

public class DumpBuilding extends GhidraScript {
    public void run() throws Exception {
        DataTypeManager dtm = currentProgram.getDataTypeManager();

        // 1. Strukturen rund um Gebaeude
        println("### STRUKTUREN");
        Iterator<DataType> it = dtm.getAllDataTypes();
        List<String> wunsch = Arrays.asList("Building", "BuildingsState", "BuildingState", "BuildingType");
        while (it.hasNext()) {
            DataType d = it.next();
            if (!(d instanceof Structure)) continue;
            String n = d.getName();
            if (!wunsch.contains(n)) continue;
            println("=== " + n + "  (" + d.getLength() + " Byte)");
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents())
                println(String.format("   +0x%03X  %-34s %-26s %d",
                    c.getOffset(),
                    c.getFieldName() == null ? "?" : c.getFieldName(),
                    c.getDataType().getName(), c.getLength()));
            println("");
        }

        // 2. Adressen der Gebaeude-Daten
        println("### ADRESSEN");
        DataIterator di = currentProgram.getListing().getDefinedData(true);
        while (di.hasNext()) {
            Data dd = di.next();
            String t = dd.getDataType().getName();
            String lb = dd.getLabel() == null ? "" : dd.getLabel();
            if (t.startsWith("Building") || lb.contains("Building"))
                println("   " + dd.getAddress() + "  " + lb + " : " + t);
        }

        // 3. Funktionen zum Abreissen und zur Typumrechnung
        println("");
        println("### FUNKTIONEN");
        for (Symbol s : currentProgram.getSymbolTable().getAllSymbols(true)) {
            String n = s.getName();
            String low = n.toLowerCase();
            if (low.contains("destroybuilding") || low.contains("demolish")
                || n.contains("convertAIVBuildingTypeToCommandBuildingType"))
                println("   " + s.getAddress() + "  " + n);
        }

        // 4. Die Umrechnung AIV -> Mapper dekompilieren
        println("");
        println("### convertAIVBuildingTypeToCommandBuildingType");
        DecompInterface dec = new DecompInterface();
        dec.openProgram(currentProgram);
        Address a = currentProgram.getAddressFactory().getAddress("0x4ECFE0");
        Function f = getFunctionContaining(a);
        if (f != null) {
            DecompileResults r = dec.decompileFunction(f, 120, monitor);
            if (r != null && r.decompileCompleted()) println(r.getDecompiledFunction().getC());
        }
        dec.dispose();
    }
}
