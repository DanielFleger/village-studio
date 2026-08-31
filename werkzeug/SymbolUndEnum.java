// Gibt die Adresse benannter Speicherstellen (SHC_SYM) und die Werte
// benannter Aufzaehlungen (SHC_ENUM) aus - beides kommagetrennt.
//
// Beispiel:
//   SHC_SYM=DAT_GameCore SHC_ENUM=MenuViewType analyzeHeadless ... SymbolUndEnum.java
import ghidra.app.script.GhidraScript;
import ghidra.program.model.symbol.Symbol;
import ghidra.program.model.symbol.SymbolIterator;
import ghidra.program.model.data.DataType;
import ghidra.program.model.data.DataTypeManager;
import java.util.Iterator;

public class SymbolUndEnum extends GhidraScript {
    @Override
    public void run() throws Exception {
        String syms = System.getenv("SHC_SYM");
        String enums = System.getenv("SHC_ENUM");

        if (syms != null) {
            for (String s : syms.split(",")) {
                String name = s.trim();
                SymbolIterator it = currentProgram.getSymbolTable().getSymbols(name);
                boolean gefunden = false;
                while (it.hasNext()) {
                    Symbol sym = it.next();
                    println("SYMBOL " + name + " = " + sym.getAddress());
                    gefunden = true;
                }
                if (!gefunden) println("SYMBOL " + name + " = nicht gefunden");
            }
        }

        if (enums != null) {
            DataTypeManager dtm = currentProgram.getDataTypeManager();
            for (String e : enums.split(",")) {
                String name = e.trim();
                Iterator<DataType> it = dtm.getAllDataTypes();
                boolean gefunden = false;
                while (it.hasNext()) {
                    DataType dt = it.next();
                    if (!(dt instanceof ghidra.program.model.data.Enum)) continue;
                    if (!dt.getName().equals(name)) continue;
                    ghidra.program.model.data.Enum en = (ghidra.program.model.data.Enum) dt;
                    gefunden = true;
                    for (String wert : en.getNames()) {
                        println("ENUM " + name + " " + wert + " = " + en.getValue(wert));
                    }
                }
                if (!gefunden) println("ENUM " + name + " = nicht gefunden");
            }
        }
    }
}
