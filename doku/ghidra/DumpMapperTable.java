import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import java.util.*;

public class DumpMapperTable extends GhidraScript {
    public void run() throws Exception {
        // Die Umrechnung AIV -> Mapper fuer AIV 30..108 steht als Datentabelle
        // in DAT_AIVDefinedData.field21_0xf4 (MappersEnum[79]).
        Address basis = currentProgram.getAddressFactory().getAddress("0xB46218");
        println("### AIV -> MAPPER aus der Datentabelle ab " + basis);
        for (int i = 0; i < 79; i++) {
            int aiv = 30 + i;
            int wert = getInt(basis.add(i * 4L));
            println("   " + aiv + " -> " + wert);
        }

        // Namen der Mapper-Werte
        println("");
        println("### MAPPER-NAMEN");
        DataTypeManager dtm = currentProgram.getDataTypeManager();
        Iterator<DataType> it = dtm.getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("MappersEnum")) continue;
            if (!(d instanceof ghidra.program.model.data.Enum)) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            List<String> namen = new ArrayList<>(Arrays.asList(e.getNames()));
            namen.sort((a, b) -> Long.compare(e.getValue(a), e.getValue(b)));
            for (String nm : namen) println("   " + e.getValue(nm) + " = " + nm);
        }

        // Laufzeit-Gebaeudetypen
        println("");
        println("### BUILDINGTYPE");
        it = dtm.getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("BuildingType")) continue;
            if (!(d instanceof ghidra.program.model.data.Enum)) continue;
            ghidra.program.model.data.Enum e = (ghidra.program.model.data.Enum) d;
            List<String> namen = new ArrayList<>(Arrays.asList(e.getNames()));
            namen.sort((a, b) -> Long.compare(e.getValue(a), e.getValue(b)));
            for (String nm : namen) println("   " + e.getValue(nm) + " = " + nm);
        }

        // BuildingsState: wo liegt das Gebaeude-Array, wo die Anzahl
        println("");
        println("### BUILDINGSSTATE");
        it = dtm.getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("BuildingsState") || !(d instanceof Structure)) continue;
            println("   Gesamtgroesse " + d.getLength());
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents())
                println(String.format("   +0x%05X  %-32s %-28s %d",
                    c.getOffset(), c.getFieldName() == null ? "?" : c.getFieldName(),
                    c.getDataType().getName(), c.getLength()));
        }
    }
}
