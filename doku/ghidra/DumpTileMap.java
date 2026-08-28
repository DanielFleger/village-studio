import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import java.util.*;
public class DumpTileMap extends GhidraScript {
    public void run() throws Exception {
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (!d.getName().equals("TileMapState") || !(d instanceof Structure)) continue;
            println("=== TileMapState (" + d.getLength() + " Byte)");
            for (DataTypeComponent c : ((Structure) d).getDefinedComponents()) {
                String n = c.getFieldName() == null ? "" : c.getFieldName();
                if (n.contains("Layer") || n.contains("Damage") || n.contains("Height")
                    || n.contains("Logic") || n.contains("Rubble"))
                    println(String.format("   +0x%06X  %-38s %-26s %d", c.getOffset(), n,
                        c.getDataType().getName(), c.getLength()));
            }
        }
        println("");
        DataIterator di = currentProgram.getListing().getDefinedData(true);
        while (di.hasNext()) {
            Data dd = di.next();
            String lb = dd.getLabel() == null ? "" : dd.getLabel();
            if (lb.equals("DAT_TileMapState") || lb.equals("DAT_WallAndPitchState")
                || lb.equals("DAT_GameSynchronyState") || lb.equals("DAT_PathFindingState"))
                println("ADRESSE " + dd.getAddress() + "  " + lb);
        }
    }
}
