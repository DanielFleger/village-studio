import ghidra.app.script.GhidraScript;
import ghidra.program.model.data.*;
import ghidra.program.model.symbol.*;
import ghidra.program.model.listing.*;
import java.util.*;
public class DumpBase extends GhidraScript {
    public void run() throws Exception {
        DataTypeManager dtm = currentProgram.getDataTypeManager();
        Iterator<DataType> it = dtm.getAllDataTypes();
        while (it.hasNext()) {
            DataType d = it.next();
            if (d.getName().equals("AIVBuildLocationUnion") && d instanceof Union) {
                println("UNION AIVBuildLocationUnion (" + d.getLength() + " Byte)");
                for (DataTypeComponent c : ((Union) d).getDefinedComponents())
                    println("  feld " + c.getFieldName() + " : " + c.getDataType().getName());
            }
        }
        Listing l = currentProgram.getListing();
        DataIterator di = l.getDefinedData(true);
        while (di.hasNext()) {
            Data dd = di.next();
            String t = dd.getDataType().getName();
            if (t.startsWith("AIVState") || t.startsWith("AIVDefinedData"))
                println("ADRESSE " + dd.getAddress() + "  " + dd.getLabel() + " : " + t);
        }
    }
}
