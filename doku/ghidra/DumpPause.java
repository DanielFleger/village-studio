import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;

public class DumpPause extends GhidraScript {
    public void run() throws Exception {
        println("### FUNKTIONEN mit Pause / Focus / Activate im Namen");
        for (Symbol s : currentProgram.getSymbolTable().getAllSymbols(true)) {
            if (s.getSymbolType() != SymbolType.FUNCTION) continue;
            String n = s.getName();
            if (n.startsWith("_Hold")) continue;
            String low = n.toLowerCase();
            if (low.contains("pause") || low.contains("focus") || low.contains("activat")
                || low.contains("windowed") || low.contains("minimi") || low.contains("speed"))
                println("   " + s.getAddress() + "  " + n);
        }
        println("");
        println("### DATEN mit Pause / Focus / Speed im Namen");
        DataIterator di = currentProgram.getListing().getDefinedData(true);
        while (di.hasNext()) {
            Data d = di.next();
            String lb = d.getLabel() == null ? "" : d.getLabel();
            String low = lb.toLowerCase();
            if (low.contains("pause") || low.contains("focus") || low.contains("gamespeed")
                || low.contains("windowed") || low.contains("isactive"))
                println("   " + d.getAddress() + "  " + lb + " : " + d.getDataType().getName());
        }
        println("");
        println("### GameState-Felder mit Pause / Speed");
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        while (it.hasNext()) {
            DataType dt = it.next();
            if (!(dt instanceof Structure)) continue;
            String tn = dt.getName();
            if (!tn.equals("GameState") && !tn.equals("GameTickState") && !tn.equals("MainState")) continue;
            for (DataTypeComponent c : ((Structure) dt).getDefinedComponents()) {
                String n = c.getFieldName() == null ? "" : c.getFieldName();
                String low = n.toLowerCase();
                if (low.contains("pause") || low.contains("speed") || low.contains("focus") || low.contains("tick"))
                    println(String.format("   %s +0x%05X  %-34s %s", tn, c.getOffset(), n, c.getDataType().getName()));
            }
        }
    }
}
