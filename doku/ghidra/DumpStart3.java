import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.address.*;
import ghidra.program.model.data.*;
import ghidra.program.model.listing.*;
import java.util.*;

public class DumpStart3 extends GhidraScript {
    public void run() throws Exception {
        DecompInterface d = new DecompInterface();
        d.openProgram(currentProgram);
        AddressSpace sp = currentProgram.getAddressFactory().getDefaultAddressSpace();

        // SetupSkirmishMode ist der Aufrufer OHNE Menue-Bezug - der interessanteste Weg
        println("### SetupSkirmishMode (0x4C68D0)");
        Function f = getFunctionContaining(sp.getAddress(0x4C68D0L));
        if (f != null) {
            println("   " + f.getSignature() + "   [" + f.getCallingConventionName() + "]");
            DecompileResults r = d.decompileFunction(f, 90, monitor);
            if (r.decompileCompleted()) {
                String[] z = r.getDecompiledFunction().getC().split("\n");
                for (int i = 0; i < Math.min(70, z.length); i++) println("   " + z[i]);
                if (z.length > 70) println("   ... (" + (z.length-70) + " weitere)");
            }
        }

        println("");
        println("### Vollstaendige Struktur SkirmishLobbySetupStructure");
        Iterator<DataType> it = currentProgram.getDataTypeManager().getAllDataTypes();
        Set<String> g = new HashSet<>();
        while (it.hasNext()) {
            DataType dt = it.next();
            if (!dt.getName().equals("SkirmishLobbySetupStructure") || !(dt instanceof Structure)) continue;
            if (!g.add(dt.getPathName())) continue;
            Structure st = (Structure) dt;
            println("   Laenge " + st.getLength() + " Byte, Basis SEC_ = 0x00DF4118");
            for (DataTypeComponent c : st.getDefinedComponents()) {
                DataType ct = c.getDataType();
                String ex = "";
                if (ct instanceof Array) { Array ar = (Array) ct;
                    ex = String.format("  [%d x %d]", ar.getNumElements(), ar.getElementLength()); }
                println(String.format("      +0x%04X  (0x%08X)  %-34s %-18s%s",
                    c.getOffset(), 0x00DF4118 + c.getOffset(),
                    c.getFieldName()==null?"?":c.getFieldName(), ct.getName(), ex));
            }
        }

        println("");
        println("### Signaturen der Helfer");
        long[] adr = {0x4274F0L, 0x487650L, 0x429710L, 0x486C40L, 0x490060L, 0x4C62C0L};
        for (long x : adr) {
            Function q = getFunctionContaining(sp.getAddress(x));
            if (q == null) continue;
            // ret-imm bestimmt die Aufrufart fuer exposeCode
            Instruction last = null;
            for (Instruction i : currentProgram.getListing().getInstructions(q.getBody(), true))
                if (i.getMnemonicString().equalsIgnoreCase("RET")) last = i;
            println(String.format("   %s  %-44s [%s]  letztes %s", q.getEntryPoint(),
                q.getName(), q.getCallingConventionName(),
                last == null ? "?" : last.toString()));
        }
        d.dispose();
    }
}
