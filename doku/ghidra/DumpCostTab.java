import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.data.*;
import java.util.*;
public class DumpCostTab extends GhidraScript {
    public void run() throws Exception {
        // Wo liegt DAT_BUILDING_COST in BuildingDefinedData?
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        long off = -1;
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("BuildingDefinedData") || !(d instanceof Structure)) continue;
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents()) {
                String n = c.getFieldName() == null ? "" : c.getFieldName();
                if (n.contains("COST") || n.contains("Cost")) {
                    println("Feld " + n + " bei +0x" + Long.toHexString(c.getOffset())
                            + "  Typ " + c.getDataType().getName() + "  " + c.getLength() + " Byte");
                    if (off < 0) off = c.getOffset();
                }
            }
        }
        long basis = 0x005B7974L + (off < 0 ? 0 : off);
        println("");
        println("### Kostentabelle ab 0x" + Long.toHexString(basis).toUpperCase());
        println("Index  Holz  Stein  Eisen  Pech  Gold");
        Address a = currentProgram.getAddressFactory().getAddress(Long.toHexString(basis));
        for (int i = 0; i < 115; i++) {
            int[] v = new int[5];
            boolean leer = true;
            for (int k = 0; k < 5; k++) { v[k] = getInt(a.add((long) i * 20 + k * 4)); if (v[k] != 0) leer = false; }
            if (leer) continue;
            println(String.format("%5d %5d %6d %6d %5d %5d", i, v[0], v[1], v[2], v[3], v[4]));
        }
    }
}
