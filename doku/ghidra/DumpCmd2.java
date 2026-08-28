import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.util.*;

public class DumpCmd2 extends GhidraScript {
    public void run() throws Exception {
        // Wo steht der Zeiger auf DestroyWallOrPitch? Das ist die Befehlstabelle.
        Address ziel = currentProgram.getAddressFactory().getAddress("0x484C40");
        println("### Verweise auf DestroyWallOrPitch (0x484C40)");
        for (Reference r : getReferencesTo(ziel)) {
            Address von = r.getFromAddress();
            Function f = getFunctionContaining(von);
            Data d = getDataAt(von);
            println("   " + von + "  " + r.getReferenceType()
                    + (f != null ? "  in " + f.getName() : "")
                    + (d != null ? "  DATEN " + (d.getLabel() == null ? "" : d.getLabel()) : ""));
        }
        // Dasselbe fuer ClickDestroyBuilding, um die Tabellenbasis zu bestimmen
        println("");
        println("### Verweise auf ClickDestroyBuilding (0x481F40)");
        for (Reference r : getReferencesTo(currentProgram.getAddressFactory().getAddress("0x481F40"))) {
            Address von = r.getFromAddress();
            Function f = getFunctionContaining(von);
            println("   " + von + "  " + r.getReferenceType() + (f != null ? "  in " + f.getName() : ""));
        }
        // Das komplette GCT-Enum ausgeben
        println("");
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!(d instanceof ghidra.program.model.data.Enum)) continue;
            String n = d.getName();
            if (!n.startsWith("GameCommandType") && !n.startsWith("GCT")) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            println("ENUM " + n + " (" + e.getCount() + " Werte)");
            List<String> namen = new ArrayList<>(Arrays.asList(e.getNames()));
            namen.sort((a, b) -> Long.compare(e.getValue(a), e.getValue(b)));
            for (String nm : namen) println("   " + e.getValue(nm) + " = " + nm);
        }
    }
}
