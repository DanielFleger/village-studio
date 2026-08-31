// Gibt den Aufbau aller Strukturen aus, deren Name SHC_STRUKT enthaelt.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.*;
import java.io.PrintWriter;
import java.util.Iterator;

public class StrukturDump extends GhidraScript {
    @Override
    public void run() throws Exception {
        String muster = System.getenv("SHC_STRUKT");
        String out    = System.getenv("SHC_OUT");
        PrintWriter w = new PrintWriter(out, "UTF-8");
        DataTypeManager dtm = currentProgram.getDataTypeManager();
        Iterator<Structure> it = dtm.getAllStructures();
        int gefunden = 0;
        while (it.hasNext()) {
            Structure s = it.next();
            if (!s.getName().toLowerCase().contains(muster.toLowerCase())) continue;
            gefunden++;
            w.println("### " + s.getName() + "   Groesse " + s.getLength()
                      + " (0x" + Integer.toHexString(s.getLength()) + ")");
            for (DataTypeComponent c : s.getDefinedComponents()) {
                String n = c.getFieldName();
                if (n == null) n = "(ohne Namen)";
                w.printf("  +0x%-5s %-42s %-22s %d Byte%n",
                    Integer.toHexString(c.getOffset()), n,
                    c.getDataType().getName(), c.getLength());
            }
            w.println();
        }
        w.close();
        println("[Struktur] " + gefunden + " Strukturen -> " + out);
    }
}
